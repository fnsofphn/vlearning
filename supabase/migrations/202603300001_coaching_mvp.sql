create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;

create type app.membership_role as enum (
  'system_admin',
  'business_admin',
  'coach',
  'coachee_internal',
  'coachee_guest',
  'reviewer',
  'executive_viewer'
);

create type app.assignment_role as enum (
  'lead_coach',
  'support_coach',
  'reviewer',
  'coordinator'
);

create type app.session_status as enum (
  'planned',
  'prework_sent',
  'prework_completed',
  'in_progress',
  'completed',
  'follow_up_required',
  'postponed',
  'cancelled'
);

create type app.output_status as enum (
  'not_started',
  'draft',
  'in_review',
  'revision_requested',
  'approved',
  'shared',
  'completed',
  'archived'
);

create type app.action_plan_status as enum (
  'not_started',
  'in_progress',
  'blocked',
  'completed',
  'cancelled'
);

create type app.question_type as enum (
  'pre_read',
  'self_assessment',
  'reflection',
  'information_prep',
  'baseline_survey',
  'live_session'
);

create type app.delivery_mode as enum (
  'online',
  'offline',
  'hybrid'
);

create type app.program_status as enum (
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
);

create type app.measurement_framework_type as enum (
  'culture_index',
  'integration_metrics',
  'strategic_alignment'
);

create table if not exists app.tenants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  parent_unit_id uuid references app.units(id) on delete set null,
  code text not null,
  name text not null,
  unit_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email citext not null unique,
  full_name text not null,
  avatar_url text,
  job_title text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  profile_id uuid not null references app.profiles(id) on delete cascade,
  unit_id uuid references app.units(id) on delete set null,
  role app.membership_role not null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, profile_id, role)
);

create table if not exists app.guest_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  email citext not null,
  full_name text,
  invited_by_profile_id uuid references app.profiles(id) on delete set null,
  role app.membership_role not null default 'coachee_guest',
  target_program_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email, role)
);

create table if not exists app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references app.tenants(id) on delete cascade,
  actor_profile_id uuid references app.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app.coaching_audiences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.coaching_service_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  business_goal text,
  typical_outputs text,
  supported_methods text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  is_system_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.module_audience_objectives (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid not null references app.coaching_service_modules(id) on delete cascade,
  audience_id uuid not null references app.coaching_audiences(id) on delete cascade,
  objective_text text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists app.coaching_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  philosophy text,
  suitable_for text,
  guide_url text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.method_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  method_id uuid not null references app.coaching_methods(id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null,
  description text,
  coach_guidance text,
  prompt_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (method_id, code),
  unique (method_id, sort_order)
);

create table if not exists app.process_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid not null references app.coaching_service_modules(id) on delete cascade,
  audience_id uuid references app.coaching_audiences(id) on delete set null,
  method_id uuid references app.coaching_methods(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  default_session_count integer,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.process_template_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  process_template_id uuid not null references app.process_templates(id) on delete cascade,
  version_no integer not null,
  is_default boolean not null default false,
  notes text,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (process_template_id, version_no)
);

create table if not exists app.process_template_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  template_version_id uuid not null references app.process_template_versions(id) on delete cascade,
  session_number integer not null,
  title text not null,
  objective text,
  topic_hint text,
  expected_output_hint text,
  questionnaire_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (template_version_id, session_number)
);

create table if not exists app.process_template_session_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  template_session_id uuid not null references app.process_template_sessions(id) on delete cascade,
  method_step_id uuid references app.method_steps(id) on delete set null,
  step_name text not null,
  sort_order integer not null,
  description text,
  coach_guidance text,
  created_at timestamptz not null default now(),
  unique (template_session_id, sort_order)
);

create table if not exists app.questionnaire_catalogs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid references app.coaching_service_modules(id) on delete set null,
  audience_id uuid references app.coaching_audiences(id) on delete set null,
  method_id uuid references app.coaching_methods(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  questionnaire_catalog_id uuid not null references app.questionnaire_catalogs(id) on delete cascade,
  question_type app.question_type not null,
  prompt text not null,
  help_text text,
  is_required boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (questionnaire_catalog_id, sort_order)
);

