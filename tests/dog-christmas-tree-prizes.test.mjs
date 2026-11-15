import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TREE_PRIZE_PREVIEW} from '../DOG/christmas-tree-rewards-ui.js';
const text=file=>readFileSync(new URL(file,import.meta.url),'utf8');
test('all ten Christmas tree prizes are exact, distinct and visible before earning',()=>{
 assert.deepEqual(TREE_PRIZE_PREVIEW.map(p=>p.title),["Märchenhafter Weihnachtswald","Weihnachtsmann","Winterzauber · Blau","Weihnachtsdorf","Weihnachtsplätzchen","Sternengold","Eiskrone","Weihnachtsglanz · Rot-Grün-Gold","Magischer Polarlicht-Fjord","Polarlichtpalast"]);
 assert.deepEqual(TREE_PRIZE_PREVIEW.map(p=>p.unlockId),["christmas2026:scene:01","christmas2026:avatar:01","christmas2026:cards:kartendesign-02","christmas2026:board:weihnachtsdorf","christmas2026:emoji:05","christmas2026:nameframe:01","christmas2026:activeicon:02","christmas2026:cards:kartendesign-03","christmas2026:scene:05","christmas2026:board:polarlichtpalast"]);
 assert.deepEqual(TREE_PRIZE_PREVIEW.map(x=>x.level),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(new Set(TREE_PRIZE_PREVIEW.map(x=>x.unlockId)).size,10);
});
test('tree stage UI uses authenticated existing village API and read-only load',()=>{
 const html=text('../DOG/christmas-event.html');
 const client=text('../DOG/christmas-event.js');
 const board=text('../DOG/christmas-tree-rewards-ui.js');
 assert.match(html,/id="tree-steps"/);
 assert.match(html,/id="tree-reward-feedback"/);
 assert.match(html,/christmas-tree-rewards\.css/);
 assert.match(client,/initChristmasTreeRewards/);
 assert.match(client,/request:villageRequest/);
 assert.match(client,/treePrizeScreen\?\.load/);
 assert.match(board,/request\('tree-rewards'\)/);
 assert.match(board,/request\('tree-rewards\/claim','POST',\{level\}\)/);
 assert.match(board,/getStatus:\(\)=>status/);
 assert.doesNotMatch(board,/localStorage|sessionStorage|setItem\(|Math\.random\(/);
});
