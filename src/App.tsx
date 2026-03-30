import { useMemo, useState } from "react";
import {
  dashboardCards,
  dashboardMetrics,
  dashboardTimeline,
  moduleConfigs,
  navigation,
  type Metric,
  type ModuleConfig,
} from "./data";

function App() {
  const [activePage, setActivePage] = useState("dash");
  const [activeTabs, setActiveTabs] = useState<Record<string, number>>({});

  const activeModule = useMemo(
    () => moduleConfigs.find((item) => item.id === activePage),
    [activePage],
  );

  const handleTabChange = (moduleId: string, tabIndex: number) => {
    setActiveTabs((current) => ({ ...current, [moduleId]: tabIndex }));
  };

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-row">
            <div className="brand-mark">VC</div>
            <div>
              <div className="brand-name">v-Culture</div>
              <div className="brand-sub">COACHING VHDN MVP FOUNDATION</div>
            </div>
          </div>
          <div className="brand-tag">Supabase + Vercel build track</div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Coaching Domain Map</div>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "is-active" : ""}`}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">PM</div>
            <div>
              <div className="user-name">Coaching Product Build</div>
              <div className="user-role">Schema-first MVP</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">v-Culture / Coaching VHDN / Product Build</div>
            <div className="topbar-title">
              {activePage === "dash" ? "Coaching MVP Overview" : activeModule?.title}
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-pill">30/03/2026</div>
            <div className="topbar-search">
              {isSupabaseConfigured
                ? "Supabase env is configured for local development"
                : "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the app"}
            </div>
          </div>
        </header>

        <section className="content-shell">
          {activePage === "dash" ? (
            <DashboardView isSupabaseConfigured={isSupabaseConfigured} />
          ) : activeModule ? (
            <ModuleView
              module={activeModule}
              activeTab={activeTabs[activeModule.id] ?? 0}
              onTabChange={handleTabChange}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function DashboardView({ isSupabaseConfigured }: { isSupabaseConfigured: boolean }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="hero-eyebrow">Coaching VHDN MVP</div>
          <h1 className="hero-title">Nền build thực tế cho sản phẩm Coaching trên Supabase và Vercel</h1>
          <p className="hero-copy">
            Repo này đã được xoay trục từ mock shell sang nền triển khai cho `Quản trị Coaching
            VHDN`: có sơ đồ module, migration SQL, backlog MVP, env mẫu và shell giao diện để
            chúng ta tiếp tục code theo từng phase.
          </p>
        </div>

        <div className="hero-chips">
          <div className="hero-chip">
            <span className="hero-chip-value">MVP</span>
            <span className="hero-chip-label">delivery-first scope</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">Guest</span>
            <span className="hero-chip-label">external coachee supported</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">
              {isSupabaseConfigured ? "Ready" : "Setup"}
            </span>
            <span className="hero-chip-label">Supabase connection</span>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Build Direction</div>
              <h2 className="panel-title">Những gì đã được chốt để tránh scope trôi</h2>
            </div>
          </div>
          <div className="dashboard-cards">
            {dashboardCards.map((card) => (
              <article key={card.title} className="mini-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <div className="tag-row">
                  {card.tags.map((tag) => (
                    <span key={tag} className="soft-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Delivery Roadmap</div>
              <h2 className="panel-title">Trình tự build khả thi với team gọn</h2>
            </div>
          </div>

          <div className="timeline">
            {dashboardTimeline.map((item) => (
              <div key={item.title} className="timeline-item">
                <div className={`timeline-dot is-${item.state}`} />
                <div>
                  <div className="timeline-title">{item.title}</div>
                  <div className="timeline-body">{item.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="note-box">
            Điểm mấu chốt của bản build này là: schema `Supabase` đã được tách theo tư duy
            catalog/runtime, nên chúng ta có thể đi tiếp sang auth, CRUD và RLS mà không phải
            thiết kế lại từ đầu.
          </div>
        </div>
      </section>
    </div>
  );
}

function ModuleView({
  module,
  activeTab,
  onTabChange,
}: {
  module: ModuleConfig;
  activeTab: number;
  onTabChange: (moduleId: string, tabIndex: number) => void;
}) {
  const bullets = module.bullets.slice(activeTab, activeTab + 3);
  const visibleBullets = bullets.length > 0 ? bullets : module.bullets.slice(0, 3);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="page-eyebrow">{module.eyebrow}</div>
          <h1 className="page-title">{module.title}</h1>
          <p className="page-subtitle">{module.subtitle}</p>
        </div>

        <div className="action-row">
          {module.actions.map((action) => (
            <button key={action} className="button ghost" type="button">
              {action}
            </button>
          ))}
        </div>
      </section>

      <section className="feature-banner">
        <div className="feature-copy">
          <div className="feature-label">Implementation focus</div>
          <div className="feature-title">{module.headline}</div>
        </div>
      </section>

      <section className="metric-grid">
        {module.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {module.tabs ? (
        <section className="tabbar">
          {module.tabs.map((tab, index) => (
            <button
              key={tab}
              className={`tab ${activeTab === index ? "is-active" : ""}`}
              onClick={() => onTabChange(module.id, index)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </section>
      ) : null}

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Current build slice</div>
              <h2 className="panel-title">{module.tabs?.[activeTab] ?? "Overview"}</h2>
            </div>
            <button className="button primary" type="button">
              Build next
            </button>
          </div>

          <div className="section-copy">
            <h3>Phạm vi đề xuất cho nhánh triển khai tiếp theo</h3>
            <p>
              Mỗi vùng dưới đây nên được code thành một cụm CRUD + workflow nhỏ, bám thẳng vào
              schema Supabase và tránh gom quá nhiều use case vào cùng một sprint.
            </p>
          </div>

          <div className="bullet-grid">
            {visibleBullets.map((item) => (
              <div key={item} className="bullet-card">
                <div className="bullet-title">{item}</div>
                <div className="bullet-body">
                  Đây là ứng viên tốt để chuyển thành screen, table, form hoặc workflow service
                  ở ngay sprint kế tiếp.
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Engineering notes</div>
              <h2 className="panel-title">Checklist trước khi code sâu</h2>
            </div>
          </div>

          <div className="checklist">
            <ChecklistItem text="Xác định bảng Supabase nào là source of truth cho module này." />
            <ChecklistItem text="Chốt quyền đọc/ghi của business admin, coach, coachee guest và executive viewer." />
            <ChecklistItem text="Quyết định component nào đọc trực tiếp từ Supabase và component nào cần service wrapper." />
            <ChecklistItem text="Tách state loading, empty, error và permission denied ngay từ đầu." />
          </div>

          <div className="note-box">
            Khi mình bắt đầu code module thật, ưu tiên hợp lý nhất là `Catalog`, `Programs`,
            `Coachees`, `Sessions`, `Outputs`.
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className={`metric-card tone-${metric.tone}`}>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-value">{metric.value}</div>
      <div className="metric-detail">{metric.detail}</div>
    </article>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="check-item">
      <div className="check-box" />
      <div className="check-text">{text}</div>
    </div>
  );
}

export default App;
