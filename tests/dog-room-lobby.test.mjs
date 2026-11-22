import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeDogRoomLobby} from '../DOG/room-lobby-state.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const template=read('hub-lobby.html');
const hub=read('hub-lobby.js');
const moduleSrc=read('DOG/room-lobby.js');
const boardSrc=read('DOG/room-board-preview.js');
const styles=read('DOG/room-lobby.css');

const makeRoom=()=>({
 game:'dog',phase:'preparing',host:true,code:'473',
 players:[
  {uid:'a',name:'Chris',ready:false,host:true,me:true,participating:true,dogAvatar:1},
  {uid:'b',name:'Moin',ready:true,host:false,me:false,participating:true,dogAvatar:4}
 ]
});
test('only a selected DOG room shows the dedicated lobby',()=>{
 assert.equal(summarizeDogRoomLobby(null),null);
 assert.equal(summarizeDogRoomLobby({...makeRoom(),game:'skyjo'}),null);
 assert.equal(summarizeDogRoomLobby({...makeRoom(),phase:'lobby'}),null);
 assert.ok(summarizeDogRoomLobby(makeRoom()));
});
test('two active players plus two genuine free places, real readiness and host start gate',()=>{
 const view=summarizeDogRoomLobby(makeRoom());
 assert.equal(view.code,'473');
 assert.equal(view.activeCount,2);
 assert.equal(view.readyCount,1);
 assert.equal(view.readyPercent,50);
 assert.equal(view.slots.length,4);
 assert.equal(view.slots[0].name,'Chris');
 assert.equal(view.slots[1].name,'Moin');
 assert.deepEqual(view.slots.slice(2),[null,null]);
 assert.equal(view.hostStartVisible,true);
 assert.equal(view.hostStartEnabled,true,'the host can provide the final ready action');
 assert.equal(view.readyEnabled,true);
 assert.equal(view.joinEnabled,true);
});
test('host cannot start before others are ready and disabled during pending request',()=>{
 const room=makeRoom();room.players[1].ready=false;
 assert.equal(summarizeDogRoomLobby(room).hostStartEnabled,false);
 room.players[1].ready=true;
 assert.equal(summarizeDogRoomLobby(room,true).hostStartEnabled,false);
 room.players[0].ready=true;
 assert.equal(summarizeDogRoomLobby(room).hostStartEnabled,false,'host already ready: server handles automatic launch');
});
test('spectators are counted without creating fictitious players or new host permissions',()=>{
 const room=makeRoom();
 room.host=false;
 room.players[0].host=false;
 room.players[0].participating=false;
 const view=summarizeDogRoomLobby(room);
 assert.equal(view.spectatorCount,1);
 assert.equal(view.activeCount,1);
 assert.equal(view.slots[0].name,'Moin');
 assert.deepEqual(view.slots.slice(1),[null,null,null]);
 assert.equal(view.readyEnabled,false);
 assert.equal(view.joinEnabled,false);
 assert.equal(view.hostStartVisible,false);
});
test('a running match allows authorized participants to return, not spectators',()=>{
 const room=makeRoom();room.phase='playing';room.match={participating:true};
 const view=summarizeDogRoomLobby(room);
 assert.equal(view.playing,true);assert.equal(view.joinEnabled,true);
 assert.equal(view.readyEnabled,false);assert.equal(view.hostStartVisible,false);
 room.match.participating=false;
 assert.equal(summarizeDogRoomLobby(room).joinEnabled,false);
});
test('finished online DOG match is not still shown as playing and host can prepare another round',()=>{
 const room=makeRoom();
 room.phase='playing';
 room.match={participating:true,id:'abc',status:{phase:'finished'}};
 const host=summarizeDogRoomLobby(room);
 assert.equal(host.finished,true);
 assert.equal(host.playing,false);
 assert.equal(host.readyEnabled,false);
 assert.equal(host.joinEnabled,true,'winner ceremony remains accessible');
 assert.equal(host.hostStartVisible,true);
 assert.equal(host.hostStartEnabled,true);
 const spectator={...room,host:false,players:room.players.map(p=>({...p,me:p.uid==='b',host:false}))};
 const player=summarizeDogRoomLobby(spectator);
 assert.equal(player.finished,true);
 assert.equal(player.hostStartVisible,false);
 assert.equal(player.hostStartEnabled,false);
 assert.match(moduleSrc,/Runde beendet/);
 assert.match(moduleSrc,/Neue Runde vorbereiten/);
 assert.match(hub,/\/dog\/rematch/);
});
test('the screenshot layout is a distinct DOG-only layer, never a main-lobby redesign',()=>{
 const ids=[...template.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'no duplicate HTML IDs');
 for(const id of ['mode-online','mode-local','game-chooser','ready-btn','start-btn','room-view','entry-view',
   'dog-room-lobby','dog-room-back','dog-room-code','dog-room-roster','dog-room-ready',
   'dog-room-join','dog-room-start','dog-room-progress','dog-room-board-preview',
   'dog-room-designer','dog-room-unlocks','dog-room-rules','dog-room-refresh']){
  assert.equal(ids.filter(x=>x===id).length,1,id);
 }
 assert.match(template,/id="dog-room-lobby"[^>]*hidden/);
 assert.match(template,/DOG\/room-lobby\.js\?v=/);
 assert.match(template,/DOG\/room-lobby\.css\?v=/);
 assert.match(styles,/#dog-room-lobby\[hidden\]\{display:none!important\}/);
 assert.match(styles,/@media\(max-width:910px\),\(orientation:portrait\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal((styles.match(/\{/g)||[]).length,(styles.match(/\}/g)||[]).length);
});
test('all room actions use the existing authenticated hub controller and server auto-start',()=>{
 assert.match(moduleSrc,/dog-room-lobby-action/);
 assert.doesNotMatch(moduleSrc,/\bfetch\(|new WebSocket\(|localStorage\.setItem/);
 assert.match(hub,/window\.addEventListener\('dog-room-lobby-action'/);
 assert.match(hub,/request\('\/rooms\/'\+code\+'\/ready','POST'/);
 assert.match(hub,/if\(kind==='start'&&\(!room\.host/);
 assert.match(hub,/window\.DOGRoomLobby\?\.update\(showStage&&room\.game==='dog'\?room:null,operation\)/);
 assert.match(moduleSrc,/spielauswahl-online\.html\?/);
 assert.match(moduleSrc,/stage:'1'/);
});
test('board image is a real read-only preview of the saved layout',()=>{
 assert.match(boardSrc,/currentBoardLayout\(\)/);
 assert.match(boardSrc,/loadAppearance\(\)/);
 assert.match(boardSrc,/layout\.track/);
 assert.match(boardSrc,/layout\.goals\[owner\]/);
 assert.match(boardSrc,/layout\.homes\[owner\]/);
 assert.doesNotMatch(boardSrc,/\bfetch\(|saveBoardLayout\(|setBoardLayout\(/);
});
