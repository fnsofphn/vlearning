import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type PageId = "dash" | "programs" | "catalog" | "coachees" | "sessions" | "outputs" | "artifacts" | "actions" | "reports" | "admin";
type AuthMode = "signIn" | "signUp";
type AuthForm = { fullName: string; email: string; password: string };
type Profile = { id: string; auth_user_id: string | null; email: string; full_name: string; job_title: string | null; phone: string | null };
type MembershipRow = { id: string; role: string; status: string; is_primary: boolean; tenant_id: string; tenant_code: string; tenant_name: string; tenant_slug: string; tenant_status: string; unit_id: string | null; unit_code: string | null; unit_name: string | null };
type Membership = { id: string; role: string; status: string; is_primary: boolean; tenant: { id: string; code: string; name: string; slug: string; status: string }; unit: { id: string; code: string; name: string } | null };
type Program = { id: string; code: string; name: string; customer_name: string; objective: string | null; audience_summary: string | null; starts_on: string | null; ends_on: string | null; status: string; is_confidential: boolean; coaching_service_modules: { code: string; name: string } | { code: string; name: string }[] | null };
type Cohort = { id: string; program_id: string; code: string; name: string; starts_on: string | null; ends_on: string | null; status: string };
type Assignment = { id: string; program_id: string; cohort_id: string | null; role: string; is_primary: boolean; profiles: { full_name: string } | { full_name: string }[] | null };
type CoachingSession = { id: string; program_id: string; title: string; session_number: number; status: string; scheduled_at: string | null; coachees: { full_name: string } | { full_name: string }[] | null };
type DataState = { programs: Program[]; cohorts: Cohort[]; assignments: Assignment[]; sessions: CoachingSession[] };
type NavItem = { id: PageId; icon: string; label: string; badge?: string };
type Metric = { tone: "crimson" | "navy" | "gold" | "success"; label: string; value: string; detail: string };
type BoardTask = { id: string; title: string; owner: string; due: string; progress: number; laneTag: string; urgency: "gap" | "thuong" | "thap" | "review" | "upload" | "live" };
type BoardColumn = { id: string; title: string; count: number; accent: string; cards: BoardTask[] };
type BoardAlert = { id: string; tone: "danger" | "warning"; title: string; detail: string; action: string };

type EmptyCardProps = { eyebrow: string; title: string; body: string; hint: string };

type DashboardProps = {
  metrics: Metric[];
  data: DataState;
  profile: Profile | null;
  memberships: Membership[];
  onRefresh: () => void;
  refreshing: boolean;
};

type ProgramsProps = {
  data: DataState;
  memberships: Membership[];
  onRefresh: () => void;
  refreshing: boolean;
};

const nav: NavItem[] = [
  { id: "dash", icon: "TQ", label: "Executive Dashboard" },
  { id: "programs", icon: "CT", label: "Hệ thống Khoá học" },
  { id: "catalog", icon: "DM", label: "Danh mục & mẫu", badge: "Sprint 2" },
  { id: "coachees", icon: "CH", label: "Coachee", badge: "Sprint 4" },
  { id: "sessions", icon: "PC", label: "Phiên coaching", badge: "Sprint 4" },
  { id: "outputs", icon: "DR", label: "Đầu ra", badge: "Sprint 5" },
  { id: "artifacts", icon: "TL", label: "Tài liệu & công cụ", badge: "Sprint 5" },
  { id: "actions", icon: "KH", label: "Kế hoạch hành động", badge: "Sprint 5" },
  { id: "reports", icon: "BC", label: "Báo cáo", badge: "Sprint 6" },
  { id: "admin", icon: "QT", label: "Quản trị & phân quyền", badge: "Sprint 6" },
];

const initialAuth: AuthForm = { fullName: "", email: "", password: "" };
const emptyData: DataState = { programs: [], cohorts: [], assignments: [], sessions: [] };
const boardTabs = ["Kanban Tiến trình", "Hàng đợi Ưu tiên", "Thư viện Học liệu", "Luồng Phê duyệt", "Gamification"];
const roadmapSprint: Record<PageId, string> = {
  dash: "Sprint 1",
  programs: "Sprint 1",
  catalog: "Sprint 2",
  coachees: "Sprint 4",
  sessions: "Sprint 4",
  outputs: "Sprint 5",
  artifacts: "Sprint 5",
  actions: "Sprint 5",
  reports: "Sprint 6",
  admin: "Sprint 6",
};

