/**
 * DOG Lichtertal scratch tickets. No write occurs while a field is scratched.
 * The signed-in Render service creates a card with immutable win combinations.
 */
export const SCRATCH_TICKET_TYPES=Object.freeze([
 {id:'simple',icon:'🟤',label:'Einfach',price:200,coinMax:100,unlockChance:'11,1',rewards:'47 klassische Emojis · 16 Blockfarben',odds:'20 % Nieten · 68,9 % Münzen · 11,1 % Freischaltungen'},
 {id:'medium',icon:'🔵',label:'Mittel',price:500,coinMax:800,unlockChance:'3',rewards:'5 Profilbilder · 4 Weihnachts-Emojis · Rahmen · Aktivsymbol · Spielbrett',odds:'20 % Nieten · 77 % Münzen · 3 % Freischaltungen'},
 {id:'premium',icon:'🟡',label:'Premium',price:1000,coinMax:2000,unlockChance:'4',rewards:'10 Profilbilder · 4 Weihnachts-Emojis · 2 Rahmen · 2 Aktivsymbole · 2 Hintergründe · Spielbrett',odds:'20 % Nieten · 76 % Münzen · 4 % Freischaltungen'}
]);
const VARIANTS={
 gifts:['🎁 Geschenkelinie','Drei gleiche Symbole in einer Reihe, Spalte oder Diagonale',3,3],
 snow:['❄️ Schneeflocken-Bingo','Vier gleiche Symbole in einer Reihe, Spalte oder Diagonale',4,4],
 stars:['⭐ Sternensammler','Vier gleiche Sterne beliebig auf dem Los',3,4],
 elf:['🧝 Wichtelpfad','Ein zusammenhängender Symbolweg von links nach rechts',4,5],
 reindeer:['🦌 Rentierglück','Drei gleiche Rentiere beliebig auf dem Los',3,4],
 candy:['🍬 Zuckerstangen-Duell','Jedes identische Paar in einer Zweierreihe gewinnt',3,2],
 tree:['🎄 Weihnachtsbaum-Los','Stern, Baum und Geschenk in genau dieser Reihenfolge: ⭐ 🎄 🎁',5,3],
 cookie:['🍪 Lebkuchen-Memory','Ein 2×2-Feld mit zwei passenden Symbolpaaren',4,4],
 diamond:['💎 Diamantenjagd','Drei Diamanten beliebig auf dem Los',3,3],
 bells:['🔔 Glocken-Jackpot','Fünf gleiche Symbole waagerecht oder Glocken-Diamant',4,5]
};
const el=(tag,cls,str)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(str!==undefined)n.textContent=String(str);
 return n;
};
const num=v=>Number(v||0).toLocaleString('de-DE');
const prizeLabel=p=>p?.type==='coins'?'🪙 '+num(p.amount)+' Münzen'+(p.x2?' (×2)':''):
 p?.type==='unlock'?(p.prize?.icon||'🎁')+' '+(p.prize?.name||'Freischaltung'):'';
