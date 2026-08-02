-- Run this in the Supabase SQL Editor. Adds shared reading-comprehension
-- passages to the question bank: several questions can point to the same
-- passage, so its body is shown once and its questions listed under it
-- (e.g. "استيعاب المقروء" style questions).
--
-- Kept admin-only for now (unlike questions/question_options, which enrolled
-- students can already read — see the known is_correct exposure noted in
-- CLAUDE.md). Passages should get the same student-visibility redesign
-- together with that fix when the test-taking flow is built, not before.

create table if not exists reading_passages (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references question_categories(id) on delete cascade,
  title text not null,
  body text not null,
  order_index integer not null default 1
);

-- سؤال ممكن يتحط تحت نص مشترك (اختياري) — لو النص اتمسح، السؤال بيفضل موجود من غير نص
alter table questions add column if not exists passage_id uuid references reading_passages(id) on delete set null;

alter table reading_passages enable row level security;

drop policy if exists "admin manages reading passages" on reading_passages;
create policy "admin manages reading passages"
  on reading_passages for all
  to authenticated
  using (is_admin())
  with check (is_admin());
