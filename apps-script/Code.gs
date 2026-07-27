const DASHBOARD_CONFIG = Object.freeze({
  timeZone: 'Asia/Kolkata',
  cacheKey: 'MOSAIC_KPI_DASHBOARD_V1',
  cacheSeconds: 1800,
  staleAfterMinutes: 30,
  ownerEmail: 'bhavesh.patel@mosaicwellness.in',
  allowedEmails: [
    'bhavesh.patel@mosaicwellness.in',
    'shailendra.singh@mosaicwellness.in',
    'shailendra@mosaicwellness.in',
  ],
  reports: [
    {
      id: 'inventory-cycle-count',
      title: 'Inventory Cycle Count',
      category: 'Inventory control',
      sender: 'bhavesh.patel@mosaicwellness.in',
      query:
        'from:bhavesh.patel@mosaicwellness.in subject:"Daily Cycle count inventory" -in:trash',
      subjectContains: 'Daily Cycle count inventory',
      parser: 'inventory',
    },
    {
      id: 'fefo-violations',
      title: 'FEFO Violations',
      category: 'Dispatch compliance',
      sender: 'farhana.teli@mosaicwellness.in',
      query:
        'from:farhana.teli@mosaicwellness.in subject:"Daily FEFO Violation Check" -in:trash',
      subjectContains: 'Daily FEFO Violation Check',
      parser: 'fefo',
    },
  ],
});

function doGet() {
  const viewerEmail = getViewerEmail_();

  if (!isAllowedViewer_(viewerEmail)) {
    return HtmlService.createHtmlOutput(buildAccessDeniedHtml_(viewerEmail))
      .setTitle('Access required · Operations KPI Command Center')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Operations KPI Command Center')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDashboardData() {
  assertAllowedViewer_();

  const cached = CacheService.getScriptCache().get(DASHBOARD_CONFIG.cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const stored =
    PropertiesService.getScriptProperties().getProperty(
      DASHBOARD_CONFIG.cacheKey,
    );

  if (stored) {
    const data = JSON.parse(stored);
    if (!isStale_(data.updatedAt)) {
      CacheService.getScriptCache().put(
        DASHBOARD_CONFIG.cacheKey,
        stored,
        DASHBOARD_CONFIG.cacheSeconds,
      );
      return data;
    }
  }

  return refreshKpiCache_();
}

function refreshDashboardData() {
  assertAllowedViewer_();
  return refreshKpiCache_();
}

function setupDashboard() {
  const viewerEmail = getViewerEmail_();
  if (viewerEmail !== DASHBOARD_CONFIG.ownerEmail) {
    throw new Error('Only the dashboard owner can run initial setup.');
  }

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'refreshKpiCache_')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('refreshKpiCache_')
    .timeBased()
    .everyHours(1)
    .create();

  return refreshKpiCache_();
}

function refreshKpiCache_() {
  const reports = DASHBOARD_CONFIG.reports.map((config) =>
    buildReport_(config),
  );
  const result = {
    updatedAt: new Date().toISOString(),
    timeZone: DASHBOARD_CONFIG.timeZone,
    viewerEmail: getViewerEmail_(),
    reports,
  };
  const serialized = JSON.stringify(result);

  PropertiesService.getScriptProperties().setProperty(
    DASHBOARD_CONFIG.cacheKey,
    serialized,
  );
  CacheService.getScriptCache().put(
    DASHBOARD_CONFIG.cacheKey,
    serialized,
    DASHBOARD_CONFIG.cacheSeconds,
  );

  return result;
}

function buildReport_(config) {
  const message = findLatestReportMessage_(config);

  if (!message) {
    return {
      id: config.id,
      title: config.title,
      category: config.category,
      sender: config.sender,
      status: 'not-found',
      statusLabel: 'No matching email',
      reportingDate: '—',
      subject: 'No report found',
      metrics: emptyMetrics_(config.parser),
      dashboardUrl: '',
      emailUrl: '',
    };
  }

  const plainBody = normalizeText_(message.getPlainBody());
  const htmlBody = message.getBody();
  const metrics =
    config.parser === 'inventory'
      ? parseInventoryMetrics_(plainBody)
      : parseFefoMetrics_(plainBody);

  return {
    id: config.id,
    title: config.title,
    category: config.category,
    sender: config.sender,
    status: 'ready',
    statusLabel: 'Latest received',
    reportingDate: Utilities.formatDate(
      message.getDate(),
      DASHBOARD_CONFIG.timeZone,
      'dd MMM yyyy',
    ),
    receivedAt: message.getDate().toISOString(),
    subject: message.getSubject(),
    metrics,
    dashboardUrl: extractDashboardUrl_(htmlBody, plainBody),
    emailUrl: buildPortableGmailUrl_(message),
  };
}

function findLatestReportMessage_(config) {
  const threads = GmailApp.search(config.query, 0, 25);
  const matchingMessages = [];

  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      const subject = message.getSubject() || '';
      const from = (message.getFrom() || '').toLowerCase();
      const isReply = /^(re|fwd?|aw):\s*/i.test(subject);

      if (
        !isReply &&
        subject
          .toLowerCase()
          .includes(config.subjectContains.toLowerCase()) &&
        from.includes(config.sender.toLowerCase())
      ) {
        matchingMessages.push(message);
      }
    });
  });

  matchingMessages.sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  return matchingMessages[0] || null;
}