function App() {
  const [page, setPage] = useState<PageId>("dash");
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [form, setForm] = useState<AuthForm>(initialAuth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [data, setData] = useState<DataState>(emptyData);
  const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const primaryMembership = useMemo(() => memberships.find((item) => item.is_primary) ?? memberships[0] ?? null, [memberships]);
  const tenantId = primaryMembership?.tenant.id ?? null;

  const metrics = useMemo<Metric[]>(() => [
    { tone: "crimson", label: "Chương trình đang chạy", value: String(data.programs.filter((item) => item.status === "active").length), detail: `${data.programs.length} chương trình trong tenant hiện tại` },
    { tone: "navy", label: "Cohort hoạt động", value: String(data.cohorts.filter((item) => item.status === "active").length), detail: `${data.cohorts.length} cohort đã được cấu hình` },
    { tone: "gold", label: "Phiên cần theo dõi", value: String(data.sessions.filter((item) => item.status !== "completed").length), detail: `${data.sessions.length} phiên trên hệ thống` },
    { tone: "success", label: "Coach chính", value: String(new Set(data.assignments.filter((item) => item.role === "lead_coach").map((item) => getRelationName(item.profiles)).filter(Boolean)).size), detail: `${data.assignments.length} phân công đang có hiệu lực` },
  ], [data]);

  useEffect(() => {
    document.title = "V-Learning | Executive Dashboard";
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data: authData, error }) => {
      if (!mounted) return;
      if (error) setAuthError(normalizeError(error.message, "Không thể kiểm tra phiên đăng nhập hiện tại."));
      setSession(authData.session ?? null);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
      setAuthMessage(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !configured) {
      setProfile(null);
      setMemberships([]);
      setData(emptyData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setDataError(null);
      const [profileRes, membershipRes] = await Promise.all([
        supabase.rpc("ensure_my_profile", { requested_full_name: form.fullName || null }),
        supabase.rpc("list_my_memberships"),
      ]);
      if (cancelled) return;
      const firstError = profileRes.error ?? membershipRes.error;
      if (firstError) {
        setDataError(normalizeError(firstError.message, "Không thể tải hồ sơ và quyền truy cập."));
        setLoading(false);
        return;
      }
      setProfile(Array.isArray(profileRes.data) ? (profileRes.data[0] as Profile | undefined) ?? null : null);
      setMemberships(Array.isArray(membershipRes.data) ? membershipRes.data.map((item) => mapMembership(item as MembershipRow)) : []);
      setLoading(false);
    }

    void loadAccount();
    return () => {
      cancelled = true;
    };
  }, [session, configured, form.fullName]);

  async function refreshData() {
    if (!tenantId) return;
    setLoading(true);
    setDataError(null);
    const [programsRes, cohortsRes, assignmentsRes, sessionsRes] = await Promise.all([
      supabase.from("coaching_programs").select("id, code, name, customer_name, objective, audience_summary, starts_on, ends_on, status, is_confidential, coaching_service_modules(code, name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("coaching_cohorts").select("id, program_id, code, name, starts_on, ends_on, status").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(24),
      supabase.from("program_assignments").select("id, program_id, cohort_id, role, is_primary, profiles(full_name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(24),
      supabase.from("coaching_sessions").select("id, program_id, title, session_number, status, scheduled_at, coachees(full_name)").eq("tenant_id", tenantId).order("scheduled_at", { ascending: true, nullsFirst: false }).limit(12),
    ]);
    const firstError = programsRes.error ?? cohortsRes.error ?? assignmentsRes.error ?? sessionsRes.error;
    if (firstError) {
      setDataError(normalizeError(firstError.message, "Không thể tải dữ liệu Dashboard và Chương trình."));
      setLoading(false);
      return;
    }
    setData({
      programs: (programsRes.data ?? []) as Program[],
      cohorts: (cohortsRes.data ?? []) as Cohort[],
      assignments: (assignmentsRes.data ?? []) as Assignment[],
      sessions: (sessionsRes.data ?? []) as CoachingSession[],
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!session || !tenantId) return;
    void refreshData();
  }, [session, tenantId]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setAuthError("Thiếu cấu hình Supabase trong file .env.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);
    if (mode === "signUp") {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName.trim() } },
      });
      if (error) {
        setAuthError(normalizeError(error.message, "Không thể tạo tài khoản mới."));
        setAuthBusy(false);
        return;
      }
      setAuthMessage("Tạo tài khoản thành công. Nếu Supabase bật xác nhận email, hãy xác nhận email rồi đăng nhập lại.");
      setAuthBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (error) {
      setAuthError(normalizeError(error.message, "Không thể đăng nhập."));
      setAuthBusy(false);
      return;
    }
    setAuthMessage("Đăng nhập thành công. Hệ thống đang tải dữ liệu nghiệp vụ.");
    setAuthBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("dash");
    setProfile(null);
    setMemberships([]);
    setData(emptyData);
  }

  const topbarTitle = page === "dash" ? "Executive Dashboard" : nav.find((item) => item.id === page)?.label ?? "V-Learning TMS";
  const topbarBreadcrumb = page === "dash" ? "V-Learning TMS / Executive Dashboard" : `V-Learning TMS / ${roadmapSprint[page]}`;
  const todayLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  if (sessionLoading) return <StateScreen eyebrow="Đang khởi tạo" title="Hệ thống đang kiểm tra phiên đăng nhập" body="Ứng dụng đang khôi phục phiên làm việc trước khi tải Dashboard và Chương trình." />;
  if (!configured) return <StateScreen eyebrow="Thiếu cấu hình" title="Chưa cấu hình Supabase" body="Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env rồi khởi động lại ứng dụng." />;
  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-showcase">
            <div className="hero-eyebrow">Giai đoạn 1 · Demo có hồn</div>
            <h1 className="hero-title">V-Learning TMS cho Coaching VHDN trên dữ liệu thật</h1>
            <p className="hero-copy">Bản này giữ layout mock-up, đăng nhập bằng Supabase thật và đọc dữ liệu thật ở các màn trọng điểm để trình diễn được ngay.</p>
            <div className="showcase-list">
              <div className="showcase-item">Trang chủ theo layout board giống mock-up bạn đã chốt.</div>
              <div className="showcase-item">Danh sách chương trình, cohort, coach và phiên coaching đọc trực tiếp từ Supabase.</div>
              <div className="showcase-item">Làm nền an toàn cho các sprint sau mà không phải đập lại giao diện.</div>
            </div>
          </div>
          <div className="auth-panel">
            <div className="page-eyebrow">Đăng nhập hệ thống</div>
            <h2 className="panel-title">Truy cập workspace coaching</h2>
            <p className="page-subtitle">Đăng nhập bằng tài khoản Supabase để tải hồ sơ, quyền tenant và dữ liệu chương trình demo.</p>
            <div className="auth-switch">
              <button className={`switch-button ${mode === "signIn" ? "is-active" : ""}`} onClick={() => setMode("signIn")} type="button">Đăng nhập</button>
              <button className={`switch-button ${mode === "signUp" ? "is-active" : ""}`} onClick={() => setMode("signUp")} type="button">Tạo tài khoản</button>
            </div>
            {authError ? <div className="status-banner is-error">{authError}</div> : null}
            {authMessage ? <div className="status-banner is-success">{authMessage}</div> : null}
            <form className="auth-form" onSubmit={submitAuth}>
              {mode === "signUp" ? <label className="field-grid"><span className="field-label">Họ và tên</span><input className="field-input" onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Ví dụ: Phạm Hoài Nam" required type="text" value={form.fullName} /></label> : null}
              <label className="field-grid"><span className="field-label">Email</span><input className="field-input" autoComplete="email" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="ban@congty.com" required type="email" value={form.email} /></label>
              <label className="field-grid"><span className="field-label">Mật khẩu</span><input className="field-input" autoComplete={mode === "signIn" ? "current-password" : "new-password"} minLength={6} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Tối thiểu 6 ký tự" required type="password" value={form.password} /></label>
              <button className="button primary full" disabled={authBusy} type="submit">{authBusy ? "Đang xử lý..." : mode === "signIn" ? "Đăng nhập" : "Tạo tài khoản"}</button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-row">
            <div className="brand-mark">V·L</div>
            <div>
              <div className="brand-name">V-Learning</div>
              <div className="brand-sub">PeopleOne · TMS</div>
            </div>
          </div>
          <div className="brand-tag">{primaryMembership?.tenant.name ?? "PeopleOne Co., Ltd"}</div>
        </div>
        <div className="nav-group">
          <div className="nav-label">Tổng quan</div>
          {nav.slice(0, 1).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">■</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}
        </div>
        <div className="nav-group">
          <div className="nav-label">Quản lý khoá học</div>
          {nav.slice(1, 2).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">▣</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}
        </div>
        <div className="nav-group">
          <div className="nav-label">Phân hệ nghiệp vụ</div>
          {nav.slice(2, 8).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}
        </div>
        <div className="nav-group">
          <div className="nav-label">Điều hành</div>
          {nav.slice(8).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}
        </div>
        <div className="sidebar-footer">
          <div className="user-chip"><div className="user-avatar">{initials(profile?.full_name ?? session.user.email ?? "VL")}</div><div className="user-meta"><div className="user-name">{profile?.full_name ?? session.user.email}</div><div className="user-role">{labelRole(primaryMembership?.role ?? "business_admin")}</div></div></div>
          <div className="sidebar-actions"><button className="button ghost full" onClick={signOut} type="button">Đăng xuất</button></div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">{topbarBreadcrumb}</div>
            <div className="topbar-title">{topbarTitle}</div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-search">🔎 Tìm kiếm toàn hệ thống...</div>
            <div className="topbar-pill">🗓 {todayLabel}</div>
            <div className="topbar-pill admin-pill">{labelRole(primaryMembership?.role ?? "business_admin")}</div>
            <button className="icon-button" type="button" aria-label="Thông báo">🔔</button>
            <button className="button primary launch-button" type="button">+ Khoá học mới</button>
          </div>
        </header>
        <div className="content-shell">
          {dataError ? <div className="status-banner is-error">{dataError}</div> : null}
          {loading ? <div className="status-banner is-info">Hệ thống đang đồng bộ dữ liệu từ Supabase...</div> : null}
          {!primaryMembership ? <StatePanel eyebrow="Chưa có quyền truy cập" title="Tài khoản đã đăng nhập nhưng chưa có membership" body="Hãy chạy file seed bootstrap hoặc tạo membership cho tài khoản này trong Supabase trước khi tiếp tục Sprint 1." /> : page === "dash" ? <Dashboard metrics={metrics} data={data} profile={profile} memberships={memberships} onRefresh={refreshData} refreshing={loading} /> : page === "programs" ? <Programs data={data} memberships={memberships} onRefresh={refreshData} refreshing={loading} /> : <Roadmap page={page} />}
        </div>
      </main>
    </div>
  );
}

function StateScreen({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <main className="state-shell"><section className="state-card"><div className="page-eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{body}</p></section></main>;
}

function StatePanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <section className="panel"><div className="page-eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{body}</p></section>;
}

function EmptyCard({ eyebrow, title, body, hint }: EmptyCardProps) {
  return <article className="empty-card"><div className="empty-icon">○</div><div className="page-eyebrow">{eyebrow}</div><h3>{title}</h3><p>{body}</p><div className="empty-hint">{hint}</div></article>;
}

function Dashboard({ metrics, data, profile, memberships, onRefresh, refreshing }: DashboardProps) {
  const tenantName = memberships[0]?.tenant.name ?? "PeopleOne Co., Ltd";
  const boardColumns = createBoardColumns(data);
  const alerts = createBoardAlerts(data);
  const waitingReview = data.sessions.filter((item) => item.status === "prework_sent" || item.status === "prework_completed").length;

  return (
    <div className="page-stack board-page">
      <section className="board-hero hero-panel">
        <div className="hero-copy-wrap">
          <div className="hero-eyebrow">Control tower · Demo Sprint 1</div>
          <h1 className="hero-title">Executive Dashboard vận hành khóa học & coaching</h1>
          <p className="hero-copy">Trang chủ bám layout mock-up để demo, nhưng số liệu và danh sách nền bên dưới vẫn đang đọc từ Supabase thật của tenant {tenantName}.</p>
        </div>
        <div className="hero-chips compact-chips">
          {metrics.map((metric) => <div key={metric.label} className={`hero-chip tone-${metric.tone}`}><span className="hero-chip-value">{metric.value}</span><span className="hero-chip-label">{metric.label}</span></div>)}
        </div>
      </section>

      <section className="section-toolbar board-toolbar">
        <div>
          <div className="panel-eyebrow">Sản xuất học liệu</div>
          <h2 className="panel-title">Bảng điều phối theo mock-up</h2>
          <p className="page-subtitle">Giữ cảm giác sản phẩm để demo ngay, đồng thời chừa đúng chỗ cho dữ liệu thật của các sprint tiếp theo.</p>
        </div>
        <button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button>
      </section>

      <section className="mock-tabs">
        {boardTabs.map((tab, index) => <button key={tab} className={`mock-tab ${index === 0 ? "is-active" : ""}`} type="button">{tab}</button>)}
      </section>

      <section className="board-alerts">
        {alerts.map((alert) => (
          <article key={alert.id} className={`board-alert is-${alert.tone}`}>
            <div className="board-alert-dot" />
            <div className="board-alert-body">
              <div className="board-alert-title">{alert.title}</div>
              <div className="board-alert-detail">{alert.detail}</div>
            </div>
            <button className="alert-action" type="button">{alert.action}</button>
          </article>
        ))}
      </section>
      <section className="kanban-board">
        {boardColumns.map((column) => (
          <article key={column.id} className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-title"><span className={`kanban-accent is-${column.accent}`} />{column.title}</div>
              <span className="kanban-count">{column.count}</span>
            </div>
            <div className="kanban-column-body">
              {column.cards.length > 0 ? column.cards.map((card) => (
                <div key={card.id} className={`kanban-card lane-${card.urgency}`}>
                  <div className="kanban-card-title">{card.title}</div>
                  <div className="kanban-card-owner">{card.owner}</div>
                  {column.id === "producing" ? <div className="mini-progress"><div className="mini-progress-bar" style={{ width: `${card.progress}%` }} /></div> : null}
                  <div className="kanban-card-meta">
                    <span className={`kanban-badge badge-${card.urgency}`}>{card.laneTag}</span>
                    <span>{card.due}</span>
                  </div>
                </div>
              )) : <EmptyColumnCard columnId={column.id} />}
            </div>
          </article>
        ))}
      </section>

      <section className="bottom-strip">
        <article className="bottom-card score-card">
          <div className="bottom-icon">🏆</div>
          <div>
            <div className="bottom-title">Hệ thống Điểm số & Thành tích</div>
            <div className="bottom-copy">{profile?.full_name ?? "Bạn"} hiện đang theo dõi {metrics[2]?.value ?? "0"} phiên, {waitingReview} hạng mục chờ review và {metrics[0]?.value ?? "0"} chương trình đang chạy.</div>
          </div>
        </article>
        <article className="bottom-card badges-card">
          <div className="bottom-title">Huy chương & Cấp độ</div>
          <div className="reward-row">
            <span className="reward-badge bronze">Thân thiện 0 - 300 XP</span>
            <span className="reward-badge silver">Chuyên nghiệp 301 - 700</span>
            <span className="reward-badge gold">Xuất sắc 701+</span>
          </div>
        </article>
      </section>
    </div>
  );
}

function EmptyColumnCard({ columnId }: { columnId: string }) {
  const content: Record<string, { title: string; body: string }> = {
    requested: { title: "Chưa có đầu việc mới", body: "Danh sách sẽ xuất hiện khi có chương trình, cohort hoặc session mới cần khởi tạo." },
    producing: { title: "Chưa có hạng mục đang sản xuất", body: "Khi Sprint 3 và Sprint 4 có dữ liệu thật dày hơn, cột này sẽ tự đầy lên." },
    review: { title: "Không có hạng mục chờ review", body: "Đây là trạng thái tốt để demo, và sau này sẽ map sang output/artifact review." },
    upload: { title: "Không có hạng mục chờ upload", body: "Cột này sẽ nhận dữ liệu từ output, artifact và các cổng LMS ở Sprint 5." },
    done: { title: "Chưa có mục hoàn thành", body: "Các phiên completed hoặc chương trình closed sẽ xuất hiện tại đây." },
  };
  const item = content[columnId] ?? content.requested;
  return <div className="kanban-empty"><div className="kanban-empty-title">{item.title}</div><div className="kanban-empty-copy">{item.body}</div></div>;
}

function Programs({ data, memberships, onRefresh, refreshing }: ProgramsProps) {
  const tenantName = memberships[0]?.tenant.name ?? "Tenant hiện tại";
  return <div className="page-stack"><section className="page-header"><div><div className="page-eyebrow">Sprint 1 · Chương trình</div><h1 className="page-title">Hệ thống Khoá học & danh sách chương trình</h1><p className="page-subtitle">Màn này đang nối trực tiếp với Supabase để hiển thị chương trình, cohort, phân công và phiên coaching của tenant {tenantName}.</p></div><div className="action-row"><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button><button className="button primary" type="button">Sprint 3: CRUD Chương trình</button></div></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Danh sách chương trình</div><h2 className="panel-title">Portfolio coaching</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Chương trình</th><th>Khách hàng</th><th>Module</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{data.programs.length > 0 ? data.programs.map((program) => <tr key={program.id}><td><div className="cell-title">{program.name}</div><div className="cell-subtitle">{program.code}</div></td><td>{program.customer_name}</td><td>{moduleName(program.coaching_service_modules)}</td><td><span className={`status-pill is-${program.status}`}>{labelProgramStatus(program.status)}</span></td><td>{dateRange(program.starts_on, program.ends_on)}</td></tr>) : <tr><td colSpan={5}><div className="empty-state inline"><EmptyCard eyebrow="Chưa có chương trình" title="Bảng chương trình đang trống" body="Không có bản ghi chương trình nào trong tenant hiện tại, nên bảng chưa có gì để hiển thị." hint="Khi xây xong Sprint 3, người dùng sẽ tạo chương trình mới trực tiếp từ màn này." /></div></td></tr>}</tbody></table></div></section><section className="panel side-panel-stack"><div><div className="panel-eyebrow">Cohort</div><h2 className="panel-title">Tổng quan cohort</h2></div><div className="list-grid compact">{data.cohorts.length > 0 ? data.cohorts.slice(0, 8).map((cohort) => <article key={cohort.id} className="list-card slim with-accent"><div className="feature-code-row"><span className="mono-pill">{cohort.code}</span><span className={`status-pill is-${cohort.status}`}>{labelProgramStatus(cohort.status)}</span></div><h3>{cohort.name}</h3><p>{dateRange(cohort.starts_on, cohort.ends_on)}</p></article>) : <EmptyCard eyebrow="Chưa có cohort" title="Tenant này chưa có cohort nào" body="Cohort sẽ xuất hiện ở đây sau khi chương trình được mở và bắt đầu gán đơn vị hoặc nhóm người tham gia." hint="Đây là điểm nối trực tiếp sang Sprint 3 và Sprint 4." />}</div></section></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phân công</div><h2 className="panel-title">Người phụ trách chương trình</h2></div></div><div className="list-grid compact two-up">{data.assignments.length > 0 ? data.assignments.map((assignment) => <article key={assignment.id} className="list-card slim"><div className="small-label">{labelAssignmentRole(assignment.role)}</div><h3>{getRelationName(assignment.profiles) || "Chưa gán"}</h3><p>{assignment.is_primary ? "Vai trò chính" : "Vai trò phụ"}</p></article>) : <EmptyCard eyebrow="Chưa có assignment" title="Chưa có ai được phân công" body="Bảng assignment hiện chưa có dữ liệu nên lane phụ trách chương trình vẫn đang trống." hint="Khi module Program/Cohort/Assignment hoàn chỉnh, vùng này sẽ thành nơi kiểm soát coach chính, reviewer và điều phối." />}</div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phiên coaching</div><h2 className="panel-title">Phiên gần nhất theo chương trình</h2></div></div><div className="timeline">{data.sessions.length > 0 ? data.sessions.map((item) => <div key={item.id} className="timeline-item"><div className="timeline-dot is-active" /><div><div className="timeline-title">{item.title}</div><div className="timeline-body">Phiên {item.session_number} · {labelSessionStatus(item.status)} · {dateTime(item.scheduled_at)}</div></div></div>) : <EmptyCard eyebrow="Chưa có session" title="Danh sách phiên hiện đang rỗng" body="Sprint 1 chỉ mới đọc session. Việc tạo journey và session thật sẽ được triển khai ở Sprint 4." hint="Thiết kế hiện tại đã chừa đúng vị trí để hoàn chỉnh module Session mà không cần đổi shell." />}</div></section></section></div>;
}

function Roadmap({ page }: { page: PageId }) {
  const label = nav.find((item) => item.id === page)?.label ?? "Phân hệ";
  const sprint = roadmapSprint[page];
  return <section className="panel"><div className="page-eyebrow">{sprint}</div><h1 className="page-title">{label} sẽ được triển khai theo roadmap</h1><p className="page-subtitle">Shell React thật đã sẵn sàng. Màn này là placeholder có chủ đích để chúng ta lần lượt hoàn thiện từng sprint mà vẫn giữ giao diện thống nhất bằng tiếng Việt có dấu.</p><div className="roadmap-grid"><article className="list-card slim"><h3>Sprint 1</h3><p>React shell thật + Dashboard/Programs list dùng Supabase.</p></article><article className="list-card slim"><h3>Sprint 2</h3><p>Catalog CRUD thật cho service modules, methods, templates.</p></article><article className="list-card slim"><h3>Sprint 3</h3><p>Program/Cohort/Assignment CRUD thật.</p></article><article className="list-card slim"><h3>Sprint 4</h3><p>Coachee/Journey/Session CRUD thật.</p></article><article className="list-card slim"><h3>Sprint 5</h3><p>Output/Artifact/Action Plan thật.</p></article><article className="list-card slim"><h3>Sprint 6</h3><p>Reports + hardening permission + QA.</p></article></div></section>;
}
function createBoardColumns(data: DataState): BoardColumn[] {
  const programs = data.programs;
  const sessions = data.sessions;

  const requestedCards = programs.slice(0, 3).map((program, index) => ({
    id: `requested-${program.id}`,
    title: `${program.customer_name} · ${program.name}`,
    owner: moduleName(program.coaching_service_modules),
    due: `Hạn ${shortDate(program.starts_on, index + 10)}`,
    progress: Math.max(20, 45 - index * 10),
    laneTag: index === 0 ? "Gấp" : index === 1 ? "Thường" : "Thấp",
    urgency: pickUrgency(index),
  }));

  const producingCards = sessions.slice(0, 3).map((session, index) => ({
    id: `producing-${session.id}`,
    title: `${programNameById(programs, session.program_id)} · ${session.title}`,
    owner: getRelationName(session.coachees) || "Chưa gán coachee",
    due: `Hạn ${shortDate(session.scheduled_at, index + 12)}`,
    progress: progressByStatus(session.status),
    laneTag: statusProgressLabel(session.status),
    urgency: pickUrgency(index),
  }));

  const reviewCards = sessions.filter((session) => ["prework_sent", "prework_completed", "in_progress"].includes(session.status)).slice(0, 3).map((session, index) => ({
    id: `review-${session.id}`,
    title: `${programNameById(programs, session.program_id)} · ${session.title}`,
    owner: getRelationName(session.coachees) || "Reviewer nội bộ",
    due: `Review ${shortDate(session.scheduled_at, index + 14)}`,
    progress: progressByStatus(session.status),
    laneTag: index % 2 === 0 ? "Review ND" : "Review KT",
    urgency: "review" as const,
  }));

  const uploadCards = programs.slice(0, 2).map((program, index) => ({
    id: `upload-${program.id}`,
    title: `${program.customer_name} · Hồ sơ LMS`,
    owner: program.name,
    due: `Chờ ${shortDate(program.ends_on, index + 15)}`,
    progress: 50,
    laneTag: index === 0 ? "Chờ IT · LMS" : "Chờ QA cuối",
    urgency: "upload" as const,
  }));

  const doneCards = sessions.filter((session) => session.status === "completed").slice(0, 3).map((session) => ({
    id: `done-${session.id}`,
    title: `${programNameById(programs, session.program_id)} · ${session.title}`,
    owner: getRelationName(session.coachees) || "Đã hoàn thành",
    due: `Live ${shortDate(session.scheduled_at, 18)}`,
    progress: 100,
    laneTag: "Phát hành",
    urgency: "live" as const,
  }));

  return [
    { id: "requested", title: "Yêu cầu", count: requestedCards.length, accent: "crimson", cards: requestedCards },
    { id: "producing", title: "Đang SX", count: producingCards.length, accent: "gold", cards: producingCards },
    { id: "review", title: "Chờ Review", count: reviewCards.length, accent: "navy", cards: reviewCards },
    { id: "upload", title: "Chờ Upload", count: uploadCards.length, accent: "blue", cards: uploadCards },
    { id: "done", title: "Hoàn thành", count: doneCards.length, accent: "green", cards: doneCards },
  ];
}

function createBoardAlerts(data: DataState): BoardAlert[] {
  const urgentProgram = data.programs[0];
  const reviewProgram = data.programs[1] ?? data.programs[0];
  return [
    {
      id: "urgent",
      tone: "danger",
      title: urgentProgram ? `${urgentProgram.customer_name} — ${urgentProgram.code} · Còn 5 ngày` : "Chưa có chương trình ưu tiên",
      detail: urgentProgram ? `Tiến độ cần đẩy nhanh cho ${urgentProgram.name}. Hãy rà lại cohort, session và phân công để không trễ demo.` : "Seed dữ liệu demo để thẻ ưu tiên hiển thị đúng tinh thần mock-up.",
      action: "Thúc đẩy",
    },
    {
      id: "review",
      tone: "warning",
      title: reviewProgram ? `${reviewProgram.customer_name} — cần chốt nội dung review` : "Chưa có hạng mục review",
      detail: reviewProgram ? `Đang có ${data.sessions.filter((item) => item.status !== "completed").length} phiên cần theo dõi để cập nhật tiến trình review và upload.` : "Sau khi có thêm session hoặc output, vùng này sẽ chuyển sang dữ liệu thật rõ nét hơn.",
      action: "Review",
    },
  ];
}

function mapMembership(row: MembershipRow): Membership { return { id: row.id, role: row.role, status: row.status, is_primary: row.is_primary, tenant: { id: row.tenant_id, code: row.tenant_code, name: row.tenant_name, slug: row.tenant_slug, status: row.tenant_status }, unit: row.unit_id ? { id: row.unit_id, code: row.unit_code ?? "", name: row.unit_name ?? "" } : null }; }
function getRelationName(value: Assignment["profiles"] | CoachingSession["coachees"]) { if (!value) return ""; return Array.isArray(value) ? value[0]?.full_name ?? "" : value.full_name; }
function moduleName(value: Program["coaching_service_modules"]) { if (!value) return "Chưa gắn module"; return Array.isArray(value) ? value[0]?.name ?? "Chưa gắn module" : value.name; }
function initials(value: string) { return value.split(" ").filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase() ?? "").join("") || "VL"; }
function labelRole(value: string) { return ({ system_admin: "SYSTEM", business_admin: "ADMIN", coach: "COACH", coachee_internal: "COACHEE", coachee_guest: "KHÁCH", reviewer: "REVIEWER", executive_viewer: "LÃNH ĐẠO" } as Record<string, string>)[value] ?? value.toUpperCase(); }
function labelAssignmentRole(value: string) { return ({ lead_coach: "Coach chính", support_coach: "Coach hỗ trợ", reviewer: "Reviewer", coordinator: "Điều phối" } as Record<string, string>)[value] ?? value; }
function labelProgramStatus(value: string) { return ({ draft: "Nháp", active: "Đang hoạt động", paused: "Tạm dừng", completed: "Hoàn thành", archived: "Lưu trữ" } as Record<string, string>)[value] ?? value; }
function labelSessionStatus(value: string) { return ({ planned: "Đã lên kế hoạch", prework_sent: "Đã gửi pre-work", prework_completed: "Đã hoàn thành pre-work", in_progress: "Đang diễn ra", completed: "Đã hoàn thành", follow_up_required: "Cần follow-up", postponed: "Hoãn", cancelled: "Hủy" } as Record<string, string>)[value] ?? value; }
function dateRange(a: string | null, b: string | null) { if (!a && !b) return "Chưa cập nhật thời gian"; const formatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); if (a && b) return `${formatter.format(new Date(a))} - ${formatter.format(new Date(b))}`; return formatter.format(new Date(a ?? b ?? new Date().toISOString())); }
function dateTime(value: string | null) { if (!value) return "Chưa lên lịch"; return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function shortDate(value: string | null, fallbackDayOffset: number) { const date = value ? new Date(value) : new Date(Date.now() + fallbackDayOffset * 24 * 60 * 60 * 1000); return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date); }
function pickUrgency(index: number): BoardTask["urgency"] { return index === 0 ? "gap" : index === 1 ? "thuong" : "thap"; }
function progressByStatus(value: string) { return ({ planned: 35, prework_sent: 55, prework_completed: 70, in_progress: 82, completed: 100, follow_up_required: 60, postponed: 28, cancelled: 15 } as Record<string, number>)[value] ?? 40; }
function statusProgressLabel(value: string) { return ({ planned: "35%", prework_sent: "55%", prework_completed: "70%", in_progress: "82%", completed: "100%", follow_up_required: "60%", postponed: "28%", cancelled: "15%" } as Record<string, string>)[value] ?? "40%"; }
function programNameById(programs: Program[], programId: string) { return programs.find((item) => item.id === programId)?.customer_name ?? "Chương trình"; }
function normalizeError(message: string | undefined, fallback: string) { if (!message) return fallback; const lower = message.toLowerCase(); if (lower.includes("invalid login credentials")) return "Email hoặc mật khẩu chưa đúng."; if (lower.includes("email not confirmed")) return "Tài khoản chưa xác nhận email. Hãy kiểm tra hộp thư hoặc tắt email confirmation trong Supabase để thử nhanh."; if (lower.includes("permission denied") || lower.includes("row-level security")) return "Supabase đang chặn quyền truy cập dữ liệu. Hãy kiểm tra grants và RLS policies."; return message; }

export default App;



