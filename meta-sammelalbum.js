import {META_ALBUM_THEMES,metaAlbumThemeById,isMetaAlbumPictureUnlocked} from './meta-album-catalog.js?v=1';
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
for(const id of ['meta-back-top','meta-back-bottom'])$(id).href=safeBackUrl();
const first=metaAlbumThemeById(params.get('theme'));
let theme=first,selected=first.pictures[0]?.id||'';
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
function themeMenu(){
 const nav=$('meta-theme-list');nav.replaceChildren();
 for(const item of META_ALBUM_THEMES){
  const button=dom('button','meta-theme-button'+(item.id===theme.id?' selected':''));
  button.type='button';button.setAttribute('aria-current',item.id===theme.id?'page':'false');
  button.append(dom('span','meta-theme-icon',item.icon));
  const copy=dom('span','meta-theme-copy');
  copy.append(dom('strong','',item.title),dom('small','',item.subtitle));
  button.append(copy,dom('span','meta-theme-count','0/'+item.pictures.length));
  button.addEventListener('click',()=>{
   theme=item;selected=item.pictures[0]?.id||'';
   const url=new URL(location.href);url.searchParams.set('theme',item.id);
   history.replaceState(null,'',url);
   render();
  });
  nav.append(button);
 }
}
function drawGallery(){
 const grid=$('meta-picture-grid');grid.replaceChildren();
 for(const pic of theme.pictures){
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
  button.addEventListener('click',()=>{selected=pic.id;drawGallery();drawDetail();});
  grid.append(button);
 }
}
function drawDetail(){
 const root=$('meta-picture-detail');
 const pic=theme.pictures.find(p=>p.id===selected);
 root.replaceChildren();
 if(!pic){root.append(dom('p','', 'Noch kein Bild ausgewählt.'));return;}
 root.append(dom('span','meta-detail-overline','Sammelbild '+String(pic.number).padStart(2,'0')+' von '+theme.pictures.length));
 const artwork=dom('div','meta-detail-artwork');
 artwork.append(imageOf(pic),dom('span','meta-detail-lock','🔒 VORSCHAU · GESPERRT'));
 root.append(artwork,dom('h3','meta-detail-title',pic.icon+' '+pic.name),dom('p','meta-detail-description',pic.description));
 root.append(dom('p','meta-detail-message','🎁 Dieses Bild kannst du später als Einzelbelohnung beim Weihnachtsevent 1 freischalten.'));
 const disabled=dom('button','meta-detail-disabled','🔒 Noch nicht freigeschaltet');
 disabled.type='button';disabled.disabled=true;
 root.append(disabled);
 root.append(dom('small','meta-detail-footnote','Dein Eventfortschritt ist noch nicht mit dem Meta-Sammelalbum verbunden. Die Vorschau vergibt keine Gewinne.'));
}
function render(){
 themeMenu();
 $('meta-theme-title').textContent=theme.icon+' '+theme.title;
 $('meta-theme-description').textContent=theme.description;
 const collected=theme.pictures.filter(pic=>isMetaAlbumPictureUnlocked(pic)).length;
 $('meta-theme-progress').textContent=collected+' / '+theme.pictures.length+' gesammelt';
 const total=META_ALBUM_THEMES.reduce((n,item)=>n+item.pictures.length,0);
 const owned=META_ALBUM_THEMES.reduce((n,item)=>n+item.pictures.filter(pic=>isMetaAlbumPictureUnlocked(pic)).length,0);
 $('meta-overall-count').textContent=owned+' / '+total;
 drawGallery();drawDetail();
}
render();
