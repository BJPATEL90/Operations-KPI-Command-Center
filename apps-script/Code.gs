const DASHBOARD_CONFIG = Object.freeze({
  configSpreadsheetId: '1irCr4_VwE9kG3hSSER_LjkieP0UMgTx7HBbdsB3kB0U',
  cacheKey: 'MOSAIC_KPI_DASHBOARD_V1',
  ownerEmail: 'bhavesh.patel@mosaicwellness.in',
  fallbackTimeZone: 'Asia/Kolkata',
  fallbackCacheMinutes: 30,
});

function readRuntimeConfiguration_() {
  const spreadsheet = SpreadsheetApp.openById(
    DASHBOARD_CONFIG.configSpreadsheetId,
  );
  const settingsRows = readSheetObjects_(spreadsheet, 'Settings');
  const reportRows = readSheetObjects_(spreadsheet, 'Reports');
  const fieldRows = readSheetObjects_(spreadsheet, 'KPI Fields');
  const settingMap = {};

  settingsRows.forEach((row) => {
    const key = String(row.key || '').trim().toUpperCase();
    if (key) settingMap[key] = row.value;
  });

  const fieldsByReport = {};
  fieldRows
    .filter((row) => isTruthy_(row.active))
    .sort(
      (a, b) =>
        Number(a.display_order || 0) - Number(b.display_order || 0),
    )
    .forEach((row) => {
      const reportId = String(row.report_id || '').trim();
      if (!fieldsByReport[reportId]) fieldsByReport[reportId] = [];
      fieldsByReport[reportId].push({
        label: String(row.kpi_label || '').trim(),
        searchLabels: splitList_(row.search_labels),
        valuePosition: String(row.value_position || 'AFTER')
          .trim()
          .toUpperCase(),
        tone: String(row.tone || '').trim(),
        noteRule: String(row.note_rule || 'FIXED').trim().toUpperCase(),
        noteValue: String(row.note_value || '').trim(),
      });
    });

  const reports = reportRows
    .filter((row) => isTruthy_(row.active))
    .sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    )
    .map((row) => {
      const id = String(row.report_id || '').trim();
      return {
        id,
        title: String(row.report_name || '').trim(),
        category: String(row.category || '').trim(),
        sender: String(row.sender_email || '').trim().toLowerCase(),
        query: String(row.gmail_search_query || '').trim(),
        subjectContains: String(row.subject_contains || '').trim(),
        dashboardUrlFallback: String(
          row.dashboard_url_fallback || '',
        ).trim(),
        displayType: String(row.display_type || 'METRIC_CARDS')
          .trim()
          .toUpperCase(),
        metrics: fieldsByReport[id] || [],
      };
    })
    .filter((report) => report.id && report.title && report.query);

  const timeZone =
    String(settingMap.TIME_ZONE || '').trim() ||
    DASHBOARD_CONFIG.fallbackTimeZone;
  const cacheMinutes =
    Number(settingMap.CACHE_MINUTES) ||
    DASHBOARD_CONFIG.fallbackCacheMinutes;

  return {
    spreadsheetUrl: spreadsheet.getUrl(),
    timeZone,
    cacheMinutes,
    cacheSeconds: Math.max(60, Math.round(cacheMinutes * 60)),
    scheduledEmailHour: Number(settingMap.SCHEDULED_EMAIL_HOUR) || 11,
    scheduledEmailRecipients: splitList_(settingMap.EMAIL_RECIPIENTS),
    allowedEmails: splitList_(settingMap.ALLOWED_USERS).map((email) =>
      email.toLowerCase(),
    ),
    dashboardUrl: String(settingMap.DASHBOARD_URL || '').trim(),
    scheduleEnabled: isTruthy_(settingMap.SCHEDULE_ENABLED),
    reports,
  };
}

