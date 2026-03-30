export type Locale = "vi" | "en";

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

export function getNavigation(locale: Locale): NavItem[] {
  return locale === "en"
    ? [
        { id: "dash", icon: "OV", label: "Overview" },
        { id: "catalog", icon: "CT", label: "Catalog & Templates" },
        { id: "programs", icon: "PR", label: "Programs & Cohorts" },
        { id: "coachees", icon: "CO", label: "Coachees", badge: "Guest" },
        { id: "sessions", icon: "SE", label: "Sessions" },
        { id: "outputs", icon: "OU", label: "Outputs", badge: "Core" },
        { id: "artifacts", icon: "AR", label: "Artifacts & Toolkit" },
        { id: "actions", icon: "AP", label: "Action Plans" },
        { id: "reports", icon: "RP", label: "Reports" },
        { id: "admin", icon: "AD", label: "Admin & Access" },
      ]
    : [
        { id: "dash", icon: "TQ", label: "Tổng quan" },
        { id: "catalog", icon: "DM", label: "Danh mục & mẫu" },
        { id: "programs", icon: "CT", label: "Chương trình & cohort" },
        { id: "coachees", icon: "CH", label: "Coachee", badge: "Khách" },
        { id: "sessions", icon: "PC", label: "Phiên coaching" },
        { id: "outputs", icon: "DR", label: "Đầu ra", badge: "Chính" },
        { id: "artifacts", icon: "TL", label: "Tài liệu & công cụ" },
        { id: "actions", icon: "KH", label: "Kế hoạch hành động" },
        { id: "reports", icon: "BC", label: "Báo cáo" },
        { id: "admin", icon: "QT", label: "Quản trị & phân quyền" },
      ];
}

function baseMetrics(locale: Locale, focus: string): Metric[] {
  return locale === "en"
    ? [
        { label: "Readiness", value: "80%", detail: `${focus} foundation is ready for the next implementation step`, tone: "navy" },
        { label: "Priority", value: "P0", detail: "Focus on the most valuable business workflow first", tone: "crimson" },
        { label: "Supabase fit", value: "High", detail: "Strong fit for Postgres, Auth, Storage, and audit logs", tone: "gold" },
        { label: "Vercel fit", value: "High", detail: "Frontend deployment remains fast and predictable", tone: "success" },
      ]
    : [
        { label: "Mức sẵn sàng", value: "80%", detail: `Nền tảng ${focus} đã sẵn sàng cho bước triển khai tiếp theo`, tone: "navy" },
        { label: "Ưu tiên", value: "P0", detail: "Tập trung vào luồng nghiệp vụ có giá trị cao nhất trước", tone: "crimson" },
        { label: "Phù hợp Supabase", value: "Cao", detail: "Phù hợp với Postgres, Auth, Storage và audit log", tone: "gold" },
        { label: "Phù hợp Vercel", value: "Cao", detail: "Frontend vẫn triển khai nhanh và ổn định", tone: "success" },
      ];
}

