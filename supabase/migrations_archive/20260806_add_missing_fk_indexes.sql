-- Postgres مبيعملش index تلقائي على أعمدة foreign key.
-- بعد نقل بيانات Neon (11,884 سؤال، 46,303 اختيار، 11,591 ربط سؤال-اختبار)، أي فلترة/join
-- على الأعمدة دي بقت seq scan كامل على جداول عشرات الآلاف من الصفوف، وده سبب
-- "canceling statement due to statement timeout" (57014) لما بنك الأسئلة يجيب أسئلة تصنيف معيّن
-- (فلترة questions.category_id + embed question_options.question_id في نفس الاستعلام).

create index if not exists questions_category_id_idx on questions (category_id);
create index if not exists questions_passage_id_idx on questions (passage_id);
create index if not exists question_options_question_id_idx on question_options (question_id);
create index if not exists reading_passages_category_id_idx on reading_passages (category_id);
create index if not exists question_categories_parent_id_idx on question_categories (parent_id);

create index if not exists test_questions_test_id_idx on test_questions (test_id);
create index if not exists test_questions_question_id_idx on test_questions (question_id);

create index if not exists test_attempts_user_id_idx on test_attempts (user_id);
create index if not exists test_attempts_test_id_idx on test_attempts (test_id);

create index if not exists test_answers_attempt_id_idx on test_answers (attempt_id);
create index if not exists test_answers_question_id_idx on test_answers (question_id);
