#!/usr/bin/env bash
# نسخة احتياطية يومية من قاعدة بيانات Supabase (بديل النسخ الاحتياطي الأوتوماتيكي
# اللي مش متاح في خطة Free). بيشتغل من الـcron على الـVPS، مش جزء من التطبيق نفسه.
#
# قبل ما تشغّله لازم تحدد SUPABASE_DB_URL في البيئة بتاعتك (مش هنا في الملف عشان
# الباسورد متبقاش متسجّلة في الكود) — جيبها من:
# Supabase Dashboard → Project Settings → Database → Connection string (Session pooler)
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "خطأ: متغير SUPABASE_DB_URL مش متحدد. حدده الأول في ~/.bashrc أو في بيئة الـcron." >&2
  exit 1
fi

BACKUP_DIR="${SUPABASE_BACKUP_DIR:-$HOME/supabase-backups}"
KEEP_DAYS="${SUPABASE_BACKUP_KEEP_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges | gzip > "$FILE"

# تنضيف النسخ الأقدم من KEEP_DAYS يوم عشان القرص مايمتلئش
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "$(date '+%Y-%m-%d %H:%M:%S') تم الحفظ: $FILE ($(du -h "$FILE" | cut -f1))"
