// Mission 4 card foundation: local, deterministic, no movement or reward effects.
import {CARD_TYPES,makeDeck,dogCardsPerRound} from '../engine.js';
export const TYPES=CARD_TYPES;
export const SEATS=Object.freeze(['red','blue','green']);
export const HAND_SIZE=6;
const clone=x=>JSON.parse(JSON.stringify(x));
const check=(condition,message)=>{if(!condition)throw Error(message);};
const canonical=makeDeck;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function shuffle(a,s){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function log(s,message){s.history.unshift(message);s.history.length=Math.min(18,s.history.length);}
function drawOne(s){if(!s.draw.length){check(s.discard.length,'Keine Karten verfügbar.');s.draw=shuffle(s.discard.splice(0),s);}return s.draw.pop();}
function deal(s){
 check(s.hands.every(h=>h.length===0),'Vor der neuen Kartenphase müssen alle Hände leer sein.');
 s.phase++;s.round=1;s.current=s.starter;s.stage='exchange';s.exchanges=[null,null,null];const count=dogCardsPerRound(s.phase);
 for(let i=0;i<count;i++)for(let j=0;j<3;j++)s.hands[(s.starter+j)%3].push(drawOne(s));
 log(s,'Kartenphase '+s.phase+' – jeweils '+count+' Karten; Karte weitergeben.');
}
export function createCards(seed=Date.now()){
 const s={version:1,mode:'local-card-test',rng:Number(seed)>>>0,phase:0,round:1,turn:0,starter:0,current:0,hands:[[],[],[]],draw:[],discard:[],last:null,history:[]};
 s.draw=shuffle(canonical(),s);s.starter=Math.floor(random(s)*3);deal(s);return s;
}
export function cardTotal(s){return s.draw.length+s.discard.length+s.hands.reduce((sum,h)=>sum+h.length,0)+s.exchanges.filter(Boolean).length;}
export function validateCards(s){
 if(!s||s.mode!=='local-card-test'||s.version!==1||!Number.isInteger(s.current)||s.current<0||s.current>2||!Number.isInteger(s.starter)||s.starter<0||s.starter>2||!Array.isArray(s.hands)||s.hands.length!==3||!s.hands.every(Array.isArray)||!Array.isArray(s.draw)||!Array.isArray(s.discard))return false;
 if(!['exchange','play'].includes(s.stage)||!Array.isArray(s.exchanges)||s.exchanges.length!==3)return false;
 const cards=[...s.draw,...s.discard,...s.hands.flat(),...s.exchanges.filter(Boolean)],expected=canonical();
 return cards.length===110&&new Set(cards.map(c=>c.id)).size===110&&cards.every(c=>expected[c.id-1]?.type===c.type)&&s.hands.every(h=>h.length<=dogCardsPerRound(s.phase))&&s.hands[s.current].length>0&&Number.isInteger(s.phase)&&s.phase>=1;
}
export function passCard(s,id){
 check(s.stage==='exchange','Die Kartenweitergabe ist bereits beendet.');const n=clone(s),seat=n.current,hand=n.hands[seat],i=hand.findIndex(c=>c.id===id);check(i>=0&&!n.exchanges[seat],'Diese Karte kann nicht weitergegeben werden.');n.exchanges[seat]=hand.splice(i,1)[0];log(n,SEATS[seat]+' · Karte verdeckt weitergegeben');
 if(n.exchanges.every(Boolean)){for(let i=0;i<3;i++)n.hands[(i+1)%3].push(n.exchanges[i]);n.exchanges=[null,null,null];n.stage='play';n.current=n.starter;log(n,'Alle drei Karten wurden im Uhrzeigersinn weitergegeben.');}else n.current=(seat+1)%3;
 return n;
}
// Explicitly a test-only discard, never considered a validated movement.
export function testDiscard(s,id){
 check(s.stage==='play','Zuerst muss jeder eine Karte weitergeben.');const n=clone(s),hand=n.hands[n.current],i=hand.findIndex(c=>c.id===id);
 check(i>=0,'Diese Karte gehört nicht dem aktiven Spieler.');
 const card=hand.splice(i,1)[0];n.discard.push(card);n.last=card;n.turn++;log(n,SEATS[n.current]+' · Testablage '+card.type);
 if(n.hands.every(h=>!h.length)){n.starter=(n.starter+1)%3;deal(n);}
 else{let next=(n.current+1)%3;while(!n.hands[next].length)next=(next+1)%3;if(next===n.starter)n.round++;n.current=next;}
 return n;
}
export function testDeal(s){const n=clone(s);for(const h of n.hands)n.discard.push(...h.splice(0));n.discard.push(...n.exchanges.filter(Boolean));n.exchanges=[null,null,null];n.starter=(n.starter+1)%3;deal(n);return n;}
// Replace one actual card with an existing card in draw/discard. Never create extra cards.
export function testChooseCard(s,seat,slot,type){
 check(Number.isInteger(seat)&&seat>=0&&seat<3&&TYPES.includes(type),'Ungültige Kartenauswahl.');
 const n=clone(s),hand=n.hands[seat];check(Number.isInteger(slot)&&slot>=0&&slot<hand.length,'Wähle eine vorhandene Handkarte.');
 if(hand[slot].type===type)return n;
 const own=hand.findIndex(c=>c.type===type);
 if(own>=0){[hand[slot],hand[own]]=[hand[own],hand[slot]];return n;}
 for(const pile of [n.draw,n.discard]){const i=pile.findIndex(c=>c.type===type);if(i>=0){[hand[slot],pile[i]]=[pile[i],hand[slot]];log(n,'Testkarte '+type+' für '+SEATS[seat]);return n;}}
 throw Error('Alle Karten dieses Typs befinden sich in anderen Händen. Es werden keine zusätzlichen Karten erzeugt.');
}
export function placeTestPiece(board,pieces,id,field){
 const pawn=pieces.find(p=>p.id===id);check(pawn,'Unbekannte Figur.');
 const pos=field===null?board.source.starts[pawn.color][Number(id.split('-').at(-1))-1]:board.fields[field-1]?.position;
 check(field===null||(Number.isInteger(field)&&field>=1&&pos),'Dieses Lauffeld ist noch nicht gesetzt.');
 check(pos,'Startplatz fehlt.');
 check(!pieces.some(p=>p.id!==id&&p.position.x===pos.x&&p.position.y===pos.y),'Das Feld ist schon durch eine Figur besetzt.');
 return pieces.map(p=>p.id===id?{...p,position:{...pos},field}:p);
}
