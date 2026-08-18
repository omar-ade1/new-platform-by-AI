import { afterEach, describe, expect, it } from "vitest";
import { cleanupCategory, cleanupCourse, createTestUser, deleteTestUser, seedCourseWithTest } from "./setup";

// اختبار الإصلاح في QuestionBankManager.tsx/TestQuestionsManager.tsx: setCorrectOption كانت
// بتنفذ استعلامين متداخلين (امسح كل is_correct، وبعدين حط الاختيار المستهدف true) بـ Promise.all
// بالتوازي — لو استعلام "امسح" وصل بعد استعلام "حط true"، بيمسح التحديد كمان والسؤال يفضل
// "غير محلول". الإصلاح: تنفيذ الاستعلامين بالترتيب (await منفصلين). الاختبار ده بينادي نفس
// الاستعلامين بنفس ترتيب الكود المُصلَّح، بحساب admin حقيقي (نفس مسار RLS اللي التطبيق بيستخدمه).
describe("setCorrectOption بالترتيب مش بالتوازي", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length) {
      const fn = cleanup.pop()!;
      await fn();
    }
  });

  it("تحديد اختيار كصحيح لسؤال 'غير محلول' (كل الاختيارات false، زي سؤال مستورد من CSV) بيسيب اختيار واحد بس صح", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const admin = await createTestUser("admin");
    cleanup.push(() => deleteTestUser(admin.userId));

    const question = seed.questions[0];

    // نحاكي سؤال مستورد من CSV من غير إجابة صح: كل الاختيارات false
    await admin.client.from("question_options").update({ is_correct: false }).eq("question_id", question.id);

    const { error: e1 } = await admin.client.from("question_options").update({ is_correct: false }).eq("question_id", question.id);
    const { error: e2 } = await admin.client.from("question_options").update({ is_correct: true }).eq("id", question.correctOptionId);
    expect(e1).toBeNull();
    expect(e2).toBeNull();

    const { data: options } = await admin.client.from("question_options").select("id, is_correct").eq("question_id", question.id);
    const correctOnes = options!.filter((o) => o.is_correct);
    expect(correctOnes).toHaveLength(1);
    expect(correctOnes[0].id).toBe(question.correctOptionId);
  });

  it("استدعاءات متكررة (تبديل الإجابة الصح جيئة وذهابًا) دايمًا بتسيب اختيار واحد بالظبط صح", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const admin = await createTestUser("admin");
    cleanup.push(() => deleteTestUser(admin.userId));

    const question = seed.questions[0];

    for (let i = 0; i < 10; i++) {
      const target = i % 2 === 0 ? question.correctOptionId : question.wrongOptionId;

      const { error: e1 } = await admin.client.from("question_options").update({ is_correct: false }).eq("question_id", question.id);
      const { error: e2 } = await admin.client.from("question_options").update({ is_correct: true }).eq("id", target);
      expect(e1).toBeNull();
      expect(e2).toBeNull();

      const { data: options } = await admin.client.from("question_options").select("id, is_correct").eq("question_id", question.id);
      const correctOnes = options!.filter((o) => o.is_correct);
      expect(correctOnes).toHaveLength(1);
      expect(correctOnes[0].id).toBe(target);
    }
  });
});
