@AGENTS.md

# ملخص حالة المشروع — منصة "الوجيز"

## 1. وصف المشروع والهدف

"الوجيز" منصة تحضير أونلاين لاختبار **القدرات اللفظي** (عربي/سعودي)، بيقدّمها الأستاذ **عادل فؤاد عاشور**. الفكرة الأساسية:

- الطالب بيعمل حساب بنفسه (signup عادي، مفيش دفع أونلاين أو اشتراك ذاتي).
- الأدمن (عادل، أو حد بينوب عنه) بيسجّل الطالب في دورة معينة — إما يدوي، أو بالموافقة على طلب انضمام الطالب نفسه.
- الطالب بعد التسجيل بيدخل الدورة ويشوف محتواها: فيديوهات، ملفات PDF، ملاحظات نصية، واختبارات — ويتابع تقدمه فيها، وبعد ما يحل اختبار بيشوف نتيجته ومراجعة تفصيلية ونقاط قوته وضعفه، وبقى يقدر كمان يعيد امتحان أسئلته الغلط بس (قسم 5.12).
- **مستخدم اللوحة الفعلي (الأدمن) مش شخص تقني** — ده مهم جدًا ويأثر على كل قرار تصميم في لوحة الأدمن.
- **الروادماب الأصلي (تسجيل + بنك أسئلة + حل اختبار) خلص بالكامل 100%** من شاتات سابقة. **شات سابق كان طويل جدًا وتوسّعي** — مش بس تحسينات، اتضافت فيه ميزات جوهرية جديدة (تتبّع تقدّم الاختبارات، مراجعة الأسئلة الغلط، استيراد أسئلة بالجملة، تصدير مذكرات Word، نظام ثيمات) فوق إصلاحات أداء وتصميم كبيرة. **الشات اللي بعده (ده) كان توسّعي بنفس القدر** — تصدير مباشر (CSV/Word/PDF) من بنك الأسئلة/الاختبار/الوحدة/القسم/الدورة، تقسيم 3 ملفات إدارية ضخمة لمكونات أصغر، وجولة فحص وإصلاح على الموبايل لسه شغالة — شوف قسم 5 بالتفصيل (خصوصًا 5.14-5.16) وقسم 6 لللي لسه مقترح.
- **المنصة كانت شغالة قبل كده بشكل مختلف** (نفس الفكرة، تقنية مختلفة — Prisma/Neon)، وتم نقل بياناتها الحقيقية (دورة + بنك أسئلة كامل، 11,884 سؤال) للمنصة الجديدة دي — شوف قسم 5.6.

## 2. الـ Stack

- **Next.js 16.2.12** (App Router) — ⚠️ نسخة فيها كسر كبير: ملف `middleware.ts` القديم اتلغى واتسمّى **`proxy.ts`** (الملف موجود فعلاً في `src/proxy.ts`)، والـ function جواه اسمها `proxy` مش `middleware`. أي حاجة تانية غريبة أو مش متوقعة، راجع `node_modules/next/dist/docs/` قبل ما تفترض حاجة من الـ training data — النسخة دي أحدث من أغلب معرفة النماذج.
- **React 19.2.4**، **TypeScript**، **Tailwind v4**، **Framer Motion** للحركات والـ modals.
- **Supabase**: Auth + Postgres (RLS مفعّلة بالكامل على كل جدول) + Storage (لملفات الدورات).
  - `@supabase/ssr` بيتستخدم في مكانين: `src/lib/supabase/client.ts` (`createBrowserClient` — الجلسة متخزنة في cookies مش localStorage) و`src/lib/supabase/server.ts` (`createClient` async للـ Server Components).
  - **مفيش service role key في المشروع** — بس `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY` في `.env.local`. يعني مفيش وصول من الكود لـ `auth.users` مباشرة (لا إيميلات ولا admin API ولا إنشاء حسابات بالجملة)، وكل حاجة لازم تعدي عن طريق RLS بالـ anon key، أو عن طريق دوال RPC (`security definer`) لما محتاجين نتجاوز RLS بمنطق محدد ومتحكم فيه (شوف قسم 3).
  - **Supabase PostgREST بيحدّ أي `select()` بـ 1000 صف افتراضيًا** — أي جدول ممكن يكبر لازم يتفحص بـ `.range()`/pagination أو استعلامات مستهدفة، **مينفعش أبدًا** `select()` عام بدون فلتر على جدول كبير — شوف قسم 5.5.
  - **⚠️ درس مهم اتكرر أكتر من مرة (قسم 5.8): Postgres مبيعملش index تلقائي على أعمدة foreign key.** أي فلترة/join جديد على عمود FK في جدول بيكبر (`category_id`, `question_id`, `test_id`, `user_id`, `content_item_id`... إلخ) لازم يتتأكد إن عليه index، وإلا هيشتغل تمام وهو الجدول صغير ويفشل بـ `statement timeout` (كود `57014`) لما الجدول يكبر. راجع الـ migrations 20260806/20260807 قبل ما تضيف عمود FK جديد يتفلتر بيه.
- `sonner` للـ toasts في كل مكان (مفيش أي `alert()`/`confirm()` من المتصفح — كله بوب أب مخصص).
- **Vitest** (`npm test`) — **56 اختبار وحدة** على 7 ملفات دوال جافة (`format.ts`, `enrollmentDuration.ts`, `embedUrl.ts`, `questionBank.ts`, `questionsCsv.ts`, `questionExportMap.ts`). شوف قسم 5.7 و5.13 و5.14.
- **`docx`** (npm) — توليد ملفات Word في المتصفح مباشرة (قسم 5.13). **⚠️ قبل أي مكتبة جديدة بتتعامل مع رفع/تحليل ملفات، شغّل `npm audit` الأول** — رفضنا `xlsx` و`exceljs` (ثغرات أمنية معروفة من غير حل) واستخدمنا CSV parser مكتوب يدوي بدالهم (قسم 5.13)، بينما `docx` اتفحصت ونضيفة.
- **`next.config.ts` فيه `allowedDevOrigins`** — Next.js 16 بيمنع افتراضيًا أي جهاز غير الكمبيوتر نفسه (localhost) من فتح سيرفر التطوير، حتى لو نفس شبكة الواي فاي. المستخدم بيفتح الموقع على الموبايل للفحص، فـ IP جهازه على الشبكة مضاف هناك (`allowedDevOrigins: ["<IP>"]`). **⚠️ الـ IP ده ممكن يتغيّر** (الراوتر بيغيّره أحيانًا) — لو الموبايل بطّل يوصل، اطلب من المستخدم `ipconfig` يجيب IPv4 الجديد وحدّثه هناك.

## 3. الـ Database Schema

القاعدة كاملة وRLS مفعّلة عليها. جزء كبير منها **اتعمل يدوي من المستخدم في Supabase SQL Editor مباشرة** (مش من ملفات في الريبو)، والباقي عن طريق migrations في `supabase/migrations/` (المستخدم بيشغّلها بنفسه لما نطلب منه، مفيش تنفيذ تلقائي — معندناش الصلاحيات دي).

### الهرم التعليمي
```
courses → sections → units → item_groups (اختياري، لون بس للتجميع البصري) → content_items
```
كل `content_item` عنده `type` (`video` | `file` | `note` | `test`) ومربوط بجدول تفاصيل حسب نوعه:
- `videos(content_item_id, video_url, duration_seconds)`
- `files(content_item_id, file_url, file_type, file_size_kb)` — `file_url` هنا **مش رابط كامل، ده storage path** جوه bucket اسمه `course-files` (شكله `{course_id}/{timestamp}_{filename}`)، والوصول ليه بـ signed URL وقت العرض. **رفع الملفات من الأدمن بقى PDF بس** (قسم 5.12 — `accept` attribute + فحص امتداد client-side).
- `notes(content_item_id, body)`
- `tests(content_item_id, time_limit_minutes)` — `time_limit_minutes` ممكن يكون `null` (اختبار من غير وقت محدد).

