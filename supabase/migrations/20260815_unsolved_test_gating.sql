-- سؤال "غير محلول" = سؤال معندوش ولا اختيار عليه is_correct = true.
-- أي اختبار فيه سؤال واحد غير محلول يتحسب "قيد الإعداد": يختفي عن الطالب، ويفضل ظاهر للأدمن بس.

-- 1) RPC جديدة بترجع IDs بتوع الاختبارات (content_items) في دورة معينة اللي لسه فيها سؤال غير محلول.
--    security definer عشان الطالب (RLS بيمنعه يقرا questions/question_options مباشرة) يقدر يعرف
--    مين الاختبارات دي بس من غير ما يشوف محتواها الفعلي.
CREATE OR REPLACE FUNCTION "public"."get_unsolved_test_ids"("p_course_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(array_agg(distinct ci.id), '{}')
  from content_items ci
  join units u on u.id = ci.unit_id
  join sections s on s.id = u.section_id
  join test_questions tq on tq.test_id = ci.id
  join questions q on q.id = tq.question_id
  where s.course_id = p_course_id
    and ci.type = 'test'
    and not exists (
      select 1 from question_options qo where qo.question_id = q.id and qo.is_correct
    );
$$;

ALTER FUNCTION "public"."get_unsolved_test_ids"("p_course_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_unsolved_test_ids"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unsolved_test_ids"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unsolved_test_ids"("p_course_id" "uuid") TO "service_role";

-- 2) دفاع إضافي في get_test_for_attempt: حتى لو الطالب فتح رابط الاختبار مباشرة (بايباس للشجرة اللي بتخفيه)،
--    امنعه لو الاختبار لسه قيد الإعداد. الأدمن مستثنى عشان يقدر يعاينه وهو بيحلّه.
CREATE OR REPLACE FUNCTION "public"."get_test_for_attempt"("p_content_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  if not is_admin() and exists (
    select 1
    from test_questions tq2
    join questions q2 on q2.id = tq2.question_id
    where tq2.test_id = p_content_item_id
      and not exists (select 1 from question_options qo2 where qo2.question_id = q2.id and qo2.is_correct)
  ) then
    raise exception 'الاختبار ده لسه قيد الإعداد';
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

ALTER FUNCTION "public"."get_test_for_attempt"("p_content_item_id" "uuid") OWNER TO "postgres";

-- 3) نفس الدفاع في submit_test_attempt (لو حد نادى الـRPC ده مباشرة من غير ما يعدي بـget_test_for_attempt الأول).
CREATE OR REPLACE FUNCTION "public"."submit_test_attempt"("p_content_item_id" "uuid", "p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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

  if not is_admin() and exists (
    select 1
    from test_questions tq2
    join questions q2 on q2.id = tq2.question_id
    where tq2.test_id = p_content_item_id
      and not exists (select 1 from question_options qo2 where qo2.question_id = q2.id and qo2.is_correct)
  ) then
    raise exception 'الاختبار ده لسه قيد الإعداد';
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

ALTER FUNCTION "public"."submit_test_attempt"("p_content_item_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";
