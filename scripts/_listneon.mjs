import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const r = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
console.log('Tablas ('+r.length+'):');
for (const row of r) console.log(' -', row.table_name);
