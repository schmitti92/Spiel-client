import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TREE_PRIZE_PREVIEW} from '../DOG/christmas-tree-rewards-ui.js';
const text=file=>readFileSync(new URL(file,import.meta.url),'utf8');
test('ten Christmas gifts begin with full background, avatar, cards and board',()=>{
 assert.deepEqual(TREE_PRIZE_PREVIEW.slice(0,4).map(p=>p.title),
  ['Vollbild-Hintergrund','Weihnachtsprofilbild','Kartendesign','Weihnachts-Spielbrett']);
 assert.equal(TREE_PRIZE_PREVIEW.length,10);
 assert.deepEqual(TREE_PRIZE_PREVIEW.map(x=>x.level),[1,2,3,4,5,6,7,8,9,10]);
 assert.ok(TREE_PRIZE_PREVIEW.slice(4).every(x=>x.title==='Zufällige Überraschung'));
});
test('tree stage UI uses authenticated existing village API and read-only load',()=>{
 const html=text('../DOG/christmas-event.html');
 const client=text('../DOG/christmas-event.js');
 const board=text('../DOG/christmas-tree-rewards-ui.js');
 assert.match(html,/id="tree-reward-list"/);
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
