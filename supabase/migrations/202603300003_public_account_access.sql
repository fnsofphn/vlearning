create or replace function public.get_my_profile()
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  full_name text,
  job_title text,
  phone text
)
language sql
security definer
stable
set search_path = public, app
as $$
  select
    p.id,
    p.auth_user_id,
    p.email::text,
    p.full_name,
    p.job_title,
    p.phone
  from app.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.ensure_my_profile(requested_full_name text default null)
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  full_name text,
  job_title text,
  phone text
)
language plpgsql
security definer
set search_path = public, app
as $$
declare
  account_email text;
  derived_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    p.id,
    p.auth_user_id,
    p.email::text,
    p.full_name,
    p.job_title,
    p.phone
  from app.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;

  if found then
    return;
  end if;

  select
    u.email,
    coalesce(
      nullif(trim(requested_full_name), ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      split_part(u.email, '@', 1)
    )
  into account_email, derived_name
  from auth.users u
  where u.id = auth.uid();

  if account_email is null then
    raise exception 'Authenticated user email not found';
  end if;

  insert into app.profiles (auth_user_id, email, full_name)
  values (auth.uid(), account_email, derived_name)
  on conflict (email)
  do update set
    auth_user_id = coalesce(app.profiles.auth_user_id, excluded.auth_user_id),
    full_name = case
      when app.profiles.full_name is null or btrim(app.profiles.full_name) = '' then excluded.full_name
      else app.profiles.full_name
    end,
    updated_at = now();

  return query
  select
    p.id,
    p.auth_user_id,
    p.email::text,
    p.full_name,
    p.job_title,
    p.phone
  from app.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
end;
$$;

create or replace function public.list_my_memberships()
returns table (
  id uuid,
  role text,
  status text,
  is_primary boolean,
  tenant_id uuid,
  tenant_code text,
  tenant_name text,
  tenant_slug text,
  tenant_status text,
  unit_id uuid,
  unit_code text,
  unit_name text
)
language sql
security definer
stable
set search_path = public, app
as $$
  select
    m.id,
    m.role::text,
    m.status,
    m.is_primary,
    t.id,
    t.code,
    t.name,
    t.slug,
    t.status,
    u.id,
    u.code,
    u.name
  from app.tenant_memberships m
  join app.profiles p on p.id = m.profile_id
  join app.tenants t on t.id = m.tenant_id
  left join app.units u on u.id = m.unit_id
  where p.auth_user_id = auth.uid()
  order by m.is_primary desc, t.name asc, u.name asc nulls last;
$$;

revoke all on function public.get_my_profile() from public;
revoke all on function public.ensure_my_profile(text) from public;
revoke all on function public.list_my_memberships() from public;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.ensure_my_profile(text) to authenticated;
grant execute on function public.list_my_memberships() to authenticated;

comment on function public.get_my_profile() is 'Returns the current authenticated user profile without exposing the app schema to the client.';
comment on function public.ensure_my_profile(text) is 'Creates or links the current authenticated user to app.profiles and returns the resulting profile.';
comment on function public.list_my_memberships() is 'Returns tenant memberships for the current authenticated user.';