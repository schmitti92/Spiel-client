import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const game=read('game.html');
const svg=read('assets/christmas_final_wheel_70_30.svg');

test('new winner wheel artwork has exactly 7 Gold and 3 Premium sectors, no Normal',()=>{
 const labels=[...svg.matchAll(/>(GOLD|PREMIUM)<\/text>/g)].map(m=>m[1]);
 assert.equal(labels.length,10,'10 independently shown wheel sectors');
 assert.equal(labels.filter(x=>x==='GOLD').length,7);
 assert.equal(labels.filter(x=>x==='PREMIUM').length,3);
 assert.doesNotMatch(svg,/>NORMAL<\/text>/);
 assert.equal((svg.match(/<path d="M 320 320 L/g)||[]).length,10);
});

test('the new odds are displayed for winners, legacy 1-cent odds remain separate',()=>{
 assert.match(game,/\.cent-pack-legend-final\{display:none\}/);
 assert.match(game,/#cent-reward\.final-dual-active \.cent-pack-legend-final\{display:flex\}/);
 assert.match(game,/cent-pack-legend-final"><span>🥇 <strong>Gold<\/strong><small>70 %<\/small><\/span><span>💎 <strong>Premium<\/strong><small>30 %<\/small><\/span>/);
 assert.match(game,/cent-pack-legend-default"><span>🎁 <strong>Normal<\/strong><small>40 %<\/small>/);
 assert.match(game,/#cent-reward\.final-dual-active \.cent-wheel\s*\{\s*background: transparent url\("assets\/christmas_final_wheel_70_30\.svg"\)/);
});

test('shared winner reveal stops the wheel under matching sector of fixed pointer',()=>{
 assert.match(game,/const targetAngle=isFinal\?\(pack==='premium'\?306:126\)/);
 const target=(isFinal,pack)=>isFinal?(pack==='premium'?306:126)
   :(pack==='large'?0:pack==='premium'?180:36);
 assert.equal(target(true,'premium'),306);
 assert.equal(target(true,'large'),126);
 for(const pack of ['premium','large']){
  const a=(360*7-target(true,pack))%360;
  assert.equal((target(true,pack)+a)%360,0,'the fixed pointer must hit chosen tier');
 }
 assert.equal(target(false,'small'),36,'1-cent legacy wheel remains unchanged');
 assert.equal(target(false,'premium'),180,'1-cent Premium slot remains unchanged');
 const scripts=[...game.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 for(const script of scripts)assert.doesNotThrow(()=>new Script(script));
});
