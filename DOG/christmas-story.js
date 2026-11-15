/**
 * Lichtertal storybook reader.
 * Ten real village-tree chapters × six book pages. No extra database calls,
 * no client unlocks, and no display of future story pages before unlock.
 */
import {CHRISTMAS_STORY_CHAPTERS, CHRISTMAS_STORY_TOTAL_PAGES} from './christmas-storybook-data.js?v=1';
export {CHRISTMAS_STORY_CHAPTERS};
export function unlockedStoryChapters(stage,verified){
  if(!verified)return 1;
  return Math.min(10,Math.max(1,Number.isInteger(stage)?stage:1));
}

const villageScene='./weihnachtsevent-bilder/leere_winterdorf_plaza_im_mondlicht.png';
const artSets=[
 [villageScene,'./weihnachtsevent-bilder/Herberge_Stufe_1.png','./weihnachtsevent-bilder/weihnachtsbaum_stufe_1.png'],
 ['./weihnachtsevent-bilder/Herberge_Stufe_2.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_2.png'],
 ['./weihnachtsevent-bilder/weihnachtsbaeckerei_stufe_2.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_3.png'],
 ['./weihnachtsevent-bilder/Wichtelwerkstatt_Stufe_2.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_4.png'],
 [villageScene,'./weihnachtsevent-bilder/Herberge_Stufe_3.png','./weihnachtsevent-bilder/weihnachtsbaum_stufe_5.png'],
 ['./weihnachtsevent-bilder/Herberge_Stufe_4.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_6.png'],
 ['./weihnachtsevent-bilder/Wichtelwerkstatt_Stufe_4.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_7.png'],
 [villageScene,'./weihnachtsevent-bilder/Herberge_Stufe_5.png','./weihnachtsevent-bilder/weihnachtsbaum_stufe_8.png'],
 ['./weihnachtsevent-bilder/weihnachtsbaeckerei_stufe_5.png',villageScene,'./weihnachtsevent-bilder/weihnachtsbaum_stufe_9.png'],
 [villageScene,'./weihnachtsevent-bilder/weihnachtslichter_turm_stufe_5.png','./weihnachtsevent-bilder/weihnachtsbaum_stufe_10.png']
];
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
 const choose=(target,begin=1)=>{
  if(target<1||target>stage)return;
  chapter=target;
  page=Math.min(6,Math.max(1,begin));
  draw();
 };
 const go=(step)=>{
  if(step===1&&page===6&&chapter<stage){choose(chapter+1);return;}
  if(step===-1&&page===1&&chapter>1){choose(chapter-1,6);return;}
  page=Math.max(1,Math.min(6,page+step));
  draw();
 };
 const draw=()=>{
  const current=CHRISTMAS_STORY_CHAPTERS[chapter-1];
  const [heading,body]=current.pages[page-1];
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

  const frame=node('div','storybook-spread');
  const illustration=node('figure','storybook-illustration');
  const image=node('img','storybook-scene');
  image.loading='lazy';image.decoding='async';
  image.src=artSets[chapter-1][Math.floor((page-1)/2)%3];
  image.alt='Winterliche Illustration zu '+current.title+', '+heading;
  image.addEventListener('error',()=>{
   if(!image.src.endsWith('leere_winterdorf_plaza_im_mondlicht.png'))image.src=villageScene;
  },{once:true});
  const figcaption=node('figcaption','storybook-picture-caption','LICHTERTAL · '+current.tree.toUpperCase());
  illustration.append(image,figcaption);
  const paper=node('div','storybook-paper');
  const edition=node('div','storybook-page-kicker','KAPITEL '+String(chapter).padStart(2,'0')+' · '+current.tree.toUpperCase());
  const title=node('h3','storybook-page-heading',heading);
  const text=node('p','storybook-page-text',body);
  const theme=node('div','storybook-page-thought');
  theme.append(node('span','storybook-small-star','✧'),node('span','',current.theme));
  const footer=node('div','storybook-page-footer');
  footer.append(node('span','',current.icon+' '+current.title),node('strong','',''+((chapter-1)*6+page)));
  paper.append(edition,title,text,theme,footer);

  frame.append(illustration,paper);
  const toolbar=node('div','storybook-turnbar');
  const prev=node('button','storybook-turn storybook-turn--prev','‹ Vorherige Seite');
  prev.type='button';
  prev.disabled=chapter===1&&page===1;
  prev.addEventListener('click',()=>go(-1));
  const locator=node('div','storybook-pagination');
  const count=node('span','storybook-page-count','Seite '+page+' von 6');
  count.setAttribute('role','status');count.setAttribute('aria-live','polite');
  const dots=node('div','storybook-page-dots');
  for(let i=1;i<=6;i++){
   const dot=node('button','storybook-page-dot'+(page===i?' is-selected':''));
   dot.type='button';
   dot.setAttribute('aria-label','Seite '+i+' lesen');
   if(page===i)dot.setAttribute('aria-current','page');
   dot.addEventListener('click',()=>choose(chapter,i));
   dots.append(dot);
  }
  locator.append(count,dots);
  const next=node('button','storybook-turn storybook-turn--next',
     page===6&&chapter<stage?'Nächstes Kapitel ›':'Nächste Seite ›');
  next.type='button';
  next.disabled=page===6&&chapter===stage;
  next.addEventListener('click',()=>go(1));
  toolbar.append(prev,locator,next);

  reader.replaceChildren(frame,toolbar);
  reader.setAttribute('aria-label','Kapitel '+chapter+' von 10, Seite '+page+' von 6: '+heading);

  // This last action is informational navigation, never a client-side upgrade.
  if(page===6&&chapter===stage){
   action.hidden=false;
   action.textContent=stage<10?'🏠 Zum Dorfausbau – nächstes Kapitel freischalten':'🎄 Zum Weihnachtsbaum';
   action.onclick=()=>openTab(stage<10?'buildings':'tree');
  }else{
   action.hidden=true;
   action.onclick=null;
  }
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
 // Left/right arrow on the focused book (not browser-wide, not in other tabs).
 reader.addEventListener('keydown',event=>{
  if(event.target.closest('button,input,textarea,select'))return;
  if(event.key==='ArrowRight'&&!(page===6&&chapter===stage)){event.preventDefault();go(1);}
  if(event.key==='ArrowLeft'&&!(page===1&&chapter===1)){event.preventDefault();go(-1);}
 });
 render();
 return {render,openLatest:()=>choose(stage,1)};
}
