 'use strict';
// Local HTTP integration smoke test. No production endpoints or credentials.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const stat=await fs.stat(target);
  if(!stat.isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
  res.end(await fs.readFile(target));
 }catch(e){res.writeHead(404);res.end('Not found');}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function get(url){const r=await fetch(base+url);assert.equal(r.status,200,`HTTP ${r.status} ${url}`);return r;}
 try{
  const page=await (await get('/Skyjo/skyjo_action.html')).text();
  const refs=[...page.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(x=>x[1]).filter(x=>!/^https?:|^data:|^\/\//.test(x));
  for(const ref of refs)await get('/Skyjo/'+ref);
  const manifest=await (await get('/Skyjo/skyjo_action-manifest.json')).json();
  assert.equal(manifest.version,19);
  assert.equal(Object.keys(manifest.parts).length,35);
  const bodies=await Promise.all(Object.entries(manifest.parts).map(async([name,hash])=>{
   const bytes=Buffer.from(await (await get('/Skyjo/'+name)).arrayBuffer());
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,`hash mismatch ${name}`);
   return bytes.toString('utf8');
  }));
  const vm=require('node:vm');new vm.Script(bodies.join(''));
  const redirect=await (await get('/Skyjo/Skyjo/skyjo_action.html')).text();
  assert.match(redirect,/\.\.\/skyjo_action\.html/);
  console.log('SKYJO V18 HTTP smoke: HTML, '+refs.length+' linked assets, manifest, 35 verified modules, nested redirect passed.');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
