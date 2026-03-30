import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  dashboardCards,
  dashboardMetrics,
  dashboardTimeline,
  moduleConfigs,
  navigation,
  type Metric,
  type ModuleConfig,
} from "./data";
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
          normalizeSupabaseError(error, "Could not check the current Supabase session."),
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
            ? "Account created and signed in. The app is syncing your profile now."
            : "Account created. If email confirmation is enabled, confirm the email first and then sign in.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });

        if (error) {
          throw error;
        }

        setAuthMessage("Sign in succeeded. Loading profile and tenant memberships...");
      }
    } catch (error) {
      setAuthError(normalizeSupabaseError(error, "Could not complete sign in or sign up."));
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
      setDataError(
        normalizeSupabaseError(error, "Could not load account context from Supabase."),
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
    "Signed in user";

  const currentDate = new Intl.DateTimeFormat("en-GB").format(new Date());

  const topbarStatus = dataError
    ? dataError
    : dataLoading
      ? "Loading profile and tenant memberships from Supabase..."
      : primaryMembership?.tenant
        ? `${primaryMembership.tenant.name} | ${formatRole(primaryMembership.role)}`
        : `${session?.user.email ?? "User"} | no tenant membership yet`;

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (sessionLoading) {
    return (
      <LoadingScreen
        title="Checking the current Supabase session"
        copy="The app is restoring the browser session before it decides whether to show the dashboard or the auth form."
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
              <div className="brand-sub">AUTH, PROFILE, TENANT MEMBERSHIP</div>
            </div>
          </div>
          <div className="brand-tag">Supabase session in production shape</div>
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
            <div className="user-avatar">{getInitials(userDisplayName)}</div>
            <div>
              <div className="user-name">{userDisplayName}</div>
              <div className="user-role">
                {primaryMembership ? formatRole(primaryMembership.role) : "No membership"}
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
              {dataLoading ? "Refreshing..." : "Refresh account"}
            </button>
            <button
              className="button ghost sidebar-button"
              onClick={() => void handleSignOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">v-Culture / Coaching VHDN / Supabase Auth</div>
            <div className="topbar-title">
              {activePage === "dash" ? "Authenticated Coaching Workspace" : activeModule?.title}
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
        <div className="hero-eyebrow">Supabase Setup Required</div>
        <h1 className="page-title">Missing Supabase environment variables</h1>
        <p className="page-subtitle">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` before testing
          the live auth flow.
        </p>
        <div className="auth-meta-grid">
          <div className="mini-card">
            <h3>1. Update .env</h3>
            <p>Paste the project URL and anon key into your local `.env` file.</p>
          </div>
          <div className="mini-card">
            <h3>2. Restart Vite</h3>
            <p>Restart the dev server so the new env values are loaded into the app.</p>
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
        <div className="hero-eyebrow">Live Supabase Flow</div>
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
          <div className="hero-eyebrow">Supabase Auth Live</div>
          <h1 className="hero-title">Sign in to the coaching workspace with a real session</h1>
          <p className="hero-copy auth-copy">
            This flow uses `Supabase Auth`, then loads account context through public RPC
            functions backed by the private `app` schema. That keeps the app ready for
            Vercel while still protecting domain tables.
          </p>

          <div className="auth-badges">
            <span className="auth-badge">Email + password</span>
            <span className="auth-badge">Auto profile sync</span>
            <span className="auth-badge">Tenant membership aware</span>
          </div>

          <div className="auth-list">
            <div className="auth-list-item">Apply migrations `202603300001`, `202603300002`, and `202603300003`.</div>
            <div className="auth-list-item">Keep `app` private. The frontend now reads account data through `public` RPC.</div>
            <div className="auth-list-item">Enable email signup in Supabase Auth settings.</div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="panel-eyebrow">Access</div>
          <h2 className="panel-title">{isSignUp ? "Create account" : "Sign in"}</h2>
          <p className="page-subtitle">
            {isSignUp
              ? "A new user is linked to app.profiles during the first authenticated load."
              : "After sign in, the app fetches your profile and tenant memberships from Supabase."}
          </p>

          <div className="auth-switch">
            <button
              className={`switch-button ${authMode === "signIn" ? "is-active" : ""}`}
              onClick={() => onModeChange("signIn")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`switch-button ${authMode === "signUp" ? "is-active" : ""}`}
              onClick={() => onModeChange("signUp")}
              type="button"
            >
              Create account
            </button>
          </div>

          {authMessage ? <StatusBanner tone="success" text={authMessage} /> : null}
          {authError ? <StatusBanner tone="error" text={authError} /> : null}

          <form className="auth-form" onSubmit={onAuthSubmit}>
            {isSignUp ? (
              <div className="field-grid">
                <label className="field-label" htmlFor="full-name">
                  Full name
                </label>
                <input
                  className="field-input"
                  id="full-name"
                  onChange={(event) => onAuthFieldChange("fullName", event.target.value)}
                  placeholder="Example: Pham Hoai Nam"
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
                placeholder="you@company.com"
                type="email"
                value={authForm.email}
              />
            </div>

            <div className="field-grid">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="field-input"
                id="password"
                minLength={6}
                onChange={(event) => onAuthFieldChange("password", event.target.value)}
                placeholder="At least 6 characters"
                type="password"
                value={authForm.password}
              />
            </div>

            <button className="button primary full" disabled={!canSubmit || authBusy} type="submit">
              {authBusy
                ? "Working..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="auth-meta-grid">
            <div className="mini-card">
              <h3>Private schema</h3>
              <p>The frontend no longer needs direct `app` schema access to read account context.</p>
            </div>
            <div className="mini-card">
              <h3>Guest ready</h3>
              <p>The same profile and membership model still works when a coachee is an external guest.</p>
            </div>
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
          <div className="hero-eyebrow">Authenticated Workspace</div>
          <h1 className="hero-title">Supabase auth is live and the account context is real</h1>
          <p className="hero-copy">
            This repo is no longer a static mock shell. The app now restores a real session,
            links the authenticated user to `app.profiles`, and loads tenant memberships that
            will drive module-level permissions in the next phase.
          </p>
        </div>

        <div className="hero-chips">
          <div className="hero-chip">
            <span className="hero-chip-value">{profile ? "Linked" : "Pending"}</span>
            <span className="hero-chip-label">profile sync</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.length}</span>
            <span className="hero-chip-label">tenant memberships</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-value">{memberships.some((item) => item.is_primary) ? "Yes" : "No"}</span>
            <span className="hero-chip-label">primary membership</span>
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
              <div className="panel-eyebrow">Account Context</div>
              <h2 className="panel-title">Current profile and memberships</h2>
            </div>
            <button className="button primary" onClick={() => void onRefresh()} type="button">
              {dataLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="account-grid">
            <div className="mini-card">
              <h3>{profile?.full_name ?? "Profile not linked yet"}</h3>
              <p>{profile?.email ?? userEmail ?? "No email available"}</p>
              <div className="small-note">
                {profile
                  ? "The authenticated user is linked to an application profile."
                  : "If the profile does not exist yet, the app will try to create or link it during account loading."}
              </div>
            </div>

            <div className="membership-list">
              {memberships.length > 0 ? (
                memberships.map((membership) => (
                  <div key={membership.id} className="membership-card">
                    <div className="membership-title">
                      {membership.tenant?.name ?? "Unknown tenant"}
                    </div>
                    <div className="membership-meta">Role: {formatRole(membership.role)}</div>
                    <div className="membership-meta">Status: {membership.status}</div>
                    <div className="membership-meta">
                      Unit: {membership.unit?.name ?? "Not assigned"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  The user is authenticated but still has no tenant membership. Seed
                  `app.tenants`, optional `app.units`, and `app.tenant_memberships` so this
                  account can open a tenant-scoped workspace.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Delivery Roadmap</div>
              <h2 className="panel-title">The next build slice after auth</h2>
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
            With auth, profile, and membership in place, the most efficient next step is
            `Catalog & Template`. That becomes the source of truth for programs, sessions,
            outputs, and action plans.
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">Build Direction</div>
            <h2 className="panel-title">Assumptions already locked for the MVP</h2>
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
            ? `${profile?.full_name ?? "This user"} currently has ${memberships.length} tenant memberships. This module is ready for real CRUD once we wire the data layer.`
            : "This user is signed in but has no tenant membership yet. Seed a membership before wiring tenant-scoped CRUD."
        }
      />

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
            <h3>Recommended scope for the next implementation branch</h3>
            <p>
              Each area below is a good candidate for one focused CRUD and workflow slice.
              That lets us keep the next sprint tight while still mapping directly to the
              Supabase schema.
            </p>
          </div>

          <div className="bullet-grid">
            {visibleBullets.map((item) => (
              <div key={item} className="bullet-card">
                <div className="bullet-title">{item}</div>
                <div className="bullet-body">
                  This is a strong candidate for the next screen, table, form, or workflow
                  service.
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">Engineering Notes</div>
              <h2 className="panel-title">Checklist before deep module work</h2>
            </div>
          </div>

          <div className="checklist">
            <ChecklistItem text="Confirm which Supabase table is the source of truth for this module." />
            <ChecklistItem text="Lock read and write permissions for admin, coach, guest coachee, and executive viewer." />
            <ChecklistItem text="Decide which components read Supabase directly and which ones should go through a service layer." />
            <ChecklistItem text="Separate loading, empty, error, and permission-denied states from day one." />
          </div>

          <div className="note-box">
            With the current auth base, any module can be wired to real data as soon as the
            tenant membership seed data exists in Supabase.
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
  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
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
    return "Email or password is incorrect.";
  }

  if (lower.includes("email not confirmed")) {
    return "This account is not confirmed yet. Check the inbox if email confirmation is enabled.";
  }

  if (
    lower.includes("schema must be one of the following") ||
    lower.includes("exposed schemas") ||
    lower.includes("not in the schema cache") ||
    lower.includes("ensure_my_profile") ||
    lower.includes("list_my_memberships")
  ) {
    return "Supabase is missing the account access SQL. Apply migrations 202603300002 and 202603300003.";
  }

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "Supabase denied access to profile or membership data. Check grants, functions, and RLS policies.";
  }

  if (lower.includes("duplicate key value violates unique constraint")) {
    return "The profile already exists for this email. Re-run the auth migrations and sign in again.";
  }

  return message;
}

export default App;