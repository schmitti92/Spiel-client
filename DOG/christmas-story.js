/**
 * Lichtertal storybook reader.
 * Ten real village-tree chapters × six book pages. No extra database calls,
 * no client unlocks, and no display of future story pages before unlock.
 */
import {CHRISTMAS_STORY_CHAPTERS, CHRISTMAS_STORY_TOTAL_PAGES} from './christmas-storybook-data.js?v=3';
export {CHRISTMAS_STORY_CHAPTERS};
export function unlockedStoryChapters(stage,verified){
  if(!verified)return 1;
  return Math.min(10,Math.max(1,Number.isInteger(stage)?stage:1));
}

// The storybook is text-only. Existing personal photos remain in the gallery,
// but no photos are requested or rendered by the story reader.

function node(tag,className,txt){
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(txt!==undefined)n.textContent=String(txt);
 return n;
}
export function initChristmasStory({openTab}){
 const $=id=>document.getElementById(id);
 const nav=$('story-chapter-list'), reader=$('story-reading'),
  banner=$('story-upgrade-banner'), action=$('story-next-action'),
  badge=$('story-book-unlocked'), mini=$('tab-story')?.querySelector('small');
 if(!nav||!reader||!action||!banner)throw Error('STORY_READER_MISSING');

 let stage=1,verified=false,chapter=1,page=1,needed=0,hasVerification=false;
 const narrowLayout=window.matchMedia('(max-width: 650px)');
 const visiblePages=()=>{
  const first=narrowLayout.matches?page:(2*Math.floor((page-1)/2)+1);
  return {first,last:Math.min(6,first+(narrowLayout.matches?0:1))};
 };
 const choose=(target,begin=1)=>{
  if(target<1||target>stage)return;
  chapter=target;
  page=Math.min(6,Math.max(1,begin));
  draw();
 };
 const go=(step)=>{
  const {first,last}=visiblePages();
  const destination=step>0?last+1:first-1;
  if(destination>6){if(chapter<stage)choose(chapter+1,1);return;}
  if(destination<1){if(chapter>1)choose(chapter-1,narrowLayout.matches?6:5);return;}
  page=destination;
  draw();
 };
 const makePage=(item,number,side)=>{
  const [heading,body]=item.pages[number-1];
  const paper=node('section','storybook-paper storybook-paper--'+side);
  paper.setAttribute('aria-label','Seite '+number+' von 6: '+heading);
  const edition=node('div','storybook-page-kicker','KAPITEL '+String(chapter).padStart(2,'0')+' · '+item.tree.toUpperCase());
  const title=node('h3','storybook-page-heading',side==='left'?item.title:heading);
  const subtitle=node('div','storybook-page-subtitle','SEITE '+number+' VON 6 · '+(side==='left'?heading:'Fortsetzung'));
  const story=node('div','storybook-page-text',body);
  story.setAttribute('tabindex','0');
  story.setAttribute('aria-label','Geschichtentext, Seite '+number+' von 6');
  const theme=node('div','storybook-page-thought');
  if(side==='left')theme.append(node('span','storybook-small-star','✧'),node('span','',item.theme));
  else theme.textContent='✧ '+item.theme;
  const footer=node('div','storybook-page-footer');
  footer.append(node('span','',item.icon+' '+item.title),node('strong','',String((chapter-1)*6+number)));
  paper.append(edition,title,subtitle,story,theme,footer);
  return paper;
 };
 const draw=()=>{
  const current=CHRISTMAS_STORY_CHAPTERS[chapter-1];
  const {first,last}=visiblePages();
  if(badge)badge.textContent=stage+' / 10 Kapitel · '+(stage*6)+' / '+CHRISTMAS_STORY_TOTAL_PAGES+' Seiten frei';
  if(mini)mini.textContent=stage+' / 10 Kapitel';
  nav.replaceChildren();
  for(const item of CHRISTMAS_STORY_CHAPTERS){
   const open=item.level<=stage,selected=item.level===chapter;
   const btn=node('button','storybook-chapter'+(selected?' is-current':'')+(open?' is-open':' is-locked'));
   btn.type='button';btn.disabled=!open;
   btn.setAttribute('aria-label',open?'Kapitel '+item.level+': '+item.title:'Kapitel '+item.level+' gesperrt');
   if(selected)btn.setAttribute('aria-current','step');
   btn.append(
    node('span','storybook-chapter-number',String(item.level).padStart(2,'0')),
    node('span','storybook-chapter-name',open?item.title:'Noch verschlossen'),
    node('span','storybook-chapter-status',open?'6 Buchseiten':'🔒 Baumstufe '+item.level)
   );
   if(open)btn.addEventListener('click',()=>choose(item.level,1));
   nav.append(btn);
  }

  const frame=node('div','storybook-spread storybook-spread--textonly');
  frame.append(makePage(current,first,'left'));
  if(last>first)frame.append(makePage(current,last,'right'));
  const toolbar=node('div','storybook-turnbar');
  const prev=node('button','storybook-turn storybook-turn--prev','‹ Vorherige Seite');
  prev.type='button';
  prev.disabled=chapter===1&&first===1;
  prev.setAttribute('aria-label','Vorherige Buchseite'+(narrowLayout.matches?'':'n'));
  prev.addEventListener('click',()=>go(-1));
  const locator=node('div','storybook-pagination');
  const count=node('span','storybook-page-count',
   first===last?'Seite '+first+' von 6':'Seiten '+first+'–'+last+' von 6');
  count.setAttribute('role','status');count.setAttribute('aria-live','polite');
  const dots=node('div','storybook-page-dots');
  for(let i=1;i<=6;i++){
   const active=i>=first&&i<=last;
   const dot=node('button','storybook-page-dot'+(active?' is-selected':''));
   dot.type='button';
   dot.setAttribute('aria-label','Seite '+i+' lesen');
   if(active)dot.setAttribute('aria-current','page');
   dot.addEventListener('click',()=>choose(chapter,i));
   dots.append(dot);
  }
  locator.append(count,dots);
  const next=node('button','storybook-turn storybook-turn--next',
   last===6&&chapter<stage?'Nächstes Kapitel ›':'Nächste Seite ›');
  next.type='button';
  next.disabled=last===6&&chapter===stage;
  next.setAttribute('aria-label',last===6&&chapter<stage?'Nächstes Kapitel':'Nächste Buchseite');
  next.addEventListener('click',()=>go(1));
  toolbar.append(prev,locator,next);
  reader.replaceChildren(frame,toolbar);
  reader.setAttribute('aria-label','Kapitel '+chapter+' von 10, '+(first===last?'Seite '+first:'Seiten '+first+' bis '+last)+' von 6');
  action.hidden=false;
  action.textContent=stage<10?'🏘️ Zum Dorfausbau':'🎄 Zum Weihnachtsbaum';
  action.onclick=()=>openTab(stage<10?'buildings':'tree');
 };
 const render=({treeLevel=1,isVerified=false,remaining=0}={})=>{
  const next=unlockedStoryChapters(treeLevel,isVerified);
  const advanced=isVerified&&hasVerification&&verified&&next>stage;
  const firstLive=isVerified&&!hasVerification;
  if(isVerified)hasVerification=true;
  else hasVerification=false;
  needed=Number.isInteger(remaining)?Math.max(0,remaining):0;
  const previous=stage;
  stage=next;verified=Boolean(isVerified);
  if(advanced||firstLive||chapter>stage){
    chapter=stage;page=1;
  }
  if(advanced){
   banner.textContent='✨ Neues Kapitel freigeschaltet: '+CHRISTMAS_STORY_CHAPTERS[stage-1].title+' · 6 neue Seiten!';
   banner.hidden=false;
  }else if(!isVerified){banner.hidden=true;}
  if(stage!==previous||!isVerified)page=Math.min(6,page);
  draw();
 };
 // Only the focused book responds to keyboard arrows; inside the story, arrow keys keep their scroll behavior.
 reader.addEventListener('keydown',event=>{
  if(event.target!==reader)return;
  if(event.key==='ArrowRight'){event.preventDefault();go(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();go(-1);}
 });
 // Keep both page counts and positions accurate when rotating a tablet or phone.
 if(narrowLayout.addEventListener)narrowLayout.addEventListener('change',draw);
 // Swiping in the open book turns pages. Vertical dragging still scrolls the text.
 let touchX=null,touchY=null;
 reader.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||!event.target.closest('.storybook-spread'))return;
  touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;
 },{passive:true});
 reader.addEventListener('touchend',event=>{
  if(touchX===null||touchY===null||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-touchX;
  const dy=event.changedTouches[0].clientY-touchY;
  touchX=null;touchY=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5){
   if(dx<0)go(1);
   if(dx>0)go(-1);
  }
 },{passive:true});
 render();
 return {render,openLatest:()=>choose(stage,1)};
}
