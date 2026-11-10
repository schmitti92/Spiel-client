/* Die 100 Tore: read-only journey map. Never fabricates saved progress or a DOG unlock. */
(()=>{'use strict';
 const WORLDS=Object.freeze([
  {icon:'🌿',name:'Die vergessenen Ruinen',subtitle:'Hier beginnt eure Reise. Drei Helden finden die ersten Spuren des DOG-Schlosses.',description:'Die Wächter erwachen im verwachsenen Steinlabyrinth.'},
  {icon:'🌲',name:'Der verfluchte Wald',subtitle:'Die Dunkelheit wird dichter und eure Ausrüstung muss stärker werden.',description:'Zwischen Schatten und Dornen erwarten euch neue Gegner.'},
  {icon:'💎',name:'Die Kristallhöhlen',subtitle:'Seltene Materialien glitzern an den Wänden – aber die Höhlen werden bewacht.',description:'Hier beginnt die zweite Hälfte eurer Expedition.'},
  {icon:'🌋',name:'Das Flammengebirge',subtitle:'Feuer, Schmiedeglut und Drachenzeichen kündigen die letzten Prüfungen an.',description:'Nur gute Zusammenarbeit bringt euch dem DOG-Schloss näher.'},
  {icon:'🏰',name:'Die Festung der hundert Tore',subtitle:'Das legendäre DOG-Spiel ist bereits zu sehen. Noch trennt euch eine letzte Festung.',description:'Hinter dem hundertsten Tor wartet die letzte gemeinsame Prüfung.'}
 ]);
 const MAJOR_BOSSES=Object.freeze({
  10:'Aschewächter',20:'Schattenfürst',30:'Kristallwurm',40:'Dornenkönig',
  50:'Hüter der Tiefe',60:'Flammendrache',70:'Seelenrichter',
  80:'Eisenkoloss',90:'Festungswächter',100:'Der letzte Wächter'
 });
 const MINI_BOSSES=Object.freeze({
  5:'Steinbrecher',15:'Schattenwolf',25:'Dornenbestie',35:'Kristallgolem',
  45:'Giftstachel',55:'Lavabestie',65:'Seelenjäger',75:'Jungdrache',
  85:'Dunkler Ritter',95:'Todeswächter'
 });
 const $=id=>document.getElementById(id);
 const worldRoot=$('worlds'),details=$('details'),pathList=[];
 const params=new URLSearchParams(location.search);
 const room=params.get('room');
 if(room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  const q='?room='+encodeURIComponent(room);
  for(const [id,url] of [['back-event','./dog-expedition.html'],['back-forge','./dog-forge.html']]){
   const a=$(id);if(a)a.href=url+q;
  }
 }
 const titleFor=gate=>gate===100?'Finaler Gruppenboss – Der letzte Wächter':
  gate%10===0?'Gemeinsamer Boss – '+MAJOR_BOSSES[gate]:
  gate%10===5?'Solo-Mini-Boss – '+MINI_BOSSES[gate]:
  'Persönlicher Kampf – Tor '+gate;
 const summaryFor=gate=>{
  if(gate===100)return 'Der letzte Wächter verteidigt das DOG-Schloss. Alle drei Spieler müssen ihn gemeinsam besiegen. Erst der bestätigte serverseitige Sieg darf DOG für euch freischalten.';
  if(gate%10===0)return 'Eine gemeinsame Herausforderung für alle drei Helden. Der Sieg schaltet die nächste Stufe in der Schmiede sowie neue Ausrüstungsmöglichkeiten frei.';
  if(gate%10===5)return 'Ein besonders harter Einzelkampf: Eine gute Waffe allein reicht oft nicht. Verstärke auch Rüstung und Fähigkeiten. Nach einem erstmaligen Sieg winkt eine besondere zufällige Belohnung.';
  return 'Ein normaler Einzelkampf mit einer von deiner Ausrüstung abhängigen Gewinnchance zwischen 30 % und 80 %. Du kannst ihn nach einer Niederlage erneut versuchen.';
 };
 function selectGate(gate,button){
  for(const selected of document.querySelectorAll('.gate[aria-pressed="true"]'))selected.setAttribute('aria-pressed','false');
  button?.setAttribute('aria-pressed','true');
  const kind=gate%10===0?'Gruppenboss':gate%10===5?'Mini-Boss':'Persönlicher Kampf';
  $('gate-detail-kicker').textContent='TOR '+gate+' VON 100 · '+kind.toUpperCase();
  $('gate-detail-title').textContent=titleFor(gate);
  $('gate-detail-summary').textContent=summaryFor(gate);
  $('gate-detail-future').textContent=gate===100?
   '🔒 DOG ist noch verschlossen. Es wird erst nach einem nachgewiesenen Sieg über den letzten gemeinsamen Boss freigeschaltet.':
   '🛠️ Dies ist eine Kartenvorschau. Der persönliche Fortschritt und die Kämpfe werden in einem weiteren Entwicklungsschritt mit dem Server verbunden.';
  if(!details.open)details.showModal();
 }
 function drawPaths(){
  for(const {grid,nodes,svg} of pathList){
   if(!grid.isConnected)continue;
   const bounds=grid.getBoundingClientRect();
   if(bounds.width<=0||bounds.height<=0)continue;
   const points=nodes.map(node=>{
    const b=node.getBoundingClientRect();
    return [b.left-bounds.left+b.width/2,b.top-bounds.top+b.height/2];
   });
   svg.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);
   const d=points.map((p,i)=>(i?'L':'M')+' '+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
   const path=svg.querySelector('path');
   path?.setAttribute('d',d);
  }
 }
 function createWorld(index){
  const start=index*20+1,last=start+19,data=WORLDS[index];
  const section=document.createElement('section');section.className='world';
  section.dataset.world=String(index+1);
  section.setAttribute('aria-label','Welt '+(index+1)+': '+data.name);
  const head=document.createElement('header');head.className='world-head';
  const copy=document.createElement('div');
  const eyebrow=document.createElement('span');eyebrow.className='world-label';
  eyebrow.textContent='WELT '+(index+1)+' / 5 · TORE '+start+'–'+last;
  const heading=document.createElement('h2');heading.textContent=data.name;
  const subtitle=document.createElement('p');subtitle.textContent=data.subtitle;
  copy.append(eyebrow,heading,subtitle);
  const icon=document.createElement('span');icon.className='world-icon';
  icon.textContent=data.icon;icon.setAttribute('aria-hidden','true');
  head.append(copy,icon);
  const content=document.createElement('div');content.className='world-content';
  const grid=document.createElement('div');grid.className='gate-map';
  grid.setAttribute('aria-label','Torpfad von '+start+' bis '+last);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('gate-path');svg.setAttribute('aria-hidden','true');
  svg.append(document.createElementNS('http://www.w3.org/2000/svg','path'));
  grid.append(svg);
  const nodes=[];
  for(let i=0;i<20;i++){
   const gate=start+i,row=Math.floor(i/5),col=i%5;
   const button=document.createElement('button');button.type='button';
   const isBoss=gate%10===0,isMini=gate%10===5;
   button.className='gate'+(isBoss?' boss':'')+(isMini?' mini':'')+(gate===100?' final':'');
   button.style.gridRow=String(row+1);
   button.style.gridColumn=String(row%2?5-col:col+1);
   button.setAttribute('aria-label','Tor '+gate+': '+titleFor(gate)+'. Details ansehen');
   button.setAttribute('aria-pressed','false');
   const number=document.createElement('span');number.className='number';number.textContent=String(gate);
   const type=document.createElement('span');type.className='kind';
   type.textContent=isBoss?(gate===100?'🏰':'🐉'):isMini?'👹':'⚔️';
   type.setAttribute('aria-hidden','true');
   button.append(number,type);
   button.addEventListener('click',()=>selectGate(gate,button));
   nodes.push(button);grid.append(button);
  }
  content.append(grid);
  const foot=document.createElement('div');foot.className='world-foot';
  const left=document.createElement('span');
  left.textContent='👹 Mini-Bosse '+(start+4)+' und '+(start+14);
  const right=document.createElement('span');
  right.textContent='🐉 Gemeinsame Bosse '+(start+9)+' und '+last;
  foot.append(left,right);
  section.append(head,content,foot);
  worldRoot.append(section);
  pathList.push({grid,nodes,svg});
 }
 WORLDS.forEach((_,index)=>createWorld(index));
 if('ResizeObserver' in window){
  const observer=new ResizeObserver(drawPaths);
  pathList.forEach(({grid})=>observer.observe(grid));
 }else window.addEventListener('resize',drawPaths);
 window.requestAnimationFrame(drawPaths);
 window.addEventListener('load',drawPaths,{once:true});
 $('gate-detail-close').addEventListener('click',()=>details.close());
 details.addEventListener('close',()=>{for(const selected of document.querySelectorAll('.gate[aria-pressed="true"]'))selected.setAttribute('aria-pressed','false');});
})();
