import { Client } from 'pg';
const base = process.env.DATABASE_URL;
console.log('URL host:', new URL(base).host);

async function tryCfg(name, cfg) {
  const c = new Client(cfg);
  try {
    await c.connect();
    const r = await c.query('select 1 as ok');
    console.log(`OK  ${name} ->`, JSON.stringify(r.rows[0]));
    await c.end();
    return true;
  } catch (e) {
    console.log(`ERR ${name}: ${e.code || ''} ${e.message}`);
    try { await c.end(); } catch {}
    return false;
  }
}

const u1 = new URL(base); u1.searchParams.delete('channel_binding');
await tryCfg('no-channel-binding (sslmode=require)', u1.toString());

const u2 = new URL(base); u2.searchParams.delete('channel_binding'); u2.searchParams.delete('sslmode');
await tryCfg('ssl rejectUnauthorized=false', { connectionString: u2.toString(), ssl: { rejectUnauthorized: false } });

const u3 = new URL(base); u3.searchParams.set('uselibpqcompat','true'); u3.searchParams.set('sslmode','require');
await tryCfg('uselibpqcompat + sslmode=require', u3.toString());
