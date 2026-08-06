#!/usr/bin/env bash
# بينج بسيط لمشروع Supabase عشان يفضل "صاحي" ومايوقفش تلقائي (خطة Free بتوقف المشروع
# بعد 7 أيام من غير أي نشاط). بيشتغل من الـcron على الـVPS، مش جزء من التطبيق نفسه.
#
# الـanon key هنا عام عمدًا ومصمم يتكشف (نفس اللي في .env.local/الواجهة) — الحماية
# الحقيقية شغالة بـRLS على مستوى القاعدة، مش بإخفاء المفتاح ده. مفيش أي داعي لأي مفتاح سري.
set -euo pipefail

SUPABASE_URL="https://czofdkrlvbrmqcwpdnwm.supabase.co"
ANON_KEY="sb_publishable_t70oc2qKF8UxCkks-rhIlA_4PFCDI-A"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/courses?select=id&limit=1" \
  -H "apikey: $ANON_KEY")

echo "$(date '+%Y-%m-%d %H:%M:%S') ping done, status=$STATUS"

if [ "$STATUS" != "200" ]; then
  echo "تحذير: الرد مش 200 — راجع المشروع في Supabase Dashboard" >&2
  exit 1
fi
