/* DOG Sammelalbum Saison 2 – offizieller, vom Weihnachtsalbum unabhängiger Client. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 // Resolve artwork relative to this script instead of the embedding page.
 const ROOT=new URL('../Weihnachtsevent2/Sammelalbum_Saison_2_Bilder/',document.currentScript?.src||new URL('./js/dog-album-season2.js',document.baseURI).href).href;
 const BOARD_ICONS=['🎲','🚀','🦖','🎡','🏰','🤠'];
 const rarities={common:'Gewöhnlich',rare:'Selten',epic:'Episch',legendary:'Legendär'};
 const number=n=>(Number(n)||0).toLocaleString('de-DE');
 const money=n=>(Number(n||0)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 let data=null,busy=false,requestNumber=0,loadedUser='',boardBuilt=false;
 let rewardsClaimBusy=false,queuedBingoAwards=[];
 let cyclesClaimBusy=false,queuedCompletions=[],tournamentBusy=false;
 const embedded=!!document.getElementById('dog-season-panel');
 function state(){return window.SpielOnline?.state?.()||{}}
 function activeUser(){const s=state();return s.status==='online'&&s.user?.getIdToken?s.user:null}
 function status(text){$('status').textContent=text}
 function imageSrc(card){return ROOT+encodeURIComponent(card.image)}
 function displayArtwork(img,card,loading='eager'){
  const source=imageSrc(card);
  img.alt=card.name||'DOG-Sammelkarte';
  img.loading=loading;img.decoding='async';
  if(window.ChristmasCardImages?.guard&&window.ChristmasCardImages?.show){
   window.ChristmasCardImages.guard(img);
   window.ChristmasCardImages.show(img,source);
  }else{
   img.onerror=()=>{img.onerror=null;img.src=new URL('../../assets/weihnachts_event/card-back-winter.svg',ROOT).href;};
   img.src=source;
  }
 }
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
  data=null;loadedUser='';boardBuilt=false;$('login').hidden=!!activeUser();$('boards').replaceChildren();$('packs').replaceChildren();
  $('owned').textContent='0 / 96';$('bingos').textContent='0 / 60';$('coins').textContent='–';$('meter-fill').style.width='0%';
  $('duplicate-count').textContent='0 Duplikate';$('ticket-count').textContent='0 Monster-Rad-Tickets';$('exchange').disabled=true;
  $('reward-milestones')?.replaceChildren();if($('reward-summary'))$('reward-summary').textContent='0 / 30 Meilensteine erhalten';
  for(const id of ['dog-cycle-total','dog-super-count','dog-tourney-points'])if($(id))$(id).textContent='0';
  $('dog-tournament-ranking')?.replaceChildren();queuedCompletions=[];
  if($('dog-wildcard-count'))$('dog-wildcard-count').textContent='0 verfügbar';
  if($('dog-wildcard-use'))$('dog-wildcard-use').disabled=true;
  if($('dog-wildcard-dialog')?.open)$('dog-wildcard-dialog').close();
 }
 function showTab(tab){
  for(const name of ['album','rewards','packs','duplicates','super','tournament'])$(name+'-panel').hidden=tab!==name;
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
    button.className='card '+card.rarity+(card.slot===16?' jackpot':'');button.dataset.id=card.id;
    button.setAttribute('aria-label',card.slot===16?'Legendäre 1-zu-500-Karte noch nicht entdeckt':'Karte '+card.slot+' noch nicht entdeckt');
    const back=document.createElement('span');back.className='back';back.textContent='🔒';
    const tag=document.createElement('span');tag.className='rarity';tag.textContent=card.slot===16?'👑 1:500':rarities[card.rarity];
    const stamp=document.createElement('span');stamp.className='stamp';stamp.textContent=card.slot;
    button.append(back,tag,stamp);
    button.addEventListener('click',()=>openCard(card));
    grid.append(button);
   }
   article.append(grid);
   const foot=document.createElement('div');foot.className='board-foot';
   foot.id='dog-board-cycle-'+board;
   foot.textContent='🏆 10 Bingo-Linien · Wiederholbar mit 5er-Super-Slot';article.append(foot);
   fragment.append(article);
  }
  $('boards').replaceChildren(fragment);boardBuilt=true;
 }


 function boardCycleOwned(progress,card){
  return progress?.boards?.[card.board-1]?.ownedSlots?.[card.slot-1]===true;
 }
 function queueCompletedBoards(boards){
  if(!Array.isArray(boards)||!boards.length)return;
  queuedCompletions.push(...boards);
  showQueuedCompletions();
 }
 function showQueuedCompletions(){
  const dialog=$('dog-cycle-complete-dialog');
  if(!dialog||dialog.open||$('reveal-dialog')?.open||$('card-dialog')?.open||
   $('bingo-reward-dialog')?.open||$('dog-super-slot-dialog')?.open||!queuedCompletions.length)return;
  const boards=queuedCompletions.splice(0),root=$('dog-cycle-complete-content');
  root.replaceChildren(...boards.map(board=>{
   const row=document.createElement('p');
   row.textContent='🏆 '+String(board.name)+' – Runde '+board.round+' abgeschlossen! 🎰 +1 Super-Slot-Dreh';
   return row;
  }));
  dialog.showModal();
 }
 async function claimExistingCycles(){
  if(cyclesClaimBusy||busy||!activeUser()||!data?.progress?.boards?.some(b=>b.readyToComplete))return;
  const uid=activeUser().uid;cyclesClaimBusy=true;
  try{
   const result=await api('POST','cycles/claim');
   if(activeUser()?.uid!==uid)return;
   data.progress=result.progress;
   data.lifetimeProgress=result.lifetimeProgress;
   render();
   queueCompletedBoards(result.completedBoards);
  }catch(e){if(activeUser()?.uid===uid)status('⚠️ DOG-Tafelabschluss noch nicht bestätigt: '+(e.message||e))}
  finally{cyclesClaimBusy=false;if(data)render()}
 }
 async function loadTournament(){
  if(tournamentBusy||!activeUser())return;
  const uid=activeUser().uid;tournamentBusy=true;
  $('dog-tournament-refresh').disabled=true;
  $('dog-tournament-status').textContent='🔄 DOG-Monatsrangliste wird geladen …';
  try{
   const out=await api('GET','tournament');
   if(activeUser()?.uid!==uid)return;
   const root=$('dog-tournament-ranking');
   root.replaceChildren(...(out.leaderboard||[]).map(player=>{
    const row=document.createElement('article');row.className='dog-tournament-entry';row.dataset.me=player.isMe?'yes':'no';
    const place=document.createElement('span');place.className='dog-tourney-rank';
    place.textContent=player.rank===1?'🥇':player.rank===2?'🥈':player.rank===3?'🥉':String(player.rank)+'.';
    const name=document.createElement('span');name.className='dog-tourney-player';
    name.textContent=String(player.name||'Spieler')+(player.isMe?' · Du':'')+' · '+player.completed+' volle DOG-Tafeln';
    const points=document.createElement('strong');points.className='dog-tourney-score';
    points.textContent=number(player.points)+' P.';
    row.append(place,name,points);return row;
   }));
   $('dog-tournament-status').textContent=(out.leaderboard?.length||0)
    ?'✅ DOG-Turnier '+out.month+' · Bestenliste der 20 Punktestärksten'
    :'🏆 Noch keine DOG-Turnierpunkte in diesem Monat – sammle die ersten Karten!';
  }catch(e){if(activeUser()?.uid===uid)$('dog-tournament-status').textContent='⚠️ Turnier nicht erreichbar: '+(e.message||e)}
  finally{tournamentBusy=false;$('dog-tournament-refresh').disabled=false}
 }
 const CHESTS={wood:['🪵','Holzkiste'],iron:['⚙️','Eisenkiste'],silver:['🥈','Silberkiste'],gold:['🥇','Goldkiste'],legendary:['💎','Legendäre Kiste']};
 function renderRewards(){
  const root=$('reward-milestones'),rewards=data?.rewards;
  if(!root||!rewards)return;
  const total=rewards.claimed||0,pending=rewards.pending||[];
  $('reward-summary').textContent='🏆 '+total+' / 30 einmalige Meilensteine erhalten · '+(data.lifetimeProgress?.bingos??data.progress?.bingos??0)+' / 60 ursprüngliche DOG-Bingos';
  $('claim-bingo-rewards').hidden=!pending.length;
  $('claim-bingo-rewards').disabled=rewardsClaimBusy||!pending.length;
  $('claim-bingo-rewards').textContent=rewardsClaimBusy?'⏳ Gewinne werden gebucht …':'🎁 '+pending.length+' Bingo-'+(pending.length===1?'Belohnung':'Belohnungen')+' erhalten';
  const fragment=document.createDocumentFragment();
  for(const m of rewards.milestones||[]){
   const chest=CHESTS[m.tier]||['🎁',m.tier],article=document.createElement('article');
   article.className='reward-milestone '+m.state+' '+m.tier;
   const icon=document.createElement('div');icon.className='reward-icon';icon.textContent=chest[0];
   const content=document.createElement('div');content.className='reward-text';
   const title=document.createElement('strong');title.textContent='Bingo '+m.at+' · '+(m.chests>1?m.chests+'× ':'')+chest[1];
   const detail=document.createElement('p');
   detail.textContent=m.state==='claimed'?'🎉 '+(m.bonuses||[]).map(b=>b.label).join(' · '):
    '🎲 '+m.extraCount+' zusätzliche '+(m.extraCount===1?'Zufallsbelohnung':'Zufallsbelohnungen');
   const sub=document.createElement('small');
   sub.textContent=m.state==='claimed'?'Alle Gewinne gutgeschrieben':
    m.state==='ready'?'Bingo-Ziel erreicht · Auszahlen':m.at+' von 60 Bingos benötigt';
   content.append(title,detail,sub);
   const flag=document.createElement('span');flag.className='reward-state';
   flag.textContent=m.state==='claimed'?'✓ Erhalten':m.state==='ready'?'🎁 Bereit':'🔒';
   article.append(icon,content,flag);fragment.append(article);
  }
  root.replaceChildren(fragment);
 }
 function revealBingoAwards(awards){
  if(!Array.isArray(awards)||!awards.length)return;
  queuedBingoAwards.push(...awards);
  showQueuedBingoAwards();
 }
 function showQueuedBingoAwards(){
  const dlg=$('bingo-reward-dialog');
  if(!dlg||dlg.open||$('reveal-dialog')?.open||$('card-dialog')?.open||!queuedBingoAwards.length)return;
  const awards=queuedBingoAwards.splice(0),root=$('bingo-dialog-awards');
  root.replaceChildren();
  for(const award of awards){
   const article=document.createElement('article');article.className='bingo-award';
   const h=document.createElement('h3');h.textContent='🏆 '+award.at+' Bingos geschafft!';
   article.append(h);
   const chest=document.createElement('p');
   chest.textContent='🎁 '+award.chests.length+'× '+(CHESTS[award.chestTier]?.[1]||award.chestLabel)+' · Rohstoffe beim Öffnen';
   article.append(chest);
   for(const bonus of award.bonuses){
    const p=document.createElement('p');p.textContent='✨ '+bonus.label;article.append(p);
   }
   root.append(article);
  }
  dlg.showModal();
 }
 function pendingRewards(){return Array.isArray(data?.rewards?.pending)?data.rewards.pending.length:0}
 async function claimBingoRewards(){
  if(rewardsClaimBusy||busy||!pendingRewards()||!activeUser())return;
  const uid=activeUser().uid;rewardsClaimBusy=true;renderRewards();
  $('reward-claim-status').textContent='⏳ Deine Bingo-Kisten und Bonusgewinne werden gespeichert …';
  try{
   const result=await api('POST','rewards/claim');
   if(activeUser()?.uid!==uid)return;
   // Update rewards and wallet, but never roll back concurrently opened cards.
   data.rewards=result.rewards;
   if(Number.isSafeInteger(result.balance))data.balance=result.balance;
   render();
   $('reward-claim-status').textContent=result.awarded?.length
    ?'✅ '+result.awarded.length+' Meilenstein-'+(result.awarded.length===1?'Belohnung':'Belohnungen')+' sicher gutgeschrieben!'
    :'✅ Alle erreichten Bingo-Belohnungen sind bereits gutgeschrieben.';
   if(result.awarded?.length)revealBingoAwards(result.awarded);
  }catch(e){
   if(activeUser()?.uid===uid)$('reward-claim-status').textContent='⚠️ Gewinne noch nicht bestätigt: '+(e.message||e)+'. Erneut abholen ist sicher.';
  }finally{rewardsClaimBusy=false;renderRewards()}
 }
 function maybeClaimBingos(){
  if(pendingRewards()&&!rewardsClaimBusy&&!busy&&activeUser()&&(!embedded||!$('dog-season-panel').hidden))void claimBingoRewards();
 }
 function render(){
  if(!data)return;
  if(!boardBuilt)buildBoards();
  const p=data.progress;
  $('owned').textContent=p.collected+' / 96';$('bingos').textContent=p.bingos+' / 60';
  $('coins').textContent=money(data.balance);$('meter-fill').style.width=(p.collected/96*100)+'%';
  $('dog-cycle-total').textContent=number(p.completedTotal||0);
  $('dog-super-count').textContent=number(p.superSlotTickets||0);
  $('dog-tourney-points').textContent=number(p.tournament?.points||0);
  $('dog-super-tickets').textContent=number(p.superSlotTickets||0)+' verfügbare Super-Slot-'+((p.superSlotTickets||0)===1?'Dreh':'Drehs');
  $('dog-super-play').disabled=busy||cyclesClaimBusy||!(p.superSlotTickets>0);
  if($('dog-wildcard-count')){
   const count=Number(data.wildcardTickets||p.wildcardTickets)||0;
   $('dog-wildcard-count').textContent=number(count)+' Joker-Sammelkarte'+(count===1?'':'n')+' verfügbar';
   $('dog-wildcard-use').disabled=busy||count<1||!(data.definitions||[]).some(card=>!boardCycleOwned(data.progress,card));
   $('dog-wildcard-use').textContent=count>0?'❓ Wunschkarte wählen':'🔒 Noch keine Joker-Karte';
  }
  $('dog-tournament-personal').textContent=number(p.tournament?.points||0)+' Monatspunkte';
  $('dog-tournament-month').textContent='📅 Turnier '+String(p.tournament?.month||'');
  if(embedded&&activeUser()?.uid)window.dispatchEvent(new CustomEvent('dog-s2-progress',{detail:{uid:activeUser().uid,progress:p}}));
  const defs=data.definitions||[];
  for(let b=0;b<6;b++){
   const board=p.boards[b];$('board-cards-'+b).textContent=board.collected+' / 16 Karten';
   $('board-bingos-'+b).textContent=board.bingos+' / 10 Bingos';
   $('board-summary-'+b).textContent='Runde '+board.round+' · '+Math.round(board.collected/16*100)+' %';
   $('dog-board-cycle-'+b).textContent='🏆 '+number(board.completions||0)+'× komplett abgeschlossen · '+(board.readyToComplete?'🎁 Super-Slot wird freigeschaltet':'Nächste Belohnung bei 16/16 DOG-Karten');
  }
  for(const card of defs){
   const el=document.querySelector('[data-id="'+card.id+'"]');
   if(!el)continue;
   const count=Number(data.cards?.[card.id])||0;
   const owned=boardCycleOwned(data.progress,card);
   el.classList.toggle('owned',owned);
   el.title=owned?card.name+' · '+count+'× im Archiv'+(card.slot===16?' · legendäre 1:500-Karte':''):
    count>0?'🔒 Für die neue DOG-Sammelrunde erneut ziehen · '+count+'× dauerhaft im Archiv':
    card.slot===16?'👑 Legendärer Schatz · Chance 1:500 pro Karte aus diesem Block':'🔒 Noch nicht gesammelt';
   el.setAttribute('aria-label',owned?card.name+' für diese DOG-Sammelrunde gesammelt':
    count>0?card.name+' im Archiv vorhanden, in der neuen Runde noch nicht gesammelt':
    card.slot===16?'Legendäre 1-zu-500-Karte noch nicht entdeckt':'Karte '+card.slot+' noch nicht entdeckt');
   const previous=el.querySelector('img');
   if(owned&&!previous){
    const img=document.createElement('img');displayArtwork(img,card,'lazy');
    el.querySelector('.back')?.replaceWith(img);
   }else if(!owned&&previous){
    previous.remove();const lock=document.createElement('span');lock.className='back';lock.textContent='🔒';el.prepend(lock);
   }
   const board=p.boards[card.board-1];const isBingo=(board?.bingoLines||[]).some(index=>{
    const i=card.slot-1,row=Math.floor(i/4),col=i%4;
    return index===row||(index>=4&&index<8&&index-4===col)||(index===8&&row===col)||(index===9&&row+col===3);
   });
   el.classList.toggle('bingo',owned&&isBingo);
   el.querySelector('.stamp').textContent=owned&&count>1?'×'+count:card.slot;
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
   button.disabled=busy||(!vouchers&&(data.purchasesEnabled===false||data.balance<pack.price));
   button.textContent=busy?'⏳ Öffnet …':vouchers?'🎁 Kostenlos öffnen ('+vouchers+' Gutscheine)':data.purchasesEnabled===false?'🔒 Käufe derzeit deaktiviert':money(pack.price)+' · '+pack.count+' Karten';
  }
  const duplicates=data.duplicates||{};
  $('duplicate-count').textContent=number(duplicates.available)+' Duplikate';
  $('ticket-count').textContent=number(duplicates.tickets)+' Monster-Rad-Tickets';
  $('exchange').disabled=busy||!duplicates.canExchange;
  $('exchange').textContent=duplicates.canExchange?'🎟️ 100 Duplikate gegen 1 Dreh tauschen':'🔒 '+Math.max(0,100-(duplicates.available||0))+' bis zum nächsten Monster-Dreh';
  renderRewards();
 }
 function openCard(card){
  if(!data||Number(data.cards?.[card.id])<1)return;
  displayArtwork($('card-image'),card);
  $('card-title').textContent=card.name;
  $('card-subtitle').textContent=card.series+' · '+rarities[card.rarity]+' · '+data.cards[card.id]+'× gesammelt';
  $('card-dialog').showModal();
 }
 function reveal(cards){
  $('reveal-items').replaceChildren();
  for(const card of cards){
   const tile=document.createElement('article');tile.className='reveal-item '+card.rarity;
   const art=document.createElement('img');displayArtwork(art,card);
   const name=document.createElement('strong');name.textContent=card.name;
   const badge=document.createElement('small');badge.textContent=card.isNew?'🌟 NEU':'🔁 DOPPELT';
   tile.append(art,name,badge);$('reveal-items').append(tile);
  }
  $('reveal-dialog').showModal();
 }
 // One pending request per profile, preserving selected card and receipt ID
 // across a failed connection. Never change the card on a retry.
 const wildcardKey=uid=>'dog-s2-wildcard-pending:'+uid;
 function pendingWildcard(uid){try{
  const item=JSON.parse(sessionStorage.getItem(wildcardKey(uid))||'null');
  return item&&typeof item.requestId==='string'&&typeof item.cardId==='string'?item:null;
 }catch{return null}}
 function rememberWildcard(uid,item){try{sessionStorage.setItem(wildcardKey(uid),JSON.stringify(item))}catch{}}
 function forgetWildcard(uid){try{sessionStorage.removeItem(wildcardKey(uid))}catch{}}
 function openWildcardChooser(){
  if(!data||busy||!activeUser())return;
  const dlg=$('dog-wildcard-dialog'),root=$('dog-wildcard-choices');
  const available=new Set((data.definitions||[]).filter(card=>!boardCycleOwned(data.progress,card)).map(card=>card.id));
  if(Number(data.wildcardTickets||0)<1||available.size===0)return;
  root.replaceChildren();
  for(const card of data.definitions||[]){
   if(!available.has(card.id))continue;
   const option=document.createElement('button');option.type='button';option.className='dog-wildcard-choice '+card.rarity;
   if(card.slot===16)option.classList.add('ultimate');
   const num=document.createElement('span');num.className='dog-wildcard-choice-number';num.textContent='❓ '+card.board+'-'+String(card.slot).padStart(2,'0');
   const info=document.createElement('span');info.className='dog-wildcard-choice-label';
   const name=document.createElement('strong');name.textContent=card.name;
   const sub=document.createElement('small');sub.textContent=card.series+' · '+rarities[card.rarity]+(card.slot===16?' · ULTRASELTENE 1:500-KARTE':'');
   info.append(name,sub);
   const pick=document.createElement('b');pick.textContent='WÄHLEN';
   option.append(num,info,pick);
   option.onclick=()=>void redeemWildcard(card);
   root.append(option);
  }
  $('dog-wildcard-status').textContent='Verfügbar: '+number(data.wildcardTickets)+' Joker-Sammelkarte(n) · '+root.children.length+' fehlende Motive';
  if(!dlg.open)dlg.showModal();
 }
 async function redeemWildcard(card,resume=false){
  const uid=activeUser()?.uid;
  if(!uid||busy||!data)return;
  const stored=pendingWildcard(uid);
  const pending=resume?stored:(stored&&stored.cardId===card.id?stored:null);
  if(resume&&!pending)return;
  const request={cardId:card.id,requestId:pending?.requestId||'dogwild_'+crypto.randomUUID().replace(/-/g,'')};
  if(!resume&&!confirm('❓ Joker-Sammelkarte wirklich für „'+card.name+'“ einlösen? Diese Karte wird danach sofort freigeschaltet.'))return;
  rememberWildcard(uid,request);
  busy=true;render();$('dog-wildcard-status').textContent='⏳ Wunschkarte wird sicher verbucht …';
  try{
   const out=await api('POST','wildcards/redeem',request);
   if(activeUser()?.uid!==uid)return;
   forgetWildcard(uid);data={...data,...out};
   if($('dog-wildcard-dialog').open)$('dog-wildcard-dialog').close();
   render();status('🌟 JOKER-KARTE! „'+out.card.name+'“ ist jetzt im DOG-Album freigeschaltet!');
   reveal([out.card]);queueCompletedBoards(out.completedBoards);
  }catch(e){
   if(activeUser()?.uid!==uid)return;
   if(['INVALID_REQUEST_ID','INVALID_DOG_WILDCARD_CARD','DOG_CARD_ALREADY_COLLECTED','DOG_WILDCARD_REQUIRED'].includes(e.message))forgetWildcard(uid);
   status('⚠️ Joker-Einlösung: '+e.message+(pendingWildcard(uid)?' · Letzte Auswahl wird beim nächsten Laden wiederholt.':''));
   $('dog-wildcard-status').textContent=e.message;
  }finally{busy=false;render();maybeClaimBingos()}
 }
 function recoverWildcard(){
  const uid=activeUser()?.uid,entry=uid&&pendingWildcard(uid);
  const card=entry&&data?.definitions?.find(c=>c.id===entry.cardId);
  if(card&&!busy)void redeemWildcard(card,true);
 }
 $('dog-wildcard-use')?.addEventListener('click',openWildcardChooser);
 $('dog-wildcard-cancel')?.addEventListener('click',()=>$('dog-wildcard-dialog').close());
 $('dog-wildcard-close')?.addEventListener('click',()=>$('dog-wildcard-dialog').close());

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
   const out=await api('POST','open',{packId,requestId:requestId(packId),expectedPrice:data.packs?.find(p=>p.id===packId)?.price});
   clearId(packId);
   if(activeUser()?.uid!==uid)return;
   data={...data,...out};render();reveal(out.revealed||[]);queueCompletedBoards(out.completedBoards);
   status(out.usedFreePack?'✅ Gratispaket eingelöst – kein Spielgeld abgezogen.':'✅ DOG-Karten wurden deinem Saison-2-Album gutgeschrieben.');
   // Der quittierte POST enthält den aktuellen Stand; kein zusätzlicher Firestore-GET.
  }catch(e){
   if(!['Failed to fetch','SERVER_ERROR'].includes(e.message))clearId(packId);
   status('⚠️ '+(e.message==='PRICE_CHANGED'?'Der Host hat den Preis geändert. Aktualisiere die Paketpreise.':e.message==='PACK_PURCHASES_DISABLED'?'Der Host hat den Paketkauf deaktiviert.':e.message)+' · Bei Netzproblemen denselben Kauf erneut versuchen.');
    if(['PRICE_CHANGED','PACK_PURCHASES_DISABLED'].includes(e.message))setTimeout(()=>void load(false),0);
  }finally{busy=false;render();maybeClaimBingos()}
 }
 async function exchange(){
  if(busy||!data?.duplicates?.canExchange)return;
  if(!confirm('100 DOG-Duplikate für einen Monster-Rad-Dreh eintauschen? Deine ersten Karten bleiben erhalten.'))return;
  const uid=activeUser()?.uid;busy=true;render();status('🎟️ Der Tausch wird gesichert …');
  try{
   const out=await api('POST','duplicates/exchange',{requestId:requestId('trade')});
   clearId('trade');if(activeUser()?.uid!==uid)return;
   data={...data,...out};render();status('✅ Monster-Rad-Ticket gutgeschrieben!');
   // Der quittierte POST enthält den aktuellen Stand; kein zusätzlicher Firestore-GET.
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
   loadedUser=uid;data=fresh;$('login').hidden=true;render();
   if(initial)status('✅ DOG Saison 2 ist aktiv. Jede vollständige DOG-Tafel bringt einen Fünf-Walzen-Slot!');
   maybeClaimBingos();void claimExistingCycles();window.DogSuperSlots?.tryRecover?.();recoverWildcard();
  }catch(e){if(seq===requestNumber)status('⚠️ '+e.message+' · „↻“ zum erneuten Prüfen.')}
 }
 function acceptHubData(info){
  const uid=activeUser()?.uid;
  if(!uid||info?.uid!==uid||!info?.data?.ok)return false;
  if(loadedUser&&loadedUser!==uid)clear();
  ++requestNumber;loadedUser=uid;data=info.data;$('login').hidden=true;
  render();status('✅ Dein DOG-Sammelfortschritt ist geladen.');maybeClaimBingos();void claimExistingCycles();window.DogSuperSlots?.tryRecover?.();recoverWildcard();
  return true;
 }
 function openIntegratedTab(tab){
  showTab(tab);
  if(embedded&&!data&&activeUser()&&!acceptHubData(window.__dogSeason2HubData))void load();
  else maybeClaimBingos();
  if(tab==='tournament')void loadTournament();
 }
 window.DogAlbumSeason2={open:openIntegratedTab,refresh:()=>load(),acceptHubData,
  superTickets:()=>Number(data?.progress?.superSlotTickets||0)};
 window.addEventListener('dog-s2-hub-data',event=>acceptHubData(event.detail));
 let lastUid='';
 window.addEventListener('spielonline-change',()=>{
  const uid=activeUser()?.uid||'';
  if(uid===lastUid)return;
  ++requestNumber;lastUid=uid;clear();
  if(!uid){status(state().status==='initializing'?'🔄 Online-Profil wird geladen …':'🔒 Bitte einloggen, um die neue Sammlung zu sehen.');return}
  if(!acceptHubData(window.__dogSeason2HubData)&&(!embedded||!$('dog-season-panel').hidden))void load();
 });
 $('claim-bingo-rewards')?.addEventListener('click',claimBingoRewards);
 $('album-show-rewards')?.addEventListener('click',()=>{openIntegratedTab('rewards');if(embedded){const url=new URL(location.href);url.searchParams.set('view','rewards');history.replaceState(history.state,'',url)}});
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
  showTab(b.dataset.tab);
  if(b.dataset.tab==='tournament')void loadTournament();
  if(embedded){
   const url=new URL(location.href);url.searchParams.set('view',b.dataset.tab);
   history.replaceState(history.state,'',url);
  }
 }));
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{b.closest('dialog').close();showQueuedBingoAwards();showQueuedCompletions()}));
 for(const id of ['reveal-dialog','card-dialog','bingo-reward-dialog'])$(id)?.addEventListener('close',()=>{
  showQueuedBingoAwards();showQueuedCompletions();
 });
 $('dog-cycle-complete-ok')?.addEventListener('click',()=>{$('dog-cycle-complete-dialog').close();openIntegratedTab('super');showQueuedCompletions()});
 $('dog-tournament-refresh')?.addEventListener('click',()=>void loadTournament());
 $('exchange').addEventListener('click',exchange);
 $('login').addEventListener('click',()=>window.SpielOnline?.openLogin?.());
 $('reload')?.addEventListener('click',()=>void load());
 $('fullscreen')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{status('Vollbild wird von diesem Gerät nicht unterstützt.')}});
 const room=sessionStorage.getItem('deal-active-room'),back=$('back');
 if(back&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/i.test(room||''))back.href='./lobby.html?room='+encodeURIComponent(room);
 lastUid=activeUser()?.uid||'';
 $('login').hidden=!!lastUid;
 const initialView=new URLSearchParams(location.search).get('view');
 if(embedded){
  showTab(['packs','duplicates','rewards','super','tournament'].includes(initialView)?initialView:'album');
  if(initialView==='tournament')void loadTournament();
  if(!acceptHubData(window.__dogSeason2HubData)&&lastUid&&!$('dog-season-panel').hidden)void load();
 }else{
  if(location.hash==='#packs')showTab('packs');else if(location.hash==='#duplicates')showTab('duplicates');
  if(lastUid)void load();
 }
})();