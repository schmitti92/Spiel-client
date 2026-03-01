// Mittelalter – stabile Version + Barrikaden (OHNE Funktionsverlust zur Basis)
// - Figuren dürfen übersprungen werden (Figuren blocken den Weg NICHT)
// - Nur Endfeld wird geprüft (1 Figur pro Feld)
// - 6 = nochmal würfeln (nach evtl. Barrikaden-Platzierung)
// - Gegner können geschmissen werden
// - Anti-Hüpfen aktiv (nicht direkt zurück aufs vorherige Feld)
// - Barrikaden:
//   * dürfen NICHT übersprungen werden (blocken den Laufweg zwischen Start und Ziel)
//   * wenn man drauf landet: aufnehmen
//   * danach: irgendwo frei platzieren (auch auf Ereignis-/Spezialfeldern)
//   * nicht auf Startfeldern platzieren
//
// Hinweis: Dieses File bleibt bewusst nah an deiner geposteten Basis-Version.
// (Auto-Auswahl der ersten Team-Figur bleibt wie in deiner Basis.)

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

// --- Barrikaden als dynamisches Overlay (nicht mehr "Node-Type") ---
const barricades = new Set(); // nodeId -> barricade liegt dort

const state = {
  players:[1,2,3,4],
  turn:0,
  roll:null,
  phase:"loading",          // loading | needRoll | chooseTarget | placeBarricade
  selected:null,
  highlighted:new Set(),     // Zielfelder für Bewegung
  placeHighlighted:new Set(),// mögliche Felder für Barrikaden-Platzierung
  pieces:[],
  occupied:new Map(),
  carry:{1:0,2:0,3:0,4:0},   // wie viele Barrikaden trägt Team x
  pendingSix:false           // merken, ob nach dieser Aktion nochmal gewürfelt werden darf
};

function currentTeam(){ return state.players[state.turn]; }

function isStartNode(nodeId){
  const n = nodesById.get(nodeId);
  return !!n && n.type === "start";
}

function isFreeForBarricade(nodeId){
  // frei heißt: kein Spieler und keine Barrikade
  if(state.occupied.has(nodeId)) return false;
  if(barricades.has(nodeId)) return false;
  // Sicherheit: nicht auf Startfeldern
  if(isStartNode(nodeId)) return false;
  return true;
}

function nextTurn(){
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  state.pendingSix=false;
  dieBox.textContent="–";
  statusLine.textContent=`Team ${currentTeam()} ist dran`;
}

function stayNeedRollSameTeam(msg){
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  dieBox.textContent="–";
  statusLine.textContent = msg || `Team ${currentTeam()} ist dran`;
}

function initPieces(){
  state.pieces = [];
  state.occupied.clear();
  state.carry = {1:0,2:0,3:0,4:0};
  state.placeHighlighted.clear();
  barricades.clear();

  // Barrikaden aus dem Board lesen (Nodes mit type:"barricade") => als Overlay speichern
  for(const n of nodes){
    if(n.type === "barricade"){
      barricades.add(n.id);
    }
  }

  // Figuren auf Startfeldern
  const starts = nodes.filter(n=>n.type==="start");
  let i=0;
  for(const s of starts){
    const id="p"+(++i);
    const p={id,team:Number(s.props.startTeam),node:s.id,prev:null};
    state.pieces.push(p);
    state.occupied.set(s.id,id);
  }
}

function computePlaceTargets(){
  state.placeHighlighted.clear();
  for(const n of nodes){
    if(isFreeForBarricade(n.id)){
      state.placeHighlighted.add(n.id);
    }
  }
}

// Bewegung: Figuren dürfen übersprungen werden, aber Barrikaden blocken Zwischen-Schritte
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
          if(op && op.team!==piece.team){
            state.highlighted.add(cur.id);
          }
        }
      }
      continue;
    }

    for(const nb of (adj.get(cur.id)||[])){

      // Anti-Hüpfen: erster Schritt nicht direkt zurück
      if(cur.d===0 && prev && nb===prev) continue;

      // ✅ Barrikade blockt Zwischen-Schritte (nicht überspringen)
      // Wenn auf dem nächsten Feld eine Barrikade liegt, ist das nur erlaubt,
      // wenn es GENAU das Zielfeld (letzter Schritt) wäre.
      if(barricades.has(nb) && (cur.d+1) < steps) continue;

      const key=nb+"|"+(cur.d+1);
      if(visited.has(key)) continue;
      visited.add(key);

      // ✅ Figuren unterwegs blocken NICHT (überspringen erlaubt)
      q.push({id:nb,d:cur.d+1});
    }
  }
}

function move(piece,target){
  const occ=state.occupied.get(target);
  if(occ){
    const other=state.pieces.find(p=>p.id===occ);
    if(other && other.team===piece.team) return false;
    // Gegner schmeißen: einfach vom Feld nehmen (wie in deiner Basis)
    if(other){
      state.occupied.delete(other.node);
      other.node=null;
      other.prev=null;
    }
  }

  state.occupied.delete(piece.node);
  piece.prev=piece.node;
  piece.node=target;
  state.occupied.set(target,piece.id);
  return true;
}

