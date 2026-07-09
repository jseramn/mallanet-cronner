import { Client } from 'pg';
const c = new Client(process.env.DATABASE_URL!);
await c.connect();
const r = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
);
console.log('Tablas (' + r.rows.length + '):');
for (const row of r.rows) console.log(' -', row.table_name);
await c.end();
