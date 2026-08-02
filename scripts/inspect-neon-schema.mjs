// سكريبت فحص فقط — بيتصل بقاعدة بيانات Neon القديمة ويقرا شكل الجداول بس.
// أمان: الجلسة كلها بتتفتح كـ "READ ONLY" على مستوى Postgres نفسه،
// يعني أي محاولة INSERT/UPDATE/DELETE/DROP هترفض تلقائي من القاعدة نفسها بغض النظر عن أي غلط في الكود.
import pg from "pg";

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("مفيش NEON_DATABASE_URL — تأكد إنك حاطط الملف .env.migration.local وشغّلت السكريبت بـ --env-file");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");

  const { rows: tables } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);

  console.log(`\nلقيت ${tables.length} جدول في السكيما public:\n`);

  for (const { table_name } of tables) {
    const { rows: columns } = await client.query(
      `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position
      `,
      [table_name]
    );

    const { rows: countRows } = await client.query(`select count(*)::int as n from "${table_name}"`);
    const count = countRows[0].n;

    console.log(`\n=== ${table_name} (${count} صف) ===`);
    for (const col of columns) {
      const nullable = col.is_nullable === "YES" ? "" : " NOT NULL";
      const def = col.column_default ? ` default ${col.column_default}` : "";
      console.log(`  - ${col.column_name}: ${col.data_type}${nullable}${def}`);
    }
  }

  await client.query("ROLLBACK");
  await client.end();
}

main().catch(async (err) => {
  console.error("حصل خطأ:", err.message);
  try {
    await client.query("ROLLBACK");
    await client.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
