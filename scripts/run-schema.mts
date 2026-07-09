import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida');
  process.exit(1);
}

const sql = await readFile(new URL('../scripts/001-setup-schema.sql', import.meta.url), 'utf8');

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log('✅ Schema aplicado correctamente');
} catch (e) {
  console.error('❌ Error aplicando schema:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
