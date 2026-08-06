#!/usr/bin/env bash
# نسخة احتياطية يومية من قاعدة بيانات Supabase (بديل النسخ الاحتياطي الأوتوماتيكي
# اللي مش متاح في خطة Free). بيشتغل من الـcron على الـVPS، مش جزء من التطبيق نفسه.
#
# قبل ما تشغّله لازم تحدد SUPABASE_DB_URL في البيئة بتاعتك (مش هنا في الملف عشان
# الباسورد متبقاش متسجّلة في الكود) — جيبها من:
# Supabase Dashboard → Project Settings → Database → Connection string (Session pooler)
#
# لو حددت كمان SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role secret)،
# النسخة بترفع كمان لـbucket خاص "db-backups" في Supabase Storage نفسه — مكان مختلف
# تمامًا عن الـVPS، فلو الـVPS ضاع النسخ برة متأثرش. اختياري: لو المتغير ده مش موجود،
# السكريبت بيكمل عادي ويحفظ محليًا بس من غير ما يفشل.
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "خطأ: متغير SUPABASE_DB_URL مش متحدد. حدده الأول في ~/.bashrc أو في بيئة الـcron." >&2
  exit 1
fi

SUPABASE_URL="https://czofdkrlvbrmqcwpdnwm.supabase.co"

BACKUP_DIR="${SUPABASE_BACKUP_DIR:-$HOME/supabase-backups}"
KEEP_DAYS="${SUPABASE_BACKUP_KEEP_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# أوبونتو مبتربطش pg_dump تلقائي بأحدث نسخة متثبتة (زي ما بتعمل مع psql) — لو نسخة
# 17 (أو أي نسخة تانية) متثبتة جنب القديمة، نفضّلها صراحة بدل ما نعتمد على PATH
PG_DUMP_BIN="pg_dump"
for candidate in /usr/lib/postgresql/17/bin/pg_dump /usr/lib/postgresql/*/bin/pg_dump; do
  if [ -x "$candidate" ]; then
    PG_DUMP_BIN="$candidate"
    break
  fi
done

"$PG_DUMP_BIN" "$SUPABASE_DB_URL" --no-owner --no-privileges | gzip > "$FILE"

# تنضيف النسخ الأقدم من KEEP_DAYS يوم عشان القرص مايمتلئش
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "$(date '+%Y-%m-%d %H:%M:%S') تم الحفظ محليًا: $FILE ($(du -h "$FILE" | cut -f1))"

if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  UPLOAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$SUPABASE_URL/storage/v1/object/db-backups/$(basename "$FILE")" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/gzip" \
    --data-binary "@$FILE")
  if [ "$UPLOAD_CODE" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') اترفعت نسخة بعيدة كمان لـSupabase Storage"
  else
    echo "تحذير: فشل الرفع لـSupabase Storage (كود $UPLOAD_CODE) — النسخة المحلية لسه موجودة" >&2
  fi
else
  echo "تنبيه: SUPABASE_SERVICE_ROLE_KEY مش متحدد — النسخة محفوظة محليًا بس، مفيش نسخة بعيدة" >&2
fi
