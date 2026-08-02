-- بعد ما بنينا صفحة حل الاختبار، تسجيل النتيجة بيحصل بس من خلال دالة submit_test_attempt
-- (security definer، بتحسب الصح سيرفر-سايد وبتتجاوز RLS بنفس أسلوب is_admin()/is_enrolled()).
-- المفروض مفيش أي سبب يخلّي الطالب يقدر يعمل insert/update/delete مباشر على test_attempts
-- أو test_answers عن طريق الـ API — لو فيه policy قديمة سايبة الباب مفتوح، طالب شاطر
-- يقدر يبعت لنفسه درجة مزوّرة من غير ما يعدي على الدالة خالص.
--
-- زي ما عملنا مع questions/question_options، بنمسح أي INSERT/UPDATE/DELETE policy حالية
-- على الجدولين دول (من غير ما نحتاج نعرف اسمها بالظبط) ونستبدلها بصلاحية أدمن بس.
-- ملحوظة: مبنمسحش SELECT policies خالص — صفحة الحساب لسه محتاجة الطالب يقرا محاولاته بنفسه.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('test_attempts', 'test_answers')
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

create policy "الأدمن بس يضيف محاولات" on test_attempts for insert to authenticated with check (is_admin());
create policy "الأدمن بس يعدل محاولات" on test_attempts for update to authenticated using (is_admin());
create policy "الأدمن بس يحذف محاولات" on test_attempts for delete to authenticated using (is_admin());

create policy "الأدمن بس يضيف إجابات" on test_answers for insert to authenticated with check (is_admin());
create policy "الأدمن بس يعدل إجابات" on test_answers for update to authenticated using (is_admin());
create policy "الأدمن بس يحذف إجابات" on test_answers for delete to authenticated using (is_admin());
