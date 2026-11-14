import test from 'node:test';
import assert from 'node:assert/strict';
import {boardGestureTarget} from '../DOG/board-gesture-math.js';

const rect={left:0,top:0,width:760,height:760};
const start={zoom:1,center:{x:380,y:380},mid:{x:380,y:380},distance:100};

test('pinch zoom changes only board viewport and stays centered',()=>{
 const result=boardGestureTarget(start,{x:380,y:380,distance:200},rect);
 assert.equal(result.zoom,2);
 assert.deepEqual(result.center,{x:380,y:380});
});

test('off-center pinching keeps the touched board point under fingertips',()=>{
 const initial={...start,mid:{x:500,y:380}};
 const result=boardGestureTarget(initial,{x:500,y:380,distance:200},rect);
 assert.equal(result.zoom,2);
 assert.equal(result.center.x,440);
 assert.equal(result.center.y,380);
});

test('two-finger drag pans an already magnified board',()=>{
 const initial={zoom:2,center:{x:380,y:380},mid:{x:380,y:380},distance:100};
 const result=boardGestureTarget(initial,{x:420,y:400,distance:100},rect);
 assert.equal(result.zoom,2);
 assert.deepEqual(result.center,{x:360,y:370});
});

test('board view cannot pan outside the board or zoom below 100%',()=>{
 const result=boardGestureTarget(start,{x:100,y:100,distance:10},rect);
 assert.equal(result.zoom,1);
 assert.deepEqual(result.center,{x:380,y:380});
 const larger=boardGestureTarget(start,{x:380,y:380,distance:1000},rect);
 assert.equal(larger.zoom,3);
});