### بنك الأسئلة (مستقل تمامًا عن الدورات والاختبارات)
- `question_categories(id, parent_id, title, order_index)` — شجري (تصنيف ممكن يكون جوه تصنيف تاني، عمق مفتوح). "التصنيف الرئيسي" (`parent_id is null`) هو المستوى المستخدم في تحليل نقاط القوة/الضعف (قسم 5.4). عليه index على `parent_id` (قسم 5.8).
- `questions(id, question_text, order_index, category_id, passage_id)` — كل سؤال لازم يكون جوه تصنيف. `passage_id` (nullable) بيربطه بنص قراءة مشترك. **حاليًا فيه 11,884+ سؤال** — أي كود بيتعامل مع الجدول ده لازم يفترض حجم كبير. عليه index على `category_id` و`passage_id`.
- `question_options(id, question_id, option_text, is_correct, order_index)` — الافتراض المتبع في الـ UI: **إجابة واحدة بس صح لكل سؤال** (radio-style)، رغم إن السكيما نفسها مش بتمنع أكتر من `is_correct = true`. **46,303+ اختيار.** عليه index على `question_id` (ده اللي كان سبب أول `statement timeout` اكتشفناه — قسم 5.8).
- `reading_passages(id, category_id, title, body, order_index)` — نص قراءة مشترك (لحالات "استيعاب المقروء"). عليه index على `category_id`.
- `test_questions(id, test_id, question_id, order_index)` — جدول وسيط many-to-many بيربط أسئلة من البنك باختبار معيّن (`test_id` = نفس `content_item_id` بتاع الاختبار). عليه index على `test_id` و`question_id`.

**RLS بنك الأسئلة:** `questions`/`question_options` — `SELECT` بقى **أدمن بس** (`using (is_admin())`). كل وصول الطالب بيعدي **إجباريًا** عن طريق دوال RPC مخصصة (شوف تحت)، مش عن طريق قراءة الجدول مباشرة. لو حد فكّر يضيف قراءة مباشرة لـ `question_options` من كود طالب — **ده رجوع لثغرة قديمة اتقفلت**، لازم يعدي عن طريق RPC.

### الاختبارات وحل الاختبار (test-taking)
- `test_attempts(id, test_id, user_id, score, total_questions, completed_at)` — **مفيش `started_at`** (التوقيت client-side، مقبول لمنصة تحضير مش امتحان رسمي). **⚠️ `test_id` بقى nullable (شات ده، migration `20260808`)**: `test_id = null` معناها المحاولة دي **جولة مراجعة أسئلة غلط** (قسم 5.12)، مش امتحان حقيقي على اختبار واحد بعينه. أي كود بيقرا `test_attempts` لأغراض تقارير/إحصائيات حقيقية (تقرير الأدمن، صفحة الحساب) **لازم يستبعد `test_id is null`** (`.not("test_id", "is", null)`) وإلا هتتلخبط الأرقام بجولات مراجعة مش امتحانات فعلية. عليه index على `user_id` و`test_id`.
- `test_answers(id, attempt_id, question_id, selected_option_id)` — **مفيش `is_correct` مخزّن هنا**، بيتحسب وقت القراءة بمقارنة `selected_option_id` بـ `question_options.is_correct` الحقيقي. عليه index على `attempt_id` و`question_id`.
- **RLS الكتابة** على الجدولين دول مقفولة على الأدمن بس — التسجيل الفعلي بيحصل بس عن طريق RPCs (`security definer`، بتتجاوز RLS). `SELECT` مفتوح للطالب على محاولاته هو بس.
- **6 دوال RPC** (كلهم `security definer`):
  - `get_test_for_attempt(p_content_item_id uuid) returns jsonb` — أسئلة اختبار محدد (باختياراتها) من غير `is_correct`، بعد تحقق `is_admin()`/`is_enrolled()`.
  - `submit_test_attempt(p_content_item_id uuid, p_answers jsonb) returns jsonb` — تصحيح سيرفر-سايد لاختبار كامل، تسجيل `test_attempts`+`test_answers`، رجوع مراجعة تفصيلية.
  - `get_test_attempt_review(p_attempt_id uuid) returns jsonb` — مراجعة محاولة سابقة (صاحبها أو الأدمن بس).
  - `get_topic_performance(p_user_id, p_course_id?, p_from_date?, p_to_date?) returns jsonb` — نسبة الصح لكل تصنيف رئيسي (recursive CTE)، أساس "نقاط القوة والضعف". **بتستبعد جولات المراجعة تلقائيًا** (الـ join لـ `content_items` عن طريق `att.test_id` بيفشل لو `test_id is null`، فمحتاجش أي تعديل إضافي).
  - **`get_wrong_questions(p_course_id uuid, p_section_id uuid default null, p_test_id uuid default null) returns jsonb`** (جديدة، `20260808`+`20260809`) — بترجع أسئلة الطالب اللي **آخر إجابة سجّلها عليها** (في أي محاولة، عادية أو مراجعة سابقة) كانت غلط أو متسجّلتش. النطاق: دورة كاملة، أو قسم معيّن جواها، أو اختبار واحد بعينه (حسب أي بارامتر اتبعت).
  - **`submit_review_attempt(p_answers jsonb) returns jsonb`** (جديدة) — بتصحح جولة مراجعة (ممكن تجمع أسئلة من كذا اختبار مختلف)، بتتحقق من enrollment كل سؤال لوحده، وبتسجّل `test_attempts` بـ `test_id = null`. نفس شكل رجوع `get_test_attempt_review`.

### نظام التسجيل (Enrollment)
- `profiles(id→auth.users, full_name, phone, role: admin|student)` — بتتعمل تلقائي بـ trigger اسمه `handle_new_user`. **مفيهاش إيميل**. عليه index على `role`.
- `enrollments(user_id, course_id, expires_at)` — بتتحكم مين يشوف محتوى أي دورة فعليًا. `expires_at` (nullable) — `null` = اشتراك دايم. عليه index على `user_id` و`course_id`.
- `enrollment_requests(user_id, course_id, status: pending|approved|rejected, created_at, decided_at)`. عليه index على `status`, `user_id`, `course_id`.
- `content_progress(user_id, content_item_id, times_seen, first_seen_at, last_seen_at)` — تتبّع اختياري بضغطة زرار من الطالب. **⚠️ دلوقتي بيتسجل للاختبارات كمان** (كان مستبعد تمامًا قبل كده) — بس **بشرط**: الطالب لازم يكون جاب 80%+ في محاولة واحدة على الأقل قبل ما يقدر "يعلّم" الاختبار كممتحن (قسم 5.12، الشرط بيتفحص سيرفر-سايد قبل الـ insert). عليه index على `user_id` و`content_item_id`.

### RLS ودوال مساعدة عامة
- `is_admin()` — بدون args، `security definer stable`، بترجع `boolean`.
- `is_enrolled(cid uuid)` — نفس النوع، بترجع `boolean`، بتتحقق من `expires_at` كمان.

نفس منطق الدالتين مستخدم في كل سياسات RLS في المشروع، وكمان في bucket الـ storage `course-files`.

## 4. الملفات والفولدرات المهمة

