import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('Weihnachtsevent2/online-ice.js');
const html=read('Weihnachtsevent2/index.html');

test('50, 100 and 150 ice fields use correct grids and cache-busted client',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(html,/ice-tiles\.ice-tiles-50\{grid-template-columns:repeat\(10,minmax\(0,1fr\)\);grid-template-rows:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(html,/ice-tiles\.ice-tiles-100\{grid-template-columns:repeat\(10,minmax\(0,1fr\)\);grid-template-rows:repeat\(10,minmax\(0,1fr\)\)/);
 assert.match(html,/ice-tiles\.ice-tiles-150\{grid-template-columns:repeat\(15,minmax\(0,1fr\)\);grid-template-rows:repeat\(10,minmax\(0,1fr\)\)/);
 assert.match(js,/ice-tiles-50/);assert.match(js,/ice-tiles-100/);assert.match(js,/ice-tiles-150/);
 assert.match(js,/Array\.from\(\{length:tileCount\}/);
 assert.match(html,/online-ice\.js\?v=20261110-picture40-150-tiles-v1/);
});

test('pictures 1–29 use 50, 30–39 use 100, 40–70 use 150 including old saves',()=>{
 const start=js.indexOf(' const finished=!!state.finished,done=state.completed>=70');
 const end=js.indexOf(' const photo=n=>',start);
 assert.ok(start>0&&end>start);
 const code=js.slice(start,end)+'\n({tileCount,openedTiles,number})';
 const stage=state=>runInNewContext(code,{state});
 for(const [completed,finished,tileCount] of [[0,false,50],[22,false,50],[28,false,50],[29,true,50],[29,false,100],[30,false,100],[38,false,100],[39,true,100],[39,false,150],[40,false,150],[70,true,150]]){
  const state={completed,maxRewarded:completed,finished,opened:[0,1],tileCount:30,tilesRequired:30};
  const actual=stage(state);
  assert.equal(actual.tileCount,tileCount,'completed '+completed+', finished '+finished);
  assert.equal(actual.openedTiles,2);
 }
 assert.equal(stage({completed:0,maxRewarded:40,finished:false,opened:[],tileCount:100}).tileCount,50,'reset to first picture');
 assert.equal(stage({completed:39,maxRewarded:39,finished:false,opened:[0,1],tileCount:100,tilesRequired:100}).tileCount,150,'old picture-40 save gets expanded');
});

test('UI shows dynamic ice progress and the star on every image',()=>{
 assert.ok(js.includes("openedTiles+' von '+tileCount+' Eisfeldern geöffnet"));
 assert.match(js,/openedTiles\/tileCount\*100/);
 assert.match(js,/\+tileCount\+' Eisfelder: Finde den versteckten Stern! Er öffnet das ganze Bild sofort/);
 assert.match(js,/state\.opened\.includes\(i\)/);
 assert.match(js,/aria-label="Eisfeld '\+\(i\+1\)\+' von '\+tileCount/);
 assert.doesNotMatch(js,/Kein Stern mehr|Ab Bild 23/);
});

test('cinematic hammer shatters follow server-confirmed targets only',()=>{
 const fx=read('Weihnachtsevent2/hammer-ice-spectacle.js');
 const css=read('Weihnachtsevent2/hammer-ice-spectacle.css');
 assert.doesNotThrow(()=>new Script(fx));
 assert.match(html,/hammer-ice-spectacle\.css\?v=20261109-hammer-show-v1/);
 assert.match(html,/hammer-ice-spectacle\.js\?v=20261109-hammer-show-v1/);
 assert.ok(html.indexOf('hammer-ice-spectacle.js')<html.indexOf('online-ice.js'));
 for(const kind of ['single','double','lucky'])assert.ok(fx.includes(kind+':'));
 assert.match(js,/const targets=Array\.isArray\(data\.result\?\.targets\)/);
 assert.match(js,/!data\.result\?\.replayed/);
 assert.match(js,/nowOpened\.has\(i\)&&!beforeOpened\.has\(i\)/);
 assert.match(js,/window\.ChristmasIceHammerFX\?\.confirmed/);
 assert.match(js,/celebration&&celebration\.stage!=='image'&&!celebrationDelayTimer/);
 assert.match(js,/celebrationDelayTimer=setTimeout/);
 assert.match(js,/number=Math\.min\(70,state\.completed\+\(finished\?0:1\)\)/);
 assert.doesNotMatch(fx,/\b(?:fetch|XMLHttpRequest|WebSocket|firebase|request)\s*\(/i);
 assert.doesNotMatch(fx,/localStorage|sessionStorage|balance\s*=/i);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/icefx-shatter/);
 assert.match(css,/icefx-lucky/);
});

test('hidden star is present for every picture including 23–70',()=>{
 assert.doesNotMatch(js,/number>=23|celebration\.number>=23|Number\(state\.completed\)>=23/);
 assert.match(js,/Weihnachtsstern gefunden!/);
 assert.match(js,/🌟 Bild freigelegt!/);
 assert.match(js,/nach dem Sternfund vollständig enthüllt/);
});

test('every server-confirmed completed picture uses full-screen reveal before reward',()=>{
 const css=read('Weihnachtsevent2/image-reveal-grand.css');
 assert.match(html,/image-reveal-grand\.css\?v=20261109-grand-reveal-v1/);
 assert.match(html,/online-ice\.js\?v=20261110-picture40-150-tiles-v1/);
 assert.match(js,/celebration\?\.stage==='image'&&!celebrationDelayTimer&&state\.finished&&Number\(state\.completed\)>=celebration\.number/);
 assert.match(js,/photo\(celebration\.number\)/);
 assert.match(js,/id="v44-big-reveal-continue"/);
 assert.match(js,/celebration\.stage='gift';render\(\)/);
 assert.match(js,/celebration=\{number:Number\(state\.completed\|\|oldCompleted\+1\),title,detail,kind:gift\?\.kind\|\|'other',hammer:gift\?\.hammer\|\|null,amount:gift\?\.amount\|\|0,hatsVoucher:gift\?\.hatsVoucher===1,stage:'image'\}/);
 assert.match(js,/if\(type==='strike'&&state\.finished&&!wasFinished\)/);
 assert.match(js,/celebrationDelayTimer=setTimeout\(\(\)=>\{celebrationDelayTimer=null;render\(\)\},950\)/);
 assert.match(js,/if\(!celebration\|\|celebration\.stage!=='image'\|\|!state\?\.finished\|\|state\.completed<celebration\.number\)return/);
 assert.match(js,/nach dem Sternfund vollständig enthüllt/);
 for(const c of ['v44-big-reveal-frame','v44-big-reveal-snow','v44-big-reveal-card'])assert.ok(css.includes(c));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/fetch\(|Firebase|api\/christmas-ice/i);
});

test('switching hammers changes local selection only and preserves the existing ice board',()=>{
 const start=js.indexOf(' // Hammer selection is presentation-only');
 const end=js.indexOf(" root.querySelectorAll('[data-tile]')",start);
 assert.ok(start>0&&end>start,'local hammer selection handler is present');
 const handler=js.slice(start,end);
 assert.match(handler,/window\.iceHammer=b\.dataset\.hammer/);
 assert.match(handler,/choice\.classList\.toggle\('selected',selected\)/);
 assert.match(handler,/choice\.setAttribute\('aria-pressed',String\(selected\)\)/);
 assert.doesNotMatch(handler,/\brender\(/,'hammer-only selection must never rebuild the board');
 assert.doesNotMatch(handler,/\b(?:fetch|request)\(/,'hammer-only selection must not perform server reads/writes');
});

test('picture-bound action replay preserves the original expected picture through retry',()=>{
 assert.match(js,/const expectedPicture=type==='strike'/);
 assert.match(js,/unresolved\?unresolved\.expectedPicture:Number\(state\?\.completed\|\|0\)\+1/);
 assert.match(js,/rememberPending\(\{uid:user\(\)\?\.uid,key:pending\.key,requestId,extra,type,/);
 assert.match(js,/\.\.\.\(expectedPicture!==undefined\?\{expectedPicture\}:\{\}\)/);
 assert.match(js,/item\.expectedPicture===undefined/);
 assert.match(js,/expectedPicture>=1&&item\.expectedPicture<=70/);
});
