'use strict';
function bankerPhrase(h){
 const seed=String(g?.id||'')+':'+String(h.round);
 let hash=2166136261;for(let i=0;i<seed.length;i++){hash=Math.imul(hash^seed.charCodeAt(i),16777619)}
 return bankerPhrases[(hash>>>0)%bankerPhrases.length];
}
function bankerSetText(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value}
function updateBankerCall(){
 const call=$('banker-call');
 if(!g||g.phase!=='decision'||!g.history?.length){call.hidden=true;call.classList.remove('call-entering');call.removeAttribute('data-offer-key');return}
 const h=g.history.at(-1);
 const offerKey=String(g.id)+'-'+String(h.round)+'-'+String(h.offer);
 if(call.dataset.offerKey!==offerKey){setAvatarReaction('thinking',2400);call.dataset.offerKey=offerKey;call.classList.remove('call-entering')}
 call.hidden=false;
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
  if(h.bonusPack)bankerSetText('banker-christmas-bonus-name',({small:'Kleines Weihnachtspaket',large:'Großes Weihnachtspaket',premium:'Premium-Weihnachtspaket'})[h.bonusPack]||'Weihnachtspaket');
 }

 const remainingCases=26-(g.openedAmounts?.length||0);
 const finalChoice=remainingCases<=3;
 $('final-choice-compare').hidden=!finalChoice;
 if(finalChoice){
  bankerSetText('final-choice-offer',eur(h.offer));
  $('final-choice-footnote').textContent=remainingCases===1?'Der letzte Koffer. Nimmst du das sichere Angebot oder riskierst du alles?':remainingCases+' Koffer sind noch im Spiel. Wie viel Risiko gehst du ein?';
 }
 const mine=h.participants.includes(myId())&&!h.decisions.some(d=>d.id===myId());
 const voted=h.decisions.some(d=>d.id===myId());
 $('banker-call-sub').textContent=(26-(g.openedAmounts?.length||0))+' Kofferwerte noch im Spiel · '+(mine?'Entscheide jetzt selbst: Deal oder No Deal?':voted?'Deine Stimme ist gespeichert. Warte auf die anderen Spieler.':'Die Spieler stimmen gleichzeitig ab …');
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
$('banker-call-deal').addEventListener('click',()=>action('decide',{deal:true}));
$('banker-call-no-deal').addEventListener('click',()=>action('decide',{deal:false}));
let lastVoteRevealKey='';let voteRevealTimer=null;
function closeVoteReveal(){if(voteRevealTimer!==null){clearTimeout(voteRevealTimer);voteRevealTimer=null}if(lastVoteRevealKey)sessionStorage.setItem(lastVoteRevealKey,'seen');$('vote-reveal').hidden=true}
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
  item.append(name,amount);list.append(item);
 }
 $('vote-reveal').hidden=false;
 if(voteRevealTimer!==null)clearTimeout(voteRevealTimer);
 voteRevealTimer=setTimeout(closeVoteReveal,5500);
}
$('vote-reveal-close').addEventListener('click',closeVoteReveal);

let finaleSequenceKey='',finaleTimers=[];
