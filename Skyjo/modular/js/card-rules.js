/* Pure SKYJO card scoring rules; no DOM, storage or network side effects. */
(function(global){
 'use strict';
 const api=Object.freeze({
  cardPoints:function(card){return card.type==='star'?0:Number(card.value||0)}
 });
 Object.defineProperty(global,'SKYJO_CARD_RULES',{value:api,writable:false,configurable:false});
})(window);
