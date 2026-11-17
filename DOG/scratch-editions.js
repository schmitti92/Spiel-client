import {rebalanceOdds} from './scratch-odds.mjs?v=1';
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
 maxTotalCoins:variant.budget,targetTotalCoins:Math.round(variant.budget*.55),
 targetTolerancePercent:5,premiumFull27Tickets:0,volatility:70,
 ticketPrice:variant.price,maxPerTicketCoins:variant.one,
 maxPrizesPerTicket:variant.wins,
 maxUnlocks:variant.tier==='simple'?25:variant.tier==='medium'?20:25,quotas:{},
 doubleWin:{chancePer1000:110,minTickets:0,maxTickets:80},
 symbolBudgets:defaultSymbolBudgets(variant)
});
const drafts=Object.fromEntries(VARIANTS.map(v=>[v.id,baseDraft(v)]));
const live={};
const catalog={};
let current=VARIANTS[0],view='overview',settings=null,preview=null,previewKey=null,busy=false;
let formInitialized=false;
const labelFor=error=>({
 EDITION_STILL_ACTIVE:'Eine bestehende Auflage hat noch Restlose. Beende sie zuerst oder verkaufe sie vollständig.',
 EDITION_QUOTAS_OVER_500:'Mehr als 500 Lose sind fest eingeplant.',
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
  ticketPrice:number('ed-price'),maxTotalCoins:number('ed-budget'),targetTotalCoins:number('ed-target'),
  targetTolerancePercent:number('ed-tolerance'),volatility:number('ed-volatility'),
  premiumFull27Tickets:current.id==='premium_27'?number('ed-full27'):0,
  maxPerTicketCoins:number('ed-max-coins'),
  maxPrizesPerTicket:number('ed-max-prizes'),maxUnlocks:number('ed-max-unlocks'),
  quotas,doubleWin:{
   chancePer1000:Math.round(number('ed-double-chance')*10),
   minTickets:number('ed-double-min'),maxTickets:number('ed-double-max')
  },symbolBudgets:old.symbolBudgets,gameSettings:old.gameSettings??null};
 return drafts[current.id];
}
function draftKey(value){return JSON.stringify(value)}
function invalidatePreview(){
 preview=null;previewKey=null;
 $('preview-state').textContent='Nach Änderungen neu berechnen';
 $('ed-publish').disabled=true;
 $('preview-chart').replaceChildren(node('p','','Die Einstellungen wurden geändert. Berechne die 500 Lose erneut.'));
 $('preview-target').hidden=true;
 $('preview-economy').hidden=true;
 $('preview-currencies').hidden=true;
 $('preview-double').hidden=true;
 $('preview-metrics').replaceChildren(...[
  ['🎟️ Lose','500'],['🏆 Gewinnlose','–'],['❄️ Nieten','–'],['🪙 Gesamtauszahlung','–']
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
function validateDraftLocally(){
 const draft=drafts[current.id],errors=[];
 if(!draft.title||draft.title.length>70)errors.push({view:'plan',message:'Bitte einen gültigen Auflagennamen eingeben.'});
 if(!Number.isSafeInteger(draft.ticketPrice)||draft.ticketPrice<0||draft.ticketPrice>1000000)
  errors.push({view:'plan',message:'Der Lospreis muss zwischen 0 und 1.000.000 liegen.'});
 if(!Number.isSafeInteger(draft.maxTotalCoins)||draft.maxTotalCoins<0||
   draft.targetTotalCoins<0||draft.targetTotalCoins>draft.maxTotalCoins||
   !Number.isSafeInteger(draft.targetTotalCoins))
  errors.push({view:'plan',message:'Die Zielauszahlung darf das Münz-Gesamtbudget nicht überschreiten.'});
 if(draft.targetTotalCoins>draft.maxPerTicketCoins*500)
  errors.push({view:'plan',message:'Die Zielauszahlung ist höher als der maximal mögliche Gewinn aller 500 Lose.'});
 if(draft.maxPerTicketCoins<0||draft.maxPrizesPerTicket<1||draft.maxUnlocks<0||
  ![draft.maxPerTicketCoins,draft.maxPrizesPerTicket,draft.maxUnlocks,draft.targetTolerancePercent]
    .every(Number.isSafeInteger))
  errors.push({view:'plan',message:'Die Auflagengrenzen müssen gültige ganze Zahlen sein.'});
 const quotient=Object.values(draft.quotas).reduce((a,b)=>a+Number(b||0),0);
 if(quotient>500||Object.values(draft.quotas).some(n=>!Number.isInteger(n)||n<0||n>500))
  errors.push({view:'quotas',message:'Höchstens 500 Lose können mit festen Gewinnzahlen verplant werden.'});
 if(current.id==='premium_27'&&draft.quotas[0]>0)
  errors.push({view:'quotas',message:'Beim Premiumlos sind Nieten aufgrund der garantierten Geldreihen nicht möglich.'});
 if(draft.doubleWin.minTickets>draft.doubleWin.maxTickets||
    ![draft.doubleWin.minTickets,draft.doubleWin.maxTickets,draft.doubleWin.chancePer1000]
      .every(Number.isSafeInteger)||
    draft.doubleWin.minTickets<0||draft.doubleWin.maxTickets>500||
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
}
function updateSide(){
 const draft=drafts[current.id],nums=Object.values(draft.quotas);
 $('side-budget').textContent=fmt(draft.maxTotalCoins)+' 🪙';
 $('side-target').textContent=fmt(draft.targetTotalCoins)+' 🪙';
 $('side-price').textContent=fmt(draft.ticketPrice)+' 🪙';
 $('side-sales').textContent=fmt(draft.ticketPrice*500)+' 🪙';
 $('side-lights').textContent=fmt(draft.symbolBudgets?.lights?.maxTotal||0)+' ⭐';
 $('ed-sales-projection').textContent=fmt(draft.ticketPrice*500)+' 🪙';
 const portion=draft.maxTotalCoins>0?Math.min(100,draft.targetTotalCoins/draft.maxTotalCoins*100):0;
 $('target-progress-fill').style.width=portion.toFixed(1)+'%';
 $('target-progress-label').textContent=fmt(draft.targetTotalCoins)+' von '+fmt(draft.maxTotalCoins)+' 🪙';
 $('volatility-value').textContent=fmt(draft.volatility)+' %';
 $('side-max').textContent=fmt(draft.maxPerTicketCoins)+' 🪙';
 const sum=nums.reduce((n,x)=>n+(Number(x)||0),0);
 $('side-quotas').textContent=sum?fmt(sum)+' von 500 fest':'Automatisch';
 $('quota-sum').textContent=fmt(sum)+' von 500 fest eingeplant · '+fmt(Math.max(0,500-sum))+' automatisch';
 $('quota-sum').style.color=sum>500?'#ff9999':'#f3daae';
 const known=Object.entries(draft.quotas);
 const duds=Number(draft.quotas[0]||0);
 const rare=known.reduce((n,[count,v])=>n+(Number(count)>=8?Number(v):0),0);
 const regular=Math.max(0,sum-duds-rare);
 $('quota-meter-duds').style.width=(duds/5)+'%';
 $('quota-meter-normal').style.width=(regular/5)+'%';
 $('quota-meter-jackpots').style.width=(rare/5)+'%';
 $('quota-description').textContent= sum?
  'Fest verplant: '+fmt(duds)+' Nieten · '+fmt(regular)+' normale Gewinnlose · '+
   fmt(rare)+' große Mehrfachgewinn-Lose. Rest frei: '+fmt(Math.max(0,500-sum))+' Lose.':
  'Alle 500 Lose werden intelligent anhand des Ziel-Gesamtgewinns verteilt.';
 $('premium-quantity').textContent=fmt(draft.premiumFull27Tickets)+' / 500';
 $('ed-full27-range').value=String(Math.min(100,Math.max(0,draft.premiumFull27Tickets)));
 renderDashboard();renderPlanChecks();
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
  build('minTotal',meta.id==='gift'?'Mindestens 🎁 auf 500 Losen':'Mindestbetrag in allen 500 Losen',
   meta.id==='gift'?500:1000000000000);
  build('maxTotal',meta.id==='gift'?'Maximal 🎁 auf 500 Losen':
   meta.id==='lights'?'Maximal ⭐ in allen 500 Losen':'Gesamtbudget dieser Symbolart',
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
  field.type='number';field.min='0';field.max='500';field.step='1';
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
  root.append(node('p','live-detail','🔒 Aktuell keine Auflage vorhanden. Neue Lose sind im Spiel gesperrt, bis du eine neue 500er-Auflage veröffentlichst.'));
 }else{
  label.textContent=doc.remaining>0?doc.remaining+' von 500 übrig':'🔒 Aktuell keine Auflage vorhanden';
  label.classList.toggle('live',doc.remaining>0);
  root.append(node('div','live-total',fmt(doc.remaining)+' / 500'));
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
 renderDashboard();
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
}
function activateView(name,scroll=true){
 if(!stepLabels[name])return;
 view=name;
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
 if(scroll)document.querySelector('.wizard-heading')?.scrollIntoView({
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
 activateView('overview',false);
}
function showPreview(data){
 preview=data;previewKey=draftKey(drafts[current.id]);
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
 $('preview-double').hidden=false;
 $('preview-double').textContent='✖️2-Verteilung: '+fmt(s.doubleWinTickets||0)+
  ' von 500 Losen haben einen sichtbaren Verdopplungsbonus. Zusätzlich verteilt: '+
  fmt(s.doubleExtraCoins||0)+' 🪙 und '+fmt(s.doubleExtraLights||0)+
  ' ⭐. Diese Beträge sind in den jeweiligen Gesamtbudgets enthalten.';
 $('preview-economy').hidden=false;
 $('preview-income').textContent=fmt(s.projectedGrossRevenue??s.ticketPrice*500)+' 🪙';
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
  renderRules();renderSpec();updateSide();renderLive();showMessage('✓ Render verbunden. Einstellungen und aktuelle Auflagen geladen.','good');
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
for(const id of ['ed-name','ed-price','ed-budget','ed-target','ed-tolerance',
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
 if(!preview?.previewId||previewKey!==draftKey(draft))return;
 if(!window.confirm('500 neue '+current.name+'-Lose jetzt serverseitig drucken und im Spiel aktivieren? Eine bestehende Auflage darf nicht noch offene Lose haben.'))return;
 setBusy(true);showMessage('🖨️ Render aktiviert exakt die 500 zuvor geprüften Lose – ohne neue Ziehung …');
 try{
  const published=await api('/editions/publish',{config:draft,previewId:preview.previewId});
  if(!published.edition||!published.published)throw Error('Auflage nicht bestätigt');
  if(JSON.stringify(published.edition.summary)!==JSON.stringify(preview.summary))
   throw Error('Die veröffentlichte Verteilung weicht von der geprüften Vorschau ab.');
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
 const count=Math.max(0,Math.min(500,Math.round(Number(value)||0)));
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
window.addEventListener('spielonline-change',()=>void load());
switchVariant(current.id);
void load();
