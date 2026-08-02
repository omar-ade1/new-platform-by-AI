-- Run this in the Supabase SQL Editor. Creates a private storage bucket for
-- course files (PDFs etc.) and RLS policies that mirror the existing
-- is_admin()/is_enrolled() functions used everywhere else in the schema.
--
-- Files are uploaded under a path like {course_id}/{filename}, so the first
-- path segment is used to check enrollment in that specific course.

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

-- RLS مفعّلة أصلاً افتراضيًا على storage.objects في كل مشروع Supabase،
-- ومحاولة تفعيلها تاني بتدّي "must be owner of table objects" لأن الجدول ده
-- مملوك لـ supabase_storage_admin مش للـ role اللي بتشغّل بيه SQL Editor.

drop policy if exists "course_files_select" on storage.objects;
create policy "course_files_select" on storage.objects
  for select using (
    bucket_id = 'course-files'
    and (
      is_admin()
      or is_enrolled((storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists "course_files_insert" on storage.objects;
create policy "course_files_insert" on storage.objects
  for insert with check (bucket_id = 'course-files' and is_admin());

drop policy if exists "course_files_update" on storage.objects;
create policy "course_files_update" on storage.objects
  for update using (bucket_id = 'course-files' and is_admin());

drop policy if exists "course_files_delete" on storage.objects;
create policy "course_files_delete" on storage.objects
  for delete using (bucket_id = 'course-files' and is_admin());
