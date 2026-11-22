import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../hub-lobby.js',import.meta.url),'utf8');
const begin=source.indexOf('function hasRecentHubStream(');
const end=source.indexOf('function enterKreuz()',begin);
assert.ok(begin>=0&&end>begin,'Render stream freshness/reconnect handlers must exist');
const handlers=source.slice(begin,end);

function harness(){
 const hooks={},ops={http:0,stops:0,starts:0};
 let now=100000;
 const state={
   code:'ABC23D',room:{code:'ABC23D'},streamReady:true,
   hubSocket:{readyState:1},streamLast:95000,streamAliveAt:95000,
   document:{hidden:false,addEventListener:(name,fn)=>{hooks[name]=fn}},
   window:{addEventListener:(name,fn)=>{hooks[name]=fn}},
   Date:{now:()=>now},
   stopWatch:()=>{ops.stops++},
   startWatch:()=>{ops.starts++},
   refreshRoomAfterReconnect:()=>{ops.http++;return Promise.resolve()}
 };
 vm.runInNewContext(handlers,state,{filename:'hub-lobby-foreground.js'});
 return {state,hooks,ops,setNow:n=>{now=n}};
}

test('Recent authenticated Render WebSocket room state avoids foreground Firestore GET',()=>{
 const h=harness();
 assert.equal(h.state.hasRecentHubStream(),true);
 h.hooks.visibilitychange();
 assert.equal(h.ops.http,0,'fresh WS snapshot makes HTTP read redundant');
 assert.equal(h.ops.starts,0,'healthy WS does not reconnect');
 h.state.streamLast=25000;h.state.streamAliveAt=25000;
 assert.equal(h.state.hasRecentHubStream(),false,'75-second heartbeat staleness boundary');
 h.hooks.visibilitychange();
 assert.equal(h.ops.http,1,'stale WS state triggers authoritative HTTP reconciliation');
 h.state.document.hidden=true;
 h.hooks.visibilitychange();
 assert.equal(h.ops.http,1,'background tabs must not poll');
});

test('Network reconnection keeps HTTP verification and disconnected WS restores it',()=>{
 const h=harness();
 h.hooks.online();
 assert.equal(h.ops.http,0,'healthy authenticated socket must avoid a duplicate online-event GET');
 h.state.streamAliveAt=0;h.state.streamLast=0;
 h.hooks.online();
 assert.equal(h.ops.http,1,'stale or uninitialized socket must still verify authority');
 h.state.hubSocket={readyState:3};
 h.state.streamReady=false;
 h.hooks.visibilitychange();
 assert.equal(h.ops.stops,1);
 assert.equal(h.ops.starts,1,'disconnected WebSocket gets restarted');
 assert.equal(h.ops.http,2,'HTTP fallback survives WebSocket outage');
 h.state.hubSocket={readyState:1};
 h.state.streamLast=0;h.state.streamAliveAt=0;
 h.state.streamReady=true;
 h.hooks.visibilitychange();
 assert.equal(h.ops.http,3,'no authenticated snapshot must not suppress reconciliation');
 h.state.code=null;
 h.hooks.visibilitychange();
 assert.equal(h.ops.http,3,'no room means no request');
});

test('A healthy authenticated hub socket makes no idle room GET; offline fallback stays bounded',async()=>{
 assert.doesNotMatch(source,/HUB_IDLE_AUDIT_MS/);
 assert.match(source,/const HUB_DISCONNECTED_FALLBACK_MS=30000/);
 assert.match(source,/if\(hasRecentHubStream\(now\)\)return/);
 const start=source.indexOf('function pollStart(){');
 const end=source.indexOf('function leaveView(){',start);
 assert.ok(start>=0&&end>start);
 const fragment=source.slice(start,end);
 let tick=null,now=1000000,healthy=true,requests=0,rendered=0;
 const context={HUB_DISCONNECTED_FALLBACK_MS:30000,code:'ABC23D',room:{code:'ABC23D'},operation:false,
  pollInFlight:false,lastRoomPollAt:0,document:{hidden:false},pollErrors:0,
  activeProfile:()=>true,hasRecentHubStream:()=>healthy,Date:{now:()=>now},
  pollStop:()=>{},startWatch:()=>{},setInterval:fn=>{tick=fn;return 7},
  request:async()=>{requests++;return {room:{code:'ABC23D'}}},
  acceptRoom:()=>{rendered++},showError:()=>{},leaveView:()=>{throw Error('unexpected leave')} };
 vm.runInNewContext(fragment,context);
 context.pollStart();
 for(let n=0;n<120;n++){now+=12_000;await tick();}
 assert.equal(requests,0,'healthy authenticated stream: no 5-minute or other periodic Firestore HTTP audit');
 healthy=false;
 await tick();
 assert.equal(requests,1,'first disconnection may reconcile immediately after long healthy interval');
 now+=12_000;await tick();
 assert.equal(requests,1,'broken stream fallback must wait at least 30 seconds');
 now+=18_000;await tick();
 assert.equal(requests,2,'broken connection still reconciles after 30 seconds');
 assert.equal(rendered,2);
 assert.match(source,/window\.addEventListener\('online',.*?refreshRoomAfterReconnect\(\)/s);
});