create table if not exists app.coaching_topics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid not null references app.coaching_service_modules(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  objective text,
  default_output_summary text,
  related_document_template text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.output_catalogs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid not null references app.coaching_service_modules(id) on delete cascade,
  topic_id uuid references app.coaching_topics(id) on delete set null,
  code text not null,
  name text not null,
  output_type text,
  description text,
  template_reference text,
  reviewer_role app.membership_role,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.output_completion_criteria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  output_catalog_id uuid not null references app.output_catalogs(id) on delete cascade,
  criterion_text text not null,
  sort_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (output_catalog_id, sort_order)
);

create table if not exists app.artifact_catalogs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid references app.coaching_service_modules(id) on delete set null,
  topic_id uuid references app.coaching_topics(id) on delete set null,
  code text not null,
  name text not null,
  artifact_type text,
  description text,
  storage_path text,
  external_url text,
  is_bundle boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.artifact_bundle_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  parent_artifact_id uuid not null references app.artifact_catalogs(id) on delete cascade,
  child_artifact_id uuid not null references app.artifact_catalogs(id) on delete cascade,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (parent_artifact_id, child_artifact_id)
);

create table if not exists app.coaching_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  module_id uuid not null references app.coaching_service_modules(id) on delete restrict,
  process_template_version_id uuid references app.process_template_versions(id) on delete set null,
  code text not null,
  name text not null,
  customer_name text not null,
  objective text,
  audience_summary text,
  starts_on date,
  ends_on date,
  status app.program_status not null default 'draft',
  is_confidential boolean not null default false,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

alter table app.guest_invitations
  add constraint guest_invitations_target_program_fk
  foreign key (target_program_id) references app.coaching_programs(id) on delete set null;

create table if not exists app.coaching_cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  scope_unit_id uuid references app.units(id) on delete set null,
  starts_on date,
  ends_on date,
  status app.program_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, code)
);

create table if not exists app.program_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete cascade,
  profile_id uuid not null references app.profiles(id) on delete cascade,
  role app.assignment_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (program_id, cohort_id, profile_id, role)
);

create table if not exists app.coachees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete set null,
  profile_id uuid references app.profiles(id) on delete set null,
  invited_email citext,
  full_name text not null,
  job_title text,
  unit_id uuid references app.units(id) on delete set null,
  audience_id uuid references app.coaching_audiences(id) on delete set null,
  is_guest boolean not null default false,
  is_confidential boolean not null default false,
  process_template_version_id uuid references app.process_template_versions(id) on delete set null,
  method_id uuid references app.coaching_methods(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.coachee_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  coachee_id uuid not null references app.coachees(id) on delete cascade,
  source_type text not null check (source_type in ('module_standard', 'program_specific', 'coach_added')),
  goal_text text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists app.coachee_topic_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  coachee_id uuid not null references app.coachees(id) on delete cascade,
  topic_id uuid not null references app.coaching_topics(id) on delete cascade,
  assigned_scope text not null default 'individual' check (assigned_scope in ('individual', 'cohort', 'unit')),
  assigned_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (coachee_id, topic_id)
);

create table if not exists app.coaching_journeys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  coachee_id uuid not null references app.coachees(id) on delete cascade,
  process_template_version_id uuid not null references app.process_template_versions(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (coachee_id, process_template_version_id)
);

create table if not exists app.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  journey_id uuid references app.coaching_journeys(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete set null,
  coachee_id uuid not null references app.coachees(id) on delete cascade,
  topic_id uuid references app.coaching_topics(id) on delete set null,
  session_number integer not null,
  title text not null,
  objective text,
  scheduled_at timestamptz,
  duration_minutes integer,
  delivery_mode app.delivery_mode,
  location text,
  meeting_url text,
  prework_due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status app.session_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, session_number)
);

