import test from 'node:test';
import assert from 'node:assert/strict';
import {boardGestureTarget,nearestTrackPawn,boardEventPoint} from '../DOG/board-gesture-math.js';

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

test('swap tapping resolves the nearest track pawn by stable ID',()=>{
 const track=Array.from({length:64},()=>null);
 track[7]={x:120,y:120};track[19]={x:210,y:120};
 const pieces=[
  {id:0,owner:0,place:'track',pos:7},
  {id:8,owner:2,place:'track',pos:19},
  {id:12,owner:3,place:'home',pos:-1}
 ];
 assert.equal(nearestTrackPawn(pieces,{x:211,y:117},track,24),8);
 assert.equal(nearestTrackPawn(pieces,{x:123,y:119},track,24),0);
 assert.equal(nearestTrackPawn(pieces,{x:255,y:120},track,24),null);
 assert.equal(nearestTrackPawn(pieces,{x:120,y:120},track,0),0);
 assert.equal(nearestTrackPawn(pieces,{x:120,y:120},track,-1),null);
});

test('green goal lane is hit by a slightly imprecise tap without picking another colour',async()=>{
 const {GOAL_POINTS,TRACK_POINTS}=await import('../DOG/board-layout.js');
 const {nearestBoardField}=await import('../DOG/board-gesture-math.js');
 const spot=GOAL_POINTS[2][0];
 const selected=nearestBoardField({x:spot.x+8,y:spot.y-6},TRACK_POINTS,GOAL_POINTS);
 assert.equal(selected.key,'goal:0');
 assert.equal(selected.seat,2);
 assert.equal(nearestBoardField({x:-300,y:-300},TRACK_POINTS,GOAL_POINTS),null);
});

test('DOMPoint and legacy SVGPoint produce identical board coordinates',()=>{
 const m={inverse:()=>({})};
 const svg={getScreenCTM:()=>m,createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:this.x-10,y:this.y-20};}})};
 class TestPoint{
  constructor(x,y){this.x=x;this.y=y;}
  matrixTransform(){return {x:this.x-10,y:this.y-20};}
 }
 const evt={clientX:110,clientY:220};
 const expected={x:100,y:200};
 assert.deepEqual(boardEventPoint(svg,evt,TestPoint),expected);
 assert.deepEqual(boardEventPoint(svg,evt,null),expected);
});
