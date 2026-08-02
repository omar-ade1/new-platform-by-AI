-- مراجعة باقي الجداول اللي بتكبر مع الاستخدام (مش بنك الأسئلة بس) — نفس مشكلة الـ migration
-- اللي فات (20260806): Postgres مبيعملش index تلقائي على أعمدة foreign key، وأي فلترة عليها
-- من غير index بتبقى seq scan كامل كل ما الجدول يكبر.
--
-- الجداول دي بتكبر مع الاستخدام الحقيقي (مش بيانات مدخلة يدوي زي courses/sections):
-- content_progress (كل مرة طالب يضغط "علّمها كمشاهدة")، enrollments و enrollment_requests
-- (كل تسجيل/طلب انضمام)، profiles (كل حساب طالب جديد).

create index if not exists content_progress_user_id_idx on content_progress (user_id);
create index if not exists content_progress_content_item_id_idx on content_progress (content_item_id);

create index if not exists enrollments_user_id_idx on enrollments (user_id);
create index if not exists enrollments_course_id_idx on enrollments (course_id);

create index if not exists enrollment_requests_user_id_idx on enrollment_requests (user_id);
create index if not exists enrollment_requests_course_id_idx on enrollment_requests (course_id);

create index if not exists profiles_role_idx on profiles (role);
