-- Bootstrap workspace for the first signed-in account.
-- How to use:
-- 1. Apply the three migrations first.
-- 2. Sign up one account in the app.
-- 3. Replace the values in the params CTE below.
-- 4. Run this file in Supabase SQL Editor.

with params as (
  select
    'demo'::text as tenant_code,
    'demo'::text as tenant_slug,
    'Demo Tenant'::text as tenant_name,
    'HQ'::text as unit_code,
    'Head Office'::text as unit_name,
    'replace-with-your-email@example.com'::citext as account_email,
    'business_admin'::app.membership_role as membership_role
),
tenant_upsert as (
  insert into app.tenants (code, slug, name, status)
  select
    p.tenant_code,
    p.tenant_slug,
    p.tenant_name,
    'active'
  from params p
  on conflict (code)
  do update set
    slug = excluded.slug,
    name = excluded.name,
    status = excluded.status,
    updated_at = now()
  returning id, code, slug, name
),
tenant_row as (
  select id, code, slug, name
  from tenant_upsert
  union all
  select t.id, t.code, t.slug, t.name
  from app.tenants t
  join params p on p.tenant_code = t.code
  where not exists (select 1 from tenant_upsert)
  limit 1
),
unit_upsert as (
  insert into app.units (tenant_id, code, name)
  select
    t.id,
    p.unit_code,
    p.unit_name
  from params p
  cross join tenant_row t
  on conflict (tenant_id, code)
  do update set
    name = excluded.name,
    updated_at = now()
  returning id, tenant_id, code, name
),
unit_row as (
  select id, tenant_id, code, name
  from unit_upsert
  union all
  select u.id, u.tenant_id, u.code, u.name
  from app.units u
  join tenant_row t on t.id = u.tenant_id
  join params p on p.unit_code = u.code
  where not exists (select 1 from unit_upsert)
  limit 1
),
profile_row as (
  select p.id, p.email, p.full_name
  from app.profiles p
  join params x on x.account_email = p.email
  limit 1
),
membership_upsert as (
  insert into app.tenant_memberships (
    tenant_id,
    profile_id,
    unit_id,
    role,
    status,
    is_primary
  )
  select
    t.id,
    pr.id,
    u.id,
    x.membership_role,
    'active',
    true
  from tenant_row t
  cross join profile_row pr
  cross join params x
  left join unit_row u on true
  on conflict (tenant_id, profile_id, role)
  do update set
    unit_id = excluded.unit_id,
    status = excluded.status,
    is_primary = excluded.is_primary,
    updated_at = now()
  returning id, tenant_id, profile_id, unit_id, role, status, is_primary
)
select
  pr.email,
  pr.full_name,
  t.code as tenant_code,
  t.name as tenant_name,
  u.code as unit_code,
  u.name as unit_name,
  m.role,
  m.status,
  m.is_primary
from membership_upsert m
join profile_row pr on pr.id = m.profile_id
join tenant_row t on t.id = m.tenant_id
left join unit_row u on u.id = m.unit_id;