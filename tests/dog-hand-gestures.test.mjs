import test from 'node:test';
import assert from 'node:assert/strict';
import {HAND_ZOOM_MIN,HAND_ZOOM_MAX,handGesturePosition} from '../DOG/hand-gestures.js';

const start={zoom:1,scrollLeft:0,scrollTop:0,midX:150,midY:100,distance:100,left:50,top:20};

test('pinch zoom anchors at the two-finger midpoint',()=>{
 const result=handGesturePosition(start,{x:150,y:100},200);
 assert.equal(result.zoom,2);
 assert.equal(result.scrollLeft,100);
 assert.equal(result.scrollTop,80);
});

test('two-finger drag pans while keeping the zoom unchanged',()=>{
 const result=handGesturePosition(start,{x:175,y:110},100);
 assert.equal(result.zoom,1);
 assert.equal(result.scrollLeft,-25);
 assert.equal(result.scrollTop,-10);
});

test('pinch clamps to safe zoom bounds',()=>{
 assert.equal(handGesturePosition(start,{x:150,y:100},400).zoom,HAND_ZOOM_MAX);
 assert.equal(handGesturePosition({...start,zoom:2,distance:100},{x:150,y:100},1).zoom,HAND_ZOOM_MIN);
});

test('pan at nonzero zoom is calculated from initial scroll position',()=>{
 const initial={...start,zoom:2,scrollLeft:80,scrollTop:30};
 const result=handGesturePosition(initial,{x:175,y:120},100);
 assert.equal(result.zoom,2);
 assert.equal(result.scrollLeft,55);
 assert.equal(result.scrollTop,10);
});
