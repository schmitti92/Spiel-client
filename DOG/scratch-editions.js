/**
 * DOG print-run studio – an authenticated companion screen to the existing
 * Christmas scratch shop. The browser edits only configuration, never prizes.
 */
const VARIANTS=[
 {id:'gifts',tier:'simple',icon:'🎁',name:'Geschenkelinie',short:'9 Felder',rule:'Drei gleiche Gewinnsymbole in einer Linie. Geld, Geschenke und Zusatztreffer.',budget:350000,one:1500,wins:10},
 {id:'snow_collect',tier:'simple',icon:'❄️',name:'Schneeflocken-Bingo',short:'16 Felder',rule:'Drei gleiche Gewinnsymbole irgendwo auf dem Los zählen als Gewinn.',budget:350000,one:1500,wins:10},
 {id:'elf',tier:'medium',icon:'🧝',name:'Magischer Wichtelpfad',short:'20 Felder',rule:'Geldsymbole bilden einen verbundenen Weg. Geschenke gewinnen über drei verbundene Felder.',budget:850000,one:12000,wins:10},
 {id:'premium_27',tier:'premium',icon:'👑',name:'Premium-Weihnachtslos',short:'9 × 3 Felder',rule:'Vier Geld-Dreierreihen auf jedem Los garantiert. Ab 20 Symbolen +1.000 Münzen; 24 Symbole können ein Geschenk freischalten.',budget:7000000,one:40000,wins:10},
 {id:'tic_tac_toe',tier:'medium',icon:'⭕',name:'DOG Tic-Tac-Toe',short:'1×–5× Duell',rule:'Zuerst Multiplikator, dann Gewinnzeichen (Kreis oder Kreuz). Eine passende Dreierlinie gewinnt einen Preis × Multiplikator.',budget:1600000,one:30000,wins:1},
 {id:'number_one_20',tier:'medium',icon:'🔢',name:'Glückszahl 1',short:'20 Zahlenreihen',rule:'Jede Zahl 1 gewinnt den linken Symbolpreis ihrer Reihe. Bis zu 20 Einzelgewinne möglich.',budget:3000000,one:25000,wins:20},
 {id:'dog_jackpot_9',tier:'premium',icon:'🐾',name:'Finde DOG!',short:'9 Felder',rule:'Wenn DOG erscheint, gewinnen alle acht übrigen Felder. Sonst ist das Los eine Niete.',budget:1900000,one:20000,wins:8}
];
const $=id=>document.getElementById(id);
const fmt=value=>Number(value||0).toLocaleString('de-DE');
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const apiBase=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const signedIn=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null};
async function api(path='',payload){
 const user=signedIn();
 if(!user)throw Error('Bitte melde dich zuerst mit deinem DOG-Spielerprofil an.');
 const token=await user.getIdToken();
 const response=await fetch(apiBase+'/api/hub/scratch'+path,{
  method:payload===undefined?'GET':'POST',cache:'no-store',
  headers:{Authorization:'Bearer '+token,...(payload===undefined?{}:{'Content-Type':'application/json'})},
  body:payload===undefined?undefined:JSON.stringify(payload)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw Error(data.error||'Render ist derzeit nicht erreichbar.');
 return data;
}
const baseDraft=variant=>({
 variantId:variant.id,title:variant.name+' · Winteredition 1',
 maxTotalCoins:variant.budget,maxPerTicketCoins:variant.one,
 maxPrizesPerTicket:variant.wins,maxUnlocks:0,quotas:{}
});
const drafts=Object.fromEntries(VARIANTS.map(v=>[v.id,baseDraft(v)]));
const live={};
let current=VARIANTS[0],view='plan',settings=null,preview=null,previewKey=null,busy=false;
let formInitialized=false;
const labelFor=error=>({
 EDITION_STILL_ACTIVE:'Eine bestehende Auflage hat noch Restlose. Beende sie zuerst oder verkaufe sie vollständig.',
 EDITION_QUOTAS_OVER_500:'Mehr als 500 Lose sind fest eingeplant.',
 EDITION_INVALID_LIMITS:'Bitte prüfe die Budget-, Gewinn- und Freischaltungsgrenzen.',
 EDITION_SOLD_OUT:'Diese Auflage ist ausverkauft.',
 EDITION_NO_AVAILABLE_UNLOCK:'Kein zu diesem Profil passender Freischaltpreis ist mehr in der Auflage vorhanden.',
 LOGIN_REQUIRED:'Bitte zuerst mit deinem DOG-Spielerprofil anmelden.'
}[error]||String(error||'Unbekannter Fehler'));
function showMessage(value,kind=''){
 const el=$('preview-message');el.textContent=value;el.className='preview-message '+kind;
}
function readForm(){
 const old=drafts[current.id];
 const value=id=>$(id).value;
 const quotas={};
 for(const field of $('quota-grid').querySelectorAll('input[data-count]')){
  const raw=field.value.trim();
  if(raw!=='')quotas[field.dataset.count]=Number(raw);
 }
 const number=id=>{const v=Number(value(id));return Number.isFinite(v)?v:NaN};
 drafts[current.id]={variantId:current.id,title:value('ed-name').trim(),
  maxTotalCoins:number('ed-budget'),maxPerTicketCoins:number('ed-max-coins'),
  maxPrizesPerTicket:number('ed-max-prizes'),maxUnlocks:number('ed-max-unlocks'),
  quotas,gameSettings:old.gameSettings??null};
 return drafts[current.id];
}
function draftKey(value){return JSON.stringify(value)}
function invalidatePreview(){
 preview=null;previewKey=null;
 $('preview-state').textContent='Nach Änderungen neu berechnen';
 $('ed-publish').disabled=true;
 $('preview-chart').replaceChildren(node('p','','Die Einstellungen wurden geändert. Berechne die 500 Lose erneut.'));
 $('preview-metrics').replaceChildren(...[
  ['🎟️ Lose','500'],['🏆 Gewinnlose','–'],['❄️ Nieten','–'],['🪙 Gesamtauszahlung','–']
 ].map(([name,value])=>metric(name,value)));
 showMessage('');
}
function metric(label,value){
 const div=node('div');div.append(node('span','',label),node('strong','',value));return div;
}
function updateSide(){
 const draft=drafts[current.id],nums=Object.values(draft.quotas);
 $('side-budget').textContent=fmt(draft.maxTotalCoins)+' 🪙';
 $('side-max').textContent=fmt(draft.maxPerTicketCoins)+' 🪙';
 const sum=nums.reduce((n,x)=>n+(Number(x)||0),0);
 $('side-quotas').textContent=sum?fmt(sum)+' von 500 fest':'Automatisch';
 $('quota-sum').textContent=fmt(sum)+' von 500 fest eingeplant · '+fmt(Math.max(0,500-sum))+' automatisch';
 $('quota-sum').style.color=sum>500?'#ff9999':'#f3daae';
}
function renderQuota(){
 const parent=$('quota-grid');parent.replaceChildren();
 for(let count=0;count<=20;count++){
  const line=node('div','quota-row');line.dataset.count=String(count);
  const heading=node('strong','',count===0?'❄️ Niete – 0 Gewinne':count+' '+(count===1?'Gewinn':'Gewinne')+' auf dem Los');
  const field=node('input');
  field.type='number';field.min='0';field.max='500';field.step='1';
  field.inputMode='numeric';field.dataset.count=String(count);
  field.placeholder='Automatisch';
  const quota=drafts[current.id].quotas[count];
  field.value=Number.isInteger(quota)?String(quota):'';
  field.setAttribute('aria-label','Anzahl Lose mit '+count+' Gewinnen');
  const description=node('small','',count>current.wins?'Nur bei angepassten Spielregeln':count===0?'Exakt festgelegte Nieten':count===10?'Zehn einzelne Gewinne möglich':'Exakte Losanzahl');
  line.append(heading,field,description);
  parent.append(line);
 }
}
function defaultGameSettings(v){
 if(settings?.variants?.[v.id])return structuredClone(settings.variants[v.id]);
 if(v.id==='number_one_20')return structuredClone(settings?.numberOne20||
  {price:500,hitPer1000:100,giftFallbackCoins:1500,
   coinAmounts:[100,300,800],symbolWeights:[650,280,60,10]});
 if(v.id==='tic_tac_toe')return {coinAmounts:[200,450,800],
  symbolWeights:[700,250,40,10],maxMultiplier:5,giftFallbackCoins:1500};
 if(v.id==='dog_jackpot_9')return {coinAmounts:[100,300,800],
  symbolWeights:[550,300,148,2],dogChancePer1000:350,giftFallbackCoins:1500};
 return null;
}
function renderGameSettings(root){
 const v=current,draft=drafts[v.id];
 if(!draft.gameSettings)draft.gameSettings=defaultGameSettings(v);
 const cfg=draft.gameSettings;
 if(!cfg)return;
 const section=node('div','mechanic-card');
 section.append(node('h4','','🎛️ Eigene Einstellungen für diese 500er-Auflage'),
  node('p','','Hier stellst du die Geldwerte, Symbolanteile und Spielregeln für diesen Druck ein. '+
   'Chancen werden in Promille angegeben: 1000 = 100 %, 100 = 10 %. Änderungen betreffen ausschließlich die neue Auflage.'));
 const grid=node('div','field-layout');grid.style.marginTop='15px';
 const field=(label,property,index=null,min=0,max=50000000)=>{
  const item=node('label','field');item.append(node('span','',label));
  const input=node('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';
  input.inputMode='numeric';input.value=String(index===null?cfg[property]:cfg[property]?.[index]??0);
  input.addEventListener('input',()=>{
   const n=Number(input.value);
   if(index===null)cfg[property]=n;
   else cfg[property][index]=n;
   invalidatePreview();
  });
  item.append(input);grid.append(item);
 };
 if(cfg.weights){
  field('❄️ Nietenkategorie (‰)','weights','none',0,1000);
  field('🪙 Münzkategorie (‰)','weights','coins',0,1000);
  field('🎁 Freischaltungen (‰)','weights','unlock',0,1000);
  field('🎉 Zusatzmünzen (%)','extraCoinChance',null,0,100);
  field('🏆 Maximalgewinne der Spielmechanik','maxPrizes',null,v.id==='premium_27'?6:1,10);
 }
 if(v.id==='number_one_20'){
  field('🎟️ Lospreis','price',null,1,1000000);
  field('🎯 Chance auf Zahl 1 je Reihe (‰)','hitPer1000',null,0,1000);
 }
 if(v.id==='tic_tac_toe')field('🎰 Höchster Multiplikator','maxMultiplier',null,1,5);
 if(v.id==='dog_jackpot_9')field('🐾 DOG-Trefferwahrscheinlichkeit (‰)','dogChancePer1000',null,0,1000);
 if(cfg.giftFallbackCoins!==undefined)
  field('🎁 Münzen statt Freischaltung','giftFallbackCoins',null,0,50000000);
 if(Array.isArray(cfg.coinAmounts))
  ['🪙 Münzwert','💵 Scheinwert','💼 Kofferwert'].forEach((label,i)=>
   field(label,'coinAmounts',i,1,50000000));
 if(Array.isArray(cfg.moneySymbolWeights))
  ['🪙 Münze (‰)','💵 Schein (‰)','💼 Koffer (‰)'].forEach((label,i)=>
   field(label,'moneySymbolWeights',i,0,1000));
 if(Array.isArray(cfg.symbolWeights))
  ['🪙 Münze (‰)','💵 Schein (‰)','💼 Koffer (‰)','🎁 Geschenk (‰)'].forEach((label,i)=>
   field(label,'symbolWeights',i,0,1000));
 if(Array.isArray(cfg.giftSymbolWeights))
  ['🎁 Geschenk (‰)','💝 Herz (‰)','🎀 Schleife (‰)','🧧 Umschlag (‰)']
   .forEach((label,i)=>field(label,'giftSymbolWeights',i,0,1000));
 section.append(grid);
 const footer=node('p','','⚖️ Hauptkategorien, Geldsymbole und Geschenksymbole müssen jeweils genau 1000 ‰ ergeben. '+
  'Die Münzwerte müssen streng aufsteigend sein. Unmögliche Ausgaben werden vom Server abgelehnt.');
 footer.style.marginTop='12px';section.append(footer);root.append(section);
}
function renderRules(){
 const root=$('mechanic-content');root.replaceChildren();
 const v=current,classic=settings?.variants?.[v.id],numberSettings=settings?.numberOne20;
 const one=node('div','mechanic-card');
 one.append(node('h4','',v.icon+' '+v.name+' · '+v.short),
  node('p','',v.rule));
 root.append(one);
 const note=node('div','mechanic-card');note.append(node('h4','','🎯 Was wird beim Druck berücksichtigt?'));
 if(classic){
  const weights=classic.weights||{};
  note.append(node('p','',
   'Live-Einstellungen: Hauptkategorien Niete '+fmt((weights.none||0)/10)+' %, Geld '+fmt((weights.coins||0)/10)+
   ' %, Freischaltung '+fmt((weights.unlock||0)/10)+' %. Zusatzmünzchance '+fmt(classic.extraCoinChance)+
   ' %. Aktuelles Maximum: '+fmt(classic.maxPrizes)+' Gewinne. Die eingegebenen Quoten des Auflagenstudios können diese Verteilung gezielt verändern.'));
  const amounts=classic.coinAmounts||[];
  const numbers=node('div','mechanic-numbers');
  [['🪙 Münze',amounts[0]],['💵 Schein',amounts[1]],['💼 Koffer',amounts[2]]]
   .forEach(([a,b])=>{const box=node('div');box.append(node('span','',a),node('strong','',fmt(b)+' 🪙'));numbers.append(box)});
  note.append(numbers);
 }else if(v.id==='number_one_20'){
  note.append(node('p','',
   'Zahl 1: '+fmt((numberSettings?.hitPer1000??100)/10)+' % je Reihe. Losepreis: '+
   fmt(numberSettings?.price??500)+' Münzen. Die 20 Reihen können 0 bis 20 Gewinne erzeugen.'));
  const amounts=numberSettings?.coinAmounts||[100,300,800],numbers=node('div','mechanic-numbers');
  amounts.forEach((x,i)=>{const box=node('div');box.append(node('span','',['🪙 Münze','💵 Schein','💼 Koffer'][i]),node('strong','',fmt(x)+' 🪙'));numbers.append(box)});
  note.append(numbers);
 }else if(v.id==='tic_tac_toe'){
  note.append(node('p','','Die aktuelle Duellmechanik hat ein Gewinnzeichen, einen Multiplikator 1–5 und einen einmaligen Symbolgewinn bei einer passenden Dreierlinie. Zehn Einzelgewinne lassen sich mit diesen bestehenden Regeln nicht erzwingen.'));
 }else if(v.id==='dog_jackpot_9'){
  note.append(node('p','','Der Treffer auf DOG liegt in der aktuellen Serverregel bei 35 %. Bei Erfolg gibt es acht Symbolfelder als Gewinn; ohne DOG keine Auszahlungen. Ein zehnfacher Gewinn ist deshalb bei diesem Los nicht möglich.'));
 }
 root.append(note);
 const caveat=node('div','mechanic-card');
 caveat.append(node('h4','','🛡️ Gewinnprüfung'),
  node('p','','Jedes vorgedruckte Los wird vom vorhandenen Gewinnmotor erstellt. Das Studio darf die ausgezahlte Münzsumme nur durch Auswahl passender, tatsächlich gewinnender Spielbretter steuern – nicht durch verdeckte Zusatzbeträge. Hauptgewinne, die der Spieler bereits besitzt, werden bei der Einlösung nach Möglichkeit durch andere noch freie Freischaltungen ersetzt.'));
 root.append(caveat);
 renderGameSettings(root);
}
function renderLive(){
 const doc=live[current.id];
 const label=$('edition-availability'),root=$('live-edition');
 root.replaceChildren();
 if(!doc){
  label.textContent='Noch keine Auflage';label.classList.remove('live');
  root.append(node('p','live-detail','Für diese Losart ist aktuell keine eigene 500er-Auflage aktiviert. Das Spiel nutzt die normale Rubbellosziehung.'));
 }else{
  label.textContent=doc.remaining>0?doc.remaining+' von 500 übrig':'Ausverkauft';
  label.classList.toggle('live',doc.remaining>0);
  root.append(node('div','live-total',fmt(doc.remaining)+' / 500'));
  const track=node('div','live-progress'),bar=node('i');
  bar.style.width=(doc.issued/5)+'%';track.append(bar);root.append(track);
  const description=node('div','live-detail');
  description.append(node('b','',doc.title),node('div','',
   'Druck: '+new Date(doc.createdAt).toLocaleString('de-DE')+' · Ausgabe '+doc.id),
   node('div','','Ausgegeben: '+fmt(doc.issued)+' Lose'),
   node('div','','Ausgezahlt: '+fmt(doc.issuedCoins)+' 🪙'),
   node('div','','Gesamtdruck: '+fmt(doc.summary?.totalCoins)+' 🪙'),
   node('div','','Gewinnlose: '+fmt(doc.summary?.winners)+' · Nieten: '+fmt(doc.summary?.duds)));
  root.append(description);
 }
 $('ed-retire').hidden=!doc||doc.status!=='active'||doc.remaining<=0;
 $('ed-publish').disabled=busy||!preview||previewKey!==draftKey(drafts[current.id])||
  Boolean(doc&&doc.status==='active'&&doc.remaining>0);
}
function renderTabs(){
 const root=$('edition-tabs');root.replaceChildren();
 for(const v of VARIANTS){
  const btn=node('button','edition-tab'+(v.id===current.id?' active':''));btn.type='button';btn.dataset.variant=v.id;
  btn.setAttribute('role','tab');btn.setAttribute('aria-selected',String(v.id===current.id));
  btn.append(node('span','tab-emoji',v.icon),node('strong','',v.name),node('small','',v.short));
  btn.addEventListener('click',()=>switchVariant(v.id));
  root.append(btn);
 }
}
function activateView(name){
 view=name;
 for(const button of document.querySelectorAll('.subtab')){
  const active=button.dataset.view===name;
  button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));
 }
 for(const section of document.querySelectorAll('.inner-view'))
  section.hidden=section.id!=='view-'+name;
 if(name==='history')void loadHistory();
}
function switchVariant(id){
 const variant=VARIANTS.find(x=>x.id===id);if(!variant)return;
 if(formInitialized)readForm();
 formInitialized=true;current=variant;
 $('edition-title').textContent=variant.icon+' '+variant.name;
 $('edition-subtitle').textContent=variant.rule;
 const d=drafts[variant.id];
 $('ed-name').value=d.title;
 $('ed-budget').value=d.maxTotalCoins;
 $('ed-max-coins').value=d.maxPerTicketCoins;
 $('ed-max-prizes').value=d.maxPrizesPerTicket;
 $('ed-max-unlocks').value=d.maxUnlocks;
 renderTabs();renderQuota();renderRules();renderLive();updateSide();invalidatePreview();
 activateView('plan');
}
function showPreview(data){
 preview=data;previewKey=draftKey(drafts[current.id]);
 const s=data.summary||{};
 $('preview-state').textContent='✓ Server-Probedruck';
 $('preview-metrics').replaceChildren(...[
  ['🎟️ Lose',fmt(s.tickets)],['🏆 Gewinnlose',fmt(s.winners)],
  ['❄️ Nieten',fmt(s.duds)],['🪙 Gesamtauszahlung',fmt(s.totalCoins)]
 ].map(([a,b])=>metric(a,b)));
 const chart=$('preview-chart');chart.replaceChildren();
 const histogram=s.byWins||[],max=Math.max(1,...histogram);
 histogram.forEach((count,i)=>{
  if(!count&&drafts[current.id].quotas[i]===undefined)return;
  const row=node('div','hist-row'),track=node('div','hist-track'),fill=node('div','hist-fill');
  fill.style.width=(100*count/max).toFixed(2)+'%';track.append(fill);
  row.append(node('span','',i===0?'Nieten':i+' Gewinne'),track,node('strong','',fmt(count)));
  chart.append(row);
 });
 showMessage('✓ '+fmt(s.totalCoins)+' von '+fmt(drafts[current.id].maxTotalCoins)+
  ' verfügbaren Münzen verplant. Höchster Einzelgewinn: '+fmt(s.biggestTicketCoins)+
  ' Münzen · '+fmt(s.unlocks)+' Freischaltungen · '+fmt(s.remainingBudget)+' Münzen Budgetreserve.', 'good');
 renderLive();
}
async function load(){
 if(!signedIn()){
  showMessage('🔐 Bitte melde dich mit deinem DOG-Profil an und öffne das Auflagenstudio erneut.','error');
  return;
 }
 try{
  const [scratch,editions]=await Promise.all([api(''),api('/editions')]);
  settings=scratch.scratch?.settings||null;
  for(const variant of VARIANTS){
   if(!drafts[variant.id].gameSettings)drafts[variant.id].gameSettings=defaultGameSettings(variant);
  }
  for(const item of editions.editions||[])live[item.variantId]=item.active;
  renderRules();renderLive();showMessage('✓ Render verbunden. Einstellungen und aktuelle Auflagen geladen.','good');
 }catch(e){showMessage('⚠️ '+labelFor(e.message)+' Falls der neue Server gerade bereitgestellt wird, versuche es später erneut.','error')}
}
async function loadHistory(){
 if(!signedIn()){ $('history-entries').textContent='Bitte zuerst anmelden.';return}
 const root=$('history-entries');root.replaceChildren(node('p','','Lade Auflagenhistorie …'));
 const id=current.id;
 try{
  const result=await api('/editions/history/'+encodeURIComponent(id));
  if(current.id!==id)return;
  root.replaceChildren();
  for(const doc of result.history||[]){
   const row=node('div','history-row');
   row.append(node('strong','',doc.title||doc.id),
    node('small','',new Date(doc.createdAt).toLocaleString('de-DE')+
     ' · '+doc.status+' · '+fmt(doc.issued)+'/500 ausgegeben · '+
     fmt(doc.summary?.totalCoins)+' 🪙 verplant · '+fmt(doc.issuedCoins)+' 🪙 ausgezahlt'));
   root.append(row);
  }
  if(!root.childElementCount)root.append(node('p','','Noch keine historischen Auflagen vorhanden.'));
 }catch(e){root.replaceChildren(node('p','','⚠️ '+labelFor(e.message)))}
}
function setBusy(value){
 busy=value;
 $('ed-preview').disabled=value;
 $('ed-export').disabled=value;
 renderLive();
}
$('edition-tabs').addEventListener('change',()=>{});
document.querySelectorAll('.subtab').forEach(button=>
 button.addEventListener('click',()=>activateView(button.dataset.view)));
$('quota-clear').addEventListener('click',()=>{
 $('quota-grid').querySelectorAll('input').forEach(input=>input.value='');
 readForm();updateSide();invalidatePreview();
});
for(const id of ['ed-name','ed-budget','ed-max-coins','ed-max-prizes','ed-max-unlocks']){
 $(id).addEventListener('input',()=>{readForm();updateSide();invalidatePreview()});
}
$('quota-grid').addEventListener('input',()=>{readForm();updateSide();invalidatePreview()});
$('ed-preview').addEventListener('click',async()=>{
 const draft=readForm();
 if(!signedIn()){showMessage('Bitte zuerst mit deinem DOG-Profil anmelden.','error');return}
 setBusy(true);showMessage('🎲 Render berechnet die 500 Lose und prüft alle Gewinnlimits …');
 try{
  const result=await api('/editions/preview',{config:draft});
  showPreview(result);
 }catch(e){invalidatePreview();showMessage('⚠️ Die Auflage ist so nicht druckbar: '+labelFor(e.message)+
  '. Passe Budget, exakte Gewinnzahlen oder die allgemeinen Spielchancen an.','error')}
 finally{setBusy(false)}
});
$('ed-publish').addEventListener('click',async()=>{
 const draft=readForm();
 if(!preview||previewKey!==draftKey(draft))return;
 if(!window.confirm('500 neue '+current.name+'-Lose jetzt serverseitig drucken und im Spiel aktivieren? Eine bestehende Auflage darf nicht noch offene Lose haben.'))return;
 setBusy(true);showMessage('🖨️ Render erstellt und veröffentlicht die neue 500er-Serie …');
 try{
  const published=await api('/editions/publish',{config:draft});
  if(!published.edition||!published.published)throw Error('Auflage nicht bestätigt');
  live[current.id]=published.edition;
  showMessage('✅ Edition veröffentlicht: '+fmt(published.edition.summary.totalCoins)+
   ' Münzen in 500 servergeprüften Losen · ID '+published.edition.id,'good');
  renderLive();await loadHistoryIfOpen();
 }catch(e){showMessage('⚠️ Veröffentlichung fehlgeschlagen: '+labelFor(e.message),'error')}
 finally{setBusy(false)}
});
async function loadHistoryIfOpen(){if(view==='history')await loadHistory()}
$('ed-retire').addEventListener('click',async()=>{
 if(!live[current.id]||!window.confirm('Die aktive Auflage wirklich vorzeitig beenden? Nicht verkaufte Lose werden zurückgezogen. Dieser Schritt kann nicht rückgängig gemacht werden.'))return;
 setBusy(true);
 try{
  await api('/editions/retire',{variantId:current.id,confirmation:'RETIRE'});
  live[current.id]=null;renderLive();
  showMessage('✅ Auflage beendet. Eine neue Druckauflage kann jetzt aktiviert werden.','good');
 }catch(e){showMessage('⚠️ '+labelFor(e.message),'error')}
 finally{setBusy(false)}
});
$('history-refresh').addEventListener('click',()=>void loadHistory());
$('ed-export').addEventListener('click',()=>{
 const data={type:'DOG-scratch-edition-draft',version:1,createdAt:new Date().toISOString(),
  config:readForm(),lastPreview:preview?.summary||null};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const href=URL.createObjectURL(blob),link=node('a');
 link.href=href;link.download='DOG-Auflage-'+current.id+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
});
window.addEventListener('spielonline-change',()=>void load());
switchVariant(current.id);
void load();
