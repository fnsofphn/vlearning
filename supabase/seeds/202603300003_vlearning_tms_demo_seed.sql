-- Demo seed for V-Learning TMS SRS v4 course-centric schema.
-- Run after:
-- 1. core auth/membership migrations
-- 2. 202603300100_vlearning_tms_foundation.sql
-- 3. bootstrap workspace seed

with params as (
  select
    'demo'::text as tenant_code,
    'replace-with-your-email@example.com'::citext as admin_email,
    'lan.huong@example.com'::citext as director_email,
    'trung.nguyen@example.com'::citext as instructor_email,
    'linh.phan@example.com'::citext as backup_instructor_email,
    'content.team@example.com'::citext as content_email,
    'it.support@example.com'::citext as it_email
),
tenant_row as (
  select t.* from app.tenants t join params p on p.tenant_code = t.code limit 1
),
profile_seed as (
  insert into app.profiles (email, full_name, job_title, is_active)
  select *
  from (
    select (select admin_email from params), 'Lê Hải', 'Admin hệ thống đào tạo', true
    union all select (select director_email from params), 'Phan Lan Hương', 'Giám đốc Đào tạo', true
    union all select (select instructor_email from params), 'Nguyễn Thành Trung', 'Giảng viên ICF-PCC', true
    union all select (select backup_instructor_email from params), 'Phan Linh Hương', 'Giảng viên Senior', true
    union all select (select content_email from params), 'Ngô Minh Đức', 'Content Designer', true
    union all select (select it_email from params), 'Trần Bảo Khánh', 'IT Support', true
  ) as seed(email, full_name, job_title, is_active)
  on conflict (email)
  do update set full_name = excluded.full_name, job_title = excluded.job_title, is_active = excluded.is_active, updated_at = now()
  returning id, email
),
profiles as (
  select p.id, p.email, p.full_name from app.profiles p
  join params x on p.email in (x.admin_email, x.director_email, x.instructor_email, x.backup_instructor_email, x.content_email, x.it_email)
),
membership_seed as (
  insert into app.tenant_memberships (tenant_id, profile_id, role, status, is_primary)
  select tr.id, pr.id, seed.role, 'active', seed.is_primary
  from tenant_row tr
  join profiles pr on true
  join (
    select (select admin_email from params) as email, 'business_admin'::app.membership_role as role, true as is_primary
    union all select (select director_email from params), 'business_admin'::app.membership_role, false
    union all select (select instructor_email from params), 'coach'::app.membership_role, false
    union all select (select backup_instructor_email from params), 'coach'::app.membership_role, false
    union all select (select content_email from params), 'business_admin'::app.membership_role, false
    union all select (select it_email from params), 'business_admin'::app.membership_role, false
  ) as seed on seed.email = pr.email
  on conflict (tenant_id, profile_id, role)
  do update set status = excluded.status, is_primary = excluded.is_primary, updated_at = now()
  returning id
),
customer_seed as (
  insert into app.customers (tenant_id, code, name, short_name, industry, address, created_by_profile_id)
  select tr.id, seed.code, seed.name, seed.short_name, seed.industry, seed.address, admin_profile.id
  from tenant_row tr
  cross join lateral (select id from profiles where email = (select admin_email from params) limit 1) as admin_profile
  cross join (
    values
      ('VNPT', 'Tập đoàn VNPT', 'VNPT', 'Viễn thông', '57 Huỳnh Thúc Kháng, Hà Nội'),
      ('EVNHN', 'EVN Hà Nội', 'EVN HN', 'Điện lực', '69 Đinh Tiên Hoàng, Hà Nội'),
      ('PLX', 'Petrolimex', 'PLX', 'Bán lẻ năng lượng', '1 Khâm Thiên, Hà Nội')
  ) as seed(code, name, short_name, industry, address)
  on conflict (tenant_id, code)
  do update set name = excluded.name, short_name = excluded.short_name, industry = excluded.industry, address = excluded.address, updated_at = now()
  returning id, code
),
customer_rows as (
  select c.id, c.code, c.name from app.customers c join tenant_row tr on tr.id = c.tenant_id where c.code in ('VNPT','EVNHN','PLX')
),
contact_seed as (
  insert into app.customer_contacts (tenant_id, customer_id, full_name, title, email, phone, is_primary)
  select tr.id, cr.id, seed.full_name, seed.title, seed.email, seed.phone, true
  from tenant_row tr
  join customer_rows cr on cr.code = seed.customer_code
  join (
    values
      ('VNPT', 'Nguyễn Đức Long', 'Trưởng ban Đào tạo', 'long.vnpt@example.com', '0901000001'),
      ('EVNHN', 'Lê Thu Hà', 'Phó phòng Tổ chức', 'ha.evnhn@example.com', '0901000002'),
      ('PLX', 'Trần Hải Long', 'Giám đốc DVKH', 'long.plx@example.com', '0901000003')
  ) as seed(customer_code, full_name, title, email, phone) on true
  where not exists (
    select 1 from app.customer_contacts cc where cc.customer_id = cr.id and cc.email = seed.email::citext
  )
  returning id
),
contract_seed as (
  insert into app.contracts (tenant_id, customer_id, code, name, signed_on, starts_on, ends_on, total_value, status, owner_profile_id, created_by_profile_id)
  select tr.id, cr.id, seed.code, seed.name, seed.signed_on, seed.starts_on, seed.ends_on, seed.total_value, seed.status::app.contract_status, director.id, admin_profile.id
  from tenant_row tr
  join customer_rows cr on cr.code = seed.customer_code
  cross join lateral (select id from profiles where email = (select director_email from params) limit 1) as director
  cross join lateral (select id from profiles where email = (select admin_email from params) limit 1) as admin_profile
  join (
    values
      ('VNPT', 'HD-2026-001', 'HĐ VNPT Rising Leadership', date '2026-03-01', date '2026-03-15', date '2026-06-30', 1850000000, 'active'),
      ('EVNHN', 'HD-2026-002', 'HĐ EVN Văn hoá số', date '2026-02-20', date '2026-03-10', date '2026-05-30', 1320000000, 'active'),
      ('PLX', 'HD-2026-003', 'HĐ Petrolimex DVKH Xuất sắc', date '2026-02-25', date '2026-03-05', date '2026-05-20', 980000000, 'active')
  ) as seed(customer_code, code, name, signed_on, starts_on, ends_on, total_value, status) on true
  on conflict (tenant_id, code)
  do update set name = excluded.name, signed_on = excluded.signed_on, starts_on = excluded.starts_on, ends_on = excluded.ends_on, total_value = excluded.total_value, status = excluded.status, updated_at = now()
  returning id, code
),
contract_rows as (
  select c.id, c.code from app.contracts c join tenant_row tr on tr.id = c.tenant_id where c.code in ('HD-2026-001','HD-2026-002','HD-2026-003')
),
course_type_seed as (
  insert into app.course_types (tenant_id, code, name, training_format, description)
  select tr.id, seed.code, seed.name, seed.training_format::app.training_format, seed.description
  from tenant_row tr
  cross join (
    values
      ('EXEC', 'Executive Coaching', 'executive_coaching', 'Coaching lãnh đạo cấp điều hành'),
      ('DIGI', 'Digital Transformation', 'digital_transformation', 'Đào tạo chuyển đổi số và văn hoá số'),
      ('SERV', 'Skill Training', 'skill_training', 'Đào tạo năng lực dịch vụ và vận hành')
  ) as seed(code, name, training_format, description)
  on conflict (tenant_id, code)
  do update set name = excluded.name, training_format = excluded.training_format, description = excluded.description, updated_at = now()
  returning id, code
),
course_type_rows as (
  select ct.id, ct.code from app.course_types ct join tenant_row tr on tr.id = ct.tenant_id where ct.code in ('EXEC','DIGI','SERV')
),
framework_seed as (
  insert into app.competency_frameworks (tenant_id, code, name, framework_model, description)
  select tr.id, 'HEART', 'Khung Năng lực HEART', 'HEART', 'Khung năng lực lõi cho đào tạo lãnh đạo và phát triển tổ chức'
  from tenant_row tr
  on conflict (tenant_id, code)
  do update set name = excluded.name, framework_model = excluded.framework_model, description = excluded.description, updated_at = now()
  returning id, code
),
framework_row as (
  select f.id from app.competency_frameworks f join tenant_row tr on tr.id = f.tenant_id where f.code = 'HEART' limit 1
),
competency_seed as (
  insert into app.competencies (tenant_id, framework_id, code, name, group_name, sort_order)
  select tr.id, fr.id, seed.code, seed.name, seed.group_name, seed.sort_order
  from tenant_row tr
  cross join framework_row fr
  cross join (
    values
      ('H-LEAD', 'Dẫn dắt thay đổi', 'Leadership', 1),
      ('H-DIGI', 'Năng lực số', 'Digital', 2),
      ('H-SERV', 'Tư duy dịch vụ', 'Service', 3)
  ) as seed(code, name, group_name, sort_order)
  on conflict (framework_id, code)
  do update set name = excluded.name, group_name = excluded.group_name, sort_order = excluded.sort_order, updated_at = now()
  returning id, code
),
course_seed as (
  insert into app.courses (
    tenant_id, customer_id, contract_id, course_type_id, competency_framework_id, code, name,
    topic_type, training_format, start_date, end_date, status, objective, description,
    budget_amount, total_topics, sessions_per_topic, minutes_per_session, total_sprints, elearning_module_count,
    requested_asset_mix, created_by_profile_id
  )
  select
    tr.id,
    cr.id,
    ctr.id,
    ctype.id,
    fr.id,
    seed.code,
    seed.name,
    seed.topic_type::app.topic_type,
    seed.training_format::app.training_format,
    seed.start_date,
    seed.end_date,
    seed.status::app.course_status,
    seed.objective,
    seed.description,
    seed.budget_amount,
    seed.total_topics,
    seed.sessions_per_topic,
    seed.minutes_per_session,
    seed.total_sprints,
    seed.elearning_module_count,
    seed.requested_asset_mix::jsonb,
    admin_profile.id
  from tenant_row tr
  join customer_rows cr on cr.code = seed.customer_code
  join contract_rows ctr on ctr.code = seed.contract_code
  join course_type_rows ctype on ctype.code = seed.course_type_code
  cross join framework_row fr
  cross join lateral (select id from profiles where email = (select admin_email from params) limit 1) as admin_profile
  join (
    values
      ('VNPT', 'HD-2026-001', 'EXEC', 'KH-2026-001', 'VNPT Rising Leadership 2026', 'coaching_1_1', 'executive_coaching', date '2026-03-15', date '2026-06-30', 'active', 'Tăng năng lực lãnh đạo chuyển đổi cho nhóm điều hành chủ chốt', '06 lãnh đạo khối điều hành, 03 vùng triển khai', 1850000000, 6, 2, 180, 3, 2, '{"video":2,"slide":6,"elearning":2}' ),
      ('EVNHN', 'HD-2026-002', 'DIGI', 'KH-2026-002', 'EVN Văn hoá số & Chuyển đổi số', 'blended_learning', 'digital_transformation', date '2026-03-10', date '2026-05-30', 'preparing', 'Gắn năng lực số và văn hoá số vào nhịp điều hành', '03 lớp cán bộ quản lý, 135 học viên', 1320000000, 5, 2, 150, 2, 3, '{"video":1,"slide":5,"elearning":3}' ),
      ('PLX', 'HD-2026-003', 'SERV', 'KH-2026-003', 'Petrolimex DVKH Xuất sắc', 'classroom', 'skill_training', date '2026-03-05', date '2026-05-20', 'active', 'Chuẩn hoá hành vi dịch vụ và kỹ năng tuyến đầu', '04 đợt triển khai, trọng tâm dịch vụ khách hàng', 980000000, 4, 3, 120, 2, 1, '{"game":1,"slide":4,"workbook":1}' )
  ) as seed(customer_code, contract_code, course_type_code, code, name, topic_type, training_format, start_date, end_date, status, objective, description, budget_amount, total_topics, sessions_per_topic, minutes_per_session, total_sprints, elearning_module_count, requested_asset_mix) on true
  on conflict (tenant_id, code)
  do update set name = excluded.name, contract_id = excluded.contract_id, course_type_id = excluded.course_type_id, competency_framework_id = excluded.competency_framework_id, topic_type = excluded.topic_type, training_format = excluded.training_format, start_date = excluded.start_date, end_date = excluded.end_date, status = excluded.status, objective = excluded.objective, description = excluded.description, budget_amount = excluded.budget_amount, total_topics = excluded.total_topics, sessions_per_topic = excluded.sessions_per_topic, minutes_per_session = excluded.minutes_per_session, total_sprints = excluded.total_sprints, elearning_module_count = excluded.elearning_module_count, requested_asset_mix = excluded.requested_asset_mix, updated_at = now()
  returning id, code
),
course_rows as (
  select c.id, c.code, c.name from app.courses c join tenant_row tr on tr.id = c.tenant_id where c.code in ('KH-2026-001','KH-2026-002','KH-2026-003')
),
course_competency_seed as (
  insert into app.course_competencies (tenant_id, course_id, competency_id, priority)
  select tr.id, c.id, cp.id, 'primary'
  from tenant_row tr
  join course_rows c on true
  join app.competencies cp on cp.framework_id = (select id from framework_row)
  where (c.code = 'KH-2026-001' and cp.code = 'H-LEAD')
     or (c.code = 'KH-2026-002' and cp.code = 'H-DIGI')
     or (c.code = 'KH-2026-003' and cp.code = 'H-SERV')
  on conflict (course_id, competency_id) do nothing
  returning id
),
class_seed as (
  insert into app.course_classes (tenant_id, course_id, code, name, delivery_mode, start_date, end_date, location, status, expected_learners)
  select tr.id, c.id, seed.code, seed.name, seed.delivery_mode::app.delivery_mode, seed.start_date, seed.end_date, seed.location, seed.status::app.class_status, seed.expected_learners
  from tenant_row tr
  join course_rows c on c.code = seed.course_code
  join (
    values
      ('KH-2026-001', 'CLS-VNPT-01', 'Lớp Điều hành Miền Bắc', 'hybrid', date '2026-03-20', date '2026-05-10', 'Hà Nội', 'in_progress', 24),
      ('KH-2026-002', 'CLS-EVN-01', 'Lớp Quản lý Chuyển đổi số', 'offline', date '2026-03-18', date '2026-05-05', 'Hà Nội', 'ready', 45),
      ('KH-2026-003', 'CLS-PLX-01', 'Lớp DVKH Đợt 1', 'offline', date '2026-03-12', date '2026-04-25', 'Hà Nội', 'in_progress', 32)
  ) as seed(course_code, code, name, delivery_mode, start_date, end_date, location, status, expected_learners) on true
  on conflict (course_id, code)
  do update set name = excluded.name, delivery_mode = excluded.delivery_mode, start_date = excluded.start_date, end_date = excluded.end_date, location = excluded.location, status = excluded.status, expected_learners = excluded.expected_learners, updated_at = now()
  returning id, code
),
class_rows as (
  select cl.id, cl.code, cl.course_id from app.course_classes cl join course_rows c on c.id = cl.course_id
),
learner_seed as (
  insert into app.learners (tenant_id, customer_id, full_name, email, title, department)
  select tr.id, cr.id, seed.full_name, seed.email, seed.title, seed.department
  from tenant_row tr
  join customer_rows cr on cr.code = seed.customer_code
  join (
    values
      ('VNPT', 'Phạm Minh Quân', 'quan.vnpt@example.com', 'Phó Tổng Giám đốc', 'Điều hành'),
      ('VNPT', 'Lê Tuấn Anh', 'anh.vnpt@example.com', 'Giám đốc Vùng', 'Kinh doanh'),
      ('EVNHN', 'Nguyễn Thu Hà', 'ha.evnhn.learner@example.com', 'Trưởng phòng Chuyển đổi số', 'Chuyển đổi số'),
      ('PLX', 'Trần Hải Long', 'long.plx.learner@example.com', 'Quản lý DVKH', 'Dịch vụ khách hàng')
  ) as seed(customer_code, full_name, email, title, department) on true
  where not exists (select 1 from app.learners l where l.tenant_id = tr.id and l.email = seed.email::citext)
  returning id
),
learner_rows as (
  select l.id, l.full_name from app.learners l join tenant_row tr on tr.id = l.tenant_id where l.email in ('quan.vnpt@example.com','anh.vnpt@example.com','ha.evnhn.learner@example.com','long.plx.learner@example.com')
),
class_learner_seed as (
  insert into app.class_learners (tenant_id, class_id, learner_id, enrollment_status)
  select tr.id, cl.id, lr.id, 'enrolled'
  from tenant_row tr
  join class_rows cl on true
  join learner_rows lr on true
  where (cl.code = 'CLS-VNPT-01' and lr.full_name in ('Phạm Minh Quân','Lê Tuấn Anh'))
     or (cl.code = 'CLS-EVN-01' and lr.full_name = 'Nguyễn Thu Hà')
     or (cl.code = 'CLS-PLX-01' and lr.full_name = 'Trần Hải Long')
  on conflict (class_id, learner_id) do nothing
  returning id
),
instructor_seed as (
  insert into app.instructors (tenant_id, profile_id, code, full_name, instructor_type, email, phone, headline)
  select tr.id, pr.id, seed.code, seed.full_name, seed.instructor_type::app.instructor_type, seed.email, seed.phone, seed.headline
  from tenant_row tr
  join profiles pr on pr.email = seed.email::citext
  join (
    values
      ('GV-TRUNG', 'Nguyễn Thành Trung', 'internal', 'trung.nguyen@example.com', '0902000001', 'Giảng viên ICF-PCC · Leadership Coaching'),
      ('GV-LINH', 'Phan Linh Hương', 'freelance', 'linh.phan@example.com', '0902000002', 'Giảng viên Senior · Service Excellence')
  ) as seed(code, full_name, instructor_type, email, phone, headline) on true
  on conflict (tenant_id, code)
  do update set full_name = excluded.full_name, instructor_type = excluded.instructor_type, email = excluded.email, phone = excluded.phone, headline = excluded.headline, updated_at = now()
  returning id, code
),
instructor_rows as (
  select i.id, i.code, i.full_name from app.instructors i join tenant_row tr on tr.id = i.tenant_id where i.code in ('GV-TRUNG','GV-LINH')
),
readiness_seed as (
  insert into app.instructor_readiness (tenant_id, instructor_id, course_id, readiness_status, elearning_completed, sample_delivery_completed)
  select tr.id, i.id, c.id, seed.readiness_status::app.readiness_status, seed.elearning_completed, seed.sample_delivery_completed
  from tenant_row tr
  join instructor_rows i on i.code = seed.instructor_code
  join course_rows c on c.code = seed.course_code
  join (
    values
      ('GV-TRUNG', 'KH-2026-001', 'ready', true, true),
      ('GV-TRUNG', 'KH-2026-002', 'collecting', true, false),
      ('GV-LINH', 'KH-2026-003', 'ready', true, true)
  ) as seed(instructor_code, course_code, readiness_status, elearning_completed, sample_delivery_completed) on true
  on conflict (instructor_id, course_id)
  do update set readiness_status = excluded.readiness_status, elearning_completed = excluded.elearning_completed, sample_delivery_completed = excluded.sample_delivery_completed, updated_at = now()
  returning id
),
assignment_cleanup as (
  delete from app.instructor_assignments ia
  using tenant_row tr
  where ia.tenant_id = tr.id and ia.course_id in (select id from course_rows)
  returning ia.id
),
assignment_seed as (
  insert into app.instructor_assignments (tenant_id, instructor_id, profile_id, course_id, scope, role, is_primary)
  select tr.id, i.id, null, c.id, 'course'::app.assignment_scope, seed.role::app.assignment_role_v2, seed.is_primary
  from tenant_row tr
  join instructor_rows i on i.code = seed.instructor_code
  join course_rows c on c.code = seed.course_code
  join (
    values
      ('GV-TRUNG', 'KH-2026-001', 'lead_instructor', true),
      ('GV-LINH', 'KH-2026-001', 'backup_instructor', false),
      ('GV-TRUNG', 'KH-2026-002', 'lead_instructor', true),
      ('GV-LINH', 'KH-2026-003', 'lead_instructor', true)
  ) as seed(instructor_code, course_code, role, is_primary) on true
  returning id
),
director_assignment_seed as (
  insert into app.instructor_assignments (tenant_id, instructor_id, profile_id, course_id, scope, role, is_primary)
  select tr.id, null, pr.id, c.id, 'course'::app.assignment_scope, seed.role::app.assignment_role_v2, seed.is_primary
  from tenant_row tr
  join profiles pr on pr.email = seed.email::citext
  join course_rows c on c.code = seed.course_code
  join (
    values
      ('lan.huong@example.com', 'KH-2026-001', 'program_director', true),
      ('content.team@example.com', 'KH-2026-001', 'content_designer', false),
      ('it.support@example.com', 'KH-2026-001', 'it_support', false),
      ('lan.huong@example.com', 'KH-2026-002', 'program_director', true),
      ('content.team@example.com', 'KH-2026-002', 'content_designer', false),
      ('lan.huong@example.com', 'KH-2026-003', 'program_director', true)
  ) as seed(email, course_code, role, is_primary) on true
  returning id
),
session_cleanup as (
  delete from app.course_sessions cs using tenant_row tr where cs.tenant_id = tr.id and cs.course_id in (select id from course_rows) returning cs.id
),
session_seed as (
  insert into app.course_sessions (tenant_id, course_id, class_id, topic_code, topic_name, session_number, title, objective, scheduled_at, duration_minutes, delivery_mode, status)
  select tr.id, c.id, cl.id, seed.topic_code, seed.topic_name, seed.session_number, seed.title, seed.objective, seed.scheduled_at, seed.duration_minutes, seed.delivery_mode::app.delivery_mode, seed.status::app.session_status_v2
  from tenant_row tr
  join course_rows c on c.code = seed.course_code
  join class_rows cl on cl.code = seed.class_code
  join (
    values
      ('KH-2026-001', 'CLS-VNPT-01', 'T1', 'Leadership shift', 1, 'Buổi 1: Làm rõ vai trò dẫn dắt chuyển đổi', 'Khóa kỳ vọng và mục tiêu quý 2', timestamptz '2026-04-15 09:00:00+07', 180, 'hybrid', 'in_progress'),
      ('KH-2026-002', 'CLS-EVN-01', 'T2', 'Digital mindset', 1, 'Buổi 1: Khung năng lực số cho quản lý', 'Làm rõ năng lực số cốt lõi', timestamptz '2026-04-17 08:30:00+07', 150, 'offline', 'ready'),
      ('KH-2026-003', 'CLS-PLX-01', 'T1', 'Service standard', 2, 'Buổi 2: Tiêu chuẩn DVKH tuyến đầu', 'Chuẩn hóa hành vi phản hồi khách hàng', timestamptz '2026-04-20 13:30:00+07', 120, 'offline', 'planned')
  ) as seed(course_code, class_code, topic_code, topic_name, session_number, title, objective, scheduled_at, duration_minutes, delivery_mode, status) on true
  returning id
),
content_cleanup as (
  delete from app.content_requests cr using tenant_row tr where cr.tenant_id = tr.id and cr.course_id in (select id from course_rows) returning cr.id
),
content_seed as (
  insert into app.content_requests (tenant_id, course_id, class_id, requested_by_profile_id, request_code, title, request_type, status, priority, brief, due_date, owner_profile_id)
  select tr.id, c.id, cl.id, director.id, seed.request_code, seed.title, seed.request_type::app.content_request_type, seed.status::app.content_request_status, seed.priority, seed.brief, seed.due_date, owner_profile.id
  from tenant_row tr
  join course_rows c on c.code = seed.course_code
  left join class_rows cl on cl.code = seed.class_code
  join profiles director on director.email = (select director_email from params)
  join profiles owner_profile on owner_profile.email = seed.owner_email::citext
  join (
    values
      ('KH-2026-001', 'CLS-VNPT-01', 'REQ-2026-001', 'VNPT Module 3 — Video Case Study', 'case_study_video', 'producing', 'urgent', 'Video case study phục vụ buổi leadership coaching số 3', date '2026-04-13', 'content.team@example.com'),
      ('KH-2026-002', 'CLS-EVN-01', 'REQ-2026-002', 'EVN E-learning Module 1', 'elearning', 'review', 'high', 'Module e-learning cho đội ngũ quản lý cấp trung', date '2026-04-18', 'content.team@example.com'),
      ('KH-2026-003', 'CLS-PLX-01', 'REQ-2026-003', 'PLX Gamification Round 1', 'gamification', 'uploading', 'normal', 'Mini game về tiêu chuẩn DVKH', date '2026-04-20', 'it.support@example.com')
  ) as seed(course_code, class_code, request_code, title, request_type, status, priority, brief, due_date, owner_email) on true
  on conflict (tenant_id, request_code)
  do update set title = excluded.title, request_type = excluded.request_type, status = excluded.status, priority = excluded.priority, brief = excluded.brief, due_date = excluded.due_date, owner_profile_id = excluded.owner_profile_id, updated_at = now()
  returning id, request_code
),
workflow_seed as (
  insert into app.content_workflow_steps (tenant_id, content_request_id, step_code, step_name, step_status, sort_order)
  select tr.id, cr.id, seed.step_code, seed.step_name, seed.step_status, seed.sort_order
  from tenant_row tr
  join content_seed cr on cr.request_code = seed.request_code
  join (
    values
      ('REQ-2026-001', 'BRIEF', 'Nhận brief', 'done', 1),
      ('REQ-2026-001', 'PROD', 'Đang sản xuất', 'in_progress', 2),
      ('REQ-2026-002', 'REVIEW', 'Chờ review ND', 'in_progress', 1),
      ('REQ-2026-003', 'UPLOAD', 'Chờ upload LMS', 'in_progress', 1)
  ) as seed(request_code, step_code, step_name, step_status, sort_order) on true
  on conflict (content_request_id, step_code)
  do update set step_name = excluded.step_name, step_status = excluded.step_status, sort_order = excluded.sort_order, updated_at = now()
  returning id
),
risk_seed as (
  insert into app.course_risks (tenant_id, course_id, risk_code, title, severity, status, due_on, note)
  select tr.id, c.id, seed.risk_code, seed.title, seed.severity, seed.status, seed.due_on, seed.note
  from tenant_row tr
  join course_rows c on c.code = seed.course_code
  join (
    values
      ('KH-2026-001', 'RISK-01', 'Video case study có nguy cơ trễ render', 'high', 'mitigating', date '2026-04-13', 'Cần đẩy nhanh vòng review nội dung'),
      ('KH-2026-002', 'RISK-02', 'Giáo án số chưa chốt đủ cho lớp khai giảng', 'medium', 'open', date '2026-04-17', 'Cần chốt giáo án trước ngày lên lớp')
  ) as seed(course_code, risk_code, title, severity, status, due_on, note) on true
  on conflict (course_id, risk_code)
  do update set title = excluded.title, severity = excluded.severity, status = excluded.status, due_on = excluded.due_on, note = excluded.note, updated_at = now()
  returning id
),
dashboard_seed as (
  insert into app.dashboard_snapshots (tenant_id, active_course_count, upcoming_course_count, active_contract_value, on_time_rate, open_content_request_count, open_risk_count, meta)
  select tr.id,
    (select count(*) from app.courses c where c.tenant_id = tr.id and c.status = 'active'),
    (select count(*) from app.courses c where c.tenant_id = tr.id and c.start_date between current_date and current_date + 30),
    (select coalesce(sum(c.total_value),0) from app.contracts c where c.tenant_id = tr.id and c.status = 'active'),
    86.5,
    (select count(*) from app.content_requests cr where cr.tenant_id = tr.id and cr.status <> 'completed'),
    (select count(*) from app.course_risks r where r.tenant_id = tr.id and r.status <> 'resolved'),
    '{"source":"demo_seed_v1"}'::jsonb
  from tenant_row tr
  returning id
)
select
  (select count(*) from customer_rows) as customers,
  (select count(*) from contract_rows) as contracts,
  (select count(*) from course_rows) as courses,
  (select count(*) from class_rows) as classes,
  (select count(*) from instructor_rows) as instructors,
  (select count(*) from app.content_requests cr join tenant_row tr on tr.id = cr.tenant_id) as content_requests;
