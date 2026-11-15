import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {META_ALBUM_THEMES,META_ALBUM_PICTURES,metaAlbumThemeById,
 metaAlbumPage,metaAlbumPageCount,META_ALBUM_PAGE_SIZE,isMetaAlbumPictureUnlocked} from '../meta-album-catalog.js';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('twelve distinct pictures, six per page and two complete leaves',()=>{
 assert.equal(META_ALBUM_THEMES.length,1);
 assert.equal(META_ALBUM_PICTURES.length,12);
 assert.equal(META_ALBUM_PAGE_SIZE,6);
 assert.equal(metaAlbumPageCount(META_ALBUM_THEMES[0]),2);
 assert.equal(metaAlbumPage(META_ALBUM_THEMES[0],0).pictures.length,6);
 assert.equal(metaAlbumPage(META_ALBUM_THEMES[0],1).pictures.length,6);
 assert.equal(metaAlbumPage(META_ALBUM_THEMES[0],1).emptySlots,0);
 assert.equal(metaAlbumThemeById('weihnachtsevent-1'),META_ALBUM_THEMES[0]);
 assert.equal(new Set(META_ALBUM_PICTURES.map(p=>p.id)).size,12);
 assert.equal(new Set(META_ALBUM_PICTURES.map(p=>p.unlockId)).size,12);
 for(const p of META_ALBUM_PICTURES){
  assert.equal(p.status,'locked');
  assert.match(p.unlockId,/^meta:christmas1:picture:\d{2}$/);
  assert.match(p.image,/^assets\/meta-sammelalbum\/bilder\/\d{2}_[a-z_]+\.png$/);
  assert.ok(existsSync(new URL('../'+p.fallbackImage,import.meta.url)),p.fallbackImage);
 }
});
test('tree is only earned at level 10 and all four building pictures at level 5',()=>{
 const tree=META_ALBUM_PICTURES.find(p=>p.kind==='tree');
 const buildings=META_ALBUM_PICTURES.filter(p=>p.kind==='building');
 assert.equal(tree.requiredLevel,10);
 assert.equal(tree.name,'Weihnachtsbaum');
 assert.equal(buildings.length,4);
 assert.ok(buildings.every(p=>p.requiredLevel===5));
 assert.deepEqual(new Set(buildings.map(p=>p.buildingId)),new Set(['tower','workshop','bakery','inn']));
 assert.equal(META_ALBUM_PICTURES.filter(p=>p.kind==='planned').length,7);
});
test('only authenticated Render-verified Lichtertal status unlocks, not Bingo or previews',()=>{
 const tree=META_ALBUM_PICTURES[0],other=META_ALBUM_PICTURES[1],later=META_ALBUM_PICTURES[8];
 const status={version:2,eventId:'weihnachtsevent-1',source:'dog-lichtertal-event',
  unlockedIds:[tree.unlockId],milestones:[{id:tree.id,unlockId:tree.unlockId,state:'unlocked'}]};
 assert.equal(isMetaAlbumPictureUnlocked(tree,status),true);
 assert.equal(isMetaAlbumPictureUnlocked(other,status),false);
 assert.equal(isMetaAlbumPictureUnlocked(tree,{...status,source:'dog-season-2-bingo-rewards'}),false);
 assert.equal(isMetaAlbumPictureUnlocked(tree,{...status,unlockedIds:[]}),false);
 assert.equal(isMetaAlbumPictureUnlocked(later,{...status,unlockedIds:[later.unlockId],
   milestones:[{id:later.id,unlockId:later.unlockId,state:'unlocked'}]}),false);
 assert.equal(isMetaAlbumPictureUnlocked(tree,null),false);
});
test('album remains book-only, with profile authentication, popup and zero client writes',()=>{
 const js=source('../meta-sammelalbum.js');
 const html=source('../meta-sammelalbum.html');
 const css=source('../meta-sammelalbum.css');
 assert.match(js,/const unlocked=isUnlocked\(pic\)/);
 assert.match(js,/meta\.unlockedIds/);
 assert.match(js,/getIdToken\(\)/);
 assert.match(js,/method:'GET'/);
 assert.doesNotMatch(js,/method:'POST'|\.setItem\(|localStorage/);
 assert.match(js,/function changePage\(step\)/);
 assert.match(js,/pointerup/);
 assert.match(html,/meta-sammelalbum\.js\?v=9/);
 assert.match(html,/id="meta-picture-dialog"/);
 assert.match(html,/id="meta-album-feedback"/);
 assert.match(html,/profile-auth\.js/);
 assert.match(css,/weihnachts_sammelalbum_buch_transparent\.png/);
 assert.ok(existsSync(new URL('../assets/meta-sammelalbum/weihnachts_sammelalbum_buch_transparent.png',import.meta.url)));
});

test('new individual art uses verified upload names and old art as safe fallback',()=>{
 const js=source('../meta-sammelalbum.js');
 assert.deepEqual(META_ALBUM_PICTURES.map(p=>p.image.split('/').at(-1)),
  ["01_weihnachtsbaum.png","02_weihnachtsbaeckerei.png","03_wichtelwerkstatt.png","04_weihnachtslichter_turm.png","05_friedensherberge.png","06_geschenkefabrik.png","07_weihnachtsmarkt.png","08_lebkuchenhaus.png","09_rentierstall.png","10_schneemannplatz.png","11_schlittenwerkstatt.png","12_weihnachtspostamt.png"]);
 assert.match(js,/image\.dataset\.fallbackUsed/);
 assert.match(js,/image\.src=new URL\(item\.fallbackImage,here\)\.href/);
});
