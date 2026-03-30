import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type PageId = "dash" | "programs" | "crm" | "instructors" | "ops" | "content" | "curriculum" | "gamification" | "lms" | "competency" | "workload" | "reports" | "admin";
type AuthMode = "signIn" | "signUp";
type AuthForm = { fullName: string; email: string; password: string };
type Profile = { id: string; auth_user_id: string | null; email: string; full_name: string; job_title: string | null; phone: string | null };
type MembershipRow = { id: string; role: string; status: string; is_primary: boolean; tenant_id: string; tenant_code: string; tenant_name: string; tenant_slug: string; tenant_status: string; unit_id: string | null; unit_code: string | null; unit_name: string | null };
type Membership = { id: string; role: string; status: string; is_primary: boolean; tenant: { id: string; code: string; name: string; slug: string; status: string }; unit: { id: string; code: string; name: string } | null };
type Customer = { id: string; code: string; name: string; short_name: string | null; industry: string | null; status: string; customer_contacts?: { full_name: string; title: string | null; email: string | null }[] | null };
type Contract = { id: string; code: string; name: string; starts_on: string | null; ends_on: string | null; total_value: number | null; status: string; customer_id: string; customers?: { name: string } | { name: string }[] | null };
type Course = { id: string; code: string; name: string; topic_type: string; training_format: string; start_date: string | null; end_date: string | null; status: string; objective: string | null; customer_id: string; contract_id: string | null; customers?: { name: string; short_name: string | null } | { name: string; short_name: string | null }[] | null; contracts?: { code: string } | { code: string }[] | null; course_types?: { name: string } | { name: string }[] | null };
type CourseClass = { id: string; course_id: string; code: string; name: string; start_date: string | null; end_date: string | null; status: string; expected_learners: number | null };
type CourseSession = { id: string; course_id: string; class_id: string | null; title: string; session_number: number; status: string; scheduled_at: string | null };
type InstructorAssignment = { id: string; course_id: string | null; class_id: string | null; session_id: string | null; scope: string; role: string; is_primary: boolean; instructors?: { full_name: string } | { full_name: string }[] | null; profiles?: { full_name: string } | { full_name: string }[] | null };
type Instructor = { id: string; code: string; full_name: string; instructor_type: string; headline: string | null; status: string; instructor_readiness?: { readiness_status: string }[] | null };
type ContentRequest = { id: string; course_id: string; class_id: string | null; request_code: string; title: string; request_type: string; status: string; priority: string; due_date: string | null; owner_profile_id: string | null };
type DashboardSnapshot = { id: string; active_course_count: number; upcoming_course_count: number; active_contract_value: number; on_time_rate: number; open_content_request_count: number; open_risk_count: number };
type DataState = { customers: Customer[]; contracts: Contract[]; courses: Course[]; classes: CourseClass[]; sessions: CourseSession[]; assignments: InstructorAssignment[]; instructors: Instructor[]; contentRequests: ContentRequest[]; dashboardSnapshot: DashboardSnapshot | null };
type NavItem = { id: PageId; icon: string; label: string; badge?: string };
type Metric = { tone: "crimson" | "navy" | "gold" | "success"; label: string; value: string; detail: string };
type BoardTask = { id: string; title: string; owner: string; due: string; progress: number; laneTag: string; urgency: "gap" | "thuong" | "thap" | "review" | "upload" | "live" };
type BoardColumn = { id: string; title: string; count: number; accent: string; cards: BoardTask[] };
type BoardAlert = { id: string; tone: "danger" | "warning"; title: string; detail: string; action: string };
type EmptyCardProps = { eyebrow: string; title: string; body: string; hint: string };
type DashboardProps = { metrics: Metric[]; data: DataState; profile: Profile | null; memberships: Membership[]; onRefresh: () => void; refreshing: boolean };
type CoursesProps = { data: DataState; memberships: Membership[]; onRefresh: () => void; refreshing: boolean };
type CrmProps = { data: DataState; onRefresh: () => void; refreshing: boolean };

const nav: NavItem[] = [
  { id: "dash", icon: "■", label: "Executive Dashboard" },
  { id: "programs", icon: "▣", label: "Hệ thống Khoá học" },
  { id: "crm", icon: "CRM", label: "Hợp đồng & Khách hàng" },
  { id: "instructors", icon: "GV", label: "Giảng viên", badge: "Sprint 4" },
  { id: "ops", icon: "OPS", label: "Vận hành Lớp học", badge: "Sprint 6" },
  { id: "content", icon: "SX", label: "Sản xuất Học liệu", badge: "Sprint 7" },
  { id: "curriculum", icon: "GA", label: "Giáo án giảng dạy", badge: "Sprint 6" },
  { id: "gamification", icon: "GM", label: "Gamification", badge: "V2" },
  { id: "lms", icon: "LMS", label: "E-learning & LMS", badge: "V2" },
  { id: "competency", icon: "NL", label: "Khung Năng lực", badge: "V2" },
  { id: "workload", icon: "WL", label: "Quản lý Tổng thể", badge: "Sprint 6" },
  { id: "reports", icon: "BC", label: "Báo cáo & Phân tích", badge: "V2" },
  { id: "admin", icon: "QT", label: "Quản trị & phân quyền", badge: "V1" },
];

