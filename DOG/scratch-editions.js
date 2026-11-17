/**
 * DOG print-run studio – an authenticated companion screen to the existing
 * Christmas scratch shop. The browser edits only configuration, never prizes.
 */
const VARIANTS=[
 {id:'gifts',tier:'simple',price:200,icon:'🎁',name:'Geschenkelinie',short:'9 Felder',rule:'Drei gleiche Gewinnsymbole in einer Linie. Geld, Geschenke und Zusatztreffer.',budget:350000,one:1500,wins:10},
 {id:'snow_collect',tier:'simple',price:200,icon:'❄️',name:'Schneeflocken-Bingo',short:'16 Felder',rule:'Drei gleiche Gewinnsymbole irgendwo auf dem Los zählen als Gewinn.',budget:350000,one:1500,wins:10},
 {id:'elf',tier:'medium',price:500,icon:'🧝',name:'Magischer Wichtelpfad',short:'20 Felder',rule:'Geldsymbole bilden einen verbundenen Weg. Geschenke gewinnen über drei verbundene Felder.',budget:850000,one:12000,wins:10},
 {id:'premium_27',tier:'premium',price:1000,icon:'👑',name:'Premium-Weihnachtslos',short:'9 × 3 Felder',rule:'Vier Geld-Dreierreihen auf jedem Los garantiert. Ab 20 Symbolen +1.000 Münzen; 24 Symbole können ein Geschenk freischalten.',budget:7000000,one:40000,wins:10},
 {id:'tic_tac_toe',tier:'medium',price:500,icon:'⭕',name:'DOG Tic-Tac-Toe',short:'1×–5× Duell',rule:'Zuerst Multiplikator, dann Gewinnzeichen (Kreis oder Kreuz). Eine passende Dreierlinie gewinnt einen Preis × Multiplikator.',budget:1600000,one:30000,wins:1},
 {id:'number_one_20',tier:'medium',price:500,icon:'🔢',name:'Glückszahl 1',short:'20 Zahlenreihen',rule:'Jede Zahl 1 gewinnt den linken Symbolpreis ihrer Reihe. Bis zu 20 Einzelgewinne möglich.',budget:3000000,one:25000,wins:20},
 {id:'dog_jackpot_9',tier:'premium',price:1000,icon:'🐾',name:'Finde DOG!',short:'9 Felder',rule:'Wenn DOG erscheint, gewinnen alle acht übrigen Felder. Sonst ist das Los eine Niete.',budget:1900000,one:20000,wins:8}
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
const CURRENCIES=[
 {id:'coin',icon:'🪙',name:'Geldmünze',description:'Kleinere Münzgewinne und Münz-Sondertreffer'},
 {id:'note',icon:'💵',name:'Geldschein',description:'Mittlere Geldgewinne in dieser Auflage'},
 {id:'case',icon:'💼',name:'Geldkoffer',description:'Hohe Geldgewinne und Jackpot-Preise'},
 {id:'lights',icon:'⭐',name:'Weihnachtslichter',description:'Gemeinsame Dorfwährung für die vier Gebäude'},
 {id:'gift',icon:'🎁',name:'5 Hauptgewinn-Symbole',description:'🎁 Geschenk · 💝 Herzgeschenk · 🎀 Schleife · 🧧 Umschlag · 🛍️ Geschenktüte'}
];
function defaultSymbolBudgets(variant){
 const amounts=variant.tier==='simple'?[10,40,100]:
  variant.id==='tic_tac_toe'?[200,450,800]:
  variant.id==='dog_jackpot_9'?[100,300,800]:
  variant.tier==='premium'?[200,800,2000]:[100,300,800];
 const result={};
 ['coin','note','case'].forEach((id,i)=>{
  const value=amounts[i];
  result[id]={min:Math.max(1,Math.floor(value*.7)),
   max:Math.max(Math.round(value*3),variant.id==='premium_27'&&i===0?1000:value),
   minTotal:0,maxTotal:Math.max(10000,Math.round(variant.budget*(i+2)/5))};
 });
 result.lights={min:1,max:10,minTotal:0,maxTotal:400,chancePer1000:200};
 result.gift={min:0,max:3,minTotal:0,
  maxTotal:variant.tier==='simple'?25:variant.tier==='medium'?20:25};
 return result;
}
const baseDraft=variant=>({
 variantId:variant.id,title:variant.name+' · Winteredition 1',
 printSize:500,maxTotalCoins:variant.budget,targetTotalCoins:Math.round(variant.budget*.55),
 targetTolerancePercent:5,premiumFull27Tickets:0,volatility:70,
 ticketPrice:variant.price,maxPerTicketCoins:variant.one,
 maxPrizesPerTicket:variant.wins,
 maxUnlocks:variant.tier==='simple'?25:variant.tier==='medium'?20:25,quotas:{},
 doubleWin:{chancePer1000:110,minTickets:0,maxTickets:80},
 symbolBudgets:defaultSymbolBudgets(variant)
});
const DRAFT_STORAGE_KEY='dog-scratch-edition-drafts-v2';
const drafts=Object.fromEntries(VARIANTS.map(v=>[v.id,baseDraft(v)]));
// Separate, automatically saved draft for each ticket variant.
try{
 const saved=JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)||'{}');
 for(const variant of VARIANTS){
  const row=saved?.[variant.id];
  if(!row||row.variantId!==variant.id||typeof row!=='object')continue;
  const fresh=baseDraft(variant);
  for(const key of ['title','ticketPrice','printSize','maxTotalCoins','targetTotalCoins',
   'targetTolerancePercent','premiumFull27Tickets','volatility','maxPerTicketCoins',
   'maxPrizesPerTicket','maxUnlocks','quotas','doubleWin','gameSettings'])
   if(Object.hasOwn(row,key))fresh[key]=structuredClone(row[key]);
  for(const key of Object.keys(fresh.symbolBudgets))if(row.symbolBudgets?.[key])
   fresh.symbolBudgets[key]={...fresh.symbolBudgets[key],...row.symbolBudgets[key]};
  drafts[variant.id]=fresh;
 }
}catch{ /* Missing storage permissions: default drafts remain available. */ }
function persistDrafts(){
 try{localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify(drafts))}catch{}
}
const live={};
const catalog={};
const sizeOf=()=>Number(drafts[current.id]?.printSize??500);
let current=VARIANTS[0],view='overview',settings=null,preview=null,previewKey=null,busy=false;
let formInitialized=false;
const labelFor=error=>{
 const code=String(error||'');
 if(code.startsWith('EDITION_BUDGET_MIN_REQUIRED_')){
  const match=code.match(/EDITION_BUDGET_MIN_REQUIRED_(\d+)_AVAILABLE_(\d+)/);
  if(match)return 'Mindestens '+fmt(match[1])+' Münzen werden für die festen Gewinnzahlen benötigt. '+
   'Vorhanden: '+fmt(match[2])+' Münzen. Erhöhe das Gesamtbudget oder senke die Mindestgewinne. '+
   'Die fixierten Gewinnzahlen bleiben unangetastet.';
 }
 if(code.startsWith('EDITION_TICKET_MIN_REQUIRED_')){
  const match=code.match(/EDITION_TICKET_MIN_REQUIRED_(\d+)_AVAILABLE_(\d+)/);
  if(match)return 'Ein Los benötigt mindestens '+fmt(match[1])+' Münzen, erlaubt sind '+
   fmt(match[2])+'. Erhöhe den Höchstgewinn pro Los oder senke die Mindestbeträge.';
 }
 if(code.startsWith('EDITION_AUTO_DISTRIBUTION_EXHAUSTED_SLOT_')){
  const slot=code.match(/_SLOT_(\d+)/)?.[1];
  return 'Beim automatisch verteilten Los '+(slot||'?')+' von '+fmt(sizeOf())+
   ' wurde trotz zusätzlicher Versuche keine gültige Kombination gefunden. '+
   'Deine festen Gewinnzahlen bleiben unverändert. Prüfe die Zielauszahlung, '+
   'Mindest- und Höchstgewinne sowie die Budgets für die einzelnen Symbole. '+
   'Dieser Suchabbruch beweist noch nicht, dass die Auflage unmöglich ist.';
 }
 if(code.startsWith('EDITION_GENERATION_EXHAUSTED_SLOT_')||
    code.startsWith('EDITION_DISTRIBUTION_IMPOSSIBLE_SLOT_')){
  const count=code.match(/_WINS_(\d+)/)?.[1];
  const slot=code.match(/_SLOT_(\d+)/)?.[1];
  return (slot?'Bei Los '+slot+' von '+fmt(sizeOf())+': ':'')+
   (count?'Für genau '+count+' Gewinne':'Für diese Gewinnzahl')+
   ' wurde noch keine gültige Kombination gefunden. Die feste Vorgabe bleibt bestehen. '+
   'Bitte zuerst den Probedruck erneut versuchen. Falls es wieder passiert: '+
   'Gewinnbeträge senken oder Gesamtbudget, Symbolbudgets und Höchstgewinn je Los prüfen. '+
   'Auch ✖️2 benötigt zusätzliches Budget.';
 }
 if(code.startsWith('EDITION_UNSUPPORTED_WIN_COUNT_'))
  return 'Diese Anzahl kann die echte Spielmechanik des ausgewählten Loses nicht erzeugen.';
 if(code.startsWith('EDITION_QUOTA_ABOVE_MAX_'))
  return 'Die ausgewählte Anzahl an Gewinnen ist für dieses Los zu hoch.';
 return ({
 EDITION_STILL_ACTIVE:'Eine bestehende Auflage hat noch Restlose. Beende sie zuerst oder verkaufe sie vollständig.',
 EDITION_QUOTAS_OVER_500:'Mehr als 500 Lose sind fest eingeplant.',
 EDITION_QUOTAS_OVER_PRINT_SIZE:'Die festen Gewinnzahlen überschreiten die Auflagengröße.',
 EDITION_PRINT_SIZE_INVALID:'Bitte eine ganze Anzahl von 1 bis 500 Losen wählen.',
 EDITION_INVALID_LIMITS:'Bitte prüfe die Budget-, Gewinn- und Freischaltungsgrenzen.',
 EDITION_TICKET_PRICE_INVALID:'Der Preis muss eine ganze Zahl zwischen 0 und 1.000.000 Münzen sein.',
 EDITION_SOLD_OUT:'Diese Auflage ist ausverkauft.',
 EDITION_PREVIEW_REQUIRED:'Du musst zuerst einen Probedruck erstellen.',
 EDITION_PREVIEW_EXPIRED:'Der geprüfte Probedruck ist abgelaufen. Bitte die 500 Lose erneut berechnen.',
 EDITION_PREVIEW_CHANGED:'Die Einstellungen wurden nach der Vorschau geändert. Bitte erneut berechnen.',
 EDITION_SYMBOL_BUDGET_INVALID:'Bitte prüfe die Beträge für die fünf Gewinnkategorien.',
 EDITION_DOUBLE_INVALID:'Prüfe ✖️2: Chance 0–100 %, mindestens 0–500 Lose und Maximalzahl mindestens so hoch wie die Mindestzahl.',
 EDITION_DOUBLE_MIN_UNREACHABLE:'So viele ✖️2-Lose sind mit Nieten und Budgets nicht erreichbar. Reduziere die Mindestzahl.',
 EDITION_FULL27_INVALID:'Die vollständigen 27-Felder-Premiumlose lassen sich nur beim Premium-Weihnachtslos einstellen.',
 EDITION_FULL27_NEEDS_TEN_WINS_AND_UNLOCKS:'Für volle 27-Felder-Premiumlose müssen 10 Einzelgewinne erlaubt sein, mindestens gleich viele Freischaltungen im Budget stehen und die Quote „10 Gewinne“ groß genug sein.',
 EDITION_TARGET_INVALID:'Der Ziel-Gesamtgewinn darf die Budgetobergrenze bzw. die Summe aller erlaubten Einzelhöchstgewinne nicht überschreiten.',
 EDITION_TARGET_NOT_REACHED:'Die Gewinnverteilung trifft das Budgetziel nicht. Erhöhe die erlaubte Abweichung oder passe Geldwerte und Quoten an.',
 EDITION_PREMIUM_HAS_NO_DUDS:'Premiumlose haben vier garantierte Geldreihen und können deshalb keine Nieten enthalten.',
 EDITION_DOG_ONLY_EIGHT_OR_ZERO:'Finde DOG! hat pro Los 0 oder 8 gewinnende Felder.',
 EDITION_DUEL_ONE_WIN_MAX:'Tic-Tac-Toe kann pro Los höchstens einen Einzelgewinn ausschütten.',
  EDITION_MINIMUM_FOUR_PREMIUM_WINS:'Ein Premiumlos benötigt mindestens vier echte Geldgewinne.',
 EDITION_NO_AVAILABLE_UNLOCK:'Kein zu diesem Profil passender Freischaltpreis ist mehr in der Auflage vorhanden.',
 LOGIN_REQUIRED:'Bitte zuerst mit deinem DOG-Spielerprofil anmelden.'
})[error]||String(error||'Unbekannter Fehler');};
function showMessage(value,kind=''){
 const el=$('preview-message');el.textContent=value;el.className='preview-message '+kind;
 const global=$('studio-global-message');
 if(global){global.textContent=value;global.hidden=!value;global.className='studio-global-message '+kind}
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
  printSize:number('ed-print-size'),
  ticketPrice:number('ed-price'),maxTotalCoins:number('ed-budget'),targetTotalCoins:number('ed-target'),
  targetTolerancePercent:number('ed-tolerance'),volatility:number('ed-volatility'),
  premiumFull27Tickets:current.id==='premium_27'?number('ed-full27'):0,
  maxPerTicketCoins:number('ed-max-coins'),
  maxPrizesPerTicket:number('ed-max-prizes'),maxUnlocks:number('ed-max-unlocks'),
  quotas,doubleWin:{
   chancePer1000:Math.round(number('ed-double-chance')*10),
   minTickets:number('ed-double-min'),maxTickets:number('ed-double-max')
  },symbolBudgets:old.symbolBudgets,gameSettings:old.gameSettings??null};
 applyAutomaticSymbolMix(drafts[current.id],current);
 return drafts[current.id];
}
function draftKey(value){return JSON.stringify(value)}
function invalidatePreview(){
 persistDrafts();
 preview=null;previewKey=null;
 const sampleButton=$('ed-inspect'),samples=$('preview-samples');
 if(sampleButton)sampleButton.hidden=true;
 if(samples)samples.replaceChildren();
 $('preview-state').textContent='Nach Änderungen neu berechnen';
 $('ed-publish').disabled=true;
 $('preview-chart').replaceChildren(node('p','','Die Einstellungen wurden geändert. Berechne die Auflage erneut.'));
 $('preview-target').hidden=true;
 $('preview-economy').hidden=true;
 $('preview-currencies').hidden=true;
 $('preview-double').hidden=true;
 $('simple-prize-confirmed').hidden=true;
 $('preview-metrics').replaceChildren(...[
  ['🎟️ Lose',fmt(sizeOf())],['🏆 Gewinnlose','–'],['❄️ Nieten','–'],['🪙 Gesamtauszahlung','–']
 ].map(([name,value])=>metric(name,value)));
 showMessage('');
}
function metric(label,value){
 const div=node('div');div.append(node('span','',label),node('strong','',value));return div;
}
const stepLabels={overview:'Übersicht · Start',currency:'Schritt 1/4 · Gewinne & ✖️2',
 mechanic:'Schritt 2/4 · Gewinnchancen',quotas:'Schritt 3/4 · Gewinnverteilung',
 plan:'Schritt 4/4 · Prüfen & veröffentlichen',history:'Archiv · Historie'};
