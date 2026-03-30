export type NavItem = {
  id: string;
  icon: string;
  label: string;
  badge?: string;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: "crimson" | "navy" | "gold" | "success";
};

export type ModuleConfig = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  headline: string;
  actions: string[];
  tabs?: string[];
  metrics: Metric[];
  bullets: string[];
};

export const navigation: NavItem[] = [
  { id: "dash", icon: "⬛", label: "Coaching Overview" },
  { id: "catalog", icon: "🗂️", label: "Catalog & Template" },
  { id: "programs", icon: "🧭", label: "Programs & Cohorts" },
  { id: "coachees", icon: "👥", label: "Coachees", badge: "Guest" },
  { id: "sessions", icon: "🗓️", label: "Sessions" },
  { id: "outputs", icon: "📦", label: "Outputs", badge: "Core" },
  { id: "artifacts", icon: "🧰", label: "Artifacts & Toolkit" },
  { id: "actions", icon: "✅", label: "Action Plans" },
  { id: "reports", icon: "📊", label: "Reports" },
  { id: "admin", icon: "⚙️", label: "Admin & Access" },
];

export const dashboardMetrics: Metric[] = [
  { label: "Service Modules", value: "3", detail: "Leadership, transformation, operational integration", tone: "crimson" },
  { label: "Catalog Domains", value: "7", detail: "Method, process, questionnaire, topic, output, artifact, audience", tone: "navy" },
  { label: "Core Reports", value: "7", detail: "Operational and delivery-focused reporting in MVP", tone: "gold" },
  { label: "Target Stack", value: "Supa+Vercel", detail: "Supabase backend with Vercel deployment", tone: "success" },
];

export const dashboardCards = [
  {
    title: "Supabase-first domain model",
    text: "Schema được tách rõ giữa catalog cấu hình và dữ liệu runtime để phù hợp với multi-tenant, guest coachee và lifecycle output.",
    tags: ["Postgres", "RLS-ready", "Multi-tenant"]
  },
  {
    title: "Build theo MVP thật sự",
    text: "Giai đoạn đầu tập trung vào program delivery, session execution, output, artifact và action plan; chưa lao vào AI hay maturity scoring.",
    tags: ["MVP", "Operational focus", "Lower risk"]
  },
  {
    title: "Có thể code tiếp ngay",
    text: "Repo đã có shell UI, file env mẫu, Supabase client, migration SQL và tài liệu kiến trúc/backlog để triển khai module theo phase.",
    tags: ["Ready to build", "Schema", "Backlog"]
  }
];

export const dashboardTimeline = [
  { title: "P0", body: "Foundation: tenant, role, guest access, catalog, schema MVP.", state: "done" },
  { title: "P1", body: "Delivery core: programs, coachees, sessions, outputs, artifacts, action plans.", state: "active" },
  { title: "P2", body: "Reporting, pilot hardening, reviewer flow và tinh chỉnh quyền truy cập.", state: "next" }
] as const;

const baseMetrics = (focus: string): Metric[] => [
  { label: "MVP readiness", value: "80%", detail: `Khung ${focus} đã được định nghĩa để code tiếp`, tone: "navy" },
  { label: "Build priority", value: "P0", detail: "Tập trung vào flow có giá trị nghiệp vụ rõ nhất", tone: "crimson" },
  { label: "Supabase fit", value: "High", detail: "Phù hợp với Postgres, Auth, Storage và audit log", tone: "gold" },
  { label: "Vercel fit", value: "High", detail: "Frontend web app triển khai nhanh theo preview flow", tone: "success" },
];

