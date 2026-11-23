/**
 * One compact studio for the four DOG scratch cards that previously had no
 * finite edition controls: Elf, Premium 27, Number One and DOG Jackpot.
 * The signed Render receipt/edition ledger is always the only source of truth.
 */
import {mountScratchEditionManager} from './christmas-edition-management-ui.js?v=3';
export const OTHER_EDITOR_VARIANTS=Object.freeze(['elf','premium_27','number_one_20','dog_jackpot_9']);
const META=Object.freeze({
 elf:{title:'🧝 Magischer Wichtelpfad',rule:'Geld gewinnt nur über einen durchgehenden Pfad von links nach rechts. Geschenke benötigen 3 verbundene gleiche Symbole.',price:500,amounts:[100,300,800],category:2,none:200,gift:30,winMax:3,double:110,gold:300,dog:350},
 premium_27:{title:'👑 Premium-Weihnachtslos',rule:'Zwei echte Geld-Dreierreihen sind garantiert. 20 Felder schenken 1.000 Münzen; bei 24 kann ein Geschenk folgen.',price:1000,amounts:[200,800,2000],category:3,none:0,gift:40,winMax:3,double:0,gold:300,dog:350},
 number_one_20:{title:'🔢 Glückszahl 1',rule:'20 Reihen. Nur echte Zahlen mit der 1 gewinnen das Geldsymbol der gleichen Reihe. Für Auflagen sind bis zu drei Geldtreffer plus ein Geschenk pro Los vorgesehen.',price:500,amounts:[100,300,800],category:2,none:200,gift:30,winMax:3,double:0,gold:300,dog:350},
 dog_jackpot_9:{title:'🐾 Finde DOG!',rule:'Nur ein echtes DOG im 3×3-Feld gewinnt alle acht übrigen Preise. Ohne DOG = Niete. Münzgewinne werden exakt vorgeplant.',price:1000,amounts:[100,300,800],category:3,none:650,gift:40,winMax:3,double:0,gold:300,dog:350}
});
const labels={1:'🟤 Kategorie 1 · Einfach',2:'🔵 Kategorie 2 · Mittel',3:'🟡 Kategorie 3 · Premium'};
const number=n=>Number(n||0).toLocaleString('de-DE');
export function createOtherScratchStudio({account,query,drawShop,showAlert,stage,canManage=()=>false}){
 let editions={},active='elf',busy=false;
 const editionManagers={};
 const dialog=document.createElement('dialog');
 dialog.id='scratch-other-edition-dialog';
 dialog.className='scratch-gifts-settings-dialog scratch-tic-edition-dialog scratch-other-edition-dialog';
 dialog.setAttribute('aria-labelledby','oe-title');
 // Constant, authored UI markup. No remote data or player text enters HTML.
 dialog.innerHTML=`
 <form id="oe-form" novalidate>
   <header class="scratch-gifts-settings-head">
     <div><span class="scratch-gifts-eyebrow">🎟️ DOG · 500ER-AUFLAGENSTUDIO</span>
       <h3 id="oe-title">🧝 Magischer Wichtelpfad</h3>
       <p id="oe-rule"></p></div>
     <button type="button" id="oe-close" aria-label="Schließen">✕</button>
   </header>
   <section class="scratch-gifts-settings-section">
     <h4>🎟️ 1 · Los und Gewinnkategorie</h4>
     <div class="scratch-gifts-settings-grid">
       <div class="scratch-gifts-auto"><span>📦 Auflagengröße</span><strong>500 Lose</strong>
         <small>Für alle DOG-Spieler zusammen. Kein Los wird doppelt verkauft.</small></div>
       <label class="scratch-gifts-field"><span>🪙 Preis pro Los</span>
         <input id="oe-price" type="number" min="0" max="1000000" step="1" inputmode="numeric" required></label>
       <label class="scratch-gifts-field"><span>🎁 Gewinnkategorie bei Freischaltungen</span>
         <select id="oe-category">
           <option value="1">1 · Einfach – Standard-Emojis &amp; Farben</option>
           <option value="2">2 · Mittel – Designs &amp; Profilbilder</option>
           <option value="3">3 · Schwer / Premium – seltene Belohnungen</option>
         </select>
         <small>Geschenkpreise kommen ausschließlich aus diesem Pool. Andere Kategorien bleiben ausgeschlossen.</small>
       </label>
     </div>
   </section>
   <section class="scratch-gifts-settings-section">
     <h4>💰 2 · Geldwerte</h4>
     <p class="scratch-gifts-help">Der Betrag ist pro echter Gewinnkombination. Die drei Werte müssen steigen.</p>
     <div class="scratch-gifts-settings-grid">
       <label class="scratch-gifts-field"><span>🪙 Münze</span><input id="oe-coin-0" type="number" min="1" max="50000000" step="1" inputmode="numeric" required></label>
       <label class="scratch-gifts-field"><span>💵 Schein</span><input id="oe-coin-1" type="number" min="1" max="50000000" step="1" inputmode="numeric" required></label>
       <label class="scratch-gifts-field"><span>💼 Koffer</span><input id="oe-coin-2" type="number" min="1" max="50000000" step="1" inputmode="numeric" required></label>
     </div>
   </section>
   <section class="scratch-gifts-settings-section">
     <h4>🎯 3 · Gewinnchancen und Spielregeln</h4>
     <p class="scratch-gifts-help">Die Wahrscheinlichkeiten sind Zielwerte. Das feste Gesamtbudget wird zuerst exakt auf echte Treffer verteilt. Bei widersprüchlichen Vorgaben passt der Server die Trefferanzahl an.</p>
     <div class="scratch-gifts-settings-grid">
       <label class="scratch-gifts-field" id="oe-none-field"><span>❄️ Gewünschte Nieten (%)</span><input id="oe-none" type="number" min="0" max="100" step="0.1" required></label>
       <label class="scratch-gifts-field" id="oe-max-field"><span>🏆 Maximal 1–3 Geldtreffer pro Los</span>
         <select id="oe-max-prizes"><option value="1">1 Geldtreffer</option><option value="2">2 Geldtreffer</option><option value="3">3 Geldtreffer</option></select></label>
       <label class="scratch-gifts-field"><span>🎁 Gewünschte Geschenkchance (%)</span><input id="oe-gift" type="number" min="0" max="100" step="0.1" required>
         <small>Falls die Kategorie ausgeschöpft ist, werden keine fremden Freischaltungen ausgegeben.</small></label>
       <label class="scratch-gifts-field" id="oe-double-field"><span>✖️2 Verdopplungschance (%)</span><input id="oe-double" type="number" min="0" max="100" step="0.1" required>
         <small>Nur Wichtelpfad: Der Doppelgewinn ist sichtbar auf dem Geldpfad markiert.</small></label>
       <label class="scratch-gifts-field" id="oe-dog-field"><span>🐾 Gewünschte DOG-Jackpotquote (%)</span><input id="oe-dog" type="number" min="0" max="100" step="0.1" required>
         <small>Ein DOG löst acht sichtbare Gewinnfelder aus.</small></label>
       <label class="scratch-gifts-field" id="oe-gold-field"><span>🌟 Gewünschter 20-Felder-Goldbonus (%)</span><input id="oe-gold" type="number" min="0" max="100" step="0.1" required>
         <small>Nur beim Premiumlos: zusätzlich 1.000 Münzen; ab 24 kann ein Geschenk folgen.</small></label>
     </div>
   </section>
   <section class="scratch-gifts-settings-section scratch-gifts-edition-section">
     <h4>📦 4 · Festes Gesamtbudget</h4>
     <p class="scratch-gifts-help">Das Gewinnbudget wird im Voraus geplant. Genau der eingegebene Betrag wird bei allen 500 ausgegebenen Losen zusammen ausgezahlt – oder die Konfiguration vor Veröffentlichung abgelehnt.</p>
     <div class="scratch-gifts-settings-grid">
       <label class="scratch-gifts-field"><span>💰 Gewinnbudget für 500 Lose (Münzen)</span>
         <input id="oe-budget" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" required></label>
       <div class="scratch-gifts-auto"><span>📈 Einnahmen bei 500 bezahlten Losen</span><strong id="oe-revenue">– 🪙</strong>
         <small>Ohne Gutscheine und Dorfrabatte.</small></div>
     </div>
     <p id="oe-hint" class="scratch-gifts-help"></p>
     <div id="oe-status" class="scratch-gifts-edition-status" role="status" aria-live="polite"></div>
     <button id="oe-create" type="button" class="scratch-gifts-edition-create">📦 500er-Auflage verbindlich erstellen</button>
     <button id="oe-edit" type="button" class="scratch-gifts-edition-create" hidden>✏️ Aktuelle Restlose bearbeiten</button>
     <p class="scratch-gifts-help">Bereits gekaufte Lose und die dazugehörigen Gewinnbeträge sind unveränderlich. Nur das Erstellerprofil darf die noch nicht verkauften Lose bearbeiten.</p>
     <p id="oe-feedback" class="scratch-gifts-settings-feedback" role="status" aria-live="polite"></p>
   </section>
   <div class="scratch-gifts-settings-actions"><button id="oe-cancel" type="button">Schließen</button></div>
 </form>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id);
 const cardGear=document.createElement('button');
 cardGear.type='button';cardGear.id='scratch-other-edition-open';
 cardGear.className='scratch-gifts-settings-open scratch-other-edition-open';
 cardGear.textContent='⚙️ Auflage';cardGear.hidden=true;
 cardGear.setAttribute('aria-controls','scratch-other-edition-dialog');
 cardGear.setAttribute('aria-haspopup','dialog');
 stage.prepend(cardGear);
 const int=(id,min,max)=>{
  const node=$(id),raw=node.value.trim(),n=Number(raw);
  if(!raw||!Number.isSafeInteger(n)||n<min||n>max)
   throw Error('Bitte „'+node.closest('label')?.querySelector('span')?.textContent+'“ prüfen.');
  return n;
 };
 const permille=id=>{
  const node=$(id),raw=node.value.trim(),n=Number(raw);
  if(!raw||!Number.isFinite(n)||n<0||n>100||Math.abs(n*10-Math.round(n*10))>.000001)
   throw Error('Bitte „'+node.closest('label')?.querySelector('span')?.textContent+'“ in 0,1-%-Schritten eingeben.');
  return Math.round(n*10);
 };
 const set=(id,v)=>{$(id).value=String(v)};
 const showFields=()=>{
  for(const [id,yes] of [
   ['oe-none-field',active==='elf'||active==='number_one_20'],
   ['oe-max-field',active==='elf'||active==='number_one_20'],
   ['oe-double-field',active==='elf'],
   ['oe-dog-field',active==='dog_jackpot_9'],
   ['oe-gold-field',active==='premium_27']])
   $(id).hidden=!yes;
 };
 const configFor=variant=>{
  const e=editions[variant]?.config;
  const m=META[variant];
  return e??{
   price:m.price,coinAmounts:[...m.amounts],prizeCategory:m.category,
   maxPrizes:m.winMax,nonePer1000:m.none,giftPer1000:m.gift,
   doubleChancePer1000:m.double,dogChancePer1000:m.dog,goldChancePer1000:m.gold
  };
 };
 const read=()=>{
  const coinAmounts=[0,1,2].map(i=>int('oe-coin-'+i,1,50000000));
  if(!(coinAmounts[0]<coinAmounts[1]&&coinAmounts[1]<coinAmounts[2]))
   throw Error('Münzwerte müssen strikt steigen: Münze kleiner als Schein kleiner als Koffer.');
  const config={price:int('oe-price',0,1000000),coinAmounts,
   prizeCategory:int('oe-category',1,3),maxPrizes:int('oe-max-prizes',1,3),
   nonePer1000:permille('oe-none'),giftPer1000:permille('oe-gift'),
   doubleChancePer1000:permille('oe-double'),dogChancePer1000:permille('oe-dog'),
   goldChancePer1000:permille('oe-gold')};
  if(config.nonePer1000+config.giftPer1000>1000)
   throw Error('Nieten- und Geschenkquote dürfen zusammen 100 % nicht überschreiten.');
  return {config,maxTotalCoins:int('oe-budget',0,1000000000000)};
 };
 const update=()=>{
  const edition=editions[active],ongoing=Boolean(edition&&edition.remaining>0);
  const budget=Number($('oe-budget').value||0);
  $('oe-revenue').textContent=number(Number($('oe-price').value||0)*500)+' 🪙';
  $('oe-status').textContent=ongoing?
   '🟢 '+edition.issued+'/500 Lose verkauft · '+number(edition.remainingCoins)+' von '+
    number(edition.maxTotalCoins)+' 🪙 noch reserviert · '+edition.remaining+
    ' Restlose · 🎁 '+(labels[edition.config?.prizeCategory]||'Kategorie 2')+
    ' · '+number(edition.payingTicketsRemaining??0)+' Geldlose offen.':
   edition?'🏁 Die 500 Lose sind ausverkauft. Eine neue Auflage ist möglich.':
   '📦 Noch keine begrenzte Auflage für dieses Los veröffentlicht.';
  $('oe-create').disabled=ongoing||busy;
  $('oe-edit').hidden=!ongoing;
  $('oe-edit').disabled=!ongoing||busy;
  let hint='💡 Der feste Münzbetrag hat Vorrang vor den gewünschten Quoten. ';
  const [a,b,c]=[0,1,2].map(i=>Number($('oe-coin-'+i).value||0));
  if(active==='premium_27'){
   const min=500*2*a;
   hint+='Zwei bezahlte Geld-Dreierreihen pro Premium-Los sind garantiert. Bei 500 Losen beträgt das minimale Geldbudget '+
    number(min)+' 🪙 (ohne 20er-Bonus).';
   if(budget<min)hint+=' ⚠️ Das eingetragene Budget liegt darunter.';
  }else if(active==='dog_jackpot_9'){
   hint+='DOG zahlt alle acht Felder aus. Die genaue Quote kann durch das Budget abweichen.';
  }else{
   hint+='Geldtreffer erscheinen als echte passende Symbole und sichtbare Pfade/Zahlen.';
  }
  $('oe-hint').textContent=hint;
 };
 const fillCurrentValues=variant=>{
  if(!META[variant])return;
  const c=configFor(variant);
  $('oe-title').textContent=META[variant].title+' · Auflage';
  $('oe-rule').textContent=META[variant].rule;
  set('oe-price',c.price);
  set('oe-category',c.prizeCategory);
  set('oe-max-prizes',c.maxPrizes);
  set('oe-none',c.nonePer1000/10);
  set('oe-gift',c.giftPer1000/10);
  set('oe-double',c.doubleChancePer1000/10);
  set('oe-dog',c.dogChancePer1000/10);
  set('oe-gold',c.goldChancePer1000/10);
  for(let i=0;i<3;i++)set('oe-coin-'+i,c.coinAmounts[i]);
  const suggested=variant==='premium_27'?2200000:
   variant==='dog_jackpot_9'?400000:100000;
  set('oe-budget',editions[active]?.maxTotalCoins??suggested);
  update();
 };
 const open=variant=>{
  if(!META[variant])return;
  if(!account()){showAlert('🔐 Bitte zuerst im DOG-Profil anmelden.',variant);return}
  if(!canManage()){showAlert('🔒 Nur freigeschaltete Rubbellos-Administratoren dürfen Auflagen verwalten.',variant);return}
  active=variant;showFields();
  fillCurrentValues(variant);
  $('oe-feedback').textContent='';
  for(const variant of OTHER_EDITOR_VARIANTS){
   editionManagers[variant].root.hidden=variant!==active;
  }
  update();editionManagers[active].refresh();dialog.showModal();
 };
 async function submit(edit){
  const current=editions[active],button=$(edit?'oe-edit':'oe-create');
  if(busy)return;
  let config,maxTotalCoins;
  try{
   ({config,maxTotalCoins}=read());
   if(edit&&(!current||current.remaining<=0))throw Error('Es gibt keine aktive Auflage mit Restlosen.');
   if(edit&&maxTotalCoins<current.paidCoins)
    throw Error('Neues Budget darf nicht kleiner als bereits ausgezahlte '+number(current.paidCoins)+' Münzen sein.');
   if(!edit&&current?.remaining>0)throw Error('Die aktuelle Auflage hat noch '+current.remaining+' Restlose.');
   const category=labels[config.prizeCategory];
   const detail=edit?
    'Die bereits ausgegebenen '+current.issued+' Lose werden nicht verändert.':
    'Für 500 Lose wird ein fester Auszahlungsplan gespeichert.';
   if(!window.confirm((edit?'Restlose bearbeiten':'Auflage erstellen')+'?\n'+
    META[active].title+'\n'+category+'\nBudget: '+number(maxTotalCoins)+' 🪙\n'+detail))return;
   busy=true;update();
   $('oe-feedback').textContent='🔄 Render plant und überprüft alle Gewinnkombinationen …';
   const reply=await query('/editions/'+active+(edit?'/edit':''),
    edit?{config,maxTotalCoins,editionId:current.id,expectedRevision:current.revision}:
     {config,maxTotalCoins});
   if(!reply.otherEdition||reply.otherEdition.variantId!==active)
    throw Error('Die Auflage wurde vom Server nicht bestätigt.');
   editions[active]=reply.otherEdition;
   $('oe-feedback').textContent='✅ '+(edit?'Restlose geändert':'500er-Auflage erstellt')+
    ' · genau '+number(editions[active].remainingCoins)+' 🪙 für '+
    editions[active].remaining+' Restlose eingeplant.';
   drawShop();
  }catch(error){
   const code=String(error?.message||'SERVER_UNAVAILABLE');
   const messages={
    SCRATCH_OTHER_EDITION_BUDGET_UNREACHABLE:'Mit diesen Beträgen und Gewinnregeln kann das Budget nicht exakt auf die Lose verteilt werden. Bitte Budget oder Geldwerte ändern.',
    SCRATCH_OTHER_EDITION_SETTINGS_INVALID:'Einstellungen ungültig: Prüfe Gewinnwerte, Kategorie, Prozente und Lospreis.',
    SCRATCH_OTHER_EDITION_ACTIVE:'Es läuft bereits eine 500er-Auflage. Bitte die Restlose bearbeiten.',
    SCRATCH_OTHER_EDITION_SOLD_OUT:'Die 500er-Auflage ist ausverkauft. Erstelle eine neue Serie.',
    SCRATCH_EDITION_CHANGED:'Die Auflage wurde inzwischen geändert oder ein Los verkauft. Bitte neu laden.',
    SCRATCH_EDITION_ONLY_CREATOR:'Nur das Erstellerprofil darf noch nicht verkaufte Lose bearbeiten.'
   };
   $('oe-feedback').textContent='⚠️ '+(messages[code]||code);
  }finally{busy=false;update()}
 }
 $('oe-close').addEventListener('click',()=>dialog.close());
 $('oe-cancel').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 $('oe-form').addEventListener('submit',event=>event.preventDefault());
 for(const input of dialog.querySelectorAll('input, select'))
  input.addEventListener('input',update);
 $('oe-create').addEventListener('click',()=>void submit(false));
 $('oe-edit').addEventListener('click',()=>void submit(true));
 for(const variant of OTHER_EDITOR_VARIANTS){
  editionManagers[variant]=mountScratchEditionManager({
   dialog,variant,query,getEdition:()=>editions[variant]??null,
   onEdition:edition=>{editions[variant]=edition;update();drawShop()},
   onRetired:()=>{editions[variant]=null;update();drawShop()},
   onLoadCurrent:()=>fillCurrentValues(variant)
  });
  editionManagers[variant].root.hidden=variant!==active;
 }
 cardGear.addEventListener('click',()=>open(stage.dataset.variant));
 return {
  open,get:variant=>editions[variant]??null,
  load:data=>{editions=OTHER_EDITOR_VARIANTS.reduce((res,variant)=>
    ({...res,[variant]:data?.[variant]??null}),{})},
  receive:(variant,edition)=>{if(META[variant])editions[variant]=edition},
  reset:()=>{editions={};if(dialog.open)dialog.close();cardGear.hidden=true},
  onTicket:variant=>{cardGear.hidden=!META[variant]}
 };
}
