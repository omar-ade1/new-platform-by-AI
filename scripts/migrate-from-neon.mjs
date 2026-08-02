// نقل بيانات المنصة القديمة (Neon) للمنصة الجديدة (Supabase).
// - القراءة من Neon: read-only transaction دايمًا (زي سكريبتات الفحص).
// - الكتابة في Supabase: بس لو شغّلت السكريبت بـ --commit، وكلها جوه transaction واحدة
//   (لو أي خطوة فشلت، كل حاجة بترجع زي ما كانت - rollback كامل).
// - من غير --commit: بيشتغل "dry run" بس - بيطبع ملخص وعينات من غير ما يكتب حاجة في Supabase خالص.
import crypto from "node:crypto";
import pg from "pg";

const COMMIT = process.argv.includes("--commit");

const neonUrl = process.env.NEON_DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!neonUrl) {
  console.error("مفيش NEON_DATABASE_URL في .env.migration.local");
  process.exit(1);
}
if (COMMIT && !supabaseUrl) {
  console.error("مفيش SUPABASE_DATABASE_URL في .env.migration.local (لازم للـ --commit)");
  process.exit(1);
}

const neon = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
const supabase = supabaseUrl ? new pg.Client({ connectionString: supabaseUrl, ssl: { rejectUnauthorized: false } }) : null;

function uuid() {
  return crypto.randomUUID();
}

async function batchInsert(client, table, columns, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = chunk.map((row, rowIdx) => {
      const base = rowIdx * columns.length;
      const ph = columns.map((_, colIdx) => `$${base + colIdx + 1}`);
      for (const col of columns) values.push(row[col]);
      return `(${ph.join(",")})`;
    });
    const sql = `insert into ${table} (${columns.join(",")}) values ${placeholders.join(",")}`;
    await client.query(sql, values);
  }
}

