/* Die 100 Tore – personal, boss-gated ascension forge.
 * Authenticated server receipts guarantee exactly one attempt per request ID.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const room=new URLSearchParams(location.search).get('room');
 const suffix=room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)?'?room='+encodeURIComponent(room):'';
 for(const [id,path] of [['to-map','dog-tor-map.html'],['to-boss','dog-boss10.html'],
  ['to-inventory','dog-expedition.html']])$(id).href='./'+path+suffix;
 const auth=()=>{const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.uid&&s.profile?.setupComplete!==false?s:null;};
 const pendingKey=uid=>'dog:ascension:pending:'+uid;
 const pending=uid=>{try{const v=JSON.parse(localStorage.getItem(pendingKey(uid))||'null');
  return v&&/^[A-Za-z0-9_-]{12,90}$/.test(v.requestId)&&
   ['weapon','armor'].includes(v.type)&&Number.isSafeInteger(v.expectedLevel)?v:null;
 }catch{return null}};
 const save=(uid,value)=>{try{const s=JSON.stringify(value);localStorage.setItem(pendingKey(uid),s);
  return localStorage.getItem(pendingKey(uid))===s;}catch{return false}};
 const clear=uid=>{try{localStorage.removeItem(pendingKey(uid))}catch{}};
 const newId=()=>globalThis.crypto?.randomUUID?.()?
  'forge-'+globalThis.crypto.randomUUID():
  'forge-'+Date.now()+'-'+Math.random().toString(36).slice(2,15);
 const fmt=value=>Math.max(0,Number(value)||0).toLocaleString('de-DE');
 const resourcesNames={
  iron:'Eisenerz',forge_coal:'Schmiedekohle',steel_core:'Stahlkern',
  mithril:'Mithril',dragonsteel:'Drachenstahl',
  life_dust:'Lebensstaub',guard_crystal:'Schutzkristall',
  life_essence:'Lebensessenz',guardian_rune:'Wächterrune',
  phoenix_feather:'Phönixfeder'
 };
 let view=null,uid=null,busy=false,loading=null;
 function message(v){$('status').textContent=v}
 async function request(method,route,body,account){
  const state=auth();if(!state||state.user.uid!==account)throw Error('LOGIN_REQUIRED');
  const token=await state.user.getIdToken();
  if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timeout=controller?setTimeout(()=>controller.abort(),18000):null;
  try{
   const res=await fetch(API+'/api/dog/gates/ascension'+route,{
    method,cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),...(controller?{signal:controller.signal}:{})
   });
   const data=await res.json().catch(()=>({error:'DOG_ASCENSION_UNAVAILABLE'}));
   if(!res.ok||data.ok!==true)throw Error(data.error||'DOG_ASCENSION_UNAVAILABLE');
   if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
   return data;
  }finally{if(timeout!==null)clearTimeout(timeout)}
 }
 function equipmentName(type,level){
  return window.DogHeroEquipment?.name(view?.heroClass,type,level)||
   (type==='weapon'?'Waffe':'Rüstung');
 }
 function render(){
  $('forge-level').textContent=(view?.forgeLevel||1)+' / 10';
  const classDisplay=$('ascension-hero-class');
  if(classDisplay)classDisplay.textContent=window.DogHeroEquipment?.label(view?.heroClass)||
   'Heldenklasse noch nicht gewählt';
  const p=uid?pending(uid):null;
  $('retry').hidden=!p;$('retry').disabled=busy;
  for(const type of ['weapon','armor']){
   const quote=view?.quotes?.[type],button=$('upgrade-'+type);
   const current=quote?.level;
   $(type+'-level').textContent=Number.isSafeInteger(current)?
    'Level '+current+' / 10':'Level –';
   const name=$(type+'-name');
   if(name)name.textContent=Number.isSafeInteger(current)?equipmentName(type,current):
    (type==='weapon'?'Waffe':'Rüstung');
   const art=$(type+'-art');
   if(art){
    const artSrc=window.DogHeroEquipment?.image(view?.heroClass,type,current||1)||
      './dog-forge-art/'+type+'-1.svg';
    art.dataset.fallbackAttempted='';
    art.onerror=()=>{
     const fallback=window.DogHeroEquipment?.fallbackImage(view?.heroClass,type,current||1)||
      './dog-forge-art/'+type+'-1.svg';
     if(art.dataset.fallbackAttempted!=='yes'&&art.getAttribute('src')!==fallback){
      art.dataset.fallbackAttempted='yes';art.src=fallback;
     }else art.hidden=true;
    };
    art.hidden=false;art.src=artSrc;
    art.alt=(name?.textContent||type)+' · Stufe '+(current||1);
   }
   $(type+'-base').textContent=type==='weapon'?
    'Grundschaden: '+(Number.isSafeInteger(current)?fmt(100*2**(Math.min(10,current)-1)):'–'):
    'Grundschutz: '+(Number.isSafeInteger(current)?fmt(100*2**(Math.min(10,current)-1)):'–');
   const cost=$(type+'-cost');
   cost.replaceChildren();
   if(!quote){cost.textContent='Schmiededaten laden …';button.disabled=true;continue;}
   if(quote.legacy){
    cost.textContent='⚠️ Bestehendes Ausrüstungslevel über 10 bleibt unangetastet.';
   }else if(quote.maxed){
    cost.textContent='🏆 Maximallevel 10 erreicht.';
   }else if(quote.locked){
    cost.textContent='🔒 Nächstes Level '+quote.nextLevel+
     ' erst nach dem passenden gemeinsamen Boss-Sieg freigeschaltet.';
   }else{
    const head=document.createElement('strong');
    head.textContent='Level '+quote.nextLevel+' · Erfolgschance '+quote.successChance+' %';
    cost.append(head);
    for(const [id,amount] of Object.entries(quote.cost)){
     const line=document.createElement('div');
     line.textContent=(resourcesNames[id]||id)+': '+amount+' benötigt / '+
      fmt(view?.resources?.[id]||0)+' vorhanden';
     cost.append(line);
    }
   }
   button.disabled=busy||!!p||!view||quote.maxed||quote.locked||!quote.affordable;
   button.textContent=quote.maxed?'🏆 Maximallevel erreicht':quote.locked?
    '🔒 Boss noch nicht besiegt':quote.affordable?
    '⚒️ Upgrade auf Level '+quote.nextLevel:'📦 Rohstoffe fehlen';
  }
  const root=$('inventory');root.replaceChildren();
  if(view?.resources){
   for(const [id,label] of Object.entries(resourcesNames)){
    const line=document.createElement('span');
    const name=document.createElement('span');name.textContent=label;
    const count=document.createElement('strong');count.textContent=fmt(view.resources[id]||0);
    line.append(name,count);root.append(line);
   }
  }else root.textContent='Keine bestätigten Daten geladen.';
 }
 async function reload(){
  const account=auth()?.user?.uid;
  if(!account){uid=null;view=null;message('🔒 Melde dich mit deinem Online-Spielerprofil an.');render();return;}
  if(loading)return loading;
  uid=account;message('🔄 Schmiede und Inventar werden geladen …');
  const task=request('GET','',null,account).then(data=>{
   if(auth()?.user?.uid!==account)return;
   view=data;render();
   message(pending(account)?'⚠️ Ein früherer Upgrade-Versuch muss sicher wiederholt werden.':
    '✅ Deine aktuelle Schmiedestufe und deine Rohstoffe sind geladen.');
  }).catch(e=>{view=null;render();message('⚠️ Schmiede nicht erreichbar: '+e.message);});
  loading=task;try{await task}finally{if(loading===task)loading=null}
 }
 async function upgrade(type=null,retry=false){
  const account=auth()?.user?.uid;
  if(!account||busy)return;
  const old=pending(account);
  if(retry&&!old)return;
  if(!retry&&old)return;
  const quote=view?.quotes?.[type];
  if(!old&&(!quote||quote.locked||quote.maxed||!quote.affordable))return;
  const command=old||{requestId:newId(),type,expectedLevel:quote.level};
  if(!old&&!save(account,command)){
   message('⚠️ Aktion konnte nicht gespeichert werden. Es wurden keine Rohstoffe ausgegeben.');return;
  }
  busy=true;render();message('⚒️ Der Server prüft deinen Schmiedeversuch …');
  try{
   const data=await request('POST','/upgrade',command,account);
   if(auth()?.user?.uid!==account)return;
   clear(account);view=data.view;render();
   message(data.result.success?'🎉 Erfolg! '+equipmentName(data.result.type,data.result.newLevel)+
    ' ist jetzt Level '+data.result.newLevel+'.':
    '🔥 Der Schmiedeversuch ist fehlgeschlagen. Dein Ausrüstungslevel bleibt erhalten, die Materialien wurden verbraucht.');
   if(data.replayed)message($('status').textContent+' (Sicher wiederhergestellt)');
  }catch(e){
   if(['DOG_ASCENSION_LEVEL_STALE','DOG_ASCENSION_LEGACY_LEVEL',
    'DOG_ASCENSION_BOSS_REQUIRED','DOG_ASCENSION_MATERIALS_MISSING',
    'DOG_ASCENSION_INVALID_TYPE','DOG_ASCENSION_RECEIPT_CONFLICT'].includes(e.message))
    clear(account);
   message('⚠️ Schmiedeversuch nicht bestätigt: '+e.message+
    '. Bei unbekanntem Ergebnis denselben Versuch sicher wiederholen.');
  }finally{busy=false;render();}
 }
 for(const type of ['weapon','armor'])
  $('upgrade-'+type).addEventListener('click',()=>void upgrade(type));
 $('retry').addEventListener('click',()=>void upgrade(null,true));
 $('reload').addEventListener('click',()=>void reload());
 window.addEventListener('spielonline-change',()=>void reload());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void reload()});
 void reload();
})();