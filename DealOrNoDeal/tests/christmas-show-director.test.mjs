// Run: node --test DealOrNoDeal/tests/christmas-show-director.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const js=readFileSync(resolve(root,'js/christmas-show-director.js'),'utf8');
const bingo=readFileSync(resolve(root,'js/hammer-bingo-cinematics.js'),'utf8');
const css=readFileSync(resolve(root,'css/christmas-show-director.css'),'utf8');

function harness(options={}){
 const elements={};
 for(const key of ['reveal-overlay','hammer-cinema','christmas-show-transition','reveal-summary','reveal-close',
  'reveal-next-act','christmas-show-transition-title','christmas-show-transition-copy','christmas-show-transition-skip']){
  elements[key]={
   hidden:true, textContent:'',dataset:{},
   setAttribute(name,value){this[name]=value;},
   addEventListener(){},focus(){}
  };
 }
 let now=0,uid=1;
 const timers=new Map(),events={};
 const counts={resumed:0};
 const ctx=vm.createContext({
  document:{
   readyState:'loading',hidden:false,
   getElementById:key=>elements[key]||null,
   addEventListener:(name,callback)=>{events[name]=callback;}
  },
  window:{
   matchMedia:()=>({matches:!!options.reduced}),
   HammerBingoCinematics:{resume(){counts.resumed++;}}
  },
  setTimeout(fn,ms){const k=uid++;timers.set(k,{fn,at:now+ms});return k;},
  clearTimeout(k){timers.delete(k);}
 });
 vm.runInContext(js,ctx,{filename:'christmas-show-director.js'});
 const director=ctx.window.ChristmasShowDirector;
 return {
  elements,counts,ctx,director,events,
  tick(ms){
   const target=now+ms;
   let guard=0;
   while(true){
    if(++guard>100)throw Error('Unbounded transition timers');
    let pending=null;
    for(const [key,entry] of timers){
     if(entry.at<=target&&(!pending||entry.at<pending.entry.at))pending={key,entry};
    }
    if(!pending)break;
    now=pending.entry.at;timers.delete(pending.key);pending.entry.fn();
   }
   now=target;
  }
 };
}
const showPack=(h,mode='real')=>h.director.presentPack(()=>{
 h.elements['reveal-overlay'].hidden=false;
 h.elements['reveal-summary'].hidden=false;
},mode);
const finishPack=h=>{
 h.elements['reveal-overlay'].hidden=true;
 h.director.packClosed();
};

