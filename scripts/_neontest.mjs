import { neon, Pool } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;

// 1) HTTP one-shot query over 443
try {
  const sql = neon(url);
  const r = await sql`select 1 as ok, current_database() as db`;
  console.log('OK neon() http:', JSON.stringify(r[0]));
} catch (e) {
  console.log('ERR neon() http:', e.message);
}

// 2) Pool (websocket) - drop-in for pg.Pool
try {
  const pool = new Pool({ connectionString: url });
  const r = await pool.query('select count(*)::int as tables from information_schema.tables where table_schema=$1', ['public']);
  console.log('OK neon Pool ws: public tables =', r.rows[0].tables);
  await pool.end();
} catch (e) {
  console.log('ERR neon Pool ws:', e.message);
}
