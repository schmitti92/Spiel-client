import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const page=readFileSync(new URL('../weihnachten.html',import.meta.url),'utf8');
const renderStart=page.indexOf('function render(data){');
const start=page.indexOf(" document.querySelectorAll('[data-pack]').forEach(b=>{",renderStart);
const end=page.indexOf('\n}\n\nlet hammerClaimRunning=',start);
assert.ok(renderStart>=0&&start>renderStart&&end>start,'shop voucher render snippet is present');
const renderShop=page.slice(start,end);

const packs=[
 {id:'small',price:20000000,count:3},
 {id:'large',price:50000000,count:7},
 {id:'premium',price:100000000,count:12}
];
function show({balance=0,freePacks={},busy=false}={}){
 const buttons=Object.fromEntries(packs.map(pack=>{
  const styles=new Set(),card={classList:{
   toggle(name,enabled){if(enabled)styles.add(name);else styles.delete(name)}
  }};
  return [pack.id,{dataset:{pack:pack.id},disabled:true,textContent:'',
   closest:()=>card,styles}];
 }));
 const stock={hidden:true,textContent:''};
 runInNewContext(renderShop,{
  data:{balance,freePacks,packs},busy,
  document:{querySelectorAll:selector=>selector==='[data-pack]'?Object.values(buttons):[],
   getElementById:id=>id==='free-pack-stock'?stock:null},
  euros:n=>String(n/100)+' €'
 });
 return {buttons,stock};
}

test('Christmas album inline script parses with voucher shop UI',()=>{
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 assert.doesNotThrow(()=>new Script(scripts.at(-1)[1]));
 assert.match(page,/id="free-pack-stock"/);
 assert.match(page,/classList\.toggle\('has-free-pack',freeCount>0\)/);
});

test('Bingo 22 gives two visibly free Premium shop packs even when wallet is empty',()=>{
 const {buttons,stock}=show({balance:0,freePacks:{premium:2}});
 assert.equal(buttons.premium.disabled,false);
 assert.match(buttons.premium.textContent,/KOSTENLOS öffnen/);
 assert.match(buttons.premium.textContent,/2 Gutscheine/);
 assert.equal(buttons.premium.styles.has('has-free-pack'),true);
 assert.equal(buttons.small.disabled,true);
 assert.equal(buttons.large.disabled,true);
 assert.equal(stock.hidden,false);
 assert.match(stock.textContent,/2 kostenlose Weihnachtspakete/);
});

test('One remaining voucher stays free, then the normal Premium price applies',()=>{
 let view=show({balance:0,freePacks:{premium:1}});
 assert.equal(view.buttons.premium.disabled,false);
 assert.match(view.buttons.premium.textContent,/1 Gutschein/);
 view=show({balance:0,freePacks:{premium:0}});
 assert.equal(view.buttons.premium.disabled,true);
 assert.doesNotMatch(view.buttons.premium.textContent,/KOSTENLOS/);
 assert.equal(view.buttons.premium.styles.has('has-free-pack'),false);
 assert.equal(view.stock.hidden,true);
 view=show({balance:100000000,freePacks:{premium:0}});
 assert.equal(view.buttons.premium.disabled,false,'paid purchase remains possible');
});

test('Busy purchase prevents multiple simultaneous free pack clicks',()=>{
 const {buttons}=show({balance:0,freePacks:{premium:2},busy:true});
 assert.equal(buttons.premium.disabled,true);
});

test('Confirmed server purchase updates the local voucher count before the refresh',()=>{
 assert.match(page,/if\(current\)render\(\{\.\.\.current,\.\.\.result\}\)/);
 assert.match(page,/result\.usedFreePack\?'🎁 Kostenloses Bingo-Paket geöffnet/);
 assert.match(page,/if\(!\['Failed to fetch','AbortError','SERVER_ERROR'\]\.includes\(e\.message\)\)clearPurchaseId\(pack\)/);
 assert.match(page,/freeStock\.hidden=true;freeStock\.textContent=''/,'logout must clear the free-pack display');
});