function readSheetObjects_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Missing configuration sheet: ${sheetName}`);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const keys = values[0].map((header) => headerKey_(header));

  return values.slice(1).map((row) => {
    const result = {};
    keys.forEach((key, index) => {
      if (key) result[key] = row[index];
    });
    return result;
  });
}

function headerKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function splitList_(value) {
  return String(value || '')
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTruthy_(value) {
  return (
    value === true ||
    value === 1 ||
    ['true', 'yes', '1', 'active'].includes(
      String(value || '').trim().toLowerCase(),
    )
  );
}

function doGet() {
  const viewerEmail = getViewerEmail_();
  const runtimeConfig = readRuntimeConfiguration_();

  if (!isAllowedViewer_(viewerEmail, runtimeConfig)) {
    return HtmlService.createHtmlOutput(buildAccessDeniedHtml_(viewerEmail))
      .setTitle('Access required · Operations KPI Command Center')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Operations KPI Command Center')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDashboardData() {
  const runtimeConfig = readRuntimeConfiguration_();
  assertAllowedViewer_(runtimeConfig);
  const configSignature = buildConfigSignature_(runtimeConfig);

  const cached = CacheService.getScriptCache().get(DASHBOARD_CONFIG.cacheKey);
  if (cached) {
    const cachedData = JSON.parse(cached);
    if (cachedData.configSignature === configSignature) {
      return cachedData;
    }
  }

  const stored =
    PropertiesService.getScriptProperties().getProperty(
      DASHBOARD_CONFIG.cacheKey,
    );

  if (stored) {
    const data = JSON.parse(stored);
    if (
      data.configSignature === configSignature &&
      !isStale_(data.updatedAt, runtimeConfig.cacheMinutes)
    ) {
      CacheService.getScriptCache().put(
        DASHBOARD_CONFIG.cacheKey,
        stored,
        runtimeConfig.cacheSeconds,
      );
      return data;
    }
  }

  return refreshKpiCache_(runtimeConfig);
}

function refreshDashboardData() {
  const runtimeConfig = readRuntimeConfiguration_();
  assertAllowedViewer_(runtimeConfig);
  return refreshKpiCache_(runtimeConfig);
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

  const runtimeConfig = readRuntimeConfiguration_();

  ScriptApp.newTrigger('refreshKpiCache_')
    .timeBased()
    .everyHours(1)
    .create();

  if (
    runtimeConfig.scheduleEnabled &&
    runtimeConfig.scheduledEmailRecipients.length
  ) {
    ScriptApp.newTrigger('sendScheduledKpiEmail_')
      .timeBased()
      .atHour(runtimeConfig.scheduledEmailHour)
      .nearMinute(0)
      .everyDays(1)
      .inTimezone(runtimeConfig.timeZone)
      .create();
  }

  return {
    dashboard: refreshKpiCache_(runtimeConfig),
    configurationSheet: runtimeConfig.spreadsheetUrl,
    schedule: runtimeConfig.scheduleEnabled
      ? `Daily around ${runtimeConfig.scheduledEmailHour}:00 ${runtimeConfig.timeZone}`
      : 'Disabled in Settings',
    recipients: runtimeConfig.scheduledEmailRecipients,
  };
}

function sendTestKpiEmail() {
  const viewerEmail = getViewerEmail_();
  if (viewerEmail !== DASHBOARD_CONFIG.ownerEmail) {
    throw new Error('Only the dashboard owner can send a test email.');
  }
  return sendKpiEmail_(true);
}

function refreshKpiCache_(runtimeConfig) {
  const config =
    runtimeConfig && Array.isArray(runtimeConfig.reports)
      ? runtimeConfig
      : readRuntimeConfiguration_();
  const reports = config.reports.map((reportConfig) =>
    buildReport_(reportConfig, config.timeZone),
  );
  const result = {
    updatedAt: new Date().toISOString(),
    configSignature: buildConfigSignature_(config),
    timeZone: config.timeZone,
    dashboardUrl: config.dashboardUrl,
    configurationUrl:
      getViewerEmail_() === DASHBOARD_CONFIG.ownerEmail
        ? config.spreadsheetUrl
        : '',
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
    config.cacheSeconds,
  );

  return result;
}

function buildConfigSignature_(runtimeConfig) {
  const reportSignature = runtimeConfig.reports
    .map((report) => {
      const metricSignature = report.metrics
        .map((metric) =>
          [
            metric.label,
            metric.searchLabels.join(','),
            metric.valuePosition,
            metric.noteRule,
          ].join(':'),
        )
        .join(';');
      return [
        report.id,
        report.title,
        report.query,
        report.subjectContains,
        report.displayType,
        metricSignature,
      ].join('|');
    })
    .join('||');
  return `metric-parser-v2||${reportSignature}`;
}

function sendScheduledKpiEmail_() {
  return sendKpiEmail_(false);
}

function sendKpiEmail_(isTest) {
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error('The Apps Script email quota has been reached for today.');
  }

  const runtimeConfig = readRuntimeConfiguration_();
  const data = refreshKpiCache_(runtimeConfig);
  const dateLabel = Utilities.formatDate(
    new Date(),
    runtimeConfig.timeZone,
    'dd MMM yyyy',
  );
  const prefix = isTest ? '[TEST] ' : '';
  const subject = `${prefix}Operations KPI Summary — ${dateLabel}`;
  const recipients = isTest
    ? [DASHBOARD_CONFIG.ownerEmail]
    : runtimeConfig.scheduledEmailRecipients;

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
      data.timeZone,
      'dd MMM yyyy, hh:mm a',
    )}`,
    '',
  ];

  data.reports.forEach((report) => {
    lines.push(report.title.toUpperCase());
    lines.push(sourceFetchedLabel_(report, data.timeZone));
    if (report.displayType === 'OWNER_AGEING_TABLE' && report.table) {
      report.table.rows.forEach((row) => {
        lines.push(
          `${row.owner}: 0–15 ${formatIndianNumber_(row.days0To15Qty)} / ${row.days0To15Count} GP | ` +
            `16–30 ${formatIndianNumber_(row.days16To30Qty)} / ${row.days16To30Count} GP | ` +
            `Above 30 ${formatIndianNumber_(row.above30Qty)} / ${row.above30Count} GP | ` +
            `Total ${formatIndianNumber_(row.totalQty)} / ${row.totalCount} GP`,
        );
      });
      if (report.table.totals) {
        const total = report.table.totals;
        lines.push(
          `GRAND TOTAL: ${formatIndianNumber_(total.totalQty)} open quantity / ${total.totalCount} gatepasses`,
        );
      }
    } else if (
      report.displayType === 'PUTAWAY_TOTALS_TABLE' &&
      report.table
    ) {
      report.table.rows
        .concat(report.table.totals ? [report.table.totals] : [])
        .forEach((row) => {
          lines.push(
            `${row.owner}: 0–3 days ${formatIndianNumber_(row.days0To3Count)} / ${formatIndianNumber_(row.days0To3Qty)} qty | ` +
              `4–7 days ${formatIndianNumber_(row.days4To7Count)} / ${formatIndianNumber_(row.days4To7Qty)} qty | ` +
              `Above 7 days ${formatIndianNumber_(row.above7Count)} / ${formatIndianNumber_(row.above7Qty)} qty | ` +
              `Total ${formatIndianNumber_(row.totalCount)} / ${formatIndianNumber_(row.totalQty)} qty`,
          );
        });
    } else {
      report.metrics.forEach((metric) => {
        lines.push(`${metric.label}: ${metric.value}`);
      });
    }
    if (report.dashboardUrl) {
      lines.push(`Dashboard: ${report.dashboardUrl}`);
    }
    if (report.emailUrl) {
      lines.push(`Source email: ${report.emailUrl}`);
    }
    lines.push('');
  });

  lines.push(`Consolidated dashboard: ${data.dashboardUrl}`);
  return lines.join('\n');
}

