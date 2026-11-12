import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync(new URL('../dog-tor-map.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../dog-tor-map.html',import.meta.url),'utf8');
const event=fs.readFileSync(new URL('../dog-expedition.html',import.meta.url),'utf8');
const roomJs=fs.readFileSync(new URL('../dog-materials-ui.js',import.meta.url),'utf8');

class FakeElement{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.events=new Map();this.attributes=new Map();
  this.style={};this.dataset={};this.className='';this.textContent='';
  this.open=false;this.href='';
  this.classList={
   add:x=>{this.className+=' '+x},
   toggle:(x,force)=>{
    const set=new Set(this.className.split(' ').filter(Boolean));
    if(force===undefined?!set.has(x):force)set.add(x);else set.delete(x);
    this.className=[...set].join(' ');
   }
  };
 }
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 querySelector(query){
  if(query==='.party-pins')return this.children.find(c=>c.className?.split(' ').includes('party-pins'))||null;
  return null;
 }
 setAttribute(k,v){this.attributes.set(k,String(v))}
 getAttribute(k){return this.attributes.get(k)}
 addEventListener(k,fn){this.events.set(k,fn)}
 click(){this.events.get('click')?.()}
 showModal(){this.open=true}
 close(){this.open=false;this.events.get('close')?.()}
}

function page(search='?room=123',serverMap=null,opts={}){
 const elements=new Map();
 const byId=id=>{
  if(!elements.has(id))elements.set(id,new FakeElement(id));
  return elements.get(id);
 };
 const document={
  getElementById:byId,
  addEventListener:()=>{},
  createElement:tag=>new FakeElement(tag),
  createElementNS:(ns,tag)=>new FakeElement(tag),
  querySelectorAll:query=>{
   const all=[];
   function collect(el){for(const c of el.children){all.push(c);collect(c)}}
   collect(byId('worlds'));
   if(query==='.gate[aria-pressed="true"]')
    return all.filter(x=>x.className.split(' ').includes('gate')&&x.getAttribute('aria-pressed')==='true');
   return [];
  }
 };
 const session=serverMap?{status:'online',user:{uid:'hero-a',getIdToken:async()=> 'test-token'},
  profile:{setupComplete:true}}:null;
 const window={addEventListener:()=>{},requestAnimationFrame:()=>{},
  SpielOnline:session?{state:()=>session}:undefined};
 const fightCalls=[];
 const fetch=async(url,options={})=>{
  if(url.endsWith('/fight')){
   const data=JSON.parse(options.body||'{}');
   fightCalls.push(data);
   if(opts.onFight)return opts.onFight(data,fightCalls.length);
   throw Error('Unexpected fight request');
  }
  return {ok:true,json:async()=>({ok:true,...serverMap})};
 };
 const storage=opts.storage||new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)};
 vm.runInNewContext(js,{document,window,location:{search},URLSearchParams,fetch,localStorage},
  {timeout:1500});
 const worlds=byId('worlds').children;
 const collect=(el,into)=>{if(el.className.split(' ').includes('gate'))into.push(el);
  for(const child of el.children)collect(child,into)};
 const gates=[];for(const world of worlds)collect(world,gates);
 return {elements,worlds,gates,byId,fightCalls,storage};
}

test('All five worlds render exactly 100 numbered gates with correct types',()=>{
 const {worlds,gates}=page();
 assert.equal(worlds.length,5);
 assert.equal(gates.length,100);
 assert.equal(new Set(gates.map(g=>g.children[0].textContent)).size,100);
 const bosses=gates.filter(g=>g.className.includes(' boss'));
 const minis=gates.filter(g=>g.className.includes(' mini'));
 assert.equal(bosses.length,10);assert.equal(minis.length,10);
 assert.equal(gates.length-bosses.length-minis.length,80);
 assert.deepEqual(bosses.map(x=>Number(x.children[0].textContent)),
  [10,20,30,40,50,60,70,80,90,100]);
 assert.deepEqual(minis.map(x=>Number(x.children[0].textContent)),
  [5,15,25,35,45,55,65,75,85,95]);
 assert.ok(gates.at(-1).className.includes(' final'));
});

test('DOG is a visible but locked goal; gate details work accessibly',()=>{
 const {gates,byId}=page();
 gates.at(-1).click();
 assert.equal(byId('details').open,true);
 assert.match(byId('gate-detail-title').textContent,/letzte Wächter/);
 assert.match(byId('gate-detail-summary').textContent,/DOG/);
 assert.equal(gates.at(-1).getAttribute('aria-pressed'),'true');
 byId('gate-detail-close').click();
 assert.equal(byId('details').open,false);
 assert.equal(gates.at(-1).getAttribute('aria-pressed'),'false');
 assert.match(html,/DOG – noch verschlossen/);
 assert.match(html,/serverseitig/);
 assert.ok(!html.includes('href="./DOG/'),'do not bypass future unlock by direct game link');
});