const initialAuth: AuthForm = { fullName: "", email: "", password: "" };
const emptyData: DataState = { customers: [], contracts: [], courses: [], classes: [], sessions: [], assignments: [], instructors: [], contentRequests: [], dashboardSnapshot: null };
const boardTabs = ["Kanban Tiến trình", "Hàng đợi Ưu tiên", "Thư viện Học liệu", "Luồng Phê duyệt", "Gamification"];
const roadmapSprint: Record<PageId, string> = { dash: "Sprint 1", programs: "Sprint 3", crm: "Sprint 2", instructors: "Sprint 4", ops: "Sprint 6", content: "Sprint 7", curriculum: "Sprint 6", gamification: "V2", lms: "V2", competency: "V2", workload: "Sprint 6", reports: "V2", admin: "V1" };

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

  const metrics = useMemo<Metric[]>(() => {
    const snapshot = data.dashboardSnapshot;
    const leadInstructors = new Set(data.assignments.filter((item) => item.role === "lead_instructor").map((item) => relationName(item.instructors) || relationName(item.profiles)).filter(Boolean));
    return [
      { tone: "crimson", label: "Khoá đang triển khai", value: String(snapshot?.active_course_count ?? data.courses.filter((item) => item.status === "active").length), detail: `${data.courses.length} khoá trong tenant hiện tại` },
      { tone: "navy", label: "Khoá sắp khai giảng", value: String(snapshot?.upcoming_course_count ?? data.courses.filter((item) => item.status === "preparing").length), detail: `${data.classes.length} lớp đã được cấu hình` },
      { tone: "gold", label: "YC học liệu mở", value: String(snapshot?.open_content_request_count ?? data.contentRequests.filter((item) => item.status !== "completed").length), detail: `${data.sessions.length} buổi học đang theo dõi` },
      { tone: "success", label: "Giảng viên lead", value: String(leadInstructors.size), detail: `${data.instructors.length} hồ sơ giảng viên đang hoạt động` },
    ];
  }, [data]);

  useEffect(() => { document.title = "V-Learning | Executive Dashboard"; }, []);

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
    return () => { mounted = false; subscription.unsubscribe(); };
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
    return () => { cancelled = true; };
  }, [session, configured, form.fullName]);

  async function refreshData() {
    if (!tenantId) return;
    setLoading(true);
    setDataError(null);
    const [customersRes, contractsRes, coursesRes, classesRes, sessionsRes, assignmentsRes, instructorsRes, contentRes, snapshotRes] = await Promise.all([
      supabase.from("customers").select("id, code, name, short_name, industry, status, customer_contacts(full_name, title, email)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("contracts").select("id, code, name, starts_on, ends_on, total_value, status, customer_id, customers(name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("courses").select("id, code, name, topic_type, training_format, start_date, end_date, status, objective, customer_id, contract_id, customers(name, short_name), contracts(code), course_types(name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("course_classes").select("id, course_id, code, name, start_date, end_date, status, expected_learners").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(16),
      supabase.from("course_sessions").select("id, course_id, class_id, title, session_number, status, scheduled_at").eq("tenant_id", tenantId).order("scheduled_at", { ascending: true, nullsFirst: false }).limit(12),
      supabase.from("instructor_assignments").select("id, course_id, class_id, session_id, scope, role, is_primary, instructors(full_name), profiles(full_name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("instructors").select("id, code, full_name, instructor_type, headline, status, instructor_readiness(readiness_status)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("content_requests").select("id, course_id, class_id, request_code, title, request_type, status, priority, due_date, owner_profile_id").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(12),
      supabase.from("dashboard_snapshots").select("id, active_course_count, upcoming_course_count, active_contract_value, on_time_rate, open_content_request_count, open_risk_count").eq("tenant_id", tenantId).order("snapshot_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const firstError = customersRes.error ?? contractsRes.error ?? coursesRes.error ?? classesRes.error ?? sessionsRes.error ?? assignmentsRes.error ?? instructorsRes.error ?? contentRes.error ?? snapshotRes.error;
    if (firstError) {
      setDataError(normalizeError(firstError.message, "Không thể tải dữ liệu mới từ schema course-centric."));
      setLoading(false);
      return;
    }
    setData({
      customers: (customersRes.data ?? []) as Customer[],
      contracts: (contractsRes.data ?? []) as Contract[],
      courses: (coursesRes.data ?? []) as Course[],
      classes: (classesRes.data ?? []) as CourseClass[],
      sessions: (sessionsRes.data ?? []) as CourseSession[],
      assignments: (assignmentsRes.data ?? []) as InstructorAssignment[],
      instructors: (instructorsRes.data ?? []) as Instructor[],
      contentRequests: (contentRes.data ?? []) as ContentRequest[],
      dashboardSnapshot: (snapshotRes.data as DashboardSnapshot | null) ?? null,
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
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName.trim() } } });
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

  if (sessionLoading) return <StateScreen eyebrow="Đang khởi tạo" title="Hệ thống đang kiểm tra phiên đăng nhập" body="Ứng dụng đang khôi phục phiên làm việc trước khi tải Dashboard và CRM." />;
  if (!configured) return <StateScreen eyebrow="Thiếu cấu hình" title="Chưa cấu hình Supabase" body="Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env rồi khởi động lại ứng dụng." />;
  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-showcase">
            <div className="hero-eyebrow">Sprint 0 den Sprint 2</div>
            <h1 className="hero-title">V-Learning TMS theo schema course-centric</h1>
            <p className="hero-copy">Bản này đã chuyển nền dữ liệu sang SRS v4: khách hàng, hợp đồng, khoá học, giảng viên, học liệu và dashboard điều hành.</p>
            <div className="showcase-list">
              <div className="showcase-item">Executive Dashboard đọc dữ liệu thật từ schema mới.</div>
              <div className="showcase-item">Hệ thống Khoá học và CRM là hai lát cắt đầu tiên để demo end-to-end.</div>
              <div className="showcase-item">Không còn phụ thuộc nghiệp vụ coaching cũ cho các màn mới.</div>
            </div>
          </div>
          <div className="auth-panel">
            <div className="page-eyebrow">Đăng nhập hệ thống</div>
            <h2 className="panel-title">Truy cập workspace V-Learning TMS</h2>
            <p className="page-subtitle">Đăng nhập bằng tài khoản Supabase để tải tenant, membership và dữ liệu mới của SRS v4.</p>
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
        <div className="nav-group"><div className="nav-label">Tổng quan</div>{nav.slice(0, 1).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span></button>)}</div>
        <div className="nav-group"><div className="nav-label">Điều hành khoá học</div>{nav.slice(1, 3).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}</div>
        <div className="nav-group"><div className="nav-label">Phân hệ nghiệp vụ</div>{nav.slice(3, 11).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}</div>
        <div className="nav-group"><div className="nav-label">Điều hành</div>{nav.slice(11).map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "is-active" : ""}`} onClick={() => setPage(item.id)} type="button"><span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</button>)}</div>
        <div className="sidebar-footer"><div className="user-chip"><div className="user-avatar">{initials(profile?.full_name ?? session.user.email ?? "VL")}</div><div className="user-meta"><div className="user-name">{profile?.full_name ?? session.user.email}</div><div className="user-role">{labelRole(primaryMembership?.role ?? "business_admin")}</div></div></div><div className="sidebar-actions"><button className="button ghost full" onClick={signOut} type="button">Đăng xuất</button></div></div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div><div className="topbar-breadcrumb">{topbarBreadcrumb}</div><div className="topbar-title">{topbarTitle}</div></div>
          <div className="topbar-actions"><div className="topbar-search">🔎 Tìm kiếm toàn hệ thống...</div><div className="topbar-pill">🗓 {todayLabel}</div><div className="topbar-pill admin-pill">{labelRole(primaryMembership?.role ?? "business_admin")}</div><button className="icon-button" type="button" aria-label="Thông báo">🔔</button><button className="button primary launch-button" type="button">+ Khoá học mới</button></div>
        </header>
        <div className="content-shell">
          {dataError ? <div className="status-banner is-error">{dataError}</div> : null}
          {loading ? <div className="status-banner is-info">Hệ thống đang đồng bộ dữ liệu từ schema course-centric...</div> : null}
          {!primaryMembership ? <StatePanel eyebrow="Chưa có quyền truy cập" title="Tài khoản đã đăng nhập nhưng chưa có membership" body="Hãy chạy seed bootstrap hoặc tạo membership cho tài khoản này trong Supabase trước khi tiếp tục." /> : page === "dash" ? <Dashboard metrics={metrics} data={data} profile={profile} memberships={memberships} onRefresh={refreshData} refreshing={loading} /> : page === "programs" ? <CoursesPage data={data} memberships={memberships} onRefresh={refreshData} refreshing={loading} /> : page === "crm" ? <CrmPage data={data} onRefresh={refreshData} refreshing={loading} /> : <Roadmap page={page} />}
        </div>
      </main>
    </div>
  );
}

function StateScreen({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) { return <main className="state-shell"><section className="state-card"><div className="page-eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{body}</p></section></main>; }
function StatePanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) { return <section className="panel"><div className="page-eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{body}</p></section>; }
function EmptyCard({ eyebrow, title, body, hint }: EmptyCardProps) { return <article className="empty-card"><div className="empty-icon">○</div><div className="page-eyebrow">{eyebrow}</div><h3>{title}</h3><p>{body}</p><div className="empty-hint">{hint}</div></article>; }
function Dashboard({ metrics, data, profile, memberships, onRefresh, refreshing }: DashboardProps) {
  const tenantName = memberships[0]?.tenant.name ?? "PeopleOne Co., Ltd";
  const boardColumns = createBoardColumns(data);
  const alerts = createBoardAlerts(data);
  const waitingReview = data.contentRequests.filter((item) => item.status === "review").length;

  return (
    <div className="page-stack board-page">
      <section className="board-hero hero-panel">
        <div className="hero-copy-wrap">
          <div className="hero-eyebrow">Control tower · Sprint 1</div>
          <h1 className="hero-title">Executive Dashboard vận hành theo SRS v4</h1>
          <p className="hero-copy">Dashboard này đang đọc từ schema course-centric mới của tenant {tenantName}: khách hàng, hợp đồng, khoá học, giảng viên, buổi học và học liệu.</p>
        </div>
        <div className="hero-chips compact-chips">{metrics.map((metric) => <div key={metric.label} className={`hero-chip tone-${metric.tone}`}><span className="hero-chip-value">{metric.value}</span><span className="hero-chip-label">{metric.label}</span></div>)}</div>
      </section>
      <section className="section-toolbar board-toolbar"><div><div className="panel-eyebrow">Sản xuất học liệu</div><h2 className="panel-title">Bảng điều phối theo mock-up</h2><p className="page-subtitle">Lane vẫn bám mock-up, nhưng dữ liệu nguồn đã chuyển sang `content_requests`, `courses` và `course_sessions`.</p></div><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button></section>
      <section className="mock-tabs">{boardTabs.map((tab, index) => <button key={tab} className={`mock-tab ${index === 0 ? "is-active" : ""}`} type="button">{tab}</button>)}</section>
      <section className="board-alerts">{alerts.map((alert) => <article key={alert.id} className={`board-alert is-${alert.tone}`}><div className="board-alert-dot" /><div className="board-alert-body"><div className="board-alert-title">{alert.title}</div><div className="board-alert-detail">{alert.detail}</div></div><button className="alert-action" type="button">{alert.action}</button></article>)}</section>
      <section className="kanban-board">{boardColumns.map((column) => <article key={column.id} className="kanban-column"><div className="kanban-column-header"><div className="kanban-column-title"><span className={`kanban-accent is-${column.accent}`} />{column.title}</div><span className="kanban-count">{column.count}</span></div><div className="kanban-column-body">{column.cards.length > 0 ? column.cards.map((card) => <div key={card.id} className={`kanban-card lane-${card.urgency}`}><div className="kanban-card-title">{card.title}</div><div className="kanban-card-owner">{card.owner}</div>{column.id === "producing" ? <div className="mini-progress"><div className="mini-progress-bar" style={{ width: `${card.progress}%` }} /></div> : null}<div className="kanban-card-meta"><span className={`kanban-badge badge-${card.urgency}`}>{card.laneTag}</span><span>{card.due}</span></div></div>) : <EmptyColumnCard columnId={column.id} />}</div></article>)}</section>
      <section className="bottom-strip"><article className="bottom-card score-card"><div className="bottom-icon">🏆</div><div><div className="bottom-title">Hệ thống Điểm số & Thành tích</div><div className="bottom-copy">{profile?.full_name ?? "Bạn"} đang theo dõi {metrics[0]?.value ?? "0"} khoá đang triển khai, {waitingReview} hạng mục chờ review và {data.contracts.length} hợp đồng hoạt động.</div></div></article><article className="bottom-card badges-card"><div className="bottom-title">Huy chương & Cấp độ</div><div className="reward-row"><span className="reward-badge bronze">Thân thiện 0 - 300 XP</span><span className="reward-badge silver">Chuyên nghiệp 301 - 700</span><span className="reward-badge gold">Xuất sắc 701+</span></div></article></section>
    </div>
  );
}

function EmptyColumnCard({ columnId }: { columnId: string }) {
  const content: Record<string, { title: string; body: string }> = {
    requested: { title: "Chưa có yêu cầu mới", body: "Yêu cầu sẽ xuất hiện khi CRM, Khoá học và học liệu được seed đủ dữ liệu." },
    producing: { title: "Chưa có hạng mục đang sản xuất", body: "Cột này đang chờ content request chuyển trạng thái sang producing." },
    review: { title: "Không có hạng mục chờ review", body: "Khi đội nội dung hoặc giảng viên cần review, hệ thống sẽ hiện tại đây." },
    upload: { title: "Không có hạng mục chờ upload", body: "Vùng này sẽ map dần sang LMS ở phase tiếp theo." },
    done: { title: "Chưa có mục hoàn thành", body: "Các request đã hoàn tất hoặc session đã kết thúc sẽ hiển thị tại đây." },
  };
  const item = content[columnId] ?? content.requested;
  return <div className="kanban-empty"><div className="kanban-empty-title">{item.title}</div><div className="kanban-empty-copy">{item.body}</div></div>;
}

function CoursesPage({ data, memberships, onRefresh, refreshing }: CoursesProps) {
  const tenantName = memberships[0]?.tenant.name ?? "Tenant hiện tại";
  return <div className="page-stack"><section className="page-header"><div><div className="page-eyebrow">Sprint 3 · Hệ thống Khoá học</div><h1 className="page-title">Danh sách Khoá học và lớp triển khai</h1><p className="page-subtitle">Màn này đã chuyển sang schema mới để hiển thị khóa học, lớp, phân công giảng viên và buổi học của tenant {tenantName}.</p></div><div className="action-row"><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button><button className="button primary" type="button">Sprint 3: Tạo khoá học 4 bước</button></div></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Danh sách khoá học</div><h2 className="panel-title">Course registry</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Khoá học</th><th>Khách hàng</th><th>Loại hình</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{data.courses.length > 0 ? data.courses.map((course) => <tr key={course.id}><td><div className="cell-title">{course.name}</div><div className="cell-subtitle">{course.code}</div></td><td>{customerName(course.customers)}</td><td>{courseTypeName(course.course_types)} / {labelTopicType(course.topic_type)}</td><td><span className={`status-pill is-${course.status}`}>{labelCourseStatus(course.status)}</span></td><td>{dateRange(course.start_date, course.end_date)}</td></tr>) : <tr><td colSpan={5}><div className="empty-state inline"><EmptyCard eyebrow="Chưa có khoá học" title="Course registry đang trống" body="Sau khi chạy seed V1, các khóa học thật sẽ xuất hiện ở đây." hint="Đây là màn trung tâm của toàn bộ V-Learning TMS." /></div></td></tr>}</tbody></table></div></section><section className="panel side-panel-stack"><div><div className="panel-eyebrow">Lớp học</div><h2 className="panel-title">Lớp đang triển khai</h2></div><div className="list-grid compact">{data.classes.length > 0 ? data.classes.slice(0, 8).map((item) => <article key={item.id} className="list-card slim with-accent"><div className="feature-code-row"><span className="mono-pill">{item.code}</span><span className={`status-pill is-${item.status}`}>{labelClassStatus(item.status)}</span></div><h3>{item.name}</h3><p>{dateRange(item.start_date, item.end_date)}</p><div className="small-note">{item.expected_learners ?? 0} học viên dự kiến</div></article>) : <EmptyCard eyebrow="Chưa có lớp" title="Lớp học chưa được cấu hình" body="Khi Khoá học được tạo, lớp và buổi học sẽ sinh ra ở đây." hint="Sprint 5 sẽ đi sâu hơn vào Học viên và Buổi học." />}</div></section></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Phân công</div><h2 className="panel-title">Giảng viên và ekip</h2></div></div><div className="list-grid compact two-up">{data.assignments.length > 0 ? data.assignments.map((assignment) => <article key={assignment.id} className="list-card slim"><div className="small-label">{labelAssignmentRole(assignment.role)}</div><h3>{relationName(assignment.instructors) || relationName(assignment.profiles) || "Chưa gán"}</h3><p>{assignment.is_primary ? "Vai trò chính" : "Vai trò hỗ trợ"}</p></article>) : <EmptyCard eyebrow="Chưa có phân công" title="Ekip khoá học đang trống" body="Màn này sẽ là điểm nối giữa Sprint 3 và Sprint 4." hint="Seed mới đã chuẩn bị dữ liệu cho phần này." />}</div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Buổi học</div><h2 className="panel-title">Session gần nhất</h2></div></div><div className="timeline">{data.sessions.length > 0 ? data.sessions.map((item) => <div key={item.id} className="timeline-item"><div className="timeline-dot is-active" /><div><div className="timeline-title">{item.title}</div><div className="timeline-body">Buổi {item.session_number} · {labelSessionStatus(item.status)} · {dateTime(item.scheduled_at)}</div></div></div>) : <EmptyCard eyebrow="Chưa có session" title="Danh sách buổi học hiện đang rỗng" body="Khi chạy seed V1 hoặc tạo khóa học thật, các session sẽ xuất hiện ở đây." hint="Đây là vùng dữ liệu để Sprint 5 và Sprint 6 mở rộng tiếp." />}</div></section></section></div>;
}

function CrmPage({ data, onRefresh, refreshing }: CrmProps) {
  return <div className="page-stack"><section className="page-header"><div><div className="page-eyebrow">Sprint 2 · CRM</div><h1 className="page-title">Hợp đồng & Khách hàng</h1><p className="page-subtitle">Màn Sprint 2 đầu tiên đã đọc dữ liệu thật từ `customers` và `contracts`, làm nền cho luồng tạo khoá học sau đó.</p></div><div className="action-row"><button className="button ghost" disabled={refreshing} onClick={onRefresh} type="button">{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}</button><button className="button primary" type="button">Sprint 2: CRUD CRM</button></div></section><section className="two-column programs-grid"><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Khách hàng</div><h2 className="panel-title">Danh mục khách hàng đào tạo</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Khách hàng</th><th>Ngành</th><th>Liên hệ chính</th><th>Trạng thái</th></tr></thead><tbody>{data.customers.length > 0 ? data.customers.map((customer) => <tr key={customer.id}><td><div className="cell-title">{customer.name}</div><div className="cell-subtitle">{customer.code}</div></td><td>{customer.industry ?? "Chưa cập nhật"}</td><td>{primaryContact(customer.customer_contacts)}</td><td><span className="status-pill is-active">{customer.status === "active" ? "Đang hoạt động" : customer.status}</span></td></tr>) : <tr><td colSpan={4}><div className="empty-state inline"><EmptyCard eyebrow="Chưa có khách hàng" title="CRM khách hàng đang trống" body="Sau khi chạy seed mới, danh sách khách hàng sẽ xuất hiện ở đây." hint="Đây là điểm vào bắt buộc của toàn bộ trục course-centric." /></div></td></tr>}</tbody></table></div></section><section className="panel"><div className="panel-header"><div><div className="panel-eyebrow">Hợp đồng</div><h2 className="panel-title">Hợp đồng đào tạo đang quản lý</h2></div></div><div className="list-grid compact">{data.contracts.length > 0 ? data.contracts.map((contract) => <article key={contract.id} className="list-card slim with-accent"><div className="feature-code-row"><span className="mono-pill">{contract.code}</span><span className={`status-pill is-${contract.status}`}>{labelContractStatus(contract.status)}</span></div><h3>{contract.name}</h3><p>{customerName(contract.customers)}</p><div className="small-note">Giá trị: {money(contract.total_value)}</div><div className="small-note">Thời gian: {dateRange(contract.starts_on, contract.ends_on)}</div></article>) : <EmptyCard eyebrow="Chưa có hợp đồng" title="Danh sách hợp đồng đang trống" body="Màn CRM sẽ dùng hợp đồng để khóa liên kết trực tiếp sang Khoá học ở Sprint 3." hint="SRS v4 yêu cầu mọi khóa học bắt đầu từ CRM." />}</div></section></section></div>;
}

function Roadmap({ page }: { page: PageId }) {
  const label = nav.find((item) => item.id === page)?.label ?? "Phân hệ";
  const sprint = roadmapSprint[page];
  return <section className="panel"><div className="page-eyebrow">{sprint}</div><h1 className="page-title">{label} sẽ được triển khai theo roadmap mới</h1><p className="page-subtitle">Schema course-centric đã sẵn sàng. Màn này là placeholder có chủ đích để chúng ta hoàn thiện từng sprint theo SRS v4 mà không quay lại domain coaching cũ.</p><div className="roadmap-grid"><article className="list-card slim"><h3>Sprint 1</h3><p>Dashboard + access layer đọc từ schema mới.</p></article><article className="list-card slim"><h3>Sprint 2</h3><p>CRM: khách hàng và hợp đồng.</p></article><article className="list-card slim"><h3>Sprint 3</h3><p>Hệ thống Khoá học: tạo khoá, danh sách, filter.</p></article><article className="list-card slim"><h3>Sprint 4</h3><p>Giảng viên và phân công lead/backup.</p></article><article className="list-card slim"><h3>Sprint 5-7</h3><p>Lớp học, vận hành, giáo án, học liệu.</p></article><article className="list-card slim"><h3>V2</h3><p>LMS, khung năng lực, báo cáo, gamification.</p></article></div></section>;
}
function createBoardColumns(data: DataState): BoardColumn[] {
  const requestedCards = data.contentRequests.filter((item) => item.status === "requested" || item.status === "briefing").slice(0, 3).map((request, index) => ({ id: `requested-${request.id}`, title: request.title, owner: courseNameById(data.courses, request.course_id), due: `Hạn ${shortDate(request.due_date, index + 10)}`, progress: 25, laneTag: request.priority === "urgent" ? "Gấp" : request.priority === "high" ? "Thường" : "Thấp", urgency: pickUrgency(index) }));
  const producingCards = data.contentRequests.filter((item) => item.status === "producing").slice(0, 3).map((request, index) => ({ id: `producing-${request.id}`, title: request.title, owner: courseNameById(data.courses, request.course_id), due: `Hạn ${shortDate(request.due_date, index + 12)}`, progress: 70 - index * 10, laneTag: `${70 - index * 10}%`, urgency: pickUrgency(index) }));
  const reviewCards = data.contentRequests.filter((item) => item.status === "review").slice(0, 3).map((request, index) => ({ id: `review-${request.id}`, title: request.title, owner: courseNameById(data.courses, request.course_id), due: `Review ${shortDate(request.due_date, index + 14)}`, progress: 80, laneTag: index % 2 === 0 ? "Review ND" : "Review KT", urgency: "review" as const }));
  const uploadCards = data.contentRequests.filter((item) => item.status === "uploading").slice(0, 3).map((request, index) => ({ id: `upload-${request.id}`, title: request.title, owner: courseNameById(data.courses, request.course_id), due: `Chờ ${shortDate(request.due_date, index + 15)}`, progress: 90, laneTag: index === 0 ? "Chờ IT · LMS" : "Chờ QA cuối", urgency: "upload" as const }));
  const doneCards = data.sessions.filter((item) => item.status === "completed").slice(0, 3).map((session) => ({ id: `done-${session.id}`, title: session.title, owner: courseNameById(data.courses, session.course_id), due: `Live ${shortDate(session.scheduled_at, 18)}`, progress: 100, laneTag: "Phát hành", urgency: "live" as const }));
  return [
    { id: "requested", title: "Yêu cầu", count: requestedCards.length, accent: "crimson", cards: requestedCards },
    { id: "producing", title: "Đang SX", count: producingCards.length, accent: "gold", cards: producingCards },
    { id: "review", title: "Chờ Review", count: reviewCards.length, accent: "navy", cards: reviewCards },
    { id: "upload", title: "Chờ Upload", count: uploadCards.length, accent: "blue", cards: uploadCards },
    { id: "done", title: "Hoàn thành", count: doneCards.length, accent: "green", cards: doneCards },
  ];
}

function createBoardAlerts(data: DataState): BoardAlert[] {
  const urgentRequest = data.contentRequests.find((item) => item.priority === "urgent") ?? data.contentRequests[0];
  const reviewRequest = data.contentRequests.find((item) => item.status === "review") ?? data.contentRequests[1] ?? data.contentRequests[0];
  return [
    { id: "urgent", tone: "danger", title: urgentRequest ? `${courseNameById(data.courses, urgentRequest.course_id)} — ${urgentRequest.request_code} · Còn 5 ngày` : "Chưa có yêu cầu ưu tiên", detail: urgentRequest ? `Hạng mục ${urgentRequest.title} đang cần thúc đẩy để kịp timeline khoá học.` : "Hãy chạy seed demo mới để dashboard hiển thị đúng nhịp điều hành.", action: "Thúc đẩy" },
    { id: "review", tone: "warning", title: reviewRequest ? `${courseNameById(data.courses, reviewRequest.course_id)} — cần chốt nội dung review` : "Chưa có hạng mục review", detail: reviewRequest ? `Hiện có ${data.contentRequests.filter((item) => item.status !== "completed").length} yêu cầu học liệu mở và ${data.sessions.length} buổi học cần theo dõi.` : "Khi CRM, khoá học và content requests có dữ liệu thật, lane này sẽ đầy lên.", action: "Review" },
  ];
}

function mapMembership(row: MembershipRow): Membership { return { id: row.id, role: row.role, status: row.status, is_primary: row.is_primary, tenant: { id: row.tenant_id, code: row.tenant_code, name: row.tenant_name, slug: row.tenant_slug, status: row.tenant_status }, unit: row.unit_id ? { id: row.unit_id, code: row.unit_code ?? "", name: row.unit_name ?? "" } : null }; }
function relationName(value: { full_name: string } | { full_name: string }[] | null | undefined) { if (!value) return ""; return Array.isArray(value) ? value[0]?.full_name ?? "" : value.full_name; }
function customerName(value: { name: string; short_name?: string | null } | { name: string; short_name?: string | null }[] | { name: string } | { name: string }[] | null | undefined): string { if (!value) return "Chưa gắn khách hàng"; const item = Array.isArray(value) ? value[0] : value; const maybeShort = (item as { short_name?: string | null }).short_name; return maybeShort ?? item.name ?? "Chưa gắn khách hàng"; }
function courseTypeName(value: { name: string } | { name: string }[] | null | undefined): string { if (!value) return "Chưa gắn loại hình"; const item = Array.isArray(value) ? value[0] : value; return item?.name ?? "Chưa gắn loại hình"; }
function courseNameById(courses: Course[], courseId: string) { return courses.find((item) => item.id === courseId)?.name ?? "Khoá học"; }
function primaryContact(value: Customer["customer_contacts"]): string { const item = value?.[0]; if (!item) return "Chưa có liên hệ"; return item.title ? `${item.full_name} · ${item.title}` : item.full_name; }
function initials(value: string) { return value.split(" ").filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase() ?? "").join("") || "VL"; }
function labelRole(value: string) { return ({ system_admin: "SYSTEM", business_admin: "ADMIN", coach: "COACH", coachee_internal: "COACHEE", coachee_guest: "KHÁCH", reviewer: "REVIEWER", executive_viewer: "LÃNH ĐẠO" } as Record<string, string>)[value] ?? value.toUpperCase(); }
function labelAssignmentRole(value: string) { return ({ lead_instructor: "Giảng viên chính", backup_instructor: "Giảng viên backup", program_director: "GĐ đào tạo", operations_admin: "Admin vận hành", content_designer: "Content Designer", it_support: "IT Support" } as Record<string, string>)[value] ?? value; }
function labelCourseStatus(value: string) { return ({ draft: "Nháp", preparing: "Đang chuẩn bị", active: "Đang triển khai", paused: "Tạm dừng", completed: "Hoàn thành", cancelled: "Đã huỷ", archived: "Lưu trữ" } as Record<string, string>)[value] ?? value; }
function labelClassStatus(value: string) { return ({ planned: "Đã lên kế hoạch", ready: "Sẵn sàng", in_progress: "Đang triển khai", completed: "Hoàn thành", cancelled: "Đã huỷ" } as Record<string, string>)[value] ?? value; }
function labelContractStatus(value: string) { return ({ draft: "Nháp", pending_signature: "Chờ ký", active: "Đang hiệu lực", completed: "Hoàn thành", cancelled: "Đã huỷ", expired: "Hết hạn" } as Record<string, string>)[value] ?? value; }
function labelSessionStatus(value: string) { return ({ planned: "Đã lên kế hoạch", ready: "Sẵn sàng", in_progress: "Đang diễn ra", completed: "Đã hoàn thành", postponed: "Hoãn", cancelled: "Hủy" } as Record<string, string>)[value] ?? value; }
function labelTopicType(value: string) { return ({ coaching_1_1: "Coaching 1:1", group_workshop: "Workshop nhóm", elearning_only: "E-learning", blended_learning: "Blended", classroom: "Classroom", custom: "Tùy chỉnh" } as Record<string, string>)[value] ?? value; }
function dateRange(a: string | null, b: string | null) { if (!a && !b) return "Chưa cập nhật thời gian"; const formatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); if (a && b) return `${formatter.format(new Date(a))} - ${formatter.format(new Date(b))}`; return formatter.format(new Date(a ?? b ?? new Date().toISOString())); }
function dateTime(value: string | null) { if (!value) return "Chưa lên lịch"; return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function shortDate(value: string | null, fallbackDayOffset: number) { const date = value ? new Date(value) : new Date(Date.now() + fallbackDayOffset * 24 * 60 * 60 * 1000); return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date); }
function money(value: number | null) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value ?? 0); }
function pickUrgency(index: number): BoardTask["urgency"] { return index === 0 ? "gap" : index === 1 ? "thuong" : "thap"; }
function normalizeError(message: string | undefined, fallback: string) { if (!message) return fallback; const lower = message.toLowerCase(); if (lower.includes("invalid login credentials")) return "Email hoặc mật khẩu chưa đúng."; if (lower.includes("email not confirmed")) return "Tài khoản chưa xác nhận email. Hãy kiểm tra hộp thư hoặc tắt email confirmation trong Supabase để thử nhanh."; if (lower.includes("permission denied") || lower.includes("row-level security")) return "Supabase đang chặn quyền truy cập dữ liệu. Hãy kiểm tra grants và RLS policies."; if (lower.includes("relation") && lower.includes("does not exist")) return "Schema course-centric mới chưa được migrate trên Supabase. Hãy chạy migration Sprint 0 trước."; return message; }

export default App;




