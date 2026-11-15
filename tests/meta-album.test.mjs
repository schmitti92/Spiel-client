import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {META_ALBUM_THEMES,META_ALBUM_PICTURES,metaAlbumThemeById,isMetaAlbumPictureUnlocked} from '../meta-album-catalog.js';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Meta-Sammelalbum has one extensible theme with nine unique Christmas Event 1 images',()=>{
 assert.equal(META_ALBUM_THEMES.length,1);
 const theme=META_ALBUM_THEMES[0];
 assert.equal(theme.id,'weihnachtsevent-1');
 assert.equal(theme.pictures.length,9);
 assert.equal(META_ALBUM_PICTURES.length,9);
 assert.equal(new Set(META_ALBUM_PICTURES.map(x=>x.id)).size,9);
 assert.equal(new Set(META_ALBUM_PICTURES.map(x=>x.unlockId)).size,9);
 assert.equal(metaAlbumThemeById('weihnachtsevent-1'),theme);
 assert.equal(metaAlbumThemeById('unknown'),theme);
 for(const [i,pic] of META_ALBUM_PICTURES.entries()){
  assert.equal(pic.number,i+1);
  assert.match(pic.unlockId,/^meta:christmas1:picture:\d\d$/);
  assert.equal(pic.status,'locked');
  assert.equal(isMetaAlbumPictureUnlocked(pic),false);
  assert.ok(existsSync(new URL('../'+pic.image,import.meta.url)),pic.image+' must exist in repository');
 }
});
test('Meta gallery remains preview-only until verified server grants exist',()=>{
 const frontend=source('../meta-sammelalbum.js');
 const html=source('../meta-sammelalbum.html');
 assert.match(frontend,/const unlocked=isMetaAlbumPictureUnlocked\(pic\)/);
 assert.match(frontend,/disabled\.disabled=true/);
 assert.doesNotMatch(frontend,/localStorage|sessionStorage|setItem|fetch\s*\(|\.post\(/);
 assert.match(html,/id="meta-theme-list"/);
 assert.match(html,/id="meta-picture-grid"/);
 assert.match(html,/id="meta-picture-detail"/);
 assert.match(html,/Eventfreischaltung in Vorbereitung/);
 assert.match(frontend,/safeBackUrl\(\)/);
});
test('Meta Sammelalbum is reachable from main, shared, local and DOG lobbies',()=>{
 assert.match(source('../hub-lobby.html'),/data-meta-album-link/);
 assert.match(source('../spielauswahl-lokal.html'),/data-meta-album-link/);
 assert.match(source('../index.html'),/meta-sammelalbum\.html\?return=index\.html/);
 assert.match(source('../hub-lobby.html'),/dog-room-meta-album/);
});

test('book pagination keeps six slots per page, nine real images and three empty places',async()=>{
 const {META_ALBUM_PAGE_SIZE,metaAlbumPageCount,metaAlbumPage}=await import('../meta-album-catalog.js');
 const event=META_ALBUM_THEMES[0];
 assert.equal(META_ALBUM_PAGE_SIZE,6);
 assert.equal(metaAlbumPageCount(event),2);
 const first=metaAlbumPage(event,0);
 assert.deepEqual([first.pictures.length,first.emptySlots,first.index,first.count],[6,0,0,2]);
 const second=metaAlbumPage(event,1);
 assert.deepEqual([second.pictures.length,second.emptySlots,second.index,second.count],[3,3,1,2]);
 assert.deepEqual([...first.pictures,...second.pictures].map(p=>p.id),META_ALBUM_PICTURES.map(p=>p.id));
 assert.equal(metaAlbumPage(event,20).index,1);
 assert.equal(metaAlbumPage(event,-20).index,0);
 assert.equal(metaAlbumPage({pictures:[]},0).emptySlots,6);
 const script=source('../meta-sammelalbum.js');
 const html=source('../meta-sammelalbum.html');
 const css=source('../meta-sammelalbum.css');
 assert.match(script,/metaAlbumPage\(theme,pageIndex\)/);
 assert.match(script,/for\(let n=0;n<page.emptySlots;n\+\+\)/);
 assert.match(script,/function changePage\(step\)/);
 assert.match(script,/pointerup/);
 assert.match(script,/prefers-reduced-motion: reduce/);
 assert.match(html,/id="meta-book-sheet"/);
 assert.match(html,/id="meta-book-prev"/);
 assert.match(html,/id="meta-book-next"/);
 assert.match(html,/id="meta-book-position"/);
 assert.match(css,/\.meta-turn-leaf/);
});
test('uploaded transparent Christmas book is the page artwork and all six frames are overlaid',()=>{
 const book='assets/meta-sammelalbum/weihnachts_sammelalbum_buch_transparent.png';
 assert.ok(existsSync(new URL('../'+book,import.meta.url)),'uploaded artwork must exist');
 const css=source('../meta-sammelalbum.css');
 const html=source('../meta-sammelalbum.html');
 const js=source('../meta-sammelalbum.js');
 assert.match(css,/url\("assets\/meta-sammelalbum\/weihnachts_sammelalbum_buch_transparent\.png"\)/);
 assert.match(css,/aspect-ratio:3 \/ 2/);
 assert.match(css,/--album-slots-left:10%/);
 assert.match(css,/--album-slots-top:19\.1%/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/meta-sammelalbum\.css\?v=4/);
 assert.match(js,/selected=theme\.pictures\[pageIndex\*6\]/);
 assert.match(js,/const unlocked=isMetaAlbumPictureUnlocked\(pic\)/,'locked rewards remain enforced');
});