function renderDashboard(){
 const draft=drafts[current.id],doc=live[current.id];
 $('quick-price').textContent=fmt(draft.ticketPrice)+' 🪙';
 $('quick-target').textContent=fmt(draft.targetTotalCoins)+' 🪙';
 $('quick-double').textContent=fmt((draft.doubleWin?.chancePer1000||0)/10)+' %';
 $('quick-stock').textContent=doc?.status==='active'&&doc.remaining>0?
  fmt(doc.remaining)+' Lose übrig':signedIn()?'Keine aktive Auflage':'Anmeldung erforderlich';
 $('overview-current-title').textContent=current.icon+' '+current.name;
 $('overview-current-rule').textContent=current.rule;
 $('overview-budget').textContent=fmt(draft.maxTotalCoins)+' 🪙 max.';
 $('overview-target').textContent=fmt(draft.targetTotalCoins)+' 🪙';
 $('overview-active').textContent=doc?.status==='active'&&doc.remaining>0?
  fmt(doc.issued)+' verkauft · '+fmt(doc.remaining)+' übrig':'Keine aktive Auflage';
 $('tips-variant-title').textContent=current.icon+' '+current.name;
 $('tips-variant-rule').textContent=current.rule;
}
function simpleWinRule(){
 const draft=drafts[current.id],cfg=draft.gameSettings;
 if(current.id==='premium_27')return {shown:false,label:'Vier Geldreihen garantiert',
  explanation:'Vier Geldreihen sind garantiert. Die übrigen Gewinne werden automatisch verteilt.'};
 if(current.id==='tic_tac_toe')return {shown:false,label:'Tic-Tac-Toe entscheidet',
  explanation:'Die Dreierlinie entscheidet über den Gewinn. Die Symbole verteilt der Server automatisch.'};
 if(current.id==='number_one_20')return {shown:true,label:'🔢 Zahl-1-Chance je Reihe',
  explanation:'Jede der 20 Reihen hat ihre eigene Trefferchance. 10 % bedeutet etwa 1 Treffer je 10 Reihen.',
  value:(cfg?.hitPer1000??100)/10};
 if(current.id==='dog_jackpot_9')return {shown:true,label:'🐾 Chance auf DOG',
  explanation:'Wenn DOG erscheint, gewinnen alle acht weiteren Felder. Sonst ist das Los eine Niete.',
  value:(cfg?.dogChancePer1000??350)/10};
 return {shown:true,label:'🏆 Basis-Gewinnchance',
  explanation:'Anteil von Geld- oder Geschenkgewinnen. Die genaue Zahl der Gewinner wird im Probedruck berechnet.',
  value:(1000-(cfg?.weights?.none??200))/10};
}
function syncSimpleInputs(){
 const draft=drafts[current.id];
 $('simple-variant').value=current.id;
 $('simple-price').value=String(draft.ticketPrice);
 $('simple-print-size').value=String(draft.printSize);
 $('simple-light-budget').value=String(draft.symbolBudgets.lights?.maxTotal??0);
 $('simple-unlock-cap').value=String(draft.maxUnlocks);
 $('simple-budget').value=String(draft.maxTotalCoins);
 $('simple-double').value=String((draft.doubleWin?.chancePer1000??0)/10);
 $('simple-lights').value=String((draft.symbolBudgets.lights?.chancePer1000??0)/10);
 const rule=simpleWinRule();
 $('simple-win-field').hidden=!rule.shown;
 $('simple-win-label').textContent=rule.label;
 $('simple-win-explanation').textContent=rule.explanation;
 $('simple-win-chance').value=rule.shown?String(rule.value):'';
 renderSimplePrizeCounts();
 renderSimpleSymbols();
 updateSimpleSummary();
}
/** Only prize amounts and separate light odds remain adjustable. */
function renderSimpleSymbols(){
 const root=$('simple-symbol-grid');if(!root)return;
 root.replaceChildren(node('p','simple-symbol-auto-info',
  '✨ Die Häufigkeit von Münze, Geldschein, Koffer und Hauptgewinn-Symbolen übernimmt die Automatik. Du bestimmst die Beträge und festen Gewinnzahlen.'));
 const draft=drafts[current.id];
 for(const meta of CURRENCIES){
  const range=draft.symbolBudgets[meta.id],row=node('div','simple-symbol-row');
  const head=node('div','simple-symbol-name');
  head.append(node('strong','',meta.icon+' '+meta.name),
   node('small','',meta.id==='lights'?'Unabhängiger Bonus für das Dorf':
    meta.id==='gift'?'🎁 💝 🎀 🧧 🛍️ – Freischaltungen automatisch verteilt':
    'Gewinnbetrag einstellbar · Häufigkeit automatisch'));
  row.append(head);
  const field=(name,initial,minimum,maximum,action,step='1')=>{
   const label=node('label','simple-symbol-field');
   label.append(node('span','',name));
   const input=node('input');input.type='number';input.min=String(minimum);
   input.max=String(maximum);input.step=step;input.value=String(initial??0);
   input.inputMode='decimal';label.append(input);
   input.addEventListener('change',()=>{
    const n=Number(input.value);
    if(!Number.isFinite(n)||n<minimum||n>maximum||
       (step==='1'&&!Number.isSafeInteger(n))){renderSimpleSymbols();return}
    action(n);renderCurrency();updateSide();invalidatePreview();
   });
   row.append(label);
  };
  if(meta.id!=='gift'){
   field('Min.',range.min,1,50000000,n=>{range.min=n});
   field('Max.',range.max,1,50000000,n=>{range.max=n});
  }
  if(meta.id==='lights'){
   field('Chance %',(range.chancePer1000||0)/10,0,100,n=>{
    range.chancePer1000=Math.round(n*10);$('simple-lights').value=String(n);
   },'0.1');
  }
  if(meta.id==='gift')row.append(node('span','simple-symbol-automatic','✨ Automatisch'));
  root.append(row);
 }
}

