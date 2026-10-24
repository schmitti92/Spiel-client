/* Run: node --test tests/party-online-transport.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../online/party-online-transport.js',import.meta.url),'utf8');
const {PartyOnlineTransport}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('requires authenticated token provider',()=>{
  assert.throws(()=>new PartyOnlineTransport(),/getToken/);
});
test('rejects malformed room codes without making requests',async()=>{
  const t=new PartyOnlineTransport({getToken:async()=> 'token'});
  await assert.rejects(t.attach('../bad'),/INVALID_ROOM_CODE/);
});
test('accepts only current room and non-stale revisions',()=>{
  const seen=[];
  const t=new PartyOnlineTransport({getToken:async()=> 'token',onRoom:r=>seen.push(r.revision)});
  t.code='ABCDEF';
  assert.equal(t.accept({code:'OTHER1',revision:10}),false);
  assert.equal(t.accept({code:'ABCDEF',revision:3}),true);
  assert.equal(t.accept({code:'ABCDEF',revision:2}),false);
  assert.deepEqual(seen,[3]);
});
test('room switch resets revision and ignores delayed response from old room',async()=>{
  const previous=globalThis.fetch;
  let release;
  globalThis.fetch=async url=>{
    if(url.includes('ABCDEF'))await new Promise(resolve=>{release=resolve;});
    return {ok:true,json:async()=>({room:{code:url.slice(-6),revision:1}})};
  };
  try{
    const t=new PartyOnlineTransport({getToken:async()=> 'token'});
    const old=t.attach('ABCDEF');
    await new Promise(resolve=>setTimeout(resolve,0));
    await t.attach('GHJKLM');
    release();
    await old;
    assert.equal(t.room.code,'GHJKLM');
    assert.equal(t.sequence,1);
  }finally{globalThis.fetch=previous;}
});
test('rejects server errors with status',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:'HOST_ONLY'})});
  try{
    const t=new PartyOnlineTransport({getToken:async()=> 'token'});
    await assert.rejects(t.request('/rooms/ABCDEF'),e=>e.status===403&&e.message==='HOST_ONLY');
  }finally{globalThis.fetch=previous;}
});

test('duplicate revisions are not rendered twice',()=>{
 const seen=[];const t=new PartyOnlineTransport({getToken:async()=> 'token',onRoom:r=>seen.push(r.revision)});
 t.code='ABCDEF';
 assert.equal(t.accept({code:'ABCDEF',revision:7}),true);
 assert.equal(t.accept({code:'ABCDEF',revision:7}),false);
 assert.deepEqual(seen,[7]);
});
test('watch validates polling cadence and destroy resets revision',()=>{
 const t=new PartyOnlineTransport({getToken:async()=> 'token'});
 assert.throws(()=>t.watch(10),/INVALID_POLL_INTERVAL/);
 t.code='ABCDEF';t.sequence=12;t.destroy();
 assert.equal(t.sequence,-1);
});