export const moduleConfigs: ModuleConfig[] = [
  {
    id: "catalog",
    eyebrow: "Configuration Engine",
    title: "Catalog & Template",
    subtitle: "Quản lý service module, method, audience, process, questionnaire, topic, output và artifact catalog.",
    headline: "Đây là lõi cấu hình của toàn bộ sản phẩm, quyết định khả năng tái sử dụng cho nhiều doanh nghiệp.",
    actions: ["Tạo service module", "Tạo process template", "Tạo output catalog"],
    tabs: ["Service Modules", "Methods", "Process", "Questionnaires", "Topics", "Outputs", "Artifacts"],
    metrics: baseMetrics("catalog"),
    bullets: [
      "Quản lý 3 module coaching chuẩn và mở thêm module mới",
      "Version hóa process template theo đối tượng và phương pháp",
      "Tái sử dụng questionnaire/topic/output/artifact giữa các chương trình",
      "Tách catalog cấu hình khỏi dữ liệu vận hành để tránh hard-code"
    ],
  },
  {
    id: "programs",
    eyebrow: "Delivery Setup",
    title: "Programs & Cohorts",
    subtitle: "Quản lý chương trình coaching, cohort, assignment và hành trình coaching được sinh từ template.",
    headline: "Module này nối cấu hình với thực thi: chọn template, mở chương trình, chia cohort và phân công người phụ trách.",
    actions: ["Tạo program", "Tạo cohort", "Phân công coach"],
    tabs: ["Programs", "Cohorts", "Assignments", "Journeys"],
    metrics: baseMetrics("program delivery"),
    bullets: [
      "Program gắn tenant, service module, template version và mục tiêu tổng thể",
      "Cohort chia theo cấp lãnh đạo, đơn vị, khu vực hoặc giai đoạn",
      "Assignment hỗ trợ lead coach, support coach, reviewer, coordinator",
      "Journey generation sinh session, pre-work và output target từ template"
    ],
  },
  {
    id: "coachees",
    eyebrow: "Participant Management",
    title: "Coachees",
    subtitle: "Hồ sơ coachee, guest access, mục tiêu coaching và topic được gán.",
    headline: "Thiết kế đã tính đến cả user nội bộ lẫn external guest, đây là quyết định quan trọng cho MVP của bạn.",
    actions: ["Mời guest", "Tạo hồ sơ", "Gán mục tiêu"],
    tabs: ["Profiles", "Goals", "Topics", "Guest Access"],
    metrics: baseMetrics("coachee management"),
    bullets: [
      "Coachee có thể là internal profile hoặc external guest",
      "Mỗi coachee có audience, mục tiêu chuẩn, mục tiêu cá thể hóa và topic được gán",
      "Hành trình coaching gắn với template version cụ thể để không vỡ dữ liệu khi đổi template",
      "Có sẵn hướng đi cho confidential coaching ở cấp CEO/lãnh đạo"
    ],
  },
  {
    id: "sessions",
    eyebrow: "Session Execution",
    title: "Sessions",
    subtitle: "Lập lịch phiên, pre-work, trả lời questionnaire, biên bản và trạng thái phiên coaching.",
    headline: "Đây là phần vận hành trực tiếp giữa coach và coachee nên cần đơn giản, rõ bước và bám phương pháp GROW/ADKAR.",
    actions: ["Lên lịch phiên", "Gửi pre-work", "Ghi biên bản"],
    tabs: ["Calendar", "Pre-work", "Minutes", "Session States"],
    metrics: baseMetrics("session execution"),
    bullets: [
      "Quản lý session status từ planned đến completed/follow-up required",
      "Questionnaire gửi trước phiên và có thể trả lời trực tiếp bởi coachee",
      "Coach xem pre-work summary trước phiên live",
      "Session notes hỗ trợ summary, key findings và step notes theo phương pháp"
    ],
  },
  {
    id: "outputs",
    eyebrow: "Outcome Management",
    title: "Outputs",
    subtitle: "Quản lý output như một thực thể nghiệp vụ riêng có trạng thái, file, reviewer và checklist đạt chuẩn.",
    headline: "Đây là khác biệt quan trọng của sản phẩm: không chỉ ghi nhận coaching activity mà quản lý output thực chất của coachee.",
    actions: ["Tạo output", "Upload version", "Review output"],
    tabs: ["Catalog Link", "Runtime Outputs", "Reviews", "Criteria"],
    metrics: baseMetrics("output lifecycle"),
    bullets: [
      "Output instance có lifecycle riêng: draft, in_review, approved, completed...",
      "Mỗi output có thể gắn session, topic, cohort hoặc cả program",
      "File/version và review note là phần bắt buộc trong thiết kế dữ liệu",
      "Reviewer flow được giữ optional để MVP không bị chậm"
    ],
  },
  {
    id: "artifacts",
    eyebrow: "Toolkit Sharing",
    title: "Artifacts & Toolkit",
    subtitle: "Artifact catalog, bundle artifact và chia sẻ toolkit cho coachee/cohort/program.",
    headline: "Ở phase 1 mình giữ đúng nhu cầu của bạn: RBAC cơ bản, không làm watermark hay expiry link phức tạp.",
    actions: ["Tạo artifact", "Tạo bundle", "Chia sẻ"],
    tabs: ["Artifact Catalog", "Bundles", "Shares", "Usage"],
    metrics: baseMetrics("artifact delivery"),
    bullets: [
      "Artifact có thể là file, link hoặc bundle nhiều thành phần",
      "Share permissions gồm view, download, comment, online-only",
      "Usage tracking hỗ trợ viewed, downloaded, acknowledged, commented",
      "Supabase Storage là lựa chọn hợp lý cho phase đầu"
    ],
  },
  {
    id: "actions",
    eyebrow: "Follow-up Execution",
    title: "Action Plans",
    subtitle: "Sinh action plan sau phiên, bám tiến độ và gắn trực tiếp với output/topic.",
    headline: "Action plan là cầu nối giữa coaching session và kết quả thay đổi thực tế, nên cần làm sớm trong MVP.",
    actions: ["Tạo action plan", "Cập nhật tiến độ", "Gắn output"],
    tabs: ["Plan List", "Progress", "Evidence", "Overdue"],
    metrics: baseMetrics("action tracking"),
    bullets: [
      "Action plan gắn session, topic và output để theo dõi end-to-end",
      "Coachee hoặc coach đều có thể cập nhật progress",
      "Evidence được lưu như progress update hoặc file liên quan",
      "Report phase 1 ưu tiên overdue và completion rate"
    ],
  },
  {
    id: "reports",
    eyebrow: "Operational Analytics",
    title: "Reports",
    subtitle: "Báo cáo chương trình, questionnaire, topic, output, artifact, action plan và đo lường chuyển đổi.",
    headline: "Báo cáo phase 1 nên đo hiệu quả vận hành trước; maturity hoặc business impact để phase sau khi business định nghĩa rõ hơn.",
    actions: ["Xem dashboard", "Xuất dữ liệu", "Lọc theo tenant"],
    tabs: ["Operations", "Questionnaire", "Outputs", "Artifacts", "Action Plans", "Measurement"],
    metrics: baseMetrics("reporting"),
    bullets: [
      "Operational reporting gồm số program, cohort, session state, completion",
      "Output reporting gồm overdue, in review, completed theo module/coachee/cohort",
      "Artifact reporting tập trung vào share và mức độ tiếp cận",
      "Measurement framework đã có chỗ trong schema nhưng chưa nên làm analytics sâu ngay"
    ],
  },
  {
    id: "admin",
    eyebrow: "Platform Control",
    title: "Admin & Access",
    subtitle: "Tenant, unit, memberships, guest invitation, confidential access và audit log.",
    headline: "Với Supabase, phần quyền truy cập phải được nghĩ cùng lúc với schema; nếu làm muộn sẽ rất tốn chi phí sửa lại.",
    actions: ["Quản lý tenant", "Quản lý role", "Xem audit log"],
    tabs: ["Tenants", "Units", "Memberships", "Guests", "Audit"],
    metrics: baseMetrics("platform governance"),
    bullets: [
      "Membership là cầu nối giữa auth user và tenant-scoped data",
      "Guest invitation hỗ trợ external coachee mà không phá mô hình quyền",
      "Confidential flag là giải pháp hợp lý cho phase 1 trước khi có yêu cầu bảo mật sâu hơn",
      "Audit log cần có ngay từ đầu cho dữ liệu coaching nhạy cảm"
    ],
  },
];