function afterLanding(piece){
  const team = piece.team;

  // Wenn auf dem Zielfeld eine Barrikade lag -> aufnehmen und platzieren
  if(barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    computePlaceTargets();
    state.phase = "placeBarricade";
    statusLine.textContent = `Team ${team}: Barrikade aufgenommen! Feld zum Platzieren tippen.`;
    return;
  }

  // Kein Barrikaden-Event
  if(state.pendingSix){
    state.pendingSix = false;
    stayNeedRollSameTeam(`6! Team ${team} darf nochmal würfeln.`);
  }else{
    nextTurn();
  }
}

function placeBarricadeAt(nodeId){
  const team = currentTeam();
  if(state.phase!=="placeBarricade") return false;
  if(!state.placeHighlighted.has(nodeId)) return false;
  if((state.carry[team]||0) <= 0) return false;

  barricades.add(nodeId);
  state.carry[team] -= 1;
  state.placeHighlighted.clear();

  if(state.pendingSix){
    state.pendingSix = false;
    stayNeedRollSameTeam(`Barrikade platziert + 6! Team ${team} würfelt nochmal.`);
  }else{
    nextTurn();
  }
  return true;
}

// --- Input ---
canvas.addEventListener("click",(e)=>{
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;

  // Hit-Test Nodes (wie Basis)
  for(const n of nodes){
    const dx=x-n.x,dy=y-n.y;
    if(dx*dx+dy*dy<=18*18){

      if(state.phase==="chooseTarget"){
        if(!state.highlighted.has(n.id)) return;

        const piece=state.pieces.find(p=>p.id===state.selected);
        if(!piece) return;

        if(move(piece,n.id)){
          // 6 merken (Extra-Wurf erst nach evtl. Barrikaden-Platzierung)
          state.pendingSix = (state.roll === 6);

          // Bewegungs-Highlights reset
          state.highlighted.clear();

          // Landing-Logik (Barrikade aufnehmen etc.)
          afterLanding(piece);
        }
        return;
      }

      if(state.phase==="placeBarricade"){
        placeBarricadeAt(n.id);
        return;
      }

      return;
    }
  }
});

btnRoll.addEventListener("click",()=>{
  if(state.phase!=="needRoll") return;

  state.roll=Math.floor(Math.random()*6)+1;
  dieBox.textContent=state.roll;

  // Funktionsgleich zur Basis: erste Figur des Teams wird verwendet
  const first = state.pieces.find(p=>p.team===currentTeam() && p.node);
  if(!first){
    statusLine.textContent = `Team ${currentTeam()}: Keine Figur auf dem Board.`;
    return;
  }

  state.selected = first.id;
  computeTargets(first,state.roll);
  state.phase = "chooseTarget";
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Edges
  for(const e of edges){
    const a=nodesById.get(e.a);
    const b=nodesById.get(e.b);
    if(!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.strokeStyle="rgba(255,255,255,.2)";
    ctx.stroke();
  }

  // Nodes
  for(const n of nodes){
    ctx.beginPath();
    ctx.arc(n.x,n.y,18,0,Math.PI*2);

    let fill = "rgba(255,255,255,.1)";
    if(state.highlighted.has(n.id)) fill = "rgba(124,92,255,.4)";
    if(state.phase==="placeBarricade" && state.placeHighlighted.has(n.id)) fill = "rgba(65,209,122,.26)";
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // Barrikaden zeichnen (gelbes Quadrat)
  for(const id of barricades){
    const n = nodesById.get(id);
    if(!n) continue;
    ctx.save();
    ctx.strokeStyle = "rgba(255,204,102,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(n.x-12, n.y-12, 24, 24);
    ctx.stroke();
    ctx.restore();
  }

  // Pieces
  for(const p of state.pieces){
    if(!p.node) continue;
    const n=nodesById.get(p.node);
    if(!n) continue;
    ctx.beginPath();
    ctx.arc(n.x,n.y,12,0,Math.PI*2);
    ctx.fillStyle=TEAM_COLORS[p.team];
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

async function load(){
  // Cache-Schutz: nutze VERSION wenn vorhanden, sonst Timestamp
  const V = (typeof VERSION !== "undefined" && VERSION) ? VERSION : Date.now();
  const res=await fetch("Mitteralter.board.json?v="+V,{cache:"no-store"});
  board=await res.json();
  nodes=board.nodes;
  edges=board.edges;
  nodesById=new Map(nodes.map(n=>[n.id,n]));
  adj=new Map();
  for(const n of nodes) adj.set(n.id,[]);
  for(const e of edges){
    if(!adj.has(e.a)) adj.set(e.a,[]);
    if(!adj.has(e.b)) adj.set(e.b,[]);
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
