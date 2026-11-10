import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const js=read('./christmas-dice.js');
const css=read('./christmas-dice.css');
function harness({loggedIn=true,response={ok:true,kniffelChristmasDice:false},uid='player1',files=true}={}){
 const calls=[],ls=new Map(),listeners=new Map(),documentListeners=new Map();
 const classes=()=>{const set=new Set();return{add:c=>set.add(c),remove:c=>set.delete(c),contains:c=>set.has(c),toggle:(c,v)=>{if(v)set.add(c);else set.delete(c)}}};
 const button={hidden:true,disabled:false,textContent:'',title:'',classList:classes(),attrs:{},handlers:{},
  setAttribute(k,v){this.attrs[k]=String(v)},addEventListener(k,fn){this.handlers[k]=fn}};
 const status={textContent:''};
 const dice=Array.from({length:6},(_,i)=>({
  dataset:{diceValue:String(i+1)},classList:classes(),images:[],
  querySelectorAll(){return this.images.filter(i=>i.className==='christmas-die-art')},
  append(img){this.images.push(img);img.parentNode=this}
 }));
 let online=loggedIn,tokenUid=uid,serverResult=response,showLogin=0,now=60000;
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://test.example'},
  SpielOnline:{
   state:()=>online?{status:'online',user:{uid:tokenUid,getIdToken:async()=>tokenUid+'-token'}}:{status:'guest',user:null},
   openLogin:()=>showLogin++
  },
  addEventListener:(name,cb)=>listeners.set(name,cb)
 };
 const document={
  hidden:false,getElementById:id=>id==='christmas-dice-toggle'?button:id==='christmas-dice-status'?status:null,
  createElement:tag=>({tagName:tag,className:'',alt:'',setAttribute(){},remove(){this.parentNode.images=this.parentNode.images.filter(x=>x!==this);this.parentNode=null}}),
  querySelectorAll:()=>dice,
  addEventListener:(name,cb)=>documentListeners.set(name,cb)
 };
 const fetch=async(url,opts)=>{
  calls.push({url,opts});
  let result=typeof serverResult==='function'?serverResult(url):serverResult;
  if(result instanceof Error)throw result;
  if(result?.status===404)return{ok:false,status:404};
  return{ok:result?.status!==503,status:result?.status||200,json:async()=>result};
 };
 const context={window,document,fetch,localStorage:{getItem:k=>ls.get(k)||null,setItem:(k,v)=>ls.set(k,v)},Date:{now:()=>now},console:{warn:()=>{}}};
 runInNewContext(js,context);
 const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await Promise.resolve()};
 return{
  window,button,status,dice,calls,ls,documentListeners,listeners,
  refresh:async(force=true)=>{await window.KniffelChristmasDice.refresh(force);await flush()},
  click:async()=>{button.handlers.click();await flush()},
  setOnline:v=>online=v,setUid:v=>tokenUid=v,setResponse:v=>serverResult=v,
  setNow:v=>now=v,loginInvoked:()=>showLogin,flush
 };
}

test('the six uploaded Christmas dice exist as real image files and both modes load the assets',()=>{
 for(let i=1;i<=6;i++)assert.ok(existsSync(new URL('./Bilder/weihnachtswuerfel-'+i+'.png',import.meta.url)));
 for(const page of ['./index.html','./online.html','./lobby.html']){
  const html=read(page);
  assert.match(html,/id="christmas-dice-toggle"/);
  assert.match(html,/id="christmas-dice-status"/);
  assert.match(html,/christmas-dice.js\?v=20261110-20bilder-fix2/);
  assert.match(html,/christmas-dice.css\?v=20261110-20bilder-fix2/);
  assert.doesNotMatch(html,/id="christmas-dice-toggle"[^>]* hidden/,'button cannot silently disappear');
 }
 assert.match(css,/christmas-die-art/);
 assert.match(css,/christmas-dice-status/);
 assert.doesNotThrow(()=>new Script(js));
});