function buildKpiEmailHtml_(data, isTest) {
  const updated = Utilities.formatDate(
    new Date(data.updatedAt),
    data.timeZone,
    'dd MMM yyyy, hh:mm a',
  );
  const testLabel = isTest
    ? '<div style="margin-bottom:8px;color:#dfff7a;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Test email</div>'
    : '';
  const reportSections = data.reports
    .map((report) => {
      const sourceFetchedLabel = sourceFetchedLabel_(
        report,
        data.timeZone,
      );
      let reportBody = buildMetricEmailTable_(report.metrics);
      if (report.displayType === 'OWNER_AGEING_TABLE') {
        reportBody = buildOwnerAgeingEmailTable_(report.table);
      } else if (report.displayType === 'PUTAWAY_TOTALS_TABLE') {
        reportBody = buildPutawayTotalsEmailTable_(report.table);
      }
      const dashboardButton = report.dashboardUrl
        ? `<a href="${escapeHtml_(report.dashboardUrl)}" style="display:inline-block;padding:10px 14px;border-radius:7px;background:#1e5c45;color:#fff;font-size:13px;font-weight:700;text-decoration:none">Open dashboard</a>`
        : '';
      const emailLink = report.emailUrl
        ? `<a href="${escapeHtml_(report.emailUrl)}" style="margin-left:12px;color:#1e5c45;font-size:13px;font-weight:700">Open source email</a>`
        : '';

      return `<section style="padding:24px 30px;border-bottom:1px solid #dcd8ce">
        <div style="color:#1e5c45;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${escapeHtml_(report.category)}</div>
        <h2 style="margin:7px 0 14px;color:#14211c;font-size:21px">${escapeHtml_(report.title)}</h2>
        <div style="margin:-5px 0 14px;color:#68736e;font-size:11px">${escapeHtml_(sourceFetchedLabel)}</div>
        ${reportBody}
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
        <a href="${escapeHtml_(data.dashboardUrl)}" style="color:#1e5c45;font-size:14px;font-weight:700">Open consolidated KPI dashboard →</a>
        <p style="margin:14px 0 0;color:#8a938f;font-size:10px">Gmail links work only when the signed-in viewer has access to the original message.</p>
      </footer>
    </div>
  </div>`;
}

function sourceFetchedLabel_(report, timeZone) {
  if (!report || !report.receivedAt) {
    return 'Last fetched data/email date and time unavailable';
  }

  return (
    'Last fetched data/email on ' +
    Utilities.formatDate(
      new Date(report.receivedAt),
      timeZone,
      'dd-MM-yyyy',
    ) +
    ' at ' +
    Utilities.formatDate(
      new Date(report.receivedAt),
      timeZone,
      'hh:mm a',
    )
  );
}

function buildMetricEmailTable_(metrics) {
  const metricCells = metrics
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
  return `<table role="presentation" style="width:100%;border-collapse:collapse"><tr>${metricCells}</tr></table>`;
}

function buildOwnerAgeingEmailTable_(table) {
  if (!table || !table.rows.length) {
    return '<div style="padding:14px;background:#fff0ec;color:#d95c43">The owner ageing table could not be parsed from the latest email.</div>';
  }

  const rowHtml = table.rows
    .map(
      (row) => `<tr>
        <td style="padding:9px;border:1px solid #dcd8ce;font-weight:700">${escapeHtml_(row.owner)}</td>
        ${ownerAgeingEmailNumberCells_(row)}
      </tr>`,
    )
    .join('');
  const totalHtml = table.totals
    ? `<tr style="background:#203f63;color:#fff;font-weight:700">
        <td style="padding:10px;border:1px solid #dcd8ce">GRAND TOTAL</td>
        ${ownerAgeingEmailNumberCells_(table.totals, true)}
      </tr>`
    : '';

  return `<div style="overflow-x:auto">
    <table role="presentation" style="width:100%;min-width:720px;border-collapse:collapse;font-size:11px;text-align:right">
      <tr style="color:#fff;text-align:center">
        <th rowspan="2" style="padding:9px;background:#203f63;border:1px solid #dcd8ce;text-align:left">Gatepass Owner</th>
        <th colspan="2" style="padding:9px;background:#16a05a;border:1px solid #dcd8ce">0–15 Days</th>
        <th colspan="2" style="padding:9px;background:#df7d00;border:1px solid #dcd8ce">16–30 Days</th>
        <th colspan="2" style="padding:9px;background:#e42125;border:1px solid #dcd8ce">Above 30 Days</th>
        <th colspan="2" style="padding:9px;background:#203f63;border:1px solid #dcd8ce">Grand Total</th>
      </tr>
      <tr style="background:#eef3f6;color:#14211c;text-align:center">
        <th style="padding:7px;border:1px solid #dcd8ce">Open Qty</th><th style="padding:7px;border:1px solid #dcd8ce">GP Count</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Open Qty</th><th style="padding:7px;border:1px solid #dcd8ce">GP Count</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Open Qty</th><th style="padding:7px;border:1px solid #dcd8ce">GP Count</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Qty Total</th><th style="padding:7px;border:1px solid #dcd8ce">Count Total</th>
      </tr>
      ${rowHtml}${totalHtml}
    </table>
  </div>`;
}

function ownerAgeingEmailNumberCells_(row, isTotal) {
  const cellStyle = isTotal
    ? 'padding:9px;border:1px solid #dcd8ce'
    : 'padding:9px;border:1px solid #dcd8ce';
  const aboveStyle = isTotal
    ? cellStyle
    : `${cellStyle};color:#d95c43;font-weight:700`;
  return [
    `<td style="${cellStyle}">${formatIndianNumber_(row.days0To15Qty)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days0To15Count)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days16To30Qty)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days16To30Count)}</td>`,
    `<td style="${aboveStyle}">${formatIndianNumber_(row.above30Qty)}</td>`,
    `<td style="${aboveStyle}">${formatIndianNumber_(row.above30Count)}</td>`,
    `<td style="${cellStyle};font-weight:700">${formatIndianNumber_(row.totalQty)}</td>`,
    `<td style="${cellStyle};font-weight:700">${formatIndianNumber_(row.totalCount)}</td>`,
  ].join('');
}

function buildPutawayTotalsEmailTable_(table) {
  if (!table || !table.rows.length) {
    return '<div style="padding:14px;background:#fff0ec;color:#d95c43">The putaway totals table could not be parsed from the latest email.</div>';
  }

  const rows = table.rows.concat(table.totals ? [table.totals] : []);
  const rowHtml = rows
    .map((row) => {
      const isTotal = row.owner === 'Grand Total';
      const rowStyle = isTotal
        ? 'background:#203f63;color:#fff;font-weight:700'
        : 'font-weight:700';
      return `<tr style="${rowStyle}">
        <td style="padding:9px;border:1px solid #dcd8ce;text-align:left">${escapeHtml_(row.owner)}</td>
        ${putawayEmailNumberCells_(row, isTotal)}
      </tr>`;
    })
    .join('');

  return `<div style="overflow-x:auto">
    <table role="presentation" style="width:100%;min-width:720px;border-collapse:collapse;font-size:11px;text-align:right">
      <tr style="color:#fff;text-align:center">
        <th rowspan="2" style="padding:9px;background:#203f63;border:1px solid #dcd8ce;text-align:left">Created By</th>
        <th colspan="2" style="padding:9px;background:#16a05a;border:1px solid #dcd8ce">0–3 Days</th>
        <th colspan="2" style="padding:9px;background:#df7d00;border:1px solid #dcd8ce">4–7 Days</th>
        <th colspan="2" style="padding:9px;background:#e42125;border:1px solid #dcd8ce">Above 7 Days</th>
        <th colspan="2" style="padding:9px;background:#203f63;border:1px solid #dcd8ce">Grand Total</th>
      </tr>
      <tr style="background:#eef3f6;color:#14211c;text-align:center">
        <th style="padding:7px;border:1px solid #dcd8ce">Putaway Count</th><th style="padding:7px;border:1px solid #dcd8ce">Quantity</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Putaway Count</th><th style="padding:7px;border:1px solid #dcd8ce">Quantity</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Putaway Count</th><th style="padding:7px;border:1px solid #dcd8ce">Quantity</th>
        <th style="padding:7px;border:1px solid #dcd8ce">Putaway Count</th><th style="padding:7px;border:1px solid #dcd8ce">Total Qty</th>
      </tr>
      ${rowHtml}
    </table>
  </div>`;
}

function putawayEmailNumberCells_(row, isTotal) {
  const cellStyle = 'padding:9px;border:1px solid #dcd8ce';
  const aboveStyle = isTotal
    ? cellStyle
    : `${cellStyle};color:#d95c43;font-weight:700`;
  return [
    `<td style="${cellStyle}">${formatIndianNumber_(row.days0To3Count)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days0To3Qty)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days4To7Count)}</td>`,
    `<td style="${cellStyle}">${formatIndianNumber_(row.days4To7Qty)}</td>`,
    `<td style="${aboveStyle}">${formatIndianNumber_(row.above7Count)}</td>`,
    `<td style="${aboveStyle}">${formatIndianNumber_(row.above7Qty)}</td>`,
    `<td style="${cellStyle};font-weight:700">${formatIndianNumber_(row.totalCount)}</td>`,
    `<td style="${cellStyle};font-weight:700">${formatIndianNumber_(row.totalQty)}</td>`,
  ].join('');
}

function buildReport_(config, timeZone) {
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
      displayType: config.displayType,
      metrics: emptyConfiguredMetrics_(config.metrics),
      table: null,
      dashboardUrl: config.dashboardUrlFallback,
      emailUrl: '',
    };
  }

  const plainBody = normalizeText_(message.getPlainBody());
  const htmlBody = message.getBody();
  const isOwnerAgeingTable = config.displayType === 'OWNER_AGEING_TABLE';
  const isPutawayTotalsTable =
    config.displayType === 'PUTAWAY_TOTALS_TABLE';
  const isTable = isOwnerAgeingTable || isPutawayTotalsTable;
  const metrics = isTable
    ? []
    : parseBestConfiguredMetrics_(
        plainBody,
        htmlBody,
        config.metrics,
      );
  let table = null;
  if (isOwnerAgeingTable) {
    table = parseOwnerAgeingTable_(plainBody);
  } else if (isPutawayTotalsTable) {
    table = parsePutawayTotalsTable_(plainBody);
  }

  return {
    id: config.id,
    title: config.title,
    category: config.category,
    sender: config.sender,
    status: 'ready',
    statusLabel: 'Latest received',
    reportingDate: Utilities.formatDate(
      message.getDate(),
      timeZone,
      'dd MMM yyyy',
    ),
    receivedAt: message.getDate().toISOString(),
    subject: message.getSubject(),
    displayType: config.displayType,
    metrics,
    table,
    dashboardUrl:
      extractDashboardUrl_(htmlBody, plainBody) ||
      config.dashboardUrlFallback,
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

function parseOwnerAgeingTable_(text) {
  const startMarker =
    'Open Qty GP Count Open Qty GP Count Open Qty GP Count Qty Total Count Total';
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.search(/Critical Ageing Alert/i);
  const section =
    startIndex >= 0
      ? text.slice(
          startIndex + startMarker.length,
          endIndex > startIndex ? endIndex : text.length,
        )
      : '';
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];
  let totals = null;
  const rowPattern =
    /^(\d+)\s+(.+?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/;
  const totalPattern =
    /^GRAND TOTAL\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/i;

  lines.forEach((line) => {
    const totalMatch = line.match(totalPattern);
    if (totalMatch) {
      totals = ownerAgeingValues_('GRAND TOTAL', totalMatch.slice(1));
      return;
    }

    const rowMatch = line.match(rowPattern);
    if (rowMatch) {
      rows.push({
        serialNumber: Number(rowMatch[1]),
        ...ownerAgeingValues_(rowMatch[2], rowMatch.slice(3)),
      });
    }
  });

  return {
    title: 'Open Gatepass Ageing Summary — By Owner',
    rows,
    totals,
  };
}

function ownerAgeingValues_(owner, values) {
  const numbers = values.map((value) =>
    Number(String(value).replace(/,/g, '')),
  );
  return {
    owner,
    days0To15Qty: numbers[0] || 0,
    days0To15Count: numbers[1] || 0,
    days16To30Qty: numbers[2] || 0,
    days16To30Count: numbers[3] || 0,
    above30Qty: numbers[4] || 0,
    above30Count: numbers[5] || 0,
    totalQty: numbers[6] || 0,
    totalCount: numbers[7] || 0,
  };
}

function parsePutawayTotalsTable_(text) {
  const startMarker = '📦 Created By Remaining Putaway Details';
  const fallbackMarker = 'Created By Remaining Putaway Details';
  let startIndex = text.indexOf(startMarker);
  if (startIndex < 0) startIndex = text.indexOf(fallbackMarker);
  const section = startIndex >= 0 ? text.slice(startIndex) : text;
  const requestedOwners = [
    'Rupesh Total',
    'Sahil Total',
    'Shraddha Total',
    'Suraj Gupta Total',
  ];
  const rowsByOwner = {};
  let totals = null;
  const rowPattern =
    /^(Rupesh Total|Sahil Total|Shraddha Total|Suraj Gupta Total|Grand Total)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/i;

  section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(rowPattern);
      if (!match) return;
      const matchedOwner = match[1]
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (matchedOwner === 'grand total') {
        totals = putawayValues_('Grand Total', match.slice(2));
        return;
      }
      const owner = requestedOwners.find(
        (name) => name.toLowerCase() === matchedOwner,
      );
      if (owner) rowsByOwner[owner] = putawayValues_(owner, match.slice(2));
    });

  return {
    title: 'Open Putaway Ageing Summary — By Created Owner',
    rows: requestedOwners
      .filter((owner) => rowsByOwner[owner])
      .map((owner) => rowsByOwner[owner]),
    totals,
  };
}

