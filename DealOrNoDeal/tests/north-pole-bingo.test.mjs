import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const js=readFileSync('DealOrNoDeal/js/north-pole-bingo.js','utf8');
const window={};
runInNewContext(js,{window});
const {snapshot,LINES,MILESTONES}=window.NorthPoleBingo;
const own=(...nums)=>Object.fromEntries(nums.map(n=>['christmas-'+String(n).padStart(2,'0'),1]));

test('the Nordpol compass covers exactly four rows, four columns and both diagonals',()=>{
 assert.equal(LINES.length,10);
 assert.deepEqual([...LINES[0]],[0,1,2,3]);
 assert.deepEqual([...LINES[8]],[0,5,10,15]);
 assert.deepEqual([...LINES[9]],[3,6,9,12]);
 assert.equal(new Set(LINES.map(line=>line.join(','))).size,10);
});
test('a complete row and nearly complete column show accurate missing card numbers',()=>{
 const status=snapshot(own(65,66,67,68,69,73),{totalBingos:1});
 assert.equal(status.count,6);
 assert.equal(status.lines[0].complete,true);
 assert.equal(status.lines[4].have,3);
 assert.deepEqual([...status.lines[4].missing],[77]);
 assert.equal(status.lines[1].have,1);
 assert.equal(status.lines.filter(l=>l.complete).length,1);
});
test('duplicate cards never count as extra line completion',()=>{
 const stock=own(65,66,67);
 stock['christmas-65']=36;
 stock['christmas-66']=17;
 const status=snapshot(stock,{totalBingos:0});
 assert.equal(status.count,3);
 assert.equal(status.lines[0].have,3);
 assert.equal(status.lines[0].complete,false);
 assert.deepEqual([...status.lines[0].missing],[68]);
});
test('only server supplied unlock identifiers mark Nordpol prizes unlocked',()=>{
 const cards=own(65,66,67,68);
 const before=snapshot(cards,{totalBingos:30,rewards:[]});
 assert.equal(before.milestones.every(m=>!m.unlocked),true);
 const after=snapshot(cards,{totalBingos:30,rewards:MILESTONES.map(x=>x.id)});
 assert.equal(after.milestones.every(m=>m.unlocked),true);
 assert.deepEqual([...after.milestones.map(m=>m.at)],[22,24,26,28,30]);
});
test('compass never counts hammer cards 33–64 toward Nordpol lines',()=>{
 const cards=Object.fromEntries(Array.from({length:32},(_,i)=>['christmas-'+(33+i),5]));
 const result=snapshot(cards,{totalBingos:0});
 assert.equal(result.count,0);
 assert.equal(result.lines.every(line=>line.have===0),true);
});
test('the existing album includes the compass controls and resets them on logout',()=>{
 const html=readFileSync('DealOrNoDeal/weihnachten.html','utf8');
 for(const id of ['north-bingo-rows','north-bingo-columns','north-bingo-diagonals','north-bingo-milestones','north-bingo-next','north-bingo-hint'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('NorthPoleBingo?.render(data)'), 'should render using the same GET response');
 assert.ok(html.includes('NorthPoleBingo?.reset()'), 'should reset whenever account identity is cleared');
});

test('milestone 22 stays pending while already claimed Premium vouchers are being backfilled',()=>{
 const progress={
  totalBingos:22,rewards:['north-premium-2'],
  northPoleClaimed:['north-premium-2'],northPolePending:['north-premium-2']
 };
 const before=snapshot(own(65,66,67,68),progress);
 assert.equal(before.milestones[0].unlocked,true);
 assert.equal(before.milestones[0].claimed,false,'claimed timestamp alone is not proof of saved voucher');
 const after=snapshot(own(65,66,67,68),{...progress,northPolePending:[]});
 assert.equal(after.milestones[0].claimed,true);
 assert.equal(after.milestones[1].claimed,false);
});

test('third board displays visible claim and retry status after a server-confirmed milestone',()=>{
 const html=readFileSync('DealOrNoDeal/weihnachten.html','utf8');
 assert.match(html,/id="north-bingo-claim-status" role="status"/);
 assert.match(html,/claimMessage\('⏳ Erreichte Nordpol-Bingo-Belohnungen/);
 assert.match(html,/claimMessage\('✅ '\+result\.claimed/);
 assert.match(html,/claimMessage\('⚠️ Bingo-Gutschrift noch nicht bestätigt/);
 assert.match(html,/north-pole-bingo\.js\?v=20261110-bingo40-v1/);
});