function parseInventoryMetrics_(text) {
  return [
    metric_(
      'Last Quarter',
      extractMetricAfter_(text, ['Last Quarter']),
      extractDateRangeAfter_(text, 'Last Quarter'),
      'positive',
    ),
    metric_(
      'Last Month',
      extractMetricAfter_(text, ['Last Month']),
      extractDateRangeAfter_(text, 'Last Month'),
      'positive',
    ),
    metric_(
      'Month to Date',
      extractMetricAfter_(text, ['Month to Date', 'MTD']),
      extractDateRangeAfter_(text, 'Month to Date'),
      'positive',
    ),
    metric_(
      'Yesterday',
      extractMetricAfter_(text, ['Yesterday']),
      includesIgnoreCase_(text, 'No cycle count was performed')
        ? 'No cycle count performed'
        : extractDateRangeAfter_(text, 'Yesterday'),
      'warning',
    ),
  ];
}

function parseFefoMetrics_(text) {
  return [
    metric_(
      'Violated Batch Count',
      extractMetricBeforeOrAfter_(text, ['Violated Batch Count']),
      'Latest reported value',
      'warning',
    ),
    metric_(
      'Dispatch First Batch Count',
      extractMetricBeforeOrAfter_(text, [
        'Disaptch First Batch Count',
        'Dispatch First Batch Count',
      ]),
      'Latest reported value',
      '',
    ),
    metric_(
      'Overall FEFO Compliance',
      extractMetricBeforeOrAfter_(text, ['Overall FEFO Compliance %']),
      'Latest reported value',
      'positive',
    ),
    metric_(
      'Overall FEFO Non-Compliance',
      extractMetricBeforeOrAfter_(text, [
        'Overall FEFO Non-Compliance %',
      ]),
      'Latest reported value',
      'warning',
    ),
  ];
}

function emptyMetrics_(parser) {
  const labels =
    parser === 'inventory'
      ? ['Last Quarter', 'Last Month', 'Month to Date', 'Yesterday']
      : [
          'Violated Batch Count',
          'Dispatch First Batch Count',
          'Overall FEFO Compliance',
          'Overall FEFO Non-Compliance',
        ];
  return labels.map((label) => metric_(label, '—', 'Email not found', ''));
}

function metric_(label, value, note, tone) {
  return {
    label,
    value: value || '—',
    note: note || 'Latest reported value',
    tone: tone || '',
  };
}

function extractMetricAfter_(text, labels) {
  for (let i = 0; i < labels.length; i += 1) {
    const index = text.toLowerCase().indexOf(labels[i].toLowerCase());
    if (index === -1) continue;

    const after = text.slice(index + labels[i].length, index + labels[i].length + 260);
    const value = firstStandaloneMetric_(after);
    if (value) return value;
  }
  return '';
}

function extractMetricBeforeOrAfter_(text, labels) {
  for (let i = 0; i < labels.length; i += 1) {
    const index = text.toLowerCase().indexOf(labels[i].toLowerCase());
    if (index === -1) continue;

    const before = text.slice(Math.max(0, index - 180), index);
    const valueBefore = lastStandaloneMetric_(before);
    if (valueBefore) return valueBefore;

    const after = text.slice(index + labels[i].length, index + labels[i].length + 180);
    const valueAfter = firstStandaloneMetric_(after);
    if (valueAfter) return valueAfter;
  }
  return '';
}

