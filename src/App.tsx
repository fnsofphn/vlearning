import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getModuleConfigs, getNavigation, type Locale, type ModuleConfig } from "./data";
import { supabase } from "./lib/supabase";

type AuthMode = "signIn" | "signUp";

type AuthFormState = {
  fullName: string;
  email: string;
  password: string;
};

type AppProfile = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
};

type MembershipRpcRow = {
  id: string;
  role: string;
  status: string;
  is_primary: boolean;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  unit_id: string | null;
  unit_code: string | null;
  unit_name: string | null;
};

type TenantSummary = {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: string;
};

type UnitSummary = {
  id: string;
  code: string;
  name: string;
};

type TenantMembership = {
  id: string;
  role: string;
  status: string;
  is_primary: boolean;
  tenant: TenantSummary | null;
  unit: UnitSummary | null;
};

type Dictionary = {
  sessionCheckError: string;
  signUpSuccessSession: string;
  signUpSuccessConfirm: string;
  signInSuccess: string;
  authGenericError: string;
  loadAccountError: string;
  checkingSessionTitle: string;
  checkingSessionCopy: string;
  brandSub: string;
  connectedTag: string;
  navLabel: string;
  noMembership: string;
  refreshing: string;
  refreshAccount: string;
  signOut: string;
  breadcrumb: string;
  workspaceTitle: string;
  loadingTopbar: string;
  noAccessTopbar: string;
  setupEyebrow: string;
  setupTitle: string;
  setupCopy: string;
  setupCard1Title: string;
  setupCard1Body: string;
  setupCard2Title: string;
  setupCard2Body: string;
  loadingEyebrow: string;
  authEyebrow: string;
  authTitle: string;
  authCopy: string;
  authHint1: string;
  authHint2: string;
  authHint3: string;
  accountEyebrow: string;
  createAccount: string;
  signIn: string;
  signUpCopy: string;
  signInCopy: string;
  fullName: string;
  fullNamePlaceholder: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  working: string;
  quickTipTitle: string;
  quickTipBody: string;
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardCopy: string;
  profileLabel: string;
  accessLabel: string;
  primaryLabel: string;
  yes: string;
  no: string;
  currentInfoEyebrow: string;
  profileAndAccessTitle: string;
  reload: string;
  noLinkedProfile: string;
  noEmail: string;
  profileLinked: string;
  profileWillLink: string;
  unknownTenant: string;
  role: string;
  status: string;
  unit: string;
  notAssigned: string;
  noWorkspaceAccess: string;
  checksEyebrow: string;
  nextChecksTitle: string;
  check1: string;
  check2: string;
  check3: string;
  check4: string;
  note: string;
  featureLabel: string;
  currentSlice: string;
  overview: string;
  continueBuild: string;
  nextBranchTitle: string;
  nextBranchCopy: string;
  nextItemHint: string;
  engineeringNotes: string;
  checklistTitle: string;
  eng1: string;
  eng2: string;
  eng3: string;
  eng4: string;
  moduleReadyWithAccess: (name: string, count: number) => string;
  moduleNoAccess: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  missingSql: string;
  deniedAccess: string;
  duplicateProfile: string;
};

const initialAuthForm: AuthFormState = {
  fullName: "",
  email: "",
  password: "",
};

