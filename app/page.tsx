type Metric = {
  label: string;
  value: string;
  note?: string;
  tone?: "positive" | "warning";
};

type Report = {
  id: string;
  category: string;
  title: string;
  reportingDate: string;
  freshness: string;
  sender: string;
  metrics: Metric[];
  dashboardUrl: string;
  emailUrl: string;
};

const reports: Report[] = [
  {
    id: "inventory-cycle-count",
    category: "Inventory control",
    title: "Inventory Cycle Count",
    reportingDate: "27 Jul 2026",
    freshness: "Latest received",
    sender: "bhavesh.patel@mosaicwellness.in",
    metrics: [
      {
        label: "Last Quarter",
        value: "99.02%",
        note: "01 Apr – 30 Jun",
        tone: "positive",
      },
      {
        label: "Last Month",
        value: "98.6%",
        note: "01 Jun – 30 Jun",
        tone: "positive",
      },
      {
        label: "Month to Date",
        value: "99.56%",
        note: "01 Jul – 28 Jul",
        tone: "positive",
      },
      {
        label: "Yesterday",
        value: "0%",
        note: "No cycle count performed",
        tone: "warning",
      },
    ],
    dashboardUrl:
      "https://bjpatel90.github.io/Inventory_Visibility/",
    emailUrl: "https://mail.google.com/mail/#all/19fa4dd5b42285a4",
  },
  {
    id: "fefo-violations",
    category: "Dispatch compliance",
    title: "FEFO Violations",
    reportingDate: "23 Jul 2026",
    freshness: "Latest KPI report",
    sender: "farhana.teli@mosaicwellness.in",
    metrics: [
      {
        label: "Violated Batch Count",
        value: "12",
        tone: "warning",
      },
      {
        label: "Dispatch First Batch Count",
        value: "21",
      },
      {
        label: "Overall FEFO Compliance",
        value: "79%",
        tone: "positive",
      },
      {
        label: "Overall FEFO Non-Compliance",
        value: "21%",
        tone: "warning",
      },
    ],
    dashboardUrl:
      "https://datastudio.google.com/u/0/reporting/320397c5-8ecd-4e85-b281-36d3694a82e8/page/JaFbF",
    emailUrl: "https://mail.google.com/mail/#all/19f8dfd412381980",
  },
];

function ArrowIcon() {
  return (
    <span aria-hidden="true" className="arrow-icon">
      ↗
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <header className="masthead">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            MK
          </div>
          <div>
            <p className="eyebrow">Mosaic Wellness</p>
            <p className="brand-name">Operations Intelligence</p>
          </div>
        </div>
        <div className="updated">
          <span className="live-dot" aria-hidden="true" />
          Updated 28 Jul 2026
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="kicker">Unified KPI workspace</p>
          <h1 id="page-title">Operations KPI Command Center</h1>
          <p className="hero-copy">
            One view of the latest operational health reports, with direct
            access to every source dashboard and email.
          </p>
        </div>
        <div className="hero-summary" aria-label="Dashboard summary">
          <span className="summary-number">{reports.length}</span>
          <span className="summary-label">reports linked</span>
        </div>
      </section>

      <nav className="report-nav" aria-label="Jump to report">
        <span>Reports</span>
        {reports.map((report) => (
          <a href={`#${report.id}`} key={report.id}>
            {report.title}
          </a>
        ))}
      </nav>

      <section className="report-list" aria-label="KPI reports">
        {reports.map((report, index) => (
          <article className="report-card" id={report.id} key={report.id}>
            <div className="report-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="report-content">
              <header className="report-header">
                <div>
                  <p className="category">{report.category}</p>
                  <h2>{report.title}</h2>
                </div>
                <div className="report-meta">
                  <span className="freshness">{report.freshness}</span>
                  <span>Reporting date · {report.reportingDate}</span>
                </div>
              </header>

              <div className="metric-grid">
                {report.metrics.map((metric) => (
                  <div className="metric" key={metric.label}>
                    <p>{metric.label}</p>
                    <strong className={metric.tone ?? ""}>{metric.value}</strong>
                    <span>{metric.note ?? "Latest reported value"}</span>
                  </div>
                ))}
              </div>

              <footer className="report-footer">
                <p title={report.sender}>Source · {report.sender}</p>
                <div className="actions">
                  <a
                    className="button button-primary"
                    href={report.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open dashboard <ArrowIcon />
                  </a>
                  <a
                    className="button button-secondary"
                    href={report.emailUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open email <ArrowIcon />
                  </a>
                </div>
              </footer>
            </div>
          </article>
        ))}
      </section>

      <footer className="page-footer">
        <p>More KPI reports will appear here as they are linked.</p>
        <a href="#page-title">Back to top ↑</a>
      </footer>
    </main>
  );
}