function firstStandaloneMetric_(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^([₹$]?\s*[\d,]+(?:\.\d+)?%?)$/);
    if (match) return match[1].replace(/\s+/g, '');
  }

  const fallback = text.match(/(?:^|\s)(\d[\d,]*(?:\.\d+)?%?)(?=\s|$)/);
  return fallback ? fallback[1] : '';
}

function lastStandaloneMetric_(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-10)
    .reverse();

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^([₹$]?\s*[\d,]+(?:\.\d+)?%?)$/);
    if (match) return match[1].replace(/\s+/g, '');
  }
  return '';
}

function extractDateRangeAfter_(text, label) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index === -1) return '';

  const after = text.slice(index, index + 520);
  const match = after.match(
    /(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*[-–]\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4})/,
  );
  return match ? `${match[1]} – ${match[2]}` : '';
}

function extractDashboardUrl_(htmlBody, plainBody) {
  const anchors = [];
  const anchorPattern =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(htmlBody)) !== null) {
    anchors.push({
      url: decodeHtmlEntities_(match[1]),
      text: stripHtml_(match[2]),
    });
  }

  const labeled = anchors.find(
    (anchor) =>
      /dashboard/i.test(anchor.text) &&
      /^https?:/i.test(unwrapGoogleRedirect_(anchor.url)),
  );
  if (labeled) return unwrapGoogleRedirect_(labeled.url);

  const dashboardDomain = anchors.find((anchor) =>
    /(lookerstudio\.google\.com|datastudio\.google\.com|github\.io)/i.test(
      anchor.url,
    ),
  );
  if (dashboardDomain) return unwrapGoogleRedirect_(dashboardDomain.url);

  const urls = plainBody.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return (
    urls.find((url) =>
      /(lookerstudio\.google\.com|datastudio\.google\.com|github\.io)/i.test(
        url,
      ),
    ) || ''
  );
}

function unwrapGoogleRedirect_(url) {
  if (!/google\.com\/url/i.test(url)) return url;

  const match = url.match(/[?&](?:q|url)=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : url;
}

function buildPortableGmailUrl_(message) {
  const messageId = (message.getHeader('Message-ID') || '').trim();
  if (messageId) {
    return (
      'https://mail.google.com/mail/u/0/#search/' +
      encodeURIComponent(`rfc822msgid:${messageId}`)
    );
  }

  const subjectQuery = `subject:"${message.getSubject().replace(/"/g, '')}"`;
  return (
    'https://mail.google.com/mail/u/0/#search/' +
    encodeURIComponent(subjectQuery)
  );
}

function getViewerEmail_() {
  return (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function isAllowedViewer_(email) {
  return Boolean(email) && DASHBOARD_CONFIG.allowedEmails.includes(email);
}

function assertAllowedViewer_() {
  const viewerEmail = getViewerEmail_();
  if (!isAllowedViewer_(viewerEmail)) {
    throw new Error('Access denied. Sign in with an approved Mosaic Wellness account.');
  }
}

function isStale_(isoDate) {
  if (!isoDate) return true;
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs > DASHBOARD_CONFIG.staleAfterMinutes * 60 * 1000;
}

function normalizeText_(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function includesIgnoreCase_(text, search) {
  return text.toLowerCase().includes(search.toLowerCase());
}

function stripHtml_(html) {
  return decodeHtmlEntities_(String(html || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities_(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function buildAccessDeniedHtml_(viewerEmail) {
  const account = viewerEmail || 'No Google Workspace account detected';
  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{margin:0;background:#f4f1e9;color:#14211c;font:16px Arial,sans-serif}
        main{max-width:620px;margin:12vh auto;padding:36px}
        .mark{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#1e5c45;color:white;font-weight:700}
        h1{font-size:38px;letter-spacing:-.04em;margin:28px 0 12px}
        p{color:#68736e;line-height:1.6}
        code{display:block;margin-top:24px;padding:14px;border:1px solid #dcd8ce;border-radius:10px;background:#fffdf8;word-break:break-all}
      </style>
    </head>
    <body>
      <main>
        <div class="mark">MW</div>
        <h1>Access required</h1>
        <p>Sign in with an approved Mosaic Wellness Google account to open this KPI dashboard.</p>
        <code>${escapeHtml_(account)}</code>
      </main>
    </body>
  </html>`;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
