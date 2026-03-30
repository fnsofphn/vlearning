# Sprint 1 Demo Runbook

Mục tiêu của Sprint 1:
- App shell bám mock-up
- Đăng nhập bằng Supabase thật
- Executive Dashboard đọc từ schema course-centric mới
- Có dữ liệu demo đủ đẹp cho Dashboard, Hệ thống Khoá học và CRM
- Không phụ thuộc domain coaching cũ cho các màn mới

## 1. Chuẩn bị Supabase

Chạy theo đúng thứ tự sau trong SQL Editor:

1. `supabase/migrations/202603300001_coaching_mvp.sql`
   Ghi chú: chỉ giữ lại vì đang chứa hạ tầng chung `app.tenants`, `app.profiles`, `app.tenant_memberships`.
2. `supabase/migrations/202603300002_auth_profiles_and_memberships.sql`
3. `supabase/migrations/202603300003_public_account_access.sql`
4. `supabase/migrations/202603300100_vlearning_tms_foundation.sql`
5. `supabase/seeds/202603300001_bootstrap_workspace.sql`
6. `supabase/seeds/202603300003_vlearning_tms_demo_seed.sql`

## 2. Cấu hình app

Thiết lập `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3. Kết quả mong đợi sau khi seed

Dashboard phải có dữ liệu cho:
- 3 khách hàng
- 3 hợp đồng
- 3 khoá học
- 3 lớp học
- 3 buổi học
- 2 giảng viên
- 3 yêu cầu sản xuất học liệu
- 1 dashboard snapshot

## 4. Flow demo chuẩn Sprint 1

1. Đăng nhập vào hệ thống
2. Mở `Executive Dashboard`
3. Kiểm tra các stat cards và Kanban học liệu
4. Mở `Hợp đồng & Khách hàng`
5. Mở `Hệ thống Khoá học`
6. Kiểm tra lane phân công giảng viên và buổi học

## 5. Điều kiện hoàn thành Sprint 1

Sprint 1 được xem là hoàn thành khi:
- `npm run build` pass
- App đăng nhập được bằng Supabase thật
- Dashboard đọc từ schema course-centric mới
- CRM đọc từ `customers` và `contracts`
- Hệ thống Khoá học đọc từ `courses`, `course_classes`, `course_sessions`, `instructor_assignments`
- Các trạng thái `loading`, `empty`, `error`, `no membership` đều hiển thị đúng
- Không có query mới nào còn trỏ sang `coaching_programs`, `coaching_cohorts`, `program_assignments`, `coaching_sessions`

## 6. Nợ kỹ thuật đã chấp nhận ở cuối Sprint 1

- Chưa có CRUD thật cho CRM
- Chưa có wizard tạo Khoá học 4 bước
- Chưa có CRUD giảng viên
- Chưa có RLS chi tiết theo role mới của SRS v4
- Vẫn còn schema coaching cũ trong repo để giữ tương thích giai đoạn chuyển tiếp

## 7. Điểm bắt đầu của Sprint 2

Sprint 2 bắt đầu từ màn `Hợp đồng & Khách hàng` với 2 luồng chính:
- CRUD Khách hàng
- CRUD Hợp đồng

Từ đó Sprint 3 mới nối vào `Hệ thống Khoá học` một cách sạch sẽ.
