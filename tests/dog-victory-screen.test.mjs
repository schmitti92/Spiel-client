import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../DOG/'+f,import.meta.url),'utf8');
const html=read('index.html'),css=read('victory-ceremony.css'),app=read('app.js');
test('the result dialog is a native, dismissible, reopenable and labeled modal',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of ['winner','winner-title','winner-subtitle','dog-victory-teams','dog-victory-players',
 'dog-victory-show','dog-victory-close','dog-victory-new','dog-victory-lobby']){
  assert.equal(ids.filter(x=>x===id).length,1,id);
 }
 assert.match(html,/<dialog id="winner" class="winner dog-victory-dialog" aria-labelledby="winner-title" aria-describedby="winner-subtitle">/);
 assert.match(html,/id="dog-victory-close"[^>]*autofocus/);
 assert.match(app,/if\(victoryShownKey!==key\)/);
 assert.match(app,/victoryDialog\.showModal\(\)/);
 assert.match(app,/victoryDialog\.close\(\)/);
 assert.match(app,/\$\('dog-victory-mini'\)\.hidden=!finished/);
});
test('victory styling supports small screens and reduced motion',()=>{
 assert.match(html,/victory-ceremony\.css\?v=/);
 assert.match(css,/@media\(max-width:580px\)/);
 assert.match(css,/@media\(max-height:650px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:root\[data-dog-motion="off"\]/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('online winner can prepare next DOG round only as verified room host',()=>{
 assert.match(app,/onlineRoomHost=room\.host===true/);
 assert.match(app,/\$\('dog-victory-new'\)\.hidden=online&&!onlineRoomHost/);
 assert.match(app,/await hubRequest\('\/dog\/rematch','POST',\{matchId:acceptedMatchId\}\)/);
 assert.match(app,/location\.assign\(\$\('back-link'\)\.href\)/);
 assert.match(app,/if\(!onlineRoomHost\|\|!acceptedMatchId\|\|game\?\.phase!=='finished'\|\|onlineBusy\)return/);
});
