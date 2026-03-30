import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { moduleConfigs, navigation, type ModuleConfig } from "./data";
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

const initialAuthForm: AuthFormState = {
  fullName: "",
  email: "",
  password: "",
};

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

  const activeModule = useMemo(
    () => moduleConfigs.find((item) => item.id === activePage),
    [activePage],
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
        setAuthError(
          normalizeSupabaseError(error, "Không th? ki?m tra phiên dang nh?p hi?n t?i."),
        );
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
  }, []);

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

        setAuthMessage(
          data.session
            ? "T?o tài kho?n thành công. H? th?ng dang d?ng b? h? so c?a b?n."
            : "T?o tài kho?n thành công. N?u Supabase dang b?t xác nh?n email, hãy xác nh?n email r?i dang nh?p l?i.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });

        if (error) {
          throw error;
        }

        setAuthMessage("Ðang nh?p thành công. Ðang t?i h? so và quy?n truy c?p...");
      }
    } catch (error) {
      setAuthError(normalizeSupabaseError(error, "Không th? hoàn t?t dang nh?p ho?c t?o tài kho?n."));
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

    try {
      const fallbackName =
        typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : user.email
            ? user.email.split("@")[0]
            : "Nguoi dung moi";

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
      setDataError(
        normalizeSupabaseError(error, "Không th? t?i h? so và quy?n truy c?p t? Supabase."),
      );
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
    "Nguoi dung";

  const currentDate = new Intl.DateTimeFormat("vi-VN").format(new Date());

  const topbarStatus = dataError
    ? dataError
    : dataLoading
      ? "Ðang t?i h? so và quy?n truy c?p..."
      : primaryMembership?.tenant
        ? `${primaryMembership.tenant.name} | ${formatRole(primaryMembership.role)}`
        : `${session?.user.email ?? "Ngu?i dùng"} | chua có quy?n truy c?p`;

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (sessionLoading) {
    return (
      <LoadingScreen
        title="Ðang ki?m tra phiên dang nh?p"
        copy="?ng d?ng dang khôi ph?c phiên làm vi?c tru?c khi hi?n th? màn hình dang nh?p ho?c trang t?ng quan."
      />
    );
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
              <div className="brand-sub">ÐANG NH?P, H? SO, PHÂN QUY?N</div>
            </div>
          </div>
          <div className="brand-tag">K?t n?i Supabase dang ho?t d?ng</div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Ði?u hu?ng nghi?p v?</div>
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
                {primaryMembership ? formatRole(primaryMembership.role) : "Chua có quy?n"}
              </div>
            </div>
          </div>

          <div className="sidebar-actions">
            <button
              className="button ghost sidebar-button"
              disabled={dataLoading}
              onClick={() => void handleRefreshAccount()}
              type="button"
            >
              {dataLoading ? "Ðang t?i..." : "T?i l?i tài kho?n"}
            </button>
            <button
              className="button ghost sidebar-button"
              onClick={() => void handleSignOut()}
              type="button"
            >
              Ðang xu?t
            </button>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">v-Culture / Coaching VHDN / Supabase</div>
            <div className="topbar-title">
              {activePage === "dash" ? "Không gian làm vi?c" : activeModule?.title}
            </div>
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
            />
          ) : activeModule ? (
            <ModuleView
              memberships={memberships}
              module={activeModule}
              activeTab={activeTabs[activeModule.id] ?? 0}
              onTabChange={handleTabChange}
              profile={profile}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <div className="hero-eyebrow">C?n c?u hình Supabase</div>
        <h1 className="page-title">Thi?u bi?n môi tru?ng</h1>
        <p className="page-subtitle">
          Hãy thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` vào `.env` tru?c khi ki?m th? dang nh?p.
        </p>
        <div className="auth-meta-grid">
          <div className="mini-card">
            <h3>1. C?p nh?t `.env`</h3>
            <p>Ði?n `Project URL` và `anon key` c?a Supabase vào file `.env`.</p>
          </div>
          <div className="mini-card">
            <h3>2. Kh?i d?ng l?i Vite</h3>
            <p>Kh?i d?ng l?i dev server d? ?ng d?ng n?p c?u hình m?i.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <div className="hero-eyebrow">K?t n?i Supabase</div>
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
}: {
  authBusy: boolean;
  authError: string | null;
  authForm: AuthFormState;
  authMessage: string | null;
  authMode: AuthMode;
  onAuthFieldChange: (field: keyof AuthFormState, value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: AuthMode) => void;
}) {
  const isSignUp = authMode === "signUp";
  const canSubmit =
    authForm.email.trim().length > 0 &&
    authForm.password.trim().length >= 6 &&
    (!isSignUp || authForm.fullName.trim().length > 0);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <section className="auth-showcase">
          <div className="hero-eyebrow">Ðang nh?p h? th?ng</div>
          <h1 className="hero-title">Truy c?p không gian làm vi?c coaching</h1>
          <p className="hero-copy auth-copy">
            Ðang nh?p b?ng email và m?t kh?u d? t?i h? so ngu?i dùng và quy?n truy c?p t? Supabase.
          </p>

          <div className="auth-list">
            <div className="auth-list-item">H? th?ng dã k?t n?i Supabase Auth, h? so ngu?i dùng và membership th?c t?.</div>
            <div className="auth-list-item">N?u chua vào du?c, hãy ki?m tra l?i tài kho?n dã du?c t?o trong Supabase Authentication hay chua.</div>
            <div className="auth-list-item">Giao di?n dã du?c rút g?n d? t?p trung vào ph?n dang nh?p và d? li?u th?t.</div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="panel-eyebrow">Tài kho?n</div>
          <h2 className="panel-title">{isSignUp ? "T?o tài kho?n" : "Ðang nh?p"}</h2>
          <p className="page-subtitle">
            {isSignUp
              ? "T?o tài kho?n m?i d? liên k?t vào h? so ?ng d?ng ? l?n dang nh?p d?u tiên."
              : "Sau khi dang nh?p, h? th?ng s? t?i h? so và danh sách quy?n truy c?p c?a b?n."}
          </p>

          <div className="auth-switch">
            <button
              className={`switch-button ${authMode === "signIn" ? "is-active" : ""}`}
              onClick={() => onModeChange("signIn")}
              type="button"
            >
              Ðang nh?p
            </button>
            <button
              className={`switch-button ${authMode === "signUp" ? "is-active" : ""}`}
              onClick={() => onModeChange("signUp")}
              type="button"
            >
              T?o tài kho?n
            </button>
          </div>

          {authMessage ? <StatusBanner tone="success" text={authMessage} /> : null}
          {authError ? <StatusBanner tone="error" text={authError} /> : null}

          <form className="auth-form" onSubmit={onAuthSubmit}>
            {isSignUp ? (
              <div className="field-grid">
                <label className="field-label" htmlFor="full-name">
                  H? và tên
                </label>
                <input
                  className="field-input"
                  id="full-name"
                  onChange={(event) => onAuthFieldChange("fullName", event.target.value)}
                  placeholder="Ví d?: Ph?m Hoài Nam"
                  type="text"
                  value={authForm.fullName}
                />
              </div>
            ) : null}

            <div className="field-grid">
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className="field-input"
                id="email"
                onChange={(event) => onAuthFieldChange("email", event.target.value)}
                placeholder="ban@congty.com"
                type="email"
                value={authForm.email}
              />
            </div>

            <div className="field-grid">
              <label className="field-label" htmlFor="password">
                M?t kh?u
              </label>
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="field-input"
                id="password"
                minLength={6}
                onChange={(event) => onAuthFieldChange("password", event.target.value)}
                placeholder="T?i thi?u 6 ký t?"
                type="password"
                value={authForm.password}
              />
            </div>

            <button className="button primary full" disabled={!canSubmit || authBusy} type="submit">
              {authBusy
                ? "Ðang x? lý..."
                : isSignUp
                  ? "T?o tài kho?n"
                  : "Ðang nh?p"}
            </button>
          </form>

          <div className="auth-help">
            <strong>M?o x? lý nhanh:</strong> n?u v?a t?o tài kho?n mà chua dang nh?p du?c, hãy vào m?c Authentication / Users trong Supabase d? ki?m tra email dã du?c t?o chua và có yêu c?u xác nh?n email hay không.
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
}: {
  dataLoading: boolean;
  memberships: TenantMembership[];
  onRefresh: () => Promise<void>;
  profile: AppProfile | null;
  userEmail: string | null;
}) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="hero-eyebrow">T?ng quan tài kho?n</div>
          <h1 className="hero-title">Ðang nh?p thành công và dã k?t n?i d? li?u th?t</h1>
          <p className="hero-copy">
            H? th?ng dang d?c h? so ngu?i dùng và quy?n truy c?p tr?c ti?p t? Supabase d? làm n?n cho các màn hình nghi?p v? ti?p theo.
          </p>
        </div>

        <div className="hero-chips">
          <div className="hero-chip">
            <span className="hero-chip-value">{profile ? "Ðã có" : "Chua có"}</span>
            <span className="hero-chip-label">h? so</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.length}</span>
            <span className="hero-chip-label">quy?n truy c?p</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.some((item) => item.is_primary) ? "Có" : "Không"}</span>
            <span className="hero-chip-label">quy?n m?c d?nh</span>
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Thông tin hi?n t?i</div>
              <h2 className="panel-title">H? so và phân quy?n</h2>
            </div>
            <button className="button primary" onClick={() => void onRefresh()} type="button">
              {dataLoading ? "Ðang t?i..." : "T?i l?i"}
            </button>
          </div>

          <div className="account-grid">
            <div className="mini-card">
              <h3>{profile?.full_name ?? "Chua có h? so liên k?t"}</h3>
              <p>{profile?.email ?? userEmail ?? "Chua có email"}</p>
              <div className="small-note">
                {profile
                  ? "Tài kho?n dang nh?p dã du?c liên k?t v?i h? so ?ng d?ng."
                  : "N?u chua có h? so, h? th?ng s? t? t?o ho?c liên k?t khi t?i tài kho?n."}
              </div>
            </div>

            <div className="membership-list">
              {memberships.length > 0 ? (
                memberships.map((membership) => (
                  <div key={membership.id} className="membership-card">
                    <div className="membership-title">
                      {membership.tenant?.name ?? "Chua xác d?nh don v?"}
                    </div>
                    <div className="membership-meta">Vai trò: {formatRole(membership.role)}</div>
                    <div className="membership-meta">Tr?ng thái: {formatStatus(membership.status)}</div>
                    <div className="membership-meta">
                      B? ph?n: {membership.unit?.name ?? "Chua gán"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  Tài kho?n dã dang nh?p nhung chua có quy?n truy c?p workspace. Hãy ki?m tra l?i query bootstrap ho?c b?n ghi trong `app.tenant_memberships`.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">G?i ý ki?m tra</div>
              <h2 className="panel-title">Các bu?c nên ki?m tra ti?p</h2>
            </div>
          </div>

          <div className="checklist compact">
            <ChecklistItem text="Vào Supabase Authentication d? xác nh?n tài kho?n admin@vinabrain.com dã du?c t?o." />
            <ChecklistItem text="N?u b?t xác nh?n email, hãy xác nh?n email ho?c t?t email confirmation d? th? nhanh." />
            <ChecklistItem text="N?u dã dang nh?p du?c nhung chua th?y d? li?u, ki?m tra b?ng app.profiles và app.tenant_memberships." />
            <ChecklistItem text="Sau khi ?n dang nh?p, m?i ti?p t?c tri?n khai các màn hình nghi?p v?." />
          </div>

          <div className="note-box">
            Màn hình này dã du?c rút g?n d? uu tiên thông tin th?t thay vì n?i dung mô ph?ng.
          </div>
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
}: {
  memberships: TenantMembership[];
  module: ModuleConfig;
  activeTab: number;
  onTabChange: (moduleId: string, tabIndex: number) => void;
  profile: AppProfile | null;
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
        text={
          memberships.length > 0
            ? `${profile?.full_name ?? "Ngu?i dùng này"} hi?n có ${memberships.length} quy?n truy c?p. Có th? n?i d? li?u th?t cho module này khi s?n sàng.`
            : "Tài kho?n dã dang nh?p nhung chua có quy?n truy c?p tenant. Hãy seed membership tru?c khi n?i CRUD."
        }
      />

      <section className="feature-banner">
        <div className="feature-copy">
          <div className="feature-label">Tr?ng tâm tri?n khai</div>
          <div className="feature-title">{module.headline}</div>
        </div>
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
              <div className="panel-eyebrow">Ph?n dang xem</div>
              <h2 className="panel-title">{module.tabs?.[activeTab] ?? "T?ng quan"}</h2>
            </div>
            <button className="button primary" type="button">
              Tri?n khai ti?p
            </button>
          </div>

          <div className="section-copy">
            <h3>Ph?m vi phù h?p cho nhánh ti?p theo</h3>
            <p>
              M?i m?c du?i dây là m?t lát c?t h?p lý d? tri?n khai màn hình, form và workflow g?n tr?c ti?p v?i schema Supabase.
            </p>
          </div>

          <div className="bullet-grid">
            {visibleBullets.map((item) => (
              <div key={item} className="bullet-card">
                <div className="bullet-title">{item}</div>
                <div className="bullet-body">Ðây là h?ng m?c phù h?p d? làm ? bu?c ti?p theo.</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Luu ý k? thu?t</div>
              <h2 className="panel-title">Checklist tru?c khi làm sâu</h2>
            </div>
          </div>

          <div className="checklist">
            <ChecklistItem text="Xác d?nh b?ng Supabase nào là ngu?n d? li?u chính c?a module này." />
            <ChecklistItem text="Ch?t quy?n d?c và ghi cho admin, coach, guest coachee và executive viewer." />
            <ChecklistItem text="Quy?t d?nh ph?n nào d?c Supabase tr?c ti?p và ph?n nào di qua service layer." />
            <ChecklistItem text="Tách rõ tr?ng thái loading, empty, error và không d? quy?n ngay t? d?u." />
          </div>

          <div className="note-box">
            V?i n?n t?ng dang nh?p hi?n t?i, module nào cung có th? n?i d? li?u th?t ngay khi membership dã s?n sàng trong Supabase.
          </div>
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

function formatRole(role: string) {
  const dictionary: Record<string, string> = {
    system_admin: "Qu?n tr? h? th?ng",
    business_admin: "Qu?n tr? doanh nghi?p",
    coach: "Coach",
    coachee_internal: "Coachee n?i b?",
    coachee_guest: "Coachee khách",
    reviewer: "Ngu?i duy?t",
    executive_viewer: "Ngu?i xem di?u hành",
    lead_coach: "Coach chính",
    support_coach: "Coach h? tr?",
    coordinator: "Ði?u ph?i",
  };

  return dictionary[role] ?? role;
}

function formatStatus(status: string) {
  const dictionary: Record<string, string> = {
    active: "Ðang ho?t d?ng",
    invited: "Ðã m?i",
    suspended: "T?m khóa",
    pending: "Ðang ch?",
    draft: "Nháp",
    completed: "Hoàn thành",
  };

  return dictionary[status] ?? status;
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

function normalizeSupabaseError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return fallback;
  }

  const message = String(error.message ?? fallback).trim();
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Email ho?c m?t kh?u chua dúng. N?u b?n v?a t?o tài kho?n, hãy ki?m tra l?i trong Supabase Authentication > Users ho?c th? t?o tài kho?n l?i.";
  }

  if (lower.includes("email not confirmed")) {
    return "Tài kho?n chua du?c xác nh?n email. Hãy ki?m tra h?p thu ho?c t?t email confirmation trong Supabase d? th? nhanh.";
  }

  if (
    lower.includes("schema must be one of the following") ||
    lower.includes("exposed schemas") ||
    lower.includes("not in the schema cache") ||
    lower.includes("ensure_my_profile") ||
    lower.includes("list_my_memberships")
  ) {
    return "Supabase dang thi?u ph?n SQL truy c?p tài kho?n. Hãy ki?m tra l?i migrations 202603300002 và 202603300003.";
  }

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "Supabase dang ch?n quy?n d?c h? so ho?c membership. Hãy ki?m tra grants, functions và RLS policies.";
  }

  if (lower.includes("duplicate key value violates unique constraint")) {
    return "H? so cho email này dã t?n t?i. Hãy th? dang nh?p l?i ho?c ki?m tra d? li?u trong app.profiles.";
  }

  return message;
}

export default App;

