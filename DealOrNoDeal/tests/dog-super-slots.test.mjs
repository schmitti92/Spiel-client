import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('weihnachtswelt.html'),album=read('js/dog-album-season2.js');
const superSlot=read('js/dog-super-slots.js'),css=read('css/dog-super-slots.css');

test('DOG-only career, Super Slots and monthly tournament are all accessible',()=>{
 assert.match(html,/dog-cycle-total/);
 assert.match(html,/dog-super-count/);
 assert.match(html,/dog-tourney-points/);
 assert.match(html,/data-tab="super"/);
 assert.match(html,/data-tab="tournament"/);
 assert.match(html,/dog-super-slot-dialog/);
 assert.match(html,/dog-cycle-complete-dialog/);
 assert.match(html,/dog-super-slots\.js\?v=20261113-dog-cycles-v1/);
 assert.match(html,/dog-super-slots\.css\?v=20261113-dog-cycles-v1/);
 assert.doesNotThrow(()=>new Script(album));
 assert.doesNotThrow(()=>new Script(superSlot));
});
test('only current DOG board ownership resets, old cards remain in the archive',()=>{
 assert.match(album,/boardCycleOwned\(data\.progress,card\)/);
 assert.match(album,/board\.completions/);
 assert.match(album,/board\.readyToComplete/);
 assert.match(album,/data\.lifetimeProgress\?\.bingos/);
 assert.match(album,/queueCompletedBoards\(out\.completedBoards\)/);
 assert.match(album,/api\('POST','cycles\/claim'\)/);
 assert.match(album,/superTickets:/);
 assert.doesNotMatch(album,/settleHammerBingoCycle|hammerBingoProgress/);
});
test('one server-authoritative five-reel payout reveals every prize, then every card after 2 seconds',()=>{
 assert.match(superSlot,/christmas\/season2\/super-slot\/play/);
 assert.match(superSlot,/out\.prizes\.length!==5/);
 assert.match(superSlot,/for\(let i=0;i<receipt\.prizes\.length;i\+\+\)/);
 assert.match(superSlot,/await wait\(2000\)/);
 assert.match(superSlot,/renderSummary\(receipt\.prizes\)/);
 assert.match(superSlot,/\.flatMap\(pack=>/,'all packs are opened in one summary');
 assert.match(superSlot,/card\.isNew\?'yes':'no'/);
 assert.match(superSlot,/savePending\(uid,requestId\)/,'request id survives reconnect');
 assert.match(superSlot,/replayed|tryRecover/);
 assert.doesNotMatch(superSlot,/drawMonsterSlot\(|drawMonsterSlots\(/,'browser cannot draw prizes');
});
test('five reels and the complete reward view fit on small screens',()=>{
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:570px\)/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/#dog-super-summary\[hidden\]/);
 assert.match(css,/#dog-super-close:disabled/);
});
