const DASHBOARD_CONFIG = Object.freeze({
  timeZone: 'Asia/Kolkata',
  cacheKey: 'MOSAIC_KPI_DASHBOARD_V1',
  cacheSeconds: 1800,
  staleAfterMinutes: 30,
  ownerEmail: 'bhavesh.patel@mosaicwellness.in',
  dashboardUrl:
    'https://script.google.com/macros/s/AKfycby5ih5rzT02m8e254Ulu553JUZV5nm1lx3O1o4-clLAh79fsQIcE7-zGwUra7NgVl_eTA/exec',
  scheduledEmailHour: 11,
  scheduledEmailRecipients: ['bhavesh.patel@mosaicwellness.in'],
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
    .filter((trigger) =>
      ['refreshKpiCache_', 'sendScheduledKpiEmail_'].includes(
        trigger.getHandlerFunction(),
      ),
    )
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('refreshKpiCache_')
    .timeBased()
    .everyHours(1)
    .create();

  ScriptApp.newTrigger('sendScheduledKpiEmail_')
    .timeBased()
    .atHour(DASHBOARD_CONFIG.scheduledEmailHour)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(DASHBOARD_CONFIG.timeZone)
    .create();

  return {
    dashboard: refreshKpiCache_(),
    schedule: `Daily around ${DASHBOARD_CONFIG.scheduledEmailHour}:00 ${DASHBOARD_CONFIG.timeZone}`,
    recipients: DASHBOARD_CONFIG.scheduledEmailRecipients,
  };
}

function sendTestKpiEmail() {
  const viewerEmail = getViewerEmail_();
  if (viewerEmail !== DASHBOARD_CONFIG.ownerEmail) {
    throw new Error('Only the dashboard owner can send a test email.');
  }
  return sendKpiEmail_(true);
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

function sendScheduledKpiEmail_() {
  return sendKpiEmail_(false);
}

function sendKpiEmail_(isTest) {
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error('The Apps Script email quota has been reached for today.');
  }

  const data = refreshKpiCache_();
  const dateLabel = Utilities.formatDate(
    new Date(),
    DASHBOARD_CONFIG.timeZone,
    'dd MMM yyyy',
  );
  const prefix = isTest ? '[TEST] ' : '';
  const subject = `${prefix}Operations KPI Summary — ${dateLabel}`;
  const recipients = isTest
    ? [DASHBOARD_CONFIG.ownerEmail]
    : DASHBOARD_CONFIG.scheduledEmailRecipients;

  MailApp.sendEmail({
    to: recipients.join(','),
    subject,
    body: buildKpiEmailText_(data),
    htmlBody: buildKpiEmailHtml_(data, isTest),
    name: 'Mosaic Operations KPI',
  });

  return {
    sent: true,
    subject,
    recipients,
    sentAt: new Date().toISOString(),
  };
}

function buildKpiEmailText_(data) {
  const lines = [
    'Operations KPI Command Center',
    `Updated: ${Utilities.formatDate(
      new Date(data.updatedAt),
      DASHBOARD_CONFIG.timeZone,
      'dd MMM yyyy, hh:mm a',
    )}`,
    '',
  ];

  data.reports.forEach((report) => {
    lines.push(report.title.toUpperCase());
    report.metrics.forEach((metric) => {
      lines.push(`${metric.label}: ${metric.value}`);
    });
    if (report.dashboardUrl) {
      lines.push(`Dashboard: ${report.dashboardUrl}`);
    }
    if (report.emailUrl) {
      lines.push(`Source email: ${report.emailUrl}`);
    }
    lines.push('');
  });

  lines.push(`Consolidated dashboard: ${DASHBOARD_CONFIG.dashboardUrl}`);
  return lines.join('\n');
}

function buildKpiEmailHtml_(data, isTest) {
  const updated = Utilities.formatDate(
    new Date(data.updatedAt),
    DASHBOARD_CONFIG.timeZone,
    'dd MMM yyyy, hh:mm a',
  );
  const testLabel = isTest
    ? '<div style="margin-bottom:8px;color:#dfff7a;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Test email</div>'
    : '';
  const reportSections = data.reports
    .map((report) => {
      const metricCells = report.metrics
        .map((metric) => {
          const color =
            metric.tone === 'warning'
              ? '#d95c43'
              : metric.tone === 'positive'
                ? '#1e5c45'
                : '#14211c';
          return `<td style="width:25%;padding:12px;border:1px solid #dcd8ce;vertical-align:top">
            <div style="min-height:30px;color:#68736e;font-size:11px;line-height:1.3">${escapeHtml_(metric.label)}</div>
            <strong style="display:block;margin-top:8px;color:${color};font-size:23px">${escapeHtml_(metric.value)}</strong>
          </td>`;
        })
        .join('');
      const dashboardButton = report.dashboardUrl
        ? `<a href="${escapeHtml_(report.dashboardUrl)}" style="display:inline-block;padding:10px 14px;border-radius:7px;background:#1e5c45;color:#fff;font-size:13px;font-weight:700;text-decoration:none">Open dashboard</a>`
        : '';
      const emailLink = report.emailUrl
        ? `<a href="${escapeHtml_(report.emailUrl)}" style="margin-left:12px;color:#1e5c45;font-size:13px;font-weight:700">Open source email</a>`
        : '';

      return `<section style="padding:24px 30px;border-bottom:1px solid #dcd8ce">
        <div style="color:#1e5c45;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${escapeHtml_(report.category)}</div>
        <h2 style="margin:7px 0 14px;color:#14211c;font-size:21px">${escapeHtml_(report.title)}</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse"><tr>${metricCells}</tr></table>
        <div style="margin-top:18px">${dashboardButton}${emailLink}</div>
        <div style="margin-top:12px;color:#8a938f;font-size:10px">Source: ${escapeHtml_(report.subject)}</div>
      </section>`;
    })
    .join('');

  return `<div style="margin:0;padding:28px;background:#f4f1e9;color:#14211c;font-family:Arial,sans-serif">
    <div style="max-width:780px;margin:auto;overflow:hidden;border:1px solid #dcd8ce;border-radius:18px;background:#fffdf8">
      <header style="padding:28px 30px;background:#1e5c45;color:#fff">
        ${testLabel}
        <h1 style="margin:0 0 7px;font-size:30px">Operations KPI Summary</h1>
        <div style="color:#d9e8e1;font-size:12px">Updated ${escapeHtml_(updated)}</div>
      </header>
      ${reportSections}
      <footer style="padding:24px 30px">
        <a href="${escapeHtml_(DASHBOARD_CONFIG.dashboardUrl)}" style="color:#1e5c45;font-size:14px;font-weight:700">Open consolidated KPI dashboard →</a>
        <p style="margin:14px 0 0;color:#8a938f;font-size:10px">Gmail links work only when the signed-in viewer has access to the original message.</p>
      </footer>
    </div>
  </div>`;
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
