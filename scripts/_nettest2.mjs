import net from 'node:net';
import tls from 'node:tls';
const host = 'ep-ancient-sound-atts1h4l-pooler.c-9.us-east-1.aws.neon.tech';

function tcp(h,port){ return new Promise(res=>{
  const s = net.connect({host:h, port, timeout:8000});
  const t0=Date.now();
  s.on('connect',()=>{ console.log(`TCP ${h}:${port}: connected in ${Date.now()-t0}ms`); setTimeout(()=>{ if(!s.destroyed){console.log(`TCP ${h}:${port}: still open after 1500ms`); s.end();} res(true);},1500); });
  s.on('timeout',()=>{ console.log(`TCP ${h}:${port}: timeout`); s.destroy(); res(false); });
  s.on('error',e=>{ console.log(`TCP ${h}:${port}: ${e.code}`); res(false); });
});}

// Neon host on 443
await tcp(host,443);
// Neon host on 5432 again with hold
await tcp(host,5432);

// TLS with SNI on 443 to Neon host
await new Promise(res=>{
  const s = tls.connect({host, port:443, servername:host, timeout:8000, rejectUnauthorized:false}, ()=>{ console.log('TLS 443 SNI: handshake OK'); s.end(); res(); });
  s.on('timeout',()=>{ console.log('TLS 443: timeout'); s.destroy(); res(); });
  s.on('error',e=>{ console.log(`TLS 443: ${e.code}`); res(); });
});
