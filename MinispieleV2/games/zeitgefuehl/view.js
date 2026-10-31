/** Zeitgefühl view: no room, network, persistence or scoring rules. */
export function mount(container,host){
 const heading=document.createElement('h2');heading.textContent='Zeitgefühl';
 const instructions=document.createElement('p');instructions.textContent='Starte die Zeit und stoppe möglichst genau bei der Zielzeit.';
 const start=document.createElement('button');start.textContent='Zeitmessung starten';
 const stop=document.createElement('button');stop.textContent='Stoppen';
 const result=document.createElement('pre');result.setAttribute('aria-live','polite');result.style.whiteSpace='pre-wrap';
 const again=document.createElement('button');again.textContent='Nochmal spielen';
 const back=document.createElement('button');back.textContent='Zur Auswahl';
 container.append(heading,instructions,start,stop,result,again,document.createTextNode(' '),back);
 let started=null;
 start.addEventListener('click',()=>{started=performance.now();start.disabled=true;stop.disabled=false;result.textContent='Die Zeit läuft …';});
 stop.addEventListener('click',()=>{
  if(started===null)return;
  const seconds=(performance.now()-started)/1000;started=null;
  host.dispatch('p0',{type:'submitTime',seconds});
  for(const p of host.snapshot().players.filter(p=>p.type==='bot'))host.botTurn(p.id);
 });
 again.addEventListener('click',()=>{started=null;host.restart();});
 back.addEventListener('click',()=>host.exit());
 return {render(snapshot){
  const finished=!!snapshot.result;
  if(finished){
   result.textContent='Ziel: '+snapshot.state.targetSeconds+' s\n'+snapshot.result.ranking.map(p=>p.rank+'. '+(p.id==='p0'?'Du':'Computer '+p.id.slice(1))+': '+p.seconds.toFixed(2)+' s · '+p.points+' Punkte').join('\n');
  }else if(started===null)result.textContent='Ziel: '+snapshot.state.targetSeconds+' Sekunden';
  start.disabled=started!==null||finished;
  stop.disabled=started===null||finished;
  again.hidden=!finished;
 }};
}