```
src/
  proxy.ts                              بديل middleware.ts

  lib/
    embedUrl.ts (+ .test.ts)            تحويل روابط يوتيوب/فيميو لصيغة embed
    format.ts (+ .test.ts)              formatDuration، formatFileSize، scoreTier()
    uploadWithProgress.ts               رفع ملف بـ progress حقيقي
    enrollmentDuration.ts (+ .test.ts)  DURATION_OPTIONS، computeExpiresAt()، formatExpiryStatus()
    theme.ts                            THEMES (default/green/dark)، applyTheme()، getStoredTheme() — ثيم الموقع (قسم 5.10)
    questionsCsv.ts (+ .test.ts)        parseQuestionsCsv()، buildQuestionsCsvTemplate()، buildQuestionsCsv() (تصدير — قسم 5.13، 5.14)
    questionMemoDocx.ts                 buildQuestionMemoDocx() — توليد Word، MEMO_THEMES (قسم 5.13). ⚠️ جدول الاختيارات الأفقي محتاج `visuallyRightToLeft: true` (قسم 5.14)
    questionMemoHtml.ts                 جديد (5.14) — buildQuestionMemoHtml()، نفس شكل المذكرة بس HTML لتصدير PDF عن طريق نافذة طباعة المتصفح (بدون مكتبة PDF)
    questionExportMap.ts                جديد (5.14) — toMemoRows() (دالة خالصة، بدون Supabase، عشان تتختبر لوحدها) + type ExportQuestion
    supabase/
      client.ts, server.ts              browser/server clients
      course-access.ts                  getCourseAccessInfo()/hasCourseAccess()
      track-progress.ts                 trackContentSeen() — بتتنادى بضغطة زرار (فيديو/ملف/ملاحظة/اختبار)
      questionBank.ts (+ .test.ts)      buildCategoryTree()، collectDescendantIds()، flattenCategoryTree()، DEFAULT_CATEGORY_TITLE
      questionExport.ts                 جديد (5.14) — fetchQuestionsByCategoryIds()، fetchQuestionsByIds()، getTestContentItemIds()، fetchQuestionsForTestIds() (كلهم بيتخطوا حد الـ1000 صف بحلقات `.range()`)

  components/
    icons.tsx                          أيقونات auth
    layout/
      Header.tsx, Footer.tsx, ScrollProgress.tsx      كلهم `print:hidden`
      ThemeToggle.tsx                  دايرة لون في الهيدر، قايمة اختيار ثيم (قسم 5.10) — ظاهر في كل صفحة (عام/طالب/أدمن)
    shared/
      Accordion.tsx, AnimatedHeading.tsx, DecorShapes.tsx
      RevealCard.tsx                    ⚠️ دخول 3D عند السكرول (`viewport={{once:false}}`) — بيتكرر كل مرة العنصر يعدي حد ظهور معيّن. للكروت الصغيرة/الثابتة قرب أعلى الصفحة بس — مش لعنصر طويل قابل للسكرول المتكرر أو بيتغيّر حجمه.
      QuestionReviewCard.tsx            مراجعة سؤال بعد التصحيح — مشترك بين TestRunner، ReviewRunner، صفحة مراجعة المحاولة، وتقرير الأدمن. فيه أنماط `print:` مخصصة (عمودين للاختيارات في الطباعة).
      TopicPerformance.tsx              أشرطة نقاط القوة/الضعف — مشترك بين /account و/admin/reports، فيه أنماط طباعة كمان
      Pagination.tsx                    ترقيم صفحات بالرقم (مش "تحميل أكتر") — مشترك بين صفحة الطلاب وبنك الأسئلة وأسئلة الاختبار (قسم 5.9)
      ConfirmModal.tsx                  جديد (5.15) — نقل من `CourseContentManager.tsx` (كان معرّف محليًا هناك). مودال تأكيد عام `{open,onClose,onConfirm,busy,title,body,confirmLabel}`
    admin/
      AdminSidebar.tsx                  أيقونة لكل قسم + عداد طلبات معلّقة + "التقارير" + "أدوات عامة"
      DurationPicker.tsx
      ExportQuestionsModal.tsx          جديد (5.14) — مودال تصدير مشترك (CSV/Word/PDF)، مُستخدم من الأربع نقط دخول تحت. بيجيب الأسئلة أول ما يفتح (`loadQuestions` prop) ويكاشها، فمفيش فيتش تاني لما تبدّل بين الخيارات
      CourseContentManager.tsx          ⚠️ اتقسّم (5.15): نزل من ~1330 لـ ~923 سطر. رفع الملفات PDF بس (5.12). زرار "تصدير كل أسئلة الدورة" + زرار تصدير لكل قسم (5.14). المودالات (قسم/وحدة/عنصر/نقل) بقت ملفات منفصلة تحت، والـ`ConfirmModal` المحلي القديم بقى بيستورد من `shared/`
      CourseSectionModal.tsx            جديد (5.15) — إضافة/تعديل قسم
      CourseUnitModal.tsx               جديد (5.15) — إضافة/تعديل وحدة
      CourseItemModal.tsx               جديد (5.15) — إضافة/تعديل عنصر محتوى (أكبر واحد، حقول شرطية فيديو/ملف/ملاحظة/اختبار + رفع ملف بـ progress)
      CourseMoveItemModal.tsx           جديد (5.15) — نقل عنصر لدورة/قسم/وحدة تانية (اختيارات متتالية)
      QuestionBankManager.tsx          ⚠️ اتقسّم (5.15): نزل من 1589 لـ 1311 سطر. pagination بالرقم + "استيراد من CSV" (5.9، 5.13) + زرار تصدير جنب كل تصنيف في الشجرة (5.14). المودالات بقت ملفات منفصلة تحت
      QuestionBankCategoryModal.tsx    جديد (5.15) — إضافة/تعديل تصنيف
      QuestionBankDeleteCategoryModal.tsx  جديد (5.15) — تأكيد حذف تصنيف (فيه فحص مسبق قبل الحذف)
      QuestionBankQuestionModal.tsx    جديد (5.15) — إضافة/تعديل سؤال
      QuestionBankDeleteQuestionModal.tsx  جديد (5.15) — تأكيد حذف سؤال
      QuestionBankPassageModal.tsx     جديد (5.15) — إضافة/تعديل نص قراءة
      QuestionBankDeletePassageModal.tsx   جديد (5.15) — تأكيد حذف نص قراءة
      TestQuestionsManager.tsx         ⚠️ اتقسّم (5.15): نزل من ~1420 لـ 1150 سطر. نفس pagination + "استيراد من CSV" + زرار تصدير (5.14). المودالات بقت ملفات منفصلة تحت
      TestEditQuestionModal.tsx        جديد (5.15) — تعديل سؤال
      TestQuickAddQuestionModal.tsx    جديد (5.15) — سؤال جديد مباشر + اختيارات ديناميكية
      TestRandomBuilderModal.tsx       جديد (5.15) — اختبار عشوائي (مرحلتين: اختيار تصنيفات ← معاينة، جوّه نفس المكوّن)
      ImportQuestionsModal.tsx         مودال مشترك: رفع CSV → معاينة/تحقق → تأكيد استيراد (قسم 5.13)
    account/ChangePasswordForm.tsx, LogoutButton.tsx
    courses/
      CourseContentTree.tsx            شجرة المحتوى — الاختبارات بقت trackable زي الفيديو/الملف، بادچ درجة آخر محاولة لكل اختبار، زرار "امتحن أسئلتك الغلط" فوق كل قسم (قسم 5.12)
      contentTypeIcons.tsx             أيقونات + `contentTypeAccent` (فيديو=وردي، ملف=أصفر، ملاحظة=بنفسجي، اختبار=تركواز) — ألوان ثابتة عبر كل الثيمات (قسم 5.10)
      RequestEnrollmentButton.tsx
      MarkSeenButton.tsx               "علّمها كمشاهدة" (فيديو/ملف/ملاحظة)
      MarkTestDoneButton.tsx           جديد — "علّمها إني امتحنتها قبل كده"، بس بشرط 80%+ في محاولة واحدة على الأقل، وإلا رسالة توضيحية (قسم 5.12)
      TestRunner.tsx                   حل اختبار: intro → in_progress → submitted. بعد التسليم: سكرول تلقائي لفوق + لينك "راجع أسئلتك الغلط دلوقتي" (لو الدرجة مش كاملة)
      ReviewRunner.tsx                 جديد — نفس منطق TestRunner بس من غير مؤقّت، بيحل أسئلة غلط بس (قسم 5.12)

  app/
    proxy محمي: /account, /admin/**
    account/page.tsx                   إحصائيات + بيانات شخصية + دورات + نقاط القوة/الضعف + نتايج اختبارات (بتستبعد جولات المراجعة `test_id is null`)
    admin/
      layout.tsx                       ⚠️ CSS Grid `minmax(0,1fr)` + `min-w-0` (قسم 5.9 — تفاصيل تحت)
      page.tsx
      courses/page.tsx, courses/[id]/content/page.tsx
      courses/[id]/content/[itemId]/questions/page.tsx
      students/page.tsx                pagination بالرقم + بحث سيرفر (قسم 5.9)
      requests/page.tsx
      questions/page.tsx
      reports/page.tsx                 بحث طالب → فلاتر → إحصائيات + نقاط قوة/ضعف + نتايج → طباعة (مصمّمة خصيصًا للطباعة، قسم 5.10). بتستبعد جولات المراجعة.
      tools/page.tsx                   "أدوات عامة": تحويل CSV لمذكرة Word (نسختين: بدون حل/محلولة، 4 ثيمات ألوان، شكل اختيارات inline/عمودي — قسم 5.13) + زرارين PDF (بدون حل/محلولة) بيفتحوا نافذة طباعة المتصفح (قسم 5.14)
    courses/
      page.tsx                         قايمة الدورات
      [id]/page.tsx                    صفحة الدورة — زرار "امتحن كل أسئلتك الغلط في الدورة" جديد
      [id]/content/[itemId]/page.tsx   فيديو/ملف/اختبار — MarkSeenButton أو MarkTestDoneButton أو TestRunner
      [id]/content/[itemId]/attempt/[attemptId]/page.tsx   مراجعة محاولة اختبار قديمة
      [id]/review/page.tsx             **جديد** — صفحة مراجعة الأسئلة الغلط (`?section=`/`?test=`/`&title=`)، بترندر ReviewRunner
    access-denied/page.tsx
    login/, signup/, contact/, page.tsx

scripts/                                سكريبتات نقل بيانات لمرة واحدة (Node، مش جزء من التطبيق) — قسم 5.6

tests/integration/                      اختبارات تكامل حقيقية على RPCs عن طريق Supabase محلي — قسم 5.7
  setup.ts                                clients (admin/anon)، createTestUser، seedCourseWithTest، enroll، cleanup*
  vitest.setup.ts                         polyfill لـ globalThis.WebSocket (Node 20 معندهوش أصلي)
  testAttempt.integration.test.ts         get_test_for_attempt / submit_test_attempt / get_test_attempt_review
  wrongQuestions.integration.test.ts      get_wrong_questions / submit_review_attempt
  topicPerformance.integration.test.ts    get_topic_performance
vitest.integration.config.mts           إعداد منفصل عن vitest.config.mts — `npm run test:integration`

supabase/
  migrations/
    20260802165757_remote_schema.sql      baseline كامل اتجاب بـ`supabase db pull` من المشروع الحي — قسم 5.7
  migrations_archive/                   الـ11 ملف القدام (توثيق تاريخي بس، مش بيتشغّلوا دلوقتي)
    20260730_course_files_storage.sql      ✅ bucket + RLS ملفات
    20260731_enrollment_requests.sql       ✅ enrollment_requests
    20260801_enrollment_expiry.sql         ✅ enrollments.expires_at
    20260802_reading_passages.sql          ✅ reading_passages
    20260803_test_taking.sql               ✅ قفل ثغرة is_correct + get_test_for_attempt/submit_test_attempt/get_test_attempt_review
    20260804_lock_test_attempts_writes.sql ✅ قفل كتابة test_attempts/test_answers على الأدمن بس
    20260805_topic_performance.sql         ✅ get_topic_performance
    20260806_add_missing_fk_indexes.sql    ✅ indexes على questions/question_options/reading_passages/question_categories/test_questions/test_attempts/test_answers
    20260807_more_growth_table_indexes.sql ✅ indexes على content_progress/enrollments/enrollment_requests/profiles.role
    20260808_wrong_questions_review.sql    ✅ test_attempts.test_id nullable + get_wrong_questions + submit_review_attempt
    20260809_wrong_questions_by_test.sql   ✅ get_wrong_questions بقت تقبل نطاق اختبار واحد (p_test_id)
```
**⚠️ أي migration جديد من دلوقتي فيه فرق:** لسه بيتكتب SQL ويتقال للمستخدم يشغّله يدوي في SQL Editor على المشروع الحي (زي الأول)، **بس دلوقتي كمان لازم يتحط نسخة منه في `supabase/migrations/` كملف منفصل** (مش تعديل الـbaseline)، عشان `supabase db pull --diff-engine migra` يفضل قادر يزامن الاثنين لاحقًا من غير تضارب.

