/* Isolated SKYJO room-code utilities. Keep original behavior. */
(function(global){
'use strict';
function normalizeCloudRoom(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,20)}
function randomCloudRoom(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<5;i++)out+=a[Math.floor(Math.random()*a.length)];return out}
Object.defineProperty(global,'SKYJO_ROOM_RULES',{value:Object.freeze({normalizeCloudRoom,randomCloudRoom}),writable:false,configurable:false});
})(window);
