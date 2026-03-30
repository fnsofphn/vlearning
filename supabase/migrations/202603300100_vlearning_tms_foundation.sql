-- Sprint 0 foundation for V-Learning TMS SRS v4
-- Course-centric domain model. This migration intentionally does not extend
-- the legacy coaching tables, and instead introduces a new TMS core.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;

create type app.contract_status as enum (
  'draft',
  'pending_signature',
  'active',
  'completed',
  'cancelled',
  'expired'
);

create type app.course_status as enum (
  'draft',
  'preparing',
  'active',
  'paused',
  'completed',
  'cancelled',
  'archived'
);

create type app.training_format as enum (
  'executive_coaching',
  'leadership_development',
  'skill_training',
  'hospitality',
  'digital_transformation',
  'custom'
);

create type app.topic_type as enum (
  'coaching_1_1',
  'group_workshop',
  'elearning_only',
  'blended_learning',
  'classroom',
  'custom'
);

create type app.delivery_mode as enum (
  'online',
  'offline',
  'hybrid'
);

create type app.class_status as enum (
  'planned',
  'ready',
  'in_progress',
  'completed',
  'cancelled'
);

create type app.session_status_v2 as enum (
  'planned',
  'ready',
  'in_progress',
  'completed',
  'postponed',
  'cancelled'
);

create type app.instructor_type as enum (
  'internal',
  'freelance',
  'guest'
);

create type app.assignment_scope as enum (
  'course',
  'class',
  'session'
);

create type app.assignment_role_v2 as enum (
  'lead_instructor',
  'backup_instructor',
  'program_director',
  'operations_admin',
  'content_designer',
  'it_support'
);

create type app.content_request_type as enum (
  'elearning',
  'teaching_video',
  'case_study_video',
  'gamification',
  'slide',
  'infographic',
  'workbook',
  'other'
);

create type app.content_request_status as enum (
  'requested',
  'briefing',
  'producing',
  'review',
  'uploading',
  'completed',
  'blocked',
  'cancelled'
);

create type app.lesson_plan_status as enum (
  'draft',
  'reviewing',
  'approved',
  'published',
  'archived'
);

create type app.readiness_status as enum (
  'not_started',
  'collecting',
  'ready',
  'blocked'
);

create table if not exists app.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  short_name text,
  industry text,
  tax_code text,
  website text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid not null references app.customers(id) on delete cascade,
  full_name text not null,
  title text,
  email citext,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid not null references app.customers(id) on delete restrict,
  code text not null,
  name text not null,
  signed_on date,
  starts_on date,
  ends_on date,
  total_value numeric(18,2),
  currency text not null default 'VND',
  status app.contract_status not null default 'draft',
  summary text,
  notes text,
  owner_profile_id uuid references app.profiles(id) on delete set null,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.contract_acceptance_checklists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  contract_id uuid not null references app.contracts(id) on delete cascade,
  item_name text not null,
  item_group text,
  is_required boolean not null default true,
  is_done boolean not null default false,
  due_on date,
  owner_profile_id uuid references app.profiles(id) on delete set null,
  notes text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.course_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  training_format app.training_format not null default 'custom',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.competency_frameworks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  framework_model text,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.competencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  framework_id uuid not null references app.competency_frameworks(id) on delete cascade,
  code text not null,
  name text not null,
  group_name text,
  level_scale text,
  description text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, code)
);
create table if not exists app.courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid not null references app.customers(id) on delete restrict,
  contract_id uuid references app.contracts(id) on delete set null,
  course_type_id uuid references app.course_types(id) on delete set null,
  competency_framework_id uuid references app.competency_frameworks(id) on delete set null,
  code text not null,
  name text not null,
  topic_type app.topic_type not null default 'custom',
  training_format app.training_format not null default 'custom',
  start_date date,
  end_date date,
  status app.course_status not null default 'draft',
  objective text,
  description text,
  budget_amount numeric(18,2),
  total_topics integer,
  sessions_per_topic integer,
  minutes_per_session integer,
  total_sprints integer,
  elearning_module_count integer,
  requested_asset_mix jsonb not null default '{}'::jsonb,
  is_confidential boolean not null default false,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.course_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  method_name text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists app.course_competencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  competency_id uuid not null references app.competencies(id) on delete cascade,
  priority text not null default 'primary' check (priority in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  unique (course_id, competency_id)
);

