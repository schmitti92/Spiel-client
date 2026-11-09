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
  {at:22,id:'frost-card-frame',icon:'🧊',name:'Frostrahmen'},
  {at:24,id:'aurora-lobby',icon:'🌌',name:'Nordlicht-Lobby'},
  {at:26,id:'north-star-dust',icon:'✨',name:'Nordstern-Funkeln'},
  {at:28,id:'royal-north-gallery',icon:'👑',name:'Königliche Galerie'},
  {at:30,id:'north-pole-legend',icon:'🏆',name:'Nordpol-Legende'}
 ]);
 const cardId=i=>'christmas-'+String(65+i).padStart(2,'0');
 function snapshot(cards={},progress={}){
  const owned=Array.from({length:16},(_,i)=>Number(cards?.[cardId(i)]||0)>0);
  const received=new Set(Array.isArray(progress?.rewards)?progress.rewards:[]);
  return {
   owned,
   count:owned.filter(Boolean).length,
   totalBingos:Math.max(0,Math.min(30,Math.trunc(Number(progress?.totalBingos)||0))),
   lines:LINES.map((positions,index)=>{
    const have=positions.filter(i=>owned[i]).length;
    return {index,positions,have,missing:positions.filter(i=>!owned[i]).map(i=>65+i),complete:have===4};
   }),
   milestones:MILESTONES.map(m=>({...m,unlocked:received.has(m.id)}))
  };
 }
 const label=i=>i<4?'Reihe '+(i+1):i<8?'Spalte '+(i-3):i===8?'Diagonale ↘':'Diagonale ↙';
 const short=i=>i<4?'R'+(i+1):i<8?'S'+(i-3):i===8?'↘':'↙';
 let mounted=false,selection=null,last=snapshot(),buttons=[],cells=[],milestoneNodes=[];
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
  milestoneNodes=MILESTONES.map(reward=>{
   const chip=document.createElement('div');chip.className='north-milestone';chip.dataset.milestone=reward.id;
   const icon=document.createElement('span');icon.className='north-milestone-icon';icon.textContent=reward.icon;
   const detail=document.createElement('span');detail.className='north-milestone-detail';
   const title=document.createElement('strong');title.textContent=reward.at+' Bingos';
   const name=document.createElement('small');name.textContent=reward.name;
   detail.append(title,name);
   const lock=document.createElement('span');lock.className='north-milestone-status';lock.textContent='🔒';
   chip.append(icon,detail,lock);rewardRoot.append(chip);
   return chip;
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
  last=snapshot(data?.cards||{},data?.progress||{});
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
  milestoneNodes.forEach((chip,i)=>{
   const reward=last.milestones[i];
   chip.classList.toggle('unlocked',reward.unlocked);
   chip.querySelector('.north-milestone-status').textContent=reward.unlocked?'✅':'🔒';
   chip.setAttribute('aria-label',reward.name+': '+(reward.unlocked?'freigeschaltet':'noch gesperrt, ab '+reward.at+' Bingos'));
  });
  const next=last.milestones.find(x=>!x.unlocked);
  const nextText=document.getElementById('north-bingo-next');
  if(nextText)nextText.textContent=next
   ?'🎁 Nächste Nordpol-Belohnung: '+next.icon+' '+next.name+' · '+Math.max(0,next.at-last.totalBingos)+' weitere Bingos'
   :'🏆 Alle fünf Nordpol-Belohnungen freigeschaltet!';
  applyFocus();
 }
 function reset(){selection=null;render({cards:{},progress:{totalBingos:0,rewards:[]}})}
 global.NorthPoleBingo=Object.freeze({snapshot,render,reset,LINES,MILESTONES});
})(window);