const dictionaries: Record<Locale, Dictionary> = {
  vi: {
    sessionCheckError: "Không thể kiểm tra phiên đăng nhập hiện tại.",
    signUpSuccessSession: "Tạo tài khoản thành công. Hệ thống đang đồng bộ hồ sơ của bạn.",
    signUpSuccessConfirm: "Tạo tài khoản thành công. Nếu Supabase đang bật xác nhận email, hãy xác nhận email rồi đăng nhập lại.",
    signInSuccess: "Đăng nhập thành công. Đang tải hồ sơ và quyền truy cập...",
    authGenericError: "Không thể hoàn tất đăng nhập hoặc tạo tài khoản.",
    loadAccountError: "Không thể tải hồ sơ và quyền truy cập từ Supabase.",
    checkingSessionTitle: "Đang kiểm tra phiên đăng nhập",
    checkingSessionCopy: "Ứng dụng đang khôi phục phiên làm việc trước khi hiển thị màn hình đăng nhập hoặc trang tổng quan.",
    brandSub: "ĐĂNG NHẬP, HỒ SƠ, PHÂN QUYỀN",
    connectedTag: "Kết nối Supabase đang hoạt động",
    navLabel: "Điều hướng nghiệp vụ",
    noMembership: "Chưa có quyền",
    refreshing: "Đang tải...",
    refreshAccount: "Tải lại tài khoản",
    signOut: "Đăng xuất",
    breadcrumb: "v-Culture / Coaching VHDN / Supabase",
    workspaceTitle: "Không gian làm việc",
    loadingTopbar: "Đang tải hồ sơ và quyền truy cập...",
    noAccessTopbar: "chưa có quyền truy cập",
    setupEyebrow: "Cần cấu hình Supabase",
    setupTitle: "Thiếu biến môi trường",
    setupCopy: "Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env trước khi kiểm thử đăng nhập.",
    setupCard1Title: "1. Cập nhật .env",
    setupCard1Body: "Điền Project URL và anon key của Supabase vào file .env.",
    setupCard2Title: "2. Khởi động lại Vite",
    setupCard2Body: "Khởi động lại dev server để ứng dụng nạp cấu hình mới.",
    loadingEyebrow: "Kết nối Supabase",
    authEyebrow: "Đăng nhập hệ thống",
    authTitle: "Truy cập không gian làm việc coaching",
    authCopy: "Đăng nhập bằng email và mật khẩu để tải hồ sơ người dùng và quyền truy cập từ Supabase.",
    authHint1: "Hệ thống đã kết nối Supabase Auth, hồ sơ người dùng và membership thực tế.",
    authHint2: "Nếu chưa vào được, hãy kiểm tra lại tài khoản đã được tạo trong Supabase Authentication hay chưa.",
    authHint3: "Giao diện đã được rút gọn để tập trung vào phần đăng nhập và dữ liệu thật.",
    accountEyebrow: "Tài khoản",
    createAccount: "Tạo tài khoản",
    signIn: "Đăng nhập",
    signUpCopy: "Tạo tài khoản mới để liên kết vào hồ sơ ứng dụng ở lần đăng nhập đầu tiên.",
    signInCopy: "Sau khi đăng nhập, hệ thống sẽ tải hồ sơ và danh sách quyền truy cập của bạn.",
    fullName: "Họ và tên",
    fullNamePlaceholder: "Ví dụ: Phạm Hoài Nam",
    emailPlaceholder: "ban@congty.com",
    password: "Mật khẩu",
    passwordPlaceholder: "Tối thiểu 6 ký tự",
    working: "Đang xử lý...",
    quickTipTitle: "Mẹo xử lý nhanh:",
    quickTipBody: "nếu vừa tạo tài khoản mà chưa đăng nhập được, hãy vào mục Authentication / Users trong Supabase để kiểm tra email đã được tạo chưa và có yêu cầu xác nhận email hay không.",
    dashboardEyebrow: "Tổng quan tài khoản",
    dashboardTitle: "Đăng nhập thành công và đã kết nối dữ liệu thật",
    dashboardCopy: "Hệ thống đang đọc hồ sơ người dùng và quyền truy cập trực tiếp từ Supabase để làm nền cho các màn hình nghiệp vụ tiếp theo.",
    profileLabel: "hồ sơ",
    accessLabel: "quyền truy cập",
    primaryLabel: "quyền mặc định",
    yes: "Có",
    no: "Không",
    currentInfoEyebrow: "Thông tin hiện tại",
    profileAndAccessTitle: "Hồ sơ và phân quyền",
    reload: "Tải lại",
    noLinkedProfile: "Chưa có hồ sơ liên kết",
    noEmail: "Chưa có email",
    profileLinked: "Tài khoản đăng nhập đã được liên kết với hồ sơ ứng dụng.",
    profileWillLink: "Nếu chưa có hồ sơ, hệ thống sẽ tự tạo hoặc liên kết khi tải tài khoản.",
    unknownTenant: "Chưa xác định đơn vị",
    role: "Vai trò",
    status: "Trạng thái",
    unit: "Bộ phận",
    notAssigned: "Chưa gán",
    noWorkspaceAccess: "Tài khoản đã đăng nhập nhưng chưa có quyền truy cập workspace. Hãy kiểm tra lại query bootstrap hoặc bản ghi trong app.tenant_memberships.",
    checksEyebrow: "Gợi ý kiểm tra",
    nextChecksTitle: "Các bước nên kiểm tra tiếp",
    check1: "Vào Supabase Authentication để xác nhận tài khoản admin@vinabrain.com đã được tạo.",
    check2: "Nếu bật xác nhận email, hãy xác nhận email hoặc tắt email confirmation để thử nhanh.",
    check3: "Nếu đã đăng nhập được nhưng chưa thấy dữ liệu, kiểm tra bảng app.profiles và app.tenant_memberships.",
    check4: "Sau khi ổn đăng nhập, mới tiếp tục triển khai các màn hình nghiệp vụ.",
    note: "Màn hình này đã được rút gọn để ưu tiên thông tin thật thay vì nội dung mô phỏng.",
    featureLabel: "Trọng tâm triển khai",
    currentSlice: "Phần đang xem",
    overview: "Tổng quan",
    continueBuild: "Triển khai tiếp",
    nextBranchTitle: "Phạm vi phù hợp cho nhánh tiếp theo",
    nextBranchCopy: "Mỗi mục dưới đây là một lát cắt hợp lý để triển khai màn hình, form và workflow gắn trực tiếp với schema Supabase.",
    nextItemHint: "Đây là hạng mục phù hợp để làm ở bước tiếp theo.",
    engineeringNotes: "Lưu ý kỹ thuật",
    checklistTitle: "Checklist trước khi làm sâu",
    eng1: "Xác định bảng Supabase nào là nguồn dữ liệu chính của module này.",
    eng2: "Chốt quyền đọc và ghi cho admin, coach, guest coachee và executive viewer.",
    eng3: "Quyết định phần nào đọc Supabase trực tiếp và phần nào đi qua service layer.",
    eng4: "Tách rõ trạng thái loading, empty, error và không đủ quyền ngay từ đầu.",
    moduleReadyWithAccess: (name, count) => `${name} hiện có ${count} quyền truy cập. Có thể nối dữ liệu thật cho module này khi sẵn sàng.`,
    moduleNoAccess: "Tài khoản đã đăng nhập nhưng chưa có quyền truy cập tenant. Hãy seed membership trước khi nối CRUD.",
    invalidCredentials: "Email hoặc mật khẩu chưa đúng. Nếu bạn vừa tạo tài khoản, hãy kiểm tra lại trong Supabase Authentication > Users hoặc thử đặt lại mật khẩu.",
    emailNotConfirmed: "Tài khoản chưa được xác nhận email. Hãy kiểm tra hộp thư hoặc tắt email confirmation trong Supabase để thử nhanh.",
    missingSql: "Supabase đang thiếu phần SQL truy cập tài khoản. Hãy kiểm tra lại migrations 202603300002 và 202603300003.",
    deniedAccess: "Supabase đang chặn quyền đọc hồ sơ hoặc membership. Hãy kiểm tra grants, functions và RLS policies.",
    duplicateProfile: "Hồ sơ cho email này đã tồn tại. Hãy thử đăng nhập lại hoặc kiểm tra dữ liệu trong app.profiles.",
  },
  en: {
    sessionCheckError: "Could not check the current sign-in session.",
    signUpSuccessSession: "Account created successfully. The app is syncing your profile now.",
    signUpSuccessConfirm: "Account created successfully. If email confirmation is enabled in Supabase, confirm the email first and then sign in.",
    signInSuccess: "Sign in succeeded. Loading profile and access data...",
    authGenericError: "Could not complete sign in or sign up.",
    loadAccountError: "Could not load profile and access data from Supabase.",
    checkingSessionTitle: "Checking sign-in session",
    checkingSessionCopy: "The app is restoring the browser session before deciding whether to show the dashboard or the sign-in screen.",
    brandSub: "AUTH, PROFILE, ACCESS",
    connectedTag: "Supabase connection is active",
    navLabel: "Business navigation",
    noMembership: "No access yet",
    refreshing: "Refreshing...",
    refreshAccount: "Refresh account",
    signOut: "Sign out",
    breadcrumb: "v-Culture / Coaching VHDN / Supabase",
    workspaceTitle: "Workspace",
    loadingTopbar: "Loading profile and access data...",
    noAccessTopbar: "no access yet",
    setupEyebrow: "Supabase setup required",
    setupTitle: "Missing environment variables",
    setupCopy: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env before testing sign-in.",
    setupCard1Title: "1. Update .env",
    setupCard1Body: "Paste the Supabase Project URL and anon key into your .env file.",
    setupCard2Title: "2. Restart Vite",
    setupCard2Body: "Restart the dev server so the app can load the new configuration.",
    loadingEyebrow: "Supabase connection",
    authEyebrow: "System access",
    authTitle: "Access the coaching workspace",
    authCopy: "Sign in with email and password to load user profile and access data from Supabase.",
    authHint1: "The app is connected to Supabase Auth, real user profiles, and real memberships.",
    authHint2: "If sign-in still fails, verify that the account exists in Supabase Authentication.",
    authHint3: "The interface is intentionally simplified to focus on real sign-in and real data.",
    accountEyebrow: "Account",
    createAccount: "Create account",
    signIn: "Sign in",
    signUpCopy: "Create a new account and link it to the app profile on the first authenticated load.",
    signInCopy: "After sign-in, the app loads your profile and access memberships.",
    fullName: "Full name",
    fullNamePlaceholder: "Example: Pham Hoai Nam",
    emailPlaceholder: "you@company.com",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    working: "Working...",
    quickTipTitle: "Quick tip:",
    quickTipBody: "if you have just created the account and still cannot sign in, check Authentication / Users in Supabase to confirm the user exists and whether email confirmation is required.",
    dashboardEyebrow: "Account overview",
    dashboardTitle: "Sign-in succeeded and real data is connected",
    dashboardCopy: "The app is now reading the user profile and access scope directly from Supabase as a base for the next business screens.",
    profileLabel: "profile",
    accessLabel: "access scopes",
    primaryLabel: "primary access",
    yes: "Yes",
    no: "No",
    currentInfoEyebrow: "Current information",
    profileAndAccessTitle: "Profile and access",
    reload: "Reload",
    noLinkedProfile: "No linked profile yet",
    noEmail: "No email available",
    profileLinked: "The signed-in account is linked to an application profile.",
    profileWillLink: "If the profile does not exist yet, the app will create or link it during account loading.",
    unknownTenant: "Unknown tenant",
    role: "Role",
    status: "Status",
    unit: "Unit",
    notAssigned: "Not assigned",
    noWorkspaceAccess: "The account is signed in but still has no workspace access. Recheck the bootstrap query or the row in app.tenant_memberships.",
    checksEyebrow: "Suggested checks",
    nextChecksTitle: "What to verify next",
    check1: "Open Supabase Authentication and confirm that admin@vinabrain.com exists.",
    check2: "If email confirmation is enabled, confirm the email or disable confirmation for quick testing.",
    check3: "If sign-in works but no data appears, inspect app.profiles and app.tenant_memberships.",
    check4: "Once sign-in is stable, continue with the next business screens.",
    note: "This screen is intentionally trimmed down to show real data instead of mock content.",
    featureLabel: "Implementation focus",
    currentSlice: "Current section",
    overview: "Overview",
    continueBuild: "Build next",
    nextBranchTitle: "Good scope for the next branch",
    nextBranchCopy: "Each item below is a reasonable slice for the next screen, form, or workflow tied directly to the Supabase schema.",
    nextItemHint: "This is a strong candidate for the next implementation step.",
    engineeringNotes: "Engineering notes",
    checklistTitle: "Checklist before deeper work",
    eng1: "Confirm which Supabase table is the source of truth for this module.",
    eng2: "Lock read and write permissions for admin, coach, guest coachee, and executive viewer.",
    eng3: "Decide which parts read Supabase directly and which should go through a service layer.",
    eng4: "Separate loading, empty, error, and permission-denied states from day one.",
    moduleReadyWithAccess: (name, count) => `${name} currently has ${count} access memberships. This module is ready for real data wiring when you want it.`,
    moduleNoAccess: "The account is signed in but still has no tenant access. Seed a membership before wiring CRUD.",
    invalidCredentials: "The email or password is incorrect. If you just created the account, verify it in Supabase Authentication > Users or reset the password and try again.",
    emailNotConfirmed: "This account is not confirmed yet. Check the inbox or disable email confirmation in Supabase for quick testing.",
    missingSql: "Supabase is missing the account-access SQL. Recheck migrations 202603300002 and 202603300003.",
    deniedAccess: "Supabase denied access to profile or membership data. Recheck grants, functions, and RLS policies.",
    duplicateProfile: "A profile already exists for this email. Try signing in again or inspect app.profiles.",
  },
};