create table if not exists app.course_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists app.course_timeline_milestones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  milestone_code text not null,
  milestone_name text not null,
  target_date date,
  actual_date date,
  status text not null default 'pending' check (status in ('pending', 'on_track', 'at_risk', 'done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, milestone_code)
);

create table if not exists app.course_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  area_name text not null,
  readiness_status app.readiness_status not null default 'not_started',
  owner_profile_id uuid references app.profiles(id) on delete set null,
  due_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.course_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  code text not null,
  name text not null,
  delivery_mode app.delivery_mode not null default 'offline',
  start_date date,
  end_date date,
  location text,
  status app.class_status not null default 'planned',
  expected_learners integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, code)
);

create table if not exists app.learners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid references app.customers(id) on delete set null,
  full_name text not null,
  email citext,
  phone text,
  title text,
  department text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.class_learners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  class_id uuid not null references app.course_classes(id) on delete cascade,
  learner_id uuid not null references app.learners(id) on delete cascade,
  enrollment_status text not null default 'enrolled' check (enrollment_status in ('enrolled', 'waitlisted', 'cancelled', 'completed')),
  pre_assessment_score numeric(8,2),
  post_assessment_score numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, learner_id)
);

create table if not exists app.course_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  class_id uuid references app.course_classes(id) on delete cascade,
  topic_code text,
  topic_name text,
  session_number integer not null default 1,
  title text not null,
  objective text,
  scheduled_at timestamptz,
  duration_minutes integer,
  delivery_mode app.delivery_mode not null default 'offline',
  status app.session_status_v2 not null default 'planned',
  lesson_plan_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.attendance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  session_id uuid not null references app.course_sessions(id) on delete cascade,
  learner_id uuid not null references app.learners(id) on delete cascade,
  attendance_status text not null default 'present' check (attendance_status in ('present', 'late', 'absent', 'excused')),
  checked_in_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, learner_id)
);
create table if not exists app.instructors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  profile_id uuid references app.profiles(id) on delete set null,
  code text not null,
  full_name text not null,
  instructor_type app.instructor_type not null default 'internal',
  email citext,
  phone text,
  headline text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists app.instructor_certificates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  instructor_id uuid not null references app.instructors(id) on delete cascade,
  certificate_name text not null,
  issuer text,
  issued_on date,
  expires_on date,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.instructor_specialties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  instructor_id uuid not null references app.instructors(id) on delete cascade,
  specialty_name text not null,
  level text,
  created_at timestamptz not null default now(),
  unique (instructor_id, specialty_name)
);

create table if not exists app.instructor_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  instructor_id uuid not null references app.instructors(id) on delete cascade,
  course_id uuid references app.courses(id) on delete set null,
  quality_score numeric(5,2),
  review_note text,
  reviewed_by_profile_id uuid references app.profiles(id) on delete set null,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.instructor_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  instructor_id uuid not null references app.instructors(id) on delete cascade,
  course_id uuid references app.courses(id) on delete cascade,
  readiness_status app.readiness_status not null default 'not_started',
  elearning_completed boolean not null default false,
  sample_delivery_completed boolean not null default false,
  notes text,
  updated_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instructor_id, course_id)
);

create table if not exists app.instructor_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  instructor_id uuid references app.instructors(id) on delete set null,
  profile_id uuid references app.profiles(id) on delete set null,
  course_id uuid references app.courses(id) on delete cascade,
  class_id uuid references app.course_classes(id) on delete cascade,
  session_id uuid references app.course_sessions(id) on delete cascade,
  scope app.assignment_scope not null default 'course',
  role app.assignment_role_v2 not null,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_assignment_target_check check (
    (scope = 'course' and course_id is not null and class_id is null and session_id is null) or
    (scope = 'class' and class_id is not null and session_id is null) or
    (scope = 'session' and session_id is not null)
  )
);

