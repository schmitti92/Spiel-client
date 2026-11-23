import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newReplacementDraws} from '../DOG/replacement-draw-animation.js';

test('DOG: a first room snapshot never replays already-resolved draws',()=>{
 const after={revision:12,drawEvents:[{revision:10,seat:2,cardType:'13',canExit:true}]};
 assert.deepEqual(newReplacementDraws(null,after),[]);
 assert.deepEqual(newReplacementDraws({revision:12},after),[]);
 assert.deepEqual(newReplacementDraws({revision:13},after),[]);
});

test('DOG: new public draws are replayed once and in their original order',()=>{
 const before={revision:20};
 const after={revision:25,drawEvents:[
  {revision:19,seat:0,cardType:'7',canExit:false},
  {revision:21,seat:1,cardType:'12',canExit:false},
  {revision:23,seat:3,cardType:'joker',canExit:true},
  {revision:26,seat:0,cardType:'13',canExit:true},
  {revision:24,seat:7,cardType:'6',canExit:false},
  {revision:22,seat:0,cardType:'INVALID',canExit:false}
 ]};
 assert.deepEqual(newReplacementDraws(before,after),[after.drawEvents[1],after.drawEvents[2]]);
 assert.deepEqual(newReplacementDraws({revision:25},after),[]);
});

test('DOG: visual reveal loads the chosen card skin and handles discard without new requests',()=>{
 const source=readFileSync(new URL('../DOG/replacement-draw-animation.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 const markup=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 assert.match(source,/cardMarkup\(event\.cardType,\{tag:'div'\}\)/);
 assert.match(source,/positionOf\('dog-deck-art'\)/);
 assert.match(source,/positionOf\('dog-discard-art'\)/);
 assert.match(source,/event\.canExit\?/);
 assert.match(app,/replacementDrawAnimator\.show\(newReplacementDraws\(previousGame,game\),game\.players\)/);
 assert.match(app,/replacementDrawAnimator\.show\(newReplacementDraws\(beforeMove,game\),game\.players\)/);
 assert.match(app,/replacementDrawAnimator\.show\(newReplacementDraws\(beforeBotMove,game\),game\.players\)/);
 assert.match(markup,/replacement-draw-animation\.css/);
});
