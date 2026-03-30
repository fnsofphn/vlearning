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
  { id: "dash", icon: "?", label: "T?ng quan" },
  { id: "catalog", icon: "???", label: "Danh m?c & m?u" },
  { id: "programs", icon: "??", label: "Chuong trình & cohort" },
  { id: "coachees", icon: "??", label: "Coachee", badge: "Khách" },
  { id: "sessions", icon: "???", label: "Phiên coaching" },
  { id: "outputs", icon: "??", label: "Ð?u ra", badge: "Chính" },
  { id: "artifacts", icon: "??", label: "Tài li?u & công c?" },
  { id: "actions", icon: "?", label: "K? ho?ch hành d?ng" },
  { id: "reports", icon: "??", label: "Báo cáo" },
  { id: "admin", icon: "??", label: "Qu?n tr? & phân quy?n" },
];

const baseMetrics = (focus: string): Metric[] => [
  { label: "M?c s?n sàng", value: "80%", detail: `Khung ${focus} dã s?n d? tri?n khai ti?p`, tone: "navy" },
  { label: "Uu tiên", value: "P0", detail: "T?p trung vào flow có giá tr? nghi?p v? rõ nh?t", tone: "crimson" },
  { label: "Phù h?p Supabase", value: "Cao", detail: "Phù h?p v?i Postgres, Auth, Storage và audit log", tone: "gold" },
  { label: "Phù h?p Vercel", value: "Cao", detail: "Frontend web app tri?n khai nhanh theo preview flow", tone: "success" },
];

