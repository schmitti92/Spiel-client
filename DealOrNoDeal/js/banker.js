function bankerPhrase(h){
 const seed=String(g?.id||'')+':'+String(h.round);
 let hash=2166136261;for(let i=0;i<seed.length;i++){hash=Math.imul(hash^seed.charCodeAt(i),16777619)}
 return bankerPhrases[(hash>>>0)%bankerPhrases.length];
}
function updateBankerCall(){
 const call=$('banker-call');
 if(!g||g.phase!=='decision'||!g.history?.length){call.hidden=true;call.classList.remove('call-entering');call.removeAttribute('data-offer-key');return}
 const h=g.history.at(-1);
 const offerKey=String(g.id)+'-'+String(h.round)+'-'+String(h.offer);
 if(call.dataset.offerKey!==offerKey){setAvatarReaction('thinking',2400);call.dataset.offerKey=offerKey;call.classList.remove('call-entering');void call.offsetWidth;if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)call.classList.add('call-entering')}
 call.hidden=false;
 $('banker-call-quote').textContent='„'+bankerPhrase(h)+'“';
 $('banker-call-amount').textContent=eur(h.offer);
 const remainingCases=26-(g.openedAmounts?.length||0);
 const finalChoice=remainingCases<=3;
 $('final-choice-compare').hidden=!finalChoice;
 if(finalChoice){
  $('final-choice-offer').textContent=eur(h.offer);
  $('final-choice-footnote').textContent=remainingCases===1?'Der letzte Koffer. Nimmst du das sichere Angebot oder riskierst du alles?':remainingCases+' Koffer sind noch im Spiel. Wie viel Risiko gehst du ein?';
 }
 const mine=h.participants.includes(myId())&&!h.decisions.some(d=>d.id===myId());
 const voted=h.decisions.some(d=>d.id===myId());
 $('banker-call-sub').textContent=(26-(g.openedAmounts?.length||0))+' Kofferwerte noch im Spiel · '+(mine?'Entscheide jetzt selbst: Deal oder No Deal?':voted?'Deine Stimme ist gespeichert. Warte auf die anderen Spieler.':'Die Spieler stimmen gleichzeitig ab …');
 const total=h.participants.length;
 const castVotes=h.decisions.length;
 $('banker-vote-progress-fill').style.width=(total?100*castVotes/total:0)+'%';
 $('banker-vote-progress-text').textContent=castVotes+' von '+total+' Stimmen abgegeben · Entscheidungen geheim';
 $('banker-call-actions').hidden=!mine;
 $('banker-call-wait').hidden=!!mine;
 $('banker-call-deal').disabled=busy;
 $('banker-call-no-deal').disabled=busy;
}
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
function cancelFinaleTimers(){for(const t of finaleTimers)clearTimeout(t);finaleTimers=[]}
function finaleLater(fn,delay){finaleTimers.push(setTimeout(fn,delay))}
function finishFinaleCinema(){cancelFinaleTimers();if(finaleSequenceKey)sessionStorage.setItem('finale-watched:'+finaleSequenceKey,'yes');$('finale-cinema').hidden=true;$('finale-sparks').replaceChildren();$('final-show').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
$('finale-skip').addEventListener('click',finishFinaleCinema);
