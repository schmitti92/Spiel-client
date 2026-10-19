/* Isolated SKYJO host-preview engine. Not connected to server or ranked play. */
(function(root){'use strict';
const distribution=[[-2,5],[-1,10],[0,15],...[1,2,3,4,5,6,7,8,9,10,11,12].map(v=>[v,10])];
function shuffled(){const deck=[];for(const [v,n] of distribution)for(let i=0;i<n;i++)deck.push(v);for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}return deck}
function create(){const deck=shuffled(),boards=Array.from({length:3},()=>Array.from({length:12},()=>({value:deck.pop(),up:false})));return {deck,boards,discard:[deck.pop()],turn:0,pending:null,finished:false,history:[],winner:null}}
function current(s){return s.turn%3}
function allRevealed(s){return s.boards.every(b=>b.every(c=>c.up))}
function endIfFinished(s){if(allRevealed(s)){s.finished=true;s.winner=s.boards.map((b,i)=>({i,points:b.reduce((a,c)=>a+c.value,0)})).sort((a,b)=>a.points-b.points)[0].i}}
function finishTurn(s,detail){s.history.push({player:current(s),...detail});s.turn++;endIfFinished(s)}
function pick(s,source){if(s.finished||s.pending||!['deck','discard'].includes(source))return false;if(source==='deck'&&!s.deck.length)return false;if(source==='discard'&&!s.discard.length)return false;const value=source==='deck'?s.deck.pop():s.discard.pop();s.pending={source,value};return true}
function place(s,index,action='swap'){if(s.finished||!s.pending||!Number.isInteger(index)||index<0||index>=12)return false;const i=current(s),card=s.boards[i][index],p=s.pending;if(action==='discard-reveal'){if(p.source!=='deck'||card.up)return false;s.discard.push(p.value);card.up=true;finishTurn(s,{action:'discard-reveal',index,value:card.value})}else if(action==='swap'){s.discard.push(card.value);card.value=p.value;card.up=true;finishTurn(s,{action:'swap',index,value:p.value})}else return false;s.pending=null;return true}
function bot(s){if(s.finished||s.pending)return false;const cards=s.boards[current(s)];const hidden=cards.map((c,i)=>c.up?null:i).filter(i=>i!==null);const worst=cards.map((c,i)=>c.up?{i,v:c.value}:null).filter(Boolean).sort((a,b)=>b.v-a.v)[0];const top=s.discard.at(-1);const useDiscard=top!==undefined&&(top<=4||worst&&top<worst.v-1);if(!pick(s,useDiscard?'discard':'deck')){if(!pick(s,'discard'))return false}const p=s.pending;const replace=worst&&worst.v>p.value+1?worst.i:hidden[Math.floor(Math.random()*hidden.length)];if(replace===undefined){s.pending=null;return false}if(p.source==='deck'&&p.value>=8&&hidden.length>0)return place(s,hidden[Math.floor(Math.random()*hidden.length)],'discard-reveal');return place(s,replace,'swap')}
return root.SkyjoPreviewEngine={create,current,pick,place,bot,distribution};
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.SkyjoPreviewEngine;
