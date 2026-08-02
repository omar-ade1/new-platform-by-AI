import { afterEach, describe, expect, it } from "vitest";
import { cleanupCategory, cleanupCourse, createTestUser, deleteTestUser, enroll, seedCourseWithTest } from "./setup";

describe("حل الاختبار وتصحيحه: get_test_for_attempt / submit_test_attempt / get_test_attempt_review", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length) {
      const fn = cleanup.pop()!;
      await fn();
    }
  });

  it("طالب مش مسجل في الدورة يتمنع من قراءة الاختبار وحله", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const outsider = await createTestUser("student");
    cleanup.push(() => deleteTestUser(outsider.userId));

    const { data: testData, error: testError } = await outsider.client.rpc("get_test_for_attempt", {
      p_content_item_id: seed.contentItemId,
    });
    expect(testData).toBeNull();
    expect(testError).toBeTruthy();

    const { data: submitData, error: submitError } = await outsider.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      p_answers: [],
    });
    expect(submitData).toBeNull();
    expect(submitError).toBeTruthy();
  });

  it("طالب مسجّل: بيجيب الأسئلة من غير الإجابة الصح، وبعد الحل بيتصحح صح وتفضل مراجعته متاحة", async () => {
    const seed = await seedCourseWithTest(2);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    const { data: testData, error: testError } = await student.client.rpc("get_test_for_attempt", {
      p_content_item_id: seed.contentItemId,
    });
    expect(testError).toBeNull();
    expect(testData.questions).toHaveLength(2);
    for (const q of testData.questions) {
      for (const opt of q.options) {
        expect(opt).not.toHaveProperty("is_correct");
      }
    }

    const { data: submitData, error: submitError } = await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      p_answers: [
        { question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId },
        { question_id: seed.questions[1].id, selected_option_id: seed.questions[1].wrongOptionId },
      ],
    });
    expect(submitError).toBeNull();
    expect(submitData.score).toBe(1);
    expect(submitData.total_questions).toBe(2);

    const { data: reviewData, error: reviewError } = await student.client.rpc("get_test_attempt_review", {
      p_attempt_id: submitData.attempt_id,
    });
    expect(reviewError).toBeNull();
    expect(reviewData.score).toBe(1);
    const wrongReviewed = reviewData.review.find((r: { id: string }) => r.id === seed.questions[1].id);
    expect(wrongReviewed.selected_option_id).toBe(seed.questions[1].wrongOptionId);
  });

  it("سؤال مش تابع للاختبار ده بيتجاهل من التصحيح، ومش بيتحسب في total_questions", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));
    const foreignSeed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(foreignSeed.courseId));
    cleanup.push(() => cleanupCategory(foreignSeed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    const { data: submitData, error: submitError } = await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      p_answers: [
        { question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId },
        { question_id: foreignSeed.questions[0].id, selected_option_id: foreignSeed.questions[0].correctOptionId },
      ],
    });
    expect(submitError).toBeNull();
    expect(submitData.total_questions).toBe(1);
    expect(submitData.score).toBe(1);
  });

  it("مراجعة المحاولة: صاحبها بس أو الأدمن يقدروا يشوفوها، مش أي طالب تاني", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    const { data: submitData } = await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      p_answers: [{ question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId }],
    });

    const otherStudent = await createTestUser("student");
    cleanup.push(() => deleteTestUser(otherStudent.userId));
    const { data: blockedData, error: blockedError } = await otherStudent.client.rpc("get_test_attempt_review", {
      p_attempt_id: submitData.attempt_id,
    });
    expect(blockedData).toBeNull();
    expect(blockedError).toBeTruthy();

    const admin = await createTestUser("admin");
    cleanup.push(() => deleteTestUser(admin.userId));
    const { data: adminData, error: adminError } = await admin.client.rpc("get_test_attempt_review", {
      p_attempt_id: submitData.attempt_id,
    });
    expect(adminError).toBeNull();
    expect(adminData.score).toBe(1);
  });
});