function putawayValues_(owner, values) {
  const numbers = values.map((value) =>
    Number(String(value).replace(/,/g, '')),
  );
  return {
    owner,
    days0To3Count: numbers[0] || 0,
    days0To3Qty: numbers[1] || 0,
    days4To7Count: numbers[2] || 0,
    days4To7Qty: numbers[3] || 0,
    above7Count: numbers[4] || 0,
    above7Qty: numbers[5] || 0,
    totalCount: numbers[6] || 0,
    totalQty: numbers[7] || 0,
  };
}

function parseConfiguredMetrics_(text, metricConfigs) {
  return metricConfigs.map((config) => {
    const labels = config.searchLabels.length
      ? config.searchLabels
      : [config.label];
    const value =
      config.valuePosition === 'BEFORE_OR_AFTER'
        ? extractMetricBeforeOrAfter_(text, labels)
        : extractMetricAfter_(text, labels);
    let note = config.noteValue || 'Latest reported value';

    if (config.noteRule === 'DATE_RANGE') {
      note =
        extractDateRangeAfter_(
          text,
          config.noteValue || labels[0],
        ) || 'Date range not found';
    } else if (config.noteRule === 'NO_CYCLE_COUNT') {
      note = includesIgnoreCase_(text, 'No cycle count was performed')
        ? 'No cycle count performed'
        : extractDateRangeAfter_(
            text,
            config.noteValue || labels[0],
          ) || 'Latest reported value';
    }

    return metric_(config.label, value, note, config.tone);
  });
}