export function getModuleConfigs(locale: Locale): ModuleConfig[] {
  if (locale === "en") {
    return [
      {
        id: "catalog",
        eyebrow: "Configuration",
        title: "Catalog & Templates",
        subtitle: "Manage service modules, methods, audiences, templates, questionnaires, topics, outputs, and artifact catalogs.",
        headline: "This is the reusable configuration core of the product.",
        actions: ["Create module", "Create template", "Create output catalog"],
        tabs: ["Service Modules", "Methods", "Process", "Questionnaires", "Topics", "Outputs", "Artifacts"],
        metrics: baseMetrics(locale, "catalog"),
        bullets: [
          "Manage core coaching modules and add new ones over time",
          "Version process templates by audience and method",
          "Reuse questionnaires, topics, outputs, and artifacts across programs",
          "Separate reusable configuration from runtime data",
        ],
      },
      {
        id: "programs",
        eyebrow: "Delivery Setup",
        title: "Programs & Cohorts",
        subtitle: "Manage programs, cohorts, assignments, and journeys generated from templates.",
        headline: "This layer connects configuration with real delivery execution.",
        actions: ["Create program", "Create cohort", "Assign coach"],
        tabs: ["Programs", "Cohorts", "Assignments", "Journeys"],
        metrics: baseMetrics(locale, "program"),
        bullets: [
          "Programs connect tenant, service module, template, and delivery goals",
          "Cohorts can be grouped by level, unit, region, or phase",
          "Assignments support lead coach, support coach, reviewer, and coordinator",
          "Journeys can generate sessions, pre-work, and output targets from templates",
        ],
      },
      {
        id: "coachees",
        eyebrow: "Participant Management",
        title: "Coachees",
        subtitle: "Manage coachee profiles, guest access, goals, and assigned topics.",
        headline: "The model supports both internal users and external guests.",
        actions: ["Invite guest", "Create profile", "Assign goal"],
        tabs: ["Profiles", "Goals", "Topics", "Guest Access"],
        metrics: baseMetrics(locale, "coachee"),
        bullets: [
          "A coachee can be an internal profile or an external guest",
          "Each coachee can have audience, goals, and assigned topics",
          "Journeys remain tied to a template version to avoid data drift",
          "The structure is ready for confidential coaching scenarios",
        ],
      },
      {
        id: "sessions",
        eyebrow: "Session Delivery",
        title: "Sessions",
        subtitle: "Schedule sessions, manage pre-work, questionnaires, notes, and session status.",
        headline: "This is the operational layer between coach and coachee.",
        actions: ["Schedule session", "Send pre-work", "Write notes"],
        tabs: ["Calendar", "Pre-work", "Minutes", "Session States"],
        metrics: baseMetrics(locale, "session"),
        bullets: [
          "Track session status from planned to completed",
          "Questionnaires can be sent and answered before the live session",
          "Coaches can review pre-work before the meeting",
          "Session notes support summary, key findings, and method steps",
        ],
      },
      {
        id: "outputs",
        eyebrow: "Outcome Management",
        title: "Outputs",
        subtitle: "Manage outputs as real deliverables with status, files, review, and completion criteria.",
        headline: "Outputs are treated as business objects, not just activity logs.",
        actions: ["Create output", "Upload version", "Review output"],
        tabs: ["Catalog Link", "Runtime Outputs", "Reviews", "Criteria"],
        metrics: baseMetrics(locale, "output"),
        bullets: [
          "Each output has its own lifecycle and ownership",
          "Outputs can link to session, topic, cohort, or program",
          "Files, versions, and review notes are part of the design",
          "Reviewer flow remains optional for MVP speed",
        ],
      },
      {
        id: "artifacts",
        eyebrow: "Toolkit Sharing",
        title: "Artifacts & Toolkit",
        subtitle: "Manage artifact catalogs, bundles, and content sharing for coachees, cohorts, or programs.",
        headline: "Keep the phase-1 sharing model practical and lightweight.",
        actions: ["Create artifact", "Create bundle", "Share"],
        tabs: ["Artifact Catalog", "Bundles", "Shares", "Usage"],
        metrics: baseMetrics(locale, "artifact"),
        bullets: [
          "Artifacts can be files, links, or multi-part bundles",
          "Share permissions can include view, download, comment, and online-only",
          "Usage tracking supports viewed, downloaded, acknowledged, and commented",
          "Supabase Storage is a strong fit for phase 1",
        ],
      },
      {
        id: "actions",
        eyebrow: "Follow-up Execution",
        title: "Action Plans",
        subtitle: "Track action plans after sessions and connect them to outputs or topics.",
        headline: "Action plans connect coaching sessions to real-world change.",
        actions: ["Create action plan", "Update progress", "Link output"],
        tabs: ["Plan List", "Progress", "Evidence", "Overdue"],
        metrics: baseMetrics(locale, "action plan"),
        bullets: [
          "Action plans connect sessions, topics, and outputs end to end",
          "Both coach and coachee can update progress",
          "Evidence can be tracked as notes or files",
          "Phase-1 reporting should prioritize overdue and completion rate",
        ],
      },
      {
        id: "reports",
        eyebrow: "Operational Analytics",
        title: "Reports",
        subtitle: "Review program, questionnaire, topic, output, artifact, and action-plan reporting.",
        headline: "Phase 1 should prioritize operational insight over advanced analytics.",
        actions: ["View dashboard", "Export data", "Filter by tenant"],
        tabs: ["Operations", "Questionnaire", "Outputs", "Artifacts", "Action Plans", "Measurement"],
        metrics: baseMetrics(locale, "reporting"),
        bullets: [
          "Operational reporting should cover programs, cohorts, session states, and completion",
          "Output reporting should highlight overdue and review status",
          "Artifact reporting should focus on sharing and reach",
          "Measurement can stay lightweight in the first phase",
        ],
      },
      {
        id: "admin",
        eyebrow: "Platform Control",
        title: "Admin & Access",
        subtitle: "Manage tenants, units, memberships, guest invitations, and audit logs.",
        headline: "Access design should evolve together with the schema.",
        actions: ["Manage tenant", "Manage roles", "View audit log"],
        tabs: ["Tenants", "Units", "Memberships", "Guests", "Audit"],
        metrics: baseMetrics(locale, "access"),
        bullets: [
          "Memberships connect auth users with tenant-scoped data",
          "Guest invitations support external coachees without breaking the model",
          "Confidential flags are a practical phase-1 solution",
          "Audit logs are important for sensitive coaching workflows",
        ],
      },
    ];
  }

  return [
    {
      id: "catalog",
      eyebrow: "Khối cấu hình",
      title: "Danh mục & mẫu",
      subtitle: "Quản lý service module, phương pháp, nhóm đối tượng, template, questionnaire, chủ đề, đầu ra và kho tài liệu.",
      headline: "Đây là lõi cấu hình có thể tái sử dụng cho nhiều doanh nghiệp.",
      actions: ["Tạo module", "Tạo template", "Tạo danh mục đầu ra"],
      tabs: ["Service Modules", "Methods", "Process", "Questionnaires", "Topics", "Outputs", "Artifacts"],
      metrics: baseMetrics(locale, "danh mục"),
      bullets: [
        "Quản lý các module coaching cốt lõi và mở rộng thêm theo nhu cầu",
        "Version hóa process template theo đối tượng và phương pháp",
        "Tái sử dụng questionnaire, chủ đề, đầu ra và tài liệu giữa nhiều chương trình",
        "Tách cấu hình dùng chung khỏi dữ liệu vận hành thực tế",
      ],
    },
    {
      id: "programs",
      eyebrow: "Thiết lập triển khai",
      title: "Chương trình & cohort",
      subtitle: "Quản lý chương trình coaching, cohort, phân công và hành trình được sinh từ template.",
      headline: "Lớp này nối phần cấu hình với hoạt động triển khai thực tế.",
      actions: ["Tạo chương trình", "Tạo cohort", "Phân công coach"],
      tabs: ["Programs", "Cohorts", "Assignments", "Journeys"],
      metrics: baseMetrics(locale, "chương trình"),
      bullets: [
        "Program gắn tenant, module dịch vụ, template và mục tiêu triển khai",
        "Cohort có thể chia theo cấp, đơn vị, khu vực hoặc giai đoạn",
        "Assignment hỗ trợ coach chính, coach hỗ trợ, người duyệt và điều phối",
        "Journey có thể sinh session, pre-work và mục tiêu đầu ra từ template",
      ],
    },
    {
      id: "coachees",
      eyebrow: "Quản lý người tham gia",
      title: "Coachee",
      subtitle: "Quản lý hồ sơ coachee, khách mời bên ngoài, mục tiêu coaching và chủ đề được gán.",
      headline: "Mô hình hỗ trợ cả người dùng nội bộ lẫn khách bên ngoài.",
      actions: ["Mời khách", "Tạo hồ sơ", "Gán mục tiêu"],
      tabs: ["Profiles", "Goals", "Topics", "Guest Access"],
      metrics: baseMetrics(locale, "coachee"),
      bullets: [
        "Coachee có thể là hồ sơ nội bộ hoặc khách bên ngoài",
        "Mỗi coachee có thể có audience, mục tiêu và chủ đề riêng",
        "Hành trình coaching luôn gắn với một version template cụ thể",
        "Cấu trúc đã sẵn sàng cho các trường hợp coaching bảo mật",
      ],
    },
    {
      id: "sessions",
      eyebrow: "Triển khai phiên",
      title: "Phiên coaching",
      subtitle: "Lập lịch phiên, quản lý pre-work, questionnaire, biên bản và trạng thái phiên.",
      headline: "Đây là lớp vận hành trực tiếp giữa coach và coachee.",
      actions: ["Lên lịch phiên", "Gửi pre-work", "Ghi biên bản"],
      tabs: ["Calendar", "Pre-work", "Minutes", "Session States"],
      metrics: baseMetrics(locale, "phiên coaching"),
      bullets: [
        "Theo dõi session từ planned đến completed",
        "Questionnaire có thể gửi và trả lời trước phiên live",
        "Coach có thể xem pre-work trước buổi làm việc",
        "Biên bản hỗ trợ tóm tắt, phát hiện chính và từng bước phương pháp",
      ],
    },
    {
      id: "outputs",
      eyebrow: "Quản lý đầu ra",
      title: "Đầu ra",
      subtitle: "Quản lý đầu ra như deliverable thật với trạng thái, file, review và tiêu chí hoàn thành.",
      headline: "Đầu ra được xem như đối tượng nghiệp vụ, không chỉ là nhật ký hoạt động.",
      actions: ["Tạo đầu ra", "Tải phiên bản", "Duyệt đầu ra"],
      tabs: ["Catalog Link", "Runtime Outputs", "Reviews", "Criteria"],
      metrics: baseMetrics(locale, "đầu ra"),
      bullets: [
        "Mỗi đầu ra có vòng đời và người phụ trách riêng",
        "Đầu ra có thể gắn với session, chủ đề, cohort hoặc chương trình",
        "File, version và review note là một phần của thiết kế dữ liệu",
        "Luồng reviewer vẫn để ở mức tối giản cho MVP",
      ],
    },
    {
      id: "artifacts",
      eyebrow: "Chia sẻ công cụ",
      title: "Tài liệu & công cụ",
      subtitle: "Quản lý kho tài liệu, bundle và quyền chia sẻ cho coachee, cohort hoặc chương trình.",
      headline: "Phase 1 nên giữ mô hình chia sẻ đơn giản và thực dụng.",
      actions: ["Tạo tài liệu", "Tạo bundle", "Chia sẻ"],
      tabs: ["Artifact Catalog", "Bundles", "Shares", "Usage"],
      metrics: baseMetrics(locale, "tài liệu"),
      bullets: [
        "Tài liệu có thể là file, link hoặc bundle nhiều thành phần",
        "Quyền chia sẻ có thể gồm xem, tải, bình luận và chỉ xem online",
        "Theo dõi usage hỗ trợ viewed, downloaded, acknowledged và commented",
        "Supabase Storage phù hợp cho phase đầu",
      ],
    },
    {
      id: "actions",
      eyebrow: "Theo dõi sau phiên",
      title: "Kế hoạch hành động",
      subtitle: "Theo dõi action plan sau phiên và liên kết với đầu ra hoặc chủ đề.",
      headline: "Action plan nối coaching session với thay đổi thực tế.",
      actions: ["Tạo action plan", "Cập nhật tiến độ", "Gắn đầu ra"],
      tabs: ["Plan List", "Progress", "Evidence", "Overdue"],
      metrics: baseMetrics(locale, "kế hoạch hành động"),
      bullets: [
        "Action plan nối session, chủ đề và đầu ra theo mạch end-to-end",
        "Cả coach và coachee đều có thể cập nhật tiến độ",
        "Minh chứng có thể lưu dưới dạng ghi chú hoặc file",
        "Báo cáo phase 1 nên ưu tiên quá hạn và tỷ lệ hoàn thành",
      ],
    },
    {
      id: "reports",
      eyebrow: "Phân tích vận hành",
      title: "Báo cáo",
      subtitle: "Xem báo cáo chương trình, questionnaire, chủ đề, đầu ra, tài liệu và action plan.",
      headline: "Phase 1 nên ưu tiên góc nhìn vận hành trước các phân tích nâng cao.",
      actions: ["Xem dashboard", "Xuất dữ liệu", "Lọc theo tenant"],
      tabs: ["Operations", "Questionnaire", "Outputs", "Artifacts", "Action Plans", "Measurement"],
      metrics: baseMetrics(locale, "báo cáo"),
      bullets: [
        "Báo cáo vận hành nên bao gồm programs, cohorts, session states và completion",
        "Báo cáo đầu ra nên làm rõ trạng thái quá hạn và review",
        "Báo cáo tài liệu nên tập trung vào chia sẻ và mức độ tiếp cận",
        "Measurement có thể giữ ở mức gọn trong giai đoạn đầu",
      ],
    },
    {
      id: "admin",
      eyebrow: "Điều hành hệ thống",
      title: "Quản trị & phân quyền",
      subtitle: "Quản lý tenant, unit, membership, lời mời khách và audit log.",
      headline: "Thiết kế phân quyền nên đi cùng với thiết kế schema ngay từ đầu.",
      actions: ["Quản lý tenant", "Quản lý vai trò", "Xem audit log"],
      tabs: ["Tenants", "Units", "Memberships", "Guests", "Audit"],
      metrics: baseMetrics(locale, "phân quyền"),
      bullets: [
        "Membership kết nối auth user với dữ liệu theo tenant",
        "Guest invitation hỗ trợ coachee bên ngoài mà không phá mô hình phân quyền",
        "Confidential flag là giải pháp thực tế cho phase 1",
        "Audit log rất quan trọng với quy trình coaching nhạy cảm",
      ],
    },
  ];
}
