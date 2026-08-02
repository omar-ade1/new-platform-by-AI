-- مراجعة "الأسئلة الغلط بس" — على مستوى قسم أو الدورة كلها.
-- محاولة مراجعة ممكن تجمع أسئلة من كذا اختبار مختلف في نفس الجلسة، فمينفعش نستخدم
-- submit_test_attempt (بترفض أي سؤال مش تابع لـ test_id واحد محدد). الحل: test_id بقى nullable،
-- ومحاولة المراجعة بتتسجل بـ test_id = null ("مش مرتبطة باختبار واحد بعينه"). "آخر إجابة" لأي
-- سؤال (اللي بيحدد هو لسه "غلط عنده" ولا لأ) بتتحسب من test_answers + completed_at بغض النظر
-- عن مصدرها (اختبار عادي أو مراجعة)، فمحتاجين مفيش جدول تتبّع إضافي خالص.

alter table test_attempts alter column test_id drop not null;

-- بترجع أسئلة الطالب اللي آخر إجابة سجّلها عليها كانت غلط (أو متسجّلش أصلاً)، في نطاق دورة
-- (أو قسم معيّن جواها لو p_section_id اتبعت)، بنفس شكل أسئلة get_test_for_attempt (من غير is_correct)
create or replace function get_wrong_questions(p_course_id uuid, p_section_id uuid default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (is_admin() or is_enrolled(p_course_id)) then
    raise exception 'مش مسموحلك تشوف أسئلة الدورة دي';
  end if;

  with scoped_questions as (
    select distinct q.id, q.question_text, q.passage_id
    from questions q
    join test_questions tq on tq.question_id = q.id
    join tests t on t.content_item_id = tq.test_id
    join content_items ci on ci.id = t.content_item_id
    join units u on u.id = ci.unit_id
    join sections s on s.id = u.section_id
    where s.course_id = p_course_id
      and (p_section_id is null or s.id = p_section_id)
  ),
  latest_answers as (
    select distinct on (ta.question_id) ta.question_id, ta.selected_option_id
    from test_answers ta
    join test_attempts att on att.id = ta.attempt_id
    join scoped_questions sq on sq.id = ta.question_id
    where att.user_id = auth.uid()
    order by ta.question_id, att.completed_at desc
  ),
  wrong_questions as (
    select la.question_id
    from latest_answers la
    left join question_options qo on qo.id = la.selected_option_id
    where la.selected_option_id is null or coalesce(qo.is_correct, false) = false
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
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
  ), '[]'::jsonb)
  into v_result
  from wrong_questions wq
  join questions q on q.id = wq.question_id
  left join reading_passages rp on rp.id = q.passage_id;

  return v_result;
end;
$$;

-- بتصحح جولة مراجعة (أسئلة ممكن تكون من كذا اختبار مختلف) سيرفر-سايد، وتسجّلها كمحاولة
-- بـ test_id = null، وترجع مراجعة تفصيلية بنفس شكل get_test_attempt_review
create or replace function submit_review_attempt(p_answers jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_attempt_id uuid;
  v_score int := 0;
  v_total int := 0;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_option_id uuid;
  v_is_correct boolean;
  v_course_id uuid;
  v_review jsonb;
begin
  insert into test_attempts (test_id, user_id, score, total_questions, completed_at)
  values (null, auth.uid(), 0, 0, now())
  returning id into v_attempt_id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_selected_option_id := nullif(v_answer->>'selected_option_id', '')::uuid;

    -- نتأكد إن السؤال ده تابع لدورة الطالب مسجّل فيها (أو أدمن) قبل ما نسجّل إجابته
    select s.course_id into v_course_id
    from questions q
    join test_questions tq on tq.question_id = q.id
    join tests t on t.content_item_id = tq.test_id
    join content_items ci on ci.id = t.content_item_id
    join units u on u.id = ci.unit_id
    join sections s on s.id = u.section_id
    where q.id = v_question_id
    limit 1;

    if v_course_id is null or not (is_admin() or is_enrolled(v_course_id)) then
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
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
  ), '[]'::jsonb)
  into v_review
  from test_answers ta
  join questions q on q.id = ta.question_id
  left join reading_passages rp on rp.id = q.passage_id
  where ta.attempt_id = v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'total_questions', v_total,
    'review', v_review
  );
end;
$$;
