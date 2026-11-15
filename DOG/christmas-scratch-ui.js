/**
 * Lichtertal Rubbellose – real purchase on Render, purely local scratching.
 * The secure server transaction assigns the prize and stores the receipt once.
 * Rendering the scratch canvas causes NO Firestore writes.
 */
export const SCRATCH_TICKET_TYPES=Object.freeze([
 Object.freeze({id:'simple',icon:'🟤',label:'Einfach',price:200,unlockChance:10,
  description:'Normale DOG-Emojis und Farben für die rechten Spielblöcke',
  odds:'90 % Münzen · 6 % Emojis · 4 % Blockfarben'}),
 Object.freeze({id:'medium',icon:'🔵',label:'Mittel',price:500,unlockChance:40,
  description:'1 Spielbrett · 5 Profilbilder · 1 Namensrahmen · 1 Aktivsymbol · 4 Weihnachts-Emojis',
  odds:'60 % Münzen · 19 % Profilbilder · 12 % Emojis · 4 % Rahmen · 4 % Symbole · 1 % Spielbrett'}),
 Object.freeze({id:'premium',icon:'🟡',label:'Premium',price:1000,unlockChance:65,
  description:'1 Spielbrett · 2 Hintergründe · 10 Profilbilder · 2 Rahmen · 2 Aktivsymbole · 4 Weihnachts-Emojis',
  odds:'35 % Münzen · 22 % Profilbilder · 12 % Emojis · 10 % Hintergründe · 8 % Rahmen · 8 % Symbole · 5 % Spielbrett'})
]);
export function initChristmasScratch(){
 const $=id=>document.getElementById(id);
 const root=$('scratch-tier-grid'),statusText=$('scratch-status'),wallet=$('scratch-wallet'),
   stage=$('scratch-stage'),reveal=$('scratch-reveal'),canvas=$('scratch-canvas');
 if(!root||!statusText||!wallet||!stage||!reveal||!canvas)throw Error('SCRATCH_UI_NOT_FOUND');
 let state=null,busy=false,pending=null,ticket=null,requestCounter=0,lastFailure='';
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null};
 const text=(tag,cls,val)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(val!==undefined)el.textContent=String(val);return el};
 const message=s=>{statusText.textContent=s};
 async function query(path,body=null){
  const player=user();if(!player)throw Error('LOGIN_REQUIRED');
  const token=await player.getIdToken();
  const result=await fetch(base+'/api/hub/scratch'+path,{
   method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,cache:'no-store'
  });
  const data=await result.json().catch(()=>({}));
  if(!result.ok||data.ok!==true)throw Error(data.error||'SERVER_UNAVAILABLE');
  return data;
 }
 function draw(){
  root.replaceChildren();
  wallet.textContent=state?state.coins.toLocaleString('de-DE')+' 🪙':'– 🪙';
  $('scratch-daily-info').textContent=state?.dailyFreeAvailable?'🎁 Heute 1 einfaches Gratis-Los verfügbar':'Gratis-Los heute bereits verwendet';
  const alreadyOpen=Boolean(ticket);
  for(const conf of SCRATCH_TICKET_TYPES){
   const wrap=text('article','scratch-tier '+conf.id);
   const ico=text('span','scratch-icon',conf.icon),head=text('h3','',conf.label+'-Rubbellos');
   const price=text('strong','scratch-price',conf.price.toLocaleString('de-DE')+' 🪙');
   const odds=text('div','scratch-chance',conf.unlockChance+' % Chance auf neue Freischaltung');
   const desc=text('div','scratch-reward-list',conf.description);
   const small=text('small','scratch-info',conf.odds);
   const button=text('button','scratch-buy','🎟️ Für '+conf.price+' Münzen kaufen');
   button.type='button';button.disabled=busy||alreadyOpen||!user()||!state||state.coins<conf.price;
   button.addEventListener('click',()=>void buy(conf.id,false));
   wrap.append(ico,head,price,odds,desc,small,button);
   if(conf.id==='simple'){
    const free=text('button','scratch-free','🎁 Gratis-Los öffnen');
    free.type='button';free.disabled=busy||alreadyOpen||!user()||!state?.dailyFreeAvailable;
    free.addEventListener('click',()=>void buy('simple',true));
    wrap.append(free);
   }
   root.append(wrap);
  }
 }
 const outcome=result=>result.type==='coins'?'🪙 '+result.amount+' Münzen':
  (result.prize?.icon||'🎁')+' '+(result.prize?.name||'Neues Design');
 function showTicket(result,tier){
  ticket=result;stage.hidden=false;reveal.classList.remove('revealed');
  $('scratch-ticket-title').textContent='🎟️ '+(SCRATCH_TICKET_TYPES.find(x=>x.id===tier)?.label||'')+'-Rubbellos';
  $('scratch-result-value').textContent=outcome(result);
  $('scratch-result-kind').textContent=result.type==='coins'?'Münzgewinn':'✨ NEU FREIGESCHALTET';
  $('scratch-ticket-finish').hidden=true;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const w=canvas.width=640,h=canvas.height=190;
  ctx.globalCompositeOperation='source-over';
  const g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#a2b8c0');g.addColorStop(.48,'#eaf3f1');g.addColorStop(1,'#93a5b1');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#c9d5d7';ctx.lineWidth=2;
  for(let x=-h;x<w+h;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h,h);ctx.stroke()}
  ctx.fillStyle='#384f5d';ctx.font='bold 29px system-ui';ctx.textAlign='center';
  ctx.fillText('❄ FREIRUBBELN ❄',w/2,h/2+10);
  ctx.globalCompositeOperation='destination-out';
  let isDrawing=false,distance=0,last=null;
  const erase=event=>{
   const box=canvas.getBoundingClientRect();
   return {x:(event.clientX-box.left)/box.width*w,y:(event.clientY-box.top)/box.height*h};
  };
  const move=event=>{
   if(!isDrawing||!ticket)return;
   event.preventDefault();
   const p=erase(event);
   ctx.lineWidth=39;ctx.lineCap='round';ctx.lineJoin='round';
   if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();distance+=Math.hypot(p.x-last.x,p.y-last.y);}
   else{ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill()}
   last=p;
   if(distance>=1000)finish();
  };
  canvas.onpointerdown=e=>{isDrawing=true;last=null;canvas.setPointerCapture(e.pointerId);move(e)};
  canvas.onpointermove=move;
  canvas.onpointerup=()=>{isDrawing=false;last=null};
  canvas.onpointercancel=()=>{isDrawing=false;last=null};
  stage.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function finish(){
  if(!ticket)return;
  reveal.classList.add('revealed');
  $('scratch-ticket-finish').hidden=false;
  message(ticket.type==='coins'?'🪙 '+ticket.amount+' Münzen wurden deinem Konto gutgeschrieben.':
   '🎉 Freigeschaltet: '+ticket.prize.name+' – dauerhaft in deinem Profil!');
 }
 async function load(){
  const seq=++requestCounter;
  if(!user()){state=null;ticket=null;stage.hidden=true;draw();message('🔐 Für Rubbellose bitte mit deinem Onlineprofil anmelden.');return}
  try{
   const result=await query('');
   if(seq!==requestCounter)return;
   state=result.scratch;draw();
   message('🎄 Dein persönlicher Rubbellos-Vorrat ist bereit.');
  }catch(e){
   if(seq!==requestCounter)return;
   state=null;draw();message('⚠️ Rubbellose derzeit nicht erreichbar: '+(e.message||'Fehler'));
  }
 }
 async function buy(tier,free){
  if(!user()||busy||ticket)return;
  busy=true;draw();
  const existing=pending&&pending.tier===tier&&pending.free===free?pending:null;
  pending=existing||{tier,free,commandId:'scratch-'+crypto.randomUUID()};
  message('🎟️ Rubbellos wird sicher auf Render verbucht …');
  try{
   const response=await query('/buy',pending);
   if(!response.result||!response.scratch)throw Error('INVALID_SCRATCH_RESULT');
   state=response.scratch;const result=response.result;
   pending=null;showTicket(result,tier);message('❄️ Rubble die silberne Fläche frei oder nutze „Gewinn enthüllen“.');
  }catch(e){lastFailure=e.message;message('⚠️ '+(e.message==='SCRATCH_NOT_ENOUGH_COINS'?'Zu wenig Münzen.':
    e.message==='SCRATCH_DAILY_ALREADY_USED'?'Dein tägliches Gratis-Los wurde bereits verwendet.':e.message));}
  finally{busy=false;draw()}
 }
 $('scratch-reveal-button').addEventListener('click',finish);
 $('scratch-ticket-finish').addEventListener('click',()=>{
  if(!ticket)return;
  ticket=null;stage.hidden=true;draw();message('🎄 Du kannst ein weiteres Rubbellos öffnen.');
 });
 $('scratch-refresh').addEventListener('click',()=>void load());
 window.addEventListener('spielonline-change',()=>{state=null;ticket=null;stage.hidden=true;void load()});
 draw();
 return {load};
}
