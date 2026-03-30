# Vercel Deploy Patch

## Repo config

Repo hien tai da co file `vercel.json` de deploy SPA tu `dist/`:

- `installCommand`: `npm install`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `rewrites`: toan bo route tra ve `index.html`

## Env vars can set on Vercel

Them 2 bien sau trong `Project Settings > Environment Variables`:

```bash
VITE_SUPABASE_URL=https://wiajiyertencqhyleren.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Nen set cho ca `Production`, `Preview`, va `Development` neu ban muon behavior giong nhau.

## Supabase SQL can run before first deploy test

1. Apply:
   - `supabase/migrations/202603300001_coaching_mvp.sql`
   - `supabase/migrations/202603300002_auth_profiles_and_memberships.sql`
   - `supabase/migrations/202603300003_public_account_access.sql`
2. Tao mot tai khoan bang man hinh signup.
3. Chay file:
   - `supabase/seeds/202603300001_bootstrap_workspace.sql`

## Quick smoke test after deploy

1. Mo URL Vercel.
2. Sign up hoac sign in.
3. Neu login thanh cong va dashboard hien `profile` + `tenant membership`, patch da on.
4. Neu app bao thieu account access SQL, kiem tra migration `202603300003`.

## Notes

- Frontend hien tai doc account context qua `public` RPC, khong can expose schema `app`.
- Neu ban doi domain hoac tao project Supabase moi, chi can doi lai env vars tren Vercel.