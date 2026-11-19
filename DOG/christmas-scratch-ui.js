/**
 * DOG Lichtertal scratch tickets. No write occurs while a field is scratched.
 * The signed-in Render service creates a card with immutable win combinations.
 */
export const SCRATCH_TICKET_TYPES=Object.freeze([
 {id:'simple',icon:'🟤',label:'Einfach',price:200,coinMax:100,unlockChance:'11,1',rewards:'47 klassische Emojis · 16 Blockfarben',odds:'20 % Nieten · 68,9 % Münzen · 11,1 % Freischaltungen'},
 {id:'medium',icon:'🔵',label:'Mittel',price:500,coinMax:800,unlockChance:'3',rewards:'5 Profilbilder · 4 Weihnachts-Emojis · Rahmen · Aktivsymbol · Spielbrett',odds:'20 % Nieten · 77 % Münzen · 3 % Freischaltungen'},
 {id:'premium',icon:'🟡',label:'Premium',price:1000,coinMax:2000,unlockChance:'4',rewards:'10 Profilbilder · 4 Weihnachts-Emojis · 2 Rahmen · 2 Aktivsymbole · 2 Hintergründe · Spielbrett',odds:'4 Geld-Dreierreihen garantiert · 30 % Chance auf +1.000 Münzen · 4 % Freischaltungen'}
]);
export const SCRATCH_COIN_PRIZES=Object.freeze({
 simple:Object.freeze([10,40,100]),
 medium:Object.freeze([100,300,800]),
 premium:Object.freeze([200,800,2000])
});
// Four distinct and directly selectable cards; three price classes stay unchanged.
export const SCRATCH_SHOP_VARIANTS=Object.freeze([
 Object.freeze({id:'gifts',tier:'simple',icon:'🎁',name:'Geschenkelinie',subtitle:'Einfach · 9 Felder',rule:'3 gleiche Gewinnzeichen in einer Linie',theme:'gift'}),
 Object.freeze({id:'snow_collect',tier:'simple',icon:'❄️',name:'Schneeflocken-Bingo',subtitle:'Einfach · 16 Felder',rule:'3 gleiche Gewinnzeichen irgendwo',theme:'snow'}),
 Object.freeze({id:'elf',tier:'medium',icon:'🧝',name:'Magischer Wichtelpfad',subtitle:'Mittel · 20 Felder',rule:'Geld: Pfad · Geschenke: 3 verbunden',theme:'elf'}),
 Object.freeze({id:'premium_27',tier:'premium',icon:'👑',name:'Premium-Weihnachtslos',subtitle:'Premium · 27 Felder',rule:'4 sichere Geld-Dreierreihen · 20 Symbole = 1.000 🪙 (30 %)',theme:'gold'}),
  Object.freeze({id:'tic_tac_toe',tier:'medium',icon:'⭕',name:'DOG Tic-Tac-Toe',subtitle:'Duell · 9 Felder',rule:'Multiplikator → Gewinnzeichen → Gewinnsymbol unten → 3×3-Feld',theme:'tictac'}),
  Object.freeze({id:'number_one_20',tier:'medium',icon:'🔢',name:'Glückszahl 1',subtitle:'Zahlenlos · 20 × 2',rule:'Beide Spalten rubbeln · jede 1 gewinnt links',theme:'number20'}),
  Object.freeze({id:'dog_jackpot_9',tier:'premium',icon:'🐾',name:'Finde DOG!',subtitle:'DOG-Jackpot · 9 Felder',rule:'DOG finden = alle 8 Preisfelder gewinnen',theme:'dogjackpot'})
]);
const VARIANTS={
  number_one_20:['🔢 Die Glückszahl 1','20 Reihen mit zwei Rubbelspalten. Links das verdeckte Gewinnsymbol, rechts die verdeckte Zahl. Nur eine 1 gewinnt den Preis derselben Reihe.',20,2],
  dog_jackpot_9:['🐾 Finde DOG!','Neun verdeckte Felder. Ein DOG-Symbol gewinnt alle acht übrigen Preise, ohne DOG ist das Los eine Niete.',3,3],
  tic_tac_toe:['🎯 DOG Tic-Tac-Toe','Erst Faktor, dann ◯/✕, dann das Gewinnsymbol ganz unten und danach das 3×3-Spielfeld aufrubbeln. Eine passende Linie gewinnt das Gewinnsymbol × Multiplikator.',3,3],
 premium_27:['🎅 Premium-Weihnachts-Rubbellos','Mindestens 4 Geld-Dreierreihen sind garantiert. Je 3 gleiche Geldsymbole waagerecht gewinnen. 20 echte Symbole bringen 1.000 Zusatzmünzen; ab 24 ist eine Freischaltung möglich.',9,3],
 gifts:['🎁 Geschenkelinie','Drei gleiche Gewinnsymbole in einer Reihe, Spalte oder Diagonale',3,3],
 snow:['❄️ Schneeflocken-Bingo (älteres Los)','Vier gleiche Symbole in einer Reihe, Spalte oder Diagonale',4,4],
 snow_collect:['❄️ Schneeflocken-Bingo','Drei gleiche Gewinnsymbole irgendwo auf dem Los zählen als Gewinn – unabhängig von der Position. 🧊 bedeutet Niete und zählt nicht.',4,4],
 stars:['⭐ Sternensammler','Vier gleiche Sterne beliebig auf dem Los',3,4],
 elf:['🧝 Magischer Wichtelpfad','Ein durchgehender Weg gleicher Symbole von links nach rechts. Nachbarfelder zählen nur waagerecht oder senkrecht, niemals diagonal.',4,5],
 reindeer:['🦌 Rentierglück','Drei gleiche Rentiere beliebig auf dem Los',3,4],
 candy:['🍬 Zuckerstangen-Duell','Jedes identische Paar in einer Zweierreihe gewinnt',3,2],
 tree:['🎄 Weihnachtsbaum-Los','Stern, Baum und Geschenk in genau dieser Reihenfolge: ⭐ 🎄 🎁',5,3],
 cookie:['🍪 Lebkuchen-Memory','Ein 2×2-Feld mit zwei passenden Symbolpaaren',4,4],
 diamond:['💎 Diamantenjagd','Drei Diamanten beliebig auf dem Los',3,3],
 bells:['🔔 Glocken-Jackpot','Fünf gleiche Symbole waagerecht oder Glocken-Diamant',4,5]
};
const el=(tag,cls,str)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(str!==undefined)n.textContent=String(str);
 return n;
};
const num=v=>Number(v||0).toLocaleString('de-DE');
const prizeLabel=p=>p?.type==='coins'?(p.bonus?'🎉 Zusatzgewinn · ':'')+(p.symbol||'🪙')+' '+num(p.amount)+' Münzen'+(p.x2?' (×2)':''):
 p?.type==='lights'?'⭐ '+num(p.amount)+' Weihnachtslichter für Lichtertal'+(p.x2?' (✖️2)':''):
 p?.type==='unlock'?(p.symbol||'🎁')+' Freischaltung: '+(p.prize?.icon?p.prize.icon+' ':'')+(p.prize?.name||'Freischaltung'):'';
const symbolLegend=(tier,values=null)=>{
 const [coin,note,bag]=Array.isArray(values)&&values.length===3?values:
  SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
 return '🪙 '+num(coin)+' · 💵 '+num(note)+' · 💼 '+num(bag)+' Münzen · 🎁 💝 🎀 🧧 🛍️ (Hauptgewinn) · ⭐ Weihnachtslichter · ✖️2 Verdopplungsbonus';
};
/**
 * Premium milestone counters are purely visual. The server-issued board
 * determines the prize: counting 🧊 never grants coins or collectibles.
 * revealedIndices contains only cells the player has scratched or uncovered.
 */
export function premiumScratchProgress(board,revealedIndices=[]){
 if(board?.variantId!=='premium_27'||!Array.isArray(board?.cells)||board.cells.length!==27)return null;
 const visible=new Set(revealedIndices.filter(i=>Number.isInteger(i)&&i>=0&&i<27));
 const count=board.cells.reduce((n,symbol,i)=>n+(visible.has(i)&&symbol!=='🧊'?1:0),0);
 const wins=Array.isArray(board.wins)?board.wins:[];
 return {count,total:board.cells.filter(symbol=>symbol!=='🧊').length,
  goldAwarded:wins.some(win=>win.rule==='gold-20'),
  premiumAwarded:wins.some(win=>win.rule==='premium-24'),
  giftRowRequired:[3,4,5].includes(board.symbolVersion)};
}
/**
 * Geschenkelinie: anchor ×2 to the MIDDLE original glyph of a verified
 * three-identical-symbol MONEY payout, never a random unrelated field.
 * A light-only bonus stays in its own light-bonus display.
 */