export const moduleConfigs: ModuleConfig[] = [
  {
    id: "catalog",
    eyebrow: "Kh?i c?u hình",
    title: "Danh m?c & m?u",
    subtitle: "Qu?n lý service module, method, audience, process, questionnaire, topic, output và artifact catalog.",
    headline: "Ðây là lõi c?u hình c?a toàn b? s?n ph?m, quy?t d?nh kh? nang tái s? d?ng cho nhi?u doanh nghi?p.",
    actions: ["T?o service module", "T?o process template", "T?o output catalog"],
    tabs: ["Service Modules", "Methods", "Process", "Questionnaires", "Topics", "Outputs", "Artifacts"],
    metrics: baseMetrics("danh m?c"),
    bullets: [
      "Qu?n lý 3 module coaching chu?n và m? thêm module m?i",
      "Version hóa process template theo d?i tu?ng và phuong pháp",
      "Tái s? d?ng questionnaire, topic, output và artifact gi?a các chuong trình",
      "Tách catalog c?u hình kh?i d? li?u v?n hành d? tránh hard-code",
    ],
  },
  {
    id: "programs",
    eyebrow: "Thi?t l?p tri?n khai",
    title: "Chuong trình & cohort",
    subtitle: "Qu?n lý chuong trình coaching, cohort, assignment và hành trình coaching du?c sinh t? template.",
    headline: "Module này n?i c?u hình v?i th?c thi: ch?n template, m? chuong trình, chia cohort và phân công ngu?i ph? trách.",
    actions: ["T?o chuong trình", "T?o cohort", "Phân công coach"],
    tabs: ["Programs", "Cohorts", "Assignments", "Journeys"],
    metrics: baseMetrics("chuong trình"),
    bullets: [
      "Program g?n tenant, service module, template version và m?c tiêu t?ng th?",
      "Cohort chia theo c?p lãnh d?o, don v?, khu v?c ho?c giai do?n",
      "Assignment h? tr? lead coach, support coach, reviewer, coordinator",
      "Journey generation sinh session, pre-work và output target t? template",
    ],
  },
  {
    id: "coachees",
    eyebrow: "Qu?n lý ngu?i tham gia",
    title: "Coachee",
    subtitle: "H? so coachee, guest access, m?c tiêu coaching và topic du?c gán.",
    headline: "Thi?t k? dã tính d?n c? user n?i b? l?n external guest, dây là quy?t d?nh quan tr?ng cho MVP.",
    actions: ["M?i guest", "T?o h? so", "Gán m?c tiêu"],
    tabs: ["Profiles", "Goals", "Topics", "Guest Access"],
    metrics: baseMetrics("coachee"),
    bullets: [
      "Coachee có th? là internal profile ho?c external guest",
      "M?i coachee có audience, m?c tiêu chu?n, m?c tiêu cá th? hóa và topic du?c gán",
      "Hành trình coaching g?n v?i template version c? th? d? không v? d? li?u khi d?i template",
      "Có s?n hu?ng di cho confidential coaching ? c?p lãnh d?o",
    ],
  },
  {
    id: "sessions",
    eyebrow: "Tri?n khai phiên",
    title: "Phiên coaching",
    subtitle: "L?p l?ch phiên, pre-work, tr? l?i questionnaire, biên b?n và tr?ng thái phiên coaching.",
    headline: "Ðây là ph?n v?n hành tr?c ti?p gi?a coach và coachee nên c?n don gi?n, rõ bu?c và bám phuong pháp.",
    actions: ["Lên l?ch phiên", "G?i pre-work", "Ghi biên b?n"],
    tabs: ["Calendar", "Pre-work", "Minutes", "Session States"],
    metrics: baseMetrics("phiên coaching"),
    bullets: [
      "Qu?n lý session status t? planned d?n completed ho?c follow-up required",
      "Questionnaire g?i tru?c phiên và có th? tr? l?i tr?c ti?p b?i coachee",
      "Coach xem pre-work summary tru?c phiên live",
      "Session notes h? tr? summary, key findings và step notes theo phuong pháp",
    ],
  },
  {
    id: "outputs",
    eyebrow: "Qu?n lý d?u ra",
    title: "Ð?u ra",
    subtitle: "Qu?n lý output nhu m?t th?c th? nghi?p v? riêng có tr?ng thái, file, reviewer và checklist d?t chu?n.",
    headline: "Ði?m khác bi?t quan tr?ng là không ch? ghi nh?n activity mà qu?n lý output th?c ch?t c?a coachee.",
    actions: ["T?o output", "T?i phiên b?n", "Duy?t output"],
    tabs: ["Catalog Link", "Runtime Outputs", "Reviews", "Criteria"],
    metrics: baseMetrics("d?u ra"),
    bullets: [
      "Output instance có lifecycle riêng: draft, in_review, approved, completed",
      "M?i output có th? g?n session, topic, cohort ho?c c? program",
      "File, version và review note là ph?n b?t bu?c trong thi?t k? d? li?u",
      "Reviewer flow du?c gi? optional d? MVP không b? ch?m",
    ],
  },
  {
    id: "artifacts",
    eyebrow: "Chia s? công c?",
    title: "Tài li?u & công c?",
    subtitle: "Artifact catalog, bundle artifact và chia s? toolkit cho coachee, cohort ho?c program.",
    headline: "? phase 1 nên gi? dúng nhu c?u th?c t?: RBAC co b?n, không làm flow ph?c t?p quá s?m.",
    actions: ["T?o artifact", "T?o bundle", "Chia s?"],
    tabs: ["Artifact Catalog", "Bundles", "Shares", "Usage"],
    metrics: baseMetrics("artifact"),
    bullets: [
      "Artifact có th? là file, link ho?c bundle nhi?u thành ph?n",
      "Share permissions g?m view, download, comment, online-only",
      "Usage tracking h? tr? viewed, downloaded, acknowledged, commented",
      "Supabase Storage là l?a ch?n h?p lý cho phase d?u",
    ],
  },
  {
    id: "actions",
    eyebrow: "Theo dõi sau phiên",
    title: "K? ho?ch hành d?ng",
    subtitle: "Sinh action plan sau phiên, bám ti?n d? và g?n tr?c ti?p v?i output ho?c topic.",
    headline: "Action plan là c?u n?i gi?a coaching session và thay d?i th?c t?, nên c?n làm s?m trong MVP.",
    actions: ["T?o action plan", "C?p nh?t ti?n d?", "G?n output"],
    tabs: ["Plan List", "Progress", "Evidence", "Overdue"],
    metrics: baseMetrics("action plan"),
    bullets: [
      "Action plan g?n session, topic và output d? theo dõi end-to-end",
      "Coachee ho?c coach d?u có th? c?p nh?t progress",
      "Evidence du?c luu nhu progress update ho?c file liên quan",
      "Report phase 1 uu tiên overdue và completion rate",
    ],
  },
  {
    id: "reports",
    eyebrow: "Phân tích v?n hành",
    title: "Báo cáo",
    subtitle: "Báo cáo chuong trình, questionnaire, topic, output, artifact, action plan và do lu?ng chuy?n d?i.",
    headline: "Phase 1 nên do hi?u qu? v?n hành tru?c; các l?p phân tích sâu có th? d? sau khi nhu c?u rõ hon.",
    actions: ["Xem dashboard", "Xu?t d? li?u", "L?c theo tenant"],
    tabs: ["Operations", "Questionnaire", "Outputs", "Artifacts", "Action Plans", "Measurement"],
    metrics: baseMetrics("báo cáo"),
    bullets: [
      "Operational reporting g?m s? program, cohort, session state và completion",
      "Output reporting g?m overdue, in review, completed theo module, coachee ho?c cohort",
      "Artifact reporting t?p trung vào share và m?c d? ti?p c?n",
      "Measurement framework dã có ch? trong schema nhung chua nên làm sâu ngay",
    ],
  },
  {
    id: "admin",
    eyebrow: "Ði?u hành h? th?ng",
    title: "Qu?n tr? & phân quy?n",
    subtitle: "Tenant, unit, memberships, guest invitation, confidential access và audit log.",
    headline: "V?i Supabase, ph?n quy?n truy c?p c?n du?c nghi cùng lúc v?i schema d? tránh t?n chi phí s?a l?i v? sau.",
    actions: ["Qu?n lý tenant", "Qu?n lý role", "Xem audit log"],
    tabs: ["Tenants", "Units", "Memberships", "Guests", "Audit"],
    metrics: baseMetrics("phân quy?n"),
    bullets: [
      "Membership là c?u n?i gi?a auth user và d? li?u theo tenant",
      "Guest invitation h? tr? external coachee mà không phá mô hình quy?n",
      "Confidential flag là gi?i pháp h?p lý cho phase 1",
      "Audit log nên có ngay t? d?u cho d? li?u coaching nh?y c?m",
    ],
  },
];