function inferLocaleFromEmail(email?: string | null): Locale {
  if (!email) {
    return "vi";
  }

  return email.trim().toLowerCase() === "phamhoainamk54@gmail.com" ? "en" : "vi";
}

function App() {
  const [activePage, setActivePage] = useState("dash");
  const [activeTabs, setActiveTabs] = useState<Record<string, number>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);

  const locale = inferLocaleFromEmail(session?.user?.email ?? authForm.email);
  const t = dictionaries[locale];
  const navigation = useMemo(() => getNavigation(locale), [locale]);
  const moduleConfigs = useMemo(() => getModuleConfigs(locale), [locale]);

  const activeModule = useMemo(
    () => moduleConfigs.find((item) => item.id === activePage),
    [activePage, moduleConfigs],
  );

  const primaryMembership = useMemo(
    () => memberships.find((item) => item.is_primary) ?? memberships[0] ?? null,
    [memberships],
  );

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(normalizeSupabaseError(error, t, t.sessionCheckError));
      }

      setSession(data.session ?? null);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setSessionLoading(false);
      setAuthError(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setMemberships([]);
      setDataError(null);
      setDataLoading(false);
      return;
    }

    void loadAccount(session.user);
  }, [session?.user?.id]);

  const handleTabChange = (moduleId: string, tabIndex: number) => {
    setActiveTabs((current) => ({ ...current, [moduleId]: tabIndex }));
  };

  const handleAuthFieldChange = (field: keyof AuthFormState, value: string) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthMessage(null);
    setAuthForm((current) => ({ ...current, fullName: mode === "signUp" ? current.fullName : "" }));
  };

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    const formLocale = inferLocaleFromEmail(authForm.email);
    const formText = dictionaries[formLocale];

    try {
      if (authMode === "signUp") {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.fullName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        setAuthMessage(data.session ? formText.signUpSuccessSession : formText.signUpSuccessConfirm);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });

        if (error) {
          throw error;
        }

        setAuthMessage(formText.signInSuccess);
      }
    } catch (error) {
      setAuthError(normalizeSupabaseError(error, formText, formText.authGenericError));
    } finally {
      setAuthBusy(false);
      setAuthForm((current) => ({ ...current, password: "" }));
    }
  }

  async function loadAccount(user: User) {
    if (!isSupabaseConfigured) {
      return;
    }

    setDataLoading(true);
    setDataError(null);

    const userLocale = inferLocaleFromEmail(user.email);
    const userText = dictionaries[userLocale];

    try {
      const fallbackName =
        typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : user.email
            ? user.email.split("@")[0]
            : userLocale === "vi"
              ? "Người dùng mới"
              : "New user";

      const { data: ensuredProfile, error: ensureError } = await supabase
        .rpc("ensure_my_profile", { requested_full_name: fallbackName })
        .single();

      if (ensureError) {
        throw ensureError;
      }

      setProfile(ensuredProfile as AppProfile);

      const { data: membershipRows, error: membershipsError } = await supabase.rpc(
        "list_my_memberships",
      );

      if (membershipsError) {
        throw membershipsError;
      }

      setMemberships(mapMembershipRows((membershipRows ?? []) as MembershipRpcRow[]));
      setAuthMessage(null);
    } catch (error) {
      setMemberships([]);
      setDataError(normalizeSupabaseError(error, userText, userText.loadAccountError));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleRefreshAccount() {
    if (!session?.user) {
      return;
    }

    await loadAccount(session.user);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setActivePage("dash");
    setAuthMessage(null);
    setDataError(null);
    setAuthForm(initialAuthForm);
  }

  const userDisplayName =
    profile?.full_name ??
    (typeof session?.user.user_metadata.full_name === "string"
      ? session.user.user_metadata.full_name
      : session?.user.email) ??
    (locale === "vi" ? "Người dùng" : "User");

  const currentDate = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB").format(new Date());

  const topbarStatus = dataError
    ? dataError
    : dataLoading
      ? t.loadingTopbar
      : primaryMembership?.tenant
        ? `${primaryMembership.tenant.name} | ${formatRole(primaryMembership.role, locale)}`
        : `${session?.user.email ?? (locale === "vi" ? "Người dùng" : "User")} | ${t.noAccessTopbar}`;

  if (!isSupabaseConfigured) {
    return <SetupScreen t={t} />;
  }

  if (sessionLoading) {
    return <LoadingScreen t={t} title={t.checkingSessionTitle} copy={t.checkingSessionCopy} />;
  }

  if (!session) {
    return (
      <AuthScreen
        authBusy={authBusy}
        authError={authError}
        authForm={authForm}
        authMessage={authMessage}
        authMode={authMode}
        onAuthFieldChange={handleAuthFieldChange}
        onAuthSubmit={handleAuthSubmit}
        onModeChange={handleModeChange}
        t={t}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-row">
            <div className="brand-mark">VC</div>
            <div>
              <div className="brand-name">v-Culture</div>
              <div className="brand-sub">{t.brandSub}</div>
            </div>
          </div>
          <div className="brand-tag">{t.connectedTag}</div>
        </div>

        <div className="nav-group">
          <div className="nav-label">{t.navLabel}</div>
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
            <div className="user-avatar">{getInitials(userDisplayName)}</div>
            <div>
              <div className="user-name">{userDisplayName}</div>
              <div className="user-role">
                {primaryMembership ? formatRole(primaryMembership.role, locale) : t.noMembership}
              </div>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="button ghost sidebar-button" disabled={dataLoading} onClick={() => void handleRefreshAccount()} type="button">
              {dataLoading ? t.refreshing : t.refreshAccount}
            </button>
            <button className="button ghost sidebar-button" onClick={() => void handleSignOut()} type="button">
              {t.signOut}
            </button>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">{t.breadcrumb}</div>
            <div className="topbar-title">{activePage === "dash" ? t.workspaceTitle : activeModule?.title}</div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-pill">{currentDate}</div>
            <div className="topbar-search">{topbarStatus}</div>
          </div>
        </header>

        <section className="content-shell">
          {dataError ? <StatusBanner tone="error" text={dataError} /> : null}

          {activePage === "dash" ? (
            <DashboardView
              dataLoading={dataLoading}
              memberships={memberships}
              onRefresh={handleRefreshAccount}
              profile={profile}
              userEmail={session.user.email ?? null}
              t={t}
              locale={locale}
            />
          ) : activeModule ? (
            <ModuleView
              memberships={memberships}
              module={activeModule}
              activeTab={activeTabs[activeModule.id] ?? 0}
              onTabChange={handleTabChange}
              profile={profile}
              t={t}
              locale={locale}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function SetupScreen({ t }: { t: Dictionary }) {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <div className="hero-eyebrow">{t.setupEyebrow}</div>
        <h1 className="page-title">{t.setupTitle}</h1>
        <p className="page-subtitle">{t.setupCopy}</p>
        <div className="auth-meta-grid">
          <div className="mini-card">
            <h3>{t.setupCard1Title}</h3>
            <p>{t.setupCard1Body}</p>
          </div>
          <div className="mini-card">
            <h3>{t.setupCard2Title}</h3>
            <p>{t.setupCard2Body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ t, title, copy }: { t: Dictionary; title: string; copy: string }) {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <div className="hero-eyebrow">{t.loadingEyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{copy}</p>
      </div>
    </div>
  );
}

function AuthScreen({
  authBusy,
  authError,
  authForm,
  authMessage,
  authMode,
  onAuthFieldChange,
  onAuthSubmit,
  onModeChange,
  t,
}: {
  authBusy: boolean;
  authError: string | null;
  authForm: AuthFormState;
  authMessage: string | null;
  authMode: AuthMode;
  onAuthFieldChange: (field: keyof AuthFormState, value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: AuthMode) => void;
  t: Dictionary;
}) {
  const isSignUp = authMode === "signUp";
  const canSubmit = authForm.email.trim().length > 0 && authForm.password.trim().length >= 6 && (!isSignUp || authForm.fullName.trim().length > 0);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <section className="auth-showcase">
          <div className="hero-eyebrow">{t.authEyebrow}</div>
          <h1 className="hero-title">{t.authTitle}</h1>
          <p className="hero-copy auth-copy">{t.authCopy}</p>

          <div className="auth-list">
            <div className="auth-list-item">{t.authHint1}</div>
            <div className="auth-list-item">{t.authHint2}</div>
            <div className="auth-list-item">{t.authHint3}</div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="panel-eyebrow">{t.accountEyebrow}</div>
          <h2 className="panel-title">{isSignUp ? t.createAccount : t.signIn}</h2>
          <p className="page-subtitle">{isSignUp ? t.signUpCopy : t.signInCopy}</p>

          <div className="auth-switch">
            <button className={`switch-button ${authMode === "signIn" ? "is-active" : ""}`} onClick={() => onModeChange("signIn")} type="button">
              {t.signIn}
            </button>
            <button className={`switch-button ${authMode === "signUp" ? "is-active" : ""}`} onClick={() => onModeChange("signUp")} type="button">
              {t.createAccount}
            </button>
          </div>

          {authMessage ? <StatusBanner tone="success" text={authMessage} /> : null}
          {authError ? <StatusBanner tone="error" text={authError} /> : null}

          <form className="auth-form" onSubmit={onAuthSubmit}>
            {isSignUp ? (
              <div className="field-grid">
                <label className="field-label" htmlFor="full-name">{t.fullName}</label>
                <input className="field-input" id="full-name" onChange={(event) => onAuthFieldChange("fullName", event.target.value)} placeholder={t.fullNamePlaceholder} type="text" value={authForm.fullName} />
              </div>
            ) : null}

            <div className="field-grid">
              <label className="field-label" htmlFor="email">Email</label>
              <input autoComplete="email" className="field-input" id="email" onChange={(event) => onAuthFieldChange("email", event.target.value)} placeholder={t.emailPlaceholder} type="email" value={authForm.email} />
            </div>

            <div className="field-grid">
              <label className="field-label" htmlFor="password">{t.password}</label>
              <input autoComplete={isSignUp ? "new-password" : "current-password"} className="field-input" id="password" minLength={6} onChange={(event) => onAuthFieldChange("password", event.target.value)} placeholder={t.passwordPlaceholder} type="password" value={authForm.password} />
            </div>

            <button className="button primary full" disabled={!canSubmit || authBusy} type="submit">
              {authBusy ? t.working : isSignUp ? t.createAccount : t.signIn}
            </button>
          </form>

          <div className="auth-help">
            <strong>{t.quickTipTitle}</strong> {t.quickTipBody}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardView({
  dataLoading,
  memberships,
  onRefresh,
  profile,
  userEmail,
  t,
  locale,
}: {
  dataLoading: boolean;
  memberships: TenantMembership[];
  onRefresh: () => Promise<void>;
  profile: AppProfile | null;
  userEmail: string | null;
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="hero-eyebrow">{t.dashboardEyebrow}</div>
          <h1 className="hero-title">{t.dashboardTitle}</h1>
          <p className="hero-copy">{t.dashboardCopy}</p>
        </div>

        <div className="hero-chips">
          <div className="hero-chip">
            <span className="hero-chip-value">{profile ? t.yes : t.no}</span>
            <span className="hero-chip-label">{t.profileLabel}</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.length}</span>
            <span className="hero-chip-label">{t.accessLabel}</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.some((item) => item.is_primary) ? t.yes : t.no}</span>
            <span className="hero-chip-label">{t.primaryLabel}</span>
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">{t.currentInfoEyebrow}</div>
              <h2 className="panel-title">{t.profileAndAccessTitle}</h2>
            </div>
            <button className="button primary" onClick={() => void onRefresh()} type="button">
              {dataLoading ? t.refreshing : t.reload}
            </button>
          </div>

          <div className="account-grid">
            <div className="mini-card">
              <h3>{profile?.full_name ?? t.noLinkedProfile}</h3>
              <p>{profile?.email ?? userEmail ?? t.noEmail}</p>
              <div className="small-note">{profile ? t.profileLinked : t.profileWillLink}</div>
            </div>

            <div className="membership-list">
              {memberships.length > 0 ? (
                memberships.map((membership) => (
                  <div key={membership.id} className="membership-card">
                    <div className="membership-title">{membership.tenant?.name ?? t.unknownTenant}</div>
                    <div className="membership-meta">{t.role}: {formatRole(membership.role, locale)}</div>
                    <div className="membership-meta">{t.status}: {formatStatus(membership.status, locale)}</div>
                    <div className="membership-meta">{t.unit}: {membership.unit?.name ?? t.notAssigned}</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">{t.noWorkspaceAccess}</div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">{t.checksEyebrow}</div>
              <h2 className="panel-title">{t.nextChecksTitle}</h2>
            </div>
          </div>

          <div className="checklist compact">
            <ChecklistItem text={t.check1} />
            <ChecklistItem text={t.check2} />
            <ChecklistItem text={t.check3} />
            <ChecklistItem text={t.check4} />
          </div>

          <div className="note-box">{t.note}</div>
        </div>
      </section>
    </div>
  );
}

function ModuleView({
  memberships,
  module,
  activeTab,
  onTabChange,
  profile,
  t,
  locale,
}: {
  memberships: TenantMembership[];
  module: ModuleConfig;
  activeTab: number;
  onTabChange: (moduleId: string, tabIndex: number) => void;
  profile: AppProfile | null;
  t: Dictionary;
  locale: Locale;
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

      <StatusBanner
        tone="info"
        text={memberships.length > 0 ? t.moduleReadyWithAccess(profile?.full_name ?? (locale === "vi" ? "Người dùng này" : "This user"), memberships.length) : t.moduleNoAccess}
      />

      <section className="feature-banner">
        <div className="feature-copy">
          <div className="feature-label">{t.featureLabel}</div>
          <div className="feature-title">{module.headline}</div>
        </div>
      </section>

      {module.tabs ? (
        <section className="tabbar">
          {module.tabs.map((tab, index) => (
            <button key={tab} className={`tab ${activeTab === index ? "is-active" : ""}`} onClick={() => onTabChange(module.id, index)} type="button">
              {tab}
            </button>
          ))}
        </section>
      ) : null}

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">{t.currentSlice}</div>
              <h2 className="panel-title">{module.tabs?.[activeTab] ?? t.overview}</h2>
            </div>
            <button className="button primary" type="button">{t.continueBuild}</button>
          </div>

          <div className="section-copy">
            <h3>{t.nextBranchTitle}</h3>
            <p>{t.nextBranchCopy}</p>
          </div>

          <div className="bullet-grid">
            {visibleBullets.map((item) => (
              <div key={item} className="bullet-card">
                <div className="bullet-title">{item}</div>
                <div className="bullet-body">{t.nextItemHint}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">{t.engineeringNotes}</div>
              <h2 className="panel-title">{t.checklistTitle}</h2>
            </div>
          </div>

          <div className="checklist">
            <ChecklistItem text={t.eng1} />
            <ChecklistItem text={t.eng2} />
            <ChecklistItem text={t.eng3} />
            <ChecklistItem text={t.eng4} />
          </div>

          <div className="note-box">{t.note}</div>
        </div>
      </section>
    </div>
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

function StatusBanner({ tone, text }: { tone: "error" | "info" | "success"; text: string }) {
  return <div className={`status-banner is-${tone}`}>{text}</div>;
}

function getInitials(value: string) {
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "VC";
}

function formatRole(role: string, locale: Locale) {
  const vi: Record<string, string> = {
    system_admin: "Quản trị hệ thống",
    business_admin: "Quản trị doanh nghiệp",
    coach: "Coach",
    coachee_internal: "Coachee nội bộ",
    coachee_guest: "Coachee khách",
    reviewer: "Người duyệt",
    executive_viewer: "Người xem điều hành",
    lead_coach: "Coach chính",
    support_coach: "Coach hỗ trợ",
    coordinator: "Điều phối",
  };

  const en: Record<string, string> = {
    system_admin: "System admin",
    business_admin: "Business admin",
    coach: "Coach",
    coachee_internal: "Internal coachee",
    coachee_guest: "Guest coachee",
    reviewer: "Reviewer",
    executive_viewer: "Executive viewer",
    lead_coach: "Lead coach",
    support_coach: "Support coach",
    coordinator: "Coordinator",
  };

  return (locale === "vi" ? vi : en)[role] ?? role;
}

function formatStatus(status: string, locale: Locale) {
  const vi: Record<string, string> = {
    active: "Đang hoạt động",
    invited: "Đã mời",
    suspended: "Tạm khóa",
    pending: "Đang chờ",
    draft: "Nháp",
    completed: "Hoàn thành",
  };

  const en: Record<string, string> = {
    active: "Active",
    invited: "Invited",
    suspended: "Suspended",
    pending: "Pending",
    draft: "Draft",
    completed: "Completed",
  };

  return (locale === "vi" ? vi : en)[status] ?? status;
}

function mapMembershipRows(rows: MembershipRpcRow[]) {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    status: row.status,
    is_primary: row.is_primary,
    tenant: row.tenant_id
      ? {
          id: row.tenant_id,
          code: row.tenant_code,
          name: row.tenant_name,
          slug: row.tenant_slug,
          status: row.tenant_status,
        }
      : null,
    unit: row.unit_id
      ? {
          id: row.unit_id,
          code: row.unit_code ?? "",
          name: row.unit_name ?? "",
        }
      : null,
  }));
}

function normalizeSupabaseError(error: unknown, t: Dictionary, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return fallback;
  }

  const message = String(error.message ?? fallback).trim();
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return t.invalidCredentials;
  }

  if (lower.includes("email not confirmed")) {
    return t.emailNotConfirmed;
  }

  if (
    lower.includes("schema must be one of the following") ||
    lower.includes("exposed schemas") ||
    lower.includes("not in the schema cache") ||
    lower.includes("ensure_my_profile") ||
    lower.includes("list_my_memberships")
  ) {
    return t.missingSql;
  }

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return t.deniedAccess;
  }

  if (lower.includes("duplicate key value violates unique constraint")) {
    return t.duplicateProfile;
  }

  return message;
}

export default App;
