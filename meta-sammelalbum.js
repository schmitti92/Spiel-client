import {META_ALBUM_THEMES,metaAlbumThemeById,isMetaAlbumPictureUnlocked,metaAlbumPage,metaAlbumPageCount} from './meta-album-catalog.js?v=2';
// Preview-only. Absolutely no local grants, inventory writes, Firestore reads,
// background timers or fake progress are allowed in this first version.
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const here=new URL('./',import.meta.url);
const backAllowlist=['hub-lobby.html','index.html','spielauswahl-lokal.html','spielauswahl-online.html'];
function safeBackUrl(){
 try{
  const raw=params.get('return')||'hub-lobby.html';
  const next=new URL(raw,here);
  const allowed=backAllowlist.some(file=>next.pathname===new URL(file,here).pathname);
  if(next.origin!==location.origin||!allowed)throw Error('UNSAFE_RETURN');
  return next.href;
 }catch{return new URL('hub-lobby.html',here).href;}
}
$('meta-back-top').href=safeBackUrl();
const first=metaAlbumThemeById(params.get('theme'));
let theme=first,selected='';
const requestedPage=Number(params.get('page'));
let pageIndex=Number.isInteger(requestedPage)&&requestedPage>=1?
 Math.min(metaAlbumPageCount(theme)-1,requestedPage-1):0;
// Deep-linking to page 2 must highlight an image actually visible on that page.
// No picture selected until the user taps a frame.
function dom(tag,className='',value){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(value!==undefined)node.textContent=String(value);
 return node;
}
function imageOf(item){
 const image=dom('img');
 image.src=new URL(item.image,here).href;
 image.alt=item.name+' – Vorschau des später freischaltbaren Weihnachtsbildes';
 image.loading='lazy';image.decoding='async';
 image.addEventListener('error',()=>{
  image.hidden=true;
  const parent=image.parentElement;
  if(parent&&!parent.querySelector('.meta-image-fallback')){
   parent.append(dom('span','meta-image-fallback',item.icon+' Bild nicht verfügbar'));
  }
 });
 return image;
}
function closeThemeMenu(){
 $('meta-theme-list').hidden=true;
 $('meta-theme-toggle').setAttribute('aria-expanded','false');
}
$('meta-theme-toggle').addEventListener('click',()=>{
 const next=!$('meta-theme-list').hidden;
 $('meta-theme-list').hidden=next;
 $('meta-theme-toggle').setAttribute('aria-expanded',String(!next));
});
document.addEventListener('pointerdown',event=>{
 if(!event.target.closest('.meta-theme-picker'))closeThemeMenu();
});
function themeMenu(){
 const nav=$('meta-theme-list');nav.replaceChildren();
 $('meta-theme-toggle').textContent=theme.icon+' '+theme.title+' ▾';
 for(const item of META_ALBUM_THEMES){
  const button=dom('button','meta-theme-button'+(item.id===theme.id?' selected':''));
  button.type='button';button.setAttribute('aria-current',item.id===theme.id?'page':'false');
  button.append(dom('span','meta-theme-icon',item.icon));
  const copy=dom('span','meta-theme-copy');
  copy.append(dom('strong','',item.title),dom('small','',item.subtitle));
  const unlocked=item.pictures.filter(pic=>isMetaAlbumPictureUnlocked(pic)).length;
  button.append(copy,dom('span','meta-theme-count',unlocked+'/'+item.pictures.length));
  button.addEventListener('click',()=>{
   theme=item;selected='';pageIndex=0;closeThemeMenu();
   const url=new URL(location.href);url.searchParams.set('theme',item.id);url.searchParams.delete('page');
   history.replaceState(null,'',url);
   render();
  });
  nav.append(button);
 }
}
function drawGallery(){
 const grid=$('meta-picture-grid');grid.replaceChildren();
 const page=metaAlbumPage(theme,pageIndex);
 pageIndex=page.index;
 for(const pic of page.pictures){
  // This method must stay fail-closed until real verified server grants exist.
  const unlocked=isMetaAlbumPictureUnlocked(pic);
  const button=dom('button','meta-picture-card'+(pic.id===selected?' selected':'')+(!unlocked?' locked':''));
  button.type='button';button.setAttribute('aria-pressed',String(pic.id===selected));
  button.setAttribute('aria-label',pic.name+' – '+(unlocked?'Gesammelt':'Gesperrt – Vorschau ansehen'));
  const artwork=dom('span','meta-picture-artwork');
  artwork.append(imageOf(pic));
  if(!unlocked)artwork.append(dom('span','meta-picture-lock','🔒'));
  button.append(artwork);
  button.append(dom('span','meta-picture-index','BILD '+String(pic.number).padStart(2,'0')+' / '+String(theme.pictures.length).padStart(2,'0')));
  button.append(dom('strong','meta-picture-name',pic.name));
  button.append(dom('span','meta-picture-status',unlocked?'✓ Gesammelt':'🔒 Noch gesperrt'));
  button.addEventListener('click',()=>{
   selected=pic.id;
   drawGallery();
   drawDetail();
   $('meta-picture-dialog').showModal();
  });
  grid.append(button);
 }
 // Keep six fixed slots, but never invent three additional collectible items.
 for(let n=0;n<page.emptySlots;n++){
  const empty=dom('div','meta-book-empty');
  empty.setAttribute('aria-label','Freier Albumplatz ohne Sammelbild');
  empty.append(dom('span','meta-book-empty-ornament','✧'),
   dom('small','', 'Freier Albumplatz'));
  grid.append(empty);
 }
 $('meta-book-position').textContent='Seite '+(page.index+1)+' von '+page.count;
 $('meta-book-prev').disabled=page.index===0;
 $('meta-book-next').disabled=page.index===page.count-1;
}
function drawDetail(){
 const root=$('meta-picture-detail');
 const pic=theme.pictures.find(p=>p.id===selected);
 root.replaceChildren();
 if(!pic){root.append(dom('p','','Kein Bild ausgewählt.'));return;}
 const artwork=dom('div','meta-detail-artwork');
 artwork.append(imageOf(pic),dom('span','meta-detail-lock','🔒 VORSCHAU · GESPERRT'));
 const info=dom('div','meta-detail-info');
 const title=dom('h2','meta-detail-title',pic.icon+' '+pic.name);
 title.id='meta-dialog-title';
 info.append(title);
 info.append(dom('p','meta-detail-description',pic.description));
 info.append(dom('p','meta-detail-message','🎁 Später im Weihnachtsevent 1 freischaltbar.'));
 const disabled=dom('button','meta-detail-disabled','🔒 Noch nicht freigeschaltet');
 disabled.type='button';disabled.disabled=true;
 info.append(disabled,dom('small','meta-detail-footnote','Nur Vorschau – keine Freischaltung.'));
 root.append(artwork,info);
}
const dialog=$('meta-picture-dialog');
$('meta-dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{
 // Restore focus to the same thumbnail where possible.
 const trigger=[...$('meta-picture-grid').querySelectorAll('.meta-picture-card')]
  .find(node=>node.getAttribute('aria-label')?.startsWith(theme.pictures.find(p=>p.id===selected)?.name+' –'));
 if(trigger?.isConnected)trigger.focus({preventScroll:true});
});
/** Clone the currently visible sheet as a temporary turning leaf.
 * Old content rotates away and the next page is rendered underneath.
 * Reduced-motion users see an instant switch, with no animation.
 */
