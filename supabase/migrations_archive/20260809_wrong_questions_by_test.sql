-- إضافة نطاق تالت لـ get_wrong_questions: اختبار واحد بعينه (p_test_id)، عشان لينك
-- "راجع أسئلتك الغلط" على شاشة نتيجة الاختبار يقتصر على أسئلة الاختبار ده بس —
-- مش القسم كله ولا الدورة كلها.
create or replace function get_wrong_questions(p_course_id uuid, p_section_id uuid default null, p_test_id uuid default null)
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
      and (p_test_id is null or t.content_item_id = p_test_id)
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
