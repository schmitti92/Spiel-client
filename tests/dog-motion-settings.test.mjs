import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DOG_MOTION_MODES,normalizeMotionMode,loadMotionMode,saveMotionMode,motionFactor,applyMotionMode,DOG_BOT_MOTION_KEY,readDogBotMotion,writeDogBotMotion,dogBotActionDelay,DOG_BOT_HANDOFF_PAUSE_MS
} from '../DOG/motion-settings.js';

test('motion speed uses stable local preferences',()=>{
 assert.deepEqual([...DOG_MOTION_MODES],['normal','fast','off']);
 assert.equal(normalizeMotionMode('invalid'),'normal');
 const cache=new Map();
 const storage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
 assert.equal(loadMotionMode(storage),'normal');
 assert.equal(saveMotionMode('fast',storage),'fast');
 assert.equal(loadMotionMode(storage),'fast');
 assert.equal(saveMotionMode('surprise',storage),'normal');
 assert.equal(loadMotionMode(storage),'normal');
});
test('reduced-motion takes precedence over fast/normal',()=>{
 assert.equal(motionFactor('off'),0);
 assert.equal(motionFactor('fast',true),0);
 assert.equal(motionFactor('normal',true),0);
 assert.equal(motionFactor('fast'),.62);
 assert.equal(motionFactor('normal'),1);
});
test('broken storage is handled and DOM switch is view-only',()=>{
 const broken={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.equal(loadMotionMode(broken),'normal');
 assert.equal(saveMotionMode('off',broken),'off');
 const root={dataset:{}};
 applyMotionMode('off',root);
 assert.equal(root.dataset.dogMotion,'off');
});

test('bot animations have a separate device-local on/off switch, on by default',()=>{
 const cache=new Map();
 const storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)};
 assert.equal(readDogBotMotion(storage),true);
 assert.equal(writeDogBotMotion(false,storage),false);
 assert.equal(cache.get(DOG_BOT_MOTION_KEY),'0');
 assert.equal(readDogBotMotion(storage),false);
 assert.equal(writeDogBotMotion(true,storage),true);
 assert.equal(readDogBotMotion(storage),true);
 assert.equal(readDogBotMotion({getItem(){throw Error('no storage')}}),true);
 assert.equal(writeDogBotMotion(false,{setItem(){throw Error('no storage')}}),false);
});

test('different bots move sequentially with a full second after the previous animation',()=>{
 assert.equal(DOG_BOT_HANDOFF_PAUSE_MS,1000);
 assert.equal(dogBotActionDelay({previousBotSeat:1,nextBotSeat:2,animationDuration:850}),1850);
 assert.equal(dogBotActionDelay({previousBotSeat:2,nextBotSeat:3,animationDuration:1650}),2650);
 // The gap applies even if animations are disabled or the tab was hidden.
 assert.equal(dogBotActionDelay({previousBotSeat:1,nextBotSeat:2,animationDuration:0}),1000);
});

test('split seven uses one bot turn and human-to-bot delay remains short',()=>{
 assert.equal(dogBotActionDelay({previousBotSeat:1,nextBotSeat:1,animationDuration:650}),890);
 assert.equal(dogBotActionDelay({previousBotSeat:1,nextBotSeat:1,animationDuration:0}),320);
 assert.equal(dogBotActionDelay({previousBotSeat:null,nextBotSeat:2,animationDuration:650}),890);
 assert.equal(dogBotActionDelay({previousBotSeat:null,nextBotSeat:2,animationDuration:0}),320);
 assert.equal(dogBotActionDelay({previousBotSeat:1,nextBotSeat:2,animationDuration:-5}),1000);
});
