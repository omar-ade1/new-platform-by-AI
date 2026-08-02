-- Run this in the Supabase SQL Editor. Adds a request/approval flow on top of
-- the existing (fully manual) `enrollments` table: a student inserts a
-- 'pending' row here, the admin approves/rejects it from /admin/requests.
--
-- Approval is done from the app (insert into `enrollments` + update this row
-- to 'approved'), not from a DB trigger, so the existing is_enrolled()/RLS
-- setup on courses/sections/units/... is completely untouched by this.

create table if not exists enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- طالب واحد ميقدرش يكون عنده أكتر من طلب "قيد الانتظار" لنفس الدورة في نفس الوقت
create unique index if not exists enrollment_requests_one_pending_per_course
  on enrollment_requests (user_id, course_id)
  where status = 'pending';

create index if not exists enrollment_requests_status_idx on enrollment_requests (status);

alter table enrollment_requests enable row level security;

-- الطالب يبعت طلب لنفسه بس
drop policy if exists "students insert own enrollment request" on enrollment_requests;
create policy "students insert own enrollment request"
  on enrollment_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- الطالب يشوف طلباته هو بس، الأدمن يشوف الكل
drop policy if exists "view own or admin sees all enrollment requests" on enrollment_requests;
create policy "view own or admin sees all enrollment requests"
  on enrollment_requests for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- الأدمن بس اللي يقدر يوافق/يرفض (تعديل status/decided_at)
drop policy if exists "admin updates enrollment requests" on enrollment_requests;
create policy "admin updates enrollment requests"
  on enrollment_requests for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- الأدمن يقدر يمسح طلبات قديمة (تنضيف)
drop policy if exists "admin deletes enrollment requests" on enrollment_requests;
create policy "admin deletes enrollment requests"
  on enrollment_requests for delete
  to authenticated
  using (is_admin());
