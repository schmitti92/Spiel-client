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
 setAttribute(k,v){this.attributes.set(k,String(v))}
 getAttribute(k){return this.attributes.get(k)}
 addEventListener(k,fn){this.events.set(k,fn)}
 click(){this.events.get('click')?.()}
 showModal(){this.open=true}
 close(){this.open=false;this.events.get('close')?.()}
}

function page(search='?room=123'){
 const elements=new Map();
 const byId=id=>{
  if(!elements.has(id))elements.set(id,new FakeElement(id));
  return elements.get(id);
 };
 const document={
  getElementById:byId,
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
 const window={addEventListener:()=>{},requestAnimationFrame:()=>{}};
 vm.runInNewContext(js,{document,window,location:{search},URLSearchParams},
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

test('Map is a read-only preview and does not award progress',()=>{
 assert.ok(!js.includes('fetch('));
 assert.ok(!js.includes('.post('));
 assert.match(html,/Kartenvorschau/);
 assert.match(html,/verändert keine Spielerdaten/);
});