## 5. تسلسل العمل اللي خلص

### 5.1 نظام التسجيل + بنك الأسئلة (شاتات سابقة) — كامل
تفاصيل الطلبات اليدوية/الأوتوماتيكية، مدة الاشتراك، شجرة التصنيفات، البحث، نص القراءة المشترك، بناء اختبار عشوائي — جاهز ومستقر.

### 5.2 صفحة حل الاختبار — بُنيت بالكامل، وقُفلت الثغرة الأمنية
دوال RPC (`security definer`) بدل Edge Function. `TestRunner.tsx` state machine كامل، مراجعة فورية بعد التسليم، `MarkSeenButton.tsx` بدل التسجيل التلقائي القديم، RLS الكتابة على `test_attempts`/`test_answers` مقفولة على الأدمن بس.

### 5.3 تحسين شكل رحلة الطالب بالكامل (بصريًا)
`/account` بهيدر بنفسجي + `DecorShapes`، خريطة ألوان ثابتة لكل نوع محتوى، `RequestEnrollmentButton` متحرك. **باگ اتصلح مرتين:** `RevealCard` مع `viewport={{once:false}}` بيتكرر مع عناصر طويلة/متغيّرة الحجم — استخدمها للكروت الصغيرة الثابتة بس.

### 5.4 تقرير الأدمن + نقاط القوة والضعف
`/admin/reports` — بحث طالب → فلاتر → إحصائيات + نقاط قوة/ضعف + نتايج قابلة للتوسيع → طباعة. `get_topic_performance` + `TopicPerformance.tsx`.

### 5.5 إصلاح أداء بنك الأسئلة (بعد نقل البيانات)
الأسئلة/الاختيارات بتتجاب حسب التصنيف المفتوح بس، البحث استعلام سيرفر، الحذف بيتفحص بعدّ سيرفر مش array محلي. (لاحقًا اتحوّلت من "تحميل أكتر" لترقيم صفحات بالرقم — قسم 5.9.)

### 5.6 نقل بيانات المنصة القديمة (Neon → Supabase)
1 دورة، 2 قسم، 12 وحدة، 170 اختبار، 8 تصنيفات، 11,884 سؤال، 46,303 اختيار، 11,591 ربط سؤال-اختبار. تفاصيل السكريبتات في `scripts/`، والـ credentials في `.env.migration.local` (متجاهل من git). تفاصيل إضافية في ملف memory "project-neon-migration" (خارج الريبو).

### 5.7 اختبارات آلية — المرحلة 1 (وحدة) والمرحلة 2 (تكامل) خلصوا الاتنين
**المرحلة 1 (وحدة):** Vitest (`vitest.config.mts` — لازم يفضل `.mts`)، `npm test`، 56 اختبار على دوال خالصة، بيستبعد `tests/integration/**` صراحة عشان يفضل سريع وبدون أي اعتماد على Supabase.

**المرحلة 2 (تكامل، اتعملت في شات لاحق):** `npm run test:integration` (`vitest.integration.config.mts`، ملفاتها `tests/integration/*.integration.test.ts`) — بتشغّل RPCs حقيقية (`get_test_for_attempt`, `submit_test_attempt`, `get_test_attempt_review`, `get_wrong_questions`, `submit_review_attempt`, `get_topic_performance`) على سيرفر Supabase محلي كامل (مش موك)، بتعمل مستخدمين حقيقيين بـ `auth.signUp` وتتحقق من RLS فعليًا (طالب غير مسجّل يترفض، صاحب المحاولة/الأدمن بس يشوفوا المراجعة، إلخ)، مش بس منطق الدوال. **10 اختبارات، بتغطي تدفق حل الاختبار وتصحيحه ومراجعة الأسئلة الغلط ونقاط القوة/الضعف كاملين.**

**لازم `npx supabase start` شغال الأول** (يحتاج Docker Desktop شغال). `tests/integration/setup.ts` فيه مفاتيح local dev الافتراضية بتاعة Supabase (موثّقة رسميًا، مش سر خاص بالمشروع) + helpers (`createTestUser`, `seedCourseWithTest`, `enroll`, `cleanupCourse`...). التنضيف بعد كل اختبار بيمسح بس الدورة/التصنيف اللي الاختبار عمله (بادئة `[test]` في العنوان) + المستخدمين اللي اتعملوا — الـ FK كلها `ON DELETE CASCADE` فمسح الدورة/التصنيف كافي.

**السكيما الحقيقية اتجابت بـ `supabase db pull`** من المشروع الحي (مش مكتوبة كملف migration واحد يدوي)، لأن جزء كبير منها كان اتعمل يدوي في SQL Editor (قسم 3) ومكنش موجود في `supabase/migrations/` القديمة. الـ11 ملف القدام اتنقلوا لـ `supabase/migrations_archive/` (للتوثيق التاريخي بس، مش بيتشغّلوا)، وبقى فيه ملف واحد جديد `supabase/migrations/20260802165757_remote_schema.sql` هو الـbaseline الكامل اللي `supabase start` بيستخدمه دلوقتي.