function parseBestConfiguredMetrics_(plainBody, htmlBody, metricConfigs) {
  const plainMetrics = parseConfiguredMetrics_(plainBody, metricConfigs);
  const htmlText = htmlToStructuredText_(htmlBody);
  if (!htmlText) return plainMetrics;

  const htmlMetrics = parseConfiguredMetrics_(htmlText, metricConfigs);
  const plainScore = countParsedMetricValues_(plainMetrics);
  const htmlScore = countParsedMetricValues_(htmlMetrics);
  return htmlScore > plainScore ? htmlMetrics : plainMetrics;
}

function countParsedMetricValues_(metrics) {
  return metrics.filter(
    (metric) => metric.value && metric.value !== '—',
  ).length;
}

function htmlToStructuredText_(html) {
  return normalizeText_(
    decodeHtmlEntities_(
      String(html || '')
        .replace(
          /<(?:br|hr)\b[^>]*\/?>/gi,
          '\n',
        )
        .replace(
          /<\/(?:div|p|section|article|header|footer|h[1-6]|tr|td|th|li)>/gi,
          '\n',
        )
        .replace(/<[^>]*>/g, ' '),
    ),
  );
}

function emptyConfiguredMetrics_(metricConfigs) {
  return metricConfigs.map((config) =>
    metric_(config.label, '—', 'Email not found', config.tone),
  );
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
    const labelMatch = findLabelMatch_(text, labels[i]);
    if (!labelMatch) continue;

    const after = text.slice(labelMatch.end, labelMatch.end + 260);
    const value = firstStandaloneMetric_(after);
    if (value) return value;
  }
  return '';
}

