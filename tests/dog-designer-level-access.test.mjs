import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('DOG/designer-level-access.js').replace(/^export /gm,'');
function harness(){
 const callbacks={};let currentUid='user-1',currentLevel=1,online=true,reachable=true,calls=0;
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://render.example'},
  SpielOnline:{state:()=>({status:online?'online':'guest',
   user:online?{uid:currentUid,getIdToken:async()=> 'token'}:null})},
  addEventListener(name,fn){(callbacks[name]??=[]).push(fn);}
 };
 const fetch=async(url,options)=>{
  calls++;
  assert.match(url,/\/api\/hub\/dog\/level$/);
  assert.equal(options.headers.Authorization,'Bearer token');
  if(!reachable)throw Error('NETWORK_DOWN');
  return {ok:true,json:async()=>({ok:true,level:{level:currentLevel}})};
 };
 const api=new Function('window','fetch','Date',
  source+'\nreturn {guardDesignerLink,fetchDogPlayerLevel};')(window,fetch,Date);
 const attrs={};
 const text={nodeType:3,textContent:'🎨 Brettdesigner'};
 const link={dataset:{},childNodes:[text],classList:{toggle(){}},tabIndex:0,
  setAttribute(name,value){attrs[name]=value;},
  removeAttribute(name){delete attrs[name];},
  getAttribute(name){return attrs[name]||null;},
  set href(value){attrs.href=value;},
  get href(){return attrs.href;}
 };
 return {api,link,attrs,callbacks,
  level:n=>currentLevel=n,online:value=>online=value,
  reachable:value=>reachable=value,calls:()=>calls};
}
test('the DOG lobby designer is visible but locked before level two',async()=>{
 const h=harness();
 const gate=h.api.guardDesignerLink(h.link,{
  target:'DOG/design-studio.html?return=room',lockedText:'🔒 Brettdesigner · Level 2',
  unlockedText:'🎨 Brettdesigner'});
 await gate.refresh({force:true});
 assert.equal(h.link.dataset.levelLocked,'true');
 assert.equal(h.attrs.href,undefined);
 assert.equal(h.attrs['aria-disabled'],'true');
 assert.match(h.link.childNodes[0].textContent,/Level 2/);
 h.level(2);
 await gate.refresh({force:true});
 assert.equal(h.link.dataset.levelLocked,'false');
 assert.equal(h.attrs.href,'DOG/design-studio.html?return=room');
 assert.equal(h.attrs['aria-disabled'],'false');
 assert.match(h.link.childNodes[0].textContent,/Brettdesigner/);
 gate.updateTarget('DOG/design-studio.html?return=new-room');
 assert.equal(h.attrs.href,'DOG/design-studio.html?return=new-room');
 h.reachable(false);
 await gate.refresh({force:true});
 assert.equal(h.attrs.href,undefined,'network failure must fail closed');
 h.online(false);
 await gate.refresh();
 assert.equal(h.attrs.href,undefined,'guest cannot open the studio');
});
test('direct studio checks level first, only then loads editing script',()=>{
 const html=read('DOG/design-studio.html');
 const entry=read('DOG/design-studio-entry.js');
 const css=read('DOG/design-studio.css');
 const room=read('DOG/room-lobby.js');
 const hub=read('hub-lobby.html');
 assert.match(html,/data-designer-access="pending"/);
 assert.match(html,/design-studio-entry\.js\?v=1/);
 assert.doesNotMatch(html,/<script type="module" src="\.\/design-studio\.js/);
 assert.match(entry,/if\(level<DESIGNER_MIN_LEVEL\)/);
 assert.match(entry,/await import\('\.\/design-studio\.js\?v=12'\)/);
 assert.match(css,/body:not\(\[data-designer-access="allowed"\]\) \.studio-page/);
 assert.match(room,/designerGate\.updateTarget/);
 assert.match(hub,/id="dog-room-designer"[^>]*data-level-locked="true"/);
});
