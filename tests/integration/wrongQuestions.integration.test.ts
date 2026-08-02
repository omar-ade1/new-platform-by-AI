import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupCategory, cleanupCourse, createTestUser, deleteTestUser, enroll, seedCourseWithTest } from "./setup";

describe("مراجعة الأسئلة الغلط: get_wrong_questions / submit_review_attempt", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length) {
      const fn = cleanup.pop()!;
      await fn();
    }
  });

  it("سؤال غلط أو متسجّلش بيظهر في get_wrong_questions، وبمجرد ما يتجاوب صح في جولة مراجعة بيختفي", async () => {
    const seed = await seedCourseWithTest(2);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seed.contentItemId,
      // زي TestRunner.tsx بالظبط: كل سؤال بيتبعت حتى لو متجاوبش (selected_option_id: null) —
      // لازم يتبعت صراحة عشان get_wrong_questions تعتبره "متسجّل بس غلط"، مش تتجاهله تمامًا
      p_answers: [
        { question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId },
        { question_id: seed.questions[1].id, selected_option_id: null },
      ],
    });

    // p_test_id: null لازم يتبعت صريح دايمًا — get_wrong_questions معاها overload بـ2 وبـ3
    // parameters، ولو اتبعت بس p_course_id/p_section_id، PostgREST بيرفض يحدد أي نسخة ينده
    // (PGRST203: ambiguous function). ده بالظبط اللي بيعمله ReviewRunner.tsx في الواجهة.
    const { data: wrongData, error: wrongError } = await student.client.rpc("get_wrong_questions", {
      p_course_id: seed.courseId,
      p_section_id: null,
      p_test_id: null,
    });
    expect(wrongError).toBeNull();
    const wrongIds = wrongData.map((q: { id: string }) => q.id);
    expect(wrongIds).toContain(seed.questions[1].id);
    expect(wrongIds).not.toContain(seed.questions[0].id);
    for (const q of wrongData) {
      for (const opt of q.options) {
        expect(opt).not.toHaveProperty("is_correct");
      }
    }

    const { data: reviewSubmit, error: reviewSubmitError } = await student.client.rpc("submit_review_attempt", {
      p_answers: [{ question_id: seed.questions[1].id, selected_option_id: seed.questions[1].correctOptionId }],
    });
    expect(reviewSubmitError).toBeNull();
    expect(reviewSubmit.score).toBe(1);

    const { data: wrongAfter } = await student.client.rpc("get_wrong_questions", {
      p_course_id: seed.courseId,
      p_section_id: null,
      p_test_id: null,
    });
    expect(wrongAfter.map((q: { id: string }) => q.id)).not.toContain(seed.questions[1].id);
  });

  it("يقدر يحصر المراجعة على اختبار واحد بعينه بـ p_test_id", async () => {
    const seedA = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seedA.courseId));
    cleanup.push(() => cleanupCategory(seedA.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seedA.courseId);

    await student.client.rpc("submit_test_attempt", {
      p_content_item_id: seedA.contentItemId,
      p_answers: [{ question_id: seedA.questions[0].id, selected_option_id: seedA.questions[0].wrongOptionId }],
    });

    const { data: scoped, error: scopedError } = await student.client.rpc("get_wrong_questions", {
      p_course_id: seedA.courseId,
      p_section_id: null,
      p_test_id: seedA.contentItemId,
    });
    expect(scopedError).toBeNull();
    expect(scoped.map((q: { id: string }) => q.id)).toContain(seedA.questions[0].id);
  });

  it("طالب مش مسجل في الدورة يتمنع من get_wrong_questions و submit_review_attempt بيتجاهل أسئلته", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const outsider = await createTestUser("student");
    cleanup.push(() => deleteTestUser(outsider.userId));

    const { data, error } = await outsider.client.rpc("get_wrong_questions", {
      p_course_id: seed.courseId,
      p_section_id: null,
      p_test_id: null,
    });
    expect(data).toBeNull();
    expect(error).toBeTruthy();

    // submit_review_attempt مش عنده فحص دورة واحدة — بيفحص كل سؤال لوحده، فمفروض يتجاهل السؤال ده بصمت
    const { data: reviewData, error: reviewError } = await outsider.client.rpc("submit_review_attempt", {
      p_answers: [{ question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId }],
    });
    expect(reviewError).toBeNull();
    expect(reviewData.total_questions).toBe(0);
  });

  it("جولة المراجعة بتتسجل بـ test_id فاضي (مش امتحان حقيقي، مستبعدة من التقارير)", async () => {
    const seed = await seedCourseWithTest(1);
    cleanup.push(() => cleanupCourse(seed.courseId));
    cleanup.push(() => cleanupCategory(seed.categoryId));

    const student = await createTestUser("student");
    cleanup.push(() => deleteTestUser(student.userId));
    await enroll(student.userId, seed.courseId);

    const { data: reviewSubmit } = await student.client.rpc("submit_review_attempt", {
      p_answers: [{ question_id: seed.questions[0].id, selected_option_id: seed.questions[0].correctOptionId }],
    });

    const { data: attemptRow, error } = await adminClient()
      .from("test_attempts")
      .select("test_id")
      .eq("id", reviewSubmit.attempt_id)
      .single();
    expect(error).toBeNull();
    expect(attemptRow!.test_id).toBeNull();
  });
});