test('files parse and live HTML loads the director before the Bingo/pack controllers',()=>{
 assert.doesNotThrow(()=>new vm.Script(js));
 const htmlScript=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(htmlScript);
 assert.doesNotThrow(()=>new vm.Script(htmlScript));
 const a=html.indexOf('christmas-show-director.js'),b=html.indexOf('hammer-bingo-cinematics.js');
 const c=html.indexOf('christmas-pack-cinema.js');
 assert.ok(a>0&&a<b&&b<c);
 assert.match(html,/christmas-show-director\.css\?v=/);
 for(const id of ['christmas-show-transition','christmas-show-transition-title',
  'christmas-show-transition-copy','christmas-show-transition-skip','reveal-next-act']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
});

test('confirmed award is held through the package and its own transition, then Bingo resumes',()=>{
 const h=harness();
 assert.equal(showPack(h),true);
 h.director.claimStarted();
 h.director.awardQueued(2);
 h.director.claimSettled();
 assert.equal(h.elements['reveal-next-act'].hidden,false);
 assert.match(h.elements['reveal-next-act'].textContent,/2 bestätigte/);
 finishPack(h);
 assert.equal(h.elements['christmas-show-transition'].hidden,false);
 assert.equal(h.director.canStartBingo(),false);
 h.tick(1100);assert.equal(h.counts.resumed,0);
 h.tick(50);
 assert.equal(h.elements['christmas-show-transition'].hidden,true);
 assert.equal(h.counts.resumed,1);
 assert.equal(h.director.canStartBingo(),true);
 assert.equal(h.director.bingoStarted(),true);
 assert.equal(h.director.canStartBingo(),false);
 h.director.bingoEnded();
 assert.equal(h.director.canStartBingo(),true);
});

test('a gift can close during a slow server claim; pending reward still plays',()=>{
 const h=harness();
 showPack(h);h.director.claimStarted();
 finishPack(h);
 assert.equal(h.director.canStartBingo(),false);
 h.tick(1100);assert.equal(h.counts.resumed,0);
 h.director.awardQueued(1);h.director.claimSettled();
 h.tick(1100);assert.equal(h.counts.resumed,0);
 h.tick(100);assert.equal(h.counts.resumed,1);
});

test('a hanging claim cannot strand the player; confirmed award can appear later',()=>{
 const h=harness();showPack(h);h.director.claimStarted();finishPack(h);
 h.tick(3800);
 assert.equal(h.counts.resumed,1);
 assert.equal(h.elements['christmas-show-transition'].hidden,true);
 assert.equal(h.director.canStartBingo(),true);
 h.director.awardQueued(1);h.director.claimSettled();
 assert.equal(h.director.canStartBingo(),true);
});

test('no reward shows no intrusive transition, and demo never triggers a payout scene',()=>{
 for(const mode of ['real','demo']){
  const h=harness();showPack(h,mode);
  if(mode==='demo'){h.director.awardQueued(0)}
  else {h.director.claimStarted();h.director.claimSettled()}
  finishPack(h);
  assert.equal(h.counts.resumed,1);
  assert.equal(h.elements['christmas-show-transition'].hidden,true);
  assert.equal(h.director.canStartBingo(),true);
 }
});

test('gift waits if Bingo is already visible; deferred gift opens once after Bingo fully closes',()=>{
 const h=harness();
 assert.equal(h.director.bingoStarted(),true);
 h.elements['hammer-cinema'].hidden=false;
 assert.equal(showPack(h),false);
 assert.equal(h.elements['reveal-overlay'].hidden,true);
 h.elements['hammer-cinema'].hidden=true;h.director.bingoEnded();
 assert.equal(h.elements['reveal-overlay'].hidden,false);
 assert.equal(h.director.canStartBingo(),false);
 finishPack(h);assert.equal(h.director.canStartBingo(),true);
});

test('skip button and reduced-motion mode release cleanly without timer duplication',()=>{
 const h=harness({reduced:true});
 showPack(h);h.director.awardQueued(1);finishPack(h);
 assert.equal(h.counts.resumed,0);
 h.tick(40);assert.equal(h.counts.resumed,1);
 h.tick(6000);assert.equal(h.counts.resumed,1);
 const s=harness();showPack(s);s.director.awardQueued(1);finishPack(s);
 s.director.skipTransition();
 assert.equal(s.counts.resumed,1);
 s.tick(5000);assert.equal(s.counts.resumed,1);
});

test('the director is presentation-only; award semantics, transaction and UI cancellation preserved',()=>{
 const code=js.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(code,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\brequest\s*\(|\bFirestore\b/);
 assert.match(html,/request\('POST','open',\{packId:pack,requestId:getPurchaseId\(pack\)\}\)/);
 assert.match(html,/request\('POST','hammer\/claim'\)/);
 assert.match(html,/ChristmasShowDirector\?\.claimStarted\(\)/);
 assert.match(html,/ChristmasShowDirector\?\.claimSettled\(\)/);
 assert.match(html,/ChristmasShowDirector\?\.summaryReady\(\)/);
 assert.match(html,/ChristmasShowDirector\?\.packClosed\(\)/);
 assert.match(bingo,/ChristmasShowDirector\?\.awardQueued\(fresh\.length\)/);
 assert.match(bingo,/!director\.bingoStarted\(\)/);
 assert.match(bingo,/ChristmasShowDirector\?\.bingoEnded\(\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/revealMotionToken\+\+/);
});