function turningLeaf(direction){
 const sheet=$('meta-book-sheet');
 sheet.querySelector('.meta-turn-leaf')?.remove();
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const leaf=dom('div','meta-turn-leaf '+(direction>0?'turn-next':'turn-prev'));
 leaf.setAttribute('aria-hidden','true');
 leaf.inert=true;
 for(const child of [...sheet.children]){
  const clone=child.cloneNode(true);
  clone.removeAttribute('id');
  // Avoid duplicate IDs for the grid and the book-page label in the snapshot.
  clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  leaf.append(clone);
 }
 sheet.append(leaf);
 leaf.addEventListener('animationend',()=>leaf.remove(),{once:true});
}
function changePage(step){
 const next=pageIndex+step;
 if(next<0||next>=metaAlbumPageCount(theme))return;
 turningLeaf(step);
 pageIndex=next;
 selected='';
 const url=new URL(location.href);
 url.searchParams.set('page',String(pageIndex+1));
 history.replaceState(null,'',url);
 render();
}
$('meta-book-prev').addEventListener('click',()=>changePage(-1));
$('meta-book-next').addEventListener('click',()=>changePage(1));
// Tablet/phone navigation: horizontal swipes only, never vertical scrolling.
let swipeStart=null;
$('meta-book-sheet').addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'||!event.isPrimary)return;
 swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};
});
$('meta-book-sheet').addEventListener('pointerup',event=>{
 if(!swipeStart||event.pointerId!==swipeStart.id)return;
 const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;
 swipeStart=null;
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35)changePage(dx<0?1:-1);
});
$('meta-book-sheet').addEventListener('pointercancel',()=>{swipeStart=null;});
// Arrow keys do not interfere with selecting a picture or focusing a field.
document.addEventListener('keydown',event=>{
 if(dialog.open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('button,input,textarea,select'))return;
 if(event.key==='ArrowRight'){event.preventDefault();changePage(1);}
 if(event.key==='ArrowLeft'){event.preventDefault();changePage(-1);}
});
function render(){
 themeMenu();
 $('meta-theme-title').textContent=theme.icon+' '+theme.title;
 $('meta-theme-description').textContent=theme.description;
 const collected=theme.pictures.filter(pic=>isMetaAlbumPictureUnlocked(pic)).length;
 $('meta-theme-progress').textContent=collected+' / '+theme.pictures.length+' gesammelt';
 const total=META_ALBUM_THEMES.reduce((n,item)=>n+item.pictures.length,0);
 const owned=META_ALBUM_THEMES.reduce((n,item)=>n+item.pictures.filter(pic=>isMetaAlbumPictureUnlocked(pic)).length,0);
 $('meta-overall-count').textContent=owned+' / '+total;
 drawGallery();
}
render();
