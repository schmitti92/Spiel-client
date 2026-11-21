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
 assert.match(intro,/const portalUnlocked=state\.eligible&&\(state\.completed\|\|state\.previewGranted\)/);
 assert.match(intro,/state\.eligible&&state\.introReady&&!state\.completed&&!introVisible&&!introDeferred&&afterVictory\(\)/);
 assert.match(intro,/else if\(state\.introReady&&!state\.completed\)/);
 assert.match(intro,/else if\(state\.completed\|\|state\.previewGranted\)await admit\(\)/);
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
 assert.match(intro,/const portalUnlocked=state\.eligible&&\(state\.completed\|\|state\.previewGranted\)/);
});
test('first-match intro waits for victory ceremony dismissal',()=>{
 const intro=source('DOG/christmas-intro-gate.js');
 const app=source('DOG/app.js');
 assert.match(app,/openVictoryCeremony\(\)/);
 assert.match(intro,/const victoryDialog=document\.getElementById\('winner'\)/);
 assert.match(intro,/const afterVictory=\(\)=>Boolean\(victoryDialog&&matchFinishedOnThisPage&&ceremonyDismissed&&!ceremonyOpen\(\)\)/);
 assert.match(intro,/victoryDialog\?\.addEventListener\('close'/);
 assert.match(intro,/if\(matchFinishedOnThisPage\)ceremonyDismissed=true/);
 assert.match(intro,/state\.introReady&&!state\.completed&&!introVisible&&!introDeferred&&afterVictory\(\)/);
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

test('DOG welcome video opens on entry to the actual room lobby, not each refresh',()=>{
 const movie=source('DOG/room-lobby-video.js');
 const lobby=source('DOG/room-lobby.js');
 const hub=source('hub-lobby.html');
 const mp4=readFileSync(new URL('../DOG/assets/42667997_1795277919445597.mp4',import.meta.url));
 assert.ok(mp4.length>100000);
 assert.equal(mp4.toString('latin1',4,8),'ftyp');
 assert.match(lobby,/const state=summarizeDogRoomLobby\(snapshot,busy\)/);
 assert.match(lobby,/if\(!wasOpen\)/);
 assert.match(lobby,/welcomeFilm\.arrive\(state\.code,\{playing:state\.playing\}\)/);
 assert.match(lobby,/welcomeFilm\.close\(\)/);
 assert.match(movie,/if\(playing\|\|!roomCode\|\|root\.hidden\)return/);
 assert.match(movie,/sessionStorage\.setItem\(key,'1'\)/);
 assert.match(movie,/if\(open\(\)\)markShown\(key\)/);
 assert.match(movie,/dog-room-welcome-video-v2/);
 assert.match(movie,/video\.autoplay=false/);
 assert.match(movie,/video\.muted=false/);
 assert.match(movie,/data-play/);
 assert.match(movie,/data-dismiss/);
 assert.match(movie,/Lobbyfilm ansehen/);
 assert.match(hub,/DOG\/room-lobby\.js\?v=12/);
});

test('DOG lobby cannot show the Christmas film without a finished DOG victory ceremony',()=>{
 const sourceCode=source('DOG/christmas-intro-gate.js');
 const room=source('hub-lobby.html');
 const dog=source('DOG/index.html');
 const event=source('DOG/christmas-event.html');
 assert.match(sourceCode,/const victoryDialog=document\.getElementById\('winner'\)/);
 assert.match(sourceCode,/const afterVictory=\(\)=>Boolean\(victoryDialog&&matchFinishedOnThisPage&&ceremonyDismissed&&!ceremonyOpen\(\)\)/);
 assert.match(sourceCode,/window\.addEventListener\('dog-match-finished'/);
 assert.match(sourceCode,/if\(victoryDialog\)matchFinishedOnThisPage=true/);
 assert.match(sourceCode,/if\(matchFinishedOnThisPage\)ceremonyDismissed=true/);
 assert.match(sourceCode,/!introDeferred&&afterVictory\(\)/);
 assert.match(sourceCode,/if\(activeUid!==uid\)/);
 assert.match(sourceCode,/if\(pendingAgain\)/);
 assert.doesNotMatch(room,/id="winner"/);
 assert.match(dog,/id="winner"/);
 for(const html of [room,dog,event])assert.match(html,/christmas-intro-gate\.js\?v=19/);
 assert.match(sourceCode,/data-later/);
 assert.match(sourceCode,/later\.addEventListener\('click'/);
 assert.match(sourceCode,/reason==='DOG_CHRISTMAS_INTRO_LOCKED'/);
 assert.doesNotMatch(sourceCode,/Server nicht erreichbar\. Bitte Freischaltung erneut versuchen/);
});


test('idle Firebase reads are rate-limited without delaying a verified DOG victory',()=>{
 const intro=source('DOG/christmas-intro-gate.js');
 const event=source('DOG/christmas-event.js');
 const hub=source('hub-lobby.html'),dog=source('DOG/index.html'),page=source('DOG/christmas-event.html');
 assert.match(intro,/ELIGIBILITY_FOCUS_MIN_MS=20000/);
 assert.match(intro,/!force&&lastEligibilityUid===uid&&Date\.now\(\)-lastEligibilityReadAt<ELIGIBILITY_FOCUS_MIN_MS/);
 assert.match(intro,/if\(pending\)\{if\(force\|\|uid!==activeUid\)pendingAgain=true;return;\}/);
 assert.match(intro,/if\(victoryDialog\)matchFinishedOnThisPage=true;\s*void refresh\(\{force:true\}\)/);
 assert.match(intro,/if\(matchFinishedOnThisPage\)ceremonyDismissed=true;\s*void refresh\(\{force:true\}\)/);
 assert.match(intro,/if\(!initiallyAuthenticated\)setTimeout\(\(\)=>void refresh\(\),1700\)/);
 assert.match(intro,/if\(!initiallyAuthenticated\)setTimeout\(\(\)=>void check\(\),1700\)/);
 assert.match(event,/const VILLAGE_POLL_MS=180000/);
 assert.match(event,/const VILLAGE_TAB_FRESH_MS=60000/);
 assert.match(event,/const VILLAGE_VISIBLE_FRESH_MS=60000/);
 assert.match(event,/visibleVillageTab\(\)[\s\S]*?minimumAgeMs:VILLAGE_POLL_MS/);
 assert.match(event,/if\(minimumAgeMs>0&&villageLive&&lastVillageReadUid===person\.uid/);
 assert.match(event,/if\(pendingVillageRead\)return pendingVillageRead/);
 assert.match(event,/\$\('building-wallet-refresh'\)\.addEventListener\('click',\(\)=>void reloadVillage\(\)\)/);
 assert.match(event,/villageRequest\('village\/upgrade','POST'/);
 assert.match(intro,/christmas-event\.js\?v=159/);
 for(const html of [hub,dog,page])assert.match(html,/christmas-intro-gate\.js\?v=19/);
});
