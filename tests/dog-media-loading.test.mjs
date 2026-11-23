import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preferCompactDogCardImages,CARD_EDITIONS} from '../DOG/card-visuals.js';
test('data saver uses the published Nikolaus vector art instead of megabyte PNGs',()=>{
 assert.equal(preferCompactDogCardImages({saveData:true}),true);
 assert.equal(preferCompactDogCardImages({effectiveType:'2g'}),true);
 assert.equal(preferCompactDogCardImages({effectiveType:'4g',saveData:false}),false);
 assert.match(CARD_EDITIONS['kartendesign-05'].fallbackBase,/vektoren/);
 const s=readFileSync(new URL('../DOG/card-visuals.js',import.meta.url),'utf8');
 assert.match(s,/compact&&item\.fallbackBase/);
 assert.match(s,/decoding="async"/);
});
test('all on-demand DOG videos avoid metadata downloads until the viewer presses play',()=>{
 for(const name of ['room-lobby-video.js','christmas-first-light-film.js','christmas-tree-films.js','christmas-building-films.js','christmas-intro-gate.js']){
  const text=readFileSync(new URL('../DOG/'+name,import.meta.url),'utf8');
  assert.match(text,/preload=["']none["']/);
  assert.doesNotMatch(text,/preload=["']metadata["']/);
 }
 const game=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 assert.match(game,/id="dog-video-library-player"[^>]*preload="none"/);
});
