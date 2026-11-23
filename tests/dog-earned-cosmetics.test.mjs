import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

class FakeStorage{
 data=new Map();
 getItem(key){return this.data.get(key)??null;}
 setItem(key,value){this.data.set(key,String(value));}
}
const storage=new FakeStorage();
let uid='alice';
globalThis.window={
 SpielOnline:{state:()=>({status:'online',user:{uid,getIdToken:async()=>uid}})},
 SPIELPORTAL_CONFIG:{apiBase:'https://example.test'},
 addEventListener:()=>{},dispatchEvent:()=>{}
};
globalThis.localStorage=storage;
globalThis.CustomEvent=class{constructor(type,details){this.type=type;this.detail=details.detail;}};
globalThis.fetch=async (_url,options={})=>({
 status:200,ok:true,json:async()=>({
  ok:true,
  ownedUnlockIds:options.headers?.Authorization==='Bearer alice'?
   ['christmas2026:nameframe:01','christmas2026:activeicon:02','christmas2026:avatar:01']:[],
  level:3,nikolausCardRewardConfigured:false
 })
});
const verified=await import('../DOG/verified-cosmetics.js?v=3');
const equipment=await import('../DOG/cosmetic-equipment.js?v=1');
await verified.refreshVerifiedCosmetics();

test('only Render-verified Christmas items can be equipped',()=>{
 assert.equal(verified.isVerifiedCosmeticUnlocked('christmas2026:nameframe:01'),true);
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame','christmas2026:nameframe:01',{storage}),true);
 assert.equal(equipment.equippedDogCosmetic('nameFrame',{storage}),'christmas2026:nameframe:01');
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame','christmas2026:nameframe:05',{storage}),false);
 assert.equal(equipment.saveEquippedDogCosmetic('activeIcon','christmas2026:activeicon:05',{storage}),false);
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame','arbitrary-css-class',{storage}),false);
 assert.equal(equipment.saveEquippedDogCosmetic('activeIcon','christmas2026:activeicon:02',{storage}),true);
 assert.equal(equipment.dogCosmeticDefinition('activeIcon','christmas2026:activeicon:02').icon,'👑');
});
test('local cosmetic equipment is seat-specific and permits returning to defaults',()=>{
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame','christmas2026:nameframe:01',{local:true,seat:1,storage}),true);
 assert.equal(equipment.equippedDogCosmetic('nameFrame',{local:true,seat:1,storage}),'christmas2026:nameframe:01');
 assert.equal(equipment.equippedDogCosmetic('nameFrame',{local:true,seat:0,storage}),null);
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame',null,{local:true,seat:1,storage}),true);
 assert.equal(equipment.readPreferredDogCosmetic('nameFrame',{local:true,seat:1,storage}),null);
});
test('signing into another account does not reuse previously earned unlocks',async()=>{
 uid='bob';
 await verified.refreshVerifiedCosmetics({force:true});
 assert.equal(verified.isVerifiedCosmeticUnlocked('christmas2026:nameframe:01'),false);
 assert.equal(equipment.readPreferredDogCosmetic('nameFrame',{uid:'alice',storage}),undefined);
 assert.equal(equipment.saveEquippedDogCosmetic('nameFrame','christmas2026:nameframe:01',{uid:'bob',storage}),false);
});
test('collection, game and lobby all use the same verified equipment pipeline',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const collection=read('../DOG/collection.js');
 const picker=read('../DOG/avatar-picker.js');
 const app=read('../DOG/app.js');
 const lobby=read('../DOG/room-lobby.js');
 const hub=read('../hub-lobby.js');
 const html=read('../DOG/index.html');
 assert.match(collection,/saveEquippedDogCosmetic\(kind,unlockId,\{local,seat\}\)/);
 assert.match(collection,/saveEquippedDogCosmetic/);
 assert.match(picker,/verifiedCosmetics\?\.isVerifiedCosmeticUnlocked/);
 assert.match(picker,/const valid=n=>Number\.isInteger\(n\)&&n>=0&&n<36/);
 assert.match(app,/dogEquippedItem\('nameFrame',p\.seat\)/);
 assert.match(app,/dogEquippedItem\('activeIcon',p\.seat\)/);
 assert.match(lobby,/send\('cosmetic',\{kind,unlockId:desired\}\)/);
 assert.match(hub,/dog\/cosmetic','POST'/);
 assert.match(html,/cosmetic-equipment\.css\?v=1/);
});
