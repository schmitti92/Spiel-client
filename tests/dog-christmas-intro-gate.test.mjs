import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('all DOG Christmas entrypoints are hidden until server-verified reveal',()=>{
 const intro=source('DOG/christmas-intro-gate.js');
 const hub=source('hub-lobby.html');
 const dog=source('DOG/index.html');
 const event=source('DOG/christmas-event.html');
 assert.match(intro,/\/api\/hub\/dog\/christmas-intro/);
 assert.match(intro,/state\.eligible&&state\.completed/);
 assert.match(intro,/state\.eligible&&!state\.completed/);
 assert.match(intro,/\/api\/hub\/dog\/stats/);
 assert.match(intro,/dog-christmas-portal-open/);
 assert.match(intro,/dog-christmas-video-seen-v1/);
 assert.match(hub,/html:not\(\.dog-christmas-portal-open\)/);
 assert.match(dog,/html:not\(\.dog-christmas-portal-open\)/);
 assert.match(hub,/mountChristmasLinks\(\)/);
 assert.match(dog,/mountChristmasLinks\(\)/);
 assert.match(event,/guardChristmasEventPage\(\)/);
 assert.doesNotMatch(event,/<script type="module" src="\.\/christmas-event\.js/);
});
test('four Lichtertal clips are published, playable and only start after Play',()=>{
 const intro=source('DOG/christmas-intro-gate.js');
 const clips=[
  '281209346_1795276244245420.mp4',
  '905698533_1795276252169292.mp4',
  '1072510991_1795276258065893.mp4',
  '658840420_1795276265000111.mp4'
 ];
 const poster=readFileSync(new URL('../DOG/assets/lichtertal-intro-poster.jpg',import.meta.url));
 assert.equal(poster[0],0xff);
 let previousIndex=-1;
 for(const filename of clips){
  const video=readFileSync(new URL('../DOG/assets/'+filename,import.meta.url));
  assert.ok(video.length>100000,'Clip is nonempty: '+filename);
  assert.equal(video.toString('latin1',4,8),'ftyp','valid MP4 header: '+filename);
  const index=intro.indexOf(filename);
  assert.ok(index>previousIndex,'clip order: '+filename);
  previousIndex=index;
 }
 assert.match(intro,/video\.autoplay=false/);
 assert.match(intro,/video\.controls=true/);
 assert.match(intro,/video\.muted=false/);
 assert.match(intro,/else startClip\(false\)/);
 assert.match(intro,/data-play/);
 assert.match(intro,/data-sound/);
 assert.match(intro,/data-skip/);
 assert.match(intro,/video\.addEventListener\('ended'/);
 assert.match(intro,/\/complete','POST'/);
 assert.match(intro,/role','dialog'/);
});
test('first-match intro waits for victory ceremony dismissal',()=>{
 const intro=source('DOG/christmas-intro-gate.js');
 const app=source('DOG/app.js');
 assert.match(app,/openVictoryCeremony\(\)/);
 assert.match(intro,/const victoryDialog=document\.getElementById\('winner'\)/);
 assert.match(intro,/!ceremonyOpen\(\)/);
 assert.match(intro,/victoryDialog\?\.addEventListener\('close'/);
});
test('online DOG completion triggers a verified unlock refresh',()=>{
 const app=source('DOG/app.js');
 assert.match(app,/game\?\.phase==='finished'\)window\.dispatchEvent\(new Event\('dog-match-finished'\)\)/);
 const gate=source('DOG/christmas-intro-gate.js');
 assert.match(gate,/window\.addEventListener\('dog-match-finished'/);
 assert.match(gate,/devUnlocked\(p\)/);
 assert.match(gate,/pin!=='123'/);
});

test('tree level 2 and 3 use the four newly uploaded chapter videos in order',()=>{
 const player=source('DOG/christmas-tree-films.js');
 const event=source('DOG/christmas-event.js');
 const files=[
  '553349132_1795277408558110.mp4',
  '681598781_1795277411540396.mp4',
  '901719079_1795277415902807.mp4',
  '433654807_1795277420139339.mp4'
 ];
 const positions=files.map(filename=>player.indexOf(filename));
 assert.ok(positions.every((position,i)=>position>0&&(i===0||position>positions[i-1])));
 for(const filename of files){
  const bytes=readFileSync(new URL('../DOG/assets/'+filename,import.meta.url));
  assert.ok(bytes.length>100000,'video uploaded: '+filename);
  assert.equal(bytes.toString('latin1',4,8),'ftyp','MP4 header: '+filename);
 }
 assert.match(event,/import \{initChristmasTreeFilms\} from '\.\/christmas-tree-films\.js/);
 assert.match(event,/treeFilms\.sync\(newTreeLevel\)/);
 assert.match(event,/showLiveVillage\(\{village:result\.village/);
 assert.match(player,/getUserId/);
 assert.match(player,/isPreview/);
 assert.match(player,/localStorage\.setItem\(key,'done'\)/);
 assert.match(player,/video\.autoplay=false/);
 assert.match(player,/video\.muted=false/);
 assert.match(player,/loadClip\(false\)/);
 assert.match(player,/video\.addEventListener\('ended'/);
 assert.match(player,/tree-step-film-replay/);
 assert.doesNotMatch(player,/village\/upgrade|tree-rewards\/claim/);
});
