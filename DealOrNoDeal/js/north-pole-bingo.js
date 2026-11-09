/* North Pole bingo compass – visual-only progress from the existing authenticated album response.
   No requests, no timers and no client-side reward payouts. */
(function(global){
 'use strict';
 const LINES=Object.freeze([
  [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
  [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
  [0,5,10,15],[3,6,9,12]
 ]);
 const MILESTONES=Object.freeze([
  {at:22,id:'north-premium-2',icon:'💎',name:'2 Premium-Kartenpakete'},
  {at:24,id:'north-gold-hammers-2',icon:'🔨',name:'2 goldene Hämmer'},
  {at:26,id:'north-jokers-2',icon:'🃏',name:'2 Kofferblick-Joker'},
  {at:28,id:'north-platinum-combo',icon:'🏆',name:'1 Joker + 1 Goldhammer + 1 Platinpaket'},
  {at:30,id:'north-monster-spin-1',icon:'🎡',name:'1 Monsterdrehung'}
 ]);

 const CLASSIC_BOARD_MILESTONES=Object.freeze([
  Object.freeze([
   {at:2,id:'rudolph',icon:'🦌',name:'Rudolf'},
   {at:4,id:'winter-lobby',icon:'❄️',name:'Winterlobby'},
   {at:6,id:'christmas-studio',icon:'🎄',name:'Weihnachtsstudio'},
   {at:8,id:'gift-cases',icon:'🎁',name:'Geschenke statt Koffer'},
   {at:10,id:'snowman-profile-avatar',icon:'⛄',name:'Schneemann'}
  ]),
  Object.freeze([
   {at:12,id:'santa-profile-avatar',icon:'🎅',name:'Weihnachtsmann-Profilbild'},
   {at:14,id:'lobby-snowfall',icon:'❄️',name:'Schneefall-Lobby'},
   {at:16,id:'christmas-profile-banner',icon:'🏘️',name:'Profilbanner'},
   {at:18,id:'santa',icon:'🎅',name:'Weihnachtsmann'},
   {at:20,id:'christmas-champion',icon:'🏆',name:'Weihnachts-Champion'}
  ])
 ]);
 const BOARD_KEYS=Object.freeze(['first','second']);
 const cardId=i=>'christmas-'+String(65+i).padStart(2,'0');
 function snapshot(cards={},progress={}){
  const owned=Array.from({length:16},(_,i)=>Number(cards?.[cardId(i)]||0)>0);
  const received=new Set(Array.isArray(progress?.rewards)?progress.rewards:[]);
  const paid=new Set(Array.isArray(progress?.northPoleClaimed)?progress.northPoleClaimed:[]);
  return {
   owned,
   count:owned.filter(Boolean).length,
   totalBingos:Math.max(0,Math.min(40,Math.trunc(Number(progress?.totalBingos)||0))),
   lines:LINES.map((positions,index)=>{
    const have=positions.filter(i=>owned[i]).length;
    return {index,positions,have,missing:positions.filter(i=>!owned[i]).map(i=>65+i),complete:have===4};
   }),
   milestones:MILESTONES.map(m=>({...m,unlocked:received.has(m.id),claimed:paid.has(m.id)})),
   classicMilestones:CLASSIC_BOARD_MILESTONES.map(board=>board.map(m=>({...m,unlocked:received.has(m.id)})))
  };
 }
 const label=i=>i<4?'Reihe '+(i+1):i<8?'Spalte '+(i-3):i===8?'Diagonale ↘':'Diagonale ↙';
 const short=i=>i<4?'R'+(i+1):i<8?'S'+(i-3):i===8?'↘':'↙';
 let mounted=false,selection=null,last=snapshot(),buttons=[],cells=[],milestoneNodes=[],classicMilestoneNodes=[[],[]];
 function createMilestoneChip(reward,root){
  const chip=document.createElement('div');chip.className='north-milestone';chip.dataset.milestone=reward.id;
  const icon=document.createElement('span');icon.className='north-milestone-icon';icon.textContent=reward.icon;
  const detail=document.createElement('span');detail.className='north-milestone-detail';
  const title=document.createElement('strong');title.textContent=reward.at+' Bingos';
  const name=document.createElement('small');name.textContent=reward.name;
  detail.append(title,name);
  const lock=document.createElement('span');lock.className='north-milestone-status';lock.textContent='🔒';
  chip.append(icon,detail,lock);root.append(chip);
  return chip;
 }
 function updateMilestoneChip(chip,reward){
  if(!chip)return;
  chip.classList.toggle('unlocked',reward.unlocked);
  chip.querySelector('.north-milestone-status').textContent=reward.claimed?'✅':reward.unlocked?'🎁':'🔒';
  chip.setAttribute('aria-label',reward.name+': '+(reward.claimed?'gutgeschrieben':reward.unlocked?'Freigeschaltet, Gutschrift läuft':'noch gesperrt, ab '+reward.at+' Gesamt-Bingos'));
 }

 function mount(){
  if(mounted)return true;
  const root=document.getElementById('album-grid-third');
  const rows=document.getElementById('north-bingo-rows');
  const cols=document.getElementById('north-bingo-columns');
  const diags=document.getElementById('north-bingo-diagonals');
  const rewardRoot=document.getElementById('north-bingo-milestones');
  if(!root||!rows||!cols||!diags||!rewardRoot)return false;
  buttons=LINES.map((positions,i)=>{
   const button=document.createElement('button');
   button.type='button';button.className='north-bingo-chip';button.dataset.line=String(i);
   button.setAttribute('aria-pressed','false');
   const kind=document.createElement('span');kind.className='north-chip-kind';kind.textContent=short(i);
   const amount=document.createElement('strong');amount.className='north-chip-count';amount.textContent='0/4';
   button.append(kind,amount);
   button.addEventListener('click',()=>{
    selection=selection===i?null:i;
    applyFocus();
   });
   (i<4?rows:i<8?cols:diags).append(button);
   return button;
  });
  milestoneNodes=MILESTONES.map(reward=>createMilestoneChip(reward,rewardRoot));
  CLASSIC_BOARD_MILESTONES.forEach((milestones,boardIndex)=>{
   const earlyRoot=document.getElementById('album-bingo-milestones-'+BOARD_KEYS[boardIndex]);
   classicMilestoneNodes[boardIndex]=earlyRoot?milestones.map(reward=>createMilestoneChip(reward,earlyRoot)):[];
  });
  cells=Array.from(root.querySelectorAll('[data-card]'));
  mounted=true;return true;
 }
 function applyFocus(){
  if(!mounted)return;
  const line=selection===null?null:last.lines[selection];
  cells.forEach((cell,index)=>{
   const included=!!line?.positions.includes(index);
   cell.classList.toggle('north-line-focus',included);
   cell.classList.toggle('north-line-missing',included&&!last.owned[index]);
  });
  buttons.forEach((button,i)=>{
   const focused=i===selection;
   button.classList.toggle('selected',focused);
   button.setAttribute('aria-pressed',String(focused));
  });
  const hint=document.getElementById('north-bingo-hint');
  if(!hint)return;
  if(!line){hint.textContent='✨ Tippe eine Reihe, Spalte oder Diagonale an, um die noch fehlenden Kartennummern zu markieren.';return}
  hint.textContent=line.complete
   ?'🏆 '+label(line.index)+' ist vollständig – Bingo!'
   :'🔍 '+label(line.index)+': '+line.have+'/4 Karten · Es fehlen die Nummern '+line.missing.join(', ')+'.';
 }
 function render(data={}){
  if(!mount())return;
  last=snapshot(data?.cards||{},{...(data?.progress||{}),northPoleClaimed:data?.northPoleClaimed||[]});
  buttons.forEach((button,i)=>{
   const line=last.lines[i];
   button.querySelector('strong').textContent=line.complete?'✓ 4/4':line.have+'/4';
   button.classList.toggle('complete',line.complete);
   button.classList.toggle('almost',line.have===3);
   button.setAttribute('aria-label',label(i)+': '+line.have+' von 4 Karten; '+(line.complete?'Bingo!':line.missing.length+' fehlen.'));
   button.title=line.complete
    ?label(i)+' · Bingo abgeschlossen'
    :label(i)+' · Fehlende Kartennummern: '+line.missing.join(', ');
  });
  const done=last.lines.filter(x=>x.complete).length;
  const count=document.getElementById('north-bingo-completed');
  if(count)count.textContent=done+' von 10 Linien fertig';
  milestoneNodes.forEach((chip,i)=>updateMilestoneChip(chip,last.milestones[i]));
  classicMilestoneNodes.forEach((nodes,boardIndex)=>{
   const milestones=last.classicMilestones[boardIndex];
   nodes.forEach((chip,i)=>updateMilestoneChip(chip,milestones[i]));
   const nextClassic=milestones.find(reward=>!reward.unlocked);
   const nextText=document.getElementById('album-bingo-next-'+BOARD_KEYS[boardIndex]);
   if(nextText)nextText.textContent=nextClassic
    ?'🎁 Nächste Belohnung: '+nextClassic.icon+' '+nextClassic.name+' · noch '+Math.max(0,nextClassic.at-last.totalBingos)+' Gesamt-Bingo(s)'
    :'🏆 Alle fünf Belohnungen freigeschaltet!';
  });
  const firstBonus=document.getElementById('album-bingo-first-bonus');
  if(firstBonus){
   const bonusUnlocked=Array.isArray(data?.progress?.rewards)&&data.progress.rewards.includes('collector-frame');
   firstBonus.classList.toggle('unlocked',bonusUnlocked);
   firstBonus.querySelector('.classic-bingo-bonus-status').textContent=bonusUnlocked?'✅':'🔒';
   firstBonus.setAttribute('aria-label','Exklusiver Sammlerrahmen: '+(bonusUnlocked?'freigeschaltet':'noch gesperrt, ab 10 Gesamt-Bingos'));
  }
  const next=last.milestones.find(x=>!x.unlocked);
  const nextText=document.getElementById('north-bingo-next');
  if(nextText)nextText.textContent=next
   ?'🎁 Nächste Nordpol-Belohnung: '+next.icon+' '+next.name+' · '+Math.max(0,next.at-last.totalBingos)+' weitere Bingos'
   :'🏆 Alle fünf Nordpol-Belohnungen freigeschaltet!';
  applyFocus();
  renderFourth(data);
 }

 // Same ten interactive Bingo lines as the North Pole board, using only the
 // existing server-verified Christmas profile state. No extra network reads.
 const fourthCardId=i=>'christmas-'+String(81+i);
 function fourthSnapshot(cards={}){
  const owned=Array.from({length:16},(_,i)=>Number(cards?.[fourthCardId(i)]||0)>0);
  return {
   owned,
   count:owned.filter(Boolean).length,
   lines:LINES.map((positions,index)=>{
    const have=positions.filter(i=>owned[i]).length;
    return {index,positions,have,missing:positions.filter(i=>!owned[i]).map(i=>81+i),complete:have===4};
   })
  };
 }
 let fourthMounted=false,fourthSelection=null,fourthLast=fourthSnapshot(),fourthButtons=[],fourthCells=[];
 function mountFourth(){
  if(fourthMounted)return true;
  const root=document.getElementById('album-grid-fourth');
  const rows=document.getElementById('fourth-bingo-rows');
  const cols=document.getElementById('fourth-bingo-columns');
  const diags=document.getElementById('fourth-bingo-diagonals');
  if(!root||!rows||!cols||!diags)return false;
  fourthButtons=LINES.map((positions,i)=>{
   const button=document.createElement('button');
   button.type='button';button.className='north-bingo-chip';button.dataset.line=String(i);
   button.setAttribute('aria-pressed','false');
   const kind=document.createElement('span');kind.className='north-chip-kind';kind.textContent=short(i);
   const amount=document.createElement('strong');amount.className='north-chip-count';amount.textContent='0/4';
   button.append(kind,amount);
   button.addEventListener('click',()=>{
    fourthSelection=fourthSelection===i?null:i;
    focusFourth();
   });
   (i<4?rows:i<8?cols:diags).append(button);
   return button;
  });
  fourthCells=Array.from(root.querySelectorAll('[data-card]'));
  fourthMounted=true;return true;
 }
 function focusFourth(){
  if(!fourthMounted)return;
  const line=fourthSelection===null?null:fourthLast.lines[fourthSelection];
  fourthCells.forEach((cell,index)=>{
   const chosen=!!line?.positions.includes(index);
   cell.classList.toggle('north-line-focus',chosen);
   cell.classList.toggle('north-line-missing',chosen&&!fourthLast.owned[index]);
  });
  fourthButtons.forEach((button,i)=>{
   const selected=i===fourthSelection;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  });
  const hint=document.getElementById('fourth-bingo-hint');
  if(!hint)return;
  if(!line){hint.textContent='✨ Tippe eine Reihe, Spalte oder Diagonale an, um die fehlenden Kartennummern zu markieren.';return}
  hint.textContent=line.complete
   ?'🏆 '+label(line.index)+' ist vollständig – Bingo!'
   :'🔍 '+label(line.index)+': '+line.have+'/4 Karten · Es fehlen die Nummern '+line.missing.join(', ')+'.';
 }
 function renderFourth(data={}){
  if(!mountFourth())return;
  fourthLast=fourthSnapshot(data?.cards||{});
  fourthButtons.forEach((button,i)=>{
   const line=fourthLast.lines[i];
   button.querySelector('strong').textContent=line.complete?'✓ 4/4':line.have+'/4';
   button.classList.toggle('complete',line.complete);
   button.classList.toggle('almost',line.have===3);
   button.setAttribute('aria-label',label(i)+': '+line.have+' von 4 Karten; '+(line.complete?'Bingo!':line.missing.length+' fehlen.'));
   button.title=line.complete
    ?label(i)+' · Bingo abgeschlossen'
    :label(i)+' · Fehlende Kartennummern: '+line.missing.join(', ');
  });
  const done=Number(data?.progress?.fourthBingos);
  const completed=Number.isInteger(done)&&done>=0&&done<=10?done:fourthLast.lines.filter(x=>x.complete).length;
  const count=document.getElementById('fourth-bingo-completed');
  if(count)count.textContent=completed+' von 10 Linien fertig';
  const note=document.getElementById('fourth-bingo-next');
  if(note)note.textContent=completed===10
   ?'🏆 Alle zehn Weihnachtschaos-Bingos geschafft! Die neuen Belohnungen werden separat festgelegt.'
   :'🎁 Noch '+(10-completed)+' Bingo-Linie(n) bis zur vollständigen vierten Tafel · Die Belohnungen für 32–40 Gesamt-Bingos folgen.';
  focusFourth();
 }
 function reset(){selection=null;fourthSelection=null;render({cards:{},progress:{totalBingos:0,rewards:[]}})}
 global.NorthPoleBingo=Object.freeze({snapshot,render,reset,LINES,MILESTONES,CLASSIC_BOARD_MILESTONES,fourthSnapshot});
})(window);
