'use strict';
function bankerPhrase(h){
 const seed=String(g?.id||'')+':'+String(h.round);
 let hash=2166136261;for(let i=0;i<seed.length;i++){hash=Math.imul(hash^seed.charCodeAt(i),16777619)}
 return bankerPhrases[(hash>>>0)%bankerPhrases.length];
}
function bankerSetText(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value}
let bankerEntranceKey='',bankerEntranceUntil=0,bankerEntranceTimer=null;
let bankerBonusRevealKey='',bankerBonusRevealTimer=null,bankerBonusRevealUntil=0;
const bankerBonusHammerTypes={
 single:{name:'Einfacher Hammer',image:'hammer-einfach.webp',icon:'❄️🔨'},
 double:{name:'Doppelhammer',image:'hammer-doppel.webp',icon:'🔨🔨'},
 lucky:{name:'Glückshammer',image:'hammer-glueck.webp',icon:'🌟🔨'}
};
const bankerBonusPackTypes={
 small:{name:'Kleines Weihnachtspaket',icon:'🎁',theme:'small'},
 large:{name:'Großes Weihnachtspaket',icon:'🎁',theme:'large'},
 premium:{name:'Premium-Weihnachtspaket',icon:'🎁',theme:'premium'}
};
function bankerBonusCloseReveal(){
 clearTimeout(bankerBonusRevealTimer);bankerBonusRevealTimer=null;bankerBonusRevealUntil=0;
 const reveal=$('banker-bonus-reveal');if(reveal)reveal.hidden=true;
 const details=document.querySelector('#banker-call .banker-offer-details');if(details)details.classList.remove('bonus-revealing');
}
function bankerBonusShowReveal(h,key){
 const reveal=$('banker-bonus-reveal'),items=$('banker-bonus-reveal-items'),details=document.querySelector('#banker-call .banker-offer-details');
 if(!reveal||!items)return;
 const hammer=bankerBonusHammerTypes[h.bonusHammer],pack=bankerBonusPackTypes[h.bonusPack];
 if(!hammer&&!pack){bankerBonusCloseReveal();return}
 // DOM nodes are built from server-defined enum values, never untrusted HTML.
 items.replaceChildren();
 if(hammer){
  const item=document.createElement('div');item.className='banker-bonus-reveal-item hammer';
  const art=document.createElement('img');art.alt='';art.src='./Weihnachtsevent2/Weihnachtsbilder/'+hammer.image;
  art.onerror=()=>{art.replaceWith(document.createTextNode(hammer.icon))};
  const name=document.createElement('strong');name.textContent=hammer.name;
  const label=document.createElement('small');label.textContent='🔨 HAMMER-ANGEBOT';
  item.append(art,name,label);items.append(item);
 }
 if(pack){
  const item=document.createElement('div');item.className='banker-bonus-reveal-item pack '+pack.theme;
  const art=document.createElement('div');art.className='banker-bonus-pack-art';art.textContent=pack.icon;
  const name=document.createElement('strong');name.textContent=pack.name;
  const label=document.createElement('small');label.textContent='🎄 KARTENPACK-ANGEBOT';
  item.append(art,name,label);items.append(item);
 }
 bankerSetText('banker-bonus-reveal-head',hammer&&pack?'DOPPELTER BONUS!':hammer?'HAMMER-ANGEBOT!':'KARTENPACK-ANGEBOT!');
 reveal.hidden=false;if(details)details.classList.add('bonus-revealing');
 bankerBonusRevealUntil=Date.now()+2900;
 clearTimeout(bankerBonusRevealTimer);
 bankerBonusRevealTimer=setTimeout(()=>{if(bankerBonusRevealKey===key)bankerBonusCloseReveal()},2900);
}

