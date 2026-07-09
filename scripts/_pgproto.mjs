import net from 'node:net';
const host = 'ep-ancient-sound-atts1h4l-pooler.c-9.us-east-1.aws.neon.tech';
const port = 5432;
await new Promise(res=>{
  const s = net.connect({host, port, timeout:8000});
  s.on('connect',()=>{
    // Postgres SSLRequest: int32 length=8, int32 code=80877103
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(8,0);
    buf.writeInt32BE(80877103,4);
    s.write(buf);
    console.log('sent SSLRequest');
  });
  s.on('data',d=>{ console.log('response byte:', JSON.stringify(d.toString('latin1')), '(S=SSL ok, N=no SSL)'); s.end(); res(); });
  s.on('timeout',()=>{ console.log('timeout waiting for SSLRequest response'); s.destroy(); res(); });
  s.on('error',e=>{ console.log('error:', e.code, e.message); res(); });
  s.on('close',()=>res());
});
