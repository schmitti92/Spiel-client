import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'..');
const html=readFileSync(resolve(root,'weihnachtsmuetzen.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(match=>match[1]).filter(Boolean).join('\n');

test('Christmas Hats production page contains valid inline JavaScript',()=>{
 assert.ok(script.length>1000);
 assert.doesNotThrow(()=>new Script(script,{filename:'weihnachtsmuetzen.html'}));
});

test('All referenced Christmas Hats DOM IDs exist exactly once',()=>{
 const ids=[...new Set([...script.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(m=>m[1]))];
 for(const id of ids){
  const count=[...html.matchAll(new RegExp('id="'+id+'"','g'))].length;
  assert.equal(count,1,'missing/duplicate id '+id);
 }
});

test('Cashing out, checkpoint presentation and safe retry remain interactive',()=>{
 for(const id of ['start','cash','again','continue','cash-dialog','cash-confirm','cash-cancel','refresh','retry','hats','tiers','lobby','back']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(script,/pendingId=/);
 assert.match(script,/pendingAction\?\.applied/);
 assert.match(script,/dialog\.showModal\(\)/);
 assert.match(script,/function finishReveal\(\)/);
 assert.match(script,/if\(busy\|\|reveal\|\|pendingRequest\)return;/);
 assert.match(script,/SpielOnline\?\.state/);
});

test('Random prize and money decisions are never client-controlled',()=>{
 assert.match(script,/\/api\/christmas-hats\/action/);
 assert.match(script,/data\.result/);
 assert.doesNotMatch(script,/const\s+bombIndex\s*=/);
 assert.doesNotMatch(script,/localStorage\.setItem\(.+balance/);
});


test('V7 stage presents 20 rooms, fast reveals and accessible optional cinematic controls',()=>{
 const css=readFileSync(resolve(root,'css/christmas-hats-show-v3.css'),'utf8');
 assert.match(html,/christmas-hats-show-v3\.css/);
 for(const id of ['choice-dialog','choice-next','choice-cash','choice-secured','choice-risked',
   'announcer-text','story-speech','cinema-subtitle','cash-description']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(css,/\.hats\.stage-suspense/);
 assert.match(css,/\.choice-dialog::backdrop/);
 assert.match(css,/\.trophy-groups/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(script,/function showChoice\(\)/);
 assert.match(script,/function renderFinalShow\(/);
 assert.match(script,/function clearShowTimers\(\)/);
 assert.match(script,/revealPhase='suspense'/);
 assert.match(script,/revealPhase='shown'/);
 assert.match(script,/revealTimer=setTimeout\(finishReveal,fastMode\?1050:reduced\?3000:event\.superLuck\?12800:/);
 assert.match(script,/if\(!fastMode\)cinemaTimer=setTimeout/);
 assert.match(script,/if\(outcome\?\.type!=='bomb'&&!fastMode\)showChoice\(\)/);
 assert.match(script,/const demoBombOdds=\[10,12,0,14,16,0,18,20,0,22,24,0,26,28,0,30,31,0,32,33\]/);
 assert.match(html,/id="bomb-chance"/);
 assert.match(html,/id="mode"/);
 assert.match(html,/🎩 Raum 1 von 20/);
 assert.match(script,/const limit=s\?\.maxRoom\|\|20/);
 assert.match(script,/showChoice\(\)/);
 assert.match(script,/function finishReveal\(\)/);
 assert.match(script,/closeChoice\(\)/);
});

test('V3 keeps real payouts separate from local Chris test games',()=>{
 assert.match(script,/if\(DEMO\)\s*\{\s*if\(!isChrisDemo\(\)\)/);
 assert.match(script,/return demoRequest\(path,method,payload\)/);
 assert.match(script,/DEMO\?'Testmodus: Deine Gewinne/);
 assert.doesNotMatch(script,/fetch\(['"]\/api\/christmas-hats\/action['"]\)/);
});

test('Phase 1 quick entry is immediately visible above the progression map when a verified voucher exists',()=>{
 const css=readFileSync(resolve(root,'css/christmas-hats-quick20-v7.css'),'utf8');
 const hero=html.indexOf('class="hero"'),entry=html.indexOf('id="quick-entry"'),tiers=html.indexOf('id="tiers"');
 assert.ok(hero>=0&&entry>hero&&tiers>entry,'start action appears before the 20-stage map');
 for(const id of ['quick-entry','quick-start','quick-entry-title','quick-entry-detail','quick-entry-vouchers']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,'unique quick-start control '+id);
 }
 assert.match(css,/\.hats-quick-entry\[hidden\]/);
 assert.match(css,/#quick-start:disabled/);
 assert.match(html,/christmas-hats-quick20-v7\.css\?v=20261110-phase1-onetap-v2/);
 assert.match(script,/const entryAvailable=!s\|\|finished/);
 assert.match(script,/\$\('quick-entry'\)\.hidden=!entryAvailable\|\|!!reveal/);
 assert.match(script,/\$\('quick-start'\)\.disabled=busy\|\|!!pendingRequest\|\|!hasVouchers\|\|!!reveal/);
 assert.match(script,/\$\('quick-start'\)\.textContent=finished\?'↻ Nochmal spielen':'▶ Jackpot starten'/);
 assert.match(script,/\$\('quick-start'\)\.onclick=\(\)=>action\('start'\)/);
 assert.match(script,/\$\('start'\)\.hidden=true/);
 assert.match(script,/\$\('again'\)\.hidden=true/);
});

test('Phase 1 advances from verified start into playable hats and preserves protections',()=>{
 assert.ok(script.includes("if(loaded&&autoStartRequested&&!pendingRequest&&authUser()?.uid===user.uid)"));
 assert.ok(script.includes("if(state?.status==='playing')goToHats()"));
 assert.ok(script.includes("else if((!state||state.status==='finished')&&(DEMO||Number(vouchers?.total||0)>0))void action('start')"));
 assert.match(script,/if\(payload\.type==='start'&&state\?\.status==='playing'&&!pendingRequest&&uid\(\)===requestUser\)/);
 assert.ok(script.includes(" $('hats-stage')?.scrollIntoView?.({behavior:reduced?'instant':'smooth',block:'start'});"));
 assert.ok(script.includes("if(payload.type==='start'&&state?.status==='playing'&&!pendingRequest&&uid()===requestUser)"));
 assert.ok(script.includes("let loaded=false;"),'avoid autostart if status request failed');
 assert.ok(script.includes("if(type==='start'&&!DEMO&&!(vouchers?.total>0)&&state?.status!=='playing')return;"));
 assert.ok(script.includes("if(busy||reveal||pendingRequest)return;"));
 assert.ok(script.includes("if(!fastMode)cinemaTimer=setTimeout("));
 assert.ok(script.includes("if(outcome?.type!=='bomb'&&!fastMode)showChoice()"));
 assert.ok(script.includes("for(const id of ['hats-collection','hats-voucher-back','quick-entry-vouchers'])"));
});

test('Phase 2 Nordpol hero has a real SVG illustration, compact hierarchy and the quick start below it',()=>{
 const css=readFileSync(resolve(root,'css/christmas-hats-northpole-hero-v8.css'),'utf8');
 const scene=readFileSync(resolve(root,'assets/hats/northpole-hero-v8.svg'),'utf8');
 const heroStart=html.indexOf('<header class="hero">'),heroEnd=html.indexOf('</header>',heroStart);
 const start=html.indexOf('id="quick-entry"');
 assert.ok(heroStart>0&&heroEnd>heroStart&&start>heroEnd,'no extra screen between panorama and one-tap start');
 assert.match(html,/christmas-hats-northpole-hero-v8\.css\?v=20261110-nordpol-phase2-v2/);
 assert.match(html,/class="northpole-hero-inner"/);
 assert.match(html,/class="hero-landmark hero-landmark--workshop"/);
 assert.match(html,/class="hero-landmark hero-landmark--palace"/);
 assert.match(html,/class="northpole-highlights"/);
 for(const label of ['20 Räume','6 sichere Bonusräume','3 Sicherungen']){
  assert.ok(html.slice(heroStart,heroEnd).includes(label),'compact rule badge '+label);
 }
 assert.match(css,/url\("\.\.\/assets\/hats\/northpole-hero-v8\.svg"\)/);
 assert.match(css,/background-image:/);
 assert.match(css,/\.hero h1/);
 assert.match(css,/@media\(max-width:730px\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(scene,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(scene,/<title id="heroTitle">/);
 assert.match(scene,/<desc id="heroDesc">/);
 assert.match(scene,/id="aurora"/);
 assert.match(scene,/id="ice"/);
 assert.match(scene,/id="roof"/);
 assert.doesNotMatch(scene,/<script|<foreignObject|onload=|<image\b|http[s]?:\/\/(?!www\.w3\.org)/i);
});

test('Phase 3 winter map renders twenty connected rooms with correct special cells',()=>{
 const css=readFileSync(resolve(root,'css/christmas-hats-winter-path-v9.css'),'utf8');
 assert.match(html,/christmas-hats-winter-path-v9\.css\?v=20261110-phase3-wintertrail-v1/);
 assert.match(html,/class="journey-map"/);
 for(const id of ['journey-progress','journey-progress-fill','journey-progress-caption','journey-legend']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
 }
 assert.match(css,/\.journey-map \.tier\.bonus-cell:not\(\.on\)/);
 assert.match(css,/\.journey-map \.tier\.checkpoint-cell:not\(\.on\)/);
 assert.match(css,/\.journey-map \.tier\.finale-cell/);
 assert.match(css,/\.journey-map \.tier\.bonus-cell\.checkpoint-cell:not\(\.on\)/);
 assert.match(css,/\.journey-map \.tier:not\(:nth-child\(10n\)\)::after/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(script,/\$\('journey-progress-fill'\)\.style\.width=\(completedRooms\/limit\*100\)\+'%'/);
 assert.match(script,/\$\('journey-progress'\)\.setAttribute\('aria-valuenow',String\(completedRooms\)\)/);
 assert.match(script,/\$\('journey-legend'\)\.hidden=!!s&&s\.rulesVersion!==5/);
 const fn=script.match(/function renderTiers\(active,checkpoint,cleared\)\{[\s\S]*?\n\}\n(?=function hatButton)/)?.[0];
 assert.ok(fn,'individual tile renderer is available');
 const root={children:[],replaceChildren(){this.children=[];},appendChild(el){this.children.push(el);}};
 const document={createElement(name){return {tag:name,className:'',dataset:{},attributes:{},children:[],
  setAttribute(key,value){this.attributes[key]=value;},
  append(...els){this.children.push(...els);}};}};
 const state={maxRoom:20,checkpoints:[5,10,15,20],rulesVersion:5};
 const ctx={state,document,$:id=>{assert.equal(id,'tiers');return root;}};
 assert.doesNotThrow(()=>new Script(fn+'renderTiers(15,10,14);').runInNewContext(ctx));
 const tiles=root.children;
 assert.equal(tiles.length,20);
 assert.deepEqual(tiles.filter(x=>x.className.includes('bonus-cell')).map(x=>Number(x.dataset.room)),[3,6,9,12,15,18]);
 assert.deepEqual(tiles.filter(x=>x.className.includes('checkpoint-cell')).map(x=>Number(x.dataset.room)),[5,10,15]);
 const fifteen=tiles[14];
 assert.equal(fifteen.dataset.kind,'bonus-checkpoint');
 assert.equal(fifteen.children[0].textContent,'🛡️');
 assert.equal(fifteen.children[2].textContent,'🎁');
 assert.equal(fifteen.attributes['aria-current'],'step');
 const finale=tiles[19];
 assert.equal(finale.dataset.kind,'finale');
 assert.match(finale.className,/finale-cell/);
 assert.doesNotMatch(finale.className,/checkpoint-cell/);
 assert.equal(finale.children[0].textContent,'👑');
 assert.match(finale.attributes['aria-label'],/Nordpol-Finale/);
 assert.match(tiles[2].attributes['aria-label'],/alle drei Mützen bombenfrei/);
 assert.match(tiles[9].attributes['aria-label'],/Gewinne bis hier gesichert/);
});
