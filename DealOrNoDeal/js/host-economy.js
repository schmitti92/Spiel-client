// Host economy panel shared by the Deal studio and lobby.
(()=>{
 'use strict';
 const DEFAULT={prices:{doubleBoost:300000000,dogSmall:200000000,dogLarge:400000000,dogPremium:600000000,dogPlatinum:2000000000,goldRare:25000000,goldLegendary:150000000},doubleBoostEnabled:true,packsEnabled:true,slotWeights:{chest:35,pack:30,hammer:20,joker:4,minigame:3,monster:3,cash:190},revision:0};
 const FIELDS=[
  ['doubleBoost','💎 ×2-Auszahlungsbonus'],
  ['dogSmall','🎁 DOG Normalpaket'],
  ['dogLarge','🥇 DOG Goldpaket'],
  ['dogPremium','👑 DOG Premiumpaket'],
  ['dogPlatinum','💠 DOG Platinpaket'],
  ['goldRare','🎴 Goldstudio Seltenes Paket'],
  ['goldLegendary','🌟 Goldstudio Legendäres Paket']
 ];
 const SLOT_FIELDS=[
  ['cash','💰 Geldgewinne'],['chest','📦 Materialtruhen'],
  ['pack','🎴 DOG-Kartenpakete'],['hammer','🔨 Hämmer'],
  ['joker','🃏 Joker'],['minigame','🎮 Minispiel-Gutscheine'],
  ['monster','👹 Monster-Glücksrad-Gutscheine']
 ];
 const room=new URLSearchParams(location.search).get('room')?.toUpperCase()||'';
 const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const inLobby=location.pathname.endsWith('lobby.html');
 const parent=inLobby?document.querySelector('.lobby-shortcuts'):document.querySelector('.studio-header-controls');
 let current=structuredClone(DEFAULT),isHost=false,loadedUid='',loading=null,busy=false,dirty=false,lastFocus=null;
 const active=()=>{const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null};
 const euros=c=>(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 function emit(config){window.dispatchEvent(new CustomEvent('deal-economy-updated',{detail:config}));}
 function apply(config){
  if(!config?.prices)return;
  if((Number(config.revision)||0)<(Number(current.revision)||0))return;
  current=config;emit(current);
  if(!dirty&&!dialog.hidden)fill(current);
 }
 window.DealEconomy={current:()=>current,load:force=>load(Boolean(force))};
 if(!parent||!/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room))return;
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className=(inLobby?'button ':'studio-tool ')+'deal-economy-trigger';
 trigger.textContent='⚙️ Host-Preise';trigger.title='Preise und Spielwirtschaft einstellen – nur für den Raumhost';
 trigger.hidden=true;parent.append(trigger);
 const backdrop=document.createElement('div');backdrop.className='deal-economy-backdrop';backdrop.hidden=true;
 const dialog=document.createElement('section');dialog.className='deal-economy-modal';dialog.hidden=true;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','deal-economy-title');
 dialog.innerHTML='<div class="deal-economy-head"><div><small>GOLDSTUDIO · HOSTVERWALTUNG</small><h2 id="deal-economy-title">⚙️ Preise & Einstellungen</h2></div><button class="deal-economy-close" type="button" aria-label="Schließen">✕</button></div><p class="deal-economy-note">Diese Preise gelten global für alle Spieler und alle Räume. Käufe werden immer vom Server geprüft. Änderungen betreffen keine bereits bezahlten Käufe.</p><form id="deal-economy-form"><div class="deal-economy-fields"></div><div class="deal-economy-switches"><label><input name="doubleBoostEnabled" type="checkbox"> 💎 ×2-Bonus anbieten</label><label><input name="packsEnabled" type="checkbox"> 🎴 Kartenpakete zum Kauf anbieten</label></div><fieldset class="deal-economy-slots"><legend>🎰 Slotmaschine · Gewinngewichtung</legend><p>Gewichtspunkte bestimmen, welche Art von Gewinn häufiger kommt. Je mehr Punkte, desto höher die Chance. 0 deaktiviert eine Gewinnart. Die Einstellungen gelten für Monster-Slots (1/3 Walzen) und DOG-Super-Slots (5 Walzen). Einzelner Geldpreis: 0,01 € bis maximal 5.000.000 €.</p><div class="deal-economy-slot-summary" role="status" aria-live="polite"></div><div class="deal-economy-slot-grid"></div></fieldset><p class="deal-economy-status" role="status" aria-live="polite"></p><div class="deal-economy-actions"><button type="button" class="deal-economy-reset">↺ Standardwerte</button><button type="submit" class="deal-economy-save">✓ Speichern</button></div></form>';
 const form=dialog.querySelector('form'),fields=dialog.querySelector('.deal-economy-fields'),
  slotFields=dialog.querySelector('.deal-economy-slot-grid'),
  slotSummary=dialog.querySelector('.deal-economy-slot-summary'),
  status=dialog.querySelector('.deal-economy-status');
 function readSlotWeights(){
  return Object.fromEntries(SLOT_FIELDS.map(([key])=>[key,Number(form.elements.namedItem('slot-'+key).value)]));
 }
 function updateSlotSummary(){
  const values=readSlotWeights(),total=Object.values(values).reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
  const percent=n=>total>0?(n*100/total).toLocaleString('de-DE',{maximumFractionDigits:1})+' %':'0 %';
  const cash=values.cash||0,other=total-cash;
  slotSummary.textContent='💰 Geld: '+percent(cash)+' · 🎁 Gegenstände: '+percent(other)+(total===0?' · ⚠️ Mindestens eine Gewinnart muss Punkte haben.':'');
  for(const [key] of SLOT_FIELDS){
   const box=slotFields.querySelector('[data-slot-key="'+key+'"]');
   if(box)box.querySelector('.deal-economy-slot-percent').textContent=percent(values[key]||0);
  }
 }
 for(const [key,label] of FIELDS){
  const entry=document.createElement('label');entry.className='deal-economy-field';
  const name=document.createElement('span');name.textContent=label;
  const unit=document.createElement('div');unit.className='deal-economy-input';
  const field=document.createElement('input');field.type='number';field.name=key;field.min='0';field.max='50000000';field.step='1';field.required=true;field.inputMode='numeric';
  const eur=document.createElement('strong');eur.textContent='€';
  unit.append(field,eur);entry.append(name,unit);fields.append(entry);
 }
 for(const [key,label] of SLOT_FIELDS){
  const entry=document.createElement('label');
  entry.className='deal-economy-field deal-economy-slot-field';
  entry.dataset.slotKey=key;
  const name=document.createElement('span');name.textContent=label;
  const wrap=document.createElement('div');wrap.className='deal-economy-input';
  const input=document.createElement('input');
  input.type='number';input.name='slot-'+key;input.min='0';input.max='10000';
  input.step='1';input.required=true;input.inputMode='numeric';
  input.setAttribute('aria-label',label+' Gewichtspunkte');
  const unit=document.createElement('strong');unit.textContent='Pkt.';
  wrap.append(input,unit);
  const odds=document.createElement('small');odds.className='deal-economy-slot-percent';odds.textContent='–';
  entry.append(name,wrap,odds);slotFields.append(entry);
 }
 document.body.append(backdrop,dialog);

 // Reusable five-wooden-chest gift for every genuine player in this room,
 // including the host. This is NOT a one-time welcome reward.
 const giftPanel=document.createElement('section');
 giftPanel.className='dog-host-chest-gift';
 giftPanel.innerHTML='<div class="dog-host-chest-gift-title">🎁 100-Tore-Geschenke</div>'+
  '<p>Verschenke <strong>5 Holzkisten</strong> an alle echten Spieler dieses Raums – auch an dich selbst. Du kannst das jederzeit wiederholen.</p>'+
  '<button type="button" class="dog-host-chest-send">📦 5 Holzkisten an alle verschenken</button>'+
  '<p class="dog-host-chest-status" role="status" aria-live="polite"></p>';
 dialog.append(giftPanel);
 const giftButton=giftPanel.querySelector('.dog-host-chest-send');
 const giftStatus=giftPanel.querySelector('.dog-host-chest-status');
 let giftBusy=false;
 const giftStorageKey=uid=>'dog-host-wood5-pending-v1:'+room+':'+uid;
 const pendingGift=uid=>{
  try{
   const id=localStorage.getItem(giftStorageKey(uid))||'';
   return /^[a-zA-Z0-9_-]{12,90}$/.test(id)?id:'';
  }catch{return ''}
 };
 const savePendingGift=(uid,id)=>{try{localStorage.setItem(giftStorageKey(uid),id)}catch{}};
 const clearPendingGift=uid=>{try{localStorage.removeItem(giftStorageKey(uid))}catch{}};
 const giftRequestId=()=>window.crypto?.randomUUID?.()||('gift-'+Date.now()+'-'+Math.random().toString(36).slice(2,14));
 async function sendHostGift(id){
  const u=active();if(!u)throw Error('Bitte anmelden.');
  const token=await u.getIdToken();
  if(active()?.uid!==u.uid)throw Error('PROFILE_CHANGED');
  const reply=await fetch(api+'/api/dog/host-gift/'+encodeURIComponent(room)+'/wood5',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   cache:'no-store',body:JSON.stringify({requestId:id})
  });
  const result=await reply.json().catch(()=>({}));
  if(!reply.ok||result.ok!==true)throw Error(result.error||'GIFT_UNAVAILABLE');
  if(result.requestId!==id||result.quantity!==5||!Number.isInteger(result.players))
   throw Error('GIFT_RESPONSE_INVALID');
  return result;
 }
 giftButton.addEventListener('click',async()=>{
  if(!isHost||giftBusy)return;
  const u=active();if(!u)return;
  const previous=pendingGift(u.uid);
  if(!previous&&!window.confirm('Jetzt an ALLE echten Spieler im Raum '+room+' (einschließlich dir) jeweils 5 Holzkisten verschenken?'))return;
  const id=previous||giftRequestId();
  if(!previous)savePendingGift(u.uid,id);
  giftBusy=true;giftButton.disabled=true;
  giftStatus.textContent=previous?'⏳ Prüfe die letzte Geschenkvergabe …':'⏳ Die Holzkisten werden sicher verteilt …';
  try{
   const response=await sendHostGift(id);
   if(active()?.uid!==u.uid)return;
   clearPendingGift(u.uid);
   giftStatus.textContent='✅ '+response.players+' Spieler erhalten je 5 Holzkisten (insgesamt '+response.totalChests+'). Auch der Host hat seine Kisten bekommen.'+(response.replayed?' Bereits verbuchte Vergabe bestätigt.':'');
   giftButton.textContent='📦 Erneut 5 Holzkisten verschenken';
  }catch(error){
   if(active()?.uid===u.uid){
    giftStatus.textContent='⚠️ '+String(error?.message||error)+'. Bei unklarer Verbindung dieselbe Vergabe erneut prüfen – keine doppelte Buchung.';
    giftButton.textContent='↻ Letzte Vergabe sicher prüfen';
   }
  }finally{giftBusy=false;giftButton.disabled=false}
 });

 const close=()=>{dialog.hidden=true;backdrop.hidden=true;document.body.classList.remove('deal-economy-open');dirty=false;(lastFocus||trigger).focus()};
 const fill=value=>{
  for(const [key] of FIELDS)form.elements.namedItem(key).value=String(Math.round(value.prices[key]/100));
  form.elements.namedItem('doubleBoostEnabled').checked=value.doubleBoostEnabled!==false;
  form.elements.namedItem('packsEnabled').checked=value.packsEnabled!==false;
  for(const [key] of SLOT_FIELDS)form.elements.namedItem('slot-'+key).value=String(
   Number.isSafeInteger(value.slotWeights?.[key])?value.slotWeights[key]:DEFAULT.slotWeights[key]);
  updateSlotSummary();
  dirty=false;
 };
 function open(){
  if(!isHost||busy)return;
  lastFocus=document.activeElement;fill(current);
  dialog.hidden=false;backdrop.hidden=false;document.body.classList.add('deal-economy-open');
  status.textContent='Aktueller Stand · '+(current.updatedAt?new Date(current.updatedAt).toLocaleString('de-DE'):'Standardpreise');
  dialog.querySelector('.deal-economy-close').focus();
 }
 trigger.onclick=open;
 dialog.querySelector('.deal-economy-close').onclick=close;backdrop.onclick=close;
 document.addEventListener('keydown',event=>{if(dialog.hidden)return;if(event.key==='Escape'){event.preventDefault();close();}});
 form.oninput=()=>{dirty=true;updateSlotSummary();status.textContent='Ungespeicherte Änderungen';};
 dialog.querySelector('.deal-economy-reset').onclick=()=>{
  fill(DEFAULT);dirty=true;status.textContent='Standardpreise und Slot-Gewichte vorgemerkt – zum Übernehmen speichern.';
 };
 async function send(method,body){
  const u=active();if(!u)throw Error('Bitte anmelden.');
  const token=await u.getIdToken();
  const res=await fetch(api+'/api/deal-or-no-deal/'+encodeURIComponent(room)+'/economy',{
   method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   cache:'no-store',body:body?JSON.stringify(body):undefined
  });
  let json;try{json=await res.json()}catch{throw Error('Serverantwort unlesbar');}
  if(!res.ok||!json.ok)throw Error(json.error||'SERVER_ERROR');
  return json;
 }
 async function load(force=false){
  const u=active();if(!u||!room)return;
  if(!force&&loadedUid===u.uid)return;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const data=await send('GET');
    if(active()?.uid!==u.uid)return;
    loadedUid=u.uid;isHost=data.isHost===true;trigger.hidden=!isHost;
    apply(data.economy);
   }catch(e){
    if(force)throw e;
    console.warn('Host economy:',e.message);
    trigger.hidden=true;
   }
  })();
  try{return await loading}finally{loading=null}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!isHost)return;
  const prices={};
  for(const [key] of FIELDS){
   const input=form.elements.namedItem(key),value=Number(input.value);
   if(!input.value.trim()||!Number.isSafeInteger(value)||value<0||value>50000000){status.textContent='Bitte für alle Preise ganze Eurobeträge von 0 bis 50.000.000 eingeben.';input.focus();return}
   prices[key]=value*100;
  }
  const slotWeights=readSlotWeights();
  if(SLOT_FIELDS.some(([key])=>!Number.isSafeInteger(slotWeights[key])||slotWeights[key]<0||slotWeights[key]>10000)||
    !SLOT_FIELDS.some(([key])=>slotWeights[key]>0)){
   status.textContent='Bitte für jede Gewinnart 0 bis 10.000 ganze Gewichtspunkte eingeben; mindestens eine Gewinnart muss aktiv sein.';
   return;
  }
  busy=true;const save=dialog.querySelector('.deal-economy-save');save.disabled=true;status.textContent='⏳ Speichere Preise und Slot-Gewichtung …';
  try{
   const result=await send('POST',{prices,slotWeights,doubleBoostEnabled:form.elements.namedItem('doubleBoostEnabled').checked,packsEnabled:form.elements.namedItem('packsEnabled').checked});
   current=result.economy;dirty=false;emit(current);fill(current);
   status.textContent='✅ Preise und Slot-Gewichtung gespeichert · '+new Date(current.updatedAt).toLocaleString('de-DE');
   window.DogAlbumSeason2?.refresh?.();
  }catch(e){
   status.textContent='⚠️ Speichern fehlgeschlagen: '+e.message;
   if(e.message==='HOST_ONLY'){isHost=false;trigger.hidden=true}
  }finally{busy=false;save.disabled=false}
 });
 window.addEventListener('deal-economy-updated',event=>{
  if(event.detail!==current)apply(event.detail);
 });
 window.addEventListener('spielonline-change',()=>{
  const uid=active()?.uid||'';
  if(uid!==loadedUid){isHost=false;trigger.hidden=true;loadedUid='';current=structuredClone(DEFAULT);if(!uid&& !dialog.hidden)close();}
  if(uid)void load();
 });
 void load();
})();
