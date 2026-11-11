import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('dog-group-boss.html');
const js=read('dog-group-boss.js');
const map=read('dog-tor-map.js');
test('All nine later boss gates open a dynamic arena with the right enemy',()=>{
 for(const [gate,name] of [[20,'Schattenfürst'],[30,'Kristallwurm'],
  [40,'Dornenkönig'],[50,'Hüter der Tiefe'],[60,'Flammendrache'],
  [70,'Seelenrichter'],[80,'Eisenkoloss'],[90,'Festungswächter'],
  [100,'Der letzte Wächter']]){
  assert.ok(js.includes(gate+":'"+name+"'"),'missing '+gate+' '+name);
 }
 assert.ok(map.includes("'./dog-group-boss.html?gate='+gate+"));
 assert.ok(map.includes("boss.href='./dog-boss10.html'+roomSuffix"));
 assert.ok(js.includes("const route='/api/dog/gates/boss/'+gate"));
 assert.ok(js.includes('API+route+action'));
 assert.ok(js.includes("requestedGate%10===0"));
});
test('Arena has real start/ready/react, restore and displayed HP controls',()=>{
 for(const id of ['group-kicker','group-title','group-enemy','group-reward',
  'boss-name','ready-button','start-button','react-button','retry-button',
  'heroes','timer','timer-fill','boss-hp','outcome'])
  assert.ok(html.includes('id="'+id+'"'),id+' missing');
 for(const command of ['ready','start','react','finish'])
  assert.ok(js.includes("command('"+command+"')"),command+' command missing');
 assert.ok(js.includes("request.command==='finish'"));
 assert.ok(js.includes('acknowledgePending(uid,data)'));
 assert.ok(js.includes('view?.result?.hpRemaining'));
 assert.ok(js.includes('toLocaleString'));
 assert.ok(js.includes('localStorage.getItem(key(uid))'));
 assert.ok(js.includes('localStorage.setItem(key(uid),str)'));
 assert.ok(js.includes('getIdToken'));
});
test('Boss 100 is a special final encounter but no direct DOG route bypass exists',()=>{
 assert.ok(html.includes('Der vorherige gemeinsame Boss muss besiegt sein'));
 assert.ok(js.includes("gate===100?'DOG freischalten'"));
 assert.ok(js.includes('view?.canStart'));
 assert.ok(js.includes('view?.roster?.some(m=>m.uid===account)'));
 assert.ok(!html.includes('href="./DOG/'));
 assert.ok(!js.includes("location.href='./DOG/"));
});
