import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const js=read('js/north-pole-bingo.js');
const page=read('weihnachten.html');
const css=read('css/christmas-bingo-40-rewards.css');
const win={};runInNewContext(js,{window:win});
const rewards=win.NorthPoleBingo.FOURTH_MILESTONES;

test('Fourth classic Bingo board advertises exactly the five requested awards',()=>{
 assert.deepEqual(Array.from(rewards,x=>x.at),[32,34,36,38,40]);
 assert.deepEqual(Array.from(rewards,x=>x.id),[
  'fourth-monster-spin-1','fourth-jokers-2','fourth-hats-voucher-1',
  'fourth-gold-hammers-3','fourth-grand-combo'
 ]);
 assert.deepEqual(Array.from(rewards,x=>x.name),[
  '1 Monster-Glücksrad-Drehung','2 Kofferblick-Joker','1 Weihnachtsmützen-Spielgutschein',
  '3 goldene Hammer','3 goldene Hammer + 3 Joker + 2 Weihnachtsmützen-Spielgutscheine'
 ]);
});

test('Fourth board creates genuine status chips from confirmed rewards, not placeholders',()=>{
 assert.match(page,/id="fourth-bingo-milestones" role="group"/);
 assert.doesNotMatch(page,/Gesamt-Bingos: Belohnung wird später festgelegt/);
 assert.match(js,/FOURTH_MILESTONES\.map\(m=>createMilestoneChip\(m,rewardRoot\)\)/);
 assert.match(js,/new Set\(Array\.isArray\(data\?\.northPoleClaimed\)/);
 assert.match(js,/new Set\(Array\.isArray\(data\?\.northPolePending\)/);
 assert.match(js,/fourthMilestoneNodes\.forEach\(\(chip,i\)=>updateMilestoneChip\(chip,milestones\[i\]\)\)/);
 assert.match(js,/Nächster Gewinn:/);
 assert.match(js,/BINGO 40 GESCHAFFT!/);
 assert.doesNotThrow(()=>new Script(js));
});

test('Christmas album lists the final jackpot in the rewards overview',()=>{
 for(const count of [32,34,36,38,40])assert.match(page,new RegExp(count+' Bingos ·'));
 assert.match(page,/3 goldene Hammer \+ 3 Joker \+ 2 Weihnachtsmützen-Spielgutscheine/);
 assert.match(page,/Alle 20 Bingo-Meilensteine bis Bingo 40 freigeschaltet/);
 assert.match(page,/north-pole-bingo\.js\?v=20261110-bingo40-v1/);
 assert.match(page,/christmas-bingo-40-rewards\.css\?v=20261110-bingo40-v1/);
 assert.match(css,/#event-album #fourth-bingo-milestones/);
 assert.match(css,/fourth-grand-combo/);
});

test('Fourth board claims and voucher granting stay on authenticated server',()=>{
 assert.match(page,/northPolePending/);
 assert.match(page,/request\('POST','north-pole\/claim'\)/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|setInterval/);
 assert.doesNotMatch(js,/(?:bonusTickets|monsterWheelTickets|jokerBalance)\s*(?:=|\+\+)/);
});