create table if not exists app.session_questionnaires (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  session_id uuid not null references app.coaching_sessions(id) on delete cascade,
  questionnaire_catalog_id uuid not null references app.questionnaire_catalogs(id) on delete restrict,
  due_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, questionnaire_catalog_id)
);

create table if not exists app.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  session_questionnaire_id uuid not null references app.session_questionnaires(id) on delete cascade,
  question_id uuid not null references app.questionnaire_questions(id) on delete cascade,
  responder_coachee_id uuid not null references app.coachees(id) on delete cascade,
  response_text text,
  response_json jsonb,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_questionnaire_id, question_id, responder_coachee_id)
);

create table if not exists app.session_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  session_id uuid not null unique references app.coaching_sessions(id) on delete cascade,
  notes_template_name text,
  summary text,
  key_findings text,
  follow_up_text text,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  updated_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.session_step_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  session_id uuid not null references app.coaching_sessions(id) on delete cascade,
  step_name text not null,
  sort_order integer not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, sort_order)
);

create table if not exists app.output_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete set null,
  coachee_id uuid references app.coachees(id) on delete cascade,
  session_id uuid references app.coaching_sessions(id) on delete set null,
  topic_id uuid references app.coaching_topics(id) on delete set null,
  output_catalog_id uuid not null references app.output_catalogs(id) on delete restrict,
  title text not null,
  description text,
  owner_profile_id uuid references app.profiles(id) on delete set null,
  owner_coachee_id uuid references app.coachees(id) on delete set null,
  due_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  shared_at timestamptz,
  completed_at timestamptz,
  status app.output_status not null default 'not_started',
  is_confidential boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.output_instance_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  output_instance_id uuid not null references app.output_instances(id) on delete cascade,
  version_number integer not null,
  file_name text,
  storage_path text,
  external_url text,
  note text,
  uploaded_by_profile_id uuid references app.profiles(id) on delete set null,
  uploaded_by_coachee_id uuid references app.coachees(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (output_instance_id, version_number)
);

create table if not exists app.output_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  output_instance_id uuid not null references app.output_instances(id) on delete cascade,
  reviewer_profile_id uuid references app.profiles(id) on delete set null,
  review_status text not null check (review_status in ('commented', 'revision_requested', 'approved')),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists app.output_criteria_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  output_instance_id uuid not null references app.output_instances(id) on delete cascade,
  criterion_id uuid not null references app.output_completion_criteria(id) on delete cascade,
  checked_by_profile_id uuid references app.profiles(id) on delete set null,
  checked_at timestamptz,
  is_met boolean not null default false,
  note text,
  unique (output_instance_id, criterion_id)
);

