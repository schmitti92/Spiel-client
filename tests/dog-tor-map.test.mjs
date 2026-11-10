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
  this.classList={add:x=>{this.className+=' '+x}};
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

function page(search='?room=123',serverMap=null){
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
 const fetch=async(url,options)=>({
  ok:true,json:async()=>({ok:true,...serverMap})
 });
 const storage=new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)};
 vm.runInNewContext(js,{document,window,location:{search},URLSearchParams,fetch,localStorage},
  {timeout:1500});
 const worlds=byId('worlds').children;
 const collect=(el,into)=>{if(el.className.split(' ').includes('gate'))into.push(el);
  for(const child of el.children)collect(child,into)};
 const gates=[];for(const world of worlds)collect(world,gates);
 return {elements,worlds,gates,byId};
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
test('Boss 10 launches the existing training arena, other unfinished bosses do not',()=>{
 const {gates,byId}=page();
 gates[9].click();
 assert.equal(byId('gate-boss-button').hidden,false);
 assert.match(byId('gate-boss-button').href,/dog-boss.html\?room=123/);
 assert.match(byId('gate-fight-status').textContent,/Tor-1-Testboss/);
 byId('gate-detail-close').click();
 gates[19].click();
 assert.equal(byId('gate-boss-button').hidden,true);
 assert.match(byId('gate-fight-status').textContent,/noch nicht implementiert/);
});

test('Map places server-confirmed positions of three heroes at the exact gate',async()=>{
 const serverMap={
  members:[
   {uid:'hero-a',name:'Christoph',currentGate:14,isMe:true,lastAttemptAt:0},
   {uid:'hero-b',name:'David',currentGate:9,isMe:false,lastAttemptAt:0},
   {uid:'hero-c',name:'Vanessa',currentGate:14,isMe:false,lastAttemptAt:0}
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
 assert.equal(byId('team-join').hidden,true);
 gates[13].click();
 assert.equal(byId('gate-battle-button').disabled,false,'previous normal tor 13 was cleared');
 gates[14].click();
 assert.equal(byId('gate-battle-button').disabled,true,'tor 14 not yet cleared, mini boss 15 not yet eligible');
});