**⚠️ دروس حقيقية اتعلمناها من الإعداد ده (تستاهل توثيق لأي شات جاي):**
1. **`supabase db pull` مبتشتغلش لو فيه migrations محلية بتفترض سكيما مش موجودة فعليًا في الشادو داتابيز الفاضية.** الحل: تنقل الـmigrations القديمة بره المجلد مؤقتًا، تعمل `supabase migration repair --status reverted <versions>` عشان تصالح جدول تتبّع الـmigrations على المشروع البعيد، بعدين `db pull` بيقدر يجيب السكيما الكاملة كملف واحد.
2. **الـdiff engine الافتراضي (`pg-delta`) فشل بخطأ `EAUTHQUERY unsupported secret format`** مع مفاتيح Supabase الجديدة (`sb_publishable_...`/`sb_secret_...`) — الحل: `supabase db pull --diff-engine migra` (المحرك القديم الأكثر استقرارًا).
3. **`.env.local` لو فيه BOM (`EF BB BF`) في أوله** بيوقّع أخطاء غريبة في أي أداة CLI بتحاول تقراه كـenv file (زي "unexpected character"). لو ظهرت المشكلة دي، افتح الملف وشوف أول بايت.
4. **Node.js 20 (نسخة المشروع الحالية) معندهاش WebSocket أصلي**، و`@supabase/supabase-js` بيحتاجه وقت `createClient` حتى لو مش هنستخدم realtime خالص. الحل: `ws` كـdevDependency + polyfill لـ`globalThis.WebSocket` في `tests/integration/vitest.setup.ts` قبل أي import.
5. **`get_wrong_questions` عندها overload بـ2 وبـ3 parameters** (قسم 3) — لو اتنادت بـ`p_course_id`/`p_section_id` بس من غير `p_test_id`، PostgREST بيرفض ينفذ (`PGRST203: ambiguous function`) لأنه مش عارف يحدد أي نسخة. **مش باگ حقيقي فعليًا** — الواجهة (`ReviewRunner.tsx`) أصلاً بتبعت الـ3 parameters دايمًا (`p_test_id: testId ?? null`)، بس أي كود جديد بينادي الدالة دي لازم يتبع نفس القاعدة: **ابعت الـ3 parameters صراحة دايمًا، حتى لو `p_test_id: null`**.
6. **إنشاء مستخدم اختبار لازم يبعت `full_name` في `options.data`** بالظبط زي `signup/page.tsx` — عمود `profiles.full_name` مالوش default وبيرفض null، والـtrigger `handle_new_user` بيقرا القيمة من `raw_user_meta_data` مباشرة.
7. **Docker Desktop على ويندوز ممكن يعلّق على ملف قديم تايه** (`AppData\Local\Docker\run\dockerInference`, reparse point) بخطأ "cannot be accessed by the system" — الحل: مسحه من PowerShell Admin (`Remove-Item ... -Force`)، أو reboot لو مسح الملف من غير صلاحيات مدير فشل.

### 5.8 إصلاح مشكلة أداء حرجة: `statement timeout` في بنك الأسئلة
بعد نقل بيانات Neon، فتح تصنيف في بنك الأسئلة بدأ يرمي **خطأ `57014` (canceling statement due to statement timeout)** بدل ما يعرض الأسئلة. **السبب الجذري:** Postgres مبيعملش index تلقائي على أعمدة foreign key — فلترة `questions.category_id` مع embed `question_options.question_id` (مع الحجم الحالي: 11k+ سؤال، 46k+ اختيار) كانت seq scan كامل كل مرة.
**الحل:** migration بيضيف index على كل عمود FK بيتفلتر عليه فعليًا في الكود — مش بس في بنك الأسئلة، كمان في أي جدول تاني بيكبر مع الاستخدام (`content_progress`, `enrollments`, `enrollment_requests`, `profiles.role`) قبل ما يبقى نفس المشكلة فيهم بعد شوية استخدام حقيقي. **الدرس العام (اتحطّ في قسم 2):** أي عمود FK جديد بيتفلتر بيه في جدول بيكبر، لازم يتحقق إن عليه index وقت الإنشاء، مش لما يحصل timeout.

### 5.9 ترقيم صفحات بالرقم بدل "تحميل أكتر" + إصلاح اسكرول عرضي
- **مشكلة اسكرول عرضي** في صفحات الأدمن على شاشات متوسطة: سببها فخ CSS Grid كلاسيكي — عمود `1fr` في `grid-template-columns` عنده `min-width: auto` افتراضي، يعني مش بيصغّر تحت حجم محتواه. الحل: `minmax(0,1fr)` بدل `1fr` + `min-w-0` على العناصر الداخلية (`admin/layout.tsx`, `QuestionBankManager.tsx`, `TestQuestionsManager.tsx`).
- **صفحة الطلاب** اتحوّلت من تحميل كل الطلاب دفعة واحدة لـ pagination سيرفر حقيقي (20/صفحة) + بحث سيرفر (`ilike` على الاسم/التليفون عن طريق `.or()`)، مع تسجيلات الدورات بتتجاب للطلاب الظاهرين في الصفحة بس.
- **بنك الأسئلة وأسئلة الاختبار** اتحوّلوا من زرار "حمّل أسئلة أكتر" (تراكمي) لـ **ترقيم صفحات بالرقم** (50/صفحة) — قرار المستخدم صراحة: عايز يقدر يوصل لآخر صفحة على طول من غير ضغط متكرر. إضافة سؤال بتوديك لآخر صفحة تلقائي (لأن الترتيب الجديد بيتحط آخر التصنيف)، وحذف سؤال بيرجّعك لآخر صفحة صحيحة تلقائي لو الصفحة الحالية بقت مش موجودة (self-healing).
- كومبوننت `Pagination.tsx` مشترك بين التلاتة (أرقام صفحات + "…" لو كتير، تقدر توصل لأي صفحة أو آخر واحدة بضغطة واحدة).

### 5.10 تصميم للطباعة + نظام ثيمات (3 ثيمات)
**الطباعة:** تقرير الأدمن (`/admin/reports`) كان بيطبع نفس تصميم الشاشة (كروت كبيرة، مساحات واسعة) — بيستهلك ورق كتير. الحل: `ReportPrintHeader` (هيدر مخصص للطباعة بس: اسم المنصة + عنوان + بيانات الطالب + الفلاتر المطبّقة + تاريخ الطباعة)، عنوان كبير عريض لبداية كل اختبار في الطباعة التفصيلية، `QuestionReviewCard`/`TopicPerformance` بأنماط `print:` مضغوطة (عمودين للاختيارات في الطباعة)، و"طباعة الدرجات" بقت تستبعد تفاصيل الأسئلة دايمًا (حتى لو متفتوحة على الشاشة وقت الطباعة). **⚠️ درس:** تصغير عام لمقاس الخط بالجملة (`html{font-size:X%}`) في وضع الطباعة فكرة سيئة — بيصغّر كل حاجة بما فيها النص المهم قراءته. الأفضل: كل عنصر يتحكم في مقاسه في الطباعة لوحده.

**نظام الثيمات:** 3 ثيمات (`default` بنفسجي/الهوية الحالية، `green` أخضر متناسق، `dark` داكن) — `src/lib/theme.ts` + `ThemeToggle.tsx` في الهيدر (ظاهر في كل صفحة). آلية الحفظ: `localStorage` بس (مش مربوطة بالحساب، قرار المستخدم صراحة — أبسط وأسرع، والتريد-أوف المقبول إن الثيم يرجع للافتراضي على جهاز تاني). **معمارية:** متغيرات CSS (`--color-bg`, `--color-ink`, `--color-primary`, + `--color-surface` الجديد بديل `bg-white` الحرفي) بتتغيّر تحت `[data-theme="x"]`، وTailwind v4 بيولّد كل الـ utilities منها تلقائي. **ألوان البراند (`pink`/`yellow`/`teal`) ثابتة في كل الثيمات** — بترمز لأنواع المحتوى (`contentTypeAccent`) وتغييرها هيكسر اتساق بصري الطالب. سكريبت `beforeInteractive` (`next/script`) بيطبّق الثيم المحفوظ قبل أي paint (مفيش فلاش). **درس تصميم:** أول نسخة من ثيم `dark` استخدمت لون primary زاهي جدًا (`#8B6FEA`) واستخدامه كخلفية بانر كامل كان "فاقع ويوجع العين" — اتصلح بلون أقل تشبّع (`#756B9E`) بنفس الدرجة اللونية. **درس تقني:** تجاوز متغيرات Tailwind الجاهزة (`--color-red-50` إلخ) ممكن ومفيد لتصحيح تباين حالات الخطأ في الثيم الداكن من غير لمس أي كومبوننت.