create table if not exists app.action_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid not null references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete set null,
  coachee_id uuid not null references app.coachees(id) on delete cascade,
  session_id uuid references app.coaching_sessions(id) on delete set null,
  topic_id uuid references app.coaching_topics(id) on delete set null,
  output_instance_id uuid references app.output_instances(id) on delete set null,
  title text not null,
  description text,
  owner_profile_id uuid references app.profiles(id) on delete set null,
  owner_coachee_id uuid references app.coachees(id) on delete set null,
  due_at timestamptz,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  completion_percent numeric(5,2) not null default 0,
  blocked_reason text,
  status app.action_plan_status not null default 'not_started',
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.action_plan_updates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  action_plan_id uuid not null references app.action_plans(id) on delete cascade,
  progress_note text,
  completion_percent numeric(5,2),
  evidence_text text,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_by_coachee_id uuid references app.coachees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists app.artifact_shares (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  artifact_id uuid not null references app.artifact_catalogs(id) on delete cascade,
  program_id uuid references app.coaching_programs(id) on delete cascade,
  cohort_id uuid references app.coaching_cohorts(id) on delete cascade,
  coachee_id uuid references app.coachees(id) on delete cascade,
  granted_by_profile_id uuid references app.profiles(id) on delete set null,
  can_view boolean not null default true,
  can_download boolean not null default false,
  can_comment boolean not null default false,
  online_only boolean not null default false,
  note text,
  shared_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists app.artifact_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  artifact_share_id uuid not null references app.artifact_shares(id) on delete cascade,
  profile_id uuid references app.profiles(id) on delete set null,
  coachee_id uuid references app.coachees(id) on delete set null,
  event_type text not null check (event_type in ('viewed', 'downloaded', 'acknowledged', 'commented')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app.measurement_frameworks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  program_id uuid references app.coaching_programs(id) on delete cascade,
  module_id uuid references app.coaching_service_modules(id) on delete cascade,
  framework_type app.measurement_framework_type not null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.measurement_indicators (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  framework_id uuid not null references app.measurement_frameworks(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  data_source text,
  measurement_period text,
  target_value text,
  maturity_level text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, code)
);

create index if not exists idx_units_tenant_id on app.units(tenant_id);
create index if not exists idx_memberships_tenant_id on app.tenant_memberships(tenant_id);
create index if not exists idx_memberships_profile_id on app.tenant_memberships(profile_id);
create index if not exists idx_service_modules_tenant_id on app.coaching_service_modules(tenant_id);
create index if not exists idx_methods_tenant_id on app.coaching_methods(tenant_id);
create index if not exists idx_process_templates_tenant_id on app.process_templates(tenant_id);
create index if not exists idx_questionnaires_tenant_id on app.questionnaire_catalogs(tenant_id);
create index if not exists idx_topics_tenant_id on app.coaching_topics(tenant_id);
create index if not exists idx_output_catalogs_tenant_id on app.output_catalogs(tenant_id);
create index if not exists idx_artifact_catalogs_tenant_id on app.artifact_catalogs(tenant_id);
create index if not exists idx_programs_tenant_id on app.coaching_programs(tenant_id);
create index if not exists idx_cohorts_program_id on app.coaching_cohorts(program_id);
create index if not exists idx_coachees_program_id on app.coachees(program_id);
create index if not exists idx_sessions_coachee_id on app.coaching_sessions(coachee_id);
create index if not exists idx_output_instances_coachee_id on app.output_instances(coachee_id);
create index if not exists idx_action_plans_coachee_id on app.action_plans(coachee_id);
create index if not exists idx_artifact_shares_coachee_id on app.artifact_shares(coachee_id);
create index if not exists idx_measurement_frameworks_tenant_id on app.measurement_frameworks(tenant_id);

create or replace function app.current_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from app.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function app.user_is_member(target_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from app.tenant_memberships m
    join app.profiles p on p.id = m.profile_id
    where m.tenant_id = target_tenant
      and m.status = 'active'
      and p.auth_user_id = auth.uid()
  );
$$;

create or replace function app.user_has_roles(target_tenant uuid, allowed_roles app.membership_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from app.tenant_memberships m
    join app.profiles p on p.id = m.profile_id
    where m.tenant_id = target_tenant
      and m.status = 'active'
      and m.role = any(allowed_roles)
      and p.auth_user_id = auth.uid()
  );
$$;

comment on schema app is 'Application schema for the v-Culture Coaching VHDN MVP.';
comment on table app.coaching_service_modules is 'Catalog of coaching service modules such as leadership, transformation governance, and operational integration.';
comment on table app.process_template_versions is 'Versioned process templates used to generate real coaching journeys.';
comment on table app.output_instances is 'Runtime outputs that a coach/coachee needs to deliver and move through lifecycle states.';
comment on table app.artifact_shares is 'Access records for coaching artifacts shared with a coachee, cohort, or program.';
comment on table app.measurement_frameworks is 'Generic structure for culture index, integration metrics, and strategic alignment frameworks.';

insert into storage.buckets (id, name, public)
values ('coaching-assets', 'coaching-assets', false)
on conflict (id) do nothing;

-- RLS is intentionally deferred to the next implementation pass.
-- The helper functions above are the basis for tenant-scoped policies once auth flows are wired.
