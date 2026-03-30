# V-Learning TMS SRS v4 Mapping And Roadmap

Nguồn đối chiếu:
- SRS: `E:/tool/vculture 02/CN/VLearning_TMS_SRS_v4.docx`
- Mock-up: `E:/tool/vlearning-phase1/vlearning-tms-full (1).html`
- Migration nền mới: `supabase/migrations/202603300100_vlearning_tms_foundation.sql`

## Nguyên tắc chốt cho Sprint 0

1. Không mở rộng tiếp schema coaching cũ cho domain mới.
2. Giữ lại các bảng hạ tầng chung đang dùng được: `tenants`, `profiles`, `tenant_memberships`, `audit_logs`.
3. Dựng domain mới theo trục `course-centric` để khớp SRS v4.
4. Giao diện bám mock-up hiện tại, nhưng mọi dữ liệu thật từ đây trở đi phải map vào schema mới.
5. Mỗi sprint phải tạo được một bản demo tăng trưởng, không làm phần nào xong rồi bỏ.

## Mapping Chi Tiết

| Mock-up screen | Yêu cầu SRS v4 | Entity/Bảng Supabase | Mức ưu tiên | Phiên bản triển khai |
|---|---|---|---|---|
| Executive Dashboard | Control Tower real-time, KPI tổng hợp, cảnh báo rủi ro | `courses`, `course_classes`, `course_sessions`, `contracts`, `content_requests`, `course_risks`, `dashboard_snapshots` | P0 | V1 |
| Hệ thống Khoá học / Khởi tạo | Tạo khoá học 4 bước, trạng thái Nháp -> Chuẩn bị -> Triển khai | `courses`, `course_types`, `customers`, `contracts`, `course_attachments`, `course_timeline_milestones`, `course_readiness_checks` | P0 | V1 |
| Hệ thống Khoá học / Danh sách & filter | Danh sách khoá học, filter đa chiều | `courses`, `customers`, `contracts`, `course_types` | P0 | V1 |
| Hệ thống Khoá học / Toàn cảnh | Group theo khách hàng, loại hình, KPI đúng hạn | query từ `courses`, `contracts`, `course_timeline_milestones`, `dashboard_snapshots` | P0 | V1 |
| Chi tiết Lớp học & HV | Lớp, học viên, buổi học, trạng thái triển khai | `course_classes`, `learners`, `class_learners`, `course_sessions`, `attendance_records` | P1 | V1.5 |
| Chi tiết Lớp học & HV / Phân công GV | GV chính, GV backup theo lớp và buổi | `instructors`, `instructor_assignments`, `course_classes`, `course_sessions` | P1 | V1.5 |
| Hợp đồng & Khách hàng | Quản lý khách hàng, hợp đồng, checklist nghiệm thu | `customers`, `customer_contacts`, `contracts`, `contract_acceptance_checklists` | P0 | V1 |
| Giảng viên | Danh sách, tuyển chọn, chấm điểm, readiness, HĐ online | `instructors`, `instructor_certificates`, `instructor_specialties`, `instructor_quality_reviews`, `instructor_readiness` | P0 | V1 |
| Vận hành Lớp học | Khai/bế giảng, điểm danh, checklist ekip | `course_classes`, `course_sessions`, `attendance_records`, bảng vận hành bổ sung ở sprint sau | P1 | V1.5 |
| Sản xuất Học liệu / Kanban | E2E workflow, priority queue, tồn tại theo khoá | `content_requests`, `content_workflow_steps`, `content_assets`, `content_reuse_links` | P1 | V1.5 |
| Giáo án giảng dạy | Workflow 7 bước, giáo án theo buổi/chuyên đề | `lesson_plans`, `lesson_plan_feedback` | P1 | V1.5 |
| Quản lý Tổng thể | Tải giảng viên, readiness ekip, cảnh báo | `workload_snapshots`, `course_risks`, `instructor_assignments`, `instructor_readiness` | P1 | V1.5 |
| E-learning & LMS | Danh mục bài giảng, QC, activate, tracking | `lms_courses`, `lms_packages` | P2 | V2 |
| Khung Năng lực | HEART, gap analysis, NL ↔ khoá | `competency_frameworks`, `competencies`, `course_competencies` | P2 | V2 |
| Báo cáo & Phân tích | KPI, ROI, hiệu quả đào tạo, NL | bảng tổng hợp/report từ domain chính | P2 | V2 |
| Gamification | Asset game, XP, badge, leaderboard | bảng riêng ở V2 | P3 | V2 |
| Quản trị & phân quyền | Role-based access theo SRS | tái dùng `profiles`, `tenant_memberships`, bổ sung phân quyền chi tiết sau | P0 | V1 |

