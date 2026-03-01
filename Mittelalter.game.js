
// Mittelalter – stabile Version mit Überspringen aktiviert
// - Figuren dürfen übersprungen werden
// - Nur Endfeld wird geprüft
// - 6 = nochmal würfeln
// - Gegner können geschmissen werden
// - 1 Figur pro Feld
// - Anti-Hüpfen aktiv

(() => {

const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");
const btnRoll = document.getElementById("btnRoll");
const dieBox = document.getElementById("dieBox");
const statusLine = document.getElementById("statusLine");

const TEAM_COLORS = {
  1: "#ff5151",
  2: "#3aa0ff",
  3: "#42d17a",
  4: "#ffd166"
};

let board, nodes=[], edges=[];
let nodesById = new Map();
let adj = new Map();

const state = {
  players:[1,2,3,4],
  turn:0,
  roll:null,
  phase:"loading",
  selected:null,
  highlighted:new Set(),
  pieces:[],
  occupied:new Map()
};

function currentTeam(){ return state.players[state.turn]; }

function nextTurn(){
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.phase="needRoll";
  dieBox.textContent="–";
  statusLine.textContent=`Team ${currentTeam()} ist dran`;
}

function initPieces(){
  const starts = nodes.filter(n=>n.type==="start");
  let i=0;
  for(const s of starts){
    const id="p"+(++i);
    const p={id,team:Number(s.props.startTeam),node:s.id,prev:null};
    state.pieces.push(p);
    state.occupied.set(s.id,id);
  }
}

function computeTargets(piece,steps){
  state.highlighted.clear();

  const start=piece.node;
  const prev=piece.prev;

  const q=[{id:start,d:0}];
  const visited=new Set([start+"|0"]);

  while(q.length){
    const cur=q.shift();

    if(cur.d===steps){
      if(cur.id!==start){
        const occ=state.occupied.get(cur.id);
        if(!occ){
          state.highlighted.add(cur.id);
        }else{
          const op=state.pieces.find(x=>x.id===occ);
          if(op.team!==piece.team){
            state.highlighted.add(cur.id);
          }
        }
      }
      continue;
    }

    for(const nb of (adj.get(cur.id)||[])){

      if(cur.d===0 && prev && nb===prev) continue;

      const key=nb+"|"+(cur.d+1);
      if(visited.has(key)) continue;
      visited.add(key);

      // WICHTIG: KEINE Blockierung durch Figuren unterwegs
      q.push({id:nb,d:cur.d+1});
    }
  }
}

function move(piece,target){
  const occ=state.occupied.get(target);
  if(occ){
    const other=state.pieces.find(p=>p.id===occ);
    if(other.team===piece.team) return false;
    state.occupied.delete(other.node);
    other.node=null;
  }

  state.occupied.delete(piece.node);
  piece.prev=piece.node;
  piece.node=target;
  state.occupied.set(target,piece.id);
  return true;
}

canvas.addEventListener("click",(e)=>{
  if(state.phase!=="chooseTarget") return;

  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;

  for(const n of nodes){
    const dx=x-n.x,dy=y-n.y;
    if(dx*dx+dy*dy<=18*18){
      if(!state.highlighted.has(n.id)) return;
      const piece=state.pieces.find(p=>p.id===state.selected);
      if(move(piece,n.id)){
        if(state.roll===6){
          state.phase="needRoll";
          statusLine.textContent="6! Nochmal würfeln.";
        }else{
          nextTurn();
        }
      }
    }
  }
});

btnRoll.addEventListener("click",()=>{
  if(state.phase!=="needRoll") return;

  state.roll=Math.floor(Math.random()*6)+1;
  dieBox.textContent=state.roll;
  state.selected=state.pieces.find(p=>p.team===currentTeam()).id;
  computeTargets(state.pieces.find(p=>p.id===state.selected),state.roll);
  state.phase="chooseTarget";
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(const e of edges){
    const a=nodesById.get(e.a);
    const b=nodesById.get(e.b);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.strokeStyle="rgba(255,255,255,.2)";
    ctx.stroke();
  }

  for(const n of nodes){
    ctx.beginPath();
    ctx.arc(n.x,n.y,18,0,Math.PI*2);
    ctx.fillStyle=state.highlighted.has(n.id)?"rgba(124,92,255,.4)":"rgba(255,255,255,.1)";
    ctx.fill();
  }

  for(const p of state.pieces){
    if(!p.node) continue;
    const n=nodesById.get(p.node);
    ctx.beginPath();
    ctx.arc(n.x,n.y,12,0,Math.PI*2);
    ctx.fillStyle=TEAM_COLORS[p.team];
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

async function load(){
  const res=await fetch("Mitteralter.board.json?v="+Date.now(),{cache:"no-store"});
  board=await res.json();
  nodes=board.nodes;
  edges=board.edges;
  nodesById=new Map(nodes.map(n=>[n.id,n]));
  adj=new Map();
  for(const n of nodes) adj.set(n.id,[]);
  for(const e of edges){
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }

  initPieces();
  state.phase="needRoll";
  statusLine.textContent=`Team ${currentTeam()} ist dran`;
}

load();
draw();

})();
