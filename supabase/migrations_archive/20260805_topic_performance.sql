-- نقاط القوة والضعف: بتجمّع إجابات الطالب حسب التصنيف الرئيسي (أعلى جد في شجرة question_categories)
-- عشان الطالب (وبعدين الأدمن) يشوف هو قوي فين وضعيف فين، مش الدرجة الكلية بس.
-- p_user_id: الطالب المطلوب تحليله (لازم يكون هو نفسه أو الأدمن).
-- p_course_id / p_from_date / p_to_date: فلاتر اختيارية (بتتفعّل من صفحة تقارير الأدمن).
create or replace function get_topic_performance(
  p_user_id uuid,
  p_course_id uuid default null,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
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
