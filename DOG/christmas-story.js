/**
 * Lichtertal: responsive, text-only storybook reader.
 *
 * The 60 authored scenes remain immutable; longer scenes flow onto as many
 * physical leaves as the actual book can display. Tree unlocks are verified
 * outside this module. No photos, fake rewards or local unlock state.
 */
import {CHRISTMAS_STORY_CHAPTERS,CHRISTMAS_STORY_TOTAL_PAGES} from './christmas-storybook-data.js?v=3';
export {CHRISTMAS_STORY_CHAPTERS};
export function unlockedStoryChapters(stage,verified){
 if(!verified)return 1;
 return Math.min(10,Math.max(1,Number.isInteger(stage)?stage:1));
}
function node(tag,className,txt){
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(txt!==undefined)n.textContent=String(txt);
 return n;
}
const SCENES_PER_CHAPTER=6;

export function initChristmasStory({openTab}){
 const $=id=>document.getElementById(id);
 const nav=$('story-chapter-list'),reader=$('story-reading'),
  banner=$('story-upgrade-banner'),action=$('story-next-action'),
  badge=$('story-book-unlocked'),mini=$('tab-story')?.querySelector('small');
 if(!nav||!reader||!action||!banner)throw Error('STORY_READER_MISSING');

 const singlePage=window.matchMedia('(max-width: 780px)');
 let stage=1,verified=false,hasVerification=false;
 let chapter=1,scene=1,leaf=0,needed=0;
 let drawInProgress=false;
 const cached=new Map();

 function makeLeaf(item,sceneIndex,partIndex,partCount,side,body){
  const [heading]=item.pages[sceneIndex-1];
  const paper=node('section','storybook-paper storybook-paper--'+side);
  paper.setAttribute('aria-label','Abschnitt '+sceneIndex+', Buchseite '+(partIndex+1)+' von '+partCount);
  const edition=node('div','storybook-page-kicker',
   'KAPITEL '+String(item.level).padStart(2,'0')+' · '+item.tree.toUpperCase());
  const title=node('h3','storybook-page-heading',heading);
  const subtitle=node('div','storybook-page-subtitle',
   'ABSCHNITT '+sceneIndex+' VON 6 · BUCHSEITE '+(partIndex+1)+' / '+partCount);
  const story=node('div','storybook-page-text',body);
  story.setAttribute('tabindex','0');
  story.setAttribute('aria-label','Geschichte: '+heading+', Teil '+(partIndex+1));
  const theme=node('div','storybook-page-thought','✧ '+item.theme);
  const footer=node('div','storybook-page-footer');
  footer.append(node('span','',item.icon+' '+item.title),
   node('strong','',String((item.level-1)*6+sceneIndex)+' / '+CHRISTMAS_STORY_TOTAL_PAGES));
  paper.append(edition,title,subtitle,story,theme,footer);
  return {paper,story};
 }

 // Source scenes are NOT truncated. Split on actual available text height, using
 // the narrower of the left/right leaf widths. Keep the original word order.
 function splitToFit(item,sceneIndex){
  const narrow=singlePage.matches;
  const bounds=reader.getBoundingClientRect();
  const viewWidth=Math.round(bounds.width);
  const height=Math.round(window.innerHeight||0);
  const key=[item.level,sceneIndex,narrow?1:2,viewWidth,height].join(':');
  if(viewWidth>=240&&cached.has(key))return cached.get(key);

  const body=item.pages[sceneIndex-1][1];
  const words=body.match(/\S+\s*/g)||[];
  if(words.length===0)return [''];
  const measure=node('div','storybook-spread storybook-spread--textonly storybook-spread--measure');
  const left=makeLeaf(item,sceneIndex,0,1,'left','');
  measure.append(left.paper);
  const right=narrow?null:makeLeaf(item,sceneIndex,0,1,'right','');
  if(right)measure.append(right.paper);
  reader.append(measure);

  const measurable=viewWidth>=240&&left.story.clientHeight>=80&&(!right||right.story.clientHeight>=80);
  // A scene can be pre-rendered while its tab is hidden; a ResizeObserver
  // recalculates the fit when the actual book becomes visible.
  const fits=(from,to)=>{
   const text=words.slice(from,to).join('').trim();
   left.story.textContent=text;
   if(right)right.story.textContent=text;
   // scrollHeight already includes the element's clientHeight even when the
   // content fits perfectly. Subtracting 10px made this condition *always*
   // fail and fragmented every 100-word scene into ~15 tiny book leaves.
   return left.story.scrollHeight<=left.story.clientHeight+1&&
    (!right||right.story.scrollHeight<=right.story.clientHeight+1);
  };
  // A real open book has TWO facing pages. When the authored scene has two
  // paragraphs, put one on each leaf if both fit; never split a sentence
  // between facing leaves merely to satisfy an artificial word-count limit.
  // A small number of scenes have one paragraph; divide those at the sentence
  // ending closest to the midpoint, provided both leaves fit.
  const fitsBody=(leftText,rightText)=>{
   left.story.textContent=leftText;
   const firstFits=left.story.scrollHeight<=left.story.clientHeight+1;
   if(!firstFits)return false;
   if(right){
    right.story.textContent=rightText;
    return right.story.scrollHeight<=right.story.clientHeight+1;
   }
   // Mobile displays one leaf at a time, so measure both paragraphs against
   // the SAME available paper height instead of skipping the second leaf.
   left.story.textContent=rightText;
   return left.story.scrollHeight<=left.story.clientHeight+1;
  };
  const paragraphs=body.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean);
  let facing=paragraphs.length===2?paragraphs:null;
  if(!facing&&paragraphs.length===1){
   const sentenceEnds=Array.from(body.matchAll(/[.!?…][”"'»)]*(?=\s|$)/g),
    match=>match.index+match[0].length);
   const splitAt=sentenceEnds.filter(end=>end>=body.length*.28&&end<=body.length*.72)
    .sort((a,b)=>Math.abs(a-body.length/2)-Math.abs(b-body.length/2))[0];
   if(splitAt)facing=[body.slice(0,splitAt).trim(),body.slice(splitAt).trim()];
  }
  if(measurable&&facing&&facing.length===2&&facing.every(Boolean)&&
     fitsBody(facing[0],facing[1])){
   measure.remove();
   if(cached.size>48)cached.clear();
   cached.set(key,facing);
   return facing;
  }

  const chunks=[];
  let cursor=0,safety=0;
  while(cursor<words.length&&safety++<150){
   let last;
   if(!measurable){
    // Only a temporary fallback for hidden tabs; never cache an unmeasured size.
    let length=0;
    last=cursor;
    while(last<words.length&&length<235){length+=words[last].length;last++;}
   }else{
    let low=cursor+1,high=words.length,best=cursor;
    while(low<=high){
     const mid=Math.floor((low+high)/2);
     if(fits(cursor,mid)){best=mid;low=mid+1;}
     else high=mid-1;
    }
    last=best>cursor?best:Math.min(words.length,cursor+8);
    // A full stop near the natural page boundary reads more like a book.
    const floor=cursor+Math.floor((last-cursor)*.78);
    for(let end=last;end>Math.max(floor,cursor+1);end--){
     const word=words[end-1].trim();
     if(/[.!?…][”"'\u00bb)]?$/.test(word)||words[end-1].includes('\n\n')){
      last=end;break;
     }
    }
   }
   chunks.push(words.slice(cursor,last).join('').trim());
   cursor=last;
  }
  measure.remove();
  if(cursor<words.length)chunks.push(words.slice(cursor).join('').trim());
  // Keep a cached result only if we really measured the open, laid-out book.
  if(measurable){
   if(cached.size>48)cached.clear();
   cached.set(key,chunks);
  }
  return chunks.length?chunks:[''];
 }

 function leaves(){return splitToFit(CHRISTMAS_STORY_CHAPTERS[chapter-1],scene);}
 function visible(count){
  const first=singlePage.matches?leaf:Math.floor(leaf/2)*2;
  return {first,last:Math.min(count-1,first+(singlePage.matches?0:1))};
 }
 function choose(target,sceneIndex=1,leafIndex=0){
  if(target<1||target>stage)return;
  chapter=target;scene=Math.min(6,Math.max(1,sceneIndex));
  leaf=Math.max(0,leafIndex);draw();
 }
 function go(step){
  const parts=leaves();
  const {first,last}=visible(parts.length);
  if(step>0){
   if(last+1<parts.length){leaf=last+1;draw();return;}
   if(scene<SCENES_PER_CHAPTER){scene++;leaf=0;draw();return;}
   if(chapter<stage)choose(chapter+1,1,0);
  }else{
   if(first>0){leaf=singlePage.matches?first-1:Math.max(0,first-2);draw();return;}
   if(scene>1){scene--;leaf=Math.max(0,splitToFit(CHRISTMAS_STORY_CHAPTERS[chapter-1],scene).length-1);draw();return;}
   if(chapter>1){
    chapter--;scene=6;leaf=Math.max(0,leaves().length-1);draw();
   }
  }
 }

 function draw(){
  if(drawInProgress)return;
  drawInProgress=true;
  try{
   const item=CHRISTMAS_STORY_CHAPTERS[chapter-1];
   if(badge)badge.textContent=stage+' / 10 Kapitel · '+(stage*6)+' / '+CHRISTMAS_STORY_TOTAL_PAGES+' Abschnitte frei';
   if(mini)mini.textContent=stage+' / 10 Kapitel';
   nav.replaceChildren();
   for(const c of CHRISTMAS_STORY_CHAPTERS){
    const open=c.level<=stage,selected=c.level===chapter;
    const btn=node('button','storybook-chapter'+(selected?' is-current':'')+(open?' is-open':' is-locked'));
    btn.type='button';btn.disabled=!open;
    btn.setAttribute('aria-label',open?'Kapitel '+c.level+': '+c.title:'Kapitel '+c.level+' gesperrt');
    if(selected)btn.setAttribute('aria-current','step');
    btn.append(node('span','storybook-chapter-number',String(c.level).padStart(2,'0')),
     node('span','storybook-chapter-name',open?c.title:'Noch verschlossen'),
     node('span','storybook-chapter-status',open?'6 Abschnitte':'🔒 Baumstufe '+c.level));
    if(open)btn.addEventListener('click',()=>choose(c.level));
    nav.append(btn);
   }

   const parts=leaves();
   leaf=Math.min(Math.max(0,leaf),parts.length-1);
   const {first,last}=visible(parts.length);
   const frame=node('div','storybook-spread storybook-spread--textonly');
   frame.append(makeLeaf(item,scene,first,parts.length,'left',parts[first]).paper);
   if(last>first)frame.append(makeLeaf(item,scene,last,parts.length,'right',parts[last]).paper);

   const toolbar=node('div','storybook-turnbar');
   const prev=node('button','storybook-turn storybook-turn--prev','‹ Vorherige Buchseite');
   prev.type='button';prev.disabled=chapter===1&&scene===1&&first===0;
   prev.setAttribute('aria-label','Zurückblättern');
   prev.addEventListener('click',()=>go(-1));
   const locator=node('div','storybook-pagination');
   const count=node('span','storybook-page-count',
    'Abschnitt '+scene+'/6 · Buchseite'+(first===last?' ':'n ')+
    (first+1)+(first===last?'':'–'+(last+1))+'/'+parts.length);
   count.setAttribute('role','status');count.setAttribute('aria-live','polite');
   const dots=node('div','storybook-page-dots');
   for(let i=1;i<=6;i++){
    const dot=node('button','storybook-page-dot'+(i===scene?' is-selected':''));
    dot.type='button';
    dot.setAttribute('aria-label','Abschnitt '+i+' lesen');
    if(i===scene)dot.setAttribute('aria-current','step');
    dot.addEventListener('click',()=>{scene=i;leaf=0;draw();});
    dots.append(dot);
   }
   locator.append(count,dots);
   const next=node('button','storybook-turn storybook-turn--next','Nächste Buchseite ›');
   next.type='button';
   next.disabled=chapter===stage&&scene===6&&last===parts.length-1;
   next.setAttribute('aria-label','Weiterblättern');
   next.addEventListener('click',()=>go(1));
   toolbar.append(prev,locator,next);
   reader.replaceChildren(frame,toolbar);
   reader.setAttribute('aria-label','Kapitel '+chapter+' von 10, Abschnitt '+scene+
    ' von 6, Buchseite '+(first+1)+' bis '+(last+1)+' von '+parts.length);
   action.hidden=false;
   action.textContent=stage<10?'🏘️ Zum Dorfausbau':'🎄 Zum Weihnachtsbaum';
   action.onclick=()=>openTab(stage<10?'buildings':'tree');
  }finally{drawInProgress=false;}
 }
 function render({treeLevel=1,isVerified=false,remaining=0}={}){
  const next=unlockedStoryChapters(treeLevel,isVerified);
  const advanced=isVerified&&hasVerification&&verified&&next>stage;
  const firstLive=isVerified&&!hasVerification;
  hasVerification=Boolean(isVerified);
  needed=Number.isInteger(remaining)?Math.max(0,remaining):0;
  const previous=stage;
  stage=next;verified=Boolean(isVerified);
  if(advanced||firstLive||chapter>stage){chapter=stage;scene=1;leaf=0;}
  if(advanced){
   banner.textContent='✨ Neues Kapitel freigeschaltet: '+CHRISTMAS_STORY_CHAPTERS[stage-1].title+' · 6 neue Abschnitte!';
   banner.hidden=false;
  }else if(!isVerified)banner.hidden=true;
  if(previous!==stage)cached.clear();
  draw();
 }
 reader.addEventListener('keydown',event=>{
  if(event.target!==reader)return;
  if(event.key==='ArrowRight'){event.preventDefault();go(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();go(-1);}
 });
 let lastWidth=0,lastHeight=0;
 const relayout=()=>{
  const rect=reader.getBoundingClientRect();
  const w=Math.round(rect.width),h=Math.round(window.innerHeight||0);
  if(w>100&&(w!==lastWidth||h!==lastHeight)){
   lastWidth=w;lastHeight=h;cached.clear();draw();
  }
 };
 if(typeof ResizeObserver!=='undefined'){
  const observer=new ResizeObserver(relayout);
  observer.observe(reader);
 }
 if(singlePage.addEventListener)singlePage.addEventListener('change',()=>{
  leaf=0;cached.clear();draw();
 });
 window.addEventListener('resize',relayout);
 if(document.fonts?.ready)document.fonts.ready.then(()=>{cached.clear();draw();});
 let touchX=null,touchY=null;
 reader.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||!event.target.closest('.storybook-spread'))return;
  touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;
 },{passive:true});
 reader.addEventListener('touchend',event=>{
  if(touchX===null||touchY===null||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY;
  touchX=null;touchY=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5){
   if(dx<0)go(1);
   else go(-1);
  }
 },{passive:true});
 render();
 return {render,openLatest:()=>choose(stage)};
}
