import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DOG_VIDEO_CATALOG,DOG_VIDEO_IDS,getDogFilm} from '../DOG/video-library-catalog.js';
import {filteredDogVideoLibrary} from '../DOG/video-library.js';

const read=path=>readFileSync(new URL('../DOG/'+path,import.meta.url),'utf8');
const ids=new Set(DOG_VIDEO_IDS);
test('Videothek has all 10 existing story/lobby films and their actual multi-part clips',()=>{
 assert.equal(DOG_VIDEO_CATALOG.length,10);
 assert.equal(ids.size,10);
 assert.deepEqual(DOG_VIDEO_CATALOG.filter(f=>f.id.startsWith('building-')).map(f=>f.id),[
  'building-bakery','building-workshop','building-inn','building-tower','building-luckhouse']);
 assert.equal(getDogFilm('intro').clips.length,4);
 assert.equal(getDogFilm('tree-2').clips.length,2);
 assert.equal(getDogFilm('tree-3').clips.length,2);
 assert.equal(getDogFilm('building-workshop').clips.length,2);
 assert.equal(getDogFilm('building-inn').clips.length,4);
 assert.equal(getDogFilm('building-tower').clips.length,4);
 assert.equal(getDogFilm('building-luckhouse').clips.length,4);
 assert.equal(getDogFilm('first-light').clips.length,1);
 for(const movie of DOG_VIDEO_CATALOG)for(const relative of movie.clips){
  assert.ok(relative.startsWith('./assets/'),'only existing own assets may play');
  assert.equal(existsSync(new URL('../DOG/'+relative.slice(2),import.meta.url)),true,
   movie.id+' missing video '+relative);
 }
});
test('only explicit server-available film ids pass the gallery filter',()=>{
 assert.deepEqual(filteredDogVideoLibrary([],[]),[]);
 const allowed=['welcome','tree-2','building-bakery'];
 const list=filteredDogVideoLibrary(allowed,['tree-2']);
 assert.deepEqual(list.map(x=>x.id),allowed);
 assert.deepEqual(list.map(x=>x.watched),[false,true,false]);
 assert.deepEqual(filteredDogVideoLibrary(allowed,['tree-2'],'Weihnachtsbaum').map(x=>x.id),['tree-2']);
 assert.deepEqual(filteredDogVideoLibrary(allowed,['tree-2'],'Gebäudegeschichten').map(x=>x.id),['building-bakery']);
 assert.deepEqual(filteredDogVideoLibrary(['unknown','../../secret'],[]),[]);
 assert.equal(getDogFilm('tree-9'),null);
});
test('hamburger menu gains Videothek alongside existing Christmas and fullscreen links',()=>{
 const html=read('index.html'),shell=read('ui-shell.js'),viewer=read('video-library.js');
 const all=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(all.length,new Set(all).size,'no DOM id duplicates');
 for(const id of [
  'dog-menu-toggle','fullscreen-button','appearance-button',
  'dog-video-library-open','dog-christmas-event-link',
  'dog-video-library','dog-video-library-close','dog-video-library-cards',
  'dog-video-library-player','dog-video-library-filter','dog-video-library-loading',
  'dog-video-library-progress','dog-video-library-play','dog-video-library-next'
 ])assert.equal(all.filter(x=>x===id).length,1,id);
 assert.ok(html.indexOf('id="dog-video-library-open"')>html.indexOf('id="rules-button"'));
 assert.ok(html.indexOf('id="dog-video-library-open"')<html.indexOf('id="dog-christmas-event-link"'));
 assert.match(shell,/initDogVideoLibrary\(\)/);
 assert.match(viewer,/dialog\.showModal\(\)/);
 assert.match(viewer,/player\.pause\(\)/);
 assert.match(html,/video-library\.css\?v=/);
});
test('film viewing is read-only except a single completed-playback receipt',()=>{
 const viewer=read('video-library.js'),watched=read('video-library-watched.js');
 assert.match(viewer,/isAvailable\(id\)/,'film selected only if server made it available');
 assert.match(viewer,/\/api\/hub\/dog\/video-library/);
 assert.match(viewer,/if\(!failed&&played===active\.clips\.length\)/);
 assert.match(viewer,/markDogVideoSeen\(active\.id\)/);
 assert.doesNotMatch(viewer,/setInterval|onSnapshot|runTransaction|firebase\.firestore|setDoc/);
 assert.match(watched,/localStorage\.getItem\(key\)==='1'/);
 assert.match(watched,/\/video-library\/seen/);
 assert.doesNotMatch(watched,/runTransaction|firebase\.firestore/);
 for(const script of ['christmas-tree-films.js','christmas-building-films.js',
  'christmas-first-light-film.js','christmas-intro-gate.js','room-lobby-video.js']){
  assert.match(read(script),/markDogVideoSeen\(/,'original film is linked to archive: '+script);
 }
});
test('Videothek styling is responsive and does not replace board controls',()=>{
 const css=read('video-library.css'),html=read('index.html');
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/aspect-ratio:16\/9/);
 assert.match(css,/prefers-reduced-motion/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.match(html,/id="board" class="board-svg"/);
});
