/* DOG Sammelalbum Saison 2 – offizieller, vom Weihnachtsalbum unabhängiger Client. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const ROOT='./Weihnachtsevent2/Sammelalbum_Saison_2_Bilder/';
 const BOARD_ICONS=['🎲','🚀','🦖','🎡','🏰','🤠'];
 const rarities={common:'Gewöhnlich',rare:'Selten',epic:'Episch',legendary:'Legendär'};
 const number=n=>(Number(n)||0).toLocaleString('de-DE');
 const money=n=>(Number(n||0)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 let data=null,busy=false,requestNumber=0,loadedUser='',boardBuilt=false;
 function state(){return window.SpielOnline?.state?.()||{}}
 function activeUser(){const s=state();return s.status==='online'&&s.user?.getIdToken?s.user:null}
 function status(text){$('status').textContent=text}
 function imageSrc(card){return ROOT+encodeURIComponent(card.image)}
 async function api(method,path,body){
  const user=activeUser();if(!user)throw Error('Bitte melde dich mit deinem Online-Profil an.');
  const token=await user.getIdToken();
  const response=await fetch(BASE+'/api/deal-or-no-deal/christmas/season2/'+path,{
   method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',
   body:body?JSON.stringify(body):undefined
  });
  let out;try{out=await response.json()}catch{throw Error('Server antwortet nicht mit gültigen Daten.')}
  if(!response.ok||!out.ok)throw Error(out.error||'SERVER_ERROR');
  return out;
 }
 function clear(){
  data=null;loadedUser='';boardBuilt=false;$('boards').replaceChildren();$('packs').replaceChildren();
  $('owned').textContent='0 / 96';$('bingos').textContent='0 / 60';$('coins').textContent='–';$('meter-fill').style.width='0%';
  $('duplicate-count').textContent='0 Duplikate';$('ticket-count').textContent='0 Monster-Rad-Tickets';$('exchange').disabled=true;
 }
 function showTab(tab){
  for(const name of ['album','packs','duplicates'])$(name+'-panel').hidden=tab!==name;
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 }
 function buildBoards(){
  if(!data?.definitions?.length)return;
  const fragment=document.createDocumentFragment();
  for(let board=0;board<6;board++){
   const cards=data.definitions.slice(board*16,board*16+16),world=data.progress.boards[board];
   const article=document.createElement('article');article.className='board';
   const head=document.createElement('header');head.className='board-head';
   const name=document.createElement('h3');name.textContent=BOARD_ICONS[board]+' '+(board+1)+'. '+world.name;
   const count=document.createElement('small');count.id='board-summary-'+board;
   head.append(name,count);article.append(head);
   const progress=document.createElement('div');progress.className='board-progress';
   const collected=document.createElement('span');collected.id='board-cards-'+board;
   const bingos=document.createElement('span');bingos.id='board-bingos-'+board;
   progress.append(collected,bingos);article.append(progress);
   const grid=document.createElement('div');grid.className='card-grid';
   for(const card of cards){
    const button=document.createElement('button');button.type='button';
    button.className='card '+card.rarity;button.dataset.id=card.id;
    button.setAttribute('aria-label','Karte '+card.slot+' noch nicht entdeckt');
    const back=document.createElement('span');back.className='back';back.textContent='🔒';
    const tag=document.createElement('span');tag.className='rarity';tag.textContent=rarities[card.rarity];
    const stamp=document.createElement('span');stamp.className='stamp';stamp.textContent=card.slot;
    button.append(back,tag,stamp);
    button.addEventListener('click',()=>openCard(card));
    grid.append(button);
   }
   article.append(grid);
   const foot=document.createElement('div');foot.className='board-foot';
   foot.textContent='🏆 10 Bingo-Linien · Belohnungen werden später ergänzt';article.append(foot);
   fragment.append(article);
  }
  $('boards').replaceChildren(fragment);boardBuilt=true;
 }
 function render(){
  if(!data)return;
  if(!boardBuilt)buildBoards();
  const p=data.progress;
  $('owned').textContent=p.collected+' / 96';$('bingos').textContent=p.bingos+' / 60';
  $('coins').textContent=money(data.balance);$('meter-fill').style.width=(p.collected/96*100)+'%';
  const defs=data.definitions||[];
  for(let b=0;b<6;b++){
   const board=p.boards[b];$('board-cards-'+b).textContent=board.collected+' / 16 Karten';
   $('board-bingos-'+b).textContent=board.bingos+' / 10 Bingos';
   $('board-summary-'+b).textContent=Math.round(board.collected/16*100)+' %';
  }
  for(const card of defs){
   const el=document.querySelector('[data-id="'+card.id+'"]');
   if(!el)continue;
   const count=Number(data.cards?.[card.id])||0;
   const owned=count>0;
   el.classList.toggle('owned',owned);
   el.title=owned?card.name+' · '+count+'×':'🔒 Noch nicht gesammelt';
   el.setAttribute('aria-label',owned?card.name+' · '+count+' mal gesammelt':'Karte '+card.slot+' noch nicht entdeckt');
   const previous=el.querySelector('img');
   if(owned&&!previous){
    const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=imageSrc(card);img.alt=card.name;
    el.querySelector('.back')?.replaceWith(img);
   }else if(!owned&&previous){
    previous.remove();const lock=document.createElement('span');lock.className='back';lock.textContent='🔒';el.prepend(lock);
   }
   const board=p.boards[card.board-1];const isBingo=(board?.bingoLines||[]).some(index=>{
    const i=card.slot-1,row=Math.floor(i/4),col=i%4;
    return index===row||(index>=4&&index<8&&index-4===col)||(index===8&&row===col)||(index===9&&row+col===3);
   });
   el.classList.toggle('bingo',owned&&isBingo);
   el.querySelector('.stamp').textContent=count>1?'×'+count:card.slot;
  }
  const packIcon={small:'🎁',large:'💎',premium:'👑'};
  if(!$('packs').children.length){
   for(const pack of data.packs){
    const tile=document.createElement('article');tile.className='pack';
    const art=document.createElement('div');art.className='emoji';art.textContent=packIcon[pack.id]||'🎁';
    const title=document.createElement('h3');title.textContent=pack.name;
    const desc=document.createElement('p');desc.textContent=pack.count+' DOG-Sammelkarten · '+(pack.guaranteedCount?pack.guaranteedCount+' garantierte Ziehungen mindestens '+rarities[pack.guaranteed]:'Zufällige Seltenheiten');
    const rate=document.createElement('p');rate.textContent='⚪ '+pack.weights.common+'% · 🔵 '+pack.weights.rare+'% · 🟣 '+pack.weights.epic+'% · 🟡 '+pack.weights.legendary+'%';
    const button=document.createElement('button');button.type='button';button.dataset.pack=pack.id;button.addEventListener('click',()=>openPack(pack.id));
    tile.append(art,title,desc,rate,button);$('packs').append(tile);
   }
  }
  for(const pack of data.packs){
   const button=document.querySelector('[data-pack="'+pack.id+'"]');if(!button)continue;
   const vouchers=Math.max(0,Number(data.freePacks?.[pack.id])||0);
   button.disabled=busy||(!vouchers&&data.balance<pack.price);
   button.textContent=busy?'⏳ Öffnet …':vouchers?'🎁 Kostenlos öffnen ('+vouchers+' Gutscheine)':money(pack.price)+' · '+pack.count+' Karten';
  }
  const duplicates=data.duplicates||{};
  $('duplicate-count').textContent=number(duplicates.available)+' Duplikate';
  $('ticket-count').textContent=number(duplicates.tickets)+' Monster-Rad-Tickets';
  $('exchange').disabled=busy||!duplicates.canExchange;
  $('exchange').textContent=duplicates.canExchange?'🎟️ 100 Duplikate gegen 1 Dreh tauschen':'🔒 '+Math.max(0,100-(duplicates.available||0))+' bis zum nächsten Monster-Dreh';
 }
 function openCard(card){
  if(!data||Number(data.cards?.[card.id])<1)return;
  $('card-image').src=imageSrc(card);$('card-image').alt=card.name;
  $('card-title').textContent=card.name;
  $('card-subtitle').textContent=card.series+' · '+rarities[card.rarity]+' · '+data.cards[card.id]+'× gesammelt';
  $('card-dialog').showModal();
 }
 function reveal(cards){
  $('reveal-items').replaceChildren();
  for(const card of cards){
   const tile=document.createElement('article');tile.className='reveal-item '+card.rarity;
   const art=document.createElement('img');art.src=imageSrc(card);art.alt=card.name;art.loading='lazy';
   const name=document.createElement('strong');name.textContent=card.name;
   const badge=document.createElement('small');badge.textContent=card.isNew?'🌟 NEU':'🔁 DOPPELT';
   tile.append(art,name,badge);$('reveal-items').append(tile);
  }
  $('reveal-dialog').showModal();
 }
 const keyFor=pack=>'dog-s2-'+(activeUser()?.uid||'guest')+'-'+pack;
 function requestId(pack){
  const key=keyFor(pack);let id;try{id=sessionStorage.getItem(key)}catch{}
  if(!id){id='dog2_'+Date.now()+'_'+Math.random().toString(36).slice(2,14);try{sessionStorage.setItem(key,id)}catch{}}
  return id;
 }
 function clearId(pack){try{sessionStorage.removeItem(keyFor(pack))}catch{}}
 async function openPack(packId){
  if(busy||!data||!activeUser())return;
  const uid=activeUser().uid;busy=true;render();status('🎁 Dein DOG-Kartenpack wird geöffnet …');
  try{
   const out=await api('POST','open',{packId,requestId:requestId(packId)});
   clearId(packId);
   if(activeUser()?.uid!==uid)return;
   data={...data,...out};render();reveal(out.revealed||[]);
   status(out.usedFreePack?'✅ Gratispaket eingelöst – kein Spielgeld abgezogen.':'✅ DOG-Karten wurden deinem Saison-2-Album gutgeschrieben.');
   await load(false);
  }catch(e){
   if(!['Failed to fetch','SERVER_ERROR'].includes(e.message))clearId(packId);
   status('⚠️ '+e.message+' · Bei Netzproblemen denselben Kauf erneut versuchen.');
  }finally{busy=false;render()}
 }
 async function exchange(){
  if(busy||!data?.duplicates?.canExchange)return;
  if(!confirm('100 DOG-Duplikate für einen Monster-Rad-Dreh eintauschen? Deine ersten Karten bleiben erhalten.'))return;
  const uid=activeUser()?.uid;busy=true;render();status('🎟️ Der Tausch wird gesichert …');
  try{
   const out=await api('POST','duplicates/exchange',{requestId:requestId('trade')});
   clearId('trade');if(activeUser()?.uid!==uid)return;
   data={...data,...out};render();status('✅ Monster-Rad-Ticket gutgeschrieben!');
   await load(false);
  }catch(e){if(!['Failed to fetch','SERVER_ERROR'].includes(e.message))clearId('trade');status('⚠️ '+e.message)}
  finally{busy=false;render()}
 }
 async function load(initial=true){
  const user=activeUser();
  if(!user){clear();status('🔒 Bitte melde dich mit deinem Online-Profil an.');return}
  const uid=user.uid,seq=++requestNumber;
  if(initial)status('🔄 Saison-2-Sammlung wird geladen …');
  try{
   const fresh=await api('GET','me');
   if(seq!==requestNumber||activeUser()?.uid!==uid)return;
   if(loadedUser&&loadedUser!==uid)clear();
   loadedUser=uid;data=fresh;render();
   if(initial)status('✅ DOG Saison 2 ist aktiv. Sammle jetzt die 96 neuen Karten!');
  }catch(e){if(seq===requestNumber)status('⚠️ '+e.message+' · „↻“ zum erneuten Prüfen.')}
 }
 let lastUid='';
 window.addEventListener('spielonline-change',()=>{
  const uid=activeUser()?.uid||'';
  if(uid===lastUid)return;
  ++requestNumber;lastUid=uid;clear();
  if(uid)void load();else status(state().status==='initializing'?'🔄 Online-Profil wird geladen …':'🔒 Bitte einloggen, um die neue Sammlung zu sehen.');
 });
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 $('exchange').addEventListener('click',exchange);
 $('reload').addEventListener('click',()=>void load());
 $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{status('Vollbild wird von diesem Gerät nicht unterstützt.')}});
 const room=sessionStorage.getItem('deal-active-room');if(/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/i.test(room||''))$('back').href='./lobby.html?room='+encodeURIComponent(room);
 // Also handle an already-connected profile when this script starts.
 lastUid=activeUser()?.uid||'';if(lastUid)void load();else status('🔄 Online-Profil wird geladen …');
})();