function possibleWinCounts(){
 if(current.id==='tic_tac_toe')return [0,1];
 if(current.id==='dog_jackpot_9')return [0,8];
 if(current.id==='premium_27')return [4,5,6,7,8,9,10];
 return Array.from({length:current.id==='number_one_20'?21:11},(_,i)=>i);
}
function renderSimplePrizeCounts(){
 $('simple-prize-hint').classList.remove('has-error');
 const select=$('simple-prize-count'),entries=drafts[current.id].quotas||{};
 const valid=possibleWinCounts(),previous=Number(select.value);
 select.replaceChildren(...valid.map(count=>{
  const option=node('option','',count===0?'0 Gewinne · Niete':
   count===1?'1 Gewinn':count+' Gewinne gleichzeitig');
  option.value=String(count);return option;
 }));
 select.value=String(valid.includes(previous)?previous:valid.includes(8)?8:valid.at(-1));
 const root=$('simple-prize-rows');root.replaceChildren();
 const pairs=Object.entries(entries).filter(([,n])=>Number(n)>0)
  .sort((a,b)=>Number(b[0])-Number(a[0]));
 const fixed=pairs.reduce((sum,[,n])=>sum+Number(n),0);
 for(const [countRaw,tickets] of pairs){
  const count=Number(countRaw),row=node('div','simple-prize-row');
  row.append(node('span','simple-prize-row-label',count===0?'❄️ Nieten':
   '🏆 '+count+' '+(count===1?'Gewinn':'Gewinne')+' pro Los'));
  const quantity=node('label','simple-prize-row-qty');
  quantity.append(node('span','','Anzahl Lose'));
  const input=node('input');input.type='number';input.min='0';input.max=String(sizeOf());
  input.step='1';input.value=String(tickets);input.inputMode='numeric';
  input.setAttribute('aria-label','Wie viele Lose haben '+count+' Gewinne?');
  input.addEventListener('change',()=>{
   const n=Number(input.value);
   if(!Number.isSafeInteger(n)||n<0||n>sizeOf()){
    input.value=String(drafts[current.id].quotas[count]);return;
   }
   updateFixedPrizes(count,n);
  });
  quantity.append(input);row.append(quantity);
  const remove=node('button','simple-prize-remove','Entfernen');
  remove.type='button';remove.setAttribute('aria-label',
   'Vorgabe für '+count+' Gewinne entfernen');
  remove.addEventListener('click',()=>updateFixedPrizes(count,0));
  row.append(remove);root.append(row);
 }
 if(!pairs.length)root.append(node('p','simple-prize-empty',
  'Noch keine feste Anzahl. Die Lose werden automatisch zusammengestellt.'));
 $('simple-prize-fixed').textContent=fmt(fixed)+' von '+fmt(sizeOf())+' fest';
 $('simple-prize-remaining').textContent=fmt(Math.max(0,sizeOf()-fixed))+' automatisch';
 $('simple-prize-bar-fill').style.width=Math.min(100,100*fixed/sizeOf())+'%';
 $('simple-prize-clear').hidden=!pairs.length;
 const winset=current.id==='premium_27'?'Bei Premium sind mindestens 4 Gewinne pro Los garantiert.':
  current.id==='tic_tac_toe'?'Tic-Tac-Toe erlaubt 0 oder 1 Einzelgewinn pro Los.':
  current.id==='dog_jackpot_9'?'Finde DOG! erlaubt entweder 0 oder genau 8 Gewinne.':
  current.id==='number_one_20'?'Glückszahl 1 erlaubt 0 bis 20 Gewinne auf einem Los.':
  'Diese Losart erlaubt 0 bis 10 Einzelgewinne auf einem Los.';
 $('simple-prize-hint').textContent=winset+
  ' Eine Vorgabe von „5 Lose × 8 Gewinne“ reserviert genau fünf solcher Lose – nicht 5 Gewinne insgesamt.';
}
function updateFixedPrizes(count,tickets){
 if(!possibleWinCounts().includes(count)||!Number.isSafeInteger(tickets)||
  tickets<0||tickets>sizeOf())return;
 const draft=drafts[current.id],quotas={...(draft.quotas||{})};
 if(!tickets)delete quotas[count];
 else quotas[count]=tickets;
 const fixed=Object.values(quotas).reduce((sum,n)=>sum+Number(n||0),0);
 if(fixed>sizeOf()){
  renderSimplePrizeCounts();
  $('simple-prize-hint').textContent='⚠️ Höchstens '+fmt(sizeOf())+' Lose möglich. '+
   'Reduziere die Anzahl oder entferne eine andere feste Vorgabe.';
  $('simple-prize-hint').classList.add('has-error');
  return;
 }
 $('simple-prize-hint').classList.remove('has-error');
 draft.quotas=quotas;
 if(tickets>0&&count>draft.maxPrizesPerTicket){
  draft.maxPrizesPerTicket=count;
  $('ed-max-prizes').value=String(count);
 }
 // Keep the advanced quota editor and the simple editor synchronized.
 // readForm reads this advanced grid; therefore update it before readForm.
 renderQuota();
 readForm();updateSide();invalidatePreview();
}
function addFixedPrizeRow(){
 const count=Number($('simple-prize-count').value);
 const tickets=Number($('simple-prize-tickets').value);
 if(!Number.isSafeInteger(tickets)||tickets<1||tickets>sizeOf()){
  $('simple-prize-hint').textContent='Bitte eine ganze Zahl zwischen 1 und '+fmt(sizeOf())+' Losen eingeben.';
  $('simple-prize-hint').classList.add('has-error');return;
 }
 updateFixedPrizes(count,(Number(drafts[current.id].quotas[count])||0)+tickets);
}
function updateSimpleSummary(){
 const draft=drafts[current.id],active=live[current.id];
 $('simple-sales').textContent=fmt(draft.ticketPrice*draft.printSize)+' 🪙';
 $('simple-payout').textContent=fmt(draft.targetTotalCoins)+' 🪙';
 $('simple-availability').textContent=active?.status==='active'&&active.remaining>0?
  '🟢 '+fmt(active.remaining)+' von '+fmt(active.config?.printSize??500)+' Losen verfügbar':
  '🔒 Keine aktive Auflage';
}
function setSimpleNumber(field,value){
 const target=$(field);target.value=String(value);
 readForm();updateSide();invalidatePreview();
}
function changeSimpleWin(value){
 const draft=drafts[current.id],cfg=draft.gameSettings;
 if(!cfg||!Number.isFinite(value)||value<0||value>100)return;
 const n=Math.round(value*10);
 if(current.id==='number_one_20')cfg.hitPer1000=n;
 else if(current.id==='dog_jackpot_9')cfg.dogChancePer1000=n;
 else if(cfg.weights&&current.id!=='premium_27'){
  cfg.weights.none=1000-n;
  applyAutomaticSymbolMix(draft,current); }else return;
 // The established server quotas remain untouched; simple mode changes
 // probabilities only. Any exact manual quotas still apply if configured.
 updateSide();invalidatePreview();
}
function setupSimpleEditor(){
 $('simple-variant').addEventListener('change',()=>switchVariant($('simple-variant').value));
 $('simple-prize-add').addEventListener('click',addFixedPrizeRow);
 $('simple-prize-tickets').addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();addFixedPrizeRow()}
 });
 $('simple-prize-clear').addEventListener('click',()=>{
  const draft=drafts[current.id];
  draft.quotas={};
  renderQuota();readForm();updateSide();invalidatePreview();
 });
 $('simple-print-size').addEventListener('change',()=>{
  const n=Number($('simple-print-size').value);
  if(!Number.isSafeInteger(n)||n<1||n>500){syncSimpleInputs();return}
  const draft=drafts[current.id];
  $('ed-print-size').value=String(n);
  $('ed-target').value=String(Math.min(draft.targetTotalCoins,draft.maxTotalCoins,n*draft.maxPerTicketCoins));
  if(Number($('ed-double-max').value)>n)$('ed-double-max').value=String(n);
  if(Number($('ed-double-min').value)>n)$('ed-double-min').value=String(n);
  if(Number($('ed-max-unlocks').value)>n)$('ed-max-unlocks').value=String(n);
  readForm();updateSide();invalidatePreview();
 });
 $('simple-light-budget').addEventListener('change',()=>{
  const n=Number($('simple-light-budget').value);
  if(!Number.isSafeInteger(n)||n<0||n>1000000000000){syncSimpleInputs();return}
  drafts[current.id].symbolBudgets.lights.maxTotal=n;
  renderCurrency();updateSide();invalidatePreview();
 });
 $('simple-unlock-cap').addEventListener('change',()=>{
  const n=Number($('simple-unlock-cap').value);
  if(!Number.isSafeInteger(n)||n<0||n>500){syncSimpleInputs();return}
  setSimpleNumber('ed-max-unlocks',n);
 });
 $('simple-price').addEventListener('change',()=>{
  const n=Number($('simple-price').value);
  if(Number.isSafeInteger(n)&&n>=0&&n<=1000000)setSimpleNumber('ed-price',n);
  else syncSimpleInputs();
 });
 $('simple-budget').addEventListener('change',()=>{
  const n=Number($('simple-budget').value);
  if(!Number.isSafeInteger(n)||n<0||n>1000000000000){syncSimpleInputs();return}
  const draft=drafts[current.id],ratio=draft.maxTotalCoins>0?
   draft.targetTotalCoins/draft.maxTotalCoins:0.55;
  const target=Math.min(n,Math.round(n*ratio));
  $('ed-budget').value=String(n);$('ed-target').value=String(target);
  readForm();updateSide();invalidatePreview();
 });
 $('simple-win-chance').addEventListener('change',()=>{
  const n=Number($('simple-win-chance').value);
  if(!Number.isFinite(n)||n<0||n>100){syncSimpleInputs();return}
  changeSimpleWin(n);
 });
 $('simple-double').addEventListener('change',()=>{
  const n=Number($('simple-double').value);
  if(!Number.isFinite(n)||n<0||n>100){syncSimpleInputs();return}
  setSimpleNumber('ed-double-chance',Math.round(n*10)/10);
 });
 $('simple-lights').addEventListener('change',()=>{
  const n=Number($('simple-lights').value);
  if(!Number.isFinite(n)||n<0||n>100){syncSimpleInputs();return}
  drafts[current.id].symbolBudgets.lights.chancePer1000=Math.round(n*10);
  renderCurrency();updateSide();invalidatePreview();
 });
 $('simple-open-advanced').addEventListener('click',()=>activateView('currency'));
 $('simple-return').addEventListener('click',()=>activateView('overview'));
}
function validateDraftLocally(){
 const draft=drafts[current.id],errors=[];
 if(!Number.isSafeInteger(draft.printSize)||draft.printSize<1||draft.printSize>500)
  errors.push({view:'plan',message:'Wähle eine Auflagengröße zwischen 1 und 500 Losen.'});
 if(draft.maxUnlocks>draft.printSize||draft.doubleWin.minTickets>draft.printSize)
  errors.push({view:'plan',message:'Hauptgewinn- oder ✖️2-Stückzahlen überschreiten die Anzahl der Lose.'});
 if(!draft.title||draft.title.length>70)errors.push({view:'plan',message:'Bitte einen gültigen Auflagennamen eingeben.'});
 if(!Number.isSafeInteger(draft.ticketPrice)||draft.ticketPrice<0||draft.ticketPrice>1000000)
  errors.push({view:'plan',message:'Der Lospreis muss zwischen 0 und 1.000.000 liegen.'});
 if(!Number.isSafeInteger(draft.maxTotalCoins)||draft.maxTotalCoins<0||
   draft.targetTotalCoins<0||draft.targetTotalCoins>draft.maxTotalCoins||
   !Number.isSafeInteger(draft.targetTotalCoins))
  errors.push({view:'plan',message:'Die Zielauszahlung darf das Münz-Gesamtbudget nicht überschreiten.'});
 if(draft.targetTotalCoins>draft.maxPerTicketCoins*draft.printSize)
  errors.push({view:'plan',message:'Die Zielauszahlung ist höher als der maximal mögliche Gewinn dieser Auflage.'});
 if(draft.maxPerTicketCoins<0||draft.maxPrizesPerTicket<1||draft.maxUnlocks<0||
  ![draft.maxPerTicketCoins,draft.maxPrizesPerTicket,draft.maxUnlocks,draft.targetTolerancePercent]
    .every(Number.isSafeInteger))
  errors.push({view:'plan',message:'Die Auflagengrenzen müssen gültige ganze Zahlen sein.'});
 const quotient=Object.values(draft.quotas).reduce((a,b)=>a+Number(b||0),0);
 if(quotient>sizeOf()||Object.values(draft.quotas).some(n=>!Number.isInteger(n)||n<0||n>sizeOf()))
  errors.push({view:'quotas',message:'Die festgelegten Gewinnzahlen dürfen die Auflagengröße nicht überschreiten.'});
 if(current.id==='premium_27'&&draft.quotas[0]>0)
  errors.push({view:'quotas',message:'Beim Premiumlos sind Nieten aufgrund der garantierten Geldreihen nicht möglich.'});
 if(Object.entries(draft.quotas).some(([win,n])=>Number(n)>0&&!possibleWinCounts().includes(Number(win))))
  errors.push({view:'quotas',message:'Diese Losart erlaubt nicht jede gewählte Anzahl an Gewinnen.'});
 if(Object.entries(draft.quotas).some(([win,n])=>Number(n)>0&&Number(win)>draft.maxPrizesPerTicket))
  errors.push({view:'quotas',message:'Bitte das Maximum der Einzelgewinne je Los erhöhen.'});
 if(draft.doubleWin.minTickets>draft.doubleWin.maxTickets||
    ![draft.doubleWin.minTickets,draft.doubleWin.maxTickets,draft.doubleWin.chancePer1000]
      .every(Number.isSafeInteger)||
    draft.doubleWin.minTickets<0||draft.doubleWin.maxTickets>draft.printSize||
    draft.doubleWin.chancePer1000<0||draft.doubleWin.chancePer1000>1000)
  errors.push({view:'currency',message:'Bitte die ✖️2-Chance und das Minimum/Maximum prüfen.'});
 const budgets=draft.symbolBudgets;
 for(const [id,row] of Object.entries(budgets)){
  if(![row.min,row.max,row.minTotal,row.maxTotal].every(Number.isSafeInteger)||
    row.min>row.max||row.minTotal>row.maxTotal||
    row.min<0||row.maxTotal<0)
   errors.push({view:'currency',message:'Beim Gewinnsymbol '+id+' stimmt eine Mindest-/Höchstgrenze nicht.'});
 }
 const odds=draft.gameSettings||{},groups=[
  ['Gewinnarten',odds.weights&&Object.values(odds.weights)],
  ['Geldsymbole',odds.moneySymbolWeights],['Geschenke',odds.giftSymbolWeights],
  ['Symbolanteile',odds.symbolWeights]
 ];
 for(const [label,group] of groups){
  if(Array.isArray(group)&&group.some(n=>!Number.isInteger(n)||n<0||n>1000)||
     Array.isArray(group)&&group.reduce((a,b)=>a+b,0)!==1000)
   errors.push({view:'mechanic',message:label+': zusammen müssen genau 100 % erreicht werden.'});
 }
 if(draft.premiumFull27Tickets>0&&(draft.maxPrizesPerTicket<10||
    draft.maxUnlocks<draft.premiumFull27Tickets))
  errors.push({view:'plan',message:'27er-Premium-Jackpots benötigen 10 Gewinne und genügend Freischaltungen.'});
 return errors;
}
function renderPlanChecks(){
 const root=$('plan-checks');if(!root)return;
 const errors=validateDraftLocally();
 root.replaceChildren();
 if(!errors.length)root.append(node('li','check-good',
  '✅ Grundangaben und Prozentverteilungen sind schlüssig. Jetzt den echten Probedruck starten.'));
 for(const error of errors){
  const li=node('li','check-warning');
  const btn=node('button','', '⚠️ '+error.message+' · Einstellung öffnen');
  btn.type='button';btn.addEventListener('click',()=>activateView(error.view));
  li.append(btn);root.append(li);
 }
 $('ed-preview').disabled=busy||errors.length>0;
 const simple=$('simple-validation');
 if(simple){
  simple.replaceChildren();
  if(!errors.length)simple.append(node('span','is-valid','✓ Die Grundeinstellungen sind bereit für den Probedruck.'));
  else{
   simple.append(node('span','is-invalid','⚠️ '+errors[0].message));
   const action=node('button','simple-fix','Einstellung korrigieren');
   action.type='button';action.addEventListener('click',()=>activateView(errors[0].view));
   simple.append(action);
  }
 }
}
function updateSide(){
 const draft=drafts[current.id],nums=Object.values(draft.quotas);
 $('side-budget').textContent=fmt(draft.maxTotalCoins)+' 🪙';
 $('side-target').textContent=fmt(draft.targetTotalCoins)+' 🪙';
 $('side-price').textContent=fmt(draft.ticketPrice)+' 🪙';
 $('side-sales').textContent=fmt(draft.ticketPrice*draft.printSize)+' 🪙';
 $('side-lights').textContent=fmt(draft.symbolBudgets?.lights?.maxTotal||0)+' ⭐';
 $('ed-sales-projection').textContent=fmt(draft.ticketPrice*draft.printSize)+' 🪙';
 const portion=draft.maxTotalCoins>0?Math.min(100,draft.targetTotalCoins/draft.maxTotalCoins*100):0;
 $('target-progress-fill').style.width=portion.toFixed(1)+'%';
 $('target-progress-label').textContent=fmt(draft.targetTotalCoins)+' von '+fmt(draft.maxTotalCoins)+' 🪙';
 $('volatility-value').textContent=fmt(draft.volatility)+' %';
 $('side-max').textContent=fmt(draft.maxPerTicketCoins)+' 🪙';
 const sum=nums.reduce((n,x)=>n+(Number(x)||0),0);
 $('side-quotas').textContent=sum?fmt(sum)+' von '+fmt(draft.printSize)+' fest':'Automatisch';
 $('quota-sum').textContent=fmt(sum)+' von '+fmt(draft.printSize)+' fest eingeplant · '+fmt(Math.max(0,draft.printSize-sum))+' automatisch';
 $('quota-sum').style.color=sum>draft.printSize?'#ff9999':'#f3daae';
 const known=Object.entries(draft.quotas);
 const duds=Number(draft.quotas[0]||0);
 const rare=known.reduce((n,[count,v])=>n+(Number(count)>=8?Number(v):0),0);
 const regular=Math.max(0,sum-duds-rare);
 $('quota-meter-duds').style.width=(100*duds/draft.printSize)+'%';
 $('quota-meter-normal').style.width=(100*regular/draft.printSize)+'%';
 $('quota-meter-jackpots').style.width=(100*rare/draft.printSize)+'%';
 $('quota-description').textContent= sum?
  'Fest verplant: '+fmt(duds)+' Nieten · '+fmt(regular)+' normale Gewinnlose · '+
   fmt(rare)+' große Mehrfachgewinn-Lose. Rest frei: '+fmt(Math.max(0,draft.printSize-sum))+' Lose.':
  'Alle '+fmt(draft.printSize)+' Lose werden anhand der Gewinnregeln und des Budgets verteilt.';
 $('premium-quantity').textContent=fmt(draft.premiumFull27Tickets)+' / '+fmt(draft.printSize);
 $('ed-full27-range').value=String(Math.min(100,Math.max(0,draft.premiumFull27Tickets)));
 renderDashboard();renderPlanChecks();updateSimpleSummary();renderSimplePrizeCounts();renderSimpleSymbols();
}

