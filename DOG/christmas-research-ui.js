/**
 * DOG Weihnachtsforschung · ice-blue dashboard.
 * Pure presentation on top of the existing, server-authoritative research API.
 * Never derives spendable points, purchases, rewards or entitlement from the UI.
 */
export function initChristmasResearch(){
 const $=id=>document.getElementById(id);
 const root=$('dog-research-shell');
 if(!root)return {load:async()=>{}};
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-research-status'),summary=$('dog-research-summary');
 const cards=$('dog-research-cards'),details=$('dog-research-detail');
 const filters=$('dog-research-filters'),sortSelect=$('dog-research-sort');
 const groupLabels={game:'Spiel & Karten',xp:'Spielerlevel & Erfahrung',scratch:'Lose & Belohnungen',village:'Weihnachtsdorf'};
 const grinchIds=new Set(['thaw']);
 const categories=[
  {id:'all',icon:'✦',name:'Alle Forschungen'},
  {id:'game',icon:'🃏',name:'Spiel & Karten'},
  {id:'grinch',icon:'⚔️',name:'Grinch-Missionen'},
  {id:'xp',icon:'⭐',name:'Level & Erfahrung'},
  {id:'scratch',icon:'🎟️',name:'Lose & Events'},
  {id:'village',icon:'🏘️',name:'Weihnachtsdorf'}
 ];
 const user=()=>{
  const profile=window.SpielOnline?.state?.();
  return profile?.status==='online'&&profile?.user?.getIdToken?profile.user:null;
 };
 const el=(tag,cls,content)=>{
  const value=document.createElement(tag);
  if(cls)value.className=cls;
  if(content!==undefined)value.textContent=String(content);
  return value;
 };
 const fmt=n=>new Intl.NumberFormat('de-DE').format(Number(n)||0);
 // Optional high-quality images from the uploadable DOG research graphic pack.
 // The emoji remains a working fallback until each image is uploaded to GitHub.
 const researchArt=skill=>{
  const img=document.createElement('img');
  img.className='dr-skill-image';
  img.alt='';
  img.loading='lazy';
  img.decoding='async';
  img.src='./assets/research/'+encodeURIComponent(skill.id)+'.webp';
  img.addEventListener('load',()=>img.parentElement?.classList.add('has-art'),{once:true});
  img.addEventListener('error',()=>{img.parentElement?.classList.remove('has-art');img.remove();},{once:true});
  return img;
 };
 const field=(tag,cls,label,value)=>{
  const wrap=el(tag,cls);
  wrap.append(el('span','dr-field-label',label),el('strong','dr-field-value',value));
  return wrap;
 };
 let data=null,serverData=null,category='all',sort='recommended',view='grid',selectedId='card_swap';
 let working=false,pending=null,pendingUid=null,requestId=0,ticketTier='simple';
 // Prevent repeated Firestore reads on harmless login/profile events.
 const RESEARCH_VIEW_CACHE_MS=45000;
 let accountUid=user()?.uid||null,loadedUid=null,loadedAt=0;
 const reportResearchBadge=()=>{
  if(serverData&&user()&&!window.DOGChristmasDev?.isActive())
   window.dispatchEvent(new CustomEvent('dog-christmas-badges-update',{
    detail:{research:Math.max(0,Number(serverData.available)||0)}
   }));
 };

 const levelOf=skill=>Number(data?.levels?.[skill.id])||0;
 const maxed=skill=>levelOf(skill)>=skill.maxLevel;
 const affordable=skill=>skill.enabled&&Number.isInteger(skill.nextCost)&&data.available>=skill.nextCost;

 function valueAt(skill,level){
  if(level<=0)return 'Noch nicht erforscht';
  switch(skill.id){
   case 'xp':return '+'+(level*10)+' % DOG-XP';
   case 'win_xp':return '+'+(level*30)+' % Sieger-XP';
   case 'discount':return (level*2)+' % persönlicher Losrabatt';
   case 'coin_bonus':return '+'+(level*2)+' % Münzbonus';
   case 'pity':return '1 einfaches Los nach '+(10-level)+' Nieten';
   case 'free_ticket':return '1 Gratislos alle '+Math.max(6,24-2*(level-1))+' Stunden';
   case 'lights_bonus':return '+'+(level*5)+' % Weihnachtslichter';
   case 'builder':return level+' ⭐ alle 2 Stunden';
   case 'card_swap':return '1 Kartentausch pro Partie';
   case 'spot_ticket':return '1 privat sichtbares Losfeld';
   case 'spot_light':return '1 privat sichtbares Lichtfeld';
   case 'thaw':return level+' Befreiung'+(level===1?'':'en')+' pro Mission';
   default:return skill.steps;
  }
 }
 function shortValue(skill,level){
  if(level<1)return 'Noch nicht aktiv';
  switch(skill.id){
   case 'xp':return '+'+(level*10)+' % XP';
   case 'win_xp':return '+'+(level*30)+' % Sieger-XP';
   case 'discount':return '−'+(level*2)+' % Preis';
   case 'coin_bonus':return '+'+(level*2)+' % Münzen';
   case 'lights_bonus':return '+'+(level*5)+' % Lichter';
   case 'free_ticket':return 'Alle '+Math.max(6,24-2*(level-1))+' Std.';
   case 'pity':return 'Nach '+(10-level)+' Nieten';
   case 'builder':return '+'+level+' ⭐ / 2 Std.';
   case 'card_swap':return '1 Kartentausch';
   case 'thaw':return level+' Befreiung'+(level===1?'':'en');
   case 'spot_ticket':return '1 geheimes Losfeld';
   case 'spot_light':return '1 geheimes Lichtfeld';
   default:return valueAt(skill,level);
  }
 }
 function nextGain(skill,level){
  if(level>=skill.maxLevel)return 'Maximaler Vorteil erreicht';
  switch(skill.id){
   case 'xp':return '+10 % mehr DOG-XP';
   case 'win_xp':return '+30 % mehr Sieger-XP';
   case 'discount':return '+2 Prozentpunkte Rabatt';
   case 'coin_bonus':return '+2 Prozentpunkte Münzbonus';
   case 'lights_bonus':return '+5 Prozentpunkte Weihnachtslichter';
   case 'pity':return '1 Niete weniger bis zum Gratislos';
   case 'free_ticket':return '2 Stunden kürzere Wartezeit';
   case 'builder':return '+1 Licht je Abholung';
   case 'thaw':return '+1 Befreiung pro Mission';
   case 'card_swap':return '1 Kartentausch pro Partie freischalten';
   case 'spot_ticket':return '1 geheimes Losfeld freischalten';
   case 'spot_light':return '1 geheimes Lichtfeld freischalten';
   default:return valueAt(skill,level+1);
  }
 }
 function bonusTile(label,value,cls){
  const box=el('div','dr-card-benefit '+cls);
  box.append(el('span','dr-card-benefit-label',label),el('strong','dr-card-benefit-value',value));
  return box;
 }
 function groupFor(skill){
  if(grinchIds.has(skill.id))return 'Grinch-Missionen';
  return groupLabels[skill.category]||'Weihnachtsforschung';
 }
 function belongs(skill,id){
  if(id==='all')return true;
  if(id==='grinch')return grinchIds.has(skill.id);
  if(id==='game')return skill.category==='game'&&!grinchIds.has(skill.id);
  if(id==='xp')return skill.category==='xp'&&!grinchIds.has(skill.id);
  if(id==='scratch')return skill.category==='scratch';
  return id==='village'&&skill.category==='village';
 }
 function visibleSkills(){
  if(!data)return [];
  const list=data.skills.filter(skill=>belongs(skill,category));
  if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'de'));
  if(sort==='progress')list.sort((a,b)=>(levelOf(b)/b.maxLevel)-(levelOf(a)/a.maxLevel)||a.name.localeCompare(b.name,'de'));
  if(sort==='cost')list.sort((a,b)=>(a.nextCost??999)-(b.nextCost??999)||a.name.localeCompare(b.name,'de'));
  return list;
 }
 function message(text,error=false){
  status.hidden=false;
  status.textContent=text;
  status.dataset.error=String(error);
 }
 function drawFilters(){
  filters.replaceChildren();
  for(const cat of categories){
   const count=data?.skills.filter(skill=>belongs(skill,cat.id)).length||0;
   const btn=el('button','dog-research-filter'+(category===cat.id?' is-active':''),undefined);
   btn.type='button';btn.setAttribute('aria-pressed',String(category===cat.id));
   btn.dataset.category=cat.id;
   btn.append(el('span','dr-filter-icon',cat.icon),el('span','dr-filter-name',cat.name),el('span','dr-filter-count',count));
   btn.addEventListener('click',()=>{
    category=cat.id;
    if(data&&!data.skills.some(skill=>skill.id===selectedId&&belongs(skill,category)))
      selectedId=visibleSkills()[0]?.id||null;
    render();
   });
   filters.append(btn);
  }
 }
 function progressBar(level,max){
  const track=el('div','dr-card-progress');
  track.setAttribute('role','progressbar');
  track.setAttribute('aria-valuenow',String(level));
  track.setAttribute('aria-valuemin','0');
  track.setAttribute('aria-valuemax',String(max));
  const fill=el('span','dr-card-progress-fill');fill.style.width=(100*level/max)+'%';
  track.append(fill);return track;
 }
 function renderCard(skill){
  const level=levelOf(skill),isSelected=selectedId===skill.id,isMax=level>=skill.maxLevel;
  const btn=el('button','dog-research-card'+(isSelected?' is-selected':'')+(isMax?' is-max':'')+(!skill.enabled?' is-preview':''));
  btn.type='button';btn.dataset.skillId=skill.id;btn.dataset.researchArt=skill.id;
  btn.setAttribute('aria-pressed',String(isSelected));
  btn.setAttribute('aria-label',skill.name+', Stufe '+level+' von '+skill.maxLevel+'. Aktuell: '+shortValue(skill,level)+'. '+(isMax?'Maximale Stufe erreicht.':'Nächste Stufe: '+shortValue(skill,level+1))+'. Details anzeigen');
  const picture=el('div','dr-card-art');
  picture.append(el('span','dr-card-art-icon',skill.icon),researchArt(skill));
  const content=el('div','dr-card-content');
  const header=el('div','dr-card-head');
  header.append(el('strong','dr-card-title',skill.name),
   el('span','dr-card-level','Stufe '+level+' / '+skill.maxLevel));
  const desc=el('p','dr-card-description',skill.description);
  const comparison=el('div','dr-card-bonus-compare');
  comparison.append(
   bonusTile('JETZT · Stufe '+level,shortValue(skill,level),'dr-card-benefit-now'),
   bonusTile(isMax?'STATUS':'NÄCHSTE · Stufe '+(level+1),
    isMax?'✓ Maximale Stufe':shortValue(skill,level+1),'dr-card-benefit-next')
  );
  const footer=el('div','dr-card-bottom');
  footer.append(progressBar(level,skill.maxLevel),
   el('strong','dr-card-next-cost',isMax?'✓ MAX':Number.isInteger(skill.nextCost)?fmt(skill.nextCost)+' FP':'Kosten offen'));
  content.append(header,desc,comparison,footer);
  if(isSelected)btn.append(el('span','dr-card-selected','✓'));
  btn.append(picture,content);
  btn.addEventListener('click',()=>{
   selectedId=skill.id;
   render();
   if(window.matchMedia('(max-width: 849px)').matches)
    details.scrollIntoView({behavior:'smooth',block:'start'});
  });
  return btn;
 }
 function renderSummary(){
  summary.hidden=false;
  $('dog-research-points').textContent=fmt(data.available);
  $('dog-research-earned').textContent=fmt(data.earned);
  $('dog-research-spent').textContent=fmt(data.spent);
  $('dog-research-player-level').textContent=String(data.level);
  const unlocked=data.skills.filter(skill=>levelOf(skill)>0).length;
  $('dog-research-unlocked').textContent=unlocked+' / '+data.skills.length;
 }
 function detailRow(title,text,style=''){
  const wrap=el('section','dr-detail-block'+(style?' '+style:''));
  wrap.append(el('h4','dr-detail-label',title),el('p','dr-detail-value',text));
  return wrap;
 }
 function detailClaim(skill,now){
  if(window.DOGChristmasDev?.isActive())return null;
  const rank=levelOf(skill);
  if(rank<1||!['free_ticket','builder'].includes(skill.id))return null;
  const readyAt=skill.id==='builder'?data.cooldowns?.builderAt:data.cooldowns?.freeTicketAt;
  const waitUntil=Number(readyAt)>now?new Date(readyAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):null;
  const wrap=el('section','dr-detail-claim');
  wrap.append(el('h4','',skill.id==='builder'?'⭐ Weihnachtslichter einsammeln':'🎟️ Kostenloses Rubbellos'));
  wrap.append(el('p','',waitUntil?'Nächste Abholung: '+waitUntil:'🎁 Deine Belohnung ist abholbereit!'));
  if(skill.id==='free_ticket'){
   const select=el('select','dr-ticket-select');
   select.setAttribute('aria-label','Gratislos-Art auswählen');
   for(const [value,text] of [['simple','Einfaches Los'],['medium','Mittleres Los']]){
    const option=el('option','',text);option.value=value;select.append(option);
   }
   select.value=ticketTier;
   select.addEventListener('change',()=>{ticketTier=select.value});
   select.disabled=working;wrap.append(select);
  }
  const button=el('button','dr-claim-button',skill.id==='builder'?'⭐ '+rank+' Lichter abholen':'🎁 Gratislos abholen');
  button.type='button';button.disabled=Boolean(waitUntil)||working;
  button.addEventListener('click',()=>void claim(skill.id,ticketTier));
  wrap.append(button);
  return wrap;
 }
 function renderDetail(skill){
  details.replaceChildren();
  details.classList.remove('has-claim');
  if(skill)details.dataset.researchArt=skill.id;
  else delete details.dataset.researchArt;
  if(!skill){
   const empty=el('div','dr-detail-placeholder');
   empty.append(el('span','','❄'),el('h3','','Forschung auswählen'),
    el('p','','Wähle eine Forschung, um Stufen, Vorteile und Kosten zu sehen.'));
   details.append(empty);return;
  }
  const rank=levelOf(skill),isMax=maxed(skill),now=Date.now();
  const banner=el('div','dr-detail-artwork');
  banner.dataset.researchArt=skill.id;
  const visual=el('div','dr-detail-artwork-visual');
  const largeArt=researchArt(skill);
  largeArt.classList.add('dr-detail-skill-image');
  visual.append(el('span','dr-detail-giant-icon',skill.icon),largeArt);
  banner.append(visual,el('span','dr-detail-rank','Stufe '+rank+' / '+skill.maxLevel));
  const body=el('div','dr-detail-body');
  const heading=el('div','dr-detail-heading');
  heading.append(el('h3','',skill.name),el('span','dr-detail-type','✦ '+groupFor(skill)));
  body.append(heading);
  body.append(detailRow('ⓘ Beschreibung',skill.description,'dr-detail-description'));
  const effects=el('div','dr-detail-effects');
  effects.append(detailRow('◉ AKTUELL · STUFE '+rank,valueAt(skill,rank),'dr-current-effect'));
  if(!isMax)effects.append(detailRow('➜ NACH AUFWERTUNG · STUFE '+(rank+1),
   valueAt(skill,rank+1),'dr-next-effect'));
  else effects.append(detailRow('✓ VOLLSTÄNDIG ERFORSCHT','Maximaler Vorteil erreicht','dr-next-effect'));
  body.append(effects);
  if(!isMax){
   const gain=el('div','dr-detail-gain');
   gain.append(el('span','dr-detail-gain-symbol','✦'),
    el('span','dr-detail-gain-label','DEINE VERBESSERUNG'),
    el('strong','dr-detail-gain-value',nextGain(skill,rank)));
   body.append(gain);
  }
  if(skill.id==='pity'&&rank>0)
   body.append(detailRow('🍀 Trostengel-Fortschritt',
    fmt(data.pityNiets)+' / '+(10-rank)+' bezahlte Nieten bis zum nächsten einfachen Los'));
  const action=el('div','dr-detail-actions');
  if(!skill.enabled){
   action.append(el('p','dr-locked-note','🔒 Noch nicht für den Kauf freigeschaltet.'));
  }else if(isMax){
   action.append(el('span','dr-max-reached','✓ MAXIMAL ERFORSCHT'));
  }else{
   const cost=field('div','dr-research-cost','Forschungskosten',fmt(skill.nextCost)+' FP');
   action.append(cost);
   const buy=el('button','dr-upgrade-button','↑  Aufwerten');
   buy.type='button';buy.disabled=working||window.DOGChristmasDev?.isActive()||!affordable(skill);
   buy.title=!affordable(skill)?'Nicht genügend Forschungspunkte':'Nächste Forschungsstufe kaufen';
   buy.addEventListener('click',()=>void upgrade(skill));
   action.append(buy);
  }
  body.append(action);
  const claimUI=detailClaim(skill,now);if(claimUI)body.append(claimUI);
  details.classList.toggle('has-claim',Boolean(claimUI));
  details.append(banner,body);
 }
 function render(){
  if(serverData)data=window.DOGChristmasDev?.researchData(serverData)||serverData;
  if(!data)return;
  renderSummary();drawFilters();
  const shown=visibleSkills();
  if(!shown.some(skill=>skill.id===selectedId))selectedId=shown[0]?.id||null;
  $('dog-research-found-count').textContent='('+shown.length+')';
  cards.classList.toggle('is-list',view==='list');
  cards.replaceChildren(...shown.map(renderCard));
  sortSelect.value=sort;
  for(const [id,value] of [['grid','grid'],['list','list']]){
   const control=$('dog-research-'+id+'-toggle');
   control.classList.toggle('is-active',view===value);
   control.setAttribute('aria-pressed',String(view===value));
  }
  renderDetail(data.skills.find(skill=>skill.id===selectedId));
 }
 async function call(endpoint,body=null){
  const account=user();
  if(!account)throw Error('Bitte melde dich zuerst mit deinem Spielerprofil an.');
  const uid=account.uid,token=await account.getIdToken();
  if(user()?.uid!==uid)throw Error('Das Spielerprofil hat gewechselt.');
  const reply=await fetch(base+'/api/hub/dog/research'+endpoint,{
   method:body?'POST':'GET',mode:'cors',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined
  });
  const response=await reply.json().catch(()=>({}));
  if(!reply.ok||response.ok!==true)throw Error(response.error||'RESEARCH_SERVER_ERROR');
  if(user()?.uid!==uid)throw Error('Das Spielerprofil hat gewechselt.');
  return response.research;
 }
 async function upgrade(skill){
  if(window.DOGChristmasDev?.isActive())return;
  if(!data||working||!skill.enabled||maxed(skill)||!affordable(skill))return;
  const target=levelOf(skill)+1;
  if(!window.confirm(skill.name+' auf Stufe '+target+' verbessern?\nKosten: '+skill.nextCost+' Forschungspunkte.'))return;
  working=true;render();
  try{
   data=await call('/upgrade',{id:skill.id});serverData=data;loadedUid=user()?.uid||null;loadedAt=Date.now();
   reportResearchBadge();
   message('✓ '+skill.name+' wurde auf Stufe '+target+' verbessert.');
  }catch(error){message('⚠️ Verbesserung fehlgeschlagen: '+error.message,true);}
  finally{working=false;render();}
 }
 async function claim(id,tier){
  if(window.DOGChristmasDev?.isActive())return;
  if(working||!data)return;
  working=true;render();
  try{
   data=await call('/claim',{type:id,...(id==='free_ticket'?{tier}:{})});serverData=data;loadedUid=user()?.uid||null;loadedAt=Date.now();
   reportResearchBadge();
   if(id==='free_ticket')window.dispatchEvent(new Event('dog-christmas-badges-refresh'));
   if(id==='builder')window.dispatchEvent(new Event('dog-christmas-village-balance-changed'));
   window.dispatchEvent(new Event('dog-scratch-balance-changed'));
   message(id==='builder'?'⭐ Die Weihnachtslichter sind dem gemeinsamen Dorf gutgeschrieben.':'🎟️ Dein Losgutschein wurde deinem Rubbellos-Konto gutgeschrieben.');
  }catch(error){message('⚠️ Abholung fehlgeschlagen: '+error.message,true);}
  finally{working=false;render();}
 }
 async function load(force=false){
  const account=user();
  if(!account){
   requestId++;pending=null;pendingUid=null;data=null;serverData=null;loadedUid=null;loadedAt=0;
   summary.hidden=true;cards.replaceChildren();drawFilters();renderDetail(null);
   message('🔐 Bitte melde dich mit deinem Online-Spielerprofil an, um deine Forschungen zu sehen.',true);
   return;
  }
  if(!force&&serverData&&loadedUid===account.uid&&Date.now()-loadedAt<RESEARCH_VIEW_CACHE_MS)return;
   if(pending&&pendingUid===account.uid)return pending;
  const id=++requestId;
  pendingUid=account.uid;
  message('🔬 Deine persönlichen Forschungen werden geladen …');
  const promise=(async()=>{
   try{
    const result=await call('');
    if(requestId!==id||user()?.uid!==account.uid)return;
    serverData=result;data=result;loadedUid=account.uid;loadedAt=Date.now();render();
    reportResearchBadge();
    message(window.DOGChristmasDev?.isActive()?'🧪 Lokale Forschungsvorschau – keine echte Freischaltung.':'✓ Forschungen synchronisiert – alle Werte stammen aus deinem Spielerkonto.');
   }catch(error){if(requestId===id){loadedAt=0;message('⚠️ Forschungsdaten konnten nicht geladen werden: '+error.message,true);}}
   finally{if(requestId===id){pending=null;pendingUid=null;}}
  })();
  pending=promise;return promise;
 }
 sortSelect.addEventListener('change',()=>{sort=sortSelect.value;render()});
 for(const id of ['grid','list']){
  $('dog-research-'+id+'-toggle').addEventListener('click',()=>{view=id;render()});
 }
 for(const button of root.querySelectorAll('[data-research-open-tab]')){
  button.addEventListener('click',()=>{
   const tab=$('tab-'+button.dataset.researchOpenTab);if(tab)tab.click();
  });
 }
 const exit=root.querySelector('.dr-exit');
 if(exit&&$('event-return'))exit.href=$('event-return').href;
 root.querySelector('.dr-topnav .is-current')?.addEventListener('click',()=>{
  $('event-main')?.scrollTo({top:0,behavior:'smooth'});
 });
 $('dog-research-refresh').addEventListener('click',()=>void load(true));
 window.addEventListener('dog-christmas-dev-change',()=>{
  if(serverData){render();message(window.DOGChristmasDev?.isActive()?'🧪 Lokale Forschungsvorschau – keine echten Käufe.':'✓ Echte Forschung wiederhergestellt.');}
 });
 window.addEventListener('spielonline-change',()=>{
   const nextUid=user()?.uid||null;
   if(nextUid===accountUid)return;
   accountUid=nextUid;loadedUid=null;loadedAt=0;
  requestId++;data=null;serverData=null;pending=null;pendingUid=null;
  summary.hidden=true;cards.replaceChildren();
  if($('tab-research')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
