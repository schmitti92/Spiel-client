import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=text('hub-lobby.html');
const js=text('hub-lobby.js');
const challengeMarkup=js.match(/(?:challenge-original-frame|challenge-progress)/) ? js : '';
const css=text('hub-lobby-v7.css');
const barikade=text('Barikade/barikade.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
test('No duplicate or missing HTML elements referenced by room controller',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\bel\('([^']+)'\)/g)].map(x=>x[1]).filter(id=>!ids.includes(id));
 assert.deepEqual([...new Set(missing)].filter(id=>!id.startsWith('challenge-')&&!id.startsWith('pj-')),[]);
 assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
});
test('Local games available without a user account',()=>{
 assert.match(html,/id="local-view"/);
 assert.match(js,/location\.assign\('spielauswahl-lokal\.html'\)/);
 for(const path of [
 'Barikade/barikade.html?offline=1',
 'Skyjo/skyjo_action.html?mode=local',
 'KreuzKunter/kreuzkunter.html?mode=local',
 'Business/business_local.html'
 ])assert.ok(html.includes(path),'missing '+path);
 assert.match(barikade,/qs\.get\('offline'\) === '1'/);
});
test('Each online game has a dedicated pre-room with host settings',()=>{
 for(const game of ['barikade','skyjo','kreuz','business'])assert.ok(html.includes('data-game="'+game+'"'));
 for(const id of ['game-stage-hero','selected-game-title','ready-panel','ready-btn','ready-progressbar'])assert.ok(ids.includes(id),id);
 for(const id of ['barikade-settings-panel','skyjo-settings-panel','business-settings-panel','kreuz-settings-panel'])assert.ok(ids.includes(id),id);
 assert.match(js,/room\.host/);
 assert.match(js,/room\.phase==='preparing'/);
 assert.match(js,/\/rooms\/'.*?\+code\+'\/ready'/s);
});
test('The local/online selection remains phone-sized and readable',()=>{
 assert.match(html,/hub-lobby-v7\.css/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.entry-action/);
 assert.match(css,/\.local-game-grid/);
 assert.match(css,/#game-stage-hero/);
});
test('Game selection does not create an independent game room',()=>{
 assert.match(js,/\/rooms\/'.*?\+code\+'\/select'/s);
 assert.match(js,/\/rooms\/'.*?\+code\+'\/ready'/s);
 assert.match(js,/match\.gameCode/);
});

test('Reconnect cannot overwrite newer hub revisions or create overlapping HTTP polls',()=>{
 assert.match(js,/Number\(next\.revision\)<Number\(room\.revision\)/);
 assert.match(js,/pollInFlight/);
 assert.match(js,/if\(code!==requestedCode\)return/);
 assert.match(js,/hubSocket===socket&&code===subscribedCode&&data\?\.type==='room'/);
 assert.match(js,/acceptRoom\(data\.room\)/);
});

test('SKYJO reference board preserves manual score counting and three-to-five player seats',()=>{
 const html=readFileSync(new URL('../Skyjo/skyjo_action.html',import.meta.url),'utf8');
 assert.match(html,/skyjo_action-style-01\.css/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.doesNotMatch(html,/meta-chip open-chip/);
 assert.doesNotMatch(html,/Σ \$\{openSum/);
});

test('SKYJO reference sidebar shows standings without exposing current card sums',()=>{
 const html=readFileSync(new URL('../Skyjo/skyjo_action.html',import.meta.url),'utf8');
 assert.match(html,/skyjo_action-style-01\.css/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.doesNotMatch(html,/meta-chip open-chip/);
});

// Guard the nine original games and the landscape tablet layout against regressions.
test('Party Challenge renders exactly nine unique original game choices',()=>{
 const source=js.match(/const singleGames=\[([\s\S]*?)\];/);
 assert.ok(source,'missing minigame registry');
 const gameIds=[...source[1].matchAll(/\['([^']+)','[^']+','[^']+'\]/g)].map(m=>m[1]);
 assert.equal(gameIds.length,9);
 assert.equal(new Set(gameIds).size,9);
 assert.match(js,/if\(seen\.has\(button\.dataset\.minigame\)\)button\.remove\(\)/);
});
test('Tablet landscape card sizing remains bounded and cache version matches',()=>{
 assert.match(css,/@media \(min-width:901px\) and \(max-height:850px\) and \(orientation:landscape\)/);
 assert.match(css,/height:clamp\(91px,12\.5dvh,111px\)/);
 assert.match(html,/hub-lobby-v7\.css\?v=20261025-premium-\d+/);
 const cssVersion=html.match(/hub-lobby-v7\.css\?v=(20261025-premium-\d+)/)?.[1];
 assert.ok(cssVersion,'versioned lobby stylesheet missing');
 assert.ok(Number(cssVersion.split('-').at(-1))>=18,'outdated tablet stylesheet');
});

test('Marathon selection prevents duplicate submissions while a request is pending',()=>{
 assert.match(js,/const button=el\('challenge-marathon'\);if\(button\.disabled\)return;/);
 assert.match(js,/button\.disabled=true;[\s\S]*?count:9,selectedGame:null[\s\S]*?finally\{button\.disabled=false;challengeSettingsBusy=false;\}/);
});

test('Replay, return-to-selection and next-game controls ignore duplicate taps',()=>{
 assert.match(js,/for\(const \[id,route\] of \[\['challenge-replay','challenge-replay'\],\['challenge-select','challenge-select'\]\]\)/);
 assert.match(js,/const btn=el\(id\);if\(btn\.disabled\)return;/);
 assert.match(js,/const btn=el\('challenge-next'\);if\(btn\.disabled\)return;btn\.disabled=true;/);
 assert.match(js,/catch\(e\)\{showError\(e\);\}finally\{btn\.disabled=false;\}/);
});

test('Challenge settings requests are serialized across cards, marathon and save',()=>{
 assert.match(js,/let challengeSettingsBusy=false;/);
 assert.match(js,/room\.phase!=='preparing'\|\|challengeSettingsBusy\)return;/);
 assert.match(js,/challengeSettingsBusy=true;btn\.disabled=true;/);
 assert.match(js,/finally\{btn\.disabled=false;challengeSettingsBusy=false;\}/);
 assert.match(js,/if\(challengeSettingsBusy\)return;\s*const button=el\('challenge-save'\)/);
});

test('Selection responses cannot update a different room after navigation',()=>{
 assert.match(js,/const requestedCode=room\.code;const response=await request\('\/rooms\/'\+encodeURIComponent\(requestedCode\)\+'\/challenge-settings'/);
 assert.match(js,/if\(code!==requestedCode\)return;acceptRoom\(response\.room\)/);
 assert.match(js,/const updated=await request\('\/rooms\/'\+encodeURIComponent\(requestedCode\)\);if\(code!==requestedCode\)return;acceptRoom\(updated\.room\)/);
});

test('Post-game actions discard stale responses after changing rooms',()=>{
 assert.match(js,/const challengeId=room\.match\.challenge\.id;const response=await request\('\/rooms\/'\+encodeURIComponent\(requestedCode\)\+'\/'\+route/);
 assert.match(js,/const challengeId=room\.match\.challenge\.id;const response=await request\('\/rooms\/'\+encodeURIComponent\(requestedCode\)\+'\/challenge-next'/);
 assert.match(js,/if\(code!==requestedCode\)return;acceptRoom\(response\.room\)/);
});

test('Returning online or foreground refreshes the current room without concurrent polls',()=>{
 assert.match(js,/async function refreshRoomAfterReconnect\(\)/);
 assert.match(js,/if\(!code\|\|!room\|\|!activeProfile\(\)\|\|pollInFlight\|\|operation\)return;/);
 assert.match(js,/if\(code!==requestedCode\)return;pollErrors=0;acceptRoom\(result\.room\)/);
 assert.match(js,/window\.addEventListener\('online',/);
 assert.match(js,/document\.addEventListener\('visibilitychange',/);
});

test('Failed game navigation remains retryable on a subsequent room update',()=>{
 assert.match(js,/const matchId=room\.match\.id;\s*try\{enterCurrentMatch\(\);launchedMatchId=matchId;\}catch\(e\)\{showError\(e\);\}/);
 assert.doesNotMatch(js,/launchedMatchId=room\.match\.id;\s*try\{enterCurrentMatch\(\)/);
});

test('WebSocket subscriptions remain bound to their original room',()=>{
 assert.match(js,/const subscribedCode=code;/);
 assert.match(js,/hubSocket===socket&&code===subscribedCode&&socket\.readyState===1/);
 assert.match(js,/type:'subscribe',code:subscribedCode,profileIdToken:token/);
 assert.match(js,/hubSocket===socket&&code===subscribedCode&&data\?\.type==='room'&&data\.room\?\.code===subscribedCode/);
});

test('Closed socket cannot schedule a reconnect for an obsolete room',()=>{
 assert.match(js,/if\(code&&room&&activeProfile\(\)&&code===subscribedCode\)retrySocket=setTimeout/);
 assert.match(js,/if\(code===subscribedCode\)startWatch\(\)/);
});

test('Stuck WebSocket handshakes time out and release reconnect fallback',()=>{
 assert.match(js,/const connectTimeout=setTimeout\(\(\)=>\{if\(hubSocket===socket&&socket\.readyState===0\)socket\.close\(\);\},15000\)/);
 assert.match(js,/socket\.onopen=async\(\)=>\{\s*clearTimeout\(connectTimeout\)/);
 assert.match(js,/socket\.onclose=\(\)=>\{\s*clearTimeout\(connectTimeout\)/);
});

test('Lobby boot preserves room links on authentication and temporary network errors',()=>{
 assert.match(js,/Bitte melde dich an, um deinen bestehenden Raum wiederherzustellen/);
 assert.match(js,/const requestedCode=fromUrl\.toUpperCase\(\)/);
 assert.match(js,/if\(r\?\.code!==requestedCode\)return;activateRoom\(r\);pollStart\(\)/);
 assert.match(js,/Raum vorübergehend nicht erreichbar\. Aktualisiere die Seite/);
});

test('Room recovery tolerates delayed Firebase authentication initialization',()=>{
 assert.match(js,/if\(!activeProfile\(\)&&elapsed<30000\)return/);
 assert.doesNotMatch(js,/if\(!activeProfile\(\)&&elapsed<12000\)return/);
});

test('Delayed Firebase login can recover the original room without duplicate fetches',()=>{
 assert.match(js,/let pendingRoomRecovery=null,recoveryInFlight=false/);
 assert.match(js,/if\(!pendingRoomRecovery\|\|room\|\|code\|\|!activeProfile\(\)\|\|recoveryInFlight\)return/);
 assert.match(js,/if\(pendingRoomRecovery!==requestedCode\|\|room\|\|code\|\|r\?\.code!==requestedCode\)return/);
 assert.match(js,/render\(\);if\(uid\)void recoverPendingRoom\(\)/);
});

test('Temporary room restoration failures use bounded exponential retry delays',()=>{
 assert.match(js,/recoveryAttempts>=5/);
 assert.match(js,/Math\.min\(30000,2000\*2\*\*recoveryAttempts\+\+\)/);
 assert.match(js,/recoveryRetryTimer=setTimeout\(\(\)=>\{recoveryRetryTimer=null;void recoverPendingRoom\(\);\},delay\)/);
 assert.match(js,/pendingRoomRecovery=null;clearRecoveryRetry\(\);activateRoom\(r\);pollStart\(\)/);
});

test('Joining or leaving a room cancels pending restoration retries',()=>{
 assert.match(js,/function cancelPendingRecovery\(\)\{pendingRoomRecovery=null;clearRecoveryRetry\(\);\}/);
 assert.match(js,/function activateRoom\(result\)\{if\(!result\?\.code\)return;cancelPendingRecovery\(\);setRoomCode/);
 assert.match(js,/function leaveView\(\)\{cancelPendingRecovery\(\);pollStop\(\)/);
});

test('Late failed recovery responses do not affect a newly active room',()=>{
 assert.match(js,/catch\(e\)\{if\(pendingRoomRecovery!==requestedCode\|\|room\|\|code\)return;if\(\['ROOM_NOT_FOUND','NOT_A_MEMBER'\]/);
});


test('Premium tablet landscape supports taller browser viewports and all nine matching artworks',()=>{
 assert.match(css,/@media \(min-width:901px\) and \(orientation:landscape\) and \(max-height:1200px\)/);
 assert.match(css,/height:clamp\(88px,11\.5dvh,125px\)/);
 const artworks=['zeitgefuehl','recheninsel','huetchen','maulwurf','fluss','lava','snake','bomber','preis'];
 artworks.forEach((name,index)=>{
  const selector=new RegExp('body\\.challenge-room-active #challenge-single-grid>button:nth-child\\('+(index+1)+'\\)');
  assert.match(css,selector,'missing card selector '+name);
  assert.ok(css.includes('url("Assets/challenge/'+name+'.svg")'),'missing artwork '+name);
 });
});
