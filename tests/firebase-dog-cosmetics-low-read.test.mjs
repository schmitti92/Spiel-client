import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../DOG/verified-cosmetics.js',import.meta.url),'utf8');
const noExports=source.replace(/^export\s+/gm,'')+
 '\nwindow.__test={refreshVerifiedCosmetics,isVerifiedCosmeticUnlocked,verifiedCosmeticCount,isVerifiedDogPlayerLevelAtLeast,isVerifiedNikolausCardConfigured};';

function rig({legacy=false}={}){
 let uid='alice',requests=[];
 const handlers={};
 const player={uid:'alice',getIdToken:async()=>uid+'-token'};
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://render.invalid'},
  SpielOnline:{state:()=>({status:'online',user:player})},
  dispatchEvent(){},
  addEventListener(type,fn){handlers[type]=fn;}
 };
 const fetch=async(url)=>{
  requests.push(url);
  if(url.endsWith('/api/hub/dog/cosmetics')&&legacy)return {status:404,ok:false,json:async()=>({})};
  if(url.endsWith('/api/hub/dog/cosmetics'))return {
   status:200,ok:true,json:async()=>({ok:true,
    ownedUnlockIds:uid==='alice'?['christmas2026:cards:kartendesign-02']:[],
    level:uid==='alice'?20:1,nikolausCardRewardConfigured:true})
  };
  if(url.endsWith('/api/hub/scratch'))return {status:200,ok:true,
   json:async()=>({ok:true,scratch:{ownedUnlockIds:['christmas2026:cards:kartendesign-02']}})};
  if(url.endsWith('/api/hub/dog/level'))return {status:200,ok:true,
   json:async()=>({ok:true,level:{level:20,rewards:[
    {level:20,configured:true,reward:{id:'kartendesign-05'}}
   ]}})};
  throw Error('Unexpected endpoint '+url);
 };
 vm.runInNewContext(noExports,{window,fetch,Event:class Event{},
  queueMicrotask(){},Date,Set,Promise,console}, {filename:'verified-cosmetics.js'});
 return {api:window.__test,handlers,requests,changeUser:id=>{uid=id;player.uid=id;},getUid:()=>uid};
}

test('normal DOG game loads only one compact cosmetics request, not full shop or level pages',async()=>{
 const h=rig();
 assert.equal(await h.api.refreshVerifiedCosmetics(),true);
 assert.deepEqual(h.requests,['https://render.invalid/api/hub/dog/cosmetics']);
 assert.equal(h.api.isVerifiedCosmeticUnlocked('christmas2026:cards:kartendesign-02'),true);
 assert.equal(h.api.isVerifiedDogPlayerLevelAtLeast(20),true);
 assert.equal(h.api.isVerifiedNikolausCardConfigured(),true);
 h.handlers['spielonline-change']();
 await Promise.resolve();
 assert.equal(h.requests.length,1,'same-UID login events reuse verified 60s client cache');
 assert.equal(await h.api.refreshVerifiedCosmetics({force:true}),true);
 assert.equal(h.requests.length,2,'explicit settings refresh is allowed');
});

test('DOG cosmetics account change immediately revokes old player unlocks',async()=>{
 const h=rig();
 await h.api.refreshVerifiedCosmetics();
 h.changeUser('bob');
 const next=h.api.refreshVerifiedCosmetics();
 assert.equal(h.api.isVerifiedCosmeticUnlocked('christmas2026:cards:kartendesign-02'),false);
 await next;
 assert.equal(h.api.isVerifiedDogPlayerLevelAtLeast(20),false);
 assert.equal(h.requests.length,2);
});

test('DOG cosmetics gracefully supports old Render during rollout with correct level-20 reward',async()=>{
 const h=rig({legacy:true});
 assert.equal(await h.api.refreshVerifiedCosmetics(),true);
 assert.equal(h.requests.length,3,'legacy reads only after compact endpoint returns HTTP 404');
 assert.equal(h.api.isVerifiedDogPlayerLevelAtLeast(20),true);
 assert.equal(h.api.isVerifiedNikolausCardConfigured(),true);
 assert.doesNotMatch(source,/item\.level===3/);
});

test('Nikolaus deck needs both verified XP level and configured server reward',()=>{
 const card=readFileSync(new URL('../DOG/card-visuals.js',import.meta.url),'utf8');
 assert.match(card,/minPlayerLevel:20/);
 assert.match(card,/id!=='kartendesign-05'\|\|isVerifiedNikolausCardConfigured\(\)/);
});
