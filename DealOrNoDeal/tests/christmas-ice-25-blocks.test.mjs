import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('Weihnachtsevent2/online-ice.js');
const html=read('Weihnachtsevent2/index.html');

test('browser supports 25 and 30-tile grids with 5x5 and 6x5 layouts',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(html,/ice-tiles\.ice-tiles-25\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\);grid-template-rows:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(html,/online-ice\.js\?v=20261109-30-tiles-v1/);
 assert.match(js,/ice-tiles-25/);
 assert.match(html,/ice-tiles\.ice-tiles-30\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\);grid-template-rows:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(js,/ice-tiles-30/);
 assert.match(js,/Array\.from\(\{length:tileCount\}/);
 assert.doesNotMatch(js,/Array\.from\(\{length:20\}/);
});

test('client uses server-authoritative tile count and old states fall back to milestone',()=>{
 const start=js.indexOf(' const finished=!!state.finished,done=state.completed>=70');
 const end=js.indexOf(' const photo=n=>',start);
 assert.ok(start>0&&end>start);
 const code=js.slice(start,end)+'\n({tileCount,openedTiles,fullClearPhase,number})';
 const stage=state=>runInNewContext(code,{state});
 let x=stage({completed:9,maxRewarded:9,finished:false,opened:[0,1],tilesRequired:20});
 assert.deepEqual(JSON.parse(JSON.stringify(x)),{tileCount:20,openedTiles:2,fullClearPhase:false,number:10});
 x=stage({completed:10,maxRewarded:10,finished:false,opened:[0,3,24],tilesRequired:25});
 assert.deepEqual(JSON.parse(JSON.stringify(x)),{tileCount:25,openedTiles:3,fullClearPhase:true,number:11});
 x=stage({completed:10,maxRewarded:10,finished:false,opened:[]});
 assert.equal(x.tileCount,25,'old cached response must not keep 20 slots forever');
 x=stage({completed:10,finished:true,opened:Array.from({length:20},(_,i)=>i),tileCount:20});
 assert.equal(x.tileCount,20,'tenth-picture finished state still shows original board');
 x=stage({completed:12,maxRewarded:12,finished:false,opened:Array.from({length:25},(_,i)=>i),tilesRequired:25});
 assert.equal(x.openedTiles,25);
 x=stage({completed:20,maxRewarded:20,finished:true,opened:[0,24],tilesRequired:25});
 assert.equal(x.tileCount,25,'completed picture 20 remains on its old grid');
 x=stage({completed:20,maxRewarded:20,finished:false,opened:[0,27],tilesRequired:30});
 assert.deepEqual(JSON.parse(JSON.stringify(x)),{tileCount:30,openedTiles:2,fullClearPhase:true,number:21});
 x=stage({completed:20,maxRewarded:20,finished:false,opened:[0,27],tileCount:25});
 assert.equal(x.tileCount,30,'old picture 21 cache must upgrade to 30');
 x=stage({completed:21,maxRewarded:21,finished:false,opened:[0,29],tilesRequired:30});
 assert.equal(x.openedTiles,2);
 x=stage({completed:0,maxRewarded:20,finished:false,opened:[],tileCount:30});
 assert.equal(x.tileCount,30,'reset preserves unlocked difficulty');
});

test('UI shows progress and dynamically uses 25 or 30 ice blocks',()=>{
 assert.ok(js.includes("openedTiles+' von '+tileCount+' Eisfeldern geöffnet"));
 assert.match(js,/openedTiles\/tileCount\*100/);
 assert.match(js,/Zerstöre alle '\+tileCount\+' Eisblöcke/);
 assert.match(js,/Wähle einen Hammer und finde den versteckten Stern/);
 assert.match(js,/25 Eisfelder: Finde den versteckten Stern! Er öffnet das ganze Bild sofort/);
 assert.match(js,/state\.opened\.includes\(i\)/);
 assert.match(js,/aria-label="Eisfeld '\+\(i\+1\)\+' von '\+tileCount/);
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

test('stars reveal pictures through 16; full clearing starts from image 17',()=>{
 assert.match(js,/number>=17\?'🧊 Kein Stern mehr:/);
 assert.match(js,/celebration\.number>=17\?'Alle Eisblöcke entfernt!'/);
 assert.match(js,/celebration\.number>=17\?'🧊':'🌟'/);
 assert.match(js,/Number\(state\.completed\)>=17\?'🧊 Alle Eisblöcke entfernt!/);
 assert.match(html,/online-ice\.js\?v=20261109-30-tiles-v1/);
});

test('every server-confirmed completed picture uses full-screen reveal before reward',()=>{
 const css=read('Weihnachtsevent2/image-reveal-grand.css');
 assert.match(html,/image-reveal-grand\.css\?v=20261109-grand-reveal-v1/);
 assert.match(html,/online-ice\.js\?v=20261109-30-tiles-v1/);
 assert.match(js,/celebration\?\.stage==='image'&&!celebrationDelayTimer&&state\.finished&&Number\(state\.completed\)>=celebration\.number/);
 assert.match(js,/photo\(celebration\.number\)/);
 assert.match(js,/id="v44-big-reveal-continue"/);
 assert.match(js,/celebration\.stage='gift';render\(\)/);
 assert.match(js,/celebration=\{number:Number\(state\.completed\|\|oldCompleted\+1\),title,detail,kind:gift\?\.kind\|\|'other',hammer:gift\?\.hammer\|\|null,amount:gift\?\.amount\|\|0,stage:'image'\}/);
 assert.match(js,/if\(type==='strike'&&state\.finished&&!wasFinished\)/);
 assert.match(js,/celebrationDelayTimer=setTimeout\(\(\)=>\{celebrationDelayTimer=null;render\(\)\},950\)/);
 assert.match(js,/if\(!celebration\|\|celebration\.stage!=='image'\|\|!state\?\.finished\|\|state\.completed<celebration\.number\)return/);
 assert.match(js,/if\(n===number\)\{message\(number>=17\?'🧊 Ab Bild 17 wird das Bild erst enthüllt, wenn alle '\+tileCount\+' Eisfelder entfernt wurden\./);
 for(const c of ['v44-big-reveal-frame','v44-big-reveal-snow','v44-big-reveal-card'])assert.ok(css.includes(c));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/fetch\(|Firebase|api\/christmas-ice/i);
});
