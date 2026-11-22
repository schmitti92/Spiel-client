import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DOG_MOTION_MODES,normalizeMotionMode,loadMotionMode,saveMotionMode,motionFactor,applyMotionMode,DOG_BOT_MOTION_KEY,readDogBotMotion,writeDogBotMotion
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
