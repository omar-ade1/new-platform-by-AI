-- صفحة حل الاختبار للطالب
-- 1) قفل ثغرة is_correct: نمسح أي SELECT policy حالية على questions/question_options
--    (بغض النظر عن اسمها بالظبط) ونستبدلها بـ policy تقتصر على is_admin() بس.
--    من دلوقتي وصول الطالب للأسئلة/الاختيارات بيبقى عن طريق الدوال (security definer) تحت بس.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('questions', 'question_options')
      and cmd = 'SELECT'
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

create policy "الأدمن بس يقرا الأسئلة"
  on questions for select
  to authenticated
  using (is_admin());

create policy "الأدمن بس يقرا الاختيارات"
  on question_options for select
  to authenticated
  using (is_admin());

-- 2) get_test_for_attempt: بترجع أسئلة الاختبار (من غير is_correct) للطالب المسجّل أو الأدمن
create or replace function get_test_for_attempt(p_content_item_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_course_id uuid;
  v_result jsonb;
begin
  select s.course_id into v_course_id
  from content_items ci
  join units u on u.id = ci.unit_id
  join sections s on s.id = u.section_id
  where ci.id = p_content_item_id
    and ci.type = 'test';

  if v_course_id is null then
    raise exception 'الاختبار غير موجود';
  end if;

  if not (is_admin() or is_enrolled(v_course_id)) then
    raise exception 'مش مسموحلك تشوف الاختبار ده';
  end if;

  select jsonb_build_object(
    'content_item_id', p_content_item_id,
    'time_limit_minutes', t.time_limit_minutes,
    'questions', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'order_index', tq.order_index,
          'passage', case
            when rp.id is not null then jsonb_build_object('id', rp.id, 'title', rp.title, 'body', rp.body)
            else null
          end,
          'options', (
            select coalesce(jsonb_agg(
              jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'order_index', qo.order_index)
              order by qo.order_index
            ), '[]'::jsonb)
            from question_options qo
            where qo.question_id = q.id
          )
        )
        order by tq.order_index
      ) filter (where q.id is not null),
      '[]'::jsonb
    )
  )
  into v_result
  from tests t
  left join test_questions tq on tq.test_id = t.content_item_id
  left join questions q on q.id = tq.question_id
  left join reading_passages rp on rp.id = q.passage_id
  where t.content_item_id = p_content_item_id
  group by t.content_item_id, t.time_limit_minutes;

  return v_result;
end;
$$;

-- 3) submit_test_attempt: بتصحح إجابات الطالب سيرفر-سايد وتسجّل المحاولة
--    p_answers شكلها: [{"question_id": "...", "selected_option_id": "..."}, ...]
create or replace function submit_test_attempt(p_content_item_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_course_id uuid;
  v_attempt_id uuid;
  v_score int := 0;
  v_total int := 0;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_option_id uuid;
  v_is_correct boolean;
  v_review jsonb;
begin
  select s.course_id into v_course_id
  from content_items ci
  join units u on u.id = ci.unit_id
  join sections s on s.id = u.section_id
  where ci.id = p_content_item_id
    and ci.type = 'test';

  if v_course_id is null then
    raise exception 'الاختبار غير موجود';
  end if;

  if not (is_admin() or is_enrolled(v_course_id)) then
    raise exception 'مش مسموحلك تحل الاختبار ده';
  end if;

  insert into test_attempts (test_id, user_id, score, total_questions, completed_at)
  values (p_content_item_id, auth.uid(), 0, 0, now())
  returning id into v_attempt_id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_selected_option_id := nullif(v_answer->>'selected_option_id', '')::uuid;

    -- نتأكد إن السؤال ده فعلاً منتمي للاختبار ده
    if not exists (
      select 1 from test_questions tq
      where tq.test_id = p_content_item_id and tq.question_id = v_question_id
    ) then
      continue;
    end if;

    v_is_correct := false;
    if v_selected_option_id is not null then
      select qo.is_correct into v_is_correct
      from question_options qo
      where qo.id = v_selected_option_id and qo.question_id = v_question_id;
      v_is_correct := coalesce(v_is_correct, false);
    end if;

    insert into test_answers (attempt_id, question_id, selected_option_id)
    values (v_attempt_id, v_question_id, v_selected_option_id);

    v_total := v_total + 1;
    if v_is_correct then
      v_score := v_score + 1;
    end if;
  end loop;

  update test_attempts
  set score = v_score, total_questions = v_total
  where id = v_attempt_id;

  select get_test_attempt_review(v_attempt_id) into v_review;

  return v_review;
end;
$$;

-- 4) get_test_attempt_review: بترجع مراجعة تفصيلية لمحاولة (بتاعة نفس المستخدم أو للأدمن)
create or replace function get_test_attempt_review(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_owner uuid;
  v_test_id uuid;
  v_score int;
  v_total int;
  v_review jsonb;
begin
  select user_id, test_id, score, total_questions
  into v_owner, v_test_id, v_score, v_total
  from test_attempts
  where id = p_attempt_id;

  if v_owner is null then
    raise exception 'المحاولة غير موجودة';
  end if;

  if not (is_admin() or v_owner = auth.uid()) then
    raise exception 'مش مسموحلك تشوف المحاولة دي';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'order_index', tq.order_index,
      'selected_option_id', ta.selected_option_id,
      'passage', case
        when rp.id is not null then jsonb_build_object('id', rp.id, 'title', rp.title, 'body', rp.body)
        else null
      end,
      'options', (
        select coalesce(jsonb_agg(
          jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'order_index', qo.order_index, 'is_correct', qo.is_correct)
          order by qo.order_index
        ), '[]'::jsonb)
        from question_options qo
        where qo.question_id = q.id
      )
    )
    order by tq.order_index
  ), '[]'::jsonb)
  into v_review
  from test_answers ta
  join questions q on q.id = ta.question_id
  left join test_questions tq on tq.test_id = v_test_id and tq.question_id = q.id
  left join reading_passages rp on rp.id = q.passage_id
  where ta.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score', v_score,
    'total_questions', v_total,
    'review', v_review
  );
end;
$$;
