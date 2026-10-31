import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=data(read('../engine/GameContract.js'));
const registry=data(read('../engine/GameRegistry.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const {createGameRegistry}=await import(registry);
const game=id=>({id,initialState:()=>({}),applyAction:state=>state,getResult:()=>null,botAction:()=>({type:'pass'})});
test('registry begins empty and registers unrelated game types without changing engine',()=>{
 const catalog=createGameRegistry();
 assert.deepEqual(catalog.ids(),[]);
 const a=game('reaction');
 const b={...game('survival'),capabilities:['simultaneous'],minPlayers:1,maxPlayers:4};
 assert.equal(catalog.register(a).id,'reaction');
 assert.equal(catalog.register(b).id,'survival');
 assert.deepEqual(catalog.ids(),['reaction','survival']);
 assert.equal(catalog.get('missing'),null);
 assert.equal(catalog.has('reaction'),true);
});
test('registry rejects duplicate IDs and invalid contracts without modifying entries',()=>{
 const catalog=createGameRegistry([game('one')]);
 assert.throws(()=>catalog.register(game('one')),/DUPLICATE_GAME_ID/);
 assert.throws(()=>catalog.register({...game('broken'),botAction:null}),/GAME_CONTRACT_botAction/);
 assert.deepEqual(catalog.ids(),['one']);
});
test('registry validates initial batch and rejects invalid registry inputs',()=>{
 assert.throws(()=>createGameRegistry(null),/INVALID_GAME_REGISTRY/);
 assert.throws(()=>createGameRegistry([game('same'),game('same')]),/DUPLICATE_GAME_ID/);
 assert.deepEqual(createGameRegistry([game('a'),game('b')]).ids(),['a','b']);
});
test('registry isolates metadata from subsequent caller mutation',()=>{
 const source={...game('timed-probe'),capabilities:['timed'],timeLimitMs:1000};
 const catalog=createGameRegistry([source]);
 source.capabilities.push('simultaneous');
 source.timeLimitMs=500;
 assert.deepEqual(catalog.get('timed-probe').capabilities,['timed']);
 assert.equal(catalog.get('timed-probe').timeLimitMs,1000);
 assert.throws(()=>catalog.get('timed-probe').capabilities.push('rounds'),TypeError);
 const list=catalog.list();
 list.pop();
 assert.equal(catalog.ids().length,1);
});