create table if not exists app.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  class_id uuid references app.course_classes(id) on delete set null,
  topic_code text,
  topic_name text not null,
  session_number integer,
  version_no integer not null default 1,
  status app.lesson_plan_status not null default 'draft',
  objective text,
  teaching_outline text,
  activity_flow jsonb not null default '[]'::jsonb,
  trainer_notes text,
  reviewer_profile_id uuid references app.profiles(id) on delete set null,
  published_at timestamptz,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.lesson_plan_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  lesson_plan_id uuid not null references app.lesson_plans(id) on delete cascade,
  instructor_id uuid references app.instructors(id) on delete set null,
  feedback_type text not null default 'post_delivery' check (feedback_type in ('review', 'post_delivery', 'improvement')),
  content text not null,
  created_at timestamptz not null default now()
);
create table if not exists app.content_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  class_id uuid references app.course_classes(id) on delete set null,
  requested_by_profile_id uuid references app.profiles(id) on delete set null,
  request_code text not null,
  title text not null,
  request_type app.content_request_type not null,
  status app.content_request_status not null default 'requested',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  brief text,
  due_date date,
  owner_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, request_code)
);

create table if not exists app.content_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  content_request_id uuid not null references app.content_requests(id) on delete cascade,
  step_code text not null,
  step_name text not null,
  step_status text not null default 'pending' check (step_status in ('pending', 'in_progress', 'done', 'blocked')),
  owner_profile_id uuid references app.profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  notes text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_request_id, step_code)
);

create table if not exists app.content_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid references app.courses(id) on delete set null,
  content_request_id uuid references app.content_requests(id) on delete set null,
  asset_code text,
  asset_name text not null,
  asset_type app.content_request_type not null,
  storage_url text,
  preview_url text,
  version_label text,
  usage_status text not null default 'active' check (usage_status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references app.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.content_reuse_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.content_assets(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  note text,
  reused_at timestamptz not null default now(),
  unique (asset_id, course_id)
);

create table if not exists app.lms_courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  platform_name text not null,
  external_course_id text,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'qa', 'published', 'archived')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.lms_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  lms_course_id uuid not null references app.lms_courses(id) on delete cascade,
  content_asset_id uuid references app.content_assets(id) on delete set null,
  package_name text not null,
  package_type text,
  package_url text,
  qc_status text not null default 'pending' check (qc_status in ('pending', 'passed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.workload_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  snapshot_date date not null,
  instructor_id uuid references app.instructors(id) on delete cascade,
  allocated_sessions integer not null default 0,
  allocated_courses integer not null default 0,
  content_load integer not null default 0,
  readiness_risk_level text not null default 'normal' check (readiness_risk_level in ('normal', 'warning', 'critical')),
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, snapshot_date, instructor_id)
);

create table if not exists app.course_risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  course_id uuid not null references app.courses(id) on delete cascade,
  risk_code text not null,
  title text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'mitigating', 'resolved', 'accepted')),
  owner_profile_id uuid references app.profiles(id) on delete set null,
  due_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, risk_code)
);

create table if not exists app.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  active_course_count integer not null default 0,
  upcoming_course_count integer not null default 0,
  active_contract_value numeric(18,2) not null default 0,
  on_time_rate numeric(5,2) not null default 0,
  open_content_request_count integer not null default 0,
  open_risk_count integer not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_customers_tenant_name on app.customers (tenant_id, name);
create index if not exists idx_contracts_tenant_customer on app.contracts (tenant_id, customer_id, status);
create index if not exists idx_courses_tenant_status on app.courses (tenant_id, status, start_date);
create index if not exists idx_course_classes_course on app.course_classes (course_id, status);
create index if not exists idx_course_sessions_course on app.course_sessions (course_id, class_id, scheduled_at);
create index if not exists idx_content_requests_course on app.content_requests (course_id, status, priority);
create index if not exists idx_instructor_assignments_scope on app.instructor_assignments (tenant_id, scope, role);
create index if not exists idx_workload_snapshots_date on app.workload_snapshots (tenant_id, snapshot_date);