test('a signed-out user can see the locked button, request login, and cannot fake an unlock',async()=>{
 const f=harness({loggedIn:false});
 assert.equal(f.button.hidden,false);
 assert.match(f.status.textContent,/Mit dem Profil.*anmelden/);
 await f.click();
 assert.equal(f.loginInvoked(),1);
 assert.equal(f.calls.length,0);
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),false);
});
test('20-image server receipt enables the uploaded PNG dice (1-6) automatically',async()=>{
 const f=harness({response:{ok:true,kniffelChristmasDice:true}});
 await f.refresh();
 assert.equal(f.button.hidden,false);
 assert.match(f.button.textContent,/Weihnachtswürfel AN/);
 assert.equal(f.button.attrs['aria-pressed'],'true');
 assert.equal(f.button.classList.contains('dice-unlocked'),true);
 assert.match(f.status.textContent,/20 Bildern freigeschaltet/);
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
 for(let i=0;i<6;i++){
  const img=f.dice[i].images[0];
  assert.ok(img,'die '+(i+1)+' decorated');
  assert.equal(img.src,'./Bilder/weihnachtswuerfel-'+(i+1)+'.png');
  img.onload();
  assert.equal(f.dice[i].classList.contains('christmas-die'),true);
 }
 assert.equal(f.calls.length,1,'no backend read per die');
});
test('changing the dice design off/on changes only graphics, not the player reward',async()=>{
 const f=harness({response:{ok:true,kniffelChristmasDice:true}});
 await f.refresh();
 await f.click();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),false);
 assert.equal(f.button.attrs['aria-pressed'],'false');
 assert.equal(f.ls.get('kniffel:christmas-dice:player1'),'off');
 assert.ok(f.dice.every(d=>d.images.length===0));
 await f.click();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
 assert.equal(f.ls.get('kniffel:christmas-dice:player1'),'on');
 assert.equal(f.calls.length,1,'cosmetic toggles never touch Firebase');
});
test('below 20 images remains locked but the button permits rechecking',async()=>{
 const f=harness();
 await f.refresh();
 assert.equal(f.button.hidden,false);
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),false);
 assert.match(f.status.textContent,/ab 20 abgeschlossenen Bildern/);
 f.setResponse({ok:true,kniffelChristmasDice:true});
 await f.click();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
 assert.equal(f.calls.length,2);
});
test('revisiting a tab after completing picture 20 refreshes SAME profile, not only new UIDs',async()=>{
 const f=harness();
 await f.refresh();
 assert.equal(f.calls.length,1);
 f.setResponse({ok:true,kniffelChristmasDice:true});
 f.setNow(63000);
 f.documentListeners.get('visibilitychange')();
 await f.flush();
 assert.equal(f.calls.length,2,'same signed-in profile must be rechecked on tab return');
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
});
test('on old Render without /unlocks, authenticated /me progress securely verifies 20 images',async()=>{
 const f=harness({response:url=>url.endsWith('/unlocks')?{status:404}:{ok:true,state:{completed:19,maxRewarded:20}}});
 await f.refresh();
 assert.equal(f.calls.length,2);
 assert.match(f.calls[0].url,/\/api\/christmas-ice\/unlocks$/);
 assert.match(f.calls[1].url,/\/api\/christmas-ice\/me$/);
 assert.equal(f.calls[0].opts.headers.Authorization,'Bearer player1-token');
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
});
test('a failed unlock read shows retry instead of hiding a previously earned die skin',async()=>{
 const f=harness({response:{ok:true,kniffelChristmasDice:true}});
 await f.refresh();
 f.setResponse(new Error('Render offline'));
 await f.refresh();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true,'temporary network failure must not remove prior verified skin');
 assert.equal(f.button.hidden,false);
 const other=harness({response:new Error('Render offline')});
 await other.refresh();
 assert.equal(other.button.hidden,false);
 assert.match(other.status.textContent,/konnte nicht geprüft werden/);
 assert.equal(other.window.KniffelChristmasDice.isEnabled(),false);
});
test('account change resets the old owner skin and verifies the new profile separately',async()=>{
 const f=harness({response:{ok:true,kniffelChristmasDice:true}});
 await f.refresh();
 f.setUid('player2');f.setResponse({ok:true,kniffelChristmasDice:false});
 await f.refresh();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),false);
 assert.equal(f.button.classList.contains('dice-locked'),true);
 assert.match(f.calls[1].opts.headers.Authorization,/player2-token/);
});

test('Kniffel online lobby provides a pre-game choice with six uploaded dice previews',()=>{
 const lobby=read('./lobby.html');
 assert.match(lobby,/<h2>Spiel vorbereiten<\/h2>/);
 assert.equal((lobby.match(/id="christmas-dice-toggle"/g)||[]).length,1);
 assert.equal((lobby.match(/id="christmas-dice-status"/g)||[]).length,1);
 assert.match(lobby,/christmas-dice.js\?v=20261110-20bilder-fix2/);
 assert.match(lobby,/christmas-dice.css\?v=20261110-20bilder-fix2/);
 const names=Array.from(lobby.matchAll(/src="\.\/Bilder\/weihnachtswuerfel-(\d)\.png"/g),m=>Number(m[1]));
 assert.deepEqual(names,[1,2,3,4,5,6]);
 assert.match(lobby,/Dein exklusives Design aus Weihnachtsevent 2/);
 assert.ok(lobby.indexOf('id="christmas-dice-toggle"')<lobby.indexOf('<h2>Spiel vorbereiten</h2>'),'choice should appear before match setup');
 assert.ok(lobby.indexOf('christmas-dice.js?v=20261110-20bilder-fix2')<lobby.indexOf('lobby.js?v=17'),'unlock before lobby startup');
 assert.match(css,/\.christmas-dice-lobby #christmas-dice-toggle/);
});

test('lobby and game modes share one account-scoped stored dice design, never a room-wide setting',async()=>{
 const f=harness({response:{ok:true,kniffelChristmasDice:true},uid:'chris'});
 await f.refresh();
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),true);
 await f.click();
 assert.equal(f.ls.get('kniffel:christmas-dice:chris'),'off');
 assert.equal(f.window.KniffelChristmasDice.isEnabled(),false);
 assert.equal(f.calls.length,1,'switching lobby dice skin makes no extra server request');
 assert.doesNotMatch(js,/\/api\/hub\/rooms/,'the dice skin is not written into shared room state');
});