function extractMetricBeforeOrAfter_(text, labels) {
  for (let i = 0; i < labels.length; i += 1) {
    const labelMatch = findLabelMatch_(text, labels[i]);
    if (!labelMatch) continue;

    const before = text.slice(
      Math.max(0, labelMatch.start - 180),
      labelMatch.start,
    );
    const valueBefore = lastStandaloneMetric_(before);
    if (valueBefore) return valueBefore;

    const after = text.slice(labelMatch.end, labelMatch.end + 180);
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
    const match = lines[i].match(
      /^([₹$]?\s*[\d,]+(?:\.\d+)?%?|\d{1,3}:\d{2}|—|-)$/,
    );
    if (match) return match[1].replace(/\s+/g, '');
  }

  const fallback = text.match(
    /(?:^|\s)(\d{1,3}:\d{2}|\d[\d,]*(?:\.\d+)?%?|—)(?=\s|$)/,
  );
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
    const match = lines[i].match(
      /^([₹$]?\s*[\d,]+(?:\.\d+)?%?|\d{1,3}:\d{2}|—|-)$/,
    );
    if (match) return match[1].replace(/\s+/g, '');
  }
  return '';
}

function extractDateRangeAfter_(text, label) {
  const labelMatch = findLabelMatch_(text, label);
  if (!labelMatch) return '';

  const after = text.slice(labelMatch.start, labelMatch.start + 520);
  const fullRange = after.match(
    /(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*[-–]\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4})/,
  );
  if (fullRange) return `${fullRange[1]} – ${fullRange[2]}`;

  const compactRange = after.match(
    /(\d{2}\s+[A-Za-z]{3})\s*[-–]\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4})/,
  );
  if (compactRange) return `${compactRange[1]} – ${compactRange[2]}`;

  const singleDate = after.match(/\d{2}\s+[A-Za-z]{3}\s+\d{4}/);
  return singleDate ? singleDate[0] : '';
}