function updateBankerCall(){
 const call=$('banker-call');
 if(!g||g.phase!=='decision'||!g.history?.length){bankerBonusRevealKey='';bankerBonusCloseReveal();bankerEntranceKey='';bankerEntranceUntil=0;clearTimeout(bankerEntranceTimer);call.hidden=true;call.classList.remove('call-entering');call.removeAttribute('data-offer-key');return}
 const h=g.history.at(-1);
 const offerKey=String(g.id)+'-'+String(h.round)+'-'+String(h.offer);
 if(bankerEntranceKey!==offerKey){
  bankerEntranceKey=offerKey;
  // Keep the last revealed briefcase and its amount on screen before the banker arrives.
  bankerEntranceUntil=Date.now()+3000;
  clearTimeout(bankerEntranceTimer);
  bankerEntranceTimer=setTimeout(()=>{if(g?.phase==='decision')updateBankerCall()},3050);
 }
 const waitingForReveal=Date.now()<bankerEntranceUntil;
 if(call.dataset.offerKey!==offerKey){setAvatarReaction('thinking',2400);call.dataset.offerKey=offerKey;call.classList.remove('call-entering')}
 call.hidden=waitingForReveal;
 // One cinematic presentation per offer, after the normal banker entrance.
 if(!waitingForReveal && bankerBonusRevealKey!==offerKey){
  bankerBonusRevealKey=offerKey;
  bankerBonusShowReveal(h,offerKey);
 }

 const quality=$('banker-offer-quality');
 if(quality){
  const removed=new Set((g.openedAmounts||[]).map(entry=>entry.amount));
  const remaining=values.filter(amount=>!removed.has(amount));
  const average=remaining.length?remaining.reduce((sum,amount)=>sum+amount,0)/remaining.length:0;
  const ratio=average>0?h.offer/average*100:0;
  const strength=Math.max(0,Math.min(100,Math.round(ratio/2)));
  const width=strength+'%';
  if($('banker-offer-quality-fill').style.width!==width)$('banker-offer-quality-fill').style.width=width;
  bankerSetText('banker-offer-quality-label',strength+' / 100 · '+(strength<40?'Schwach':strength<60?'Mittel':strength<80?'Gut':'Sehr stark'));
  quality.setAttribute('aria-label','Angebotsstärke '+strength+' von 100; 50 entspricht dem Durchschnitt der verbleibenden Kofferwerte');
  quality.dataset.strength=strength<40?'low':strength<60?'medium':'high';
  quality.hidden=!average;
 }
 bankerSetText('banker-call-quote','„'+bankerPhrase(h)+'“');
 bankerSetText('banker-call-amount',eur(h.offer));
 const bonus=$('banker-christmas-bonus');
 if(bonus){
  bonus.hidden=!h.bonusPack;
  bonus.dataset.pack=h.bonusPack||'';
  if(h.bonusPack)bankerSetText('banker-christmas-bonus-name',({small:'Kleines Weihnachtspaket',large:'Großes Weihnachtspaket',premium:'Premium-Weihnachtspaket'})[h.bonusPack]||'Weihnachtspaket');
 }
 const hammerBonus=$('banker-hammer-bonus');
 if(hammerBonus){
  const hammerTypes=bankerBonusHammerTypes;
  const hammer=hammerTypes[h.bonusHammer];
  hammerBonus.hidden=!hammer;
  if(hammer){
   hammerBonus.dataset.hammer=h.bonusHammer;
   bankerSetText('banker-hammer-bonus-icon',hammer.icon);
   bankerSetText('banker-hammer-bonus-name',hammer.name);
   const art=$('banker-hammer-bonus-art'),fallback=$('banker-hammer-bonus-icon');
   if(art&&fallback){
    const files={single:'hammer-einfach.webp',double:'hammer-doppel.webp',lucky:'hammer-glueck.webp'};
    const src='./Weihnachtsevent2/Weihnachtsbilder/'+files[h.bonusHammer];
    art.onerror=()=>{art.hidden=true;fallback.hidden=false};
    art.onload=()=>{art.hidden=false;fallback.hidden=true};
    if(!art.src.endsWith('/'+files[h.bonusHammer])){art.hidden=true;fallback.hidden=false;art.src=src}
   }
  }else delete hammerBonus.dataset.hammer;
 }

 const remainingCases=(g.caseCount||26)-(g.openedAmounts?.length||0);
 const finalChoice=remainingCases<=3;
 $('final-choice-compare').hidden=!finalChoice;
 if(finalChoice){
  bankerSetText('final-choice-offer',eur(h.offer));
  $('final-choice-footnote').textContent=remainingCases===1?'Der letzte Koffer. Nimmst du das sichere Angebot oder riskierst du alles?':remainingCases+' Koffer sind noch im Spiel. Wie viel Risiko gehst du ein?';
 }
 const mine=h.participants.includes(myId())&&!h.decisions.some(d=>d.id===myId());
 const voted=h.decisions.some(d=>d.id===myId());
 $('banker-call-sub').textContent=((g.caseCount||26)-(g.openedAmounts?.length||0))+' Kofferwerte noch im Spiel · '+(mine?'Entscheide jetzt selbst: Deal oder No Deal?':voted?'Deine Stimme ist gespeichert. Warte auf die anderen Spieler.':'Die Spieler stimmen gleichzeitig ab …');
 const total=h.participants.length;
 const castVotes=h.decisions.length;
 const voteProgress=$('banker-vote-progress');
 const percent=total?Math.min(100,Math.max(0,100*castVotes/total)):0;
 const progressWidth=percent+'%';if($('banker-vote-progress-fill').style.width!==progressWidth)$('banker-vote-progress-fill').style.width=progressWidth;
 voteProgress.dataset.stage=total>0&&castVotes===total?'complete':castVotes>0?'voting':'waiting';
 voteProgress.setAttribute('aria-label',castVotes+' von '+total+' Stimmen abgegeben; die Entscheidungen bleiben geheim');
 $('banker-vote-progress-text').textContent=total>0&&castVotes===total
  ? '✦ Alle Stimmen eingegangen · Gleich folgt die Auflösung!'
  : castVotes+' von '+total+' Stimmen abgegeben · Entscheidungen geheim';
 // A live show caption reacts only to the public number of votes.
 const directorCaption=$('banker-director-caption');
 if(directorCaption){
  directorCaption.textContent=total>0&&castVotes===total
   ? 'ALLE STIMMEN SIND DA · DIE ENTSCHEIDUNG FÄLLT'
   : castVotes>0
    ? 'DIE KANDIDATEN ENTSCHEIDEN · '+castVotes+' / '+total
    : 'DIE LEITUNG IST OFFEN · JETZT ENTSCHEIDEN';
 }

 $('banker-call-actions').hidden=!mine;
 $('banker-call-wait').hidden=!!mine;
 $('banker-call-deal').disabled=busy;
 $('banker-call-no-deal').disabled=busy;
}
// Entrance effects are temporary: the open banker panel must remain completely still.
$('banker-call').addEventListener('animationend',event=>{
 if(event.target.classList.contains('banker-call-card'))$('banker-call').classList.remove('call-entering');
});
$('banker-bonus-reveal-skip')?.addEventListener('click',bankerBonusCloseReveal);
$('banker-call-deal').addEventListener('click',()=>action('decide',{deal:true}));
$('banker-call-no-deal').addEventListener('click',()=>action('decide',{deal:false}));
let lastVoteRevealKey='';let voteRevealTimer=null;let finalDealRevealUntil=0;
function closeVoteReveal(){if(g?.phase==='final'&&Date.now()<finalDealRevealUntil)return;if(voteRevealTimer!==null){clearTimeout(voteRevealTimer);voteRevealTimer=null}if(lastVoteRevealKey)sessionStorage.setItem(lastVoteRevealKey,'seen');$('vote-reveal').hidden=true;finalDealRevealUntil=0;if(g?.phase==='final')startFinaleCinema()}
function revealVotesAfterAll(){
 if(!g||!g.history?.length)return;
 const h=g.history.at(-1);
 if(g.phase==='decision'||!h.participants?.length||h.decisions?.length!==h.participants.length)return;
 const key='deal-vote-reveal:'+g.id+':'+h.round;
 if(lastVoteRevealKey===key||sessionStorage.getItem(key)==='seen')return;
 const accepted=h.decisions.filter(d=>d.deal===true);
 lastVoteRevealKey=key;
 if(!accepted.length){sessionStorage.setItem(key,'seen');$('vote-reveal').hidden=true;return}
 const list=$('vote-reveal-list');list.replaceChildren();
 for(const d of accepted){
  const player=g.players.find(p=>p.id===d.id);
  const item=document.createElement('div');item.className='deal-accepted-person';
  const name=document.createElement('div');name.className='deal-accepted-name';name.textContent=(player?.name||'Ein Spieler')+' hat den Deal angenommen!';
  const amount=document.createElement('strong');amount.className='deal-accepted-amount';amount.textContent=eur(h.offer);
  item.append(name,amount);
  const extras=[];
  if(h.bonusPack)extras.push('🎁 '+({small:'Normales Kartenpaket',large:'Gold-Kartenpaket',premium:'Premium-Kartenpaket'})[h.bonusPack]);
  if(h.bonusHammer)extras.push('🔨 '+({single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'})[h.bonusHammer]);
  if(extras.length){
   const bonus=document.createElement('div');
   bonus.className='deal-accepted-extras';
   bonus.textContent='Zusätzlich gewonnen: '+extras.join(' + ');
   item.append(bonus);
  }
  list.append(item);
 }
 $('vote-reveal').hidden=false;
 if(voteRevealTimer!==null)clearTimeout(voteRevealTimer);
 const isFinalDeal=g.phase==='final';
 finalDealRevealUntil=isFinalDeal?Date.now()+3000:0;
 $('vote-reveal-close').hidden=isFinalDeal;
 voteRevealTimer=setTimeout(()=>{finalDealRevealUntil=0;closeVoteReveal()},isFinalDeal?3000:5500);
}
$('vote-reveal-close').addEventListener('click',closeVoteReveal);

let finaleSequenceKey='',finaleTimers=[];
