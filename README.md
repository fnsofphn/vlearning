# v-Culture Coaching VHDN MVP Foundation

Nền móng triển khai cho phân hệ `Quản trị Coaching VHDN`, bám theo tài liệu yêu cầu nghiệp vụ và định hướng stack `Supabase + Vercel`.

## Những gì đã có trong repo

- Frontend shell bằng `React + Vite + TypeScript`
- Dashboard và module map cho domain Coaching VHDN
- Tài liệu kiến trúc MVP: `docs/coaching-mvp-architecture.md`
- Backlog khởi đầu: `docs/coaching-backlog.md`
- Migration SQL nền cho Supabase: `supabase/migrations/202603300001_coaching_mvp.sql`
- `Supabase client` mẫu tại `src/lib/supabase.ts`
- `Vercel SPA rewrite` tại `vercel.json`

## Stack mục tiêu

- Frontend: React + Vite
- Backend platform: Supabase
- Database: Supabase Postgres
- Auth: Supabase Auth
- File storage: Supabase Storage
- Hosting: Vercel

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Điền các biến môi trường trong `.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Build

```bash
npm run build
```

## Trình tự nên làm tiếp

1. Tạo project Supabase và áp migration SQL.
2. Dựng auth + profile + tenant membership.
3. Làm CRUD cho catalog và process template.
4. Làm program/cohort/coachee.
5. Làm session, pre-work, output, action plan.
6. Thêm RLS policies và report MVP.

## Lưu ý

- `RLS` chưa được áp chi tiết trong migration hiện tại; phần đó nên làm cùng lúc với auth flow thật.
- MVP hiện ưu tiên `operational coaching platform`, chưa xử lý AI, maturity scoring sâu hoặc tích hợp enterprise phức tạp.
