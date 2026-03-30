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
  { id: "dash", icon: "TQ", label: "Tổng quan" },
  { id: "programs", icon: "CT", label: "Chương trình" },
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
    document.title = "v-Culture | Quản trị Coaching VHDN";
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(normalizeError(error.message, "Không thể kiểm tra phiên đăng nhập hiện tại."));
      setSession(data.session ?? null);
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

  if (sessionLoading) return <StateScreen eyebrow="Đang khởi tạo" title="Hệ thống đang kiểm tra phiên đăng nhập" body="Ứng dụng đang khôi phục phiên làm việc trước khi tải Dashboard và Chương trình." />;
  if (!configured) return <StateScreen eyebrow="Thiếu cấu hình" title="Chưa cấu hình Supabase" body="Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env rồi khởi động lại ứng dụng." />;
  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-showcase">
            <div className="hero-eyebrow">Sprint 1 · Shell React thật</div>
            <h1 className="hero-title">Quản trị Coaching VHDN trên nền dữ liệu thật</h1>
            <p className="hero-copy">Giai đoạn này tập trung dựng shell React thật, kết nối Supabase thật và hiển thị Dashboard cùng danh sách Chương trình bằng tiếng Việt có dấu.</p>
            <div className="showcase-list">
              <div className="showcase-item">Giữ tinh thần giao diện mock-up nhưng chuyển sang kiến trúc ứng dụng thật.</div>
              <div className="showcase-item">Ưu tiên luồng Chương trình, Cohort, Coach phụ trách và Phiên coaching.</div>
              <div className="showcase-item">Làm nền vững cho Sprint 2 đến Sprint 6.</div>
            </div>
          </div>
          <div className="auth-panel">
            <div className="page-eyebrow">Đăng nhập hệ thống</div>
            <h2 className="panel-title">Truy cập workspace coaching</h2>
            <p className="page-subtitle">Đăng nhập bằng tài khoản Supabase để tải hồ sơ, quyền tenant và dữ liệu chương trình.</p>
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
            <div className="brand-mark">V·C</div>
            <div>
              <div className="brand-name">v-Culture</div>
              <div className="brand-sub">Quản trị Coaching VHDN</div>
            </div>
          </div>
          <div className="brand-tag">Tenant: {primaryMembership?.tenant.name ?? "Chưa xác định"}</div>
        </div>
        <div className="nav-group">
          <div className="nav-label">Điều hướng nghiệp vụ</div>
          {nav.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}
        </div>
        <div className="sidebar-footer">
          <div className="user-chip"><div className="user-avatar">{initials(profile?.full_name ?? session.user.email ?? "VC")}</div><div className="user-meta"><div className="user-name">{profile?.full_name ?? session.user.email}</div><div className="user-role">{labelRole(primaryMembership?.role ?? "business_admin")}</div></div></div>
          <div className="sidebar-actions"><button className="button ghost full" onClick={signOut} type="button">Đăng xuất</button></div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div><div className="topbar-breadcrumb">v-Culture / Coaching VHDN / Sprint 1</div><div className="topbar-title">{nav.find((item) => item.id === page)?.label ?? "Quản trị Coaching VHDN"}</div></div>
          <div className="topbar-actions"><div className="topbar-pill">{primaryMembership?.unit?.name ?? "Chưa gán đơn vị"}</div><div className="topbar-search">{profile?.email ?? session.user.email ?? "Đã đăng nhập"}</div></div>
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
  const featured = data.programs[0] ?? null;
  return <div className="page-stack"><section className="hero-panel"><div className="hero-copy-wrap"><div className="hero-eyebrow">Dashboard điều hành</div><h1 className="hero-title">Tổng quan vận hành Coaching VHDN theo dữ liệu thật</h1><p className="hero-copy">Đây là shell React thật của Sprint 1. Dữ liệu đang đọc trực tiếp từ Supabase theo membership của người dùng để làm nền cho các sprint tiếp theo.</p></div><div className="hero-chips"><div className="hero-chip"><span className="hero-chip-value">{memberships.length}</span><span className="hero-chip-label">quyền truy cập hiện có</span></div><div className="hero-chip"><span className="hero-chip-value">{data.programs.length}</span><span className="hero-chip-label">chương trình đang hiển thị</span></div><div className="hero-chip"><span className="hero-chip-value">{data.sessions.length}</span><span className="hero-chip-label">phiên cần theo dõi</span></div></div></section><section className="section-toolbar"><div><div className="panel-eyebrow">Sprint 1</div><h2 className="panel-title">Dashboard và Chương trình đang đọc dữ liệu thật</h2></div><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button></section><section className="stats-row">{metrics.map((metric) => <article key={metric.label} className={`stat-card tone-${metric.tone}`}><div className="stat-eye">{metric.label}</div><div className="stat-value">{metric.value}</div><div className="stat-detail">{metric.detail}</div></article>)}</section><section className="two-column"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Chương trình trọng tâm</div><h2 className="panel-title">Điểm nhấn điều hành</h2></div></div>{featured ? <div className="feature-card"><div className="feature-code-row"><span className="mono-pill">{featured.code}</span><span className={`status-pill is-${featured.status}`}>{labelProgramStatus(featured.status)}</span></div><h3>{featured.name}</h3><p>{featured.objective ?? "Chưa cập nhật mục tiêu coaching cho chương trình này."}</p><div className="feature-meta">Khách hàng: {featured.customer_name}</div><div className="feature-meta">Module: {moduleName(featured.coaching_service_modules)}</div><div className="feature-meta">Thời gian: {dateRange(featured.starts_on, featured.ends_on)}</div></div> : <EmptyCard eyebrow="Chưa có dữ liệu" title="Tenant này chưa có chương trình coaching" body="Màn Dashboard đã nối dữ liệu thật, nhưng hiện chưa có bản ghi chương trình nào để làm điểm nhấn điều hành." hint="Khi sang Sprint 3, chúng ta sẽ thêm CRUD Chương trình và Cohort để lấp đầy vùng này." />}<div className="section-copy"><h3>Người dùng hiện tại</h3><p>{profile?.full_name ?? "Tài khoản hiện tại"} đang sử dụng shell Sprint 1 để theo dõi chương trình, cohort, phiên coaching và các phân công chính.</p></div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phiên sắp tới</div><h2 className="panel-title">Nhịp theo dõi gần nhất</h2></div></div><div className="timeline">{data.sessions.length > 0 ? data.sessions.slice(0, 5).map((item) => <div key={item.id} className="timeline-item"><div className="timeline-dot is-active" /><div><div className="timeline-title">Phiên {item.session_number}: {item.title}</div><div className="timeline-body">{getRelationName(item.coachees) || "Chưa gán coachee"} · {labelSessionStatus(item.status)} · {dateTime(item.scheduled_at)}</div></div></div>) : <EmptyCard eyebrow="Chưa có phiên" title="Chưa phát sinh phiên coaching nào" body="Dữ liệu session hiện đang rỗng nên Dashboard chưa có timeline vận hành để hiển thị." hint="Khi hoàn thiện Sprint 4, journey và session CRUD sẽ cấp dữ liệu thật cho phần này." />}</div></section></section><section className="two-column"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Chương trình gần đây</div><h2 className="panel-title">Danh sách đang theo dõi</h2></div></div><div className="list-grid">{data.programs.length > 0 ? data.programs.slice(0, 6).map((program) => <article key={program.id} className="list-card"><div className="feature-code-row"><span className="mono-pill">{program.code}</span><span className={`status-pill is-${program.status}`}>{labelProgramStatus(program.status)}</span></div><h3>{program.name}</h3><p>{program.customer_name}</p><div className="small-note">{moduleName(program.coaching_service_modules)}</div></article>) : <EmptyCard eyebrow="Danh sách trống" title="Chưa có chương trình để hiển thị" body="Danh sách chương trình sẽ xuất hiện tại đây ngay khi tenant được seed hoặc người dùng tạo chương trình mới ở Sprint 3." hint="Bản Sprint 1 đã hoàn chỉnh phần đọc dữ liệu, nên từ giờ chỉ cần thêm CRUD đúng module." />}</div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phân công nổi bật</div><h2 className="panel-title">Coach và lane vận hành</h2></div></div><div className="list-grid compact">{data.assignments.length > 0 ? data.assignments.slice(0, 6).map((assignment) => <article key={assignment.id} className="list-card slim"><div className="small-label">{labelAssignmentRole(assignment.role)}</div><h3>{getRelationName(assignment.profiles) || "Chưa gán hồ sơ"}</h3><p>{assignment.is_primary ? "Phân công chính" : "Phân công hỗ trợ"}</p></article>) : <EmptyCard eyebrow="Chưa có phân công" title="Tenant này chưa gán coach hoặc reviewer" body="Bảng phân công đang được đọc từ Supabase, nhưng hiện chưa có bản ghi nào phù hợp với tenant hiện tại." hint="Sprint 3 sẽ hoàn thiện CRUD Program/Cohort/Assignment để vùng này vận hành thật." />}</div></section></section></div>;
}

function Programs({ data, memberships, onRefresh, refreshing }: ProgramsProps) {
  const tenantName = memberships[0]?.tenant.name ?? "Tenant hiện tại";
  return <div className="page-stack"><section className="page-header"><div><div className="page-eyebrow">Sprint 1 · Chương trình</div><h1 className="page-title">Danh sách Chương trình & Cohort</h1><p className="page-subtitle">Màn này đang nối trực tiếp với Supabase để hiển thị danh sách chương trình, cohort, phân công và phiên coaching của tenant {tenantName}.</p></div><div className="action-row"><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button><button className="button primary" type="button">Sprint 3: CRUD Chương trình</button></div></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Danh sách chương trình</div><h2 className="panel-title">Portfolio coaching</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Chương trình</th><th>Khách hàng</th><th>Module</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{data.programs.length > 0 ? data.programs.map((program) => <tr key={program.id}><td><div className="cell-title">{program.name}</div><div className="cell-subtitle">{program.code}</div></td><td>{program.customer_name}</td><td>{moduleName(program.coaching_service_modules)}</td><td><span className={`status-pill is-${program.status}`}>{labelProgramStatus(program.status)}</span></td><td>{dateRange(program.starts_on, program.ends_on)}</td></tr>) : <tr><td colSpan={5}><div className="empty-state inline"><EmptyCard eyebrow="Chưa có chương trình" title="Bảng chương trình đang trống" body="Không có bản ghi chương trình nào trong tenant hiện tại, nên bảng chưa có gì để hiển thị." hint="Khi xây xong Sprint 3, người dùng sẽ tạo chương trình mới trực tiếp từ màn này." /></div></td></tr>}</tbody></table></div></section><section className="panel side-panel-stack"><div><div className="panel-eyebrow">Cohort</div><h2 className="panel-title">Tổng quan cohort</h2></div><div className="list-grid compact">{data.cohorts.length > 0 ? data.cohorts.slice(0, 8).map((cohort) => <article key={cohort.id} className="list-card slim with-accent"><div className="feature-code-row"><span className="mono-pill">{cohort.code}</span><span className={`status-pill is-${cohort.status}`}>{labelProgramStatus(cohort.status)}</span></div><h3>{cohort.name}</h3><p>{dateRange(cohort.starts_on, cohort.ends_on)}</p></article>) : <EmptyCard eyebrow="Chưa có cohort" title="Tenant này chưa có cohort nào" body="Cohort sẽ xuất hiện ở đây sau khi chương trình được mở và bắt đầu gán đơn vị hoặc nhóm người tham gia." hint="Đây là điểm nối trực tiếp sang Sprint 3 và Sprint 4." />}</div></section></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phân công</div><h2 className="panel-title">Người phụ trách chương trình</h2></div></div><div className="list-grid compact two-up">{data.assignments.length > 0 ? data.assignments.map((assignment) => <article key={assignment.id} className="list-card slim"><div className="small-label">{labelAssignmentRole(assignment.role)}</div><h3>{getRelationName(assignment.profiles) || "Chưa gán"}</h3><p>{assignment.is_primary ? "Vai trò chính" : "Vai trò phụ"}</p></article>) : <EmptyCard eyebrow="Chưa có assignment" title="Chưa có ai được phân công" body="Bảng assignment hiện chưa có dữ liệu nên lane phụ trách chương trình vẫn đang trống." hint="Khi module Program/Cohort/Assignment hoàn chỉnh, vùng này sẽ thành nơi kiểm soát coach chính, reviewer và điều phối." />}</div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phiên coaching</div><h2 className="panel-title">Phiên gần nhất theo chương trình</h2></div></div><div className="timeline">{data.sessions.length > 0 ? data.sessions.map((item) => <div key={item.id} className="timeline-item"><div className="timeline-dot is-active" /><div><div className="timeline-title">{item.title}</div><div className="timeline-body">Phiên {item.session_number} · {labelSessionStatus(item.status)} · {dateTime(item.scheduled_at)}</div></div></div>) : <EmptyCard eyebrow="Chưa có session" title="Danh sách phiên hiện đang rỗng" body="Sprint 1 chỉ mới đọc session. Việc tạo journey và session thật sẽ được triển khai ở Sprint 4." hint="Thiết kế hiện tại đã chừa đúng vị trí để hoàn chỉnh module Session mà không cần đổi shell." />}</div></section></section></div>;
}

function Roadmap({ page }: { page: PageId }) {
  const label = nav.find((item) => item.id === page)?.label ?? "Phân hệ";
  const sprint = { dash: "Sprint 1", programs: "Sprint 1", catalog: "Sprint 2", coachees: "Sprint 4", sessions: "Sprint 4", outputs: "Sprint 5", artifacts: "Sprint 5", actions: "Sprint 5", reports: "Sprint 6", admin: "Sprint 6" }[page];
  return <section className="panel"><div className="page-eyebrow">{sprint}</div><h1 className="page-title">{label} sẽ được triển khai theo roadmap</h1><p className="page-subtitle">Shell React thật đã sẵn sàng. Màn này là placeholder có chủ đích để chúng ta lần lượt hoàn thiện từng sprint mà vẫn giữ giao diện thống nhất bằng tiếng Việt có dấu.</p><div className="roadmap-grid"><article className="list-card slim"><h3>Sprint 1</h3><p>React shell thật + Dashboard/Programs list dùng Supabase.</p></article><article className="list-card slim"><h3>Sprint 2</h3><p>Catalog CRUD thật cho service modules, methods, templates.</p></article><article className="list-card slim"><h3>Sprint 3</h3><p>Program/Cohort/Assignment CRUD thật.</p></article><article className="list-card slim"><h3>Sprint 4</h3><p>Coachee/Journey/Session CRUD thật.</p></article><article className="list-card slim"><h3>Sprint 5</h3><p>Output/Artifact/Action Plan thật.</p></article><article className="list-card slim"><h3>Sprint 6</h3><p>Reports + hardening permission + QA.</p></article></div></section>;
}

