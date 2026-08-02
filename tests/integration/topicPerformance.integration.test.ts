import { afterEach, describe, expect, it } from "vitest";
import { cleanupCategory, cleanupCourse, createTestUser, deleteTestUser, enroll, seedCourseWithTest } from "./setup";

describe("نقاط القوة والضعف: get_topic_performance", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length) {
      const fn = cleanup.pop()!;
      await fn();
    }
  });

  it("بيحسب إجمالي/صح لكل تصنيف رئيسي، وبيستبعد جولات المراجعة من الحساب", async () => {
    const seed = await seedCourseWithTest(2);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      p_answers: [
        { question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId },
        { question_id: seed.questions[1].id, selected_option_id: seed.questions[1].wrongOptionId },
      ],
    });

    const { data, error } = await student.client.rpc("get_topic_performance", { p_user_id: student.userId });
    expect(error).toBeNull();
    const entry = data.find((d: { category_id: string }) => d.category_id === seed.categoryId);
    expect(entry.total).toBe(2);
    expect(entry.correct).toBe(1);

    // جولة مراجعة بتصحح السؤال التاني — لازم متأثرش على نقاط القوة/الضعف (مش امتحان حقيقي)
    await student.client.rpc("submit_review_attempt", {
      p_answers: [{ question_id: seed.questions[1].id, selected_option_id: seed.questions[1].correctOptionId }],
    });

    const { data: after } = await student.client.rpc("get_topic_performance", { p_user_id: student.userId });
    const entryAfter = after.find((d: { category_id: string }) => d.category_id === seed.categoryId);
    expect(entryAfter.total).toBe(2);
    expect(entryAfter.correct).toBe(1);
  });

  it("طالب تاني يتمنع من نقاط طالب مش هو، والأدمن يقدر يشوفها", async () => {
    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));

    const otherStudent = await createTestUser("student");
    cleanup.push(() => deleteTestUser(otherStudent.userId));
    const { data: blockedData, error: blockedError } = await otherStudent.client.rpc("get_topic_performance", {
      p_user_id: student.userId,
    });
    expect(blockedData).toBeNull();
    expect(blockedError).toBeTruthy();

    const admin = await createTestUser("admin");
    cleanup.push(() => deleteTestUser(admin.userId));
    const { data: adminData, error: adminError } = await admin.client.rpc("get_topic_performance", {
      p_user_id: student.userId,
    });
    expect(adminError).toBeNull();
    expect(adminData).toEqual([]);
  });
});
