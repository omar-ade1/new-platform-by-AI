// سكريبت فحص فقط (read-only transaction) — بيجيب عينات وقيم فعلية من الجداول المهمة
// عشان نفهم شكل البيانات قبل ما نكتب سكريبت النقل الفعلي.
import pg from "pg";

const connectionString = process.env.NEON_DATABASE_URL;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");

  console.log("\n=== عينة من Question (3 صفوف) ===");
  const { rows: q } = await client.query(`select * from "Question" limit 3`);
  console.log(JSON.stringify(q, null, 2));

  console.log("\n=== قيم asnwerTrue الموجودة (distinct) ===");
  const { rows: av } = await client.query(`select "asnwerTrue", count(*) from "Question" group by "asnwerTrue" order by 1`);
  console.log(av);

  console.log("\n=== أمثلة questionSection مميزة (لو موجودة) ===");
  const { rows: qs } = await client.query(`select distinct "questionSection" from "Question" where "questionSection" is not null limit 10`);
  console.log(qs);

  console.log("\n=== QuestionBank كامل ===");
  const { rows: qb } = await client.query(`select * from "QuestionBank" order by id`);
  console.log(qb);

  console.log("\n=== توزيع type في GroupOfSection ===");
  const { rows: gt } = await client.query(`select type, count(*) from "GroupOfSection" group by type`);
  console.log(gt);

  console.log("\n=== عينة GroupOfSection من نوع test ===");
  const { rows: gs } = await client.query(`select * from "GroupOfSection" where type = 'test' limit 3`);
  console.log(JSON.stringify(gs, null, 2));

  console.log("\n=== Test كامل (أول 5) ===");
  const { rows: t } = await client.query(`select * from "Test" order by id limit 5`);
  console.log(JSON.stringify(t, null, 2));

  console.log("\n=== Course كامل ===");
  const { rows: c } = await client.query(`select * from "Course"`);
  console.log(JSON.stringify(c, null, 2));

  console.log("\n=== Section كامل ===");
  const { rows: s } = await client.query(`select * from "Section" order by id`);
  console.log(JSON.stringify(s, null, 2));

  console.log("\n=== partOfSection كامل ===");
  const { rows: p } = await client.query(`select * from "partOfSection" order by id`);
  console.log(JSON.stringify(p, null, 2));

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
