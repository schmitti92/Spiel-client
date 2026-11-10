'use strict';
function makeCase(index,opened,owner,pending){const b=document.createElement('button');b.className='case';b.type='button';b.setAttribute('aria-label',opened?'Koffer '+(index+1)+': '+eur(opened.amount):owner?'Persönlicher Koffer '+(index+1):'Koffer '+(index+1));const shell=document.createElement('span');shell.className='case-shell';const handle=document.createElement('span');handle.className='case-handle';const inside=document.createElement('span');inside.className='case-interior';const amount=document.createElement('span');amount.className='case-amount';amount.textContent=opened?eur(opened.amount):'';inside.append(amount);const lid=document.createElement('span');lid.className='case-lid';const locks=document.createElement('span');locks.className='case-locks';locks.setAttribute('aria-hidden','true');locks.innerHTML='<i></i><i></i>';const number=document.createElement('span');number.className='case-number';number.textContent=owner?'◆':index+1;lid.append(number,locks);const bow=document.createElement('span');bow.className='gift-bow';bow.setAttribute('aria-hidden','true');shell.append(handle,inside,lid,bow);b.append(shell);if(opened)b.classList.add('opened');if(owner)b.classList.add('personal');if(pending){b.classList.add('revealing');b.setAttribute('aria-label','Koffer '+(index+1)+' wird gerade geöffnet')}return b}
const bankerPhrases=["Ich bin heute in Spendierlaune. Genießen Sie diesen seltenen Moment, bevor meine Buchhaltung mich wieder einfängt!","Mein professioneller Rat: Nehmen Sie das Geld. Mein unprofessioneller Rat: Spielen Sie weiter. Ich liebe fremdes Risiko!","Mein Taschenrechner nennt dieses Angebot hervorragend. Zugegeben, ich habe ihn selbst programmiert.","Für dieses Geld müssten manche Menschen lange arbeiten. Sie müssen nur einen Knopf drücken. Und selbst das scheint schwerzufallen!","Ich höre Ihr Herz bis in mein Büro schlagen. Oder ist das nur mein Geld, das Sie gerade ablehnen möchten?","Ich wollte weniger anbieten. Aber meine Sekretärin meinte, ich soll heute wenigstens einmal nett sein.","Sie glauben, in Ihrem Koffer steckt die Million? Ich glaube übrigens auch, dass mein nächster Lottoschein gewinnt.","Ich biete echtes Geld gegen einen unbekannten Koffer. Ein ausgezeichnetes Geschäft. Besonders für mich!","Natürlich können Sie weiterspielen. Ich habe nichts dagegen, wenn Sie mein schönes Angebot gegen 50 Cent eintauschen.","Wissen Sie, ich mag Sie. Würde ich Sie nicht mögen, hätte ich einfach aufgelegt!","Mein Kontostand bittet mich gerade, dieses Gespräch sofort zu beenden. Ich ignoriere ihn nur für Sie!","Bei diesem Angebot würde sogar mein Goldfisch Deal rufen. Und der hat sonst wirklich nichts zu sagen.","Ich habe die Zahlen dreimal geprüft. Zweimal mit dem Taschenrechner, einmal mit meinem überragenden Bauchgefühl.","Manche nennen mich geizig. Ich nenne es eine ausgeprägte Liebe zu meinem eigenen Geld.","Ich sehe schon, Sie wollen die Spannung. Meine Finanzabteilung bevorzugt übrigens Langeweile und niedrige Auszahlungen.","Das ist kein gewöhnliches Angebot. Das ist ein kleines Wunder mit zwei Nachkommastellen!","Sie können auf den großen Gewinn hoffen. Ich kann auf Ihren nächsten Fehler hoffen. Jeder braucht ein Hobby.","Meine Berater sagen: Seien Sie vernünftig. Ich sage: Machen Sie es spannend. Aber bitte auf Ihre Kosten!","Wenn Sie Nein sagen, tue ich ganz tapfer. Innerlich jubelt allerdings mein Sparschwein.","Ich habe Ihnen ein Angebot gemacht, das selbst mein Steuerberater für großzügig hält. Er musste sich danach erst einmal hinsetzen."];
function directorReveal(){
 if(!g){resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame='';directorSeenOpened.clear();directorLatestAmount=null;directorLatestUntil=0;document.body.classList.remove('reveal-spotlight');return}
 document.body.classList.toggle('reveal-spotlight',g.phase==='reveal');
 if(g.phase==='reveal'&&Number.isInteger(g.pending?.case)){
  const stage=document.querySelector('.case-stage'),grid=$('cases'),target=grid?.children[g.pending.case];
  if(stage&&target){const a=stage.getBoundingClientRect(),b=target.getBoundingClientRect();if(a.width&&a.height){stage.style.setProperty('--camera-x',((b.left+b.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--camera-y',((b.top+b.height/2-a.top)/a.height*100).toFixed(2)+'%')}}
 }
 const gameKey=String(g.id);const amounts=g.openedAmounts||[];
 if(directorLastGame!==gameKey){if(directorLastGame)window.stopOpenedAmountAnnouncement?.();resetAvatarReaction();avatarReactionGame=gameKey;resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame=gameKey;directorSeenOpened=new Set(amounts.map(x=>x.case));return}
 const newlyOpened=amounts.filter(x=>!directorSeenOpened.has(x.case));
 for(const item of amounts)directorSeenOpened.add(item.case);
 if(!newlyOpened.length||g.phase==='final')return;
 const item=newlyOpened.at(-1);if(typeof announceOpenedAmount==='function')announceOpenedAmount(item.amount,{caseNumber:item.case+1,gameId:g.id,caseCount:g.caseCount});directorLatestAmount=item.amount;directorLatestUntil=Date.now()+1800;
 const prizeScale=Array.isArray(values)&&values.length?values:[];
 const sortedScale=[...prizeScale].sort((a,b)=>a-b);
 const highThreshold=sortedScale[Math.floor(sortedScale.length*.8)]??Infinity;
 const lowThreshold=sortedScale[Math.floor(sortedScale.length*.25)]??-Infinity;
 const huge=item.amount>=highThreshold,small=item.amount<=lowThreshold;
 const mood=huge?'loss':small?'relief':'neutral';
 setAvatarReaction(huge?'shock':small?'cheer':'curious',2300);
 // The revealed amount remains inside the physical briefcase; no fullscreen amount flash.
 clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);
 const flash=$('prize-flash');
 flash.classList.remove('active','prize-huge','prize-relief');
 flash.setAttribute('aria-hidden','true');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const target=$('cases')?.children[item.case];
 showCaseCamera(item.case);
 document.body.dataset.revealMood=mood;
 if(target&&!reduced){target.classList.add('case-newly-opened');target.addEventListener('animationend',()=>target.classList.remove('case-newly-opened'),{once:true})}
}
