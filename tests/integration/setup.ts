import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54321";
// مفاتيح Supabase الافتراضية لأي مشروع local dev — موثّقة رسميًا في docs Supabase نفسها،
// مش سر خاص بمشروعنا، وبتتولد تلقائي مع أي `supabase start` على أي جهاز.
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function adminClient(): SupabaseClient {
  return createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient(): SupabaseClient {
  return createClient(LOCAL_URL, LOCAL_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

let counter = 0;
function uniqueSuffix() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export type TestUser = { userId: string; client: SupabaseClient };

// بيعمل مستخدم حقيقي عن طريق signup فعلي (نفس مسار الطالب الحقيقي)، وبيرجّع client
// عليه جلسة المستخدم ده — أي .rpc()/.from() بعد كده بيتنفذ تحت هويته وبيحترم RLS كامل.
export async function createTestUser(role: "student" | "admin" = "student"): Promise<TestUser> {
  const email = `${role}-${uniqueSuffix()}@test.local`;
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    email,
    password: "Test1234!",
    options: { data: { full_name: `Test User ${role}`, phone: "0500000000" } },
  });
  if (error || !data.user) throw new Error(`فشل إنشاء مستخدم اختبار: ${error?.message}`);

  if (role === "admin") {
    const { error: promoteError } = await adminClient().from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    if (promoteError) throw new Error(`فشل ترقية المستخدم لأدمن: ${promoteError.message}`);
  }

  return { userId: data.user.id, client };
}

export async function deleteTestUser(userId: string) {
  await adminClient().auth.admin.deleteUser(userId);
}

export type SeededQuestion = { id: string; correctOptionId: string; wrongOptionId: string };
export type SeededTest = {
  courseId: string;
  sectionId: string;
  contentItemId: string;
  categoryId: string;
  questions: SeededQuestion[];
};

// بيبني دورة كاملة (قسم/وحدة/اختبار) + تصنيف بأسئلته، بس عشان اختبار RPCs — منفصل تمامًا
// عن بيانات المنصة الحقيقية (بادئة "[test]" في العناوين + تنضيف كامل بعد كل اختبار).
export async function seedCourseWithTest(questionCount = 2): Promise<SeededTest> {
  const admin = adminClient();
  const suffix = uniqueSuffix();

  const { data: course, error: courseError } = await admin
    .from("courses")
    .insert({ title: `[test] course ${suffix}` })
    .select()
    .single();
  if (courseError) throw courseError;

  const { data: section } = await admin
    .from("sections")
    .insert({ course_id: course.id, title: "section", order_index: 0 })
    .select()
    .single();

  const { data: unit } = await admin
    .from("units")
    .insert({ section_id: section.id, title: "unit", order_index: 0 })
    .select()
    .single();

  const { data: contentItem } = await admin
    .from("content_items")
    .insert({ unit_id: unit.id, type: "test", title: "test", order_index: 0 })
    .select()
    .single();

  await admin.from("tests").insert({ content_item_id: contentItem.id, time_limit_minutes: null });

  const { data: category } = await admin
    .from("question_categories")
    .insert({ title: `[test] category ${suffix}`, order_index: 0 })
    .select()
    .single();

  const questions: SeededQuestion[] = [];
  for (let i = 0; i < questionCount; i++) {
    const { data: question } = await admin
      .from("questions")
      .insert({ question_text: `question ${i}`, category_id: category.id, order_index: i })
      .select()
      .single();

    const { data: options } = await admin
      .from("question_options")
      .insert([
        { question_id: question.id, option_text: "correct", is_correct: true, order_index: 0 },
        { question_id: question.id, option_text: "wrong", is_correct: false, order_index: 1 },
      ])
      .select();

    await admin.from("test_questions").insert({ test_id: contentItem.id, question_id: question.id, order_index: i });

    const correct = options!.find((o) => o.is_correct)!;
    const wrong = options!.find((o) => !o.is_correct)!;
    questions.push({ id: question.id, correctOptionId: correct.id, wrongOptionId: wrong.id });
  }

  return { courseId: course.id, sectionId: section.id, contentItemId: contentItem.id, categoryId: category.id, questions };
}

export async function enroll(userId: string, courseId: string) {
  await adminClient().from("enrollments").insert({ user_id: userId, course_id: courseId, expires_at: null });
}

// بيمسح الدورة وكل حاجة تابعة ليها (قسم/وحدة/اختبار/محاولات) — الـ FK كلها ON DELETE CASCADE
export async function cleanupCourse(courseId: string) {
  await adminClient().from("courses").delete().eq("id", courseId);
}

// بيمسح التصنيف وكل أسئلته واختياراته (CASCADE برضو)
export async function cleanupCategory(categoryId: string) {
  await adminClient().from("question_categories").delete().eq("id", categoryId);
}
