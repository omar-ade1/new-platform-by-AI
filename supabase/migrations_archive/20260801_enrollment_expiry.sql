-- Run this in the Supabase SQL Editor. Adds an optional expiry to enrollments
-- so the admin can grant a student access for a fixed period. Enforcement is
-- lazy (checked live against now()), not a scheduled job, so it can't drift
-- out of sync — the moment expires_at passes, is_enrolled() starts returning
-- false and every RLS policy built on it (courses, sections, units,
-- content_items, storage.objects, ...) revokes access immediately.
--
-- expires_at = null means "no timer" (today's default behaviour, unchanged).

alter table enrollments add column if not exists expires_at timestamptz;

create or replace function is_enrolled(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from enrollments
    where course_id = cid
      and user_id = auth.uid()
      and (expires_at is null or expires_at > now())
  );
$$;
