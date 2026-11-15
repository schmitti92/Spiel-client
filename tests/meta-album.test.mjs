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