test('Map entry from existing expedition and room-return navigation are connected',()=>{
 const {byId}=page('?room=123');
 assert.equal(byId('back-event').href,'./dog-expedition.html?room=123');
 assert.equal(byId('back-forge').href,'./dog-forge.html?room=123');
 assert.match(event,/id="map-launch" href="\.\/dog-tor-map\.html"/);
 assert.match(event,/id="map-waypoint" href="\.\/dog-tor-map\.html"/);
 assert.match(roomJs,/map-launch','map-waypoint/);
});

test('Map uses authenticated server positions and only unlocks mapped personal fights',()=>{
 assert.match(js,/\/api\/dog\/gates\//);
 assert.match(js,/getIdToken\(/);
 assert.match(js,/request\('GET','map'/);
 assert.match(js,/request\('POST','fight'/);
 assert.match(js,/request\('POST','join'/);
 assert.match(js,/readPending\(account\)/);
 assert.match(html,/zuletzt vom Server gespeicherte Position/);
 assert.match(html,/id="team-members"/);
 assert.match(html,/id="gate-battle-button"/);
 assert.match(html,/id="gate-boss-button"/);
 assert.ok(!html.includes('href="./DOG/'),'do not bypass final server unlock');
});
test('All ten shared bosses launch directly from their map gates, preserving the room',()=>{
 const {gates,byId}=page();
 gates[9].click();
 assert.equal(byId('gate-boss-button').hidden,false);
 assert.match(byId('gate-boss-button').href,/dog-boss10.html\?room=123/);
 assert.match(byId('gate-fight-status').textContent,/Bereit/);
 for(const gate of [20,30,40,50,60,70,80,90,100]){
  byId('gate-detail-close').click();
  gates[gate-1].click();
  assert.equal(byId('gate-boss-button').hidden,false,'Boss '+gate+' is available');
  assert.match(byId('gate-boss-button').href,
   new RegExp('dog-group-boss.html\\?gate='+gate+'&room=123'));
  assert.match(byId('gate-boss-button').textContent,
   new RegExp('Gruppenboss '+gate));
 }
 assert.match(byId('gate-fight-status').textContent,/Boss 90/);
});

test('Map places server-confirmed positions of three heroes at the exact gate',async()=>{
 const serverMap={
  members:[
   {uid:'hero-a',name:'Christoph',currentGate:14,highestGate:35,isMe:true,heroLocked:true,lastAttemptAt:0},
   {uid:'hero-b',name:'David',currentGate:9,highestGate:9,isMe:false,lastAttemptAt:0},
   {uid:'hero-c',name:'Vanessa',currentGate:14,highestGate:25,isMe:false,lastAttemptAt:0}
  ],
  memberCount:3,isMember:true,canJoin:false,
  progress:{currentGate:14,normals:[1,2,3,4,6,7,8,9,11,12,13],
   minis:[5],lastAttemptAt:0},sharedBosses:[],dogUnlocked:false
 };
 const {gates,byId}=page('?room=123',serverMap);
 await new Promise(resolve=>setImmediate(resolve));
 const at14=gates[13].querySelector('.party-pins');
 const at9=gates[8].querySelector('.party-pins');
 assert.equal(at14.children.length,2,'two heroes share tor 14');
 assert.equal(at9.children.length,1);
 assert.deepEqual(at14.children.map(c=>c.textContent),['C','V']);
 assert.deepEqual(at9.children.map(c=>c.textContent),['D']);
 assert.equal(byId('team-members').children.length,3);
 const firstInfo=byId('team-members').children[0].children[1].children;
 assert.ok(firstInfo.some(c=>c.textContent.includes('Aktuell: Tor 14')));
 assert.ok(firstInfo.some(c=>c.textContent.includes('Höchstes erreichtes Tor: 35')));
 assert.equal(byId('team-join').hidden,true);
 gates[13].click();
 assert.equal(byId('gate-battle-button').disabled,false,'previous normal tor 13 was cleared');
 gates[14].click();
 assert.equal(byId('gate-battle-button').disabled,true,'tor 14 not yet cleared, mini boss 15 not yet eligible');
});

test('Map permits miniboss 15 before Boss 10, but blocks gate 16 until team victory',async()=>{
 const map={
  members:[{uid:'hero-a',name:'Hero A',currentGate:15,highestGate:15,isMe:true,heroLocked:true}],
  memberCount:1,isMember:true,canJoin:true,sharedBosses:[],
  progress:{currentGate:15,highestGate:15,normals:[1,2,3,4,6,7,8,9,11,12,13,14],
   minis:[],miniRewards:[],lastAttemptAt:0}
 };
 const {gates,byId}=page('?room=123',map);
 await new Promise(resolve=>setImmediate(resolve));
 gates[14].click(); // mini-boss 15
 assert.equal(byId('gate-battle-button').disabled,false);
 assert.match(byId('gate-fight-status').textContent,/Bereit/);
 gates[15].click(); // gate 16
 assert.equal(byId('gate-battle-button').disabled,true);
 assert.match(byId('gate-fight-status').textContent,/Boss 10/);
 assert.match(byId('gate-fight-status').textContent,/Tor 15/);
 map.sharedBosses=[10];
 // Fresh page simulates the newly confirmed team progress.
 const unlocked=page('?room=123',map);
 await new Promise(resolve=>setImmediate(resolve));
 unlocked.gates[15].click();
 assert.equal(unlocked.byId('gate-battle-button').disabled,false);
});

test('Map repeats the same five-gate buffer for Boss 20 and Tor 25/26',async()=>{
 const model={
  members:[{uid:'hero-a',name:'Hero A',currentGate:25,highestGate:25,isMe:true,heroLocked:true}],
  memberCount:1,isMember:true,canJoin:false,sharedBosses:[10],
  progress:{currentGate:25,highestGate:25,normals:[1,2,3,4,6,7,8,9,11,12,13,14,
   16,17,18,19,21,22,23,24],minis:[],miniRewards:[],lastAttemptAt:0}
 };
 const {gates,byId}=page('?room=123',model);
 await new Promise(resolve=>setImmediate(resolve));
 gates[24].click();
 assert.equal(byId('gate-battle-button').disabled,false);
 gates[25].click();
 assert.equal(byId('gate-battle-button').disabled,true);
 assert.match(byId('gate-fight-status').textContent,/Boss 20/);
});


test('Every group boss previews its own local artwork before entering the arena',()=>{
 assert.match(html,/id="gate-boss-preview"/);
 assert.match(html,/id="gate-boss-portrait"/);
 const bosses=[
  [10,'aschewaechter.svg','Aschewächter'],
  [20,'schattenfuerst.svg','Schattenfürst'],
  [30,'kristallwurm.svg','Kristallwurm'],
  [40,'dornenkoenig.svg','Dornenkönig'],
  [50,'hueter-der-tiefe.svg','Hüter der Tiefe'],
  [60,'flammendrache.svg','Flammendrache'],
  [70,'seelenrichter.svg','Seelenrichter'],
  [80,'eisenkoloss.svg','Eisenkoloss'],
  [90,'festungswaechter.svg','Festungswächter'],
  [100,'letzter-waechter.svg','Der letzte Wächter']
 ];
 const {gates,byId}=page();
 for(const [gate,file,name] of bosses){
  gates[gate-1].click();
  assert.equal(byId('gate-boss-preview').hidden,false);
  assert.equal(byId('gate-boss-portrait').src,'./dog-boss-art/'+file);
  assert.equal(byId('gate-boss-portrait').alt,'Tor '+gate+': '+name);
 }
 gates[18].click();
 assert.equal(byId('gate-boss-preview').hidden,true,
  'normal tor should hide the boss-only preview');
});

test('100-Tore event dashboard shows only confirmed server milestones',async()=>{
 const saved={isMember:true,memberCount:3,dogUnlocked:false,sharedBosses:[10,20],
  members:[{uid:'hero-a',name:'A',isMe:true,heroLocked:true,highestGate:27,currentGate:27}],
  progress:{highestGate:27,normals:[1,2,3],minis:[5]}};
 const {byId}=page('?room=123',saved);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(byId('expedition-progress').hidden,false);
 assert.equal(byId('ep-high').textContent,'27');
 assert.equal(byId('ep-normal').textContent,'3 / 80');
 assert.equal(byId('ep-mini').textContent,'1 / 10');
 assert.equal(byId('ep-boss').textContent,'2 / 10');
 assert.equal(byId('ep-bar').getAttribute('aria-valuenow'),'2');
 assert.equal(byId('ep-fill').style.width,'20%');
 assert.match(byId('ep-next').textContent,/Tor 30/);
 assert.equal(byId('ep-milestones').children.length,10);
 assert.match(byId('ep-milestones').children[0].className,/won/);
 assert.equal(byId('event-castle').dataset.victory,'no');
});
test('100-Tore event finale displays victory only when server confirmed Tor 100',async()=>{
 const saved={isMember:true,memberCount:3,dogUnlocked:true,
  sharedBosses:[10,20,30,40,50,60,70,80,90,100],
  members:[{uid:'hero-a',name:'A',isMe:true,heroLocked:true,highestGate:100,currentGate:100}],
  progress:{highestGate:100,normals:[],minis:[]}};
 const {byId,gates}=page('?room=123',saved);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(byId('ep-boss').textContent,'10 / 10');
 assert.equal(byId('ep-fill').style.width,'100%');
 assert.equal(byId('event-castle').dataset.victory,'yes');
 assert.match(byId('dog-lock').textContent,/Expedition abgeschlossen/);
 gates[99].click();
 assert.match(byId('gate-detail-future').textContent,/Server bestätigt/);
});

test('Approved three-character artwork and server-backed choice are present in the map',()=>{
 const css=fs.readFileSync(new URL('../dog-hero-selection.css',import.meta.url),'utf8');
 const atlas=fs.readFileSync(new URL('../dog-boss-art/100tore-hero-atlas.jpg',import.meta.url));
 assert.equal(atlas[0],0xff);assert.equal(atlas[1],0xd8,'hero art is a real JPEG');
 assert.ok(atlas.length>3000,'three approved portraits are bundled locally');
 for(const key of ['krieger','magierin','waechter']){
  assert.match(html,new RegExp('data-hero-class="'+key+'"'));
  assert.ok(css.includes('is-'+key));
 }
 assert.match(html,/id="hero-selection"/);
 assert.match(js,/request\('POST','hero',\{heroClass\},account\)/);
 assert.ok(css.includes('100tore-hero-atlas.jpg'));
 assert.ok(html.includes('dog-hero-selection.css'));
});

test('An unconfirmed hero opens a non-dismissible first-launch choice before the map',async()=>{
 const serverMap={
  members:[{uid:'hero-a',name:'Chris',isMe:true,heroClass:'krieger',heroLocked:false,currentGate:1,highestGate:1}],
  memberCount:1,isMember:true,canJoin:false,sharedBosses:[],
  progress:{currentGate:1,highestGate:1,normals:[],minis:[],lastAttemptAt:0}
 };
 const {byId,gates}=page('?room=123',serverMap);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(byId('hero-selection').open,true,'first launch is a modal');
 assert.equal(byId('hero-selection').hidden,false);
 assert.equal(byId('hero-confirm').disabled,true,'no class is silently preselected');
 gates[0].click();
 assert.equal(byId('gate-battle-button').disabled,true,'fight cannot start before locking a class');
 assert.match(js,/heroLocked===true/);
 assert.match(js,/addEventListener\('cancel',e=>e\?\.preventDefault\?\.\(\)\)/);
 assert.match(html,/Endgültig bestätigen/);
 assert.match(html,/alle drei Spieler dürfen denselben Helden wählen/i);
});
test('A locked character skips onboarding and remains permanently visible',async()=>{
 const serverMap={
  members:[{uid:'hero-a',name:'Chris',isMe:true,heroClass:'magierin',heroLocked:true,currentGate:1,highestGate:1}],
  memberCount:1,isMember:true,canJoin:false,sharedBosses:[],
  progress:{currentGate:1,highestGate:1,normals:[],minis:[],lastAttemptAt:0}
 };
 const {byId}=page('?room=123',serverMap);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(byId('hero-selection').open,false);
 assert.equal(byId('hero-selection').hidden,true);
 assert.equal(byId('hero-locked-summary').hidden,false);
 assert.equal(byId('hero-locked-name').textContent,'Magierin');
 assert.match(js,/request\('POST','hero',\{heroClass\},account\)/);
});

const quickSample=()=>{
 const map={isMember:true,memberCount:1,canJoin:false,sharedBosses:[],
  members:[{uid:'hero-a',name:'Hero',isMe:true,heroLocked:true,heroClass:'krieger',currentGate:1,highestGate:1}],
  progress:{currentGate:1,highestGate:1,normals:[],minis:[],miniRewards:[],lastAttemptAt:0}};
 const respond=(body,win=true,replayed=false)=>({
  ok:true,json:async()=>({ok:true,replayed,map:{...map,
   progress:{...map.progress,normals:win?[body.gate]:[]}},
   result:{gate:body.gate,type:'normal',win,chancePercent:40,
    combatStats:{model:'single-roll-summary-v1',enemyMaxHp:115,
     enemyRemainingHp:win?0:52,enemyDamageTaken:win?115:63,
     heroMaxHp:120,heroRemainingHp:win?91:0,heroDamageTaken:win?29:120,
     chancePercent:40,weaponLevel:1,armorLevel:1}}})
 });
 return {map,respond};
};
const nextTick=()=>new Promise(resolve=>setImmediate(resolve));
test('Start click sends backend requestId and opens server-confirmed victory with HP',async()=>{
 const {map,respond}=quickSample();
 const x=page('?room=123',map,{onFight:body=>respond(body,true)});
 await nextTick();
 x.gates[0].click();
 assert.equal(x.byId('details').dataset.quick,'yes');
 assert.equal(x.byId('gate-battle-button').disabled,false);
 x.byId('gate-battle-button').click();
 await nextTick();await nextTick();
 assert.equal(x.fightCalls.length,1);
 assert.equal(x.fightCalls[0].gate,1);
 assert.match(x.fightCalls[0].requestId,/^[A-Za-z0-9_-]{12,90}$/);
 assert.equal(x.fightCalls[0].id,undefined);
 assert.equal(x.byId('gate-quick-result').open,true);
 assert.equal(x.byId('gate-quick-result-title').textContent,'SIEG!');
 assert.equal(x.byId('gate-quick-result-stats').children.length,7);
 assert.equal(x.storage.size,0);
 x.byId('gate-quick-result-close').click();
 assert.equal(x.byId('gate-quick-result').open,false);
});
test('Defeat shows remaining enemy HP and permits a fresh new attempt',async()=>{
 const {map,respond}=quickSample();
 const x=page('?room=123',map,{onFight:body=>respond(body,false)});
 await nextTick();
 x.gates[0].click();x.byId('gate-battle-button').click();
 await nextTick();await nextTick();
 assert.equal(x.byId('gate-quick-result-title').textContent,'NIEDERLAGE');
 const meters=x.byId('gate-quick-result-stats').children[0].children;
 assert.equal(meters[0].children[0].children[1].textContent,'52 / 115');
 assert.equal(meters[1].children[0].children[1].textContent,'0 / 120');
 assert.equal(x.storage.size,0);
 x.byId('gate-quick-result-close').click();
 x.gates[0].click();x.byId('gate-battle-button').click();
 await nextTick();await nextTick();
 assert.equal(x.fightCalls.length,2);
 assert.notEqual(x.fightCalls[0].requestId,x.fightCalls[1].requestId);
});
test('Network uncertainty keeps receipt; retry replays same request ID',async()=>{
 const {map,respond}=quickSample();
 const x=page('?room=123',map,{onFight:(body,n)=>n===1?
  Promise.reject(Error('Network offline')):respond(body,true,true)});
 await nextTick();x.gates[0].click();x.byId('gate-battle-button').click();
 await nextTick();await nextTick();
 assert.equal(x.storage.size,1);
 assert.equal(x.byId('gate-retry-button').hidden,false);
 x.byId('gate-retry-button').click();
 await nextTick();await nextTick();
 assert.equal(x.fightCalls.length,2);
 assert.equal(x.fightCalls[0].requestId,x.fightCalls[1].requestId);
 assert.equal(x.byId('gate-quick-result').open,true);
 assert.equal(x.storage.size,0);
});
test('Rejected invalid request ID does not trap the player',async()=>{
 const {map}=quickSample();
 const x=page('?room=123',map,{onFight:()=>({ok:false,
  json:async()=>({ok:false,error:'INVALID_REQUEST_ID'})})});
 await nextTick();x.gates[0].click();x.byId('gate-battle-button').click();
 await nextTick();await nextTick();
 assert.equal(x.storage.size,0);
 assert.match(x.byId('gate-recovery-status').textContent,/Ungültige Kampfkennung/);
 assert.equal(x.byId('gate-retry-button').hidden,true);
});
test('Mini-boss keeps existing path and never opens quick-result dialog',async()=>{
 const {map}=quickSample();map.progress.normals=[1,2,3,4];
 const x=page('?room=123',map,{onFight:body=>({ok:true,json:async()=>({
  ok:true,map,result:{gate:body.gate,type:'mini',win:false,
   combat:{feedback:{message:'Besiegt'}}},replayed:false})})});
 await nextTick();x.gates[4].click();
 assert.equal(x.byId('details').dataset.quick,'no');
 x.byId('gate-battle-button').click();await nextTick();await nextTick();
 assert.equal(x.fightCalls.length,1);
 assert.equal(x.byId('gate-quick-result').open,false);
});