function mapMembership(row: MembershipRow): Membership { return { id: row.id, role: row.role, status: row.status, is_primary: row.is_primary, tenant: { id: row.tenant_id, code: row.tenant_code, name: row.tenant_name, slug: row.tenant_slug, status: row.tenant_status }, unit: row.unit_id ? { id: row.unit_id, code: row.unit_code ?? "", name: row.unit_name ?? "" } : null }; }
function getRelationName(value: Assignment["profiles"] | CoachingSession["coachees"]) { if (!value) return ""; return Array.isArray(value) ? value[0]?.full_name ?? "" : value.full_name; }
function moduleName(value: Program["coaching_service_modules"]) { if (!value) return "Chưa gắn module"; return Array.isArray(value) ? value[0]?.name ?? "Chưa gắn module" : value.name; }
function initials(value: string) { return value.split(" ").filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase() ?? "").join("") || "VC"; }
function labelRole(value: string) { return ({ system_admin: "Quản trị hệ thống", business_admin: "Quản trị nghiệp vụ coaching", coach: "Coach", coachee_internal: "Coachee nội bộ", coachee_guest: "Coachee khách", reviewer: "Reviewer/SME", executive_viewer: "Lãnh đạo giám sát" } as Record<string, string>)[value] ?? value; }
function labelAssignmentRole(value: string) { return ({ lead_coach: "Coach chính", support_coach: "Coach hỗ trợ", reviewer: "Reviewer", coordinator: "Điều phối" } as Record<string, string>)[value] ?? value; }
function labelProgramStatus(value: string) { return ({ draft: "Nháp", active: "Đang hoạt động", paused: "Tạm dừng", completed: "Hoàn thành", archived: "Lưu trữ" } as Record<string, string>)[value] ?? value; }
function labelSessionStatus(value: string) { return ({ planned: "Đã lên kế hoạch", prework_sent: "Đã gửi pre-work", prework_completed: "Đã hoàn thành pre-work", in_progress: "Đang diễn ra", completed: "Đã hoàn thành", follow_up_required: "Cần follow-up", postponed: "Hoãn", cancelled: "Hủy" } as Record<string, string>)[value] ?? value; }
function dateRange(a: string | null, b: string | null) { if (!a && !b) return "Chưa cập nhật thời gian"; const formatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); if (a && b) return `${formatter.format(new Date(a))} - ${formatter.format(new Date(b))}`; return formatter.format(new Date(a ?? b ?? new Date().toISOString())); }
function dateTime(value: string | null) { if (!value) return "Chưa lên lịch"; return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function normalizeError(message: string | undefined, fallback: string) { if (!message) return fallback; const lower = message.toLowerCase(); if (lower.includes("invalid login credentials")) return "Email hoặc mật khẩu chưa đúng."; if (lower.includes("email not confirmed")) return "Tài khoản chưa xác nhận email. Hãy kiểm tra hộp thư hoặc tắt email confirmation trong Supabase để thử nhanh."; if (lower.includes("permission denied") || lower.includes("row-level security")) return "Supabase đang chặn quyền truy cập dữ liệu. Hãy kiểm tra grants và RLS policies."; return message; }

export default App;