async function main() {
  await neon.connect();
  await neon.query("BEGIN TRANSACTION READ ONLY");

  const { rows: courses } = await neon.query(`select * from "Course" order by id`);
  const { rows: sections } = await neon.query(`select * from "Section" order by id`);
  const { rows: units } = await neon.query(`select * from "partOfSection" order by id`);
  const { rows: groups } = await neon.query(`select * from "GroupOfSection" where type = 'test' order by id`);
  const { rows: banks } = await neon.query(`select * from "QuestionBank" order by id`);
  const { rows: questions } = await neon.query(`select * from "Question" order by id`);
  const { rows: testQuestions } = await neon.query(`select * from "TestQuestion"`);

  await neon.query("ROLLBACK");
  await neon.end();

  // ===== بناء خرائط الـ id القديم -> uuid جديد =====
  const courseIdMap = new Map(courses.map((c) => [c.id, uuid()]));
  const sectionIdMap = new Map(sections.map((s) => [s.id, uuid()]));
  const unitIdMap = new Map(units.map((u) => [u.id, uuid()]));
  const categoryIdMap = new Map(banks.map((b) => [b.id, uuid()]));
  const questionIdMap = new Map(questions.map((q) => [q.id, uuid()]));
  // content_item لكل اختبار مربوط فعليًا بمكان في الهيكل (من GroupOfSection) - الاختبارات "اليتيمة" مش هتتضاف
  const contentItemIdMap = new Map(groups.map((g) => [g.testId, uuid()]));

  // ===== courses =====
  const newCourses = courses.map((c, i) => ({
    id: courseIdMap.get(c.id),
    title: c.courseName,
    description: c.courseSubName || null,
    image_url: null,
    order_index: i + 1,
  }));

  // ===== sections =====
  const newSections = sections.map((s, i) => ({
    id: sectionIdMap.get(s.id),
    course_id: courseIdMap.get(s.courseId),
    title: s.title,
    description: s.details || null,
    order_index: i + 1,
  }));

  // ===== units (partOfSection) =====
  const unitOrderPerSection = new Map();
  const newUnits = units.map((u) => {
    const n = (unitOrderPerSection.get(u.sectionId) ?? 0) + 1;
    unitOrderPerSection.set(u.sectionId, n);
    return { id: unitIdMap.get(u.id), section_id: sectionIdMap.get(u.sectionId), title: u.title, order_index: n };
  });

  // ===== content_items (اختبار واحد لكل GroupOfSection من نوع test) =====
  const itemOrderPerUnit = new Map();
  const newContentItems = groups.map((g) => {
    const n = (itemOrderPerUnit.get(g.partOfSectionId) ?? 0) + 1;
    itemOrderPerUnit.set(g.partOfSectionId, n);
    return {
      id: contentItemIdMap.get(g.testId),
      unit_id: unitIdMap.get(g.partOfSectionId),
      item_group_id: null,
      type: "test",
      title: g.title,
      order_index: n,
    };
  });

  // ===== tests (تفاصيل كل عنصر اختبار) =====
  const newTests = groups.map((g) => ({
    content_item_id: contentItemIdMap.get(g.testId),
    time_limit_minutes: null,
  }));

  // ===== question_categories (من QuestionBank) =====
  const newCategories = banks.map((b, i) => ({
    id: categoryIdMap.get(b.id),
    parent_id: null,
    title: b.name,
    order_index: i + 1,
  }));

  // ===== questions =====
  const orderPerCategory = new Map();
  const newQuestions = questions.map((q) => {
    const n = (orderPerCategory.get(q.questionBankId) ?? 0) + 1;
    orderPerCategory.set(q.questionBankId, n);
    return {
      id: questionIdMap.get(q.id),
      question_text: q.questionText,
      order_index: n,
      category_id: categoryIdMap.get(q.questionBankId),
      passage_id: null,
    };
  });

  // ===== question_options (4 اختيارات لكل سؤال، بنتجاهل النص null بس) =====
  const newOptions = [];
  let skippedNullAnswers = 0;
  for (const q of questions) {
    const answers = [q.answer1, q.answer2, q.answer3, q.answer4];
    answers.forEach((text, idx) => {
      if (text === null || text === undefined) {
        skippedNullAnswers++;
        return;
      }
      newOptions.push({
        id: uuid(),
        question_id: questionIdMap.get(q.id),
        option_text: text,
        is_correct: idx + 1 === q.asnwerTrue,
        order_index: idx + 1,
      });
    });
  }

  // ===== test_questions (بنتجاهل أي ربط لاختبار يتيم مش موجود في contentItemIdMap) =====
  const orderPerTest = new Map();
  let skippedOrphanLinks = 0;
  const newTestQuestions = [];
  for (const tq of testQuestions) {
    const newTestId = contentItemIdMap.get(tq.testId);
    const newQuestionId = questionIdMap.get(tq.questionId);
    if (!newTestId || !newQuestionId) {
      skippedOrphanLinks++;
      continue;
    }
    const n = (orderPerTest.get(tq.testId) ?? 0) + 1;
    orderPerTest.set(tq.testId, n);
    newTestQuestions.push({ id: uuid(), test_id: newTestId, question_id: newQuestionId, order_index: n });
  }

  // ===== ملخص =====
  console.log(`\n${COMMIT ? "=== COMMIT (هيكتب فعليًا في Supabase) ===" : "=== DRY RUN (معاينة بس، مفيش أي كتابة) ==="}\n`);
  console.log(`courses:          ${newCourses.length}`);
  console.log(`sections:         ${newSections.length}`);
  console.log(`units:            ${newUnits.length}`);
  console.log(`content_items:    ${newContentItems.length} (اختبار) — من أصل ${groups.length} GroupOfSection`);
  console.log(`tests:            ${newTests.length}`);
  console.log(`question_categories: ${newCategories.length}`);
  console.log(`questions:        ${newQuestions.length}`);
  console.log(`question_options: ${newOptions.length} (اتجاهل ${skippedNullAnswers} اختيار فاضي)`);
  console.log(`test_questions:   ${newTestQuestions.length} (اتجاهل ${skippedOrphanLinks} ربط لاختبار يتيم)`);

  console.log("\n--- عينة سؤال محوّل ---");
  console.log(JSON.stringify(newQuestions[0], null, 2));
  console.log(JSON.stringify(newOptions.slice(0, 4), null, 2));

  if (!COMMIT) {
    console.log("\nده dry run بس. لو الأرقام دي شكلها صح، شغّل السكريبت تاني بـ --commit عشان يكتب فعليًا.");
    return;
  }

  // ===== الكتابة الفعلية في Supabase =====
  await supabase.connect();
  await supabase.query("BEGIN");
  try {
    await batchInsert(supabase, "courses", ["id", "title", "description", "image_url", "order_index"], newCourses);
    await batchInsert(supabase, "sections", ["id", "course_id", "title", "description", "order_index"], newSections);
    await batchInsert(supabase, "units", ["id", "section_id", "title", "order_index"], newUnits);
    await batchInsert(supabase, "content_items", ["id", "unit_id", "item_group_id", "type", "title", "order_index"], newContentItems);
    await batchInsert(supabase, "tests", ["content_item_id", "time_limit_minutes"], newTests);
    await batchInsert(supabase, "question_categories", ["id", "parent_id", "title", "order_index"], newCategories);
    await batchInsert(supabase, "questions", ["id", "question_text", "order_index", "category_id", "passage_id"], newQuestions);
    await batchInsert(supabase, "question_options", ["id", "question_id", "option_text", "is_correct", "order_index"], newOptions);
    await batchInsert(supabase, "test_questions", ["id", "test_id", "question_id", "order_index"], newTestQuestions);
    await supabase.query("COMMIT");
    console.log("\nتم النقل بنجاح وكل حاجة اتكتبت في Supabase.");
  } catch (err) {
    await supabase.query("ROLLBACK");
    console.error("\nحصل خطأ، كل حاجة اترجعت زي ما كانت (rollback):", err.message);
    process.exitCode = 1;
  } finally {
    await supabase.end();
  }
}

main().catch(async (err) => {
  console.error("حصل خطأ:", err.message);
  try {
    await neon.query("ROLLBACK");
    await neon.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