export function giftsDoubledSymbolIndex(result){
 const b=result?.board;
 if(b?.variantId!=='gifts'||!Array.isArray(b.cells)||!Array.isArray(b.wins))
  return null;
 const source=b.wins.find(w=>w?.prize?.type==='coins'&&w.prize.x2===true&&
  Array.isArray(w.indices)&&w.indices.length===3&&
  w.indices.every(i=>Number.isInteger(i)&&i>=0&&i<b.cells.length&&b.cells[i]===w.symbol));
 return Number.isInteger(source?.indices?.[1])?source.indices[1]:null;
}
/** Gold belongs to a real winning three-in-a-row, never to all 20/24 counted tiles. */
export function premiumWinningRowIndices(wins=[]){
 return [...new Set(wins.filter(win=>(win.rule==='row-3'||
   win.rule==='premium-24'&&win.indices?.length===3)&&
   Array.isArray(win.indices)&&win.indices.length===3&&
   win.indices.every(i=>Number.isInteger(i)&&i>=0&&i<27)&&
   Math.floor(win.indices[0]/3)===Math.floor(win.indices[2]/3)&&
   win.indices[1]===win.indices[0]+1&&win.indices[2]===win.indices[1]+1)
  .flatMap(win=>win.indices))];
}
export function initChristmasScratch(){
 const $=id=>document.getElementById(id);
 const root=$('scratch-tier-grid'),wallet=$('scratch-wallet'),stage=$('scratch-stage'),
  board=$('scratch-board'),results=$('scratch-result-panel'),
  winningLines=$('scratch-winning-lines'),reveal=$('scratch-reveal');
 if(!root||!wallet||!stage||!board||!results||!winningLines||!reveal)
  throw Error('SCRATCH_UI_NOT_FOUND');
 let status=null,ticket=null,busy=false,pending=null,requestId=0,finished=false,canManageScratch=false;
 const villageDiscount=()=>Number.isInteger(status?.discountPercent)?Math.max(0,Math.min(20,status.discountPercent)):0;
 const discountedPrice=price=>Math.max(0,Math.ceil(price*(100-villageDiscount())/100));
 let actionError=null;
 const alertToast=el('div','scratch-action-toast');
 alertToast.setAttribute('role','alert');alertToast.setAttribute('aria-live','assertive');
 alertToast.hidden=true;
 const alertMessage=el('span','scratch-action-toast-message');
 const alertDismiss=el('button','scratch-action-toast-dismiss','✕');
 alertDismiss.type='button';alertDismiss.setAttribute('aria-label','Meldung schließen');
 alertDismiss.addEventListener('click',()=>{alertToast.hidden=true});
 alertToast.append(alertMessage,alertDismiss);
 document.body.append(alertToast);
 const showAlert=(message,variantId=null)=>{
  const msg=String(message||'Unbekannter Fehler');
  actionError=variantId?{variantId,message:msg}:null;
  alertMessage.textContent=msg;alertToast.hidden=false;
  $('scratch-status').textContent=msg;
 };
 const clearAlert=()=>{actionError=null;alertToast.hidden=true};
 const scratchBuyError=code=>({
  SCRATCH_INVALID_VARIANT:'⚠️ Dieses Los ist auf Render noch nicht freigeschaltet. Die Backend-Version muss aktualisiert werden.',
  SCRATCH_INVALID_TIER:'⚠️ Der Server kennt die Preisklasse dieses Loses noch nicht.',
  SCRATCH_FREE_ONLY_SIMPLE:'⚠️ Der Render-Server hat den kostenlosen Modus nicht übernommen. Bitte die gemeinsamen Rubbellos-Einstellungen neu laden.',
  SCRATCH_NOT_ENOUGH_COINS:'⚠️ Nicht genügend Münzen für dieses Los.',
  SCRATCH_DAILY_ALREADY_USED:'⚠️ Das tägliche Gratislos wurde bereits eingelöst.',
  SCRATCH_NO_VOUCHER:'⚠️ Kein passender Rubbellos-Gutschein mehr vorhanden.',
  LOGIN_REQUIRED:'🔐 Melde dich erneut mit deinem DOG-Onlineprofil an.',
  SCRATCH_STORAGE_UNAVAILABLE:'⚠️ Die Rubbellos-Datenbank ist derzeit nicht erreichbar.',
  SCRATCH_BOARD_PRIZE_MISMATCH:'⚠️ Die Gewinnprüfung auf Render ist fehlgeschlagen. Dieses Los wurde nicht bestätigt.',
  SERVER_UNAVAILABLE:'⚠️ Render ist momentan nicht erreichbar. Bitte erneut versuchen.',
  SCRATCH_GIFTS_EDITION_ACTIVE:'⚠️ Noch ist eine 500er-Auflage aktiv. Neue Auflagen sind nach dem 500. verkauften Los möglich.',
  SCRATCH_GIFTS_EDITION_SOLD_OUT:'🎟️ Alle 500 Lose sind vergeben. Erstelle über ⚙️ Einstellungen eine neue Geschenkelinie-Auflage.',
  SCRATCH_GIFTS_EDITION_INVALID_BUDGET:'⚠️ Das Gesamtbudget muss eine ganze Münzsumme zwischen 0 und 1.000.000.000.000 sein.',
   SCRATCH_SNOW_SETTINGS_INVALID:'⚠️ Prüfe die Bingo-Einstellungen.',
   SCRATCH_SNOW_EDITION_ACTIVE:'⚠️ Die aktuelle 500er-Auflage läuft noch. Eine neue ist erst nach dem 500. Los möglich.',
   SCRATCH_SNOW_EDITION_SOLD_OUT:'❄️ Alle 500 Bingo-Lose sind vergeben. Erstelle oben rechts eine neue Auflage.',
   SCRATCH_SNOW_EDITION_INVALID_BUDGET:'⚠️ Das Gesamtbudget für die Bingo-Auflage ist ungültig.',
    SCRATCH_EDITION_FIXED_BUDGET_UNREACHABLE:'⚠️ Mit diesen Münzwerten und Gewinnzahlen lässt sich das feste Gesamtbudget nicht exakt auf die Restlose verteilen. Bitte Betrag oder Münzwerte ändern.',
    SCRATCH_EDITION_FIXED_BUDGET_INVALID:'⚠️ Bitte ein gültiges, ganzzahliges Gesamtbudget eingeben.',
    SCRATCH_EDITION_FIXED_BUDGET_BELOW_PAID:'⚠️ Das neue Budget darf nicht kleiner als bereits ausgezahlte Gewinne sein.',
    SCRATCH_EDITION_CHANGED:'⚠️ Die Auflage wurde gerade geändert oder ein Los verkauft. Bitte neu laden und erneut bearbeiten.',
    SCRATCH_EDITION_ONLY_CREATOR:'🔒 Nur das Profil, das die Auflage erstellt hat, darf sie bearbeiten.',
    SCRATCH_EDITION_ALREADY_COMPLETE:'🏁 Ausverkaufte Auflagen dürfen nicht nachträglich geändert werden.',
    SCRATCH_EDITION_FIXED_PLAN_MISSING:'⚠️ Der feste Gewinnplan konnte nicht geladen werden.',
    SCRATCH_EDITION_WALLET_LIMIT:'⚠️ Dein Münzkonto ist voll. Gib zuerst Münzen aus, damit der vollständige Gewinn gutgeschrieben werden kann.',
   SCRATCH_TIC_EDITION_ACTIVE:'⚠️ Diese Tic-Tac-Toe-Auflage läuft noch. Du kannst die Restlose bearbeiten.',
   SCRATCH_TIC_EDITION_SOLD_OUT:'🏁 Alle 500 Tic-Tac-Toe-Lose sind vergeben. Erstelle eine neue Auflage.',
   SCRATCH_TIC_EDITION_INVALID_BUDGET:'⚠️ Bitte ein gültiges festes Gesamtbudget eingeben.',
   SCRATCH_TIC_EDITION_BUDGET_UNREACHABLE:'⚠️ Das feste Budget lässt sich mit den gewählten Geldbeträgen und Multiplikatoren nicht exakt verteilen. Bitte Werte anpassen.',
   SCRATCH_TIC_EDITION_SETTINGS_INVALID:'⚠️ Prüfe Lospreis, Symbolchancen (zusammen 100 %), Nietenquote und drei steigende Geldwerte.',
   SCRATCH_TIC_EDITION_PRIZE_CATEGORY_INVALID:'⚠️ Bitte Gewinnkategorie 1 (Einfach), 2 (Mittel) oder 3 (Schwer) wählen.',
   SCRATCH_TIC_EDITION_PAYOUT_MISMATCH:'⚠️ Der geplante Gewinn stimmt nicht mit der Auszahlung überein. Es wurde kein Los gebucht.',
   SCRATCH_TIC_EDITION_PLAN_INVALID:'⚠️ Der Tic-Tac-Toe-Gewinnplan ist nicht gültig. Weitere Käufe sind vorerst gesperrt.'
 }[code]||'⚠️ Los konnte nicht geöffnet werden: '+String(code||'Serverfehler'));
 const hostDialog=$('scratch-host-dialog');
 const giftsDialog=$('scratch-gifts-settings-dialog');
 const snowDialog=$('scratch-snow-settings-dialog');
 let ticEdition=null;
 const ticDialog=$('scratch-tic-edition-dialog');
 let giftsEdition=null; // The globally shared finite 500-ticket series.
 let snowEdition=null; // Its own independent 500-ticket Bingo series.
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const room=String(new URLSearchParams(location.search).get('room')||'').toUpperCase();
 const validRoom=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(room);
 // The Firebase identity stays valid during a temporary Render profile sync.
 const account=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.user?.getIdToken?s.user:null;
 };
 let authUid=account()?.uid??null;
 const notice=s=>{$('scratch-status').textContent=s};
 const acknowledged=()=>{
  try{return localStorage.getItem('dog-scratch-seen:'+account()?.uid)}catch{return null}
 };
 const acknowledge=commandId=>{
  try{localStorage.setItem('dog-scratch-seen:'+account()?.uid,commandId)}catch{}
 };
 // Keep only the last safely revealed receipt, never invent wins or rebook
 // credits. A refresh may reopen the receipt but must not require rescratching.
 const revealedReceipt=()=>{
  try{return localStorage.getItem('dog-scratch-revealed:'+account()?.uid)}catch{return null}
 };
 const rememberReveal=commandId=>{
  if(typeof commandId!=='string'||!commandId)return;
  try{localStorage.setItem('dog-scratch-revealed:'+account()?.uid,commandId)}catch{}
 };
 async function query(path,payload){
  const u=account();if(!u)throw Error('LOGIN_REQUIRED');
  const token=await u.getIdToken();
  const target=base+'/api/hub/scratch'+path+(!payload&&path===''&&validRoom?'?room='+encodeURIComponent(room):'');
  const r=await fetch(target,{
   method:payload?'POST':'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok!==true)throw Error(data.error||'SERVER_UNAVAILABLE');
  return data;
 }
 const VARIANT_LABELS=Object.freeze([
  ['gifts','🎁 Geschenkelinie','Einfach · 200 🪙'],
  ['snow_collect','❄️ Schneeflocken-Bingo','Einfach · 200 🪙'],
  ['elf','🧝 Magischer Wichtelpfad','Mittel · 500 🪙'],
  ['premium_27','🎅 Premium-Weihnachts-Rubbellos','Premium · 1.000 🪙']
 ]);
 const STATS_VARIANT_LABELS=Object.freeze([
  ...VARIANT_LABELS,
  ['tic_tac_toe','🎯 DOG Tic-Tac-Toe','Spezial · 500 🪙'],
  ['number_one_20','🔢 Glückszahl 1','Zahlenlos · 500 🪙'],
  ['dog_jackpot_9','🐾 Finde DOG!','Jackpot · 1.000 🪙']
 ]);
 const variantTiers=Object.freeze({simple:['gifts','snow_collect'],medium:['elf'],premium:['premium_27']});
 const percent=n=>(Number(n)/10).toLocaleString('de-DE',{maximumFractionDigits:1});
 function chanceRange(tier,key){
  const counts=(variantTiers[tier]||[]).map(id=>status?.settings?.variants?.[id]?.weights?.[key]).filter(Number.isInteger);
  if(!counts.length)return null;
  return Math.min(...counts)===Math.max(...counts)?percent(counts[0]):
   percent(Math.min(...counts))+'–'+percent(Math.max(...counts));
 }
 function coinAmountsFor(tier,variantId=null,result=null){
  // A previously bought ticket always displays its original configured
  // money values, even if the host has changed them since purchase.
  if(Array.isArray(result?.coinAmounts)&&result.coinAmounts.length===3)
   return result.coinAmounts;
  if(result)return SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
  const saved=status?.settings?.variants?.[variantId]?.coinAmounts;
  return Array.isArray(saved)&&saved.length===3?saved:
   SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
 }
 function shopMoneyLegend(tier){
  const ids=variantTiers[tier]||[];
  return ids.map(id=>{
   const label=id==='gifts'?'🎁 Geschenkelinie: ':
    id==='snow_collect'?'❄️ Schneeflocken-Bingo: ':'';
   return label+symbolLegend(tier,coinAmountsFor(tier,id));
  }).join('\n');
 }
 // User-specific counters come with the existing authenticated scratch status.
 // No polling, extra Firebase read or per-stroke writes are necessary.
 function drawScratchAnalytics(){
  const root=$('scratch-analytics');
  if(!root)return;
  const body=$('scratch-analytics-body'),footer=$('scratch-analytics-footer'),
   kpis=$('scratch-analytics-kpis'),note=$('scratch-analytics-note');
  const p=status?.progress;
  const stat=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  const missing=!p;
  const opened=stat(p?.opened),tracked=stat(p?.tracked);
  const older=stat(p?.olderUnclassified);
  const incomplete=older>0;
  const cards=[
   ['🎟️','Lose geöffnet',opened],
   ['🏆',incomplete?'Gewinnlose (erfasst)':'Gewinnlose',stat(p?.winTickets)],
   ['🎁',incomplete?'Freischaltungen (erfasst)':'Freischaltungen',stat(p?.unlocks)],
   ['🪙',incomplete?'Münzen gewonnen (erfasst)':'Münzen gewonnen',stat(p?.coinsWon)],
   ['⭐',incomplete?'Weihnachtslichter (erfasst)':'Weihnachtslichter gewonnen',stat(p?.lightsWon)]
  ];
  kpis.replaceChildren();
  for(const [icon,label,value] of cards){
   const item=el('div','scratch-analytics-kpi');
   item.append(el('span','scratch-analytics-kpi-label',icon+' '+label),
    el('strong','scratch-analytics-kpi-value',missing?'–':num(value)));
   kpis.append(item);
  }
  body.replaceChildren();footer.replaceChildren();
  if(missing){
   const row=el('tr');const cell=el('td','',status?'⌛ Die persönliche Statistik wird vom Render-Server noch nicht bereitgestellt.':'🔐 Mit deinem DOG-Onlineprofil anmelden, um deine Statistik zu sehen.');
   cell.colSpan=8;row.append(cell);body.append(row);
   note.textContent=status?'Versuche „Kontostand aktualisieren“, sobald der Render-Server die neue Statistikversion übernommen hat.':'Die Übersicht wird direkt aus deinem angemeldeten Spielerprofil geladen.';
   return;
  }
  const headers=['Rubbellos','Geöffnet','Gewinnlose','Nieten','Gratis','🎁 Gewinne','🪙 Gewonnen','⭐ Lichter'];
  const addRow=(target,label,data,{total=false,unknown=false,share=true}={})=>{
   const row=el('tr',total?'scratch-analytics-sum':unknown?'scratch-analytics-unknown':'');
   const labelCell=el(total?'th':'td','scratch-analytics-name');
   if(total)labelCell.scope='row';
   labelCell.append(el('strong','',label));
   if(share&&tracked>0&&stat(data?.opened)>0){
    const track=el('span','scratch-analytics-bar');
    const fill=el('i','scratch-analytics-bar-fill');
    fill.style.width=Math.min(100,stat(data?.opened)/tracked*100)+'%';
    track.append(fill);labelCell.append(track);
   }
   row.append(labelCell);
   const numbers=[data?.opened,data?.winTickets,data?.duds,data?.free,data?.unlocks,data?.coinsWon,data?.lightsWon];
   for(let i=0;i<numbers.length;i++){
    const cell=el('td','',unknown&&i>0?'–':num(stat(numbers[i])));
    cell.dataset.label=headers[i+1];
    row.append(cell);
   }
   target.append(row);
  };
  for(const [id,title,tier] of STATS_VARIANT_LABELS){
   const value=p.byVariant?.[id]||{};
   addRow(body,title+' · '+tier,value);
  }
  if(stat(p.other?.opened)>0)addRow(body,'🗂️ Weitere ältere Losarten',p.other);
  if(older>0)addRow(body,'📜 Frühere Lose ohne Einzelstatistik',{opened:older},{unknown:true,share:false});
  addRow(footer,'GESAMT',{
   opened,winTickets:p.winTickets,duds:p.duds,free:p.free,
   unlocks:p.unlocks,coinsWon:p.coinsWon
  },{total:true,share:false});
  note.textContent=incomplete?
   'ℹ️ Für '+num(older)+' ältere Lose liegt nur die Gesamtzahl vor. Die Aufteilung, Gewinne und Münzen berücksichtigen '+num(tracked)+' nachvollziehbare Lose; neue Lose werden dauerhaft mitgezählt.':
   '✓ Dein persönlicher Fortschritt wird bei jedem auf Render erzeugten Los gespeichert – ohne zusätzliche Schreibvorgänge beim Rubbeln.';
 }
 function renderNumberLottery(receipt){
  const active=receipt?.board?.variantId==='number_one_20';
  for(const id of ['scratch-lotto-header','scratch-lotto-left','scratch-lotto-right']){
   const node=$(id);if(node)node.hidden=!active;
  }
  const prizeStrip=$('scratch-lotto-ticket-prizes');
  if(prizeStrip)prizeStrip.hidden=!active;
  if(!active)return;
  const cfg=status?.settings?.numberOne20||{};
  const amounts=Array.isArray(receipt.board.coinAmounts)?receipt.board.coinAmounts:
   Array.isArray(receipt.coinAmounts)?receipt.coinAmounts:[100,300,800];
  const weights=Array.isArray(receipt.board.symbolWeights)?receipt.board.symbolWeights:
   Array.isArray(cfg.symbolWeights)?cfg.symbolWeights:[650,280,60,10];
  const chance=Number.isInteger(receipt.board.hitPer1000)?receipt.board.hitPer1000:
   Number.isInteger(cfg.hitPer1000)?cfg.hitPer1000:100;
  const hit=chance/1000;
  const price=Number.isInteger(receipt.price)?receipt.price:Number(cfg.price||500);
  const percent=value=>Number(value).toLocaleString('de-DE',{maximumFractionDigits:1})+' %';
  const card=(heading,rows,cls='')=>{
   const shell=el('section','lotto-panel '+cls);
   shell.append(el('h3','lotto-panel-title',heading));
   const container=el('div','lotto-panel-content');
   for(const row of rows){
    const line=el('div','lotto-panel-line');
    line.append(el('span','lotto-panel-line-label',row[0]),
     el('strong','lotto-panel-line-value',row[1]));
    container.append(line);
   }
   shell.append(container);return shell;
  };
  const giftReplacement=Number.isInteger(receipt.board.giftFallbackCoins)?receipt.board.giftFallbackCoins:
   Number.isInteger(cfg.giftFallbackCoins)?cfg.giftFallbackCoins:1500;
  const left=$('scratch-lotto-left'),right=$('scratch-lotto-right');
  left.replaceChildren();right.replaceChildren();
  if(prizeStrip){
   prizeStrip.replaceChildren();
   for(const [icon,label] of [
    ['🪙',num(amounts[0])],
    ['💵',num(amounts[1])],
    ['💼',num(amounts[2])],
    ['🎁 💝 🎀 🧧 🛍️','Hauptgewinn: Freischaltung']
   ]){
    const entry=el('span','lotto-ticket-prize');
    entry.append(el('span','lotto-ticket-prize-icon',icon),
     el('strong','lotto-ticket-prize-label',label));
    prizeStrip.append(entry);
   }
  }
  const intro=el('section','lotto-panel lotto-steps');
  intro.append(el('h3','lotto-panel-title','🐾 SPIELERKLÄRUNG'));
  for(const [i,description] of [
   'Rubbele in jeder der 20 Reihen beide Felder frei.',
   'Links erscheint ein Gewinnsymbol, rechts eine Zahl von 1 bis 10.',
   'Ist die rechte Zahl eine 1, gewinnst du den Preis links in derselben Reihe.'
  ].entries()){
   const step=el('div','lotto-step');
   step.append(el('strong','lotto-step-number',String(i+1)),el('span','lotto-step-text',description));
   intro.append(step);
  }
  left.append(intro,
   card('🎁 GEWINNSYMBOLE',[
    ['🪙 Münze',num(amounts[0])+' Münzen'],
    ['💵 Schein',num(amounts[1])+' Münzen'],
    ['💼 Koffer',num(amounts[2])+' Münzen'],
    ['🎁 💝 🎀 🧧 🛍️','Hauptgewinn / '+num(giftReplacement)+' 🪙 Ersatz']
   ],'lotto-symbols'));
  const chanceOfAny=100*(1-Math.pow(1-hit,20));
  const bestCash=Math.max(0,...amounts.filter((_,i)=>weights[i]>0));

  const theoreticalMax=chance>0?20*Math.max(bestCash,weights[3]>0?giftReplacement:0):0;
  right.append(
   card('🎯 GEWINNCHANCEN',[
    ['Gewinn je Reihe',percent(hit*100)],
    ['Mindestens 1 Treffer',percent(chanceOfAny)],
    ['Kein Treffer',percent(100-chanceOfAny)],
    ['Erwartete Treffer',String((20*hit).toLocaleString('de-DE',{maximumFractionDigits:1}))]
   ],'lotto-chances'),
   card('🏆 MAXIMAL MÖGLICH',[
    ['Treffer pro Los',String(chance>0?20:0)],
    ['Theoretisch Münzen',num(theoreticalMax)+' 🪙'],
    ['Neue Freischaltung','höchstens 1 je Los'],
    ['Lospreis',num(price)+' 🪙']
   ],'lotto-max'),
   card('🎲 SYMBOLVERTEILUNG',[
    ['🪙 Münze',percent(weights[0]/10)],
    ['💵 Schein',percent(weights[1]/10)],
    ['💼 Koffer',percent(weights[2]/10)],
    ['🎁 💝 🎀 🧧 🛍️',percent(weights[3]/10)]
   ],'lotto-symbol-odds')
  );
  $('scratch-lotto-headline').textContent=
   '20 REIHEN  •  '+percent(hit*100)+' TREFFERCHANCE PRO REIHE  •  LOSPREIS '+num(price)+' 🪙';
 }
 function drawShop(){
  root.replaceChildren();
  wallet.textContent=status?num(status.coins)+' 🪙':'– 🪙';
  const freeMode=status?.settings?.freeEnabled===true;
  $('scratch-host-settings').hidden=false;
  $('scratch-host-settings').title='Gemeinsame Rubbellos-Einstellungen';
  $('scratch-daily-info').textContent=freeMode?'🎁 Kostenloses Rubbeln für alle aktiviert':
   status?.dailyFreeAvailable?'🎁 Heute ein einfaches Gratis-Los verfügbar':'Gratis-Los heute bereits benutzt';
  // All four variants are visible simultaneously; no hidden two-card
  // selector and no random result when one specific card was chosen.
  for(const option of SCRATCH_SHOP_VARIANTS){
   const tier=SCRATCH_TICKET_TYPES.find(c=>c.id===option.tier);
   const lucky=status?.settings?.numberOne20;
   // Preserve the independent configured number lottery base price.
   const variantConfig=option.id==='gifts'&&giftsEdition?.config?giftsEdition.config:
    option.id==='snow_collect'&&snowEdition?.config?snowEdition.config:
    option.id==='tic_tac_toe'&&ticEdition?.config?ticEdition.config:
    status?.settings?.variants?.[option.id];
   const ticketCost=option.id==='number_one_20'?(lucky?.price??tier.price):
    ['gifts','snow_collect','tic_tac_toe'].includes(option.id)?(variantConfig?.price??tier.price):tier.price;
   const actualPrice=discountedPrice(ticketCost);
   const onSale=(option.id!=='gifts'||!giftsEdition||giftsEdition.remaining>0)&&
    (option.id!=='snow_collect'||!snowEdition||snowEdition.remaining>0)&&
    (option.id!=='tic_tac_toe'||!ticEdition||ticEdition.remaining>0);
   const unlockChance=Number.isInteger(variantConfig?.weights?.unlock)?
    percent(variantConfig.weights.unlock):tier.unlockChance;
   const unlocksLeft=status?.pools?.[option.tier]?.remaining;
   const chanceText=option.id==='number_one_20'?'🔢 '+Number((lucky?.hitPer1000??100)/10).toLocaleString('de-DE')+' % Trefferchance pro Reihe':
    option.id==='dog_jackpot_9'?'🐾 35 % Chance auf alle Preise':
    option.id==='tic_tac_toe'?'◯ oder ✕ · 8 Gewinnlinien · 🎁 '+getPrizeCategoryLabel(ticEdition?.config?.prizeCategory??2):
    unlocksLeft===0?'🎁 Alle Freischaltungen gesammelt':
    '🎁 bis zu '+unlockChance+' % Freischaltung';
   const chanceWeights=variantConfig?.weights;
   const premiumMilestoneChance=chanceWeights&&Number.isInteger(chanceWeights.coins)&&
    Number.isInteger(chanceWeights.unlock)?
    (chanceWeights.unlock+Math.min(chanceWeights.coins,Math.max(0,300-chanceWeights.unlock)))/10:30;
   const visibleRule=option.id==='premium_27'?
    '4 sichere Geld-Dreierreihen · '+premiumMilestoneChance.toLocaleString('de-DE')+
    ' % Chance auf +1.000 🪙':option.rule;
   const article=el('article','scratch-tier '+option.tier+' scratch-variant-'+option.theme);
   article.dataset.variant=option.id;
   if(option.id==='gifts'){
    const gear=el('button','scratch-gifts-card-settings','⚙️ Einstellungen');
    gear.type='button';gear.title='Nur die Geschenkelinie einstellen';
    gear.setAttribute('aria-label','Geschenkelinie-Einstellungen öffnen');
    gear.addEventListener('click',event=>{event.stopPropagation();openGiftsSettings()});
    article.append(gear);
   }
   if(option.id==='tic_tac_toe'){
    const gear=el('button','scratch-gifts-card-settings scratch-tic-card-settings','⚙️ Auflage');
    gear.type='button';gear.title='Tic-Tac-Toe-Auflage erstellen oder bearbeiten';
    gear.setAttribute('aria-label','Tic-Tac-Toe-Auflagenstudio öffnen');
    gear.addEventListener('click',event=>{event.stopPropagation();openTicEdition()});
    article.append(gear);
   }
   if(option.id==='snow_collect'){
    const gear=el('button','scratch-gifts-card-settings scratch-snow-card-settings','⚙️ Auflage');
    gear.type='button';gear.title='Schneeflocken-Bingo-Auflage erstellen';
    gear.setAttribute('aria-label','Schneeflocken-Bingo-Auflagentool öffnen');
    gear.addEventListener('click',event=>{event.stopPropagation();openSnowSettings()});
    article.append(gear);
   }
   const heading=el('div','scratch-card-heading');
   heading.append(el('span','scratch-icon',option.icon));
   const names=el('div','scratch-card-names');
   names.append(el('small','scratch-card-class',option.subtitle),
    el('h3','',option.name));heading.append(names);
   const details=el('div','scratch-card-brief');
   details.append(el('span','scratch-card-rule',visibleRule),
    el('span','scratch-card-chance',chanceText));
   if(['gifts','snow_collect'].includes(option.id)&&variantConfig){
    details.append(el('span','scratch-card-chance',
     '⭐ Lichtbonus: '+percent(variantConfig.lightChancePer1000??100)+' % · '+
     num(variantConfig.lightMin??1)+'–'+num(variantConfig.lightMax??10)+' ⭐'));
    details.append(el('span','scratch-card-chance',
     '✖️2-Chance: '+percent(variantConfig.doubleChancePer1000??110)+' % bei Geldgewinnen'));
   }
   const amounts=option.id==='tic_tac_toe'?(ticEdition?.config?.coinAmounts??[200,450,800]):
    option.id==='number_one_20'?(lucky?.coinAmounts??[100,300,800]):
    option.id==='dog_jackpot_9'?[100,300,800]:
    option.id==='snow_collect'&&snowEdition?.config?.coinAmounts?snowEdition.config.coinAmounts:
    coinAmountsFor(option.tier,option.id);
   article.append(heading,details,
    el('strong','scratch-price',num(actualPrice)+' 🪙'+
     (villageDiscount()?' · ⭐ −'+villageDiscount()+' % Dorfbonus':'')),
    el('div','scratch-card-payouts','🪙 '+num(amounts[0])+' · 💵 '+
     num(amounts[1])+' · 💼 '+num(amounts[2])),
    el('div','scratch-symbol-key',option.id==='number_one_20'?
     '🪙 '+num(amounts[0])+' · 💵 '+num(amounts[1])+' · 💼 '+num(amounts[2])+' · 🎁 Freischaltung · jede 1 gewinnt':
     option.id==='dog_jackpot_9'?'🐾 DOG = alle 8 Preise · 🎁 Freischaltung':
     option.id==='tic_tac_toe'?
     '◯ / ✕ · 1–'+(ticEdition?.config?.maxMultiplier??5)+'× · 🪙 '+num(amounts[0])+' · 💵 '+num(amounts[1])+' · 💼 '+num(amounts[2])+' · 🎁 Freischaltung':symbolLegend(option.tier,amounts)));
   const vouchers=Number(status?.vouchers?.[option.tier]||0)+Number(status?.variantVouchers?.[option.id]||0);
   const buyBtn=el('button','scratch-buy','🎟️ Für '+num(actualPrice)+' Münzen öffnen');
   buyBtn.type='button';buyBtn.hidden=freeMode;
   buyBtn.disabled=busy||!onSale;
   buyBtn.addEventListener('click',()=>void buy(option.tier,false,option.id));
   article.append(buyBtn);
   const activeEdition=option.id==='gifts'?giftsEdition:option.id==='snow_collect'?snowEdition:option.id==='tic_tac_toe'?ticEdition:null;
   if(activeEdition){
    const chip=el('div','scratch-gifts-edition-chip',
     '📦 Auflage: '+num(activeEdition.remaining)+' von 500 Losen übrig · '+
     num(activeEdition.remainingCoins)+' von '+num(activeEdition.maxTotalCoins)+
     (activeEdition.budgetMode==='fixed'?' 🪙 fest eingeplant':' 🪙 maximale Auszahlung'));
    chip.dataset.state=activeEdition.status;
    article.append(chip);
   }
   if(actionError?.variantId===option.id){
    const inline=el('div','scratch-card-open-error',actionError.message);
    inline.setAttribute('role','alert');article.append(inline);
   }
   if(ticket&&ticket.board?.variantId===option.id){
    const reopen=el('button','scratch-reopen-ticket','🎟️ Vorheriges Los anzeigen');
    reopen.type='button';reopen.disabled=busy;
    reopen.addEventListener('click',()=>{
     try{showTicket(ticket)}catch(e){showAlert('⚠️ Das offene Los konnte nicht angezeigt werden: '+e.message,option.id)}
    });
    article.append(reopen);
   }
   if(vouchers>0){
    const voucherBtn=el('button','scratch-free scratch-earned-voucher',
     '🎟️ Gesammeltes Los einlösen · '+num(vouchers)+' vorhanden');
    voucherBtn.type='button';
    voucherBtn.disabled=busy||!onSale;
    voucherBtn.addEventListener('click',()=>void buy(option.tier,false,option.id,true));
    article.append(voucherBtn);
   }
   if(freeMode||option.tier==='simple'){
    const free=el('button','scratch-free',freeMode?'🎁 Kostenlos öffnen':'🎁 Tagesfreilos öffnen');
    free.type='button';
    free.disabled=busy||!onSale;
    free.addEventListener('click',()=>void buy(option.tier,true,option.id));
    article.append(free);
   }
   root.append(article);
  }
  drawScratchAnalytics();
 }
 // Settings are scoped to the displayed Geschenkelinie, not to 500-card
 // editions or other scratch types. The server writes them atomically.
 function updateGiftsMoneyPreview(){
  const none=Number($('gs-none').value),unlock=Number($('gs-unlock').value);
  const value=$('gs-money-auto');
  const box=value?.closest('.scratch-gifts-auto');
  const ok=Number.isFinite(none)&&Number.isFinite(unlock)&&
   none>=0&&unlock>=0&&none+unlock<=100;
  if(value)value.textContent=ok?(100-none-unlock).toLocaleString('de-DE',{
   maximumFractionDigits:1})+' %':'Eingaben über 100 %';
  box?.classList.toggle('is-invalid',!ok);
  return ok;
 }
 // A quick, truthful preview: exact feasibility is confirmed by the
 // server-side payout planner before any edition is saved. This catches the
 // common impossible budgets instantly without claiming every multiple works.
 function updateFixedBudgetHint(prefix,activeEdition){
  const target=$(prefix+'-edition-budget-hint');
  if(!target)return;
  const raw=$(prefix+'-edition-budget')?.value.trim()||'';
  const targetSum=Number(raw);
  const values=[0,1,2].map(i=>Number($(prefix+'-coin-'+i)?.value));
  const cap=Number($(prefix+'-max-prizes')?.value);
  const doublePercent=Number($(prefix+'-double')?.value);
  const none=Number($(prefix+'-none')?.value);
  const unlock=Number($(prefix+'-unlock')?.value);
  if(!raw||!Number.isSafeInteger(targetSum)||targetSum<0||
     values.some((v,i)=>!Number.isSafeInteger(v)||v<1||i>0&&v<=values[i-1])||
     !Number.isInteger(cap)||cap<1||cap>3||
     !Number.isFinite(doublePercent)||doublePercent<0||doublePercent>100){
   target.textContent='💡 Gib einen gültigen Gesamtbetrag und drei aufsteigende Geldwerte ein.';
   return;
  }
  const alreadyPaid=activeEdition?.remaining>0?activeEdition.paidCoins:0;
  const remaining=activeEdition?.remaining>0?activeEdition.remaining:500;
  const restBudget=targetSum-alreadyPaid;
  const maxPerTicket=[...values].sort((a,b)=>b-a).slice(0,cap)
   .reduce((a,b)=>a+b,0)*(doublePercent>0?2:1);
  const maximum=remaining*maxPerTicket;
  const gcd=(a,b)=>{while(b){const n=a%b;a=b;b=n}return a};
  const divisor=values.reduce(gcd);
  const moneyChance=100-none-unlock;
  const problem=restBudget<0?'❌ Bereits '+num(alreadyPaid)+' 🪙 ausgezahlt – das neue Budget ist zu klein.':
   restBudget>maximum?'❌ Mit '+num(remaining)+' Restlosen und diesen Symbolwerten sind höchstens '+num(maximum)+' 🪙 zusätzlich möglich.':
   divisor>1&&restBudget%divisor!==0?'❌ Dieser Restbetrag lässt sich nicht exakt aus den gewählten Geldsymbolen zusammensetzen (Schrittweite '+num(divisor)+' 🪙).':
   restBudget>0&&moneyChance<=0?'❌ Die Geldgewinn-Kategorie ist auf 0 % gestellt. Erhöhe sie oder setze das Budget auf 0.':null;
  target.textContent=problem||'✅ Rechnerisch geeignet: '+num(restBudget)+
   ' 🪙 auf '+num(remaining)+' noch unverkaufte Lose. Maximal '+num(maximum)+
   ' 🪙 möglich. Die exakte Kombination bestätigt Render beim Speichern.';
 }
 function updateGiftsEditionPreview(){
  const price=Number($('gs-price').value||0),budget=$('gs-edition-budget');
  const max=Number(budget?.value||0);
  updateFixedBudgetHint('gs',giftsEdition);
  $('gs-edition-revenue').textContent=Number.isSafeInteger(price)&&price>=0?
   num(price*500)+' 🪙':'– 🪙';
  const display=$('gs-edition-status'),button=$('gs-edition-create'),edit=$('gs-edition-edit');
  const active=Boolean(giftsEdition&&giftsEdition.remaining>0);
  const soldOut=Boolean(giftsEdition&&giftsEdition.remaining===0);
  if(display){
   display.dataset.state=active?'active':soldOut?'sold_out':'none';
   display.textContent=active?
    '🟢 Aktive Auflage: '+num(giftsEdition.issued)+'/500 Lose ausgegeben · '+
    num(giftsEdition.paidCoins)+' von '+num(giftsEdition.maxTotalCoins)+
    ' 🪙 ausgezahlt · '+num(giftsEdition.remainingCoins)+' 🪙 noch '+(giftsEdition.budgetMode==='fixed'?'fest eingeplant':'maximal möglich')+'. '+
    'Nur noch nicht vergebene Lose können bearbeitet werden.':
    soldOut?'🏁 Alle 500 Lose der bisherigen Auflage wurden vergeben. Du kannst nun eine neue Serie erstellen.':
    '📦 Noch keine 500er-Auflage erstellt. Bis zur ersten Veröffentlichung werden die Lose wie bisher angeboten.';
  }
  if(button){
   button.disabled=active;
   button.title=active?'Eine neue Auflage ist erst nach den 500 vergebenen Losen möglich.':'';
  }
  // While a numbered series exists, distinguish template settings from
  // the only button that actually revises the live edition's remaining tickets.
  const templateSave=$('scratch-gifts-settings-save');
  if(templateSave){
   templateSave.textContent=active?'💾 Nur Standardwerte für spätere Auflagen speichern':'💾 Geschenkelinie speichern';
   templateSave.title=active?'Verändert NICHT die laufende Auflage. Dafür „Aktuelle Auflage bearbeiten“ verwenden.':'Allgemeine Einstellungen für neue Lose speichern';
  }
  const defaultsButton=$('scratch-gifts-settings-save');
  if(defaultsButton){
   defaultsButton.textContent=active?'💾 Nur Standardwerte speichern':'💾 Einstellungen speichern';
   defaultsButton.title=active?'Ändert die aktive Auflage NICHT. Nutze dafür oben „Aktuelle Auflage bearbeiten“.':'Standardeinstellungen für künftige Lose speichern.';
  }
  if(edit){
   edit.hidden=!active;
   edit.disabled=!active;
   edit.title=active?'Nur die unverkauften Lose dieser Auflage anpassen. Der Ersteller darf speichern.':'';
  }
  if(budget){
   budget.disabled=false;
   budget.setCustomValidity((!budget.value.trim()||
    !Number.isSafeInteger(max)||max<0||max>1000000000000)?
    'Bitte ein ganzzahliges Gesamtbudget zwischen 0 und 1.000.000.000.000 Münzen eingeben.':'');
  }
 }
 function openGiftsSettings(){
  const cfg=(giftsEdition?.remaining>0?giftsEdition.config:null)??status?.settings?.variants?.gifts;
  if(!cfg||!giftsDialog){
   showAlert('⚠️ Geschenkelinie-Einstellungen noch nicht geladen. Bitte Kontostand aktualisieren.','gifts');
   return;
  }
  const set=(id,value)=>{$(id).value=String(value)};
  set('gs-price',cfg.price??200);
  set('gs-none',(cfg.weights?.none??200)/10);
  set('gs-unlock',(cfg.weights?.unlock??111)/10);
  for(let i=0;i<3;i++)set('gs-coin-'+i,cfg.coinAmounts?.[i]??[10,40,100][i]);
  set('gs-max-prizes',Math.min(3,cfg.maxPrizes??3));
  set('gs-extra',cfg.extraCoinChance??30);
  set('gs-double',(cfg.doubleChancePer1000??110)/10);
  set('gs-light-chance',(cfg.lightChancePer1000??100)/10);
  set('gs-light-min',cfg.lightMin??1);
  set('gs-light-max',cfg.lightMax??10);
  set('gs-edition-budget',giftsEdition?.maxTotalCoins??
   Math.round((cfg.price??200)*500*.6));
  $('scratch-gifts-settings-feedback').textContent='';
  $('gs-edition-feedback').textContent='';
  updateGiftsMoneyPreview();updateGiftsEditionPreview();
  giftsDialog.showModal();
 }
 function readGiftsSettings(){
  const safeInt=(id,min,max)=>{
   const input=$(id),n=Number(input.value);
   if(!input.value.trim()||!Number.isSafeInteger(n)||n<min||n>max)
    throw Error('Bitte „'+(input.closest('label')?.querySelector('span')?.textContent||id)+'“ prüfen.');
   return n;
  };
  const percent=(id)=>{
   const input=$(id),n=Number(input.value);
   if(!input.value.trim()||!Number.isFinite(n)||n<0||n>100||
      Math.abs(n*10-Math.round(n*10))>0.000001)
    throw Error('„'+(input.closest('label')?.querySelector('span')?.textContent||id)+
     '“: Bitte eine Zahl von 0 bis 100 in Schritten von 0,1 % eingeben.');
   return Math.round(n*10);
  };
  const nonePer1000=percent('gs-none'),unlockPer1000=percent('gs-unlock');
  if(nonePer1000+unlockPer1000>1000)
   throw Error('Nieten und Freischaltungen dürfen zusammen höchstens 100 % ergeben.');
  const coinAmounts=[0,1,2].map(i=>safeInt('gs-coin-'+i,1,50000000));
  if(!(coinAmounts[0]<coinAmounts[1]&&coinAmounts[1]<coinAmounts[2]))
   throw Error('Die Geldwerte müssen steigen: 🪙 kleiner als 💵 und 💵 kleiner als 💼.');
  const lightMin=safeInt('gs-light-min',1,100),lightMax=safeInt('gs-light-max',1,100);
  if(lightMin>lightMax)throw Error('Der kleinste Lichtbonus darf nicht höher als der größte sein.');
  return {
   price:safeInt('gs-price',0,1000000),nonePer1000,unlockPer1000,
   coinAmounts,maxPrizes:safeInt('gs-max-prizes',1,3),
   extraCoinChance:safeInt('gs-extra',0,100),
   doubleChancePer1000:percent('gs-double'),
   lightChancePer1000:percent('gs-light-chance'),lightMin,lightMax
  };
 }
 function updateSnowMoneyPreview(){
  const none=Number($('sn-none').value),unlock=Number($('sn-unlock').value);
  const value=$('sn-money-auto');
  const box=value?.closest('.scratch-gifts-auto');
  const ok=Number.isFinite(none)&&Number.isFinite(unlock)&&
   none>=0&&unlock>=0&&none+unlock<=100;
  if(value)value.textContent=ok?(100-none-unlock).toLocaleString('de-DE',{
   maximumFractionDigits:1})+' %':'Eingaben über 100 %';
  box?.classList.toggle('is-invalid',!ok);
  return ok;
 }
 function updateSnowEditionPreview(){
  const price=Number($('sn-price').value||0),budget=$('sn-edition-budget');
  const max=Number(budget?.value||0);
  updateFixedBudgetHint('sn',snowEdition);
  $('sn-edition-revenue').textContent=Number.isSafeInteger(price)&&price>=0?
   num(price*500)+' 🪙':'– 🪙';
  const display=$('sn-edition-status'),button=$('sn-edition-create'),edit=$('sn-edition-edit');
  const active=Boolean(snowEdition&&snowEdition.remaining>0);
  const soldOut=Boolean(snowEdition&&snowEdition.remaining===0);
  if(display){
   display.dataset.state=active?'active':soldOut?'sold_out':'none';
   display.textContent=active?
    '🟢 Aktive Auflage: '+num(snowEdition.issued)+'/500 Lose ausgegeben · '+
    num(snowEdition.paidCoins)+' von '+num(snowEdition.maxTotalCoins)+
    ' 🪙 ausgezahlt · '+num(snowEdition.remainingCoins)+' 🪙 noch '+(snowEdition.budgetMode==='fixed'?'fest eingeplant':'maximal möglich')+'. '+
    'Nur noch nicht vergebene Lose können bearbeitet werden.':
    soldOut?'🏁 Alle 500 Lose der bisherigen Auflage wurden vergeben. Du kannst nun eine neue Serie erstellen.':
    '📦 Noch keine 500er-Auflage erstellt. Bis zur ersten Veröffentlichung werden die Lose wie bisher angeboten.';
  }
  if(button){
   button.disabled=active;
   button.title=active?'Eine neue Auflage ist erst nach den 500 vergebenen Losen möglich.':'';
  }
  // While a numbered series exists, distinguish template settings from
  // the only button that actually revises the live edition's remaining tickets.
  const templateSave=$('scratch-snow-settings-save');
  if(templateSave){
   templateSave.textContent=active?'💾 Nur Standardwerte für spätere Auflagen speichern':'💾 Schneeflocken-Bingo speichern';
   templateSave.title=active?'Verändert NICHT die laufende Auflage. Dafür „Aktuelle Auflage bearbeiten“ verwenden.':'Allgemeine Einstellungen für neue Lose speichern';
  }
  const defaultsButton=$('scratch-snow-settings-save');
  if(defaultsButton){
   defaultsButton.textContent=active?'💾 Nur Standardwerte speichern':'💾 Einstellungen speichern';
   defaultsButton.title=active?'Ändert die aktive Auflage NICHT. Nutze dafür oben „Aktuelle Auflage bearbeiten“.':'Standardeinstellungen für künftige Lose speichern.';
  }
  if(edit){
   edit.hidden=!active;
   edit.disabled=!active;
   edit.title=active?'Nur die unverkauften Lose dieser Auflage anpassen. Der Ersteller darf speichern.':'';
  }
  if(budget){
   budget.disabled=false;
   budget.setCustomValidity((!budget.value.trim()||
    !Number.isSafeInteger(max)||max<0||max>1000000000000)?
    'Bitte ein ganzzahliges Gesamtbudget zwischen 0 und 1.000.000.000.000 Münzen eingeben.':'');
  }
 }
 function openSnowSettings(){
  const cfg=(snowEdition?.remaining>0?snowEdition.config:null)??status?.settings?.variants?.snow_collect;
  if(!cfg||!snowDialog){
   showAlert('⚠️ Schneeflocken-Bingo-Einstellungen noch nicht geladen. Bitte Kontostand aktualisieren.','snow_collect');
   return;
  }
  const set=(id,value)=>{$(id).value=String(value)};
  set('sn-price',cfg.price??200);
  set('sn-none',(cfg.weights?.none??200)/10);
  set('sn-unlock',(cfg.weights?.unlock??111)/10);
  for(let i=0;i<3;i++)set('sn-coin-'+i,cfg.coinAmounts?.[i]??[10,40,100][i]);
  set('sn-max-prizes',Math.min(3,cfg.maxPrizes??3));
  set('sn-extra',cfg.extraCoinChance??30);
  set('sn-double',(cfg.doubleChancePer1000??110)/10);
  set('sn-light-chance',(cfg.lightChancePer1000??100)/10);
  set('sn-light-min',cfg.lightMin??1);
  set('sn-light-max',cfg.lightMax??10);
  set('sn-edition-budget',snowEdition?.maxTotalCoins??
   Math.round((cfg.price??200)*500*.6));
  $('scratch-snow-settings-feedback').textContent='';
  $('sn-edition-feedback').textContent='';
  updateSnowMoneyPreview();updateSnowEditionPreview();
  snowDialog.showModal();
 }
 function readSnowSettings(){
  const safeInt=(id,min,max)=>{
   const input=$(id),n=Number(input.value);
   if(!input.value.trim()||!Number.isSafeInteger(n)||n<min||n>max)
    throw Error('Bitte „'+(input.closest('label')?.querySelector('span')?.textContent||id)+'“ prüfen.');
   return n;
  };
  const percent=(id)=>{
   const input=$(id),n=Number(input.value);
   if(!input.value.trim()||!Number.isFinite(n)||n<0||n>100||
      Math.abs(n*10-Math.round(n*10))>0.000001)
    throw Error('„'+(input.closest('label')?.querySelector('span')?.textContent||id)+
     '“: Bitte eine Zahl von 0 bis 100 in Schritten von 0,1 % eingeben.');
   return Math.round(n*10);
  };
  const nonePer1000=percent('sn-none'),unlockPer1000=percent('sn-unlock');
  if(nonePer1000+unlockPer1000>1000)
   throw Error('Nieten und Freischaltungen dürfen zusammen höchstens 100 % ergeben.');
  const coinAmounts=[0,1,2].map(i=>safeInt('sn-coin-'+i,1,50000000));
  if(!(coinAmounts[0]<coinAmounts[1]&&coinAmounts[1]<coinAmounts[2]))
   throw Error('Die Geldwerte müssen steigen: 🪙 kleiner als 💵 und 💵 kleiner als 💼.');
  const lightMin=safeInt('sn-light-min',1,100),lightMax=safeInt('sn-light-max',1,100);
  if(lightMin>lightMax)throw Error('Der kleinste Lichtbonus darf nicht höher als der größte sein.');
  return {
   price:safeInt('sn-price',0,1000000),nonePer1000,unlockPer1000,
   coinAmounts,maxPrizes:safeInt('sn-max-prizes',1,3),
   extraCoinChance:safeInt('sn-extra',0,100),
   doubleChancePer1000:percent('sn-double'),
   lightChancePer1000:percent('sn-light-chance'),lightMin,lightMax
  };
 }
 function openSettings(){
  
  if(!status?.settings||!hostDialog){notice('⚠️ Einstellungen konnten noch nicht geladen werden. Bitte Kontostand aktualisieren.');return;}
  $('scratch-host-free-enabled').checked=status.settings.freeEnabled===true;
  const root=$('scratch-host-variants');root.replaceChildren();
  for(const [id,title,tier] of VARIANT_LABELS){
   const settings=status.settings.variants[id];
   if(!settings)continue;
   const block=el('section','scratch-host-variant');
   block.dataset.variant=id;
   block.append(el('h5','',title),el('small','',tier));
   const fields=el('div','scratch-host-fields');
   for(const [key,label,value,step] of [
    ['none',id==='premium_27'?'Kein zusätzlicher Sondergewinn (%)':'Niete (%)',settings.weights.none/10,'0.1'],
    ['coins',id==='premium_27'?'Münz-Bonuskategorie (%)':'Münzen (%)',settings.weights.coins/10,'0.1'],
    ['unlock','Freischaltung (%)',settings.weights.unlock/10,'0.1'],
    ['extraCoinChance',id==='gifts'?'Weitere Dreierreihen (%)':id==='snow_collect'?'Weitere Dreiergruppen (%)':'Zusatz-Münzchance (%)',settings.extraCoinChance,'1']
   ]){
    const field=el('label','scratch-host-field');
    field.append(el('span','',label));
    const input=el('input');input.type='number';input.min='0';input.max='100';input.step=step;
    input.required=true;input.value=String(value);input.dataset.key=key;
    field.append(input);fields.append(field);
   }
   const maxField=el('label','scratch-host-field');
   maxField.append(el('span','',id==='gifts'?'Max. gleiche Dreierlinien':id==='snow_collect'?'Max. gleiche Dreiergruppen':'Max. gleichzeitige Gewinne'));
   const select=el('select');select.dataset.key='maxPrizes';
   for(let n=(id==='premium_27'?6:1);n<=(['gifts','snow_collect'].includes(id)?3:10);n++){
    const option=el('option','',String(n));option.value=String(n);
    option.selected=n===settings.maxPrizes;select.append(option);
   }
   maxField.append(select);fields.append(maxField);block.append(fields);
   if(id==='snow_collect')block.append(el('small','scratch-host-premium-minimum',
    '❄️ Bingo: 3 identische Symbole an beliebigen Stellen ergeben EINEN Gewinn je Symbolart. Maximal 3 sichtbare Dreiergruppen; 🧊 zählt nie. Keine unsichtbaren Geldgewinne.'));
   if(id==='gifts')block.append(el('small','scratch-host-premium-minimum',
    '🎁 Geschenkelinie: Jeder Geld- und Hauptgewinn braucht eine eigene echte Dreierlinie aus exakt gleichen Zeichen. Maximal 3 sichtbare Gewinne; kein unsichtbarer Zusatzgewinn.'));
   if(id==='premium_27')block.append(el('small','scratch-host-premium-minimum',
    '🎟️ Premium: Vier Geldreihen sind immer garantiert. Mindestens sechs Gewinnplätze für Geldreihen, 1.000er-Bonus und eine mögliche Freischaltung. Die Nieten-Kategorie bedeutet hier nur: kein zusätzlicher Sondergewinn.'));
   // Each money icon has a different coin payout, separately set for
   // Geschenkelinie, Schneeflocken-Bingo, Wichtelpfad and Premium.
   const money=el('div','scratch-host-money');
   money.append(el('h6','','💰 Geldgewinne je Symbol'),
    el('small','','Münzbeträge für ein gültiges Gewinnsymbol; zwischen 1 und 50.000.000. Der Geldkoffer muss mehr als der Schein und der Schein mehr als die Münze auszahlen.'));
   const values=Array.isArray(settings.coinAmounts)&&settings.coinAmounts.length===3?
    settings.coinAmounts:SCRATCH_COIN_PRIZES[id==='elf'?'medium':id==='premium_27'?'premium':'simple'];
   const moneyFields=el('div','scratch-host-fields scratch-host-money-fields');
   for(const [i,label] of ['🪙 Münze · klein','💵 Geldschein · mittel','💼 Geldkoffer · groß'].entries()){
    const field=el('label','scratch-host-field');
    field.append(el('span','',label));
    const input=el('input');input.type='number';input.inputMode='numeric';
    input.min='1';input.max='50000000';input.step='1';input.required=true;
    input.value=String(values[i]);input.dataset.coinIndex=String(i);
    field.append(input);moneyFields.append(field);
   }
   money.append(moneyFields);block.append(money);
   // These are conditional chances within the winning category. The
   // Three money icons and five jackpot-gift icons each total 100%.
   function symbolOddsSection(key,title,description,symbols,defaults){
    const wrap=el('div','scratch-host-odds-group');
    wrap.dataset.oddsGroup=key;
    wrap.append(el('h6','',title),el('small','',description));
    const inputs=el('div','scratch-host-fields scratch-host-odds-fields');
    const values=Array.isArray(settings[key])&&settings[key].length===symbols.length?
     settings[key]:defaults;
    for(const [i,symbol] of symbols.entries()){
     const field=el('label','scratch-host-field');
     field.append(el('span','',symbol+' (%)'));
     const input=el('input');input.type='number';input.inputMode='decimal';
     input.min='0';input.max='100';input.step='0.1';input.required=true;
     input.value=String(values[i]/10);input.dataset.symbolIndex=String(i);
     field.append(input);inputs.append(field);
    }
    wrap.append(inputs);
    const total=el('small','scratch-host-odds-total');
    function refreshTotal(){
     const values=[...inputs.querySelectorAll('input')].map(n=>Number(n.value));
     const sum=values.reduce((a,b)=>a+b,0);
     total.textContent='Summe: '+sum.toLocaleString('de-DE',{maximumFractionDigits:1})+' % / 100 %';
     total.dataset.valid=String(values.every(Number.isFinite)&&Math.abs(sum-100)<0.0001);
    }
    inputs.addEventListener('input',refreshTotal);refreshTotal();wrap.append(total);
    return wrap;
   }
   block.append(
    symbolOddsSection('moneySymbolWeights','🎲 Geldsymbol-Wahrscheinlichkeiten',
     id==='premium_27'?'Premium: 🪙 💵 💼 erscheinen jeweils mindestens einmal garantiert. Diese Gewichtung entscheidet nur über die vierte Geld-Dreierreihe und zusätzliche Geldgewinne.':'Wie oft welches Geldsymbol erscheint, wenn ein Geldgewinn gezogen wurde.',
     ['🪙 Münze','💵 Geldschein','💼 Geldkoffer'],[334,333,333]),
    symbolOddsSection('giftSymbolWeights','🎁 Geschenk-Wahrscheinlichkeiten',
     'Welches Geschenkzeichen eine gewonnene Freischaltung darstellt.',
     ['🎁 Geschenk','💝 Herzgeschenk','🎀 Schleife','🧧 Roter Umschlag','🛍️ Geschenktüte'],[200,200,200,200,200])
   );
   const summary=el('small','scratch-host-total');
   const update=()=>{
    const values=['none','coins','unlock'].map(k=>Number(block.querySelector('[data-key="'+k+'"]').value));
    const total=values.reduce((a,b)=>a+b,0);
    summary.textContent='Hauptkategorien: '+total.toLocaleString('de-DE',{maximumFractionDigits:1})+' % / 100 %';
    summary.dataset.valid=Math.abs(total-100)<0.001?'true':'false';
   };
   fields.addEventListener('input',update);update();block.append(summary);root.append(block);
  }
  // Independent settings for the 20-row number lottery. These values are
  // saved to Firestore and used for future receipts only.
  const lucky=status.settings.numberOne20||{price:500,hitPer1000:100,
   coinAmounts:[100,300,800],symbolWeights:[650,280,60,10],giftFallbackCoins:1500};
  const special=el('section','scratch-host-variant scratch-host-lucky');
  special.dataset.variant='number_one_20';
  special.append(el('h5','','🔢 GLÜCKSZAHL 1 · LOTTERIE-EINSTELLUNGEN'),
   el('small','','Lospreis, Trefferchance, drei Geldbeträge und alle vier Symbolchancen jederzeit anpassen. Diese Werte gelten für alle Spieler und neue Lose; ältere Gewinne bleiben unverändert.'));
  const fields=el('div','scratch-host-fields');
  const luckyField=(label,key,value,min,max,step)=>{
   const field=el('label','scratch-host-field');
   field.append(el('span','',label));
   const input=el('input');input.type='number';input.inputMode='decimal';
   input.value=String(value);input.min=String(min);input.max=String(max);
   input.step=String(step);input.required=true;input.dataset.luckyKey=key;
   field.append(input);return field;
  };
  fields.append(
   luckyField('🎟️ Lospreis (Münzen)','price',lucky.price,1,1000000,1),
   luckyField('🎯 Zahl 1 je Reihe (%)','hit',lucky.hitPer1000/10,0,100,0.1));
  fields.append(luckyField('🎁 Ersatzmünzen für Geschenk','giftFallback',lucky.giftFallbackCoins??1500,0,50000000,1));
  for(const [i,label] of ['🪙 Münze','💵 Geldschein','💼 Koffer'].entries())
   fields.append(luckyField(label+' · Auszahlung','coin-'+i,lucky.coinAmounts[i],1,50000000,1));
  for(const [i,label] of ['🪙 Münze','💵 Geldschein','💼 Koffer','🎁 Geschenk'].entries())
   fields.append(luckyField(label+' · Symbolanteil (%)','weight-'+i,lucky.symbolWeights[i]/10,0,100,0.1));
  special.append(fields);
  const sum=el('div','scratch-host-odds-total');
  const update=()=>{
   const inputs=[...fields.querySelectorAll('[data-lucky-key^="weight-"]')];
   const total=inputs.reduce((v,n)=>v+Number(n.value),0);
   sum.textContent='Symbolverteilung: '+total.toLocaleString('de-DE',{maximumFractionDigits:1})+
    ' % / 100 % · Jedes Feld hat höchstens einen Gewinn · 20 Reihen pro Los.';
   sum.dataset.valid=String(Math.abs(total-100)<0.00001);
  };
  fields.addEventListener('input',update);update();
  special.append(sum);root.prepend(special);
  $('scratch-host-feedback').textContent='';
  hostDialog.showModal();
 }
 function readSettings(){
  const variants={};
  const parsePercent=(input)=>{
   const value=Number(input?.value);
   if(!Number.isFinite(value)||value<0||value>100||Math.abs(value*10-Math.round(value*10))>0.000001)
    throw Error('Gewichtungen müssen in Schritten von 0,1 % zwischen 0 und 100 liegen.');
   return Math.round(value*10);
  };
  for(const [id] of VARIANT_LABELS){
   const block=$('scratch-host-variants').querySelector('[data-variant="'+id+'"]');
   if(!block)throw Error('Einstellungen für '+id+' fehlen.');
   const input=key=>block.querySelector('[data-key="'+key+'"]');
   const weights={none:parsePercent(input('none')),coins:parsePercent(input('coins')),
    unlock:parsePercent(input('unlock'))};
   if(weights.none+weights.coins+weights.unlock!==1000)
    throw Error('Die drei Hauptchancen müssen bei jedem Los genau 100 % ergeben.');
   const extraCoinChance=Number(input('extraCoinChance').value);
   const maxPrizes=Number(input('maxPrizes').value);
   if(!Number.isInteger(extraCoinChance)||extraCoinChance<0||extraCoinChance>100)
    throw Error('Die zusätzliche Münzchance muss zwischen 0 und 100 % liegen.');
   if(!Number.isInteger(maxPrizes)||maxPrizes<(id==='premium_27'?6:1)||maxPrizes>(['gifts','snow_collect'].includes(id)?3:10))
    throw Error('Ungültige Anzahl gleichzeitiger Gewinne.');
   const coinAmounts=Array.from({length:3},(_,i)=>Number(
    block.querySelector('[data-coin-index="'+i+'"]')?.value));
   if(!coinAmounts.every(amount=>Number.isSafeInteger(amount)&&amount>=1&&amount<=50000000)||
    coinAmounts[0]>=coinAmounts[1]||coinAmounts[1]>=coinAmounts[2])
    throw Error('Geldbeträge müssen ganze Münzen zwischen 1 und 50.000.000 sein: 🪙 kleiner als 💵, 💵 kleiner als 💼.');
   const readSymbolWeights=(key,count)=>{
    const section=block.querySelector('[data-odds-group="'+key+'"]');
    const values=Array.from({length:count},(_,i)=>
     parsePercent(section?.querySelector('[data-symbol-index="'+i+'"]')));
    if(values.reduce((sum,value)=>sum+value,0)!==1000)
     throw Error('Die Wahrscheinlichkeiten bei '+(key==='moneySymbolWeights'?'🪙 💵 💼':'🎁 💝 🎀 🧧 🛍️')+
      ' müssen zusammen genau 100 % ergeben.');
    return values;
   };
   const moneySymbolWeights=readSymbolWeights('moneySymbolWeights',3);
   const giftSymbolWeights=readSymbolWeights('giftSymbolWeights',5);
   variants[id]={weights,extraCoinChance,maxPrizes,coinAmounts,moneySymbolWeights,giftSymbolWeights};
  }
  const special=$('scratch-host-variants').querySelector('[data-variant="number_one_20"]');
  if(!special)throw Error('Glückszahl-1-Einstellungen fehlen.');
  const getLucky=key=>special.querySelector('[data-lucky-key="'+key+'"]');
  const price=Number(getLucky('price')?.value);
  const hitPer1000=parsePercent(getLucky('hit'));
  const giftFallbackCoins=Number(getLucky('giftFallback')?.value);
  const coinAmounts=Array.from({length:3},(_,i)=>Number(getLucky('coin-'+i)?.value));
  const symbolWeights=Array.from({length:4},(_,i)=>parsePercent(getLucky('weight-'+i)));
  if(!Number.isInteger(giftFallbackCoins)||giftFallbackCoins<0||giftFallbackCoins>50000000)
   throw Error('Glückszahl-Ersatzgewinn muss zwischen 0 und 50.000.000 Münzen liegen.');
  if(!Number.isInteger(price)||price<1||price>1000000)
   throw Error('Der Glückszahl-Lospreis muss zwischen 1 und 1.000.000 Münzen liegen.');
  if(coinAmounts.some(n=>!Number.isInteger(n)||n<1||n>50000000)||
   !(coinAmounts[0]<coinAmounts[1]&&coinAmounts[1]<coinAmounts[2]))
   throw Error('Glückszahl-Geldbeträge müssen aufsteigend sein: 🪙 kleiner 💵 kleiner 💼.');
  if(symbolWeights.reduce((a,b)=>a+b,0)!==1000)
   throw Error('Die vier Glückszahl-Symbolchancen müssen zusammen 100 % ergeben.');
  const numberOne20={price,hitPer1000,giftFallbackCoins,coinAmounts,symbolWeights};
  return {version:1,freeEnabled:$('scratch-host-free-enabled').checked,
   variants,numberOne20};
 }
 // A SINGLE silver surface covers the entire playing grid. The player can
 // start anywhere and drag across every symbol without lifting the finger.
 // Progress counts actual transparent silver pixels, not clicks or distance.
 let unifiedCover=null,initialOpaque=0,moveNumber=0;
 const SAMPLE_ALPHA_MIN=64;
 function opaqueSamples(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let count=0;
  // Uniformly sample the entire coating, including every cell, but not gaps.
  for(let i=3;i<data.length;i+=12)if(data[i]>SAMPLE_ALPHA_MIN)count++;
  return count;
 }
 function setScratchProgress(percent){
  const p=Math.max(0,Math.min(100,percent));
  $('scratch-progress').textContent=p+' % freigerubbelt · ab 90 % automatische Aufdeckung';
  const meter=$('scratch-progress-meter');
  if(meter){meter.value=p;meter.setAttribute('aria-valuenow',String(p))}
 }
 function revealedPremiumCells(canvas){
  if(stage.dataset.variant!=='premium_27')return [];
  const rect=board.getBoundingClientRect();
  if(!rect.width||!rect.height)return [];
  const pixels=canvas.getContext('2d',{willReadFrequently:true})
   .getImageData(0,0,canvas.width,canvas.height).data;
  const found=[];
  // A 5 × 5 interior sample avoids borders and silver-free grid gaps.
  // Only count tiles the user has substantially revealed, not unseen prizes.
  for(const [i,cell] of [...board.querySelectorAll('.scratch-field')].entries()){
   const r=cell.getBoundingClientRect();
   let uncovered=0;
   for(let y=0;y<5;y++)for(let x=0;x<5;x++){
    const px=Math.max(0,Math.min(canvas.width-1,Math.floor(
     (r.left-rect.left+r.width*(.2+.15*x))*canvas.width/rect.width)));
    const py=Math.max(0,Math.min(canvas.height-1,Math.floor(
     (r.top-rect.top+r.height*(.2+.15*y))*canvas.height/rect.height)));
    if(pixels[(py*canvas.width+px)*4+3]<=SAMPLE_ALPHA_MIN)uncovered++;
   }
   if(uncovered>=13)found.push(i);
  }
  return found;
 }
 function measureScratchCover(canvas){
  if(finished||unifiedCover!==canvas||!initialOpaque)return;
  const remaining=opaqueSamples(canvas);
  const fraction=Math.max(0,Math.min(1,1-remaining/initialOpaque));
  setScratchProgress(Math.floor(fraction*100));
  if(stage.dataset.variant==='premium_27')updatePremiumCounter(revealedPremiumCells(canvas));
  if(fraction>=.9)finish();
 }
 // Original 1152 × 1536 print: each silver rectangle is not on a perfectly
 // uniform 20-row grid. The last rows are slightly closer together than the
 // first. Pixel measurements on the uploaded artwork are the source of truth.
 // Render 40 absolutely positioned fields in native-art coordinates, then
 // scale each value proportionally so mobile/desktop use identical hitboxes.
 const LUCKY_ART_WIDTH=1152,LUCKY_ART_HEIGHT=1536;
 const LUCKY_ROW_TOPS=Object.freeze([
  371,420,470,518,568,617,667,717,767,816,
  865,915,963,1011,1057,1102,1148,1193,1239,1285
 ]);
 const LUCKY_ROW_HEIGHTS=Object.freeze([
  38,38,38,39,39,39,38,38,38,38,
  38,38,37,37,36,36,35,35,36,39
 ]);
 function applyLuckyArtGeometry(cell,index){
  const row=Math.floor(index/2);
  const right=index%2===1;
  const x=right?644:314, width=right?301:307;
  const y=LUCKY_ROW_TOPS[row],height=LUCKY_ROW_HEIGHTS[row];
  if(!Number.isFinite(y)||!Number.isFinite(height))throw Error('SCRATCH_LUCKY_ROW_INVALID');
  // Apply the pixel-calibrated 1152x1536 artwork geometry directly.
  // Important inline geometry overrides older, cached 20x2 grid styles.
  // Percentage units keep every row aligned when the artwork scales.
  const geometry={
   left:(x/LUCKY_ART_WIDTH*100).toFixed(5)+'%',
   top:(y/LUCKY_ART_HEIGHT*100).toFixed(5)+'%',
   width:(width/LUCKY_ART_WIDTH*100).toFixed(5)+'%',
   height:(height/LUCKY_ART_HEIGHT*100).toFixed(5)+'%'
  };
  cell.style.setProperty('position','absolute','important');
  for(const [key,value] of Object.entries(geometry)){
   cell.style.setProperty(key,value,'important');
   cell.style.setProperty('--lucky-'+(key==='left'?'x':key==='top'?'y':key),''+value);
  }
  cell.style.setProperty('margin','0','important');
  cell.style.setProperty('box-sizing','border-box','important');
 }
 // Pixel coordinates calibrated on the approved 1086 × 1448 DOG artwork.
 // Multiplier, winning sign, separate prize at the bottom, then nine board tiles.
 // Every hitbox is independent, never an approximate 3x3 CSS grid.
 const DUEL_ART_W=1086,DUEL_ART_H=1448;
 const DUEL_HITBOXES=Object.freeze([
  [325,290,412,85], // 1x–5x multiplier
  [434,482,192,88], // winning Circle/Cross
  [324,1242,438,72], // separate prize symbol at bottom of card
  [262,647,137,150],[414,647,137,150],[568,647,134,150],
  [262,811,137,154],[414,811,137,154],[568,811,134,154],
  [262,974,137,150],[414,974,137,150],[568,974,134,150]
 ].map(coords=>Object.freeze(coords)));
 function applyDuelArtGeometry(cell,index){
  const coords=DUEL_HITBOXES[index];
  if(!coords)throw Error('TIC_DUEL_GEOMETRY_INVALID');
  for(const [name,value,base] of [
   ['--duel-x',coords[0],DUEL_ART_W],['--duel-y',coords[1],DUEL_ART_H],
   ['--duel-w',coords[2],DUEL_ART_W],['--duel-h',coords[3],DUEL_ART_H]
  ])cell.style.setProperty(name,(value/base*100).toFixed(5)+'%');
 }
 function makeDuelTile(value,index){
  const cell=el('div','scratch-field scratch-duel-tile '+(index===0?'scratch-duel-multiplier':
   index===1?'scratch-duel-winning-symbol':index===2?'scratch-duel-prize-symbol':'scratch-duel-board-cell'));
  applyDuelArtGeometry(cell,index);
  cell.append(el('span','scratch-cell-symbol',value));
  cell.setAttribute('aria-label',index===0?'Multiplikator aufrubbeln':
   index===1?'Gewinnzeichen aufrubbeln':index===2?'Gewinnsymbol unten aufrubbeln':
   'Spielfeld '+(index-2)+' aufrubbeln');
  return cell;
 }
 function attachDuelCovers(){
  const cells=[...board.querySelectorAll('.scratch-duel-tile')];
  if(cells.length!==12)throw Error('TIC_DUEL_FIELDS_MISSING');
  let phase=0,uncovered=0;
  const canvases=[];
  const instructions=[
   '① Rubbele den Gewinnmultiplikator oben frei (1× bis 5×)',
   '② Rubbele Kreis oder Kreuz als Gewinnzeichen frei',
   '③ Rubbele ganz unten das Gewinnsymbol frei: Das ist dein möglicher Preis',
   '④ Rubbele die neun Spielfelder frei. Drei passende Zeichen in einer Linie gewinnen!'
  ];
  const update=()=>{
   if(finished)return;
   setScratchProgress(Math.round(uncovered/12*100));
   $('scratch-progress').textContent=instructions[Math.min(phase,3)]+' · '+uncovered+'/12';
   for(const [i,cv] of canvases.entries()){
    const allowed=!cells[i].classList.contains('uncovered')&&
     (phase===0?i===0:phase===1?i===1:phase===2?i===2:i>=3);
    cv.style.pointerEvents=allowed?'auto':'none';
    cv.tabIndex=allowed?0:-1;
    cv.setAttribute('aria-disabled',String(!allowed));
   }
  };
  const revealOne=i=>{
   if(finished||cells[i].classList.contains('uncovered')||
    (phase===0&&i!==0)||(phase===1&&i!==1)||(phase===2&&i!==2)||(phase===3&&i<3))return;
   const cv=canvases[i];cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
   cv.hidden=true;cells[i].classList.add('uncovered');uncovered++;
   if(i===0)phase=1;else if(i===1)phase=2;else if(i===2)phase=3;
   update();
   if(uncovered===12)finish();
  };
  for(const [i,cell] of cells.entries()){
   const rect=cell.getBoundingClientRect();
   if(rect.width<1||rect.height<1)throw Error('TIC_DUEL_LAYOUT_INVALID');
   const cv=el('canvas','scratch-duel-cover');
   cv.width=Math.max(2,Math.round(rect.width));cv.height=Math.max(2,Math.round(rect.height));
   cv.setAttribute('role','button');cv.setAttribute('aria-label',cell.getAttribute('aria-label'));
   const ctx=cv.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('TIC_DUEL_CANVAS_INVALID');
   const fill=ctx.createLinearGradient(0,0,cv.width,cv.height);
   fill.addColorStop(0,'#9faeb9');fill.addColorStop(.44,'#e7eced');fill.addColorStop(1,'#96a6b4');
   ctx.fillStyle=fill;ctx.fillRect(0,0,cv.width,cv.height);
   ctx.strokeStyle='#f6fcff7d';ctx.lineWidth=1;
   for(let x=-cv.height;x<cv.width+cv.height;x+=14){
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+cv.height,cv.height);ctx.stroke();
   }
   ctx.globalCompositeOperation='destination-out';
   let active=null,last=null;
   const point=e=>{
    const r=cv.getBoundingClientRect();
    return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];
   };
   const stroke=e=>{
    if(active!==e.pointerId)return;
    e.preventDefault();
    const [x,y]=point(e);
    const brush=Math.max(12,Math.min(cv.width,cv.height)*.34);
    ctx.lineWidth=brush;ctx.lineJoin='round';ctx.lineCap='round';
    if(last){ctx.beginPath();ctx.moveTo(last[0],last[1]);ctx.lineTo(x,y);ctx.stroke()}
    else{ctx.beginPath();ctx.arc(x,y,brush/2,0,Math.PI*2);ctx.fill()}
    last=[x,y];
   };
   const check=()=>{
    const pixels=ctx.getImageData(0,0,cv.width,cv.height).data;
    let total=0,clear=0;
    for(let offset=3;offset<pixels.length;offset+=48){
     total++;if(pixels[offset]<70)clear++;
    }
    if(total&&clear/total>=.58)revealOne(i);
   };
   cv.addEventListener('pointerdown',e=>{
    if(finished||(phase===0&&i!==0)||(phase===1&&i!==1)||(phase===2&&i!==2)||(phase===3&&i<3))return;
    active=e.pointerId;last=null;cv.setPointerCapture?.(e.pointerId);stroke(e);
   });
   cv.addEventListener('pointermove',stroke);
   cv.addEventListener('pointerup',e=>{
    if(active!==e.pointerId)return;stroke(e);active=null;last=null;check();
   });
   cv.addEventListener('pointercancel',()=>{active=null;last=null;check()});
   cv.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();revealOne(i)}
   });
   cell.append(cv);canvases.push(cv);
  }
  update();
 }
 function makeField(symbol,index=0){
  if(stage.dataset.duelVersion==='8')return makeDuelTile(symbol,index+3);
  const cell=el('div','scratch-field');
  if(stage.dataset.variant==='number_one_20'){
   const numberField=index%2===1;
   cell.classList.add(numberField?'scratch-number-target':'scratch-number-prize');
   applyLuckyArtGeometry(cell,index);
   const face=el('span','scratch-cell-symbol',String(symbol));
   face.setAttribute('aria-hidden','true');cell.append(face);
   if(numberField)cell.setAttribute('aria-label','Verdeckte Zahl in Reihe '+(Math.floor(index/2)+1));
   else{
    // Only reveal the symbol in this rectangle; the payout legend in the
    // lottery side panel is dynamic and never printed inside the scratch grid.
    cell.setAttribute('aria-label','Verdecktes Gewinnsymbol in Reihe '+(Math.floor(index/2)+1));
   }
   return cell;
  }
  if(stage.dataset.variant==='dog_jackpot_9'){
   cell.dataset.dogSlot=String(index+1);
   if(symbol==='DOG')cell.classList.add('scratch-dog-trigger');
  }
  const face=el('span','scratch-cell-symbol',symbol);
  face.setAttribute('aria-hidden','true');
  cell.append(face);
  if(stage.dataset.variant==='dog_jackpot_9'&&symbol!=='DOG'){
   const amounts=coinAmountsFor(ticket?.tier||'premium','dog_jackpot_9',ticket);
   const amount={'🪙':amounts[0],'💵':amounts[1],'💼':amounts[2]}[symbol];
   cell.append(el('small','scratch-dog-payout',amount?num(amount):'Geschenk'));
  }
  // Premium money symbols must show their actual payout directly IN the
  // scratched square. Use the immutable ticket prices, not later host edits.
  if(stage.dataset.variant==='premium_27'&&['🪙','💵','💼'].includes(symbol)){
   const index=['🪙','💵','💼'].indexOf(symbol);
   const amounts=coinAmountsFor(ticket?.tier||'premium','premium_27',ticket);
   const amount=amounts[index];
   cell.classList.add('scratch-money-field');
   cell.append(el('span','scratch-cell-amount',num(amount)));
   cell.setAttribute('aria-label',symbol+' '+num(amount)+' Münzen');
   cell.title=symbol+' '+num(amount)+' Münzen – drei gleiche Symbole in einer Reihe gewinnen';
  }
  if(symbol==='🧊'&&['snow_collect','premium_27'].includes(stage.dataset.variant)){
   cell.classList.add('scratch-dud');
   cell.append(el('small','scratch-cell-dud-label','Niete'));
  }
  return cell;
 }
 function attachUnifiedCover(){
  const cells=Array.from(board.querySelectorAll('.scratch-field'));
  if(!cells.length)return;
  const boardRect=board.getBoundingClientRect();
  if(boardRect.width<1||boardRect.height<1)throw Error('SCRATCH_BOARD_LAYOUT_INVALID');
  const canvas=el('canvas','scratch-unified-cover');
  canvas.setAttribute('aria-label','Gesamtes Rubbellos mit Finger oder Maus ohne Absetzen freirubbeln');
  canvas.setAttribute('role','button');
  canvas.setAttribute('tabindex','0');
  canvas.setAttribute('title','Beginne irgendwo und wische über das komplette Spielfeld. Ab 90 Prozent wird es automatisch geöffnet.');
  canvas.width=Math.round(boardRect.width);
  canvas.height=Math.round(boardRect.height);
  board.append(canvas);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.globalCompositeOperation='source-over';
  // Every pair of the 20-row card is independently coated: left prize,
  // right number. The positions and results originate from the server receipt.
  const coated=cells;
  for(const cell of coated){
   const r=cell.getBoundingClientRect();
   const inset=stage.dataset.variant==='number_one_20'?1:2;
   const x=r.left-boardRect.left+inset,y=r.top-boardRect.top+inset;
   const w=Math.max(1,r.width-inset*2),h=Math.max(1,r.height-inset*2);
   ctx.save();
   ctx.beginPath();
   if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,Math.min(w,h)*.09);
   else ctx.rect(x,y,w,h);
   ctx.clip();
   const g=ctx.createLinearGradient(x,y,x+w,y+h);
   g.addColorStop(0,'#8095a2');g.addColorStop(.45,'#ebf1f0');g.addColorStop(1,'#8b9faa');
   ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
   if(stage.dataset.variant==='dog_jackpot_9'){
    // The same embossed foil covers ALL nine spots, never signaling DOG's location.
    const metallic=ctx.createLinearGradient(x,y,x+w,y+h);
    metallic.addColorStop(0,'#94754e');metallic.addColorStop(.25,'#e9d9b4');
    metallic.addColorStop(.53,'#eaf0ec');metallic.addColorStop(.79,'#cab187');
    metallic.addColorStop(1,'#8c6d4c');
    ctx.fillStyle=metallic;ctx.fillRect(x,y,w,h);
   }
   ctx.strokeStyle='#c2d6d8';ctx.lineWidth=1;
   for(let d=-h;d<w+h;d+=12){
    ctx.beginPath();ctx.moveTo(x+d,y);ctx.lineTo(x+d+h,y+h);ctx.stroke();
   }
   ctx.fillStyle=stage.dataset.variant==='dog_jackpot_9'?'#6b4b28':'#496171';
   ctx.font='700 '+Math.max(9,Math.min(15,h*.20))+'px system-ui';
   ctx.textAlign='center';
   ctx.fillText(stage.dataset.variant==='dog_jackpot_9'?'🐾':'❄',x+w/2,y+h/2+4);
   ctx.restore();
  }
  unifiedCover=canvas;
  initialOpaque=opaqueSamples(canvas);
  moveNumber=0;
  setScratchProgress(0);
  ctx.globalCompositeOperation='destination-out';
  let activePointer=null,last=null;
  const point=e=>{
   const r=canvas.getBoundingClientRect();
   return {x:(e.clientX-r.left)*canvas.width/r.width,
           y:(e.clientY-r.top)*canvas.height/r.height};
  };
  const stroke=e=>{
   if(activePointer!==e.pointerId||finished||unifiedCover!==canvas)return;
   e.preventDefault();
   const p=point(e);
   const brush=Math.max(20,Math.min(55,Math.min(boardRect.width/parseInt(board.style.getPropertyValue('--scratch-cols')||'3',10),boardRect.height/Math.ceil(cells.length/parseInt(board.style.getPropertyValue('--scratch-cols')||'3',10)))*.55));
   ctx.lineWidth=brush;ctx.lineCap='round';ctx.lineJoin='round';
   if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
   else{ctx.beginPath();ctx.arc(p.x,p.y,brush/2,0,Math.PI*2);ctx.fill()}
   last=p;
   if(++moveNumber%4===0)measureScratchCover(canvas);
  };
  canvas.addEventListener('pointerdown',e=>{
   if(finished||activePointer!==null)return;
   activePointer=e.pointerId;last=null;
   canvas.setPointerCapture?.(e.pointerId);
   stroke(e);
  });
  canvas.addEventListener('pointermove',stroke);
  const stop=e=>{
   if(e.pointerId!==activePointer)return;
   activePointer=null;last=null;
   measureScratchCover(canvas);
  };
  canvas.addEventListener('pointerup',stop);
  canvas.addEventListener('pointercancel',stop);
  // Keyboard-only access stays possible without restoring per-cell clicks.
  canvas.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();finish()}
  });
 }
 function updatePremiumCounter(revealed=[]){
  const progress=premiumScratchProgress(ticket?.board,revealed);
  const counter=stage.querySelector('.scratch-premium-counter');
  if(!progress||!counter)return;
  counter.querySelector('[data-premium-symbol-count]').textContent=progress.count+' / 27';
  // Never disclose the ticket's unseen total before the silver is removed.
  counter.querySelector('[data-premium-found]').textContent=finished?
   progress.total+' echte Symbole insgesamt · 🧊 zählt nicht':
   progress.count+' echte Symbole entdeckt · 🧊 zählt nicht';
  // Also frame the 20/24 reward illustrations already printed at the
  // bottom-right of the premium artwork, without covering or changing art.
  const artwork=$('scratch-card-art');
  artwork.dataset.premiumGold20=String(progress.count>=20&&progress.goldAwarded);
  artwork.dataset.premiumGold24=String(progress.count>=24&&progress.premiumAwarded);
  for(const [goal,awarded] of [[20,progress.goldAwarded],[24,progress.premiumAwarded]]){
   const line=counter.querySelector('[data-premium-milestone="'+goal+'"]');
   if(!line)continue;
   const reached=progress.count>=goal&&awarded;
   line.classList.toggle('is-earned',reached);
   line.dataset.earned=String(reached);
   line.querySelector('[data-milestone-progress]').textContent=
    Math.min(progress.count,goal)+' / '+goal;
   const state=line.querySelector('[data-milestone-state]');
   state.textContent=reached?'✓ ERREICHT':goal===24&&progress.count>=24&&progress.giftRowRequired?
    '3 gleiche Geschenke nötig':'Noch nicht erreicht';
  }
 }
 function drawPrizeTable(result,entries=[]){
  let panel=stage.querySelector('.scratch-prize-sidebar');
  if(!panel){panel=el('aside','scratch-prize-sidebar');stage.append(panel)}
  panel.replaceChildren();
  if(result?.board?.variantId==='premium_27'){
   const counter=el('section','scratch-premium-counter');
   counter.setAttribute('aria-label','Premium-Symbolzähler und Belohnungsstufen');
   const header=el('div','scratch-premium-counter-header');
   header.append(el('span','','🔎 Symbole gesammelt'),
    el('strong','scratch-premium-counter-number','0 / 27'));
   header.querySelector('strong').dataset.premiumSymbolCount='';
   counter.append(header);
   const found=el('small','scratch-premium-found','0 Symbole freigerubbelt');
   found.dataset.premiumFound='';counter.append(found);
   for(const [goal,name,description] of [
    [20,'🪙 Gold-Belohnung','20 Symbole · +1.000 Münzen'],
    [24,'🎁 Premium-Belohnung',[3,4,5].includes(result.board.symbolVersion)?
     '24 Symbole + 3 gleiche Geschenke':'24 Symbole']
   ]){
    const line=el('div','scratch-premium-milestone');
    line.dataset.premiumMilestone=String(goal);line.dataset.earned='false';
    const left=el('span','');
    left.append(el('strong','',name),el('small','',description));
    const right=el('span','scratch-premium-milestone-status');
    const amount=el('strong','', '0 / '+goal);amount.dataset.milestoneProgress='';
    const state=el('small','','Noch nicht erreicht');state.dataset.milestoneState='';
    right.append(amount,state);line.append(left,right);counter.append(line);
   }
   panel.append(counter);
  }
  // Always provide a meaningful result card. The ticket is bought and paid
  // server-side already; confirming only dismisses the verified receipt.
  const section=el('section','scratch-current-awards');
  section.setAttribute('aria-label','Ergebnis deines Rubbelloses');
  section.append(el('small','scratch-result-kicker','✦ DEIN RUBBELLOS'));
  if(!finished){
   section.append(el('h4','scratch-current-title','🎟️ Noch nicht aufgedeckt'));
   section.append(el('p','scratch-current-hint',
    result?.board?.symbolVersion===8&&result?.board?.variantId==='tic_tac_toe'?
    'Rubbele zuerst den Multiplikator, danach Gewinnzeichen und Gewinnsymbol gemeinsam frei und zuletzt die neun Spielfelder. ✖️2 erscheint gegebenenfalls im selben Feld.':
    'Rubbele das Los zu mindestens 90 % frei. Danach erscheinen hier deine tatsächlichen Gewinne und die Bestätigung.'));
  }else{
   const prizes=(Array.isArray(result?.winnings)?result.winnings:entries)
    .filter(p=>p&&['coins','unlock','lights'].includes(p.type));
   const sourceWins=Array.isArray(result?.board?.wins)?result.board.wins:[];
   const total=Number.isSafeInteger(result?.totalCoins)&&result.totalCoins>=0?result.totalCoins:
    prizes.filter(p=>p.type==='coins').reduce((sum,p)=>sum+(Number.isSafeInteger(p.amount)?p.amount:0),0);
   const unlocks=prizes.filter(p=>p.type==='unlock').length;
   const hasLight=Number(result?.totalLights)>0;
   section.append(el('h4','scratch-current-title',prizes.length||hasLight?
    '🎉 Dein Gewinn':result?.giftSparksEarned?'🎁 Geschenkfunke gesammelt':'❄️ Dieses Los ist eine Niete'));
   const hero=el('div','scratch-current-hero'+(prizes.length||hasLight||result?.giftSparksEarned?' is-win':' is-empty'));
   hero.append(el('small','','Gutgeschriebene Münzen'),
    el('strong','',num(total)+' 🪙'));
   hero.append(el('span','',unlocks?
    '🎁 '+unlocks+' Freischaltung'+(unlocks===1?'':'en'):
    prizes.length?'✓ Ergebnis ermittelt':hasLight?'⭐ Weihnachtslichter erhalten':result?.giftSparksEarned?'🎁 +1 Geschenkfunke':'Kein Gewinn · 0 Münzen'));
   section.append(hero);
   const lightTotal=Number.isSafeInteger(result?.totalLights)?result.totalLights:0;
   const lightCard=el('div','scratch-light-reward');
   lightCard.append(el('span','scratch-light-reward-icon','⭐'));
   const lightText=el('div','scratch-light-reward-text');
   lightText.append(el('strong','',lightTotal>0?
    '+'+num(lightTotal)+' Weihnachtslichter':'Weihnachtslichter'));
   lightText.append(el('small','',lightTotal>0?
    'Für das gemeinsame Dorf Lichtertal gutgeschrieben':
    'Dieses Los enthält keinen zusätzlichen Lichtgewinn'));
   lightCard.append(lightText);
   section.append(lightCard);
   if(result?.doubleWin){
    const bonus=el('div','scratch-double-win-panel');
    bonus.append(el('span','scratch-double-win-icon','✖️2'));
    const text=el('div','scratch-double-win-copy');
    text.append(el('strong','','Gewinn verdoppelt!'),
     el('small','','Zusätzlich '+num(result.doubleWin.extraCoins||0)+' 🪙 und '+
      num(result.doubleWin.extraLights||0)+' ⭐ – bereits gutgeschrieben.'));
    bonus.append(text);section.append(bonus);
   }
   if(prizes.length){
    const list=el('div','scratch-current-grid');
    prizes.forEach((prize,i)=>{
     const win=sourceWins[Number.isInteger(prize.sourceWin)?prize.sourceWin:i];
     const rule=prize.milestone||win?.rule||(prize.bonus?'bonus':'row-3');
     const where=prize.bonus?'🎉 Zusatzgewinn':
      rule==='number-one'?'🔢 Glückszahl 1':
      rule==='dog-all'?'🐾 DOG-Jackpot':
      rule==='tic-duel-line'?'⭕ Tic-Tac-Toe Duell':
      rule==='gold-20'?'⭐ 20 Symbole':
      rule==='premium-24'?'🎁 24 Symbole':
      rule==='row-3'?'🎟️ Dreierreihe':
      rule==='gift-three-connected'?'🎁 Verbundene Geschenke':'🎟️ Gewinnkombination';
     const entry=el('div','scratch-current-item'+(prize.type==='unlock'?' is-unlock':''));
     entry.append(el('small','scratch-current-source',where));
     entry.append(el('strong','scratch-current-value',prize.type==='coins'?
      (prize.symbol||'🪙')+' '+num(prize.amount)+' Münzen':
      prize.type==='lights'?'⭐ '+num(prize.amount)+' Weihnachtslichter':
      (prize.symbol||'🎁')+' '+(prize.prize?.name||'Neue Freischaltung')));
     if(prize.x2)entry.append(el('small','scratch-current-multiplier','✨ ×2 Gewinn'));
     list.append(entry);
    });
    section.append(list);
   }else{
    section.append(el('p','scratch-current-empty',
     Number(result?.totalLights)>0?
     '⭐ Lichtbonus gutgeschrieben – auch ohne Münzgewinn. Bestätige das Ergebnis, um das nächste Los zu öffnen.':
     result?.giftSparksEarned?
     'Keine Münzreihe, aber ein Geschenkfunke wurde gutgeschrieben. Bestätige das Ergebnis.':
     'Diesmal keine gültige Gewinnkombination. Bestätige auch dieses Ergebnis, um das nächste Los zu öffnen.'));
   }
  }
  panel.append(section);
  panel.append(el('h4','','Gewinntabelle'));
  const tier=result?.tier||'simple';
  const amounts=coinAmountsFor(tier,result?.board?.variantId||null,result);
  const awarded=new Set(entries.map(p=>p?.type==='coins'?p.symbol||'🪙':p?.type==='unlock'?p.symbol||'🎁':''));
  const giftSymbols=[3,4,5].includes(result?.board?.symbolVersion)?['🎁','💝','🎀','🧧','🛍️']:['🎁','💝','🎀','🧧','🛍️'];
  const wonGifts=giftSymbols.filter(symbol=>awarded.has(symbol));
  if(result?.board?.variantId==='number_one_20')panel.append(el('div','scratch-special-rule-note',
   '🔢 Jede der 20 Reihen hat zwei eigene Rubbelstellen. Links das Symbol, rechts die Zahl: Nur eine 1 gewinnt den Symbolpreis derselben Reihe. Alle Treffer werden addiert.'));
  if(result?.board?.variantId==='dog_jackpot_9')panel.append(el('div','scratch-special-rule-note scratch-dog-odds',
   '🐾 '+num((result?.board?.dogChancePer1000??350)/10)+' % Jackpotchance · Ein DOG gewinnt alle 8 anderen Felder inklusive möglicher Freischaltungen. Ohne DOG ist das Los eine Niete.'));
  if(result?.board?.variantId==='tic_tac_toe'&&result.board?.symbolVersion===8){
   panel.append(el('div','scratch-tictac-bonus-note',
    '◯ / ✕ · Gewinnzeichen: '+result.board.winningSymbol+' · '+result.board.multiplier+
    '× Multiplikator. Eine passende Dreierlinie gewinnt einen Symbolpreis genau einmal.'));
  }
  if(result?.board?.variantId==='tic_tac_toe'&&result.board?.symbolVersion!==8){
   panel.append(el('div','scratch-tictac-bonus-note',
    '🎯 8 Linien · 2 Linien +250 · 3+ +800 · Mitte +300 · X +1.000 · Ecken +400 · 9 gleiche +20.000'));
  }
  const names=[['🪙',amounts[0]+' Münzen'],['💵',amounts[1]+' Münzen'],['💼',amounts[2]+' Münzen'],[giftSymbols.join(' '),[3,4,5].includes(result?.board?.symbolVersion)?'Freischaltung · 3 gleiche Geschenke':'Freischaltung']];
  for(const [symbol,label] of names){
   const won=awarded.has(symbol)||(symbol===giftSymbols.join(' ')&&wonGifts.length>0);
   const line=el('div','scratch-prize-entry'+(won?' is-won':''));
   line.append(el('span','',symbol),el('span','',label));
   if(won)line.append(el('strong','',wonGifts.length&&symbol===giftSymbols.join(' ')?wonGifts.join(' ')+' ✓ Gewinn':'✓ Gewinn'));
   panel.append(line);
  }
  const remaining=status?.remainingMainPrizes;
  panel.append(el('div','scratch-prize-remaining',Number.isInteger(remaining)?
   '🎁 Noch verfügbare Hauptgewinne: '+remaining:
   '🎁 Hauptgewinn-Bestand: derzeit nicht verfügbar'));
  // Keep the full card graphic untouched; award results belong to the
  // dedicated, compact right panel, not over the bottom three card rows.
  // Do not search for this node after replaceChildren(): that temporarily
  // detaches it. append(null) would literally print "null" on screen.
  panel.append(results,winningLines);
  updatePremiumCounter(finished&&result?.board?.variantId==='premium_27'?
   result.board.cells.map((_,i)=>i):[]);
 }
 // The separate right-side prize window was removed. Show the verified
 // winnings as a small, non-scrolling strip within the ticket itself.
 function renderInlineResults(result){
  const outlet=$('scratch-inline-results');
  if(!outlet)return;
  outlet.replaceChildren();
  outlet.hidden=!result;
  if(!result)return;
  const raw=Array.isArray(result.winnings)?result.winnings:
   result.type==='coins'?[{type:'coins',symbol:'🪙',amount:result.amount}]:
   result.type==='unlock'?[{type:'unlock',symbol:'🎁',prize:result.prize}]:[];
  const prizes=raw.filter(p=>p&&['coins','unlock','lights'].includes(p.type));
  const wins=Array.isArray(result.board?.wins)?result.board.wins:[];
  const amount=Number.isSafeInteger(result.totalCoins)&&result.totalCoins>=0?
   result.totalCoins:prizes.reduce((sum,p)=>
    sum+(p.type==='coins'&&Number.isSafeInteger(p.amount)?p.amount:0),0);
  const heading=el('div','scratch-inline-heading');
  const lightBonus=Number.isSafeInteger(result.totalLights)&&result.totalLights>0?result.totalLights:0;
  heading.append(el('strong','',prizes.length?'🏆 '+prizes.length+' Gewinne':
   lightBonus?'⭐ Lichtgewinn':result.giftSparksEarned?'🎁 Geschenkfunke':'❄️ Niete'),
   el('strong','scratch-inline-total','🪙 '+num(amount)+' erhalten'));
  outlet.append(heading);
  if(lightBonus)outlet.append(el('div','scratch-light-reward',
   '⭐ +'+num(lightBonus)+' Weihnachtslichter · Lichtertal gutgeschrieben'));
  if(result.doubleWin){
   outlet.append(el('div','scratch-double-win-inline',
    '✖️2 Gewinnmultiplikator: +'+num(result.doubleWin.extraCoins||0)+' 🪙 und +'+
    num(result.doubleWin.extraLights||0)+' ⭐ bereits im Gesamtgewinn enthalten'));
  }
  if(result.board?.variantId==='tic_tac_toe'&&result.board?.symbolVersion!==8){
   const text=result.giftSparksEarned?
    '🎁 +1 Geschenkfunke · '+(status?.giftSparks??0)+'/5 bis zum Gratis-Tic-Tac-Toe-Los':
    '🎁 2 Geschenke auf einem Los geben einen Geschenkfunken';
   outlet.append(el('small','scratch-tictac-sparks',text));
   if(result.giftVoucherEarned)outlet.append(el('strong','scratch-tictac-voucher',
    '🎟️ Fünf Geschenkfunken gesammelt: +1 Gratislos!'));
  }
  if(!prizes.length)return;
  const list=el('div','scratch-inline-chips');
  const samePrize=(win,prize)=>win?.symbol===prize.symbol&&
   win.prize?.type===prize.type&&
   (prize.type==='coins'?win.prize?.amount===(prize.baseAmount??prize.amount):
    win.prize?.prize?.unlockId===prize.prize?.unlockId);
  for(const [i,prize] of prizes.entries()){
   const chip=el('div','scratch-inline-chip'+(prize.type==='unlock'?' is-unlock':''));
   const label=prize.type==='coins'?
    (prize.symbol||'🪙')+' '+num(prize.amount)+' Münzen':
    prize.type==='lights'?'⭐ '+num(prize.amount)+' Weihnachtslichter':
    (prize.symbol||'🎁')+' '+(prize.prize?.name||'Freischaltung');
   const source=prize.bonus?null:
    samePrize(wins[i],prize)?wins[i]:wins.find(win=>samePrize(win,prize));
   const rule=prize.milestone||source?.rule;
   const detail=prize.type==='lights'?
    '⭐ Sofort für den Ausbau der vier Lichtertal-Gebäude gutgeschrieben':
    prize.milestone?.startsWith('tic-')?({
    'tic-double':'2 Gewinnlinien','tic-multi':'3+ Gewinnlinien',
    'tic-center':'Koffer in der Mitte','tic-x':'Goldenes X',
    'tic-corners':'4 gleiche Ecken','tic-jackpot':'9 gleiche Felder – Jackpot'
   }[prize.milestone]||'Tic-Tac-Toe-Bonus'):
    prize.milestone==='gold-20'?'20 Symbole · +1.000':
    rule==='premium-24'?'24 Symbole · Freischaltung':
    prize.bonus?'🎉 Bonus zu Gewinn '+(Number.isInteger(prize.sourceWin)?prize.sourceWin+1:'?'):
    rule==='number-one'?'Zahl 1 · Preis der Reihe':
    rule==='dog-all'?'DOG gefunden · alle Preise':
    rule==='tic-duel-line'?'Gewinnsymbol in einer Dreierlinie':
    rule==='three-anywhere'?'3 gleiche beliebig':
    rule==='gift-three-connected'?'3 verbundene Geschenke':
    rule==='path'?'Pfad links → rechts':
    rule==='line'?'Dreierlinie':
    rule==='row-3'?'Geld-Dreierreihe':
    'Gewinnkombination';
   chip.append(el('strong','',label),el('small','',detail+(prize.x2?' · ✨ ×2':'') ));
   list.append(chip);
  }
  outlet.append(list);
 }
 function showTicket(result){
  ticket=result;finished=false;unifiedCover=null;initialOpaque=0;
  stage.classList.remove('is-revealed');
  renderInlineResults(null);
  stage.removeAttribute('data-result');
  stage.hidden=false;reveal.classList.remove('revealed');results.hidden=true;
  $('scratch-ticket-finish').hidden=true;
  // Always offer an explicit reveal action. Dragging the canvas still
  // automatically opens the result at 90 percent, including a losing ticket.
  $('scratch-reveal-button').hidden=false;
  $('scratch-reveal-button').textContent='✨ Ergebnis jetzt aufdecken';
  $('scratch-ticket-finish').textContent='✓ Ergebnis bestätigen';
  const conf=VARIANTS[result.board?.variantId],cells=result.board?.cells;
  stage.dataset.variant=result.board?.variantId||'legacy';
  $('scratch-gifts-settings-open').hidden=stage.dataset.variant!=='gifts';
  $('scratch-snow-settings-open').hidden=stage.dataset.variant!=='snow_collect';
  stage.dataset.tier=result.tier||'simple';
  stage.dataset.duelVersion=String(result.board?.variantId==='tic_tac_toe'?result.board?.symbolVersion||0:0);
  // The ticket banner stays outside the scratchable 3 × 3 region.
  const dogArt=$('scratch-card-art');
  dogArt.querySelector('.scratch-dog-ribbon')?.remove();
  if(stage.dataset.variant==='dog_jackpot_9'){
   const ribbon=el('div','scratch-dog-ribbon','🐾 '+num((result.board?.dogChancePer1000??350)/10)+' % JACKPOT-CHANCE · 9 GEHEIME FELDER');
   ribbon.setAttribute('aria-hidden','true');
   dogArt.append(ribbon);
  }
  renderNumberLottery(result);
  $('scratch-lotto-back').hidden=stage.dataset.variant!=='number_one_20'&&stage.dataset.duelVersion!=='8';
  $('scratch-ticket-title').textContent=conf?
   conf[0]+' · '+(SCRATCH_TICKET_TYPES.find(t=>t.id===result.tier)?.label||'')+'-Rubbellos':
   '🎟️ Älteres Rubbellos';
  const payoutRule=result.board?.variantId==='number_one_20'?
    '20 Reihen × 2 separat freirubbelbare Felder. Jede Zahl 1 gewinnt das Symbol links. Die Auszahlungen dieses Loses: 🪙 '+num((result.coinAmounts||[100,300,800])[0])+' · 💵 '+num((result.coinAmounts||[100,300,800])[1])+' · 💼 '+num((result.coinAmounts||[100,300,800])[2])+' · 🎁 Freischaltung.':
   result.board?.variantId==='dog_jackpot_9'?
    'Neun Felder: Wird DOG aufgedeckt, gehören dir die Preise aller acht übrigen Felder. '+symbolLegend(result.tier,coinAmountsFor(result.tier,'dog_jackpot_9',result))+' · 🎁 Freischaltung. Ohne DOG: Niete.':
   result.board?.variantId==='tic_tac_toe'&&result.board?.symbolVersion===8?
    'Zuerst 1×–'+(result.board?.maxMultiplier??5)+'× aufrubbeln, dann ◯ oder ✕ als Gewinnzeichen, danach das Gewinnsymbol ganz unten und zuletzt alle neun Spielfelder. Eine Dreierlinie aus dem Gewinnzeichen gewinnt EINEN Preis des unteren Gewinnsymbols × Multiplikator; Geschenke geben höchstens eine Freischaltung, sonst '+num(result.board?.giftFallbackCoins??1500)+' Münzen × Multiplikator.':
   result.board?.variantId==='tic_tac_toe'?
    '🪙 200 · 💵 450 · 💼 800 Münzen je Dreierreihe · 🎁 Premium-Freischaltung. 2 Linien +250 · 3+ Linien +800 · Koffer in der Mitte +300 · Goldenes X +1.000 · 4 gleiche Ecken +400 · 9 gleiche Felder +20.000. Zwei Geschenke ergeben einen Geschenkfunken.':
   result.board?.variantId==='premium_27'&&result.board?.symbolVersion===5?
    'Vier echte Geld-Dreierreihen sind auf jedem Premiumlos garantiert: 🪙 💵 💼. Jede Dreierreihe gewinnt ihren Geldbetrag. Bei 20 echten Symbolen gibt es zusätzliche 1.000 Münzen; ab 24 kann eine Freischaltung dazukommen. 🧊 zählt nicht.':
   result.board?.variantId==='premium_27'&&result.board?.symbolVersion===4?
   'Drei gleiche Geldsymbole 🪙 💵 💼 in einer waagerechten Reihe gewinnen. Bei 20 echten Symbolfeldern gibt es feste 1.000 Münzen. Ab 24 Symbolfeldern zusätzlich eine Freischaltung mit 3 gleichen Geschenken. 🧊 zählt nicht.':
   result.board?.variantId==='elf'&&result.board?.symbolVersion===3?
   'Geld: durchgehender Weg gleicher Symbole von links nach rechts. Geschenk: 3 identische, waagerecht oder senkrecht verbundene Geschenkzeichen.':
   result.board?.variantId==='premium_27'&&result.board?.symbolVersion===3?
   'Drei gleiche Gewinnsymbole waagerecht; Geld ab 20 Symbolfeldern; Freischaltung ab 24 Symbolfeldern UND 3 gleichen Geschenkzeichen in einer Reihe. 🧊 zählt nicht.':
   result.board?.symbolVersion===2&&result.board?.variantId==='premium_27'?
   'Drei gleiche Gewinnsymbole waagerecht, Geld ab 20 Symbolfeldern, 🎁 Freischaltung ab 24 Symbolfeldern. 🧊 zählt nicht.':null;
  $('scratch-variant-rule').textContent=conf?conf[0]+' · Gewinnregel: '+(payoutRule||conf[1]):
   'Älteres Los – dieses Ergebnis wurde vor dem neuen Spielfeldsystem gespeichert';
  board.parentElement.querySelector('.scratch-premium-symbol-count')?.remove();
  const legend=$('scratch-symbol-legend');
  if(legend){legend.hidden=![2,3,4,5,6,7,8].includes(result.board?.symbolVersion);
   legend.textContent=legend.hidden?'':result.board?.variantId==='number_one_20'?
    '🔢 Links Gewinnsymbol aufrubbeln · rechts Zahl aufrubbeln · jede 1 gewinnt · 🪙 '+num((result.coinAmounts||[100,300,800])[0])+' · 💵 '+num((result.coinAmounts||[100,300,800])[1])+' · 💼 '+num((result.coinAmounts||[100,300,800])[2])+' · 🎁 Freischaltung':
    result.board?.variantId==='dog_jackpot_9'?
    '🐾 DOG = alle acht Preise · '+symbolLegend(result.tier,coinAmountsFor(result.tier,'dog_jackpot_9',result))+' · 🎁 Freischaltung':
    result.board?.variantId==='tic_tac_toe'&&result.board?.symbolVersion===8?
    '◯ oder ✕ · 1×–'+(result.board?.maxMultiplier??5)+'× · Gewinnsymbol unten · 8 mögliche Linien · EIN Symbolgewinn × Multiplikator · '+symbolLegend(result.tier,coinAmountsFor(result.tier,'tic_tac_toe',result)):
    result.board?.variantId==='tic_tac_toe'?
    '🪙 200 · 💵 450 · 💼 800 · 🎁 Premium · 8 mögliche Gewinnlinien':
    symbolLegend(result.tier,coinAmountsFor(result.tier,result.board?.variantId,result))}
  board.replaceChildren();board.removeAttribute('style');
  if(stage.dataset.variant==='number_one_20'){
   // The old left:24.7% / width:50.8% board made the scratch coating
   // land on only the first 18 rows. Force the layer to the ENTIRE
   // native ticket surface before calculating canvas paint coordinates.
   for(const [key,value] of Object.entries({
    position:'absolute',left:'0',top:'0',width:'100%',height:'100%',
    display:'block',margin:'0',padding:'0',
    'max-width':'none','max-height':'none',
    'grid-template-columns':'none','grid-template-rows':'none',
    'column-gap':'0','row-gap':'0',gap:'0'
   }))board.style.setProperty(key,value,'important');
  }
  if(conf&&Array.isArray(cells)&&cells.length===conf[2]*conf[3]){
   board.style.setProperty('--scratch-cols',conf[3]);
   if(stage.dataset.duelVersion==='8'){
    // Force full-art coordinates, independent of the older 3×3 CSS grid.
    for(const [name,value] of Object.entries({
     position:'absolute',inset:'0',left:'0',top:'0',
     width:'100%',height:'100%',display:'block',
     'max-width':'none','max-height':'none',
     margin:'0',padding:'0',gap:'0',
     'grid-template-columns':'none','grid-template-rows':'none'
    }))board.style.setProperty(name,value,'important');
    // Sign and prize are covered separately. Existing server winnings remain intact.
    const prizeZone=el('div','scratch-duel-prize-zone');
    prizeZone.setAttribute('aria-hidden','true');
    prizeZone.append(el('strong','scratch-duel-prize-heading','③ DEIN GEWINNSYMBOL'));
    const boardHeading=el('div','scratch-duel-board-heading','④ DAS SPIELFELD');
    boardHeading.setAttribute('aria-hidden','true');
    const rules=el('div','scratch-duel-rules-panel');
    rules.setAttribute('aria-hidden','true');
    rules.append(el('strong','scratch-duel-rules-heading','SO SPIELST DU!'));
    for(const [number,title,note] of [
     ['01','FAKTOR','1× BIS 5×'],['02','ZEICHEN','◯ ODER ✕'],
     ['03','GEWINNSYMBOL','UNTEN FREIRUBBELN'],
     ['04','SPIELFELD','9 FELDER'],['05','GEWINN','3 IN EINER LINIE']
    ]){
     const step=el('div','scratch-duel-rule-step');
     step.append(el('b','scratch-duel-rule-number',number));
     const detail=el('span','scratch-duel-rule-detail');
     detail.append(el('b','',title),el('small','',note));
     step.append(detail);rules.append(step);
    }
    const winningTile=makeDuelTile(result.board.winningSymbol,1);
    const prizeTile=makeDuelTile(result.board.prizeSymbol||'?',2);
    prizeTile.title='Dieses Symbol gewinnst du bei einer passenden Dreierlinie';
    if(result.doubleWin){
     prizeTile.classList.add('scratch-has-double-award');
     const doubleIcon=el('span','scratch-duel-double-badge','✖️2');
     doubleIcon.setAttribute('title','Dieser Gewinn wird zusätzlich verdoppelt');
     doubleIcon.setAttribute('aria-label','Zusätzlicher Gewinn mal zwei');
     prizeTile.append(doubleIcon);
    }
    board.append(prizeZone,boardHeading,rules,makeDuelTile(String(result.board.multiplier)+'×',0),winningTile,prizeTile);
   }
   const giftsStickerIndex=giftsDoubledSymbolIndex(result);
   for(const [index,symbol] of cells.entries()){
    const field=makeField(symbol,index);
    if(stage.dataset.variant==='gifts'&&giftsStickerIndex===index){
     // The small ×2 seal sits on the icon, under the normal silver coating.
     // Its original money symbol is unchanged for the 3-of-a-kind rule.
     const face=field.querySelector('.scratch-cell-symbol');
     if(face){
      face.classList.add('scratch-symbol-with-double');
      const sticker=el('span','scratch-symbol-double-sticker','×2');
      sticker.setAttribute('aria-hidden','true');
      sticker.title='Dieser echte Gewinn wird verdoppelt';
      face.append(sticker);
      field.classList.add('scratch-has-double-award');
      field.setAttribute('aria-label',symbol+' · Geldgewinn mal zwei');
     }
    }
    if(Number.isSafeInteger(result.lightBadgeIndex)&&index===result.lightBadgeIndex&&
       Number.isSafeInteger(result.totalLights)&&result.totalLights>0){
     field.classList.add('scratch-has-light-award');
     const light=el('span','scratch-light-field-star','⭐');
     light.setAttribute('title','Zusätzlicher Weihnachtslichter-Gewinn für Lichtertal');
     light.setAttribute('aria-label','Weihnachtslichter-Sternenfeld');
     field.append(light);
     const lightValue=el('small','scratch-light-field-value','+'+num(result.totalLights));
     lightValue.setAttribute('aria-label',num(result.totalLights)+' gewonnene Weihnachtslichter');
     field.append(lightValue);
    }
    if(stage.dataset.variant!=='gifts'&&stage.dataset.duelVersion!=='8'&&
       Number.isSafeInteger(result.doubleBadgeIndex)&&
       index===result.doubleBadgeIndex&&result.doubleWin){
     field.classList.add('scratch-has-double-award');
     const double=el('span','scratch-double-field-badge','✖️2');
     double.setAttribute('title','Gewinn verdoppelt: Münzen und Weihnachtslichter');
     double.setAttribute('aria-label','Gewinn mal zwei');
     field.append(double);
    }
    board.append(field);
   }
   try{
    if(stage.dataset.duelVersion==='8')attachDuelCovers();
    else attachUnifiedCover();
   }
   catch(error){
    console.error('[DOG scratch] Rubbelfläche konnte nicht aufgebaut werden:',error);
    $('scratch-progress').textContent='Die Rubbeltextur ist nicht verfügbar. Du kannst das bereits gebuchte Los über „Ergebnis jetzt aufdecken“ abschließen.';
    // Never strand a paid ticket because canvas dimensions are temporarily 0.
    // The explicit reveal button remains available and no payout is changed.
   }
  }else{
   // Never construct an invented matching combination for a legacy receipt.
   board.textContent='Älteres Rubbellos ohne gespeichertes Symbolfeld';
   $('scratch-progress').textContent='Älteres Los – keine Rubbeltextur gespeichert';
  }
  drawPrizeTable(result);
  drawShop();
  // The fixed ticket fills the viewport. Never scroll the underlying page
  // when it opens; on resize its artwork remains within the window.
  // An asynchronous ticket reload may finish AFTER the player has switched
  // to Grinch or another tab. Never lock the entire page from a hidden panel.
  document.body.classList.toggle('scratch-ticket-open',!$('panel-scratch')?.hidden);
  if(result.commandId&&result.commandId===revealedReceipt())finish();
 }
 function showWinningElfPaths(wins){
  if(stage.dataset.variant!=='elf')return;
  const fields=Array.from(board.querySelectorAll('.scratch-field'));
  const rect=board.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const namespace='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(namespace,'svg');
  svg.classList.add('scratch-path-highlight');
  svg.setAttribute('viewBox','0 0 1000 800');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  for(const win of wins){
   if(!['path','gift-three-connected'].includes(win.rule)||!Array.isArray(win.indices)||win.indices.length<3)continue;
   const points=win.indices.map(index=>{
    const cell=fields[index];
    if(!cell)return null;
    const r=cell.getBoundingClientRect();
    return [Math.round((r.left+r.width/2-rect.left)*1000/rect.width),
            Math.round((r.top+r.height/2-rect.top)*800/rect.height)].join(',');
   });
   if(points.includes(null))continue;
   const line=document.createElementNS(namespace,'polyline');
   line.setAttribute('points',points.join(' '));
   svg.append(line);
  }
  if(svg.childElementCount)board.append(svg);
 }
 function finish(){
  if(!ticket||finished)return;
  const current=ticket;
  const wins=Array.isArray(current.board?.wins)?current.board.wins:[];
  const entries=(Array.isArray(current.winnings)?current.winnings:
   current.type==='none'?[]:[current.type==='coins'?
    {type:'coins',amount:current.amount}:{type:'unlock',prize:current.prize}])
   .filter(prize=>prize&&['coins','unlock','lights'].includes(prize.type));
  const earnedCoins=Number.isSafeInteger(current.totalCoins)&&current.totalCoins>=0?
   current.totalCoins:entries.filter(p=>p.type==='coins').reduce(
    (sum,p)=>sum+(Number.isSafeInteger(p.amount)?p.amount:0),0);
  const winFlag=entries.length>0||Number(current.giftSparksEarned)>0||Number(current.totalLights)>0;
  // Finalize the user interaction FIRST. Any broken decorative reveal must
  // never prevent confirming a prize or a zero-coin losing ticket.
  finished=true;
  stage.dataset.result=winFlag?'win':'none';
  stage.classList.add('is-revealed');
  rememberReveal(current.commandId);
  const confirm=$('scratch-ticket-finish');
  confirm.hidden=false;
  confirm.textContent='✓ Ergebnis bestätigen';
  $('scratch-reveal-button').hidden=true;
  if(unifiedCover)unifiedCover.hidden=true;
  for(const cover of board.querySelectorAll('.scratch-duel-cover'))cover.hidden=true;
  $('scratch-progress').textContent='100 % aufgedeckt ✓';
  const meter=$('scratch-progress-meter');
  if(meter){meter.value=100;meter.setAttribute('aria-valuenow','100')}
  $('scratch-result-value').textContent=winFlag?
   entries.length?entries.map(prizeLabel).join(' · '):
    Number(current.totalLights)>0?'⭐ '+num(current.totalLights)+' Weihnachtslichter':
    '🎁 1 Geschenkfunke':'❄️ Niete · 0 Münzen';
  $('scratch-result-kind').textContent=
   (winFlag?(entries.length?entries.length+' Gewinne insgesamt':
    Number(current.totalLights)>0?'Weihnachtslichter gewonnen':'1 Geschenkfunke'):'0 Münzen')+
   (current.doubleWin?' · ✖️2 Bonus':
    current.rareMainMultiplier?' · 💎 Ultra-selten: Hauptgewinn ×2':
    current.multiplier===2?' · ✨ ×2-Multiplikator':'');
  // Render the authoritative result separately from board highlighting.
  // Fallback also works when a legacy receipt has an unusual win structure.
  try{
   drawPrizeTable(current,entries);
  }catch(err){
   console.error('[DOG scratch] Ergebnisanzeige:',err);
   let panel=stage.querySelector('.scratch-prize-sidebar');
   if(!panel){panel=el('aside','scratch-prize-sidebar');stage.append(panel)}
   panel.replaceChildren();
   const summary=el('section','scratch-current-awards');
   summary.append(el('small','scratch-result-kicker','✦ DEIN RUBBELLOS'),
    el('h4','scratch-current-title',winFlag?'🎉 Dein Gewinn':'❄️ Dieses Los ist eine Niete'));
   const hero=el('div','scratch-current-hero'+(winFlag?' is-win':' is-empty'));
   hero.append(el('small','','Gutgeschriebene Münzen'),
    el('strong','',num(earnedCoins)+' 🪙'),
    el('span','',winFlag?(entries.length?entries.map(prizeLabel).join(' · '):'🎁 1 Geschenkfunke'):'Kein Gewinn · 0 Münzen'));
   summary.append(hero);panel.append(summary);
  }
  renderInlineResults(current);
  // Optional gold highlights, paths and row descriptions cannot block the
  // confirmation or accidentally book any extra rewards.
  try{
   for(const cell of board.querySelectorAll('.scratch-field'))cell.classList.add('uncovered');
   const visibleCells=board.querySelectorAll('.scratch-field');
   const goldIndices=stage.dataset.variant==='premium_27'?
    premiumWinningRowIndices(wins):
    [...new Set(wins.flatMap(win=>Array.isArray(win?.indices)?win.indices:[]))];
   const duelOffset=stage.dataset.duelVersion==='8'?3:0;
   for(const i of goldIndices)visibleCells[i+duelOffset]?.classList.add('scratch-winning-cell');
   if(stage.dataset.variant==='dog_jackpot_9'&&wins.length){
    const dogIndex=current.board.cells.indexOf('DOG');
    if(dogIndex>=0)visibleCells[dogIndex]?.classList.add('scratch-winning-cell','scratch-dog-winner');
   }
   showWinningElfPaths(wins);
   reveal.classList.add('revealed');
   if(stage.dataset.variant==='premium_27'&&Array.isArray(current.board?.cells))
    updatePremiumCounter(current.board.cells.map((_,i)=>i));
   const list=winningLines;
   list.replaceChildren();
   if(current.board?.variantId==='tic_tac_toe'&&current.board?.symbolVersion===8){
    list.append(el('div','scratch-prize-line',wins.length?
     '✓ '+wins.length+' gültige '+current.board.winningSymbol+'-Gewinnlinien · einmaliger Preis: '+
      (entries[0]?prizeLabel(entries[0]):'0 Münzen'):
     'Keine passende '+current.board.winningSymbol+'-Dreierlinie · 0 Münzen'));
   }else for(const [i,win] of wins.entries()){
    const description=win.rule==='number-one'?'Zahl 1 · Reihe '+(Math.floor(win.indices[0]/2)+1):
     win.rule==='dog-all'?'DOG-Jackpot · Feld '+(win.indices[0]+1):
     win.rule==='tic-duel-line'?'Duell · '+current.board.winningSymbol+' · '+current.board.multiplier+'×':
     win.rule==='tic-line'?'Tic-Tac-Toe-Dreierreihe':
     win.rule==='gold-20'?'20 Symbolfelder':win.rule==='premium-24'?
     ([3,4,5].includes(current.board?.symbolVersion)?'24 Symbolfelder + 3 gleiche Geschenkzeichen':'24 Symbolfelder'):
     win.rule==='row-3'?'Dreierreihe':win.rule==='gift-three-connected'?
     '3 verbundene Geschenkzeichen':'Gewinn '+(i+1);
    const line=el('div','scratch-prize-line',description+': '+prizeLabel(win.prize));
    if(win.prize?.x2)line.append(el('small','',' · '+num(win.prize.baseAmount)+' × 2'));
    list.append(line);
   }
   for(const prize of entries.filter(p=>p.bonus===true)){
    const source=Number.isInteger(prize.sourceWin)?wins[prize.sourceWin]:null;
    if(!source)continue;
    list.append(el('div','scratch-prize-line scratch-prize-bonus',
     '🎉 Zusatzgewinn zur Gewinnkombination '+(prize.sourceWin+1)+': '+prizeLabel(prize)));
   }
   list.hidden=!winFlag;
  }catch(err){console.error('[DOG scratch] Hervorhebung:',err)}
  // Keep obsolete overlaid labels out of view. The sidebar above is the
  // single source of displayed winnings, for both zero and positive receipts.
  results.hidden=true;
  notice(winFlag?'🎉 Gewinne und Geschenkfunken sind bereits sicher auf deinem Profil gutgeschrieben.':
   '❄️ Niete – auf dieser Karte gibt es keine gültige Gewinnkombination.');
 }
 async function load(){
  const id=++requestId;
  if(!account()){status=null;giftsEdition=null;snowEdition=null;ticEdition=null;ticket=null;canManageScratch=false;stage.hidden=true;document.body.classList.remove('scratch-ticket-open');hostDialog?.close();giftsDialog?.close();snowDialog?.close();ticDialog?.close();drawShop();notice('🔐 Bitte mit dem DOG-Onlineprofil anmelden.');return}
  try{
   const r=await query('');
   if(id!==requestId)return;
   status={...r.scratch,discountPercent:r.discountPercent??0};
   giftsEdition=r.giftsEdition??null;
  snowEdition=r.snowEdition??null;
  ticEdition=r.ticEdition??null;
   canManageScratch=r.canManageScratch===true;
   clearAlert();
   // Four distinct starter vouchers, credited once to the signed-in player.
   if(status&&!status.levelOneStarterClaimed){
    try{
     const profile=account(),token=await profile.getIdToken();
     const reply=await fetch(base+'/api/hub/dog/level/rewards/claim',{
      method:'POST',cache:'no-store',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({level:1})
     });
     const starter=await reply.json().catch(()=>({}));
     if(reply.ok&&starter.ok===true&&starter.scratch&&id===requestId&&account()?.uid===profile.uid)
      status={...status,...starter.scratch};
    }catch(error){console.warn('[DOG] Startergutscheine nicht abgerufen:',error)}
   }
   if(id!==requestId)return;
   if(!ticket&&status?.lastResult?.board&&status.lastResult.commandId!==acknowledged()){
    try{showTicket(status.lastResult)}
    catch(error){
     ticket=status.lastResult;
     showAlert('⚠️ Letztes Los wurde gespeichert, aber die Anzeige ist fehlgeschlagen: '+error.message);
    }
   }
   drawShop();
   notice(ticket?'❄️ Dein letztes Los wurde wiederhergestellt.':
    '🎄 Wische ohne Absetzen über das gesamte Spielfeld. Bei 90 % wird automatisch aufgedeckt.');
  }catch(e){if(id!==requestId)return;status=null;canManageScratch=false;showAlert(scratchBuyError(e?.message));drawShop()}
 }
 async function buy(tier,free,variantId,voucher=false){
  if(!account()){showAlert('🔐 Bitte melde dich zuerst mit deinem DOG-Onlineprofil an.',variantId);drawShop();return;}
  if(busy){alertMessage.textContent='⏳ Ein Los wird bereits auf Render geöffnet.';alertToast.hidden=false;return;}
  if(!status){showAlert('🔄 Dein Rubbellos-Konto ist noch nicht geladen. Bitte „Kontostand aktualisieren“ auswählen.',variantId);drawShop();return;}
  if(ticket){
   try{showTicket(ticket)}catch(e){showAlert('⚠️ Dein offenes Los konnte nicht angezeigt werden: '+e.message,variantId)}
   return;
  }
  if(!SCRATCH_SHOP_VARIANTS.some(c=>c.id===variantId&&c.tier===tier)){
   showAlert('⚠️ Diese Losvariante ist noch nicht im Spiel freigeschaltet.',variantId);drawShop();return;
  }
  if(variantId==='tic_tac_toe'&&ticEdition?.remaining===0){
   showAlert(scratchBuyError('SCRATCH_TIC_EDITION_SOLD_OUT'),variantId);drawShop();return;
  }
  if(variantId==='snow_collect'&&snowEdition?.remaining===0){
   showAlert(scratchBuyError('SCRATCH_SNOW_EDITION_SOLD_OUT'),variantId);drawShop();return;
  }
  if(variantId==='gifts'&&giftsEdition?.remaining===0){
   showAlert(scratchBuyError('SCRATCH_GIFTS_EDITION_SOLD_OUT'),variantId);drawShop();return;
  }
  const chosenPrice=variantId==='number_one_20'?
   Number(status.settings?.numberOne20?.price??500):
   variantId==='gifts'?Number(giftsEdition?.config?.price??status.settings?.variants?.gifts?.price??200):
   variantId==='snow_collect'?Number(snowEdition?.config?.price??status.settings?.variants?.snow_collect?.price??200):
   variantId==='tic_tac_toe'?Number(ticEdition?.config?.price??500):
   Number(SCRATCH_TICKET_TYPES.find(c=>c.id===tier)?.price||0);
  if(!free&&!voucher&&status.coins<discountedPrice(chosenPrice)){
   showAlert('⚠️ Nicht genügend Münzen für dieses Los.',variantId);drawShop();return;
  }
  clearAlert();busy=true;drawShop();
  alertMessage.textContent='⏳ Das Los wird auf Render erstellt. Die Abbuchung erfolgt nur einmal.';
  alertToast.hidden=false;
  pending=pending?.tier===tier&&pending.free===free&&pending.variantId===variantId&&
   pending.voucher===voucher?pending:
   {tier,variantId,free,voucher,commandId:'scratch-'+crypto.randomUUID()};
  notice('🎟️ Los wird auf Render gebucht und das Symbolfeld erstellt …');
  try{
   const r=await query('/buy',pending);
   if(!r.result||!r.scratch)throw Error('INVALID_SCRATCH_RESULT');
   status=r.scratch;
   if(Object.hasOwn(r,'giftsEdition'))giftsEdition=r.giftsEdition;
   if(Object.hasOwn(r,'snowEdition'))snowEdition=r.snowEdition;
   if(Object.hasOwn(r,'ticEdition'))ticEdition=r.ticEdition;
   pending=null;
   // Server has already committed the ticket; keep its receipt even if the
   // local animation fails, so it is always reopenable without a second buy.
   ticket=r.result;
   showTicket(r.result);
   clearAlert();
   notice(r.result.board?.variantId==='tic_tac_toe'&&r.result.board?.symbolVersion===8?
    '🎯 Zuerst Multiplikator, dann ◯/✕, danach das Gewinnsymbol unten und zum Schluss die neun Spielfelder freirubbeln.':
    '❄️ Beginne irgendwo und rubbele in einer Bewegung über alle Felder. Bei 90 % öffnet das Los automatisch.');
  }catch(e){
   console.error('[DOG scratch] Öffnen fehlgeschlagen:',e);
   showAlert(scratchBuyError(e?.message),variantId);
  }finally{busy=false;drawShop()}
 }
 $('scratch-lotto-back').addEventListener('click',()=>{
  // The paid ticket receipt remains in memory and Render. Going back cannot
  // trigger another purchase, and the matching card offers Reopen.
  if(!ticket)return;
  stage.hidden=true;document.body.classList.remove('scratch-ticket-open');
  drawShop();notice('🎟️ Dein Glückszahl-Los bleibt gespeichert. Du kannst es über „Vorheriges Los anzeigen“ wieder öffnen.');
 });
 $('scratch-reveal-button').addEventListener('click',finish);
 $('scratch-ticket-finish').addEventListener('click',()=>{
  if(!ticket||!finished)return;
  const won=stage.dataset.result==='win';
  acknowledge(ticket.commandId);
  ticket=null;finished=false;stage.hidden=true;
  stage.classList.remove('is-revealed');stage.removeAttribute('data-result');
  document.body.classList.remove('scratch-ticket-open');
  drawShop();notice(won?'✅ Gewinn bestätigt. Dein Preis ist gutgeschrieben – das nächste Los kann geöffnet werden.':
   '✅ Ergebnis bestätigt: Niete · 0 Münzen. Du kannst das nächste Los öffnen.');
 });
 $('scratch-refresh').addEventListener('click',()=>void load());
 $('scratch-gifts-settings-open').addEventListener('click',openGiftsSettings);
 $('scratch-gifts-settings-close').addEventListener('click',()=>giftsDialog.close());
 $('scratch-gifts-settings-cancel').addEventListener('click',()=>giftsDialog.close());
 giftsDialog?.addEventListener('click',e=>{if(e.target===giftsDialog)giftsDialog.close()});
 for(const id of ['gs-none','gs-unlock'])
  $(id).addEventListener('input',updateGiftsMoneyPreview);
 $('scratch-gifts-settings-form').addEventListener('invalid',e=>{
  const field=e.target;
  $('scratch-gifts-settings-feedback').textContent='⚠️ Bitte „'+
   (field.closest('label')?.querySelector('span')?.textContent||'Eingabe')+'“ prüfen.';
 },true);
 $('scratch-gifts-settings-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const feedback=$('scratch-gifts-settings-feedback'),save=$('scratch-gifts-settings-save');
  if(save.disabled)return;
  if(!account()){feedback.textContent='⚠️ Bitte zuerst mit deinem DOG-Profil anmelden.';return}
  try{
   const gifts=readGiftsSettings();
   save.disabled=true;feedback.textContent='💾 Geschenkelinie-Einstellungen werden gespeichert …';
   const response=await query('/settings/gifts',{gifts});
   if(!response.settings?.variants?.gifts)throw Error('Der Server hat die Einstellungen nicht bestätigt.');
   if(!status)status={};
   status.settings=response.settings;
   giftsDialog.close();drawShop();
   notice('✅ Geschenkelinie gespeichert. Alle neuen Geschenkelinie-Lose verwenden diese Werte. Bereits geöffnete Lose bleiben unverändert.');
  }catch(error){feedback.textContent='⚠️ '+(error.message||'Speichern fehlgeschlagen');}
  finally{save.disabled=false}
 });
 // Edit only the newest ACTIVE edition. The server checks the edition ID,
 // revision and creator inside the same transaction. Already issued tickets
 // and archived editions stay completely immutable.
 async function editLatestEdition(variant){
  const gifts=variant==='gifts',key=gifts?'gs':'sn';
  const current=gifts?giftsEdition:snowEdition;
  const feedback=$(key+'-edition-feedback'),button=$(key+'-edition-edit');
  if(!current||current.remaining<=0){feedback.textContent='🏁 Keine aktuelle Auflage mit Restlosen vorhanden.';return}
  if(!account()){feedback.textContent='🔐 Bitte mit dem DOG-Onlineprofil anmelden.';return}
  try{
   const config=gifts?readGiftsSettings():readSnowSettings();
   const raw=$(key+'-edition-budget').value.trim(),maxTotalCoins=Number(raw);
   if(!raw||!Number.isSafeInteger(maxTotalCoins)||maxTotalCoins<0||maxTotalCoins>1000000000000)
    throw Error('Bitte eine ganze Münzsumme von 0 bis 1.000.000.000.000 eingeben.');
   if(maxTotalCoins<current.paidCoins)
    throw Error('Das neue Gesamtbudget muss mindestens '+num(current.paidCoins)+' 🪙 sein (bereits gewonnen).');
   const prompt='Aktuelle '+(gifts?'Geschenkelinie':'Schneeflocken-Bingo')+'-Auflage bearbeiten?\n'+
    current.issued+' Lose sind schon vergeben und bleiben unverändert.\n'+
    current.remaining+' Restlose bekommen zusammen '+num(maxTotalCoins-current.paidCoins)+
    ' 🪙 in einem neuen verbindlichen Gewinnplan.\nNeues Gesamtbudget: '+num(maxTotalCoins)+' 🪙.';
   if(!window.confirm(prompt))return;
   button.disabled=true;
   feedback.textContent='🔄 Render verteilt das Restbudget auf die unverkauften Lose …';
   const response=await query('/editions/'+variant+'/edit',{
    editionId:current.id,expectedRevision:current.revision??0,maxTotalCoins,
    [gifts?'gifts':'snow']:config});
   const updated=gifts?response.giftsEdition:response.snowEdition;
   if(!updated||updated.id!==current.id||!response.settings)
    throw Error('Der Server hat die Änderung nicht bestätigt.');
   if(gifts)giftsEdition=updated;else snowEdition=updated;
   if(!status)status={};
   status.settings=response.settings;
   feedback.textContent='✅ Auflage aktualisiert. '+num(updated.remainingCoins)+
    ' 🪙 sind auf '+updated.remaining+' Restlose verteilt. Alte Lose und Gewinne bleiben gleich.';
   if(gifts)updateGiftsEditionPreview();else updateSnowEditionPreview();
   drawShop();
  }catch(error){
   feedback.textContent='⚠️ '+scratchBuyError(error?.message||'Serverfehler');
  }finally{button.disabled=false}
 }
 // 500-ticket publisher. One click writes the form values AND the immutable
 // run budget in one Firestore transaction. It never draws 500 tickets at once.
 for(const id of ['gs-price','gs-edition-budget','gs-coin-0','gs-coin-1','gs-coin-2','gs-max-prizes','gs-double','gs-none','gs-unlock'])
  $(id).addEventListener('input',updateGiftsEditionPreview);
 $('gs-edition-edit').addEventListener('click',()=>void editLatestEdition('gifts'));
 $('gs-edition-create').addEventListener('click',async()=>{
  const feedback=$('gs-edition-feedback'),button=$('gs-edition-create');
  if(button.disabled)return;
  if(!account()){feedback.textContent='🔐 Bitte zuerst mit deinem DOG-Profil anmelden.';return;}
  try{
   const gifts=readGiftsSettings(),raw=$('gs-edition-budget').value.trim();
   const maxTotalCoins=Number(raw);
   if(!raw||!Number.isSafeInteger(maxTotalCoins)||maxTotalCoins<0||maxTotalCoins>1000000000000)
    throw Error('Bitte ein Gesamtbudget von 0 bis 1.000.000.000.000 Münzen eingeben.');
   if(giftsEdition?.remaining>0)
    throw Error('Es läuft bereits eine 500er-Auflage mit '+giftsEdition.remaining+' Restlosen.');
   const yes=window.confirm('Eine Auflage mit 500 Geschenkelinie-Losen erstellen?\\n'+
    'Genau '+num(maxTotalCoins)+' 🪙 Auszahlungen insgesamt.\\n'+
    'Noch nicht vergebene Lose kannst du später bearbeiten. Bereits gekaufte Lose bleiben unverändert.');
   if(!yes)return;
   button.disabled=true;
   feedback.textContent='📦 Veröffentliche die 500er-Auflage sicher auf Render …';
   const response=await query('/editions/gifts',{gifts,maxTotalCoins});
   if(!response.giftsEdition||!response.settings?.variants?.gifts)
    throw Error('Der Server hat die Auflage nicht bestätigt.');
   giftsEdition=response.giftsEdition;
   status.settings=response.settings;
   feedback.textContent='✅ Auflage erstellt: 500 Lose, genau '+num(maxTotalCoins)+
    ' 🪙 Geldgewinne für alle Spieler zusammen.';
   updateGiftsEditionPreview();drawShop();
  }catch(e){feedback.textContent='⚠️ '+scratchBuyError(e?.message||'Serverfehler');}
  finally{updateGiftsEditionPreview()}
 });
 $('scratch-snow-settings-open').addEventListener('click',openSnowSettings);
 $('scratch-snow-settings-close').addEventListener('click',()=>snowDialog.close());
 $('scratch-snow-settings-cancel').addEventListener('click',()=>snowDialog.close());
 snowDialog?.addEventListener('click',e=>{if(e.target===snowDialog)snowDialog.close()});
 for(const id of ['sn-none','sn-unlock'])
  $(id).addEventListener('input',updateSnowMoneyPreview);
 $('scratch-snow-settings-form').addEventListener('invalid',e=>{
  const field=e.target;
  $('scratch-snow-settings-feedback').textContent='⚠️ Bitte „'+
   (field.closest('label')?.querySelector('span')?.textContent||'Eingabe')+'“ prüfen.';
 },true);
 $('scratch-snow-settings-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const feedback=$('scratch-snow-settings-feedback'),save=$('scratch-snow-settings-save');
  if(save.disabled)return;
  if(!account()){feedback.textContent='⚠️ Bitte zuerst mit deinem DOG-Profil anmelden.';return}
  try{
   const snow=readSnowSettings();
   save.disabled=true;feedback.textContent='💾 Schneeflocken-Bingo-Einstellungen werden gespeichert …';
   const response=await query('/settings/snow_collect',{snow});
   if(!response.settings?.variants?.snow_collect)throw Error('Der Server hat die Einstellungen nicht bestätigt.');
   if(!status)status={};
   status.settings=response.settings;
   snowDialog.close();drawShop();
   notice('✅ Schneeflocken-Bingo gespeichert. Alle neuen Schneeflocken-Bingo-Lose verwenden diese Werte. Bereits geöffnete Lose bleiben unverändert.');
  }catch(error){feedback.textContent='⚠️ '+(error.message||'Speichern fehlgeschlagen');}
  finally{save.disabled=false}
 });
 // 500-ticket publisher. One click writes the form values AND the immutable
 // run budget in one Firestore transaction. It never draws 500 tickets at once.
 for(const id of ['sn-price','sn-edition-budget','sn-coin-0','sn-coin-1','sn-coin-2','sn-max-prizes','sn-double','sn-none','sn-unlock'])
  $(id).addEventListener('input',updateSnowEditionPreview);
 $('sn-edition-edit').addEventListener('click',()=>void editLatestEdition('snow_collect'));
 $('sn-edition-create').addEventListener('click',async()=>{
  const feedback=$('sn-edition-feedback'),button=$('sn-edition-create');
  if(button.disabled)return;
  if(!account()){feedback.textContent='🔐 Bitte zuerst mit deinem DOG-Profil anmelden.';return;}
  try{
   const snow=readSnowSettings(),raw=$('sn-edition-budget').value.trim();
   const maxTotalCoins=Number(raw);
   if(!raw||!Number.isSafeInteger(maxTotalCoins)||maxTotalCoins<0||maxTotalCoins>1000000000000)
    throw Error('Bitte ein Gesamtbudget von 0 bis 1.000.000.000.000 Münzen eingeben.');
   if(snowEdition?.remaining>0)
    throw Error('Es läuft bereits eine 500er-Auflage mit '+snowEdition.remaining+' Restlosen.');
   const yes=window.confirm('Eine Auflage mit 500 Schneeflocken-Bingo-Losen erstellen?\\n'+
    'Genau '+num(maxTotalCoins)+' 🪙 Auszahlungen insgesamt.\\n'+
    'Noch nicht vergebene Lose kannst du später bearbeiten. Bereits gekaufte Lose bleiben unverändert.');
   if(!yes)return;
   button.disabled=true;
   feedback.textContent='📦 Veröffentliche die 500er-Auflage sicher auf Render …';
   const response=await query('/editions/snow_collect',{snow,maxTotalCoins});
   if(!response.snowEdition||!response.settings?.variants?.snow_collect)
    throw Error('Der Server hat die Auflage nicht bestätigt.');
   snowEdition=response.snowEdition;
   status.settings=response.settings;
   feedback.textContent='✅ Auflage erstellt: 500 Lose, genau '+num(maxTotalCoins)+
    ' 🪙 Geldgewinne für alle Spieler zusammen.';
   updateSnowEditionPreview();drawShop();
  }catch(e){feedback.textContent='⚠️ '+scratchBuyError(e?.message||'Serverfehler');}
  finally{updateSnowEditionPreview()}
 });

 // Tic-Tac-Toe has its own fixed-budget edition, separate from all other
 // ticket types. Never treat percentages as guarantees when a fixed budget
 // mathematically forces a different number of money tickets.
 function readTicEdition(){
  const getInt=(id,min,max)=>{
   const input=$(id),text=input?.value?.trim()??'',value=Number(text);
   if(!text||!Number.isSafeInteger(value)||value<min||value>max)
    throw Error('Bitte „'+(input?.closest('label')?.querySelector('span')?.textContent||id)+'“ prüfen.');
   return value;
  };
  const percentField=id=>{
   const input=$(id),text=input?.value?.trim()??'',value=Number(text);
   if(!text||!Number.isFinite(value)||value<0||value>100||
    Math.abs(value*10-Math.round(value*10))>0.000001)
    throw Error('Bitte bei „'+(input?.closest('label')?.querySelector('span')?.textContent||id)+
     '“ einen Prozentwert in 0,1-%-Schritten eingeben.');
   return Math.round(value*10);
  };
  const coinAmounts=[0,1,2].map(index=>getInt('tic-coin-'+index,1,50000000));
  if(!(coinAmounts[0]<coinAmounts[1]&&coinAmounts[1]<coinAmounts[2]))
   throw Error('Die drei Geldwerte müssen streng steigen: 🪙 kleiner als 💵 kleiner als 💼.');
  const symbolWeights=[0,1,2,3].map(index=>percentField('tic-weight-'+index));
  if(symbolWeights.reduce((sum,n)=>sum+n,0)!==1000)
   throw Error('Die vier Gewinnsymbole müssen zusammen exakt 100 % ergeben.');
  const config={
   price:getInt('tic-price',0,1000000),coinAmounts,symbolWeights,
   targetNonePer1000:percentField('tic-none'),
   maxMultiplier:getInt('tic-max-multiplier',1,5),
   prizeCategory:getInt('tic-prize-category',1,3),giftFallbackCoins:0
  };
  const maxTotalCoins=getInt('tic-edition-budget',0,1000000000000);
  return {tic:config,maxTotalCoins};
 }
 const getPrizeCategoryLabel=id=>({
  1:'🟤 Kategorie 1 · Einfach',2:'🔵 Kategorie 2 · Mittel',
  3:'🟡 Kategorie 3 · Schwer / Premium'
 }[id]||'⚠️ Gewinnkategorie wählen');
 function updateTicEditionPreview(){
  const value=id=>Number($(id)?.value||0);
  const price=value('tic-price'),budget=value('tic-edition-budget');
  const mult=value('tic-max-multiplier');
  const categoryLabel=getPrizeCategoryLabel(value('tic-prize-category'));
  $('tic-prize-category-preview').textContent=categoryLabel;
  const money=Number.isSafeInteger(price)&&price>=0?price*500:NaN;
  $('tic-edition-revenue').textContent=Number.isSafeInteger(money)?num(money)+' 🪙':'– 🪙';
  const weights=[0,1,2,3].map(i=>value('tic-weight-'+i));
  const total=weights.reduce((a,b)=>a+b,0);
  const valid=weights.every(n=>Number.isFinite(n)&&n>=0&&n<=100)&&Math.abs(total-100)<.00001;
  $('tic-weights-total').textContent=total.toLocaleString('de-DE',{maximumFractionDigits:1})+' % / 100 %';
  $('tic-weights-summary').classList.toggle('is-invalid',!valid);
  const active=Boolean(ticEdition&&ticEdition.remaining>0);
  const soldOut=Boolean(ticEdition&&ticEdition.remaining===0);
  const remain=ticEdition?.remaining??500,already=ticEdition?.paidCoins??0;
  const maxPossible=already+remain*value('tic-coin-2')*Math.max(1,mult);
  const hint=$('tic-edition-hint');
  const warnings=[];
  if(!valid)warnings.push('⚠️ Alle vier Symbolgewichte müssen genau 100 % ergeben.');
  if(Number.isSafeInteger(budget)&&budget>maxPossible)
   warnings.push('⚠️ Dieses Budget überschreitet die rechnerische Obergrenze von '+
    num(maxPossible)+' 🪙 bei '+remain+' Restlosen.');
  warnings.push('💡 Der Server plant genau das eingegebene Budget. Nicht exakt darstellbare Summen werden abgelehnt.');
  hint.textContent=warnings.join(' ');
  const statusBox=$('tic-edition-status');
  statusBox.dataset.state=active?'active':soldOut?'sold_out':'none';
  statusBox.textContent=active?
   '🟢 Aktive Auflage: '+num(ticEdition.issued)+'/500 Lose vergeben · '+
    getPrizeCategoryLabel(ticEdition.config?.prizeCategory??2)+' · '+
    num(ticEdition.paidCoins)+' von '+num(ticEdition.maxTotalCoins)+' 🪙 ausgezahlt · '+
    num(ticEdition.remainingCoins)+' 🪙 für '+num(ticEdition.remaining)+' Restlose fest eingeplant. '+
    'Offene Geldlose: '+num(ticEdition.moneyTicketsRemaining??0)+
    ', Geschenke: '+num(ticEdition.giftTicketsRemaining??0)+
    ', Nieten: '+num(ticEdition.losingTicketsRemaining??0)+'.':
   soldOut?'🏁 Die 500 Lose sind ausverkauft. Du kannst eine neue Auflage erstellen.':
   '📦 Noch keine begrenzte Auflage. Aktuelle Tic-Tac-Toe-Lose sind bis zur ersten Veröffentlichung unbegrenzt verfügbar.';
  $('tic-edition-create').disabled=active;
  $('tic-edition-create').title=active?'Zuerst die laufende 500er-Serie abschließen.':'Neue Auflage veröffentlichen';
  $('tic-edition-edit').hidden=!active;
  $('tic-edition-edit').disabled=!active;
 }
 function openTicEdition(){
  if(!ticDialog)return;
  if(!account()){
   showAlert('🔐 Melde dich zuerst mit deinem DOG-Profil an.','tic_tac_toe');return;
  }
  const conf=ticEdition?.config??{
   price:500,coinAmounts:[200,450,800],symbolWeights:[700,250,40,10],
   maxMultiplier:5,targetNonePer1000:200,prizeCategory:2
  };
  const set=(id,val)=>{$(id).value=String(val)};
  set('tic-price',conf.price??500);
  set('tic-max-multiplier',conf.maxMultiplier??5);
  set('tic-prize-category',conf.prizeCategory??2);
  set('tic-none',(conf.targetNonePer1000??200)/10);
  for(let i=0;i<3;i++)set('tic-coin-'+i,conf.coinAmounts?.[i]??[200,450,800][i]);
  for(let i=0;i<4;i++)set('tic-weight-'+i,(conf.symbolWeights?.[i]??[700,250,40,10][i])/10);
  set('tic-edition-budget',ticEdition?.maxTotalCoins??150000);
  $('tic-edition-feedback').textContent='';
  updateTicEditionPreview();
  ticDialog.showModal();
 }
 async function submitTicEdition(edit){
  const current=ticEdition,button=$(edit?'tic-edition-edit':'tic-edition-create');
  const output=$('tic-edition-feedback');
  if(button.disabled||!account())return;
  try{
   const {tic,maxTotalCoins}=readTicEdition();
   if(edit){
    if(!current||current.remaining<=0)throw Error('Es gibt keine aktive Auflage mehr.');
    if(maxTotalCoins<current.paidCoins)
     throw Error('Das Gesamtbudget darf nicht unter den '+num(current.paidCoins)+' bereits gezahlten Münzen liegen.');
   }else if(ticEdition?.remaining>0)
    throw Error('Es läuft bereits eine Tic-Tac-Toe-Auflage.');
   const name=edit?'Restlose bearbeiten':'500er-Auflage verbindlich veröffentlichen';
   const categoryLine='\n🎁 Freischaltungs-Gewinnpool: '+getPrizeCategoryLabel(tic.prizeCategory)+'.';
   const message=edit?
    'Bereits ausgegebene '+current.issued+' Lose bleiben unverändert.\n'+
    current.remaining+' Restlose erhalten zusammen genau '+
    num(maxTotalCoins-current.paidCoins)+' 🪙.\nGesamtbudget: '+num(maxTotalCoins)+' 🪙.'+categoryLine:
    'Der Server reserviert für 500 Tic-Tac-Toe-Lose genau '+num(maxTotalCoins)+
    ' 🪙.\nBeim Kauf wird jedes Los einmalig ausgegeben.'+categoryLine;
   if(!window.confirm(name+'?\n'+message))return;
   button.disabled=true;output.textContent='🔄 Render plant die Gewinnkombinationen und prüft das Budget …';
   const reply=await query(edit?'/editions/tic_tac_toe/edit':'/editions/tic_tac_toe',
    edit?{tic,maxTotalCoins,editionId:current.id,expectedRevision:current.revision}: {tic,maxTotalCoins});
   if(!reply.ticEdition||edit&&reply.ticEdition.id!==current.id)
    throw Error('Der Server hat die Auflage noch nicht bestätigt.');
   ticEdition=reply.ticEdition;
   output.textContent='✅ '+(edit?'Restlose aktualisiert.':'Auflage veröffentlicht.')+
    ' Genau '+num(ticEdition.remainingCoins)+' 🪙 sind für die verbleibenden '+
    num(ticEdition.remaining)+' Lose reserviert.';
   drawShop();updateTicEditionPreview();
  }catch(error){
   output.textContent='⚠️ '+scratchBuyError(error?.message||'SERVER_UNAVAILABLE');
  }finally{button.disabled=false;updateTicEditionPreview()}
 }
 if(ticDialog){
  $('scratch-tic-edition-close').addEventListener('click',()=>ticDialog.close());
  $('scratch-tic-edition-cancel').addEventListener('click',()=>ticDialog.close());
  ticDialog.addEventListener('click',e=>{if(e.target===ticDialog)ticDialog.close()});
  $('scratch-tic-edition-form').addEventListener('submit',e=>e.preventDefault());
  for(const id of ['tic-price','tic-max-multiplier','tic-none','tic-edition-budget',
   'tic-coin-0','tic-coin-1','tic-coin-2','tic-prize-category',
   'tic-weight-0','tic-weight-1','tic-weight-2','tic-weight-3'])
   $(id).addEventListener('input',updateTicEditionPreview);
  $('tic-edition-create').addEventListener('click',()=>void submitTicEdition(false));
  $('tic-edition-edit').addEventListener('click',()=>void submitTicEdition(true));
 }
 $('scratch-host-settings').addEventListener('click',openSettings);
 $('scratch-host-close').addEventListener('click',()=>hostDialog.close());
 $('scratch-host-cancel').addEventListener('click',()=>hostDialog.close());
 hostDialog?.addEventListener('click',e=>{if(e.target===hostDialog)hostDialog.close()});
 // These settings apply globally across all DOG rooms. A missing or invalid
 // room code must not silently suppress saving them.
 // Native number input validation can suppress "submit" entirely. Provide
 // an explicit message instead of making the Save button seem unresponsive.
 $('scratch-host-form').addEventListener('invalid',e=>{
  const field=e.target;
  const name=field.closest('label')?.querySelector('span')?.textContent||'Eingabe';
  const feedback=$('scratch-host-feedback');
  feedback.textContent='⚠️ Bitte „'+name+'“ überprüfen. Das Feld muss einen gültigen Wert enthalten.';
 },true);
 $('scratch-host-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const feedback=$('scratch-host-feedback'),save=$('scratch-host-save');
  if(save.disabled)return;
  if(!account()){feedback.textContent='⚠️ Bitte zuerst mit deinem DOG-Onlineprofil anmelden.';return;}
  try{
   const settings=readSettings();
   save.disabled=true;feedback.textContent='💾 Speichere auf Render …';
   const response=await query('/settings',{settings});
   if(!response.settings)throw Error('Speichern wurde vom Server nicht bestätigt.');
   if(!status)status={};
   status.settings=response.settings;
   hostDialog.close();drawShop();
   notice('✅ Einstellungen gespeichert. Sie gelten für alle Spieler und künftig gekaufte Lose.');
  }catch(error){feedback.textContent='⚠️ '+(error.message||'Speichern fehlgeschlagen');}
  finally{save.disabled=false;}
 });
 window.addEventListener('spielonline-change',()=>{
  // Do not close a scratch card or the 500-ticket settings on harmless
  // profile loading/error events. Only a real Firebase identity switch
  // requires resetting the previous player's view.
  const nextUid=account()?.uid??null;
  if(nextUid===authUid)return;
  authUid=nextUid;
  requestId++;status=null;giftsEdition=null;snowEdition=null;ticEdition=null;ticket=null;canManageScratch=false;
  stage.hidden=true;document.body.classList.remove('scratch-ticket-open');
  hostDialog?.close();giftsDialog?.close();snowDialog?.close();ticDialog?.close();void load();
 });
 drawShop();return {load};
}