export function initChristmasScratch(){
 const $=id=>document.getElementById(id);
 const root=$('scratch-tier-grid'),wallet=$('scratch-wallet'),stage=$('scratch-stage'),
  board=$('scratch-board'),results=$('scratch-result-panel'),reveal=$('scratch-reveal');
 if(!root||!wallet||!stage||!board||!results||!reveal)throw Error('SCRATCH_UI_NOT_FOUND');
 let status=null,ticket=null,busy=false,pending=null,requestId=0,finished=false,covered=0;
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const account=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.getIdToken?s.user:null;
 };
 const notice=s=>{$('scratch-status').textContent=s};
 const acknowledged=()=>{
  try{return localStorage.getItem('dog-scratch-seen:'+account()?.uid)}catch{return null}
 };
 const acknowledge=commandId=>{
  try{localStorage.setItem('dog-scratch-seen:'+account()?.uid,commandId)}catch{}
 };
 async function query(path,payload){
  const u=account();if(!u)throw Error('LOGIN_REQUIRED');
  const token=await u.getIdToken();
  const r=await fetch(base+'/api/hub/scratch'+path,{
   method:payload?'POST':'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok!==true)throw Error(data.error||'SERVER_UNAVAILABLE');
  return data;
 }
 function drawShop(){
  root.replaceChildren();
  wallet.textContent=status?num(status.coins)+' 🪙':'– 🪙';
  $('scratch-daily-info').textContent=status?.dailyFreeAvailable?
   '🎁 Heute ein einfaches Gratis-Los verfügbar':'Gratis-Los heute bereits benutzt';
  for(const c of SCRATCH_TICKET_TYPES){
   const article=el('article','scratch-tier '+c.id);
   article.append(el('span','scratch-icon',c.icon),
    el('h3','',c.label+'-Rubbellos'),
    el('strong','scratch-price',num(c.price)+' 🪙'),
    el('div','scratch-chance',c.unlockChance+' % Freischaltung · 1–'+num(c.coinMax)+' Münzen'),
    el('div','scratch-reward-list',c.rewards),
    el('small','scratch-info',c.odds+' · 11 % ×2'));
   const buyBtn=el('button','scratch-buy','🎟️ Für '+num(c.price)+' Münzen kaufen');
   buyBtn.type='button';buyBtn.disabled=busy||!!ticket||!account()||!status||status.coins<c.price;
   buyBtn.addEventListener('click',()=>void buy(c.id,false));article.append(buyBtn);
   if(c.id==='simple'){
    const free=el('button','scratch-free','🎁 Tägliches Gratis-Los');
    free.type='button';free.disabled=busy||!!ticket||!status?.dailyFreeAvailable||!account();
    free.addEventListener('click',()=>void buy(c.id,true));article.append(free);
   }
   root.append(article);
  }
 }
 function coat(canvas){
  const ctx=canvas.getContext('2d');canvas.width=96;canvas.height=96;
  ctx.globalCompositeOperation='source-over';
  const gradient=ctx.createLinearGradient(0,0,96,96);
  gradient.addColorStop(0,'#8196a3');gradient.addColorStop(.45,'#edf1f0');gradient.addColorStop(1,'#899daa');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  ctx.strokeStyle='#b9cbd0';ctx.lineWidth=1;
  for(let d=-96;d<192;d+=12){ctx.beginPath();ctx.moveTo(d,0);ctx.lineTo(d+96,96);ctx.stroke()}
  ctx.fillStyle='#365263';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('❄ RUBBEL',48,53);
  ctx.globalCompositeOperation='destination-out';
  return ctx;
 }
 // Actual alpha coverage of the silver coating, not stroke distance or tap count.
 // Each ticket opens automatically when 90% of ALL field coatings are erased.
 const erasedByCanvas=new Map();
 const SAMPLES_PER_FIELD=48*48;
 function erasedSamples(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,96,96).data;
  let count=0;
  for(let y=0;y<96;y+=2)for(let x=0;x<96;x+=2){
   if(data[(y*96+x)*4+3]<=40)count++;
  }
  return count;
 }
 function updateScratchProgress(){
  const total=erasedByCanvas.size*SAMPLES_PER_FIELD;
  const done=[...erasedByCanvas.values()].reduce((sum,n)=>sum+n,0);
  const ratio=total?done/total:0;
  const percent=Math.min(100,Math.floor(ratio*100));
  $('scratch-progress').textContent=percent+' % freigerubbelt · ab 90 % automatische Aufdeckung';
  const meter=$('scratch-progress-meter');
  if(meter){meter.value=percent;meter.setAttribute('aria-valuenow',String(percent))}
  if(ratio>=.90&&!finished)finish();
 }
 function uncover(cell,canvas){
  if(cell.classList.contains('uncovered')||finished)return;
  cell.classList.add('uncovered');canvas.hidden=true;covered++;
  erasedByCanvas.set(canvas,SAMPLES_PER_FIELD);
  updateScratchProgress();
 }
 function measureCell(cell,canvas){
  if(finished||cell.classList.contains('uncovered'))return;
  const count=erasedSamples(canvas);
  erasedByCanvas.set(canvas,count);
  if(count/SAMPLES_PER_FIELD>=.90)uncover(cell,canvas);
  else updateScratchProgress();
 }
 function makeField(symbol){
  const cell=el('div','scratch-field'),face=el('span','scratch-cell-symbol',symbol);
  const canvas=el('canvas','scratch-field-cover');
  canvas.setAttribute('aria-label','Silberbeschichtung mit dem Finger wegrubbeln');
  canvas.setAttribute('role','button');
  canvas.setAttribute('tabindex','0');
  canvas.setAttribute('title','Wische mit dem Finger oder der Maus über die silberne Fläche. Mit Enter ist das Feld auch per Tastatur zugänglich.');
  face.setAttribute('aria-hidden','true');cell.append(face,canvas);
  const ctx=coat(canvas);erasedByCanvas.set(canvas,0);
  let drawing=false,last=null,frames=0;
  const point=e=>{
   const r=canvas.getBoundingClientRect();
   return {x:(e.clientX-r.left)*96/r.width,y:(e.clientY-r.top)*96/r.height};
  };
  const move=e=>{
   if(!drawing||finished||cell.classList.contains('uncovered'))return;
   e.preventDefault();
   const p=point(e);ctx.lineWidth=25;ctx.lineCap='round';ctx.lineJoin='round';
   if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
   else{ctx.beginPath();ctx.arc(p.x,p.y,12.5,0,Math.PI*2);ctx.fill()}
   last=p;
   if(++frames%3===0)measureCell(cell,canvas);
  };
  canvas.addEventListener('pointerdown',e=>{
   if(finished||cell.classList.contains('uncovered'))return;
   drawing=true;last=null;frames=0;canvas.setPointerCapture?.(e.pointerId);
   move(e);
  });
  canvas.addEventListener('pointermove',move);
  const end=()=>{if(!drawing)return;drawing=false;last=null;measureCell(cell,canvas)};
  canvas.addEventListener('pointerup',end);
  canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();uncover(cell,canvas)}
  });
  return cell;
 }
 function showTicket(result){
  ticket=result;finished=false;covered=0;erasedByCanvas.clear();
  stage.hidden=false;reveal.classList.remove('revealed');results.hidden=true;
  $('scratch-ticket-finish').hidden=true;$('scratch-reveal-button').hidden=true;
  const conf=VARIANTS[result.board?.variantId],cells=result.board?.cells;
  stage.dataset.variant=result.board?.variantId||'legacy';
  stage.dataset.tier=result.tier||'simple';
  $('scratch-ticket-title').textContent=conf?
   conf[0]+' · '+(SCRATCH_TICKET_TYPES.find(t=>t.id===result.tier)?.label||'')+'-Rubbellos':
   '🎟️ Älteres Rubbellos';
  $('scratch-variant-rule').textContent=conf?conf[0]+' · Gewinnregel: '+conf[1]:
   'Älteres Los – dieses Ergebnis wurde vor dem neuen Spielfeldsystem gespeichert';
  board.replaceChildren();board.removeAttribute('style');
  if(conf&&Array.isArray(cells)&&cells.length===conf[2]*conf[3]){
   board.style.setProperty('--scratch-cols',conf[3]);
   for(const symbol of cells)board.append(makeField(symbol));
   updateScratchProgress();
  }else{
   // Never construct an invented matching combination for a legacy receipt.
   board.textContent='Älteres Rubbellos ohne gespeichertes Symbolfeld';
   $('scratch-progress').textContent='Älteres Los – keine Rubbeltextur gespeichert';
   $('scratch-reveal-button').hidden=false;
  }
  drawShop();
  try{stage.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}
 }
 function finish(){
  if(!ticket||finished)return;
  finished=true;
  for(const cell of board.children){
   cell.classList.add('uncovered');
   const cover=cell.querySelector('canvas');if(cover)cover.hidden=true;
  }
  const wins=ticket.board?.wins||[];
  for(const w of wins)for(const i of w.indices||[])board.children[i]?.classList.add('scratch-winning-cell');
  reveal.classList.add('revealed');
  $('scratch-progress').textContent='100 % aufgedeckt ✓';
  const meter=$('scratch-progress-meter');if(meter){meter.value=100;meter.setAttribute('aria-valuenow','100')}
  const entries=Array.isArray(ticket.winnings)?ticket.winnings:
   ticket.type==='none'?[]:[ticket.type==='coins'?{type:'coins',amount:ticket.amount}:{type:'unlock',prize:ticket.prize}];
  $('scratch-result-value').textContent=entries.length?
   entries.map(prizeLabel).join(' · '):'❌ Niete – keine gültige Gewinnkombination';
  $('scratch-result-kind').textContent=ticket.rareMainMultiplier?'💎 Ultra-selten: Hauptgewinn ×2':
   ticket.multiplier===2?'✨ ×2-Multiplikator':
   entries.length>1?entries.length+' Gewinnkombinationen':'';
  const list=$('scratch-winning-lines');list.replaceChildren();
  for(const [i,win] of wins.entries()){
   const line=el('div','scratch-prize-line','Gewinn '+(i+1)+': '+prizeLabel(win.prize));
   if(win.prize?.x2)line.append(el('small','', ' · '+num(win.prize.baseAmount)+' × 2'));
   list.append(line);
  }
  list.hidden=!wins.length;results.hidden=false;
  $('scratch-reveal-button').hidden=true;$('scratch-ticket-finish').hidden=false;
  notice(entries.length?'🎉 Gewinne sind bereits sicher auf deinem Profil gutgeschrieben.':
   '❄️ Niete – auf dieser Karte gibt es keine gültige Gewinnkombination.');
 }
 async function load(){
  const id=++requestId;
  if(!account()){status=null;ticket=null;stage.hidden=true;drawShop();notice('🔐 Bitte mit dem DOG-Onlineprofil anmelden.');return}
  try{
   const r=await query('');
   if(id!==requestId)return;
   status=r.scratch;
   if(!ticket&&status?.lastResult?.board&&status.lastResult.commandId!==acknowledged())
    showTicket(status.lastResult);
   drawShop();
   notice(ticket?'❄️ Dein letztes Los wurde wiederhergestellt.':
    '🎄 Rubble die Felder mit Finger oder Maus. Bei 90 % wird das Ergebnis automatisch enthüllt.');
  }catch(e){if(id!==requestId)return;status=null;drawShop();notice('⚠️ '+(e.message||'Verbindung nicht verfügbar'))}
 }
 async function buy(tier,free){
  if(!account()||busy||ticket)return;
  busy=true;drawShop();
  pending=pending?.tier===tier&&pending.free===free?pending:
   {tier,free,commandId:'scratch-'+crypto.randomUUID()};
  notice('🎟️ Los wird auf Render gebucht und das Symbolfeld erstellt …');
  try{
   const r=await query('/buy',pending);
   if(!r.result||!r.scratch)throw Error('INVALID_SCRATCH_RESULT');
   status=r.scratch;pending=null;showTicket(r.result);
   notice('❄️ Rubble mit Finger oder Maus über jedes Feld. Ab 90 % öffnet sich das Los automatisch.');
  }catch(e){
   notice('⚠️ '+(e.message==='SCRATCH_NOT_ENOUGH_COINS'?'Nicht genügend Münzen.':
    e.message==='SCRATCH_DAILY_ALREADY_USED'?'Gratis-Los heute bereits eingelöst.':e.message));
  }finally{busy=false;drawShop()}
 }
 $('scratch-reveal-button').addEventListener('click',finish);
 $('scratch-ticket-finish').addEventListener('click',()=>{
  if(!ticket)return;
  acknowledge(ticket.commandId);ticket=null;finished=false;stage.hidden=true;
  drawShop();notice('🎄 Bereit für dein nächstes Rubbellos.');
 });
 $('scratch-refresh').addEventListener('click',()=>void load());
 window.addEventListener('spielonline-change',()=>{
  requestId++;status=null;ticket=null;stage.hidden=true;void load();
 });
 drawShop();return {load};
}
