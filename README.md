# v-Culture Coaching VHDN MVP Foundation

Nen mong trien khai cho phan he `Quan tri Coaching VHDN`, bam theo tai lieu yeu cau nghiep vu va dinh huong stack `Supabase + Vercel`.

## Hien trang repo

- Frontend shell bang `React + Vite + TypeScript`
- Dashboard va module map cho domain Coaching VHDN
- Auth that voi `Supabase Auth`
- Tai `profile` va `tenant membership` qua `public` RPC wrappers
- Tai lieu kien truc MVP: `docs/coaching-mvp-architecture.md`
- Backlog khoi dau: `docs/coaching-backlog.md`
- Migration SQL nen cho Supabase: `supabase/migrations/202603300001_coaching_mvp.sql`
- Migration auth/profile/membership: `supabase/migrations/202603300002_auth_profiles_and_memberships.sql`
- Migration public account RPC: `supabase/migrations/202603300003_public_account_access.sql`
- `Supabase client` tai `src/lib/supabase.ts`
- `Vercel SPA rewrite` tai `vercel.json`

## Stack muc tieu

- Frontend: `React + Vite + TypeScript`
- Backend platform: `Supabase`
- Database: `PostgreSQL`
- Auth: `Supabase Auth`
- File storage: `Supabase Storage`
- Deploy: `Vercel`

## Thu muc chinh

- `src/`: shell giao dien va frontend foundation
- `docs/`: architecture note va backlog MVP
- `supabase/migrations/`: schema SQL khoi tao du lieu nen

## Cai dat nhanh

```bash
npm install
npm run dev
```

Tao file `.env` tu `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Thiet lap Supabase can lam

1. Apply migration `202603300001_coaching_mvp.sql`.
2. Apply migration `202603300002_auth_profiles_and_memberships.sql`.
3. Apply migration `202603300003_public_account_access.sql`.
4. Vao `Authentication > Providers > Email` va bat Email signup.
5. Neu muon test nhanh local, co the tat email confirmation trong giai doan dev.

Frontend hien tai doc `profile` va `tenant membership` qua `public` RPC, vi vay khong bat buoc expose schema `app` ra API.

## Seed account context

Sau khi tao user dau tien, ban can seed tenant va membership de workspace co context that:

```sql
insert into app.tenants (code, slug, name)
values ('demo', 'demo', 'Demo Tenant')
on conflict (code) do nothing;

insert into app.units (tenant_id, code, name)
select t.id, 'HQ', 'Head Office'
from app.tenants t
where t.code = 'demo'
on conflict (tenant_id, code) do nothing;

insert into app.tenant_memberships (tenant_id, profile_id, unit_id, role, status, is_primary)
select
  t.id,
  p.id,
  u.id,
  'business_admin',
  'active',
  true
from app.tenants t
join app.profiles p on p.email = 'replace-with-your-email@example.com'
left join app.units u on u.tenant_id = t.id and u.code = 'HQ'
where t.code = 'demo'
on conflict (tenant_id, profile_id, role) do nothing;
```

## Build

```bash
npm run build
```

## Trinh tu nen lam tiep

1. Seed tenant, unit va tenant membership dau tien.
2. Kiem tra login/signup va profile sync.
3. Lam CRUD cho `Catalog & Template`.
4. Lam `Program/Cohort/Coachee`.
5. Lam `Session`, `Output`, `Action Plan`.
6. Mo rong RLS chi tiet cho tung module.

## Luu y

- Ban hien tai da co auth that, nhung `RLS` moi chi o muc toi thieu cho `profiles`, `tenant_memberships`, `tenants`, `units`.
- Cac bang runtime coaching khac van can policy chi tiet o phase tiep theo.
- MVP hien uu tien `operational coaching platform`, chua xu ly AI, maturity scoring sau hoac tich hop enterprise phuc tap.