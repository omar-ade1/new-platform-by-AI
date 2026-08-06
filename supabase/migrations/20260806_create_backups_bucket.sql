-- Bucket خاص (مش public) لتخزين نسخ احتياطية من قاعدة البيانات (pg_dump) مرفوعة من
-- سكريبت scripts/ops/backup-supabase.sh الشغال على الـVPS. مفيش أي RLS policy له عمدًا —
-- service_role بيتخطى RLS تلقائي، فمفيش داعي لسياسة، والغياب ده بيمنع أي وصول لأي حد
-- تاني (anon/authenticated) بشكل افتراضي، وده بالظبط المطلوب لبيانات حساسة زي دي.
insert into storage.buckets (id, name, public)
values ('db-backups', 'db-backups', false)
on conflict (id) do nothing;
