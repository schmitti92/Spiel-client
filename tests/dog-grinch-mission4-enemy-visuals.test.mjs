import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compileBoard,createInspection} from '../DOG/grinch-campaign/mission-4-board.mjs';
import {portalSummary,combatVisuals,motionSeconds} from '../DOG/grinch-campaign/mission-4-enemy-visuals.mjs';
import {spawnPortalEnemy,portalTick} from '../DOG/grinch-campaign/mission-4-portal1.mjs';
import {createCards,passCard,completeCard} from '../DOG/grinch-campaign/mission-4-cards.mjs';
const b=compileBoard(JSON.parse(readFileSync(new URL('../DOG/grinch-campaign/mission-4-layout.json',import.meta.url))));
test('countdown is based on completed moves, closes without further countdown',()=>{const s=createInspection(b);assert.deepEqual([0,1,2,3].map(t=>portalSummary(s,t).remaining),[3,2,1,3]);s.portal1.closed=true;assert.equal(portalSummary(s,3).remaining,null);});
test('spawn and defeated effects use real positions',()=>{const s=createInspection(b),n=spawnPortalEnemy(b,s);let v=combatVisuals(b,s.pieces,n.pieces);assert.equal(v.motions.length,1);assert.deepEqual(v.motions[0].points,[b.source.spawnPoints[0],b.fields[34].position]);assert.equal(v.bursts[0].kind,'spawn');v=combatVisuals(b,n.pieces,s.pieces);assert.equal(v.bursts[0].kind,'defeat');});
test('portal turn reports real path, visual plan does not mutate game state',()=>{let s=createInspection(b),c=createCards(13);for(let i=0;i<3;i++)c=passCard(c,c.hands[c.current][0].id);for(let i=0;i<3;i++)c=completeCard(c,c.hands[c.current][0].id);const n=portalTick(b,s,c),snapshot=JSON.stringify(n.state);const v=combatVisuals(b,s.pieces,n.state.pieces,n.visual);assert.ok(v.motions.length);assert.ok(v.motions.every(m=>motionSeconds(m)<=3.2));assert.equal(JSON.stringify(n.state),snapshot);});
