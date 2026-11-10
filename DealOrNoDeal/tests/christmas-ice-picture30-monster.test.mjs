import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)),'Weihnachtsevent2');
const read=p=>readFileSync(resolve(root,p),'utf8');
const script=read('online-ice.js'),html=read('index.html'),css=read('picture30-monster-reward.css');

test('picture 30 is highlighted as 3 real Monster-Wheel spins, not the 30-Bingo milestone',()=>{
 assert.match(script,/n===30\?'🎰 3 Monster-Rad-Drehungen'/);
 assert.match(script,/\[20,30,40\]\.includes\(n\)\?Math\.max/);
 assert.match(script,/state\.picture30MonsterSpinsClaimed\?'✅ 3 Drehungen gutgeschrieben'/);
 assert.match(script,/celebration\.number===30\?/);
 assert.match(script,/zusätzlich zu deiner normalen Bildbelohnung/);
 assert.match(script,/v44-picture30-triple/);
 assert.match(script,/weihnachten\.html\?view=monster/);
});

test('backfill is a trusted POST request, with no local ticket manipulation or polling',()=>{
 assert.doesNotThrow(()=>new Script(script,{filename:'online-ice.js'}));
 assert.match(script,/type==='CLAIM'\?'claim-picture30':'action'/);
 assert.match(script,/const method=type==='GET'\?'GET':'POST'/);
 assert.match(script,/async function claimPicture30Bonus\(\)/);
 assert.match(script,/Math\.max\(Number\(state\.completed\)\|\|0,Number\(state\.maxRewarded\)\|\|0\)<30/);
 assert.match(script,/await request\('CLAIM'\)/);
 assert.match(script,/state=\{\.\.\.state,picture30MonsterSpinsClaimed:true\}/);
 assert.match(script,/if\(!shouldRecover\)void claimPicture30Bonus\(\)/);
 assert.match(script,/if\(state&&!readPending\(\)\)void claimPicture30Bonus\(\)/);
 assert.doesNotMatch(script,/setInterval\(/);
 assert.doesNotMatch(script,/monsterWheelTickets\s*=/);
});

test('reward claiming has a manual recovery path and never invents win outcomes',()=>{
 assert.match(script,/id="v44-claim-picture30"/);
 assert.match(script,/picture30Retry\.onclick=\(\)=>void claimPicture30Bonus\(\)/);
 assert.match(script,/data\.result\?\.monsterSpinsGranted===3/);
 assert.match(script,/claimPicture30Bonus\(\).*?\{/s);
 assert.match(script,/const playerUid=user\(\)\.uid/);
 assert.match(script,/if\(user\(\)\?\.uid!==playerUid\)return/);
 assert.match(script,/picture30ClaimBusy/);
 assert.match(script,/celebration\.number===30&&state\.picture30MonsterSpinsClaimed/);
});

test('large victory card is styled and cached JS requests updated code',()=>{
 assert.match(html,/picture30-monster-reward\.css\?v=20261110-triple-spin-v1/);
 assert.match(html,/online-ice\.js\?v=20261110-autoplay40-v1/);
 assert.match(css,/\.v44-reward\[data-milestone="30"\]/);
 assert.match(css,/\.v44-milestone-unlock\[data-milestone="30"\]/);
 assert.match(css,/\.v44-picture30-wheel-link/);
 assert.match(css,/\.v44-picture30-triple/);
 assert.match(css,/prefers-reduced-motion/);
});
