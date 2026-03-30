grant usage on schema app to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated;

grant select, insert, update on app.profiles to authenticated;
grant select on app.tenant_memberships to authenticated;
grant select on app.tenants to authenticated;
grant select on app.units to authenticated;

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  derived_name text;
begin
  derived_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  insert into app.profiles (auth_user_id, email, full_name)
  values (new.id, new.email, derived_name)
  on conflict (email)
  do update set
    auth_user_id = coalesce(app.profiles.auth_user_id, excluded.auth_user_id),
    full_name = coalesce(app.profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

create or replace function app.handle_updated_user()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  update app.profiles
  set
    email = new.email,
    updated_at = now()
  where auth_user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure app.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure app.handle_updated_user();

alter table app.profiles enable row level security;
alter table app.tenant_memberships enable row level security;
alter table app.tenants enable row level security;
alter table app.units enable row level security;

drop policy if exists profiles_self_select on app.profiles;
create policy profiles_self_select
  on app.profiles
  for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists profiles_self_insert on app.profiles;
create policy profiles_self_insert
  on app.profiles
  for insert
  to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists profiles_self_update on app.profiles;
create policy profiles_self_update
  on app.profiles
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists memberships_self_select on app.tenant_memberships;
create policy memberships_self_select
  on app.tenant_memberships
  for select
  to authenticated
  using (
    exists (
      select 1
      from app.profiles p
      where p.id = profile_id
        and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists tenants_select_by_membership on app.tenants;
create policy tenants_select_by_membership
  on app.tenants
  for select
  to authenticated
  using (app.user_is_member(id));

drop policy if exists units_select_by_membership on app.units;
create policy units_select_by_membership
  on app.units
  for select
  to authenticated
  using (app.user_is_member(tenant_id));