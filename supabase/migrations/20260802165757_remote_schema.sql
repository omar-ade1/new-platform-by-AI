


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_test_attempt_review"("p_attempt_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_test_attempt_review"("p_attempt_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_topic_performance"("p_user_id" "uuid", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_from_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_result jsonb;
begin
  if not (is_admin() or p_user_id = auth.uid()) then
    raise exception 'مش مسموحلك تشوف بيانات الطالب ده';
  end if;

  with recursive category_root as (
    select id, id as root_id, title as root_title
    from question_categories
    where parent_id is null
    union all
    select c.id, cr.root_id, cr.root_title
    from question_categories c
    join category_root cr on c.parent_id = cr.id
  ),
  scoped_answers as (
    select ta.question_id, ta.selected_option_id
    from test_answers ta
    join test_attempts att on att.id = ta.attempt_id
    join content_items ci on ci.id = att.test_id
    join units u on u.id = ci.unit_id
    join sections s on s.id = u.section_id
    where att.user_id = p_user_id
      and (p_course_id is null or s.course_id = p_course_id)
      and (p_from_date is null or att.completed_at >= p_from_date)
      and (p_to_date is null or att.completed_at <= p_to_date)
  ),
  counts as (
    select q.category_id,
      count(*) as total,
      count(*) filter (where qo.is_correct) as correct
    from scoped_answers sa
    join questions q on q.id = sa.question_id
    left join question_options qo on qo.id = sa.selected_option_id
    group by q.category_id
  ),
  -- بنجمّع تاني حسب التصنيف الرئيسي، لأن ممكن أكتر من تصنيف فرعي (مختلفين في category_id)
  -- يرجعوا لنفس التصنيف الرئيسي، ولازم يتحسبوا مع بعض مش كل واحد لوحده
  rolled_up as (
    select cr.root_id, cr.root_title, sum(counts.total) as total, sum(counts.correct) as correct
    from counts
    join category_root cr on cr.id = counts.category_id
    group by cr.root_id, cr.root_title
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category_id', root_id,
      'category_title', root_title,
      'total', total,
      'correct', correct
    )
  ), '[]'::jsonb)
  into v_result
  from rolled_up;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_topic_performance"("p_user_id" "uuid", "p_course_id" "uuid", "p_from_date" timestamp with time zone, "p_to_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid" DEFAULT NULL::"uuid", "p_test_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid", "p_test_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled"("cid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from enrollments
    where course_id = cid
      and user_id = auth.uid()
      and (expires_at is null or expires_at > now())
  );
$$;


ALTER FUNCTION "public"."is_enrolled"("cid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_review_attempt"("p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."submit_review_attempt"("p_answers" "jsonb") OWNER TO "postgres";


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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."content_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "item_group_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_items_type_check" CHECK (("type" = ANY (ARRAY['video'::"text", 'file'::"text", 'note'::"text", 'test'::"text"])))
);


ALTER TABLE "public"."content_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_item_id" "uuid" NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "times_seen" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."content_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollment_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decided_at" timestamp with time zone,
    CONSTRAINT "enrollment_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."enrollment_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."files" (
    "content_item_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "file_size_kb" integer
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "color" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."item_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "content_item_id" "uuid" NOT NULL,
    "body" "text" NOT NULL
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'student'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "title" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."question_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_text" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "category_id" "uuid",
    "passage_id" "uuid"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_passages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "order_index" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."reading_passages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_option_id" "uuid"
);


ALTER TABLE "public"."test_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "total_questions" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."test_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."test_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "content_item_id" "uuid" NOT NULL,
    "time_limit_minutes" integer
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "content_item_id" "uuid" NOT NULL,
    "video_url" "text" NOT NULL,
    "duration_seconds" integer
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_progress"
    ADD CONSTRAINT "content_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_progress"
    ADD CONSTRAINT "content_progress_user_id_content_item_id_key" UNIQUE ("user_id", "content_item_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollment_requests"
    ADD CONSTRAINT "enrollment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("content_item_id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("content_item_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_categories"
    ADD CONSTRAINT "question_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_passages"
    ADD CONSTRAINT "reading_passages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_test_id_question_id_key" UNIQUE ("test_id", "question_id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("content_item_id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("content_item_id");



CREATE INDEX "content_progress_content_item_id_idx" ON "public"."content_progress" USING "btree" ("content_item_id");



CREATE INDEX "content_progress_user_id_idx" ON "public"."content_progress" USING "btree" ("user_id");



CREATE INDEX "enrollment_requests_course_id_idx" ON "public"."enrollment_requests" USING "btree" ("course_id");



CREATE UNIQUE INDEX "enrollment_requests_one_pending_per_course" ON "public"."enrollment_requests" USING "btree" ("user_id", "course_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "enrollment_requests_status_idx" ON "public"."enrollment_requests" USING "btree" ("status");



CREATE INDEX "enrollment_requests_user_id_idx" ON "public"."enrollment_requests" USING "btree" ("user_id");



CREATE INDEX "enrollments_course_id_idx" ON "public"."enrollments" USING "btree" ("course_id");



CREATE INDEX "enrollments_user_id_idx" ON "public"."enrollments" USING "btree" ("user_id");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "question_categories_parent_id_idx" ON "public"."question_categories" USING "btree" ("parent_id");



CREATE INDEX "question_options_question_id_idx" ON "public"."question_options" USING "btree" ("question_id");



CREATE INDEX "questions_category_id_idx" ON "public"."questions" USING "btree" ("category_id");



CREATE INDEX "questions_passage_id_idx" ON "public"."questions" USING "btree" ("passage_id");



CREATE INDEX "reading_passages_category_id_idx" ON "public"."reading_passages" USING "btree" ("category_id");



CREATE INDEX "test_answers_attempt_id_idx" ON "public"."test_answers" USING "btree" ("attempt_id");



CREATE INDEX "test_answers_question_id_idx" ON "public"."test_answers" USING "btree" ("question_id");



CREATE INDEX "test_attempts_test_id_idx" ON "public"."test_attempts" USING "btree" ("test_id");



CREATE INDEX "test_attempts_user_id_idx" ON "public"."test_attempts" USING "btree" ("user_id");



CREATE INDEX "test_questions_question_id_idx" ON "public"."test_questions" USING "btree" ("question_id");



CREATE INDEX "test_questions_test_id_idx" ON "public"."test_questions" USING "btree" ("test_id");



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "public"."item_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_progress"
    ADD CONSTRAINT "content_progress_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_progress"
    ADD CONSTRAINT "content_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollment_requests"
    ADD CONSTRAINT "enrollment_requests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollment_requests"
    ADD CONSTRAINT "enrollment_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_categories"
    ADD CONSTRAINT "question_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."question_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."question_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "public"."reading_passages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reading_passages"
    ADD CONSTRAINT "reading_passages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."question_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("id");



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("content_item_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("content_item_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



CREATE POLICY "admin deletes enrollment requests" ON "public"."enrollment_requests" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admin manages reading passages" ON "public"."reading_passages" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin updates enrollment requests" ON "public"."enrollment_requests" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."content_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollment_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reading_passages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students insert own enrollment request" ON "public"."enrollment_requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."test_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view own or admin sees all enrollment requests" ON "public"."enrollment_requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "الأدمن بس يتحكم في التصنيفات" ON "public"."question_categories" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يتحكم في ربط الأسئلة" ON "public"."test_questions" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يحذف إجابات" ON "public"."test_answers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يحذف محاولات" ON "public"."test_attempts" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يسجل الطلاب في الدورات" ON "public"."enrollments" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف أسئلة" ON "public"."questions" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف أقسام" ON "public"."sections" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف إجابات" ON "public"."test_answers" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف اختبارات" ON "public"."tests" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف اختيارات" ON "public"."question_options" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف جروبات" ON "public"."item_groups" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف دورات" ON "public"."courses" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف عناصر" ON "public"."content_items" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف فيديوهات" ON "public"."videos" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف محاولات" ON "public"."test_attempts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف ملاحظات" ON "public"."notes" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف ملفات" ON "public"."files" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يضيف وحدات" ON "public"."units" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "الأدمن بس يعدل إجابات" ON "public"."test_answers" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يعدل محاولات" ON "public"."test_attempts" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يقرا الأسئلة" ON "public"."questions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن بس يقرا الاختيارات" ON "public"."question_options" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "الأدمن يتحكم كامل في الإجابات" ON "public"."test_answers" USING ("public"."is_admin"());



CREATE POLICY "الأدمن يتحكم كامل في التقدم" ON "public"."content_progress" USING ("public"."is_admin"());



CREATE POLICY "الأدمن يتحكم كامل في المحاولات" ON "public"."test_attempts" USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الأسئلة" ON "public"."questions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الأقسام" ON "public"."sections" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الاختبارات" ON "public"."tests" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الاختيارات" ON "public"."question_options" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الجروبات" ON "public"."item_groups" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الدورات" ON "public"."courses" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف العناصر" ON "public"."content_items" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الفيديوهات" ON "public"."videos" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الملاحظات" ON "public"."notes" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الملفات" ON "public"."files" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يحذف الوحدات" ON "public"."units" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الأسئلة" ON "public"."questions" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الأقسام" ON "public"."sections" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الاختبارات" ON "public"."tests" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الاختيارات" ON "public"."question_options" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الجروبات" ON "public"."item_groups" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الدورات" ON "public"."courses" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل العناصر" ON "public"."content_items" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الفيديوهات" ON "public"."videos" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الملاحظات" ON "public"."notes" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الملفات" ON "public"."files" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعدل الوحدات" ON "public"."units" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "الأدمن يعمل أي حاجة في البروفايلات" ON "public"."profiles" USING ("public"."is_admin"());



CREATE POLICY "الطالب يحدث تقدمه بس" ON "public"."content_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "الطالب يسجل تقدمه بس" ON "public"."content_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "الطالب يشوف إجاباته بس" ON "public"."test_answers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."test_attempts"
  WHERE (("test_attempts"."id" = "test_answers"."attempt_id") AND ("test_attempts"."user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "الطالب يشوف تسجيله بس" ON "public"."enrollments" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "الطالب يشوف تقدمه بس" ON "public"."content_progress" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "الطالب يشوف محاولاته بس" ON "public"."test_attempts" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "الكل يقرا التصنيفات" ON "public"."question_categories" FOR SELECT USING (true);



CREATE POLICY "الكل يقرا الدورات" ON "public"."courses" FOR SELECT USING (true);



CREATE POLICY "المستخدم يشوف بروفايله بس" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "المستخدم يعدل بروفايله بس" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "المستخدم ينشئ بروفايله وقت التسجي" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "المسجلين بس يقروا الأقسام" ON "public"."sections" FOR SELECT USING (("public"."is_enrolled"("course_id") OR "public"."is_admin"()));



CREATE POLICY "المسجلين بس يقروا الاختبارات" ON "public"."tests" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM (("public"."content_items" "ci"
     JOIN "public"."units" "u" ON (("u"."id" = "ci"."unit_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("ci"."id" = "tests"."content_item_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا الجروبات" ON "public"."item_groups" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."units" "u"
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("u"."id" = "item_groups"."unit_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا العناصر" ON "public"."content_items" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."units" "u"
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("u"."id" = "content_items"."unit_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا الفيديوهات" ON "public"."videos" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM (("public"."content_items" "ci"
     JOIN "public"."units" "u" ON (("u"."id" = "ci"."unit_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("ci"."id" = "videos"."content_item_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا الملاحظات" ON "public"."notes" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM (("public"."content_items" "ci"
     JOIN "public"."units" "u" ON (("u"."id" = "ci"."unit_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("ci"."id" = "notes"."content_item_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا الملفات" ON "public"."files" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM (("public"."content_items" "ci"
     JOIN "public"."units" "u" ON (("u"."id" = "ci"."unit_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("ci"."id" = "files"."content_item_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين بس يقروا الوحدات" ON "public"."units" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."sections" "s"
  WHERE (("s"."id" = "units"."section_id") AND "public"."is_enrolled"("s"."course_id"))))));



CREATE POLICY "المسجلين يقروا ربط أسئلة اختبارات" ON "public"."test_questions" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ((("public"."tests" "t"
     JOIN "public"."content_items" "ci" ON (("ci"."id" = "t"."content_item_id")))
     JOIN "public"."units" "u" ON (("u"."id" = "ci"."unit_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "u"."section_id")))
  WHERE (("t"."content_item_id" = "test_questions"."test_id") AND "public"."is_enrolled"("s"."course_id"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_test_attempt_review"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_attempt_review"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_attempt_review"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_for_attempt"("p_content_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_for_attempt"("p_content_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_for_attempt"("p_content_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topic_performance"("p_user_id" "uuid", "p_course_id" "uuid", "p_from_date" timestamp with time zone, "p_to_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_topic_performance"("p_user_id" "uuid", "p_course_id" "uuid", "p_from_date" timestamp with time zone, "p_to_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topic_performance"("p_user_id" "uuid", "p_course_id" "uuid", "p_from_date" timestamp with time zone, "p_to_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid", "p_test_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid", "p_test_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wrong_questions"("p_course_id" "uuid", "p_section_id" "uuid", "p_test_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled"("cid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled"("cid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled"("cid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_review_attempt"("p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_review_attempt"("p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_review_attempt"("p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_test_attempt"("p_content_item_id" "uuid", "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_test_attempt"("p_content_item_id" "uuid", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_test_attempt"("p_content_item_id" "uuid", "p_answers" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."content_items" TO "anon";
GRANT ALL ON TABLE "public"."content_items" TO "authenticated";
GRANT ALL ON TABLE "public"."content_items" TO "service_role";



GRANT ALL ON TABLE "public"."content_progress" TO "anon";
GRANT ALL ON TABLE "public"."content_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."content_progress" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."enrollment_requests" TO "anon";
GRANT ALL ON TABLE "public"."enrollment_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollment_requests" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT ALL ON TABLE "public"."item_groups" TO "anon";
GRANT ALL ON TABLE "public"."item_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."item_groups" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."question_categories" TO "anon";
GRANT ALL ON TABLE "public"."question_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."question_categories" TO "service_role";



GRANT ALL ON TABLE "public"."question_options" TO "anon";
GRANT ALL ON TABLE "public"."question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."question_options" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."reading_passages" TO "anon";
GRANT ALL ON TABLE "public"."reading_passages" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_passages" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."test_answers" TO "anon";
GRANT ALL ON TABLE "public"."test_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."test_answers" TO "service_role";



GRANT ALL ON TABLE "public"."test_attempts" TO "anon";
GRANT ALL ON TABLE "public"."test_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."test_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."test_questions" TO "anon";
GRANT ALL ON TABLE "public"."test_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_questions" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "course_files_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'course-files'::text) AND public.is_admin()));



  create policy "course_files_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'course-files'::text) AND public.is_admin()));



  create policy "course_files_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'course-files'::text) AND (public.is_admin() OR public.is_enrolled(((storage.foldername(name))[1])::uuid))));



  create policy "course_files_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'course-files'::text) AND public.is_admin()));



