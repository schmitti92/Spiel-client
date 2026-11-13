'use strict';
/* Weihnachtsevent 2: visual-only hammer spectacle.
   Never grants prizes, chooses tiles, posts requests or changes game state. */
(()=>{
 const images={single:'hammer-einfach.webp',double:'hammer-doppel.webp',lucky:'hammer-glueck.webp'};
 const titles={single:'EIS ZERBROCHEN!',double:'DOPPELSCHLAG!',lucky:'MAGISCHER GLÜCKSSCHLAG!'};
 const prefersReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const previous=new WeakMap();
 function point(board,tile){
  const b=board.getBoundingClientRect(),r=tile.getBoundingClientRect();
  return {x:r.left-b.left+r.width/2,y:r.top-b.top+r.height/2,left:r.left-b.left,top:r.top-b.top,width:r.width,height:r.height};
 }
 function element(tag,cls){
  const el=document.createElement(tag);
  el.className=cls;
  el.setAttribute('aria-hidden','true');
  return el;
 }
 function layer(board,hammer){
  const old=previous.get(board);
  if(old)old.remove();
  const el=element('div','icefx-layer icefx-'+(images[hammer]?hammer:'single'));
  board.appendChild(el);
  previous.set(board,el);
  return el;
 }
 function hammerImage(){
  const img=element('img','icefx-hammer-image');
  img.alt='';
  return img;
 }
 function swing(container,hammer,x,y){
  const box=element('div','icefx-swing');
  box.style.left=x+'px';
  box.style.top=y+'px';
  const img=hammerImage();
  img.src='./Weihnachtsbilder/'+images[hammer];
  box.appendChild(img);
  container.appendChild(box);
 }
 function cue(tile,hammer){
  if(!tile||prefersReduced()||document.hidden)return;
  const board=tile.closest('.v44-board');
  if(!board)return;
  const at=point(board,tile),fx=layer(board,hammer);
  fx.classList.add('icefx-preview');
  const aura=element('span','icefx-aim');
  aura.style.left=at.x+'px';aura.style.top=at.y+'px';
  fx.appendChild(aura);
  swing(fx,hammer,at.x,at.y);
  window.setTimeout(()=>{if(fx.isConnected)fx.remove()},850);
 }
 function shatter(fx,at,index){
  const cell=element('div','icefx-cell');
  cell.style.left=at.left+'px';
  cell.style.top=at.top+'px';
  cell.style.width=at.width+'px';
  cell.style.height=at.height+'px';
  cell.style.setProperty('--sequence',String(index));
  const drift=[[-31,-22,-19],[29,-28,24],[-25,28,17],[33,24,-24]];
  for(let k=0;k<4;k++){
   const piece=element('span','icefx-piece icefx-piece-'+k);
   const [dx,dy,rot]=drift[k];
   piece.style.setProperty('--drift-x',dx+'px');
   piece.style.setProperty('--drift-y',dy+'px');
   piece.style.setProperty('--drift-r',rot+'deg');
   cell.appendChild(piece);
  }
  const fracture=element('span','icefx-fracture');
  cell.appendChild(fracture);
  fx.appendChild(cell);
 }
 function burst(fx,at,amount,hammer,finished,reduced,partial=false){
  const glow=element('span','icefx-burst');
  glow.style.left=at.x+'px';glow.style.top=at.y+'px';
  fx.appendChild(glow);
  if(!reduced){
   swing(fx,hammer,at.x,at.y);
   // Decorative particles are capped; no physics engine or image decode loops.
   for(let i=0;i<10;i++){
    const spark=element('i','icefx-spark');
    spark.style.left=at.x+'px';spark.style.top=at.y+'px';
    spark.style.setProperty('--angle',(i*36)+'deg');
    spark.style.setProperty('--distance',(35+i%3*12)+'px');
    fx.appendChild(spark);
   }
  }
  const caption=element('span','icefx-caption');
  caption.style.left=Math.max(10,Math.min(at.x,fx.clientWidth-10))+'px';
  caption.style.top=Math.max(22,at.y-30)+'px';
  caption.textContent=finished?'🌟 BILD FREIGELEGT!':partial?'💥 EIS ANGERISSEN · NOCH 1 TREFFER!':(titles[hammer]||titles.single)+' · '+amount+' 🧊';
  fx.appendChild(caption);
 }
 function confirmed(board,{hammer='single',targets=[],anchor=null,finished=false,partial=false}={}){
  if(!board||!Array.isArray(targets)||!targets.length)return;
  const indices=[...new Set(targets)].filter(i=>Number.isInteger(i)&&i>=0).slice(0,6);
  const at=indices.map(i=>board.querySelector('[data-tile="'+i+'"]')).filter(Boolean).map(el=>point(board,el));
  if(!at.length)return;
  const reduced=prefersReduced(),fx=layer(board,hammer);
  fx.classList.add('icefx-confirmed');
  if(!reduced&&!partial)at.forEach((pos,i)=>shatter(fx,pos,i));
  const anchorTile=board.querySelector('[data-tile="'+anchor+'"]');
  const center=anchorTile?point(board,anchorTile):at[0];
  burst(fx,center,at.length,hammer,finished,reduced,partial);
  window.setTimeout(()=>{if(fx.isConnected)fx.remove()},reduced?550:1000);
 }
 window.ChristmasIceHammerFX=Object.freeze({cue,confirmed});
})();