function renderCurrency(){
 const root=$('currency-grid');root.replaceChildren();
 const draft=drafts[current.id],budgets=draft.symbolBudgets;
 for(const meta of CURRENCIES){
  const range=budgets[meta.id];
  const card=node('section','currency-card currency-'+meta.id);
  card.id='symbol-editor-'+meta.id;
  const heading=node('div','currency-card-heading'),
   icon=node('span','currency-card-icon',meta.icon),
   title=node('div');
  title.append(node('strong','',meta.name),node('small','',meta.description));
  heading.append(icon,title);card.append(heading);
  const fields=node('div','currency-fields');
  const build=(prop,label,max)=>{
   const field=node('label','currency-field');field.append(node('span','',label));
   if(prop==='minTotal'){
    field.dataset.advanced='true';
    field.hidden=!$('ed-advanced-limits').checked;
   }
   const input=node('input');input.type='number';input.min=prop==='chancePer1000'||meta.id==='gift'?'0':prop==='min'?'1':'0';
   input.max=String(max);input.step='1';input.inputMode='numeric';input.value=String(range[prop]);
   input.dataset.category=meta.id;input.dataset.property=prop;
   input.addEventListener('input',()=>{
    const n=Number(input.value);
    range[prop]=Number.isFinite(n)?n:NaN;
    updateSide();renderSymbolOverview();invalidatePreview();
   });
   field.append(input);fields.append(field);
  };
  build('min',meta.id==='gift'?'Min. Freischaltungen auf einem Los':'Mindestgewinn pro Treffer',
   meta.id==='gift'?20:50000000);
  build('max',meta.id==='gift'?'Max. Freischaltungen auf einem Los':'Höchstgewinn pro Treffer',
   meta.id==='gift'?20:50000000);
  build('minTotal',meta.id==='gift'?'Mindestens 🎁 in der Auflage':'Mindestbetrag dieser Auflage',
   meta.id==='gift'?500:1000000000000);
  build('maxTotal',meta.id==='gift'?'Maximal 🎁 in der Auflage':
   meta.id==='lights'?'Maximal ⭐ in der Auflage':'Gesamtbudget dieser Symbolart',
   meta.id==='gift'?500:1000000000000);
  if(meta.id==='lights'){
   const field=node('label','currency-field');
   field.append(node('span','','⭐ Lichtgewinn-Chance pro Los'));
   const wrapper=node('div','currency-percent-inline');
   const input=node('input');input.type='number';input.min='0';input.max='100';input.step='0.1';
   input.inputMode='decimal';input.value=String(range.chancePer1000/10);
   input.addEventListener('input',()=>{
    const n=Number(input.value);
    range.chancePer1000=Math.round(n*10);
    updateSide();renderSymbolOverview();invalidatePreview();
   });
   wrapper.append(input,node('b','','%'));field.append(wrapper,
    node('small','','20 % bedeutet: bei jedem Los etwa eine Chance von 1 zu 5 auf Lichter.'));
   fields.append(field);
  }
  card.append(fields);
  const badge=node('div','currency-card-foot',
   meta.id==='lights'?'⭐ Gewinner erhalten Lichter sofort auf das gemeinsame Dorfkonto.':
   meta.id==='gift'?'🎁 💝 🎀 🧧 🛍️: Jedes dieser fünf Symbole kann bei der jeweiligen Gewinnkombination den Hauptgewinn (Freischaltung) auslösen. Ein gemischtes Dreierpaar gilt nicht als Treffer.':
    '🪙 Diese Kategorie zählt zusätzlich zum Münzgesamtbudget.');
  card.append(badge);root.append(card);
 }
 $('currency-budget-remaining').textContent=fmt(draft.maxTotalCoins)+' 🪙 Gesamtobergrenze';
 renderSymbolOverview();
}
function renderSymbolOverview(){
 const root=$('symbol-overview');if(!root)return;
 root.replaceChildren();
 const ranges=drafts[current.id].symbolBudgets;
 for(const cat of CURRENCIES){
  const cfg=ranges[cat.id]||{};
  const tile=node('button','symbol-overview-tile symbol-overview-'+cat.id);
  tile.type='button';
  tile.title='Werte für '+cat.name+' bearbeiten';
  tile.append(node('span','symbol-overview-icon',
    cat.id==='gift'?'🎁 💝 🎀 🧧 🛍️':cat.icon),
   node('strong','',cat.name),
   node('span','symbol-overview-range',fmt(cfg.min)+'–'+fmt(cfg.max)+
    (cat.id==='gift'?' pro Los':' je Treffer')),
   node('small','','Auflage: '+fmt(cfg.minTotal)+'–'+fmt(cfg.maxTotal)+
    (cat.id==='lights'?' ⭐':cat.id==='gift'?' 🎁':' 🪙')));
  if(cat.id==='lights')
   tile.append(node('small','','Lichtchance: '+fmt((cfg.chancePer1000||0)/10)+' %'));
  tile.addEventListener('click',()=>document.getElementById('symbol-editor-'+cat.id)
   ?.scrollIntoView({behavior:'smooth',block:'center'}));
  root.append(tile);
 }
}
function renderPreviewCurrencies(s){
 const root=$('preview-currencies');root.replaceChildren();
 root.hidden=false;
 const totals=s.symbolTotals||{},counts=s.symbolHitCounts||{};
 root.append(node('h4','','⭐ Tatsächliche Ausschüttung je Gewinnsymbol'));
 for(const category of CURRENCIES){
  const cap=drafts[current.id].symbolBudgets?.[category.id]?.maxTotal??0;
  const earned=totals[category.id]||0;
  const item=node('div','currency-result-row');
  item.append(node('span','',category.icon+' '+category.name+
   ' · '+fmt(counts[category.id]||0)+' Einzelgewinne'),
   node('strong','',fmt(earned)+' / '+fmt(cap)+(category.id==='lights'?' ⭐':
    category.id==='gift'?' 🎁':' 🪙')));
  const meter=node('div','currency-result-meter'),fill=node('i');
  fill.style.width=(cap>0?Math.min(100,100*earned/cap):0)+'%';
  meter.append(fill);item.append(meter);root.append(item);
 }
}
function renderQuota(){
 const parent=$('quota-grid');parent.replaceChildren();
 const allowed=current.id==='premium_27'?
  Array.from({length:7},(_,i)=>i+4):
  current.id==='tic_tac_toe'?[0,1]:
  current.id==='dog_jackpot_9'?[0,8]:
  Array.from({length:current.id==='number_one_20'?21:11},(_,i)=>i);
 for(const count of allowed){
  const line=node('div','quota-row');line.dataset.count=String(count);
  const heading=node('strong','',count===0?'❄️ Niete · 0 Gewinne':
   '🏆 '+count+' '+(count===1?'Gewinn':'Gewinne'));
  const field=node('input');
  field.type='number';field.min='0';field.max=String(sizeOf());field.step='1';
  field.inputMode='numeric';field.dataset.count=String(count);
  field.placeholder='Automatisch';
  const quota=drafts[current.id].quotas[count];
  field.value=Number.isInteger(quota)?String(quota):'';
  field.setAttribute('aria-label','Anzahl Lose mit '+count+' Gewinnen');
  const description=node('small','',count===0?'Ohne Preis':count===10&&current.id==='premium_27'?
   '10 Gewinne · 27-Felder-Bonus möglich':count>current.wins?'Nur wenn höhere Gewinnzahl erlaubt':
   'Genau '+count+' Treffer');
  line.append(heading,field,description);parent.append(line);
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

/** Reset legacy manually weighted symbol mixes for UNPUBLISHED drafts.
 * Keep the independent basic winning chance, but use current game defaults
 * for symbol and gift distribution. Published editions are immutable. */
function applyAutomaticSymbolMix(draft,variant){
 const cfg=draft?.gameSettings,defaults=defaultGameSettings(variant);
 if(!cfg||!defaults)return;
 for(const key of ['moneySymbolWeights','symbolWeights','giftSymbolWeights']){
  if(!Array.isArray(defaults[key]))continue;
  let arr=[...defaults[key]];
  if(key==='giftSymbolWeights'&&arr.length===4){
   arr=arr.map(n=>Math.floor(n*.9));
   arr.push(1000-arr.reduce((sum,n)=>sum+n,0));
  }
  cfg[key]=arr;
 }
 if(cfg.weights&&defaults.weights){
  const none=Math.max(0,Math.min(1000,Math.round(Number(cfg.weights.none??defaults.weights.none))));
  const total=(defaults.weights.coins||0)+(defaults.weights.unlock||0);
  const unlock=total?Math.round((1000-none)*(defaults.weights.unlock||0)/total):0;
  cfg.weights={...cfg.weights,none,coins:1000-none-unlock,unlock};
 }
}

function renderGameSettings(root){
 const v=current,draft=drafts[v.id];
 if(!draft.gameSettings)draft.gameSettings=defaultGameSettings(v);
 const cfg=draft.gameSettings;
 if(Array.isArray(cfg?.giftSymbolWeights)&&cfg.giftSymbolWeights.length===4){
  const scaled=cfg.giftSymbolWeights.map(weight=>Math.floor(weight*0.9));
  cfg.giftSymbolWeights=[...scaled,1000-scaled.reduce((sum,x)=>sum+x,0)];
 }
 if(!cfg)return;
 const section=node('div','mechanic-card');
 section.append(node('h4','','⚙️ Zusätzliche Spieleinstellungen'),
  node('p','','Hier kannst du seltene Treffer und Sonderregeln für diese Auflage fein einstellen. '+
   'Hauptchancen darunter stehen direkt in Prozent; du brauchst keine Promille umzurechnen.'));
 const grid=node('div','field-layout');grid.style.marginTop='15px';
 const field=(label,property,index=null,min=0,max=50000000)=>{
  const item=node('label','field');item.append(node('span','',label));
  const input=node('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';
  input.inputMode='numeric';input.value=String(index===null?cfg[property]:cfg[property]?.[index]??0);
  input.addEventListener('input',()=>{
   const n=Number(input.value);
   if(index===null)cfg[property]=n;
   else cfg[property][index]=n;
   invalidatePreview();updateSide();
  });
  item.append(input);grid.append(item);
 };
 // Percent groups are shown as percentages, never raw promille.
 // All values are still written in server-native 0..1000 integer units.
 const percentGroup=(heading,explanation,labels,initial,save)=>{
  const group=node('section','odds-group');
  group.append(node('h5','',heading),node('p','',explanation));
  const rows=node('div','odds-percent-grid'),inputs=[];
  const totalLabel=node('small','odds-sum');
  const render=values=>{
   inputs.forEach((el,i)=>el.value=(values[i]/10).toLocaleString('de-DE',{
    useGrouping:false,maximumFractionDigits:1}).replace(',','.'));
   const total=values.reduce((a,b)=>a+b,0);
   totalLabel.textContent=total===1000?'✅ Zusammen genau 100 %':
    '⚠️ Gesamt: '+(total/10).toLocaleString('de-DE',{maximumFractionDigits:1})+
     ' % · Bitte auf 100 % einstellen';
   totalLabel.dataset.valid=String(total===1000);
  };
  for(const [i,label] of labels.entries()){
   const cell=node('label','odds-percent-field');
   cell.append(node('span','',label));
   const wrapper=node('div','odds-percent-control'),input=node('input');
   input.type='number';input.min='0';input.max='100';input.step='0.1';
   input.value=String((initial[i]||0)/10);input.inputMode='decimal';
   wrapper.append(input,node('b','','%'));cell.append(wrapper);rows.append(cell);
   inputs.push(input);
   input.addEventListener('change',()=>{
    const entered=Number(input.value);
    if(!Number.isFinite(entered)||entered<0||entered>100){
     input.value=String((initial[i]||0)/10);return;
    }
    const current=inputs.map(n=>Math.max(0,Math.min(1000,Math.round(Number(n.value)*10))));
    const next=$('ed-auto-percent').checked?
     rebalanceOdds(current,i,entered*10):current;
    initial=[...next];save(next);render(next);invalidatePreview();updateSide();updateSide();
   });
  }
  const actions=node('div','odds-group-actions'),equal=node('button','odds-equal','⚖️ Gleichmäßig aufteilen');
  equal.type='button';equal.addEventListener('click',()=>{
   const q=Math.floor(1000/labels.length);
   const next=labels.map((_,i)=>q+(i<1000-q*labels.length?1:0));
   initial=[...next];save(next);render(next);invalidatePreview();
  });
  actions.append(equal,totalLabel);
  group.append(rows,actions);render(initial);root.append(group);
 };
 if(cfg.weights){
  field('🎉 Zusatzmünzen (%)','extraCoinChance',null,0,100);
  field('🏆 Maximalgewinne der Spielmechanik','maxPrizes',null,v.id==='premium_27'?6:1,10);
 }
 const singlePercent=(label,key,description)=>{
  const item=node('label','field');
  item.append(node('span','',label));
  const wrapper=node('div','currency-percent-inline'),input=node('input');
  input.type='number';input.min='0';input.max='100';input.step='0.1';
  input.inputMode='decimal';input.value=String((cfg[key]||0)/10);
  input.addEventListener('input',()=>{
   cfg[key]=Math.round(Number(input.value)*10);
   invalidatePreview();updateSide();
  });
  wrapper.append(input,node('b','','%'));
  item.append(wrapper,node('small','',description));grid.append(item);
 };
 if(v.id==='number_one_20')
  singlePercent('🎯 Chance auf Zahl 1 je Reihe','hitPer1000',
   'Bei 20 Reihen wird für jede Reihe einzeln geprüft. 10 % bedeutet eine 1-in-10-Chance pro Reihe.');
 if(v.id==='tic_tac_toe')field('🎰 Höchster Multiplikator','maxMultiplier',null,1,5);
 if(v.id==='dog_jackpot_9')singlePercent('🐾 DOG-Trefferchance','dogChancePer1000',
  'Wie oft erscheint DOG? Nur wenn DOG aufgedeckt wird, werden die acht weiteren Felder ausgezahlt.');
 if(cfg.giftFallbackCoins!==undefined)
  field('🎁 Münzen statt Freischaltung','giftFallbackCoins',null,0,50000000);
 section.append(grid);
 if(cfg.weights){
  const keys=['none','coins','unlock'];
  percentGroup('① Gewinnarten', 'Wie oft ist ein Los eine Niete, ein Geldtreffer oder ein freischaltbarer Hauptgewinn? '+
   'Dies sind die Basisanteile; bei Premium bleiben vier Geldreihen garantiert.',
   ['❄️ Niete','🪙 Geldgewinn','🎁 Hauptgewinn'],
   keys.map(k=>cfg.weights[k]),vals=>keys.forEach((k,i)=>{cfg.weights[k]=vals[i]}));
 }
 if(Array.isArray(cfg.moneySymbolWeights)){
  percentGroup('② Geldsymbole','Wie werden die Geldgewinne auf Münze, Schein und Koffer verteilt?',
   ['🪙 Münze','💵 Geldschein','💼 Koffer'],cfg.moneySymbolWeights,
   vals=>cfg.moneySymbolWeights=[...vals]);
 }
 if(Array.isArray(cfg.symbolWeights)){
  percentGroup('② Symbolverteilung','Gewinnchance pro Symbolart. Die fünf Geschenke teilen sich den Geschenk-Anteil.',
   ['🪙 Münze','💵 Schein','💼 Koffer','🎁 Hauptgewinn'],cfg.symbolWeights,
   vals=>cfg.symbolWeights=[...vals]);
 }
 if(Array.isArray(cfg.giftSymbolWeights)){
  percentGroup('③ Die fünf Hauptgewinn-Symbole',
   'Welches Geschenk-Symbol erscheint, wenn ein Freischaltgewinn gezogen wurde?',
   ['🎁 Geschenk','💝 Herz','🎀 Schleife','🧧 Umschlag','🛍️ Geschenktüte'],
   cfg.giftSymbolWeights,vals=>cfg.giftSymbolWeights=[...vals]);
 }
 const footer=node('p','','✨ Automatik an: Ändere nur eine Chance; der Rest wird automatisch auf 100 % ergänzt. '+
  'Die Geldbeträge und Gesamtbudgets stellst du übersichtlich in Schritt 1 ein. '+
  '✖️2 hat eine zusätzliche eigene Chance und gehört nicht zur 100-%-Summe.');
 footer.style.marginTop='12px';section.append(footer);root.append(section);
}
function renderRules(){
 const root=$('mechanic-content');root.replaceChildren();
 const v=current,classic=settings?.variants?.[v.id],numberSettings=settings?.numberOne20;
 renderGameSettings(root);
 const details=node('details','rule-disclosure');details.append(node('summary','',
  '📖 Vollständige Regeln und momentane Serverwerte ansehen'));
 const one=node('div','mechanic-card');
 one.append(node('h4','',v.icon+' '+v.name+' · '+v.short),
  node('p','',v.rule));
 details.append(one);
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
 details.append(note);
 const caveat=node('div','mechanic-card');
 caveat.append(node('h4','','🛡️ Gewinnprüfung'),
  node('p','','Jedes vorgedruckte Los wird vom vorhandenen Gewinnmotor erstellt. Das Studio darf die ausgezahlte Münzsumme nur durch Auswahl passender, tatsächlich gewinnender Spielbretter steuern – nicht durch verdeckte Zusatzbeträge. Hauptgewinne, die der Spieler bereits besitzt, werden bei der Einlösung nach Möglichkeit durch andere noch freie Freischaltungen ersetzt.'));
 details.append(caveat);root.append(details);
}

function renderSpec(){
 const v=current,c=catalog[v.id];
 const rules=c||{
  fields:v.id==='premium_27'?27:v.id==='number_one_20'?40:
   v.id==='elf'?20:v.id==='snow_collect'?16:9,
  scratchFields:v.id==='tic_tac_toe'?11:(v.id==='number_one_20'?40:
   v.id==='premium_27'?27:v.id==='elf'?20:v.id==='snow_collect'?16:9),
  lineLabel:v.id==='premium_27'?'9 Reihen':v.id==='number_one_20'?'20 Gewinnreihen':
   v.id==='dog_jackpot_9'?'1 DOG-Auslöser':v.id==='snow_collect'?'3 gleiche irgendwo':
   v.id==='elf'?'Variable Gewinnpfade':'8 geometrische Linien',
  maxWins:v.wins,minWins:v.id==='premium_27'?4:0,standardPrice:v.price,
  mechanic:v.rule,extras:'Der Server bestätigt Gewinne anhand der echten Rubbelregel.'
 };
 $('spec-hero-title').textContent=v.icon+' '+v.name+' · Los-Steckbrief';
 $('spec-hero-description').textContent=c?'Aktueller Render-Gewinnmotor':'Grundregeln – Serverdaten werden geladen';
 $('spec-live-price').textContent=fmt(live[v.id]?.config?.ticketPrice??rules.standardPrice??v.price)+' 🪙 aktuell';
 const metrics=[
  ['🔲 Spielfelder',fmt(rules.fields)],
  ['🎯 Gewinnlinien',rules.lineCount===null?'Variabel':rules.lineCount===0?'Keine':fmt(rules.lineCount)],
  ['🏆 Max. Gewinne',fmt(rules.maxWins)],
  ['🪙 Normalpreis',fmt(rules.standardPrice??v.price)]
 ];
 const holder=$('spec-kpis');holder.replaceChildren();
 for(const [title,value] of metrics){
  const card=node('div');card.append(node('span','',title),node('strong','',value));holder.append(card);
 }
 const diagram=$('spec-board-preview');diagram.replaceChildren();
 const rows=rules.boardRows??(v.id==='premium_27'?9:v.id==='number_one_20'?20:
  v.id==='elf'?4:v.id==='snow_collect'?4:3);
 const cols=rules.boardCols??(v.id==='number_one_20'?2:v.id==='elf'?5:
  v.id==='snow_collect'?4:3);
 diagram.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
 diagram.style.setProperty('--spec-cell-height',rows>10?'13px':rows>8?'19px':'24px');
 const glyphs=['🪙','💵','💼','🎁','❄️','🎄','🪙','⭐','💵','💼','🎁','🎀'];
 for(let i=0;i<rows*cols;i++){
  const symbol=v.id==='tic_tac_toe'?((i%4===0)?'◯':'✕'):
   v.id==='number_one_20'?(i%2===0?glyphs[Math.floor(i/2)%4]:(i%7===1?'1':String(i%9+2))):
   v.id==='dog_jackpot_9'?(i===4?'🐾':glyphs[i%4]):
   v.id==='premium_27'?(i<12?['🪙','💵','💼','🪙'][Math.floor(i/3)]:
     glyphs[(i-12)%glyphs.length]):glyphs[i%glyphs.length];
  const cell=node('span','spec-mini-cell',symbol);
  if(v.id==='premium_27'&&i<12||v.id==='dog_jackpot_9'&&i===4||
   v.id==='number_one_20'&&symbol==='1')cell.classList.add('is-highlight');
  diagram.append(cell);
 }
 const detail=$('spec-detail');detail.replaceChildren();
 const line=(label,value)=>{
  const item=node('p');item.append(node('b','',label+' '),document.createTextNode(String(value)));
  detail.append(item);
 };
 line('Gewinnmöglichkeiten:',rules.lineLabel||'Variabel');
 line('Maximal gleichzeitig:',fmt(rules.maxWins)+' Einzelpreise · Mindestens: '+fmt(rules.minWins||0));
 line('Rubbelstellen:',fmt(rules.scratchFields||rules.fields));
 line('Grundregel:',rules.mechanic||v.rule);
 line('Alle fünf Hauptgewinn-Symbole:',(rules.jackpotSymbols||['🎁','💝','🎀','🧧','🛍️']).join(' · '));
 line('Hauptgewinn:', 'Eine verifizierte Geschenkkombination löst eine freischaltbare Belohnung aus; sind keine neuen Designs verfügbar, gelten die bisherigen Ersatzpreis-Regeln.');
 line('Weitere Gewinnsymbole:', '🪙 Goldmünze · 💵 Geldschein · 💼 Geldkoffer · ⭐ Weihnachtslichter');
 if(rules.baseMatches)line('Echte Basis-Treffer:',rules.baseMatches);
 if(rules.extras)line('Besonderheit:',rules.extras);
 if(c?.configuredMaxPrizes!==undefined)
  line('Aktueller regulärer Shop:',fmt(c.configuredMaxPrizes)+' eingestellte maximale Einzelgewinne');
 if(c?.coinAmounts?.length===3)
  line('Momentane Geldwerte:','🪙 '+fmt(c.coinAmounts[0])+' · 💵 '+fmt(c.coinAmounts[1])+
   ' · 💼 '+fmt(c.coinAmounts[2])+' Münzen');
}
function renderLive(){
 const doc=live[current.id];
 const label=$('edition-availability'),root=$('live-edition');
 root.replaceChildren();
 if(!doc){
  label.textContent='Noch keine Auflage';label.classList.remove('live');
  root.append(node('p','live-detail','🔒 Keine aktive Auflage. Veröffentliche zuerst eine neue Serie.'));
 }else{
  label.textContent=doc.remaining>0?doc.remaining+' von '+fmt(doc.config?.printSize??500)+' übrig':'🔒 Aktuell keine Auflage vorhanden';
  label.classList.toggle('live',doc.remaining>0);
  root.append(node('div','live-total',fmt(doc.remaining)+' / '+fmt(doc.config?.printSize??500)));
  const track=node('div','live-progress'),bar=node('i');
  bar.style.width=(doc.issued/5)+'%';track.append(bar);root.append(track);
  const description=node('div','live-detail');
  description.append(node('b','',doc.title),node('div','',
   'Druck: '+new Date(doc.createdAt).toLocaleString('de-DE')+' · Ausgabe '+doc.id),
   node('div','','Ausgegeben: '+fmt(doc.issued)+' Lose'),
   ...(doc.remaining===0?[node('div','','🔒 Serie ausverkauft · Neue Auflage erforderlich')]:[]),
   node('div','','Ausgezahlt: '+fmt(doc.issuedCoins)+' 🪙'),
   node('div','','Weihnachtslichter: '+fmt(doc.issuedLights)+' ⭐'),
   node('div','','Gesamtdruck: '+fmt(doc.summary?.totalCoins)+' 🪙'),
   node('div','','Gewinnlose: '+fmt(doc.summary?.winners)+' · Nieten: '+fmt(doc.summary?.duds)));
  root.append(description);
 }
 $('ed-retire').hidden=!doc||doc.status!=='active'||doc.remaining<=0;
 renderDashboard();updateSimpleSummary();
 $('ed-publish').disabled=busy||!preview?.previewId||previewKey!==draftKey(drafts[current.id])||
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
 const select=$('simple-variant');
 select.replaceChildren(...VARIANTS.map(v=>{
  const option=node('option','',v.icon+' '+v.name);
  option.value=v.id;return option;
 }));
 select.value=current.id;
}
function activateView(name,scroll=true){
 if(!stepLabels[name])return;
 view=name;
 const advanced=name!=='overview';
 $('advanced-studio').hidden=!advanced;
 document.body.classList.toggle('studio-expert',advanced);
 if(!advanced)syncSimpleInputs();
 for(const button of document.querySelectorAll('.subtab')){
  const active=button.dataset.view===name;
  button.classList.toggle('active',active);
  button.setAttribute('aria-selected',String(active));
  if(active)button.setAttribute('aria-current','step');
  else button.removeAttribute('aria-current');
 }
 for(const section of document.querySelectorAll('.inner-view'))
  section.hidden=section.id!=='view-'+name;
 $('wizard-progress-label').textContent=stepLabels[name];
 if(name==='plan')renderPlanChecks();
 if(name==='history')void loadHistory();
 if(scroll)(advanced?document.querySelector('.wizard-heading'):
  document.querySelector('.simple-studio'))?.scrollIntoView({
  behavior:'smooth',block:'start'});
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
 $('ed-print-size').value=d.printSize??500;
 $('ed-price').value=d.ticketPrice;
 $('ed-double-chance').value=(d.doubleWin?.chancePer1000??0)/10;
 $('ed-double-min').value=d.doubleWin?.minTickets??0;
 $('ed-double-max').value=d.doubleWin?.maxTickets??0;
 $('ed-target').value=d.targetTotalCoins;
 $('ed-tolerance').value=d.targetTolerancePercent;
 $('ed-volatility').value=d.volatility;
 $('ed-full27').value=d.premiumFull27Tickets;
 $('premium-highlight').hidden=variant.id!=='premium_27';
 renderPremiumBoard();
 $('ed-max-coins').value=d.maxPerTicketCoins;
 $('ed-max-prizes').value=d.maxPrizesPerTicket;
 $('ed-max-unlocks').value=d.maxUnlocks;
 renderTabs();renderQuota();renderCurrency();renderRules();renderSpec();renderLive();updateSide();invalidatePreview();
 syncSimpleInputs();
 activateView('overview',false);
}
function showPreview(data){
 preview=data;previewKey=draftKey(drafts[current.id]);
 $('ed-inspect').hidden=!data.previewId;
 $('preview-samples').replaceChildren();
 const s=data.summary||{};
 $('preview-state').textContent='✓ Server-Probedruck';
 const summaryTarget=$('preview-target');summaryTarget.replaceChildren();
 summaryTarget.hidden=s.targetTotalCoins===null||s.targetTotalCoins===undefined;
 if(!summaryTarget.hidden){
  const delta=Number(s.deltaToTarget||0);
  const target=s.targetTotalCoins;
  const inside=Math.abs(delta)<=target*drafts[current.id].targetTolerancePercent/100;
  summaryTarget.className='preview-target '+(inside?'good':'bad');
  summaryTarget.append(node('strong','',fmt(s.totalCoins)+' 🪙'),
   node('span','','von '+fmt(target)+' Münzen Zielauszahlung · '+
    (delta>0?'+':'')+fmt(delta)+' Münzen Abweichung ('+
    fmt(s.targetDifferencePercent||0)+' %)'));
  if(current.id==='premium_27')summaryTarget.append(node('p','',
   '👑 '+fmt(s.premiumFull27Tickets)+' vollständig gefüllte 27-Felder-Tickets mit maximal 10 Gewinnen.'));
  const track=node('div','target-meter'),progress=node('i');
  progress.style.width=(target?Math.min(100,s.totalCoins/target*100):100)+'%';
  track.append(progress);summaryTarget.append(track);
 }
 renderPreviewCurrencies(s);
 const fixed=Object.entries(drafts[current.id].quotas)
  .filter(([,quantity])=>Number(quantity)>0).sort((a,b)=>Number(b[0])-Number(a[0]));
 const check=$('simple-prize-confirmed');
 check.hidden=!fixed.length;
 if(fixed.length)check.textContent='✓ Probedruck: '+
  fixed.map(([win,quantity])=>fmt(s.byWins?.[Number(win)]??0)+
   ' Lose mit '+win+' Gewinnen (gewünscht: '+fmt(quantity)+')').join(' · ')+
  '. Alle festen Gewinnzahlen wurden serverseitig geprüft.';
 $('preview-double').hidden=false;
 $('preview-double').textContent='✖️2-Verteilung: '+fmt(s.doubleWinTickets||0)+
  ' von '+fmt(s.tickets)+' Losen haben einen sichtbaren Verdopplungsbonus. Zusätzlich verteilt: '+
  fmt(s.doubleExtraCoins||0)+' 🪙 und '+fmt(s.doubleExtraLights||0)+
  ' ⭐. Diese Beträge sind in den jeweiligen Gesamtbudgets enthalten.';
 $('preview-economy').hidden=false;
 $('preview-income').textContent=fmt(s.projectedGrossRevenue??s.ticketPrice*s.tickets)+' 🪙';
 $('preview-expense').textContent=fmt(s.totalCoins)+' 🪙';
 const net=s.projectedNetCoins??(s.projectedGrossRevenue-s.totalCoins);
 $('preview-profit').textContent=(net<0?'−':'')+fmt(Math.abs(net))+' 🪙';
 $('preview-ratio').textContent=s.payoutRatioPercent===null?'Kein Verkaufserlös':fmt(s.payoutRatioPercent)+' %';
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
  for(const item of editions.catalog||[])catalog[item.variantId]=item;
  if(current.id==='number_one_20'&&drafts.number_one_20.ticketPrice===500)
   drafts.number_one_20.ticketPrice=catalog.number_one_20?.standardPrice??500;
  $('ed-price').value=drafts[current.id].ticketPrice;
  renderRules();renderSpec();updateSide();renderLive();syncSimpleInputs();
  showMessage('✓ Einstellungen und aktuelle Auflagen geladen.','good');
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
     ' · '+doc.status+' · '+fmt(doc.issued)+'/'+fmt(doc.config?.printSize??500)+' ausgegeben · '+
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
 renderLive();renderPlanChecks();
}
$('edition-tabs').addEventListener('change',()=>{});
document.querySelectorAll('.subtab').forEach(button=>
 button.addEventListener('click',()=>activateView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button=>
 button.addEventListener('click',()=>activateView(button.dataset.go)));
$('quota-clear').addEventListener('click',()=>{
 $('quota-grid').querySelectorAll('input').forEach(input=>input.value='');
 readForm();updateSide();invalidatePreview();
});
for(const id of ['ed-name','ed-price','ed-print-size','ed-budget','ed-target','ed-tolerance',
 'ed-max-coins','ed-max-prizes','ed-max-unlocks','ed-double-chance','ed-double-min','ed-double-max']){
 $(id).addEventListener('input',()=>{readForm();updateSide();invalidatePreview()});
}
$('quota-grid').addEventListener('input',()=>{readForm();updateSide();invalidatePreview()});
$('ed-volatility').addEventListener('input',()=>{readForm();updateSide();invalidatePreview()});
$('ed-symbol-next').addEventListener('click',()=>activateView('mechanic'));
$('ed-chance-shortcut').addEventListener('click',()=>activateView('mechanic'));
$('ed-advanced-limits').addEventListener('change',()=>{
 for(const field of $('currency-grid').querySelectorAll('[data-advanced]'))
  field.hidden=!$('ed-advanced-limits').checked;
});
$('ed-preview').addEventListener('click',async()=>{
 const draft=readForm();
 if(!signedIn()){showMessage('Bitte zuerst mit deinem DOG-Profil anmelden.','error');return}
 setBusy(true);showMessage('🎲 Render berechnet '+fmt(sizeOf())+' Lose und prüft alle Gewinnlimits …');
 try{
  const result=await api('/editions/preview',{config:draft});
  showPreview(result);
  document.querySelector('.preview-section')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){
  invalidatePreview();
  const quotaProblem=/^(EDITION_DISTRIBUTION_IMPOSSIBLE_SLOT_|EDITION_GENERATION_EXHAUSTED_SLOT_|EDITION_AUTO_DISTRIBUTION_EXHAUSTED_SLOT_)/.test(String(e.message||''));
  showMessage('⚠️ '+labelFor(e.message)+(quotaProblem?'':'. Prüfe Budget, Gewinnzahlen und Spielchancen.'),'error');
  // Explicit one-click correction: only raise a proven monetary minimum.
  // Never adjust any fixed ticket-count quota without the player's consent.
  const minimum=String(e.message).match(/^EDITION_BUDGET_MIN_REQUIRED_(\d+)_AVAILABLE_\d+$/);
  const perTicket=String(e.message).match(/^EDITION_TICKET_MIN_REQUIRED_(\d+)_AVAILABLE_\d+$/);
  if(minimum||perTicket){
   const required=Number((minimum||perTicket)[1]);
   const field=minimum?'ed-budget':'ed-max-coins';
   const label=minimum?'Gesamtbudget':'Gewinnlimit pro Los';
   const fix=node('button','simple-fix','🪙 '+label+' auf '+fmt(required)+' anheben');
   fix.type='button';
   fix.addEventListener('click',()=>{
    setSimpleNumber(field,required);
    syncSimpleInputs();
    showMessage('✅ '+label+' angepasst. Deine festen Gewinnzahlen sind unverändert. Berechne die Auflage erneut.','good');
   });
   $('preview-message').append(fix);
  }
 }
 finally{setBusy(false)}
});
// Each sample belongs to the immutable, server-checked draft. Never reveal
// its serial number or predict which customer receives which card.
$('ed-inspect').addEventListener('click',async()=>{
 if(!preview?.previewId||previewKey!==draftKey(drafts[current.id]))return;
 const output=$('preview-samples');
 output.replaceChildren(node('p','','🔍 Echte Gewinnfelder werden geladen …'));
 try{
  const result=await api('/editions/preview/'+encodeURIComponent(preview.previewId)+'/tickets');
  if(result.previewId!==preview?.previewId)return;
  output.replaceChildren();
  const cols=current.id==='number_one_20'?2:current.id==='premium_27'?3:
   current.id==='snow_collect'?4:current.id==='elf'?5:3;
  for(const [i,ticket] of (result.tickets||[]).entries()){
   const card=node('details','printed-ticket-sample');
   card.append(node('summary','', '🎟️ Musterlos '+(i+1)+' · '+
    (ticket.winnings?.length||0)+' Gewinne · '+fmt(ticket.totalCoins)+' 🪙 · '+
    fmt(ticket.totalLights)+' ⭐'+(ticket.doubleWin?' · ✖️2':'')));
   const grid=node('div','printed-ticket-board');
   grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
   (ticket.board?.cells||[]).forEach((symbol,j)=>{
    const cell=node('span','printed-ticket-cell',typeof symbol==='object'?
     JSON.stringify(symbol):String(symbol));
    if(j===ticket.lightBadgeIndex)cell.append(node('b','printed-ticket-badge','⭐'));
    if(j===ticket.doubleBadgeIndex)cell.append(node('b','printed-ticket-badge','✖️2'));
    grid.append(cell);
   });
   const prizeList=node('div','printed-ticket-prizes');
   for(const prize of ticket.winnings||[]){
    prizeList.append(node('span','',prize.type==='unlock'?
     '🎁 '+(prize.prize?.name||'Freischaltung'):
     (prize.symbol||'🪙')+' '+fmt(prize.amount)+' '+
      (prize.type==='lights'?'Lichter':'Münzen')+(prize.x2?' (✖️2)':'')));
   }
   if(!prizeList.childNodes.length)prizeList.append(node('span','','❄️ Niete'));
   card.append(grid,prizeList);output.append(card);
  }
  output.prepend(node('p','printed-ticket-note',
   '8 echte Muster aus diesem Probedruck. Die Ausgabereihenfolge bleibt verborgen.'));
 }catch(e){output.replaceChildren(node('p','preview-message error','⚠️ '+labelFor(e.message)))}
});
$('ed-publish').addEventListener('click',async()=>{
 const draft=readForm();
 if(!preview?.previewId||previewKey!==draftKey(draft))return;
 if(!window.confirm(fmt(sizeOf())+' neue '+current.name+'-Lose jetzt serverseitig drucken und im Spiel aktivieren? Eine bestehende Auflage darf nicht noch offene Lose haben.'))return;
 setBusy(true);showMessage('🖨️ Render aktiviert die bereits geprüften Lose – ohne neue Ziehung …');
 try{
  const published=await api('/editions/publish',{config:draft,previewId:preview.previewId});
  if(!published.edition||!published.published)throw Error('Auflage nicht bestätigt');
  if(JSON.stringify(published.edition.summary)!==JSON.stringify(preview.summary))
   throw Error('Die veröffentlichte Verteilung weicht von der geprüften Vorschau ab.');
  live[current.id]=published.edition;
  showMessage('✅ Edition veröffentlicht: '+fmt(published.edition.summary.totalCoins)+
   ' Münzen in '+fmt(published.edition.summary.tickets)+' servergeprüften Losen · ID '+published.edition.id,'good');
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
// Preserve saved drafts independently of any already published server print run.
function replaceCurrentDraft(next){
 drafts[current.id]=next;
 formInitialized=false; // do not overwrite the imported draft with stale inputs
 switchVariant(current.id);
}
$('ed-reset-draft').addEventListener('click',()=>{
 if(!window.confirm('Nur den Entwurf für „'+current.name+'“ auf Standardwerte zurücksetzen? Bereits veröffentlichte Lose bleiben unverändert.'))return;
 const fresh=baseDraft(current);
 fresh.gameSettings=defaultGameSettings(current);
 replaceCurrentDraft(fresh);
 showMessage('✅ Standardwerte für '+current.name+' wiederhergestellt.','good');
});
$('ed-import-draft').addEventListener('click',()=>$('ed-import-file').click());
$('ed-import-file').addEventListener('change',async()=>{
 const input=$('ed-import-file'),file=input.files?.[0];
 input.value='';
 if(!file)return;
 if(file.size>100000){showMessage('⚠️ Die Entwurfsdatei ist zu groß.','error');return}
 try{
  const data=JSON.parse(await file.text());
  const config=data?.config;
  if(data?.type!=='DOG-scratch-edition-draft'||!config||typeof config!=='object')
   throw Error('Das ist keine gültige DOG-Auflagendatei.');
  if(config.variantId!==current.id)
   throw Error('Diese Datei gehört zu einer anderen Losart: '+
    (VARIANTS.find(v=>v.id===config.variantId)?.name||config.variantId)+
    '. Bitte zuerst diese Losart auswählen.');
  if(config.quotas!==undefined&&(!config.quotas||typeof config.quotas!=='object'||
    Array.isArray(config.quotas)))throw Error('Ungültige Gewinnverteilung.');
  if(config.symbolBudgets!==undefined&&(!config.symbolBudgets||
    typeof config.symbolBudgets!=='object'||Array.isArray(config.symbolBudgets)))
    throw Error('Ungültige Symbolbudgets.');
  if(config.doubleWin!==undefined&&(!config.doubleWin||
    typeof config.doubleWin!=='object'||Array.isArray(config.doubleWin)))
    throw Error('Ungültige ✖️2-Einstellungen.');
  const fresh=baseDraft(current);
  for(const id of ['title','ticketPrice','printSize','maxTotalCoins','targetTotalCoins',
   'targetTolerancePercent','premiumFull27Tickets','volatility','maxPerTicketCoins',
   'maxPrizesPerTicket','maxUnlocks','quotas','doubleWin','gameSettings']){
   if(Object.hasOwn(config,id))fresh[id]=structuredClone(config[id]);
  }
  const defaults=defaultSymbolBudgets(current);
  for(const id of Object.keys(defaults))
   if(config.symbolBudgets?.[id]&&typeof config.symbolBudgets[id]==='object')
    defaults[id]={...defaults[id],...config.symbolBudgets[id]};
  fresh.symbolBudgets=defaults;
  fresh.doubleWin={...baseDraft(current).doubleWin,...(fresh.doubleWin||{})};
  replaceCurrentDraft(fresh);
  showMessage('✅ Entwurf für '+current.name+' geladen. Prüfe die Werte und erstelle einen neuen Probedruck.','good');
 }catch(error){
  showMessage('⚠️ Entwurf konnte nicht geladen werden: '+error.message,'error');
 }
});
$('ed-export').addEventListener('click',()=>{
 const data={type:'DOG-scratch-edition-draft',version:1,createdAt:new Date().toISOString(),
  config:readForm(),lastPreview:preview?.summary||null};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const href=URL.createObjectURL(blob),link=node('a');
 link.href=href;link.download='DOG-Auflage-'+current.id+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
});

function renderPremiumBoard(){
 const board=$('premium-board-preview');
 board.replaceChildren();
 const symbols=['🪙','🪙','🪙','💵','💵','💵','💼','💼','💼',
  '🪙','🪙','🪙','🎁','🎁','🎁','❄️','🎄','🔔','🧸','🍪','🧤',
  '🎄','🛷','⭐','✨','🎀','🎁'];
 symbols.forEach((symbol,i)=>{
  const cell=node('span','',symbol);cell.dataset.win=String(i<15);
  board.append(cell);
 });
}
function usePreset(id){
 const draft=drafts[current.id],v=current;
 const classic=['gifts','snow_collect','elf'].includes(v.id);
 let set={},full27=0;
 if(id==='auto'){set={};full27=0}
 else if(v.id==='premium_27'){
  if(id==='balanced')set={4:150,5:150,6:110,7:60,8:20,9:5,10:5};
  if(id==='rare')set={4:300,5:150,6:35,7:10,8:3,9:1,10:1};
  if(id==='jackpot'){set={4:110,5:120,6:100,7:75,8:55,9:20,10:20};full27=10;}
 }else if(v.id==='tic_tac_toe'){
  set=id==='balanced'?{0:220,1:280}:id==='rare'?{0:380,1:120}:{0:100,1:400};
 }else if(v.id==='dog_jackpot_9'){
  set=id==='balanced'?{0:325,8:175}:id==='rare'?{0:460,8:40}:{0:200,8:300};
 }else if(v.id==='number_one_20'){
  // Modest fixed quotas on number games are reachable with standard odds.
  set=id==='balanced'?{0:70,1:140,2:140,3:100,4:50}:
   id==='rare'?{0:200,1:200,2:75,3:25}:{0:20,1:100,2:150,3:140,4:90};
 }else if(classic){
  set=id==='balanced'?{0:110,1:130,2:120,3:90,5:40,10:10}:
   id==='rare'?{0:300,1:130,2:40,3:20,5:8,10:2}:
   {0:50,1:80,2:100,3:120,5:100,10:50};
 }
 // Scale presets to a custom print size while keeping the exact sum.
 if(draft.printSize!==500&&Object.keys(set).length){
  const rows=Object.entries(set).map(([count,n])=>({
   count,raw:n*draft.printSize/500,base:Math.floor(n*draft.printSize/500)
  }));
  let remaining=draft.printSize-rows.reduce((n,r)=>n+r.base,0);
  rows.sort((a,b)=>(b.raw-b.base)-(a.raw-a.base));
  for(let i=0;i<remaining;i++)rows[i%rows.length].base++;
  set=Object.fromEntries(rows.filter(r=>r.base>0).map(r=>[r.count,r.base]));
  full27=Math.min(set[10]||0,Math.round(full27*draft.printSize/500));
 }
 draft.quotas=set;
 draft.premiumFull27Tickets=full27;
 if(full27){
  draft.maxPrizesPerTicket=10;draft.maxUnlocks=Math.max(draft.maxUnlocks,full27);
  if(draft.gameSettings?.maxPrizes<10)draft.gameSettings.maxPrizes=10;
 }
 $('ed-max-prizes').value=draft.maxPrizesPerTicket;
 $('ed-max-unlocks').value=draft.maxUnlocks;
 $('ed-full27').value=full27;
 $('quota-advanced').open=id!=='auto';
 renderQuota();renderRules();updateSide();invalidatePreview();
 showMessage('✨ Gewinnverteilung „'+id+'“ vorbereitet. Passe sie nach Wunsch an und berechne deinen Probedruck.','good');
}
document.querySelectorAll('[data-preset]').forEach(button=>
 button.addEventListener('click',()=>usePreset(button.dataset.preset)));
function changeFull27(value){
 const count=Math.max(0,Math.min(sizeOf(),Math.round(Number(value)||0)));
 $('ed-full27').value=String(count);
 $('ed-full27-range').value=String(Math.min(100,count));
 const currentQuotas=drafts[current.id].quotas;
 if(count>0){
  const exactTen=currentQuotas[10];
  if(exactTen!==undefined&&exactTen<count){
   currentQuotas[10]=count;
   const quotaTen=$('quota-grid').querySelector('[data-count="10"]');
   if(quotaTen)quotaTen.value=String(count);
  }
  if(Number($('ed-max-prizes').value)<10)$('ed-max-prizes').value='10';
  if(Number($('ed-max-unlocks').value)<count)$('ed-max-unlocks').value=String(count);
  const gs=drafts[current.id].gameSettings;
  if(gs&&gs.maxPrizes!==undefined&&gs.maxPrizes<10)gs.maxPrizes=10;
 }
 readForm();updateSide();invalidatePreview();
}
$('ed-full27').addEventListener('input',()=>changeFull27($('ed-full27').value));
$('ed-full27-range').addEventListener('input',()=>changeFull27($('ed-full27-range').value));

// The budget step shows only essential controls first; advanced caps are
// still live, saved and verified when their panel is collapsed.
function organizeBudgetFields(){
 const main=$('view-plan').querySelector('.field-layout');
 if(!main)return;
 const panel=node('details','advanced-plan');
 const summary=node('summary','', '⚙️ Weitere Budgetgrenzen & Sicherheitslimits');
 const note=node('p','', 'Optional: Zielabweichung, maximaler Gewinn pro Los, Anzahl Einzelgewinne und Freischaltungen. Die vorhandenen Werte bleiben aktiv, auch wenn dieser Bereich zugeklappt ist.');
 const grid=node('div','field-layout');
 for(const id of ['ed-tolerance','ed-max-coins','ed-max-prizes','ed-max-unlocks']){
  const wrapper=$(id)?.closest('.field');
  if(wrapper)grid.append(wrapper);
 }
 panel.append(summary,note,grid);
 main.after(panel);
}
organizeBudgetFields();
setupSimpleEditor();
window.addEventListener('spielonline-change',()=>void load());
switchVariant(current.id);
void load();