### 5.11 تتبّع تقدّم الاختبارات + مراجعة الأسئلة الغلط
- **تعليم اختبار كـ"امتحنته"**: زرار جديد (`MarkTestDoneButton.tsx`) بس **بشرط**: الطالب لازم يكون جاب 80%+ في محاولة واحدة على الأقل (بيتفحص سيرفر-سايد)، وإلا رسالة توضيحية بدل التعليم. الاختبارات بقت trackable زي الفيديو/الملف (بتدخل في نسبة "تقدمك في الدورة")، وكل اختبار بيوري بادچ بآخر درجة للطالب (مستقل عن علامة الصح — بيظهر حتى لو لسه مش معلّم عليه).
- **مراجعة الأسئلة الغلط**: 3 نقط دخول — زرار فوق كل قسم (كل الغلط في القسم ده)، زرار فوق الدورة كلها، ولينك "راجع أسئلتك الغلط دلوقتي" على شاشة نتيجة أي اختبار (بيظهر بس لو الدرجة مش كاملة، ونطاقه الاختبار ده بس). **تعريف "غلط":** آخر إجابة سجّلها الطالب على السؤال ده (في أي محاولة، عادية أو مراجعة سابقة) كانت غلط أو متسجّلتش — يعني بمجرد ما يجاوبه صح مرة، بيختفي من القايمة تلقائي في المرة الجاية، من غير أي جدول تتبّع إضافي. **القرار المعماري:** `test_attempts.test_id` بقى nullable عشان جولة مراجعة ممكن تجمع أسئلة من كذا اختبار مختلف في نفس الجلسة (السيستم الأصلي مبني على افتراض محاولة = اختبار واحد بعينه). محاولات المراجعة دي **مستبعدة من تقارير الأدمن وصفحة الحساب** (مش امتحان رسمي).
- بعد التسليم (اختبار عادي أو مراجعة)، الصفحة بترجع لفوق تلقائيًا (`window.scrollTo`) بدل ما تفضل واقفة في نص/آخر الأسئلة.

### 5.12 رفع الملفات PDF بس
`CourseContentManager.tsx` — `accept=".pdf"` + فحص امتداد صريح في `onChange` (رسالة خطأ لو حد قدر يتجاوز فلتر نظام التشغيل).

### 5.13 استيراد أسئلة بالجملة (CSV) + أداة تحويل لمذكرة Word
- **قرار أمني مهم:** كنا هنستخدم مكتبة جاهزة لقراءة Excel (`xlsx` أو `exceljs`)، لكن `npm audit` كشف ثغرات خطيرة من غير حل متاح في الاتنين. **الحل: بارسر CSV مكتوب يدوي بدون أي مكتبة خارجية** (`src/lib/questionsCsv.ts`، 10 اختبارات وحدة) — بيتعامل مع حقول متحاطة بـ`""` وفيها فواصل، وBOM. **الدرس العام:** أي مكتبة جديدة هتتعامل مع تحليل/رفع ملفات، شغّل `npm audit` بعد التثبيت مباشرة قبل الاستخدام.
- **شكل ملف CSV المتفق عليه:** نص السؤال، اختيار أ، اختيار ب، اختيار ج، اختيار د، الإجابة الصح (حرف واحد من أ-د). مفيش عمود تصنيف — التصنيف بيتحدد من السياق (التصنيف المفتوح في بنك الأسئلة، أو تصنيف "عامة" الافتراضي + الاختبار الحالي في صفحة أسئلة الاختبار).
- **`ImportQuestionsModal.tsx`** (مشترك بين `QuestionBankManager` و`TestQuestionsManager`): رفع → معاينة كل صف مع تمييز الأخطاء → تأكيد. فيه تنزيل نموذج فاضي (لازم BOM `﻿` في أول الملف المولّد وإلا Excel بيفتح العربي كرموز غريبة — درس اتعلّمناه بالتجربة).
- **صفحة "أدوات عامة"** (`/admin/tools`، جديدة بالكامل) — بتاخد نفس ملف الـ CSV وتولّد منه ملف Word (مكتبة `docx`، توليد بالكامل في المتصفح من غير رفع لأي سيرفر): نسختين (بدون حل / محلولة)، **4 ثيمات ألوان** حقيقية شائعة في المذكرات التعليمية (افتراضي بهوية الوجيز، كلاسيكي كحلي/ذهبي، دافئ برتقالي/أخضر، اقتصادي رمادي بلون واحد لتوفير الحبر)، وخيار شكل الاختيارات (صف أفقي واحد أو كل اختيار في سطر). هيدر بانر كامل العرض بلون الثيم + شريط تمييز + إطار حول الصفحة + اسم الأستاذ عادل فؤاد عاشور.
- **⚠️ درسين تقنيين مهمين لأي شغل مستقبلي بـ `docx`:**
  1. **RTL:** تحديد `bidirectional: true` على الفقرة مش كافي — كل `TextRun` لازم `rightToLeft: true` بتاعه لوحده، وإلا Word بيلخبط ترتيب الأرقام/الكلمات المختلطة (شفناه فعليًا: رقم السؤال ونص السؤال طلعوا بترتيب معكوس).
  2. **الخط:** خاصية `font` لازم تتبعت كـ **object** (`{ ascii, hAnsi, cs }`) مش string واحد — Word بيرندر العربي عن طريق slot الـ complex-script (`cs`) بشكل منفصل عن اللاتيني، فلو حددت خط كـ string واحد بس، العربي بيرجع لخط افتراضي وحش من غير تحذير.
  - **⚠️ الخط الحالي "Changa ExtraBold"** مش من خطوط ويندوز الافتراضية — لازم يكون مثبّت على أي جهاز هيفتح الملف، وإلا Word هيستبدله بخط تاني تلقائي من غير تنبيه.

### 5.14 تصدير مباشر من القاعدة (CSV / Word / PDF) — بدون رفع ملف
تصدير مباشر لأسئلة موجودة بالفعل في القاعدة، من غير أي رفع CSV، من **4 أماكن**: تصنيف في بنك الأسئلة (+ تصنيفاته الفرعية تلقائي)، اختبار واحد، وحدة كاملة، قسم كامل، دورة كاملة. مودال مشترك واحد (`ExportQuestionsModal.tsx`) بيظهر في الأربع أماكن، بياخد `loadQuestions` كـ prop (دالة async بترجع الأسئلة حسب النطاق) ويكاشها في نفس فتحة المودال.

- **الصيغ:** CSV (بيتفتح في إكسل، مش .xlsx حقيقي — عشان تجنّب مكتبة جديدة غير مفحوصة زي `xlsx`/`exceljs` المرفوضين، قسم 5.13)، Word (نفس `buildQuestionMemoDocx`/`MEMO_THEMES` بتاعة أداة "أدوات عامة")، وPDF (جديد — `questionMemoHtml.ts` بيبني نفس شكل المذكرة كـ HTML، وبيفتحها في تاب جديد بيطلق `window.print()` تلقائي، والمستخدم يختار "حفظ كـ PDF" — **بدون أي مكتبة PDF خارجية**، بنفس فلسفة صفحات الطباعة الموجودة في المنصة أصلاً).
- **حد الـ1000 صف بتاع PostgREST (قسم 2):** الدرس الجديد هنا إنه **مش بس على `select()` مباشر على جدول كبير — كمان على جدول وسيط many-to-many زي `test_questions`.** أول تنفيذ لـ `fetchQuestionsForTestIds` كان بيجيب روابط `test_questions` بـ `.in("test_id", chunk)` من غير `.range()` — مع تصدير دورة/قسم كبير (170 اختبار × ~68 سؤال/اختبار = 11,591 رابط) ده كان هيرجع أول 1000 رابط بس ويسكت عن الباقي بصمت. **الحل:** حلقة `.range()` داخل كل دفعة IDs، مش بس على الاستعلامات المباشرة على `questions`.
- **⚠️ درس RTL جديد في `docx` (فوق درسين قسم 5.13):** جدول الاختيارات الأفقي (`optionsInlineRow` في `questionMemoDocx.ts`) كان بيرجع الاختيارات معكوسة (أ مكان د والعكس) — السبب: `Table` في مكتبة `docx` بترتّب خلاياها فيزيائيًا شمال-ليمين افتراضيًا **بغض النظر عن** `rightToLeft`/`bidirectional` على النص جواها. الحل: `visuallyRightToLeft: true` على مستوى الـ`Table` نفسه (property موجودة في `ITableOptions`، مش موثّقة كتير).
- **حد أقصى للـ PDF اتجرّب واتشال:** حاولنا نحط حد (1000 سؤال) بيقفل زرار PDF لو النطاق كبير أوي (عشان معاينة الطباعة بتعلّق فعليًا مع آلاف الأسئلة — تأكدنا إن المشكلة في رسم/تقسيم المتصفح مش في الفيتش). **المستخدم رفض الفكرة صراحة وطلب نرجعها زي ما كانت من غير أي ليمت** — إتم الرجوع فورًا. **المشكلة الأصلية (تعليق الـ PDF مع نطاق كبير) لسه موجودة ومفيش حل ليها دلوقتي** — قسم 6.

### 5.15 تقسيم 3 ملفات إدارية ضخمة لمكونات أصغر (استخراج مودالات فقط)
`QuestionBankManager.tsx` (1589 سطر) و`TestQuestionsManager.tsx` (~1420) و`CourseContentManager.tsx` (~1330) كانوا كبروا جدًا وبطّأوا الشغل عليهم (لقينا صعوبة نفهم مكان الإضافة الصح وقت تنفيذ 5.14). اتقسّموا الثلاثة، بنفس المبدأ بالظبط في الثلاثة: **استخراج JSX بس (presentational)** — الـ `useState`/handlers فضلوا 100% زي ما هما في الملف الأب، الاستخراج بس نقل بلوك الـ JSX لملف مكوّن منفصل بياخد نفس المتغيرات/الدوال الحالية كـ props. **صفر تغيير منطقي.** الأسباب: (1) أقل مخاطرة ممكنة لكود شغال ومعقّد الترابطات (فحص مسبق قبل حذف تصنيف، آثار جانبية على `order_index`)، (2) الملفات دي **مفيهاش تغطية اختبارات** (قرار مؤجل، قسم 5.7)، فأي إعادة تصميم لمكان الـ state كانت هتعتمد على اختبار يدوي بس.
- `QuestionBankManager.tsx`: 6 مودالات (تصنيف، حذف تصنيف، سؤال، حذف سؤال، نص قراءة، حذف نص قراءة).
- `TestQuestionsManager.tsx`: 3 مودالات (تعديل سؤال، سؤال جديد مباشر، اختبار عشوائي).
- `CourseContentManager.tsx`: 4 مودالات (قسم، وحدة، عنصر، نقل) + ترقية الـ`ConfirmModal` المحلي (كان معرّف جوّه الملف نفسه، أنضف من باترن `QuestionBankManager` أصلاً لأنه عام) لمكوّن مشترك حقيقي في `shared/`.
- **نطاق مش اتلمس عمدًا:** مودالات الحذف الجاهزة في `QuestionBankManager` (3 ملفات) مقارناش استخدامها بالـ`ConfirmModal` المشترك الجديد — فرصة تنضيف صغيرة لو حبّينا لاحقًا (قسم 6).

### 5.16 فحص وإصلاح الموبايل (شغال، جزء منه خلص)
- **فتح السيرفر المحلي على الموبايل:** Next.js 16 بيمنع افتراضيًا أي origin غير `localhost` (حماية DNS rebinding) — لازم `allowedDevOrigins` في `next.config.ts` بـ IP جهاز المستخدم على الشبكة (قسم 2). التحقق ده اتعمل عن طريق قراءة `node_modules/next/dist/docs/` مباشرة (مش افتراض من الذاكرة) — نفس المرة اتأكدنا كمان إن Next.js بيحط `<meta name="viewport">` تلقائيًا (مش السبب في مشاكل mobile اللي ظهرت).
- **مشكلة 1 (اتصلحت): أسماء/نصوص مقطوعة بـ`truncate`/`line-clamp`.** 19+ مكان في كل صفحات الأدمن كانوا بيقطعوا الاسم/النص بـ"..." لو المساحة ضاقت. الحل: استبدال بـ`break-words` (النص يلف على أكتر من سطر بدل ما يتقطع).
- **مشكلة 2 (اتصلحت، واكتشفناها بسبب حل مشكلة 1): صفوف "اسم + أزرار جنب بعض" بتتهرّي على الموبايل.** الباترن المتكرر في كل صفوف القوائم (شجرة بنك الأسئلة، صفوف الأسئلة، محتوى الدورة، صفوف تعديل الاختيارات): أيقونة/اسم (`flex-1 min-w-0`) + مجموعة أزرار تابتة الحجم (`shrink-0`) في نفس الصف. على الموبايل، الأزرار التابتة بتاخد كل المساحة وتسيب للاسم/النص مساحة شبه صفر — ومع `break-words` (بدل `truncate` القديم) ده بيظهر كـ"عمود من حروف منفصلة كل حرف في سطر" (شفناه فعليًا في screenshot). **الحل المطبّق في كل الأماكن دي:** الاسم/النص بيتلف مع أول عنصر مرتبط بيه (أيقونة/رقم) في `div` بـ`w-full sm:w-auto sm:flex-1 min-w-0`، والأزرار في `div` منفصل، والصف الأب بقى `flex-wrap` — يعني على الموبايل الاسم بياخد سطر كامل والأزرار تنزل تحته، وعلى الشاشات الأكبر يرجعوا جنب بعض. **⚠️ درس عام لأي صف جديد فيه اسم/نص + أزرار:** لازم تتأكد من الأول إنه هيلف صح على شاشة ضيقة، مش تكتشف بعد ما يتنفّذ.
- **⚠️ درس تعامل مهم:** لما المستخدم يقول "سيب الموضوع الفلاني دلوقتي" أو "بلاش نتكلم في ده"، **ده مش تفويض إنك تنفّذ حاجة فيه لاحقًا من غير ما يطلب صراحة** — حصل لبس فعليًا (اتحط حد أقصى للـ PDF بعد ما المستخدم طلب يسيب الموضوع، واتزعل واتقال يترجع فورًا، قسم 5.14).
- **لسه مش اتأكد منه بالكامل:** المستخدم لسه بيجرب صفحات تانية على الموبايل، ممكن يطلع حاجات تانية.

## 6. الخطوات المقترحة للشات الجديد

### أول حاجة تتعمل — فحص الموبايل مستمر
**المستخدم كان بيفحص الموقع على الموبايل وقت ما الشات ده اتقفل — الأرجح إنه لسه مكمّلش الفحص بالكامل.** ابدأ بسؤاله هل لسه بيلاقي حاجات تانية غريبة على الموبايل (نفس نمط "اسم + أزرار جنب بعض" ممكن يكون موجود في صفحات مالمسناهاش، زي `admin/reports/page.tsx` أو `admin/students/page.tsx` — شوف قسم 5.16 قبل ما تفترض حاجة).

### مشكلة مفتوحة بلا حل — لازم قرار
**تعليق PDF مع نطاق تصدير كبير (دورة/قسم كامل، آلاف الأسئلة)** — معاينة طباعة المتصفح بتحاول تحسب تقسيم آلاف الصفحات وقت الفتح وبتعلّق لدقائق. حاولنا نحط حد أقصى (1000 سؤال) يقفل زرار PDF فوقه، **بس المستخدم رفضها ورجّعناها** (قسم 5.14) — يعني المشكلة الأصلية لسه موجودة زي ما هي. لو المستخدم فتح الموضوع تاني، الخيارات المطروحة قبل كده: (1) حد أقصى بعدد الأسئلة يقفل الزرار، (2) تقسيم التصدير لكذا ملف PDF أصغر، (3) قصر PDF على النطاقات المتوسطة بس (اختبار/تصنيف/وحدة) وشيله من مستوى الدورة/القسم الكبير. **متطلعش بمبادرة ذاتية — انتظر يفتح الموضوع بنفسه.**

### أفكار تانية مطروحة (اتناقشت، مقدرش أعمل حاجة منها بمبادرة ذاتية)
1. **تنضيف صغير: توحيد مودالات حذف `QuestionBankManager.tsx`** — دلوقتي فيه `ConfirmModal` مشترك حقيقي (قسم 5.15)، ومودالي حذف السؤال والنص القراءة في `QuestionBankManager` بايتين زيه تمامًا — ممكن نستبدلهم بيه (مودال حذف التصنيف لأ، فيه منطق فحص إضافي مختلف).
2. **دمج ملفات PDF في ملف واحد** — مفيد بعد ما رفع الملفات بقى PDF بس (قسم 5.12).
3. **QR code / لينك مختصر للدورة** — للترويج/البوسترات.
4. **تقرير "الأسئلة الأصعب"** — نسبة الغلط لكل سؤال عبر كل الطلاب. **المستخدم قال صراحة مش محتاجها دلوقتي** — موثّقة بس لو غيّر رأيه.
5. **المرحلة 2 من الاختبارات الآلية** (قسم 5.7) — لما المستخدم يكون مستعد يدّي وصول لمشروع Supabase الحي بنفسه.
6. **تحسين شكل لوحة الأدمن بصريًا** — اتلمس جزئيًا بنظام الثيمات (قسم 5.10) وتقسيم الملفات (5.15)، بس لسه مفيش إعادة تصميم بصري شاملة زي رحلة الطالب.
7. **تكرار تقسيم المودالات على ملفات تانية** لو فيه ملفات إدارية تانية كبرت بمرور الوقت (بعد 5.15، مفيش ملف تاني بنفس الحجم دلوقتي، بس يستاهل مراجعة دورية).

