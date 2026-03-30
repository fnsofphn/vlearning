-- Demo data for Sprint 1 showcase.
-- How to use:
-- 1. Apply migrations first.
-- 2. Run bootstrap_workspace.sql for one business admin account.
-- 3. Update the params CTE below and run this file in Supabase SQL Editor.

with params as (
  select
    'demo'::text as tenant_code,
    'replace-with-your-email@example.com'::citext as admin_email,
    'coach.chinh@example.com'::citext as lead_coach_email,
    'coach.phu@example.com'::citext as support_coach_email,
    'reviewer.sme@example.com'::citext as reviewer_email,
    'dieuphoi.ops@example.com'::citext as coordinator_email
),
tenant_row as (
  select t.*
  from app.tenants t
  join params p on p.tenant_code = t.code
  limit 1
),
profile_seed as (
  insert into app.profiles (email, full_name, job_title, is_active)
  select *
  from (
    select (select admin_email from params), 'Lê Hải', 'Giám đốc Đào tạo', true
    union all
    select (select lead_coach_email from params), 'Nguyễn Trung', 'Coach chính', true
    union all
    select (select support_coach_email from params), 'Mai Anh', 'Coach hỗ trợ', true
    union all
    select (select reviewer_email from params), 'Khánh Linh', 'Reviewer SME', true
    union all
    select (select coordinator_email from params), 'Bảo Nhi', 'Điều phối vận hành', true
  ) as seed(email, full_name, job_title, is_active)
  on conflict (email)
  do update set
    full_name = excluded.full_name,
    job_title = excluded.job_title,
    is_active = excluded.is_active,
    updated_at = now()
  returning id, email
),
profiles as (
  select p.id, p.email, p.full_name
  from app.profiles p
  join params x on p.email in (x.admin_email, x.lead_coach_email, x.support_coach_email, x.reviewer_email, x.coordinator_email)
),
membership_seed as (
  insert into app.tenant_memberships (tenant_id, profile_id, role, status, is_primary)
  select tr.id, pr.id, seed.role, 'active', seed.is_primary
  from tenant_row tr
  join profiles pr on true
  join (
    select (select admin_email from params) as email, 'business_admin'::app.membership_role as role, true as is_primary
    union all select (select lead_coach_email from params), 'coach'::app.membership_role, false
    union all select (select support_coach_email from params), 'coach'::app.membership_role, false
    union all select (select reviewer_email from params), 'reviewer'::app.membership_role, false
    union all select (select coordinator_email from params), 'business_admin'::app.membership_role, false
  ) as seed on seed.email = pr.email
  on conflict (tenant_id, profile_id, role)
  do update set status = excluded.status, is_primary = excluded.is_primary, updated_at = now()
  returning id
),
module_seed as (
  insert into app.coaching_service_modules (tenant_id, code, name, description, business_goal, typical_outputs, supported_methods, status)
  select tr.id, s.code, s.name, s.description, s.business_goal, s.typical_outputs, s.supported_methods, 'active'
  from tenant_row tr
  cross join (
    values
      ('M-LEAD', 'Coaching về dẫn dắt chuyển đổi VHDN', 'Module trọng tâm cho lãnh đạo và ban điều hành.', 'Nâng năng lực dẫn dắt chuyển đổi và truyền thông điều hành.', 'Thông điệp lãnh đạo; Action plan; Culture index roadmap', 'GROW; Leadership coaching; Transformation roadmap'),
      ('M-INTEG', 'Coaching về tích hợp VHDN vào vận hành', 'Module gắn VHDN với hệ thống vận hành và chỉ tiêu thực thi.', 'Đưa văn hóa doanh nghiệp vào chỉ tiêu và nhịp vận hành.', 'Bộ chỉ tiêu tích hợp; Checklist vận hành; Bản đồ hành động', 'Problem-solving; Operating cadence; Transformation roadmap')
  ) as s(code, name, description, business_goal, typical_outputs, supported_methods)
  on conflict (tenant_id, code)
  do update set
    name = excluded.name,
    description = excluded.description,
    business_goal = excluded.business_goal,
    typical_outputs = excluded.typical_outputs,
    supported_methods = excluded.supported_methods,
    status = excluded.status,
    updated_at = now()
  returning id, code
),
module_rows as (
  select m.id, m.code, m.name
  from app.coaching_service_modules m
  join tenant_row tr on tr.id = m.tenant_id
  where m.code in ('M-LEAD', 'M-INTEG')
),
program_seed as (
  insert into app.coaching_programs (
    tenant_id, module_id, code, name, customer_name, objective, audience_summary,
    starts_on, ends_on, status, is_confidential, created_by_profile_id
  )
  select
    tr.id,
    mr.id,
    s.code,
    s.name,
    s.customer_name,
    s.objective,
    s.audience_summary,
    s.starts_on,
    s.ends_on,
    s.status::app.program_status,
    false,
    admin_profile.id
  from tenant_row tr
  join module_rows mr on mr.code = s.module_code
  join lateral (
    select id from profiles where email = (select admin_email from params) limit 1
  ) as admin_profile on true
  join (
    values
      ('P-LEAD-2026', 'M-LEAD', 'VNPT Rising — Executive Coaching Sprint 1', 'Tập đoàn VNPT', 'Tăng năng lực dẫn dắt chuyển đổi cho nhóm PTGĐ và quản lý chủ chốt.', '06 lãnh đạo khối điều hành · 03 vùng', date '2026-03-15', date '2026-06-30', 'active'),
      ('P-EVN-2026', 'M-INTEG', 'EVN HN — Văn hoá số & Chuyển đổi số', 'EVN Hà Nội', 'Gắn chỉ tiêu chuyển đổi văn hóa với hệ thống vận hành và truyền thông lãnh đạo.', '03 lớp cán bộ quản lý · 135 học viên', date '2026-02-15', date '2026-04-30', 'active'),
      ('P-PLX-2026', 'M-INTEG', 'Petrolimex — DVKH Xuất sắc', 'Petrolimex', 'Chuẩn hoá hành vi dịch vụ và nhịp coaching theo từng đợt triển khai.', '04 đợt · 140 học viên', date '2026-02-01', date '2026-04-30', 'active')
  ) as s(code, module_code, name, customer_name, objective, audience_summary, starts_on, ends_on, status) on true
  on conflict (tenant_id, code)
  do update set
    module_id = excluded.module_id,
    name = excluded.name,
    customer_name = excluded.customer_name,
    objective = excluded.objective,
    audience_summary = excluded.audience_summary,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    status = excluded.status,
    updated_at = now()
  returning id, code
),
program_rows as (
  select p.id, p.code, p.name
  from app.coaching_programs p
  join tenant_row tr on tr.id = p.tenant_id
  where p.code in ('P-LEAD-2026', 'P-EVN-2026', 'P-PLX-2026')
),
cohort_seed as (
  insert into app.coaching_cohorts (tenant_id, program_id, code, name, starts_on, ends_on, status)
  select tr.id, pr.id, s.code, s.name, s.starts_on, s.ends_on, s.status::app.program_status
  from tenant_row tr
  join program_rows pr on pr.code = s.program_code
  join (
    values
      ('P-LEAD-2026', 'C-BAC-01', 'Cohort Bắc 01', date '2026-03-20', date '2026-05-10', 'active'),
      ('P-LEAD-2026', 'C-NAM-01', 'Cohort Nam 01', date '2026-03-25', date '2026-05-15', 'active'),
      ('P-EVN-2026', 'C-EVN-01', 'Cohort EVN 01', date '2026-02-18', date '2026-04-20', 'active'),
      ('P-PLX-2026', 'C-PLX-04', 'Cohort Petrolimex Đợt 4', date '2026-03-10', date '2026-04-25', 'active')
  ) as s(program_code, code, name, starts_on, ends_on, status) on true
  on conflict (program_id, code)
  do update set
    name = excluded.name,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    status = excluded.status,
    updated_at = now()
  returning id, code
),
cohort_rows as (
  select c.id, c.program_id, c.code, c.name
  from app.coaching_cohorts c
  join program_rows p on p.id = c.program_id
),
assignment_seed as (
  insert into app.program_assignments (tenant_id, program_id, cohort_id, profile_id, role, is_primary)
  select tr.id, pr.id, cr.id, pf.id, s.role::app.assignment_role, s.is_primary
  from tenant_row tr
  join program_rows pr on pr.code = s.program_code
  left join cohort_rows cr on cr.code = s.cohort_code
  join profiles pf on pf.email = s.email
  join (
    values
      ('P-LEAD-2026', 'C-BAC-01', 'coach.chinh@example.com', 'lead_coach', true),
      ('P-LEAD-2026', 'C-NAM-01', 'coach.phu@example.com', 'support_coach', false),
      ('P-LEAD-2026', null, 'reviewer.sme@example.com', 'reviewer', false),
      ('P-LEAD-2026', null, 'dieuphoi.ops@example.com', 'coordinator', false),
      ('P-EVN-2026', 'C-EVN-01', 'coach.chinh@example.com', 'lead_coach', true),
      ('P-PLX-2026', 'C-PLX-04', 'coach.phu@example.com', 'lead_coach', true)
  ) as s(program_code, cohort_code, email, role, is_primary) on true
  on conflict (program_id, cohort_id, profile_id, role)
  do update set is_primary = excluded.is_primary
  returning id
),
coachee_seed as (
  insert into app.coachees (
    tenant_id, program_id, cohort_id, full_name, job_title, is_guest, is_confidential, status
  )
  select tr.id, pr.id, cr.id, s.full_name, s.job_title, false, false, 'active'
  from tenant_row tr
  join program_rows pr on pr.code = s.program_code
  left join cohort_rows cr on cr.code = s.cohort_code
  join (
    values
      ('P-LEAD-2026', 'C-BAC-01', 'Phạm Minh Quân', 'Phó Tổng Giám đốc'),
      ('P-LEAD-2026', 'C-NAM-01', 'Lê Tuấn Anh', 'Giám đốc Vùng'),
      ('P-EVN-2026', 'C-EVN-01', 'Nguyễn Thu Hà', 'Trưởng phòng Chuyển đổi số'),
      ('P-PLX-2026', 'C-PLX-04', 'Trần Hải Long', 'Quản lý DVKH')
  ) as s(program_code, cohort_code, full_name, job_title) on true
  on conflict do nothing
  returning id
),
coachee_rows as (
  select c.id, c.program_id, c.cohort_id, c.full_name
  from app.coachees c
  join program_rows p on p.id = c.program_id
),
session_seed as (
  insert into app.coaching_sessions (
    tenant_id, program_id, cohort_id, coachee_id, session_number, title, objective,
    scheduled_at, duration_minutes, delivery_mode, status
  )
  select
    tr.id,
    pr.id,
    cr.id,
    co.id,
    s.session_number,
    s.title,
    s.objective,
    s.scheduled_at,
    90,
    'online'::app.delivery_mode,
    s.status::app.session_status
  from tenant_row tr
  join program_rows pr on pr.code = s.program_code
  left join cohort_rows cr on cr.code = s.cohort_code
  join coachee_rows co on co.full_name = s.coachee_name and co.program_id = pr.id
  join (
    values
      ('P-LEAD-2026', 'C-BAC-01', 'Phạm Minh Quân', 1, 'Phiên 1: Làm rõ vai trò dẫn dắt chuyển đổi', 'Khóa kỳ vọng và chốt thách thức trọng yếu của quý 2.', timestamptz '2026-04-15 09:00:00+07', 'planned'),
      ('P-LEAD-2026', 'C-NAM-01', 'Lê Tuấn Anh', 1, 'Phiên 1: Mapping thông điệp lãnh đạo', 'Chuẩn hóa thông điệp lãnh đạo cho cohort miền Nam.', timestamptz '2026-04-17 14:00:00+07', 'prework_sent'),
      ('P-EVN-2026', 'C-EVN-01', 'Nguyễn Thu Hà', 3, 'Phiên 3: Chốt bộ chỉ tiêu chuyển đổi', 'Review bộ chỉ tiêu tích hợp với hệ thống vận hành.', timestamptz '2026-04-18 08:30:00+07', 'in_progress'),
      ('P-PLX-2026', 'C-PLX-04', 'Trần Hải Long', 2, 'Phiên 2: Review hành vi dịch vụ tuyến đầu', 'Theo dõi action plan và tiêu chuẩn phản hồi khách hàng.', timestamptz '2026-04-20 13:30:00+07', 'planned')
  ) as s(program_code, cohort_code, coachee_name, session_number, title, objective, scheduled_at, status) on true
  on conflict do nothing
  returning id
)
select
  (select count(*) from program_rows) as programs,
  (select count(*) from cohort_rows) as cohorts,
  (select count(*) from profiles) as demo_profiles,
  (select count(*) from coachee_rows) as coachees,
  (select count(*) from app.coaching_sessions cs join tenant_row tr on tr.id = cs.tenant_id) as sessions;
