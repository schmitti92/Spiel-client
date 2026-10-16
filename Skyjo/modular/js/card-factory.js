/* Pure card object constructors; the existing IIFE still owns unique ID generation. */
(function(global){
'use strict';
function newCard(id,type,value=null){return {id,type,value,faceUp:false}}
function newAction(id,type){return {id,type,availableOwnTurn:0,stolen:false}}
Object.defineProperty(global,'SKYJO_CARD_FACTORY',{value:Object.freeze({newCard,newAction}),writable:false,configurable:false});
})(window);
