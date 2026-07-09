import net from 'node:net';
import dns from 'node:dns/promises';
import tls from 'node:tls';
const host = 'ep-ancient-sound-atts1h4l-pooler.c-9.us-east-1.aws.neon.tech';
try { const a = await dns.lookup(host, { all: true }); console.log('DNS:', a); } catch(e){ console.log('DNS ERR', e.message); }

function tcp(port){ return new Promise(res=>{
  const s = net.connect({host, port, timeout:8000});
  s.on('connect',()=>{ console.log(`TCP ${port}: connected`); s.end(); res(true); });
  s.on('timeout',()=>{ console.log(`TCP ${port}: timeout`); s.destroy(); res(false); });
  s.on('error',e=>{ console.log(`TCP ${port}: ${e.code} ${e.message}`); res(false); });
});}
await tcp(5432);

// raw TLS handshake test on 5432 (postgres uses STARTTLS-like, so plain TLS will likely reset, but shows reachability)
await new Promise(res=>{
  const s = tls.connect({host, port:5432, servername:host, timeout:8000, rejectUnauthorized:false}, ()=>{ console.log('TLS 5432: handshake OK (unexpected for pg)'); s.end(); res(); });
  s.on('timeout',()=>{ console.log('TLS 5432: timeout'); s.destroy(); res(); });
  s.on('error',e=>{ console.log(`TLS 5432: ${e.code} ${e.message}`); res(); });
});