**ابدأ بسؤال المستخدم** أي واحدة من دول عايز يبدأ بيها، أو لو عنده حاجة تانية في باله — أو كمّل فحص الموبايل لو لسه مفتوح.

## 7. ملاحظات ونصائح للشات الجديد

- **اسأل بدل ما تفترض** — المستخدم بيحب يناقش الاتجاه قبل التنفيذ، وأي حاجة معندهاش إجابة واضحة واحدة لازم تتسأل بدل ما تتفرض. لاحظ بالذات: مع أي ميزة فيها قرار تصميم بصري (ألوان، تنسيق، شكل ملف)، المستخدم بيحب يتفق على "المواصفة" الأول قبل أي تنفيذ — استخدم `EnterPlanMode` أو ناقش نصيًا حسب حجم القرار.
- **مفيش login متاح للمساعد (Claude)** — أي تحقق بصري من صفحات الأدمن أو صفحات الطالب المحمية لازم يعمله المستخدم بنفسه ويوصف النتيجة. التحقق المتاح: `tsc`/`lint`/`npm test`، تصفح الصفحات العامة فعليًا في الـ Browser pane (تأكيد إن مفيش console errors)، وتأكيد إن الصفحات المحمية بتعمل redirect صح لما تتفتح من غير جلسة.
- **قبل ما تضيف مكتبة npm جديدة بتتعامل مع ملفات (رفع/تحليل/توليد)، شغّل `npm audit` بعد التثبيت مباشرة.** رفضنا `xlsx` و`exceljs` بسبب ثغرات من غير حل، واستخدمنا بارسر CSV يدوي بدالهم. `docx` (لتوليد Word) اتفحصت ونضيفة.
- **أي migration جديد** لازم يتكتب كملف SQL في `supabase/migrations/` ويتقال للمستخدم يشغّله بنفسه في Supabase SQL Editor. لو مش متأكد من اسم دالة/جدول/policy موجودة بالظبط، اطلب من المستخدم screenshot بدل التخمين.
- **جداول كبيرة = لازم pagination/فلترة دايمًا.** وأهم من كده: **أي عمود FK جديد بيتفلتر بيه في جدول بيكبر لازم يتضاف له index في نفس الـ migration من الأول** — متستناش لحد ما يحصل `statement timeout` (كود `57014`) زي ما حصل في قسم 5.8.
- **Pagination بالرقم مش "تحميل أكتر"** — دي القاعدة المتبعة دلوقتي لأي قايمة طويلة جديدة (قرار المستخدم صراحة في قسم 5.9)، استخدم `src/components/shared/Pagination.tsx` الموجود.
- **CSS Grid:** أي `grid-template-columns` فيه `1fr` جنب عمود ثابت لازم يبقى `minmax(0,1fr)` مش `1fr` عادي (فخ `min-width:auto` الافتراضي بيسبب اسكرول عرضي — قسم 5.9).
- **الطباعة:** كل صفحة جديدة تحتاج طباعة نضيفة، اتبع نمط `admin/reports/page.tsx` (هيدر مخصص للطباعة، `print:` classes لكل عنصر لوحده) — **متعملش** تصغير عام لمقاس الخط بالجملة في `@media print`.
- **الأنماط المتكررة اللي لازم تتبعها في أي كود جديد:**
  - تأكيد مخصص (framer-motion modal) لأي عملية حذف أو تعديل حساس — مفيش `confirm()`/`alert()` من المتصفح خالص.
  - كل الحذف اللي بيمس علاقات لازم يتفحص أو ينضف العلاقات الأول قبل الحذف الفعلي.
  - أي state جديد في صفحة أدمن بيتبني بنفس المقاس الكبير (خطوط `text-base`+، أزرار `py-3.5 rounded-full`، مفيش حاجة مخفية وراء hover).
  - عمليات حساسة أمنيًا (منع تسريب بيانات، تصحيح درجات، شروط أهلية زي شرط الـ80%) عن طريق دوال RPC `security definer` أو فحص سيرفر-سايد — مش منطق بالكامل في الواجهة. عمليات شخصية بحتة (زي تتبّع "شفت ده قبل كده") مقبول تكون client-side بسيطة زي `trackContentSeen`.
  - سكريبتات نقل/فحص بيانات لمرة واحدة تتحط في `scripts/` (مش `src/`)، قراءة أي قاعدة بيانات خارجية جوه `BEGIN TRANSACTION READ ONLY` دايمًا.
  - `RevealCard` بس للعناصر الصغيرة/الثابتة قرب أعلى الصفحة.
  - ألوان البراند (`pink`/`yellow`/`teal`) وترميز نوع المحتوى (`contentTypeAccent`) ثابتة دايمًا، بغض النظر عن الثيم المختار.
- **eslint** فيه قاعدة `react-hooks/set-state-in-effect` بتدّي error متكرر على أي صفحة فيها `useEffect(() => { fetchAll() }, [])` — ده نمط موجود من الأول في كل الملفات ومقبول، مش لازم يتصلح. لو عملت effect جديد فيه `setState` مباشر (زي مؤقّت/debounce)، فضّل تأجيله جوه `setTimeout`/event handler.
- **رسائل console قديمة متكررة ممكن تظهر بعد أي تعديل** أثناء التطوير — دي غالبًا cache من محاولات hot-reload سابقة، مش انعكاس للحالة الحالية. اتأكد بـ `tsc`/`lint` النضاف + navigate حقيقي للصفحة قبل ما تقلق.
- **Browser pane (أداة المعاينة بتاعة Claude):** لو الـ pane مش ظاهر فعليًا على الشاشة، بعض قيم `getComputedStyle` ممكن تطلع قديمة/غلط لعناصر معيّنة (مش بگ حقيقي في الكود — مجرد caching في بيئة الأتمتة). لو نتيجة فحص لون/تنسيق شكلها غريبة ومش متوقعة، جرّب تعمل forced reflow (`el.style.display='none'; void el.offsetHeight; el.style.display=''`) قبل ما تفترض إن فيه مشكلة حقيقية.
- **⚠️ أي صف/كارت جديد فيه اسم أو نص متغيّر الطول + مجموعة أزرار جنب بعض (`shrink-0`) في نفس الصف — لازم يتصمم من الأول عشان يلف صح على شاشة ضيقة.** الباترن الآمن (قسم 5.16): الاسم/النص + أي عنصر مرتبط بيه (أيقونة/رقم) في `div` بـ`w-full sm:w-auto sm:flex-1 min-w-0`، والأزرار في `div` منفصل shrink-0، والصف الأب `flex-wrap`. من غير ده، الأزرار التابتة الحجم بتاخد كل المساحة على الموبايل وتسيب للاسم مساحة شبه صفر — ومع نص طويل ده بيظهر كـ"عمود حروف منفصلة" مش مجرد قطع عادي.
- **حد الـ1000 صف بتاع PostgREST (قسم 2) بيتطبّق على أي جدول بترجع منه صفوف كتير — مش بس أول `select()` على الجدول الرئيسي.** جداول وسيطة many-to-many زي `test_questions` كمان محتاجة `.range()` لو النطاق ممكن يكبر (قسم 5.14).
- **مكتبة `docx`: جدول (Table) بيرتّب خلاياه فيزيائيًا شمال-ليمين افتراضيًا، بغض النظر عن `rightToLeft`/`bidirectional` على النص جواه** — أي `Table` فيها أكتر من خلية في نفس الصف ومهم ترتيبها بصريًا في RTL، لازم `visuallyRightToLeft: true` (قسم 5.14).
- **لما تستخرج JSX من ملف كبير شغال (زي قسم 5.15)، خلّي الاستخراج presentational بس** — انقل الـ markup لملف تاني، وسيب الـ state/handlers 100% زي ما هي في الأب، مرّرها كـ props. متحاولش "تحسّن" مكان تخزين الـ state في نفس الخطوة، خصوصًا لو الملف مفيهوش تغطية اختبارات — ده بيقلل المخاطرة لأقل درجة ممكنة.
- **⚠️ لما المستخدم يقول "سيب الموضوع ده دلوقتي" أو "بعيدًا عن كده"، ده مش إذن ضمني إنك تنفّذ حاجة في الموضوع ده لاحقًا من غير ما يطلب صراحة** — حتى لو الحل شكله منطقي وواضح. انتظر لحد ما يفتح الموضوع بنفسه ويوافق على اتجاه معيّن (قسم 5.16).
