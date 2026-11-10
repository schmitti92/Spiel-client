import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script,createContext,runInContext} from 'node:vm';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const load=path=>readFileSync(resolve(root,path),'utf8');
const page=load('weihnachtsmuetzen.html');
const css=load('css/christmas-hats-rewards-v6.css');
const inline=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean).join('\n');

test('New reward CSS follows cinematic reveal and Superglück can skip the animated cards',()=>{
 assert.ok(page.indexOf('christmas-hats-reveal-v5.css')<page.indexOf('christmas-hats-rewards-v6.css'));
 for(const id of ['cinema-tally','cinema-skip','cinema-close','cinema-prizes','cinema-title']){
  assert.equal([...page.matchAll(new RegExp('id="'+id+'"','g'))].length,1,'duplicate ID '+id);
 }
 assert.match(inline,/stage\.classList\.toggle\('super-show',superLuck\)/);
 assert.match(inline,/stage\.classList\.toggle\('checkpoint-show',checkpoint\)/);
 assert.match(inline,/list\.appendChild\(createRewardCard\(items\[i\],\{cinematic:true,index:i,total:items\.length\}\)\)/);
 assert.match(inline,/\$\('cinema-skip'\)\.onclick=/);
 assert.match(inline,/revealTimer=setTimeout\(finishReveal,reduced\?3000:event\.superLuck\?12800:/);
 assert.doesNotThrow(()=>new Script(inline,{filename:'weihnachtsmuetzen.html'}));
});

test('Reward art is locally hosted, self-contained and reused in the inventory and finale',()=>{
 const names=['reward-pack.svg','reward-platinum.svg','prize-hammer.svg','reward-joker.svg','reward-cash.svg'];
 for(const name of names){
  const path='assets/hats/'+name;
  assert.ok(existsSync(resolve(root,path)),name+' is missing');
  const source=load(path);
  assert.match(source,/<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(source,/<\/svg>\s*$/);
  assert.doesNotMatch(source,/<script|<foreignObject|onload=|href="https?:/i);
  assert.match(inline,new RegExp(name.replaceAll('.','\\.')));
 }
 assert.match(inline,/formatItems\(presented\?\.secured/);
 assert.match(inline,/formatItems\(presented\?\.pending/);
 assert.match(inline,/content\.appendChild\(createRewardCard\(totalCash,\{compact:true\}\)\)/);
 assert.match(css,/\.reward-card--compact/);
 assert.match(css,/\.cinema-prize\.reward-card/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:700px\)/);
});

test('The server is the only source of prize values and reveal can never pay out again',()=>{
 const start=inline.indexOf('function openCinema(event){'),end=inline.indexOf('function clearShowTimers(){',start);
 assert.ok(start>0&&end>start);
 const section=inline.slice(start,end);
 assert.match(section,/const items=Array\.isArray\(event\.items\)\?event\.items:\[\]/);
 assert.match(section,/Number\(item\.quantity\|\|1\)/);
 assert.doesNotMatch(section,/\baction\(|\bfetch\(|\bcall\(|Math\.random/);
 const skip=inline.slice(inline.indexOf("$('cinema-skip').onclick="),inline.indexOf("$('cinema-close').onclick="));
 assert.match(skip,/classList\.add\('show-all'\)/);
 assert.doesNotMatch(skip,/\baction\(|\bfetch\(|\bcall\(/);
});

test('Reward card builder preserves exact data and handles quantity and rarity',()=>{
 const start=inline.indexOf('const rewardArt={');
 const end=inline.indexOf('function openCinema(event){',start);
 assert.ok(start>0&&end>start);
 const extraction=inline.slice(start,end);
 const make=tag=>{
  return {
   tagName:tag,children:[],dataset:{},style:{setProperty(key,value){this[key]=value;}},
   append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x);return x},
   replaceChildren(...xs){this.children=[...xs]},
   setAttribute(name,value){this[name]=value},
   textContent:'',className:'',src:'',alt:''
  };
 };
 const sandbox=createContext({document:{createElement:make}});
 runInContext(extraction+';this.testApi={rewardRarity,rewardTitle,createRewardCard,formatItems};',sandbox);
 const api=sandbox.testApi;
 const platinum={kind:'pack',packId:'platinum',quantity:2,label:'2× Platinpaket'};
 const platinumCard=api.createRewardCard(platinum,{cinematic:true,index:2,total:5});
 assert.equal(platinumCard.dataset.rarity,'legendary');
 assert.equal(platinumCard.children.find(x=>x.tagName==='span'&&x.className==='reward-name').textContent,'Platinpaket');
 assert.equal(platinumCard.children.find(x=>x.className==='reward-count').textContent,'×2');
 assert.equal(platinumCard.children.find(x=>x.className==='reward-sequence').textContent,'03 / 05');
 assert.equal(platinumCard.children.find(x=>x.className==='reward-image-wrap').children[0].src,'./assets/hats/reward-platinum.svg');
 assert.equal(api.rewardRarity({kind:'cash',amountCents:500000000}),'legendary');
 assert.equal(api.rewardRarity({kind:'hammer',hammer:'single'}),'common');
 const group=make('div');
 api.formatItems([{items:[{kind:'hammer',hammer:'single',quantity:1,label:'Einfacher Hammer'},
  {kind:'hammer',hammer:'single',quantity:2,label:'2× Einfacher Hammer'},
  {kind:'joker',quantity:1,label:'Kofferblick-Joker'}]}],group,'Keine');
 assert.equal(group.children.length,2,'two matching hammer rewards must be grouped');
 assert.equal(group.children[0].children.find(x=>x.className==='reward-count').textContent,'×3');
});


test('Chris-only Superglück preview is explicitly reward-free and never consumes a voucher',()=>{
 assert.match(page,/id="preview-super"[^>]+hidden/);
 assert.match(inline,/\$\('preview-super'\)\.hidden=!isChrisDemo\(\)/);
 assert.match(inline,/cinemaPreview\?'🧪 REINE VORSCHAU:/);
 const start=inline.indexOf("$('preview-super').onclick=");
 const end=inline.indexOf("$('cinema-close').onclick=",start);
 assert.ok(start>0&&end>start);
 const preview=inline.slice(start,end);
 assert.match(preview,/if\(!isChrisDemo\(\)\|\|busy\|\|reveal\|\|pendingRequest/);
 assert.match(preview,/cinemaPreview=true/);
 assert.match(preview,/openCinema\(\{type:'super',superLuck:true,room:1,items:/);
 assert.match(preview,/packId:'platinum'/);
 assert.match(preview,/amountCents:500000000/);
 assert.doesNotMatch(preview,/action\(|fetch\(|call\(|start\(/);
 assert.match(inline,/\$\('cinema-close'\)\.onclick=\(\)=>\{if\(cinemaPreview\)closeCinema\(\);else finishReveal\(\);\}/);
});