## Phạm Vi V1 Nên Chốt

V1 chỉ nên gồm các lát cắt đủ để demo end-to-end:
- Đăng nhập và membership thật
- Executive Dashboard
- CRM: khách hàng + hợp đồng
- Hệ thống Khoá học: tạo khoá, danh sách, filter, toàn cảnh
- Giảng viên: danh sách + phân công cơ bản
- Chi tiết Lớp học & HV ở mức tối thiểu để course có cấu trúc thực thi

Luồng demo chuẩn của V1:
`Khách hàng/Hợp đồng -> Tạo Khoá học -> Phân công Giảng viên -> Dashboard hiển thị`

## Roadmap Mới Theo Sprint

### Sprint 0: Re-foundation
- Chốt mapping SRS v4 -> mock-up -> schema
- Tạo migration nền course-centric mới
- Giữ nguyên shell UI, tách dần logic cũ khỏi domain coaching
- Chuẩn bị dữ liệu seed theo tenant demo mới

### Sprint 1: Foundation UI + Access
- Shell React bám mock-up toàn hệ thống
- Đăng nhập thật, membership thật
- Executive Dashboard dùng query tổng hợp từ schema mới
- Loading / empty / error / no-access states chuẩn

### Sprint 2: CRM
- CRUD Khách hàng
- CRUD Hợp đồng
- Checklist nghiệm thu cơ bản
- Seed demo khách hàng và hợp đồng

### Sprint 3: Hệ thống Khoá học
- Tạo Khoá học 4 bước
- Danh sách khoá học + filter
- Toàn cảnh khoá học theo khách hàng và loại hình
- Gắn khóa với hợp đồng, khung năng lực, loại hình

### Sprint 4: Giảng viên
- CRUD giảng viên
- Chứng chỉ, chuyên môn, điểm chất lượng
- Readiness cơ bản
- Phân công giảng viên theo khoá

### Sprint 5: Lớp học & Học viên
- Tạo lớp từ khoá học
- Danh sách học viên
- Buổi học / session cơ bản
- Phân công GV theo lớp và buổi

### Sprint 6: Vận hành + Giáo án + Workload
- Điểm danh
- Checklist vận hành
- Giáo án rút gọn theo buổi
- Workload và cảnh báo readiness

### Sprint 7: Sản xuất Học liệu
- Yêu cầu sản xuất theo khoá
- Kanban tiến trình
- Priority queue
- Asset library bản đầu

### Sprint 8: V2 Extension
- E-learning & LMS
- Khung Năng lực nâng cao
- Báo cáo & Phân tích
- Gamification
- Permission hardening + QA

## Khuyến nghị kỹ thuật

- Không cố chuyển dữ liệu cũ từ schema coaching sang domain mới bằng cách rename bảng; dễ gây nhiễu nghĩa nghiệp vụ.
- Tạm thời giữ schema coaching cũ để app hiện tại không vỡ trong lúc refactor.
- Mọi màn mới từ Sprint 1 trở đi nên đọc từ schema mới.
- Khi đủ ổn định, mới xóa dần dependency vào các bảng coaching cũ trong frontend.
