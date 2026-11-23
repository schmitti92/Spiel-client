import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {
 CHRISTMAS_BUILDING_FILMS,christmasBuildingFilmForUpgrade
} from '../DOG/christmas-building-films.js';
import {getDogFilm,DOG_VIDEO_IDS} from '../DOG/video-library-catalog.js';

const read=path=>readFileSync(new URL('../DOG/'+path,import.meta.url),'utf8');
const preview=read('lichtertal-gebaeudefilme-vorschau.html');
const match=preview.match(/const FILMS=(\{[^\n]+\});/);
assert.ok(match,'the approved preview must preserve the clip map');
const groups=JSON.parse(match[1]);
const ids=['bakery','workshop','inn','tower','luckhouse','academy'];

test('all 18 approved preview clips are registered exactly once at building level 2 → 3',()=>{
 assert.deepEqual(Object.keys(groups),ids);
 const allClips=[];
 for(const id of ids){
  const movie=christmasBuildingFilmForUpgrade(id,2,3);
  assert.ok(movie,id+' stage-3 story is missing');
  assert.equal(movie.fromLevel,2);
  assert.equal(movie.clips.length,3);
  assert.deepEqual(movie.clips.map(p=>p.split('/').at(-1)),groups[id].files,
   id+' scene order must match the approved preview');
  assert.equal(typeof movie.title,'string');
  assert.ok(movie.title.length>0);
  for(const p of movie.clips){
   assert.ok(p.startsWith('./assets/'));
   assert.equal(existsSync(new URL('../DOG/'+p.slice(2),import.meta.url)),true,
    id+' video does not exist: '+p);
   allClips.push(p);
  }
 }
 assert.equal(allClips.length,18);
 assert.equal(new Set(allClips).size,18,'no scene may accidentally be reused by another building');
});

test('existing final chapter movies remain available at level 4 → 5; stage 3 → 4 has no accidental movie',()=>{
 for(const id of ids){
  assert.equal(christmasBuildingFilmForUpgrade(id,1,2),null);
  assert.equal(christmasBuildingFilmForUpgrade(id,3,4),null);
  assert.equal(christmasBuildingFilmForUpgrade(id,4,4),null);
  assert.equal(christmasBuildingFilmForUpgrade(id,2,5),null);
  assert.equal(christmasBuildingFilmForUpgrade('unknown',2,3),null);
 }
 for(const id of ids.filter(id=>id!=='academy')){
  const film=christmasBuildingFilmForUpgrade(id,4,5);
  assert.ok(film,'existing level-5 story must remain available for '+id);
  assert.equal(film.fromLevel,4);
  assert.ok(film.clips.length>=1);
 }
 assert.equal(christmasBuildingFilmForUpgrade('academy',4,5),null);
});

test('all six movies are in the archive with stage-3 IDs distinct from the level-5 films',()=>{
 for(const id of ids){
  const archive=getDogFilm('building-'+id+'-3');
  assert.ok(archive,id+' archive entry missing');
  assert.equal(archive.clips.length,3);
  assert.deepEqual(archive.clips,CHRISTMAS_BUILDING_FILMS[id][3].clips);
  assert.ok(DOG_VIDEO_IDS.includes(archive.id));
 }
 for(const id of ids.filter(id=>id!=='academy')){
  assert.ok(getDogFilm('building-'+id));
 }
 assert.equal(getDogFilm('building-academy'),null,'no invented academy level-5 film');
});

test('player opens only from confirmed upgrade and keeps local preview behavior',()=>{
 const event=read('christmas-event.js');
 const player=read('christmas-building-films.js');
 assert.match(event,/result\.unchanged!==true&&buildingFilms\.showUpgrade\(id,level,upgradedLevel\)/);
 assert.match(event,/upgradedLevel===level\+1/);
 assert.match(player,/film\?\.fromLevel===fromLevel\?film:null/);
 assert.match(player,/data-film-prev/);
 assert.match(player,/data-film-next/);
 assert.match(player,/video\.addEventListener\('ended'/);
 assert.match(player,/if\(toLevel===5\)tryPlay\(\)/,
  'new stage-3 clips begin with manual Play; stage-5 playback is preserved');
 assert.match(player,/completedClips\.size===clips\(\)\.length/,
  'skipped clips may not generate a fully-watched receipt');
 assert.doesNotMatch(player,/onSnapshot|firebase\.firestore|setDoc\(|setInterval/,
  'viewing movies must not introduce Firebase reads or polling');
});
