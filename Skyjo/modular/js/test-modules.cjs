/* SKYJO modular smoke tests. Run: node Skyjo/modular/js/test-modules.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const html=fs.readFileSync(path.join(root,'skyjo_action.html'),'utf8');
const sandbox={Math:Object.create(Math)};
sandbox.window=sandbox;
sandbox.Math.random=()=>0;
vm.createContext(sandbox);
for(const file of ['card-rules.js','room-rules.js','card-factory.js']){
 const source=fs.readFileSync(path.join(__dirname,file),'utf8');
 new vm.Script(source,{filename:file}).runInContext(sandbox);
 const pos=html.indexOf('modular/js/'+file);
 assert.ok(pos>=0&&pos<html.indexOf('modular/js/legacy.js'),file+' must load before legacy.js');
}
const rules=sandbox.SKYJO_CARD_RULES;
assert.equal(rules.cardPoints({type:'star'}),0);
assert.equal(rules.cardPoints({type:'number',value:-2}),-2);
assert.equal(rules.cardPoints({type:'number',value:12}),12);
assert.equal(rules.cardPoints({type:'number',value:0}),0);
assert.equal(rules.cardPoints({type:'number',value:null}),0);
const room=sandbox.SKYJO_ROOM_RULES;
assert.equal(room.normalizeCloudRoom(' ab-c_12 '),'AB-C_12');
assert.equal(room.normalizeCloudRoom('ä$ 7!'),'7');
assert.equal(room.normalizeCloudRoom('a'.repeat(25)),'A'.repeat(20));
assert.equal(room.randomCloudRoom(),'AAAAA');
assert.match(room.randomCloudRoom(),/^[A-HJ-NP-Z2-9]{5}$/);
const factory=sandbox.SKYJO_CARD_FACTORY;
assert.equal(JSON.stringify(factory.newCard('c1','number',6)),JSON.stringify({id:'c1',type:'number',value:6,faceUp:false}));
assert.equal(JSON.stringify(factory.newCard('c2','star')),JSON.stringify({id:'c2',type:'star',value:null,faceUp:false}));
assert.equal(JSON.stringify(factory.newAction('a1','double')),JSON.stringify({id:'a1',type:'double',availableOwnTurn:0,stolen:false}));
assert.ok(Object.isFrozen(rules)&&Object.isFrozen(room)&&Object.isFrozen(factory));
const legacy=fs.readFileSync(path.join(__dirname,'legacy.js'),'utf8');
for(const token of ['SKYJO_CARD_RULES.cardPoints(card)','SKYJO_ROOM_RULES.normalizeCloudRoom(v)','SKYJO_ROOM_RULES.randomCloudRoom()','SKYJO_CARD_FACTORY.newCard(uid(),type,value)','SKYJO_CARD_FACTORY.newAction(uid(),type)']){
 assert.ok(legacy.includes(token),'missing legacy delegate: '+token);
}
const parts=fs.readdirSync(path.join(__dirname,'parts')).filter(x=>/^part-\d+\.jsfrag$/.test(x)).sort();
assert.equal(parts.length,7);
assert.equal(parts.map(x=>fs.readFileSync(path.join(__dirname,'parts',x),'utf8')).join(''),legacy,'fragments must exactly rebuild legacy.js');
console.log('PASS: SKYJO module tests, script ordering, delegates and source round-trip');
