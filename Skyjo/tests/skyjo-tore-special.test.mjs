import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
test('SKYJO loader hashes all 35 modules exactly, and the concatenated engine parses',()=>{
 const manifest=JSON.parse(read('skyjo_action-manifest.json'));
 const parts=Object.entries(manifest.parts);
 assert.equal(parts.length,35);
 const source=parts.map(([file,digest])=>{
  const text=read(file);
  assert.equal(createHash('sha256').update(text).digest('hex'),digest,file);
  return text;
 }).join('');
 assert.doesNotThrow(()=>new Function(source));
});
test('SKYJO 100 Tore Special browser runtime and existing Monster Slots parse',()=>{
 assert.doesNotThrow(()=>new Function(read('skyjo_tore_special.js')));
 const deal=read('../DealOrNoDeal/js/monster-slots-final.js');
 assert.doesNotThrow(()=>new Function(deal));
 assert.match(deal,/for\(let i=6;i<12;i\+\+\)/);
 assert.match(read('skyjo_action.html'),/skyjo_tore_special\.js/);
});
test('Mission selection is stable, three per round, and includes hard missions',()=>{
 const browser={};
 new Function('window',read('skyjo_tore_special.js'))(browser);
 const engine=browser.SkyjoToreSpecial;
 assert.equal(engine.definitions.length,22);
 const match='abcdef12-3456-4abc-bcde-123456789abc';
 assert.deepEqual(engine.missionsFor(match,1),['two-zero','two-rows','clear-board']);
 for(let round=1;round<100;round++){
  const ids=engine.missionsFor(match,round);
  assert.equal(ids.length,3);
  assert.deepEqual(ids,engine.missionsFor(match,round));
  assert.deepEqual(ids.map(id=>engine.definitions.find(m=>m.id===id)?.tier),['easy','medium','hard']);
 }
});
test('Special rewards are mandatory before host may start next round',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial,state={round:1,phase:'play',players:[{name:'Chris',grid:[]}]};
 x.newGame(state,{toreSpecialEnabled:true},'abcdef12-3456-4abc-bcde-123456789abc');
 assert.equal(x.canNextRound(state),false);
 state.skyjoSpecial.finished=true;
 assert.equal(x.canNextRound(state),true);
});

test('The normal Weiter button stays enabled when special runtime is missing',()=>{
 const nextRound=read('skyjo_action-logic-part-19.txt');
 const returnToLobby=read('skyjo_action-logic-part-20.txt');
 assert.match(nextRound,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.match(returnToLobby,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.doesNotMatch(nextRound,/if\(!window\.SkyjoToreSpecial\?\.canNextRound\(state\)\)/);
 // In JavaScript, undefined===false is false: normal games never become blocked.
 assert.equal(undefined===false,false);
 assert.equal(false===false,true);
 assert.equal(true===false,false);
});


test('Online SKYJO hub starts with 2–5 players without an obsolete second lobby',()=>{
 const startup=read('skyjo_action-logic-part-08.txt');
 const render=read('skyjo_action-logic-part-35.txt');
 const legacy=read('skyjo_action-logic-part-22.txt');
 const entry=read('skyjo_action.html');
 assert.match(startup,/SKYJO_IS_HUB\?\(ps\.length<2\|\|ps\.length>5\):ps\.length!==3/);
 assert.match(render,/if\(SKYJO_IS_HUB&&!state\)content=hubLoadingView\(\)/);
 assert.match(render,/if\(isHostDevice\(\)&&!cloud\.doc\.game\)await startOnlineGame\(\)/);
 assert.match(legacy,/function hubLoadingView\(\)/);
 assert.doesNotMatch(entry,/src="skyjo_hub_autostart\.js/);
});
test('Old online SKYJO URLs return to the main shared lobby; hub matches and offline games do not',()=>{
 const script=read('skyjo_online_hub_redirect.js');
 const navigate=(query)=>{
  let redirected=null;
  const location={href:'https://schmitti92.github.io/Spiel-client/Skyjo/skyjo_action.html?'+query,
   replace:to=>{redirected=to;}};
  new Function('location',script)(location);
  return redirected;
 };
 const old=navigate('mode=online&room=473');
 assert.match(old,/spielauswahl-online\.html\?room=473&stay=1/);
 const oldUnmapped=navigate('mode=online&room=S473AAAAAA');
 assert.match(oldUnmapped,/spielauswahl-online\.html\?stay=1/);
 const valid=navigate('mode=online&hub=473&match=01234567-89ab-4cde-a123-456789abcdef&room=S473AAAAAA');
 assert.equal(valid,null);
 assert.equal(navigate('mode=local&testPlayers=2'),null);
});


test('Shared Monster Slots prominently identify the active winner and the spectator',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const show={index:0,players:[
  {uid:'chris-id',name:'Chris',winner:false,missionIds:['one-row'],prizes:[{kind:'chest'},{kind:'joker'}]},
  {uid:'moin-id',name:'Moin',winner:true,missionIds:['three-streets','open-zero'],prizes:Array.from({length:12},()=>({kind:'pack'}))}
 ]};
 const current=browser.SkyjoToreSpecial.playerSpotlight(show,'chris-id');
 assert.equal(current.name,'Chris');
 assert.equal(current.mine,true);
 assert.equal(current.position,1);
 assert.equal(current.total,2);
 assert.equal(current.slots,2);
 assert.match(current.role,/MISSIONSGEWINNER/);
 assert.match(current.viewerLabel,/DU BIST DRAN/);
 const viewer=browser.SkyjoToreSpecial.playerSpotlight(show,'moin-id');
 assert.equal(viewer.mine,false);
 assert.match(viewer.viewerLabel,/DU SCHAUST ZU/);
 show.index=1;
 const champion=browser.SkyjoToreSpecial.playerSpotlight(show,'chris-id');
 assert.equal(champion.name,'Moin');
 assert.equal(champion.slots,12);
 assert.equal(champion.position,2);
 assert.match(champion.role,/RUNDENSIEGER/);
 assert.match(champion.viewerLabel,/DU SCHAUST ZU/);
 assert.equal(browser.SkyjoToreSpecial.playerSpotlight(show,'moin-id').mine,true);
});
test('Slot recipient remains visible from spin start through win and confirmation',()=>{
 const js=read('skyjo_tore_special.js');
 const css=read('skyjo_tore_special.css');
 assert.match(js,/class="skyjo-slot-owner-bar"/);
 assert.match(js,/class="skyjo-slot-owner-name"/);
 assert.match(js,/id="skyjo-slot-owner-phase"/);
 assert.match(js,/id="skyjo-slot-viewer-role"/);
 assert.match(js,/skyjo-slot-queue-player/);
 assert.match(js,/Alle Preise aus diesem Dreh gehören/);
 assert.match(js,/HAT GEWONNEN/);
 assert.match(js,/DREHT GERADE/);
 assert.match(js,/is-current/);
 assert.match(css,/\.skyjo-slot-owner-name/);
 assert.match(css,/data-viewer="owner"/);
 assert.match(css,/@media\(max-width:620px\)/);
});
