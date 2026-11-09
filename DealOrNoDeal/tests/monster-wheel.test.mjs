import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=load('weihnachten.html');
const lobby=load('lobby.html');
const js=load('js/monster-wheel.js');
const lines=load('js/commentary-lines.js');
const game=load('js/app.js');

test('Monster wheel scripts and inline page scripts parse without syntax errors',()=>{
 new vm.Script(js,{filename:'monster-wheel.js'});
 new vm.Script(lines,{filename:'commentary-lines.js'});
 new vm.Script(game,{filename:'app.js'});
 for(const [filename,text] of [['weihnachten.html',html],['lobby.html',lobby]]){
  const matches=[...text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(matches.length>0,filename+' should contain an inline script');
  for(const match of matches)if(match[1].trim())new vm.Script(match[1],{filename});
 }
});

test('Monster wheel is present in collection with all required interaction nodes',()=>{
 for(const id of ['monster-spin-open','monster-wheel-overlay','monster-wheel-disc','monster-prize-list',
  'monster-spin-start','monster-wheel-close','monster-wheel-status','monster-wheel-prize',
  'monster-modal-tickets','monster-wheel-card-action','monster-wheel-result-avatar']){
  assert.match(html,new RegExp('id="'+id+'"'),id+' missing');
 }
 assert.match(html,/js\/monster-wheel\.js/);
 assert.match(html,/css\/monster-wheel\.css/);
 assert.match(html,/monster\/spin/);
 assert.match(js,/8000/);
 assert.match(js,/cubic-bezier/);
 assert.match(html,/monsterSpinRequestId/);
});

test('25-field art, mixed-color prize presentation and four highlighted rewards',()=>{
 assert.match(html,/25 spektakuläre Gewinnfelder/);
 assert.match(html,/Alle 25 Felder sind gleich groß/);
 assert.match(js,/slot\.featured/);
 assert.match(js,/slot\.kind/);
 assert.match(js,/colorFor/);
 const css=load('css/monster-wheel.css');
 const art=load('assets/monster-wheel-gold-frame.svg');
 assert.match(css,/monster-wheel-gold-frame\.svg/);
 assert.match(css,/data-featured="character"/);
 assert.match(css,/data-featured="premium"/);
 assert.match(css,/data-featured="goldpack"/);
 assert.match(art,/<svg/);
 assert.match(art,/Goldrahmen/);
 assert.doesNotMatch(art,/<text/);
});

test('uploaded transparent 3D wheel is the actual preview and spinner gold-and-crown skin',()=>{
 const imagePath='../Weihnachtsevent2/Weihnachtsbilder/file_00000000be5481f6a8972866f23598ee.png';
 const png=readFileSync(new URL(imagePath,import.meta.url));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),1254);
 assert.equal(png.readUInt32BE(20),1254);
 assert.equal(png[25],6,'wheel artwork must retain transparent RGBA pixels');
 const css=load('css/monster-wheel.css');
 assert.match(css,/file_00000000be5481f6a8972866f23598ee\.png/);
 assert.match(css,/monster-wheel-preview/);
 assert.match(css,/monster-wheel-center/);
 assert.match(css,/mask-image:radial-gradient\(circle closest-side/);
 assert.match(js,/mark\.dataset\.monsterSlot/);
 assert.match(js,/slot\.short/);
 assert.match(html,/uploaded-skin-v1/);
});

test('Giftzwerg avatar is wired to game portrait, lobby gate and commentary',()=>{
 assert.match(lobby,/Muffiger Giftzwerg/);
 assert.match(lobby,/giftzwergUnlocked/);
 assert.match(lobby,/n===15&&!giftzwergUnlocked/);
 assert.match(lobby,/giftzwerg\.svg/);
 assert.match(game,/avatarId===15/);
 assert.match(game,/winnerPlayer\.avatar===15/);
 assert.match(lines,/studioCommentLines\[15\]/);
 const match=lines.match(/studioCommentLines\[15\]=([\s\S]*?);\s*$/);
 assert.ok(match,'Giftzwerg catalogue missing');
 const cat=JSON.parse(match[1]);
 for(const key of ['oneCent','small','neutral','large','millionLost','bankerGood','bankerBad',
  'bankerVeryGood','bankerVeryBad','finalCases','deal','noDeal','streakGood','streakBad']){
  assert.ok(Array.isArray(cat[key])&&cat[key].length>=5,key+' lacks dialogue');
 }
});