function findLabelMatch_(text, label) {
  const escapedLabel = String(label || '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  if (!escapedLabel) return null;

  const standalonePattern = new RegExp(
    `(?:^|\\n)\\s*${escapedLabel}\\s*(?=\\n|$)`,
    'i',
  );
  const standaloneMatch = standalonePattern.exec(text);
  if (standaloneMatch) {
    return {
      start: standaloneMatch.index,
      end: standaloneMatch.index + standaloneMatch[0].length,
    };
  }

  const index = text.toLowerCase().indexOf(String(label).toLowerCase());
  return index === -1
    ? null
    : { start: index, end: index + String(label).length };
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

function isAllowedViewer_(email, runtimeConfig) {
  return (
    Boolean(email) &&
    runtimeConfig.allowedEmails.includes(email.toLowerCase())
  );
}

function assertAllowedViewer_(runtimeConfig) {
  const viewerEmail = getViewerEmail_();
  if (!isAllowedViewer_(viewerEmail, runtimeConfig)) {
    throw new Error('Access denied. Sign in with an approved Mosaic Wellness account.');
  }
}

function isStale_(isoDate, staleAfterMinutes) {
  if (!isoDate) return true;
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs > staleAfterMinutes * 60 * 1000;
}

function normalizeText_(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function includesIgnoreCase_(text, search) {
  return text.toLowerCase().includes(search.toLowerCase());
}

function formatIndianNumber_(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function stripHtml_(html) {
  return decodeHtmlEntities_(String(html || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities_(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;|&#8211;|&#x2013;/gi, '–')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
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
