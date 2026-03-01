// Mittelalter – Phase 1.1 (mit Barrikaden)
// ✅ Figuren dürfen übersprungen werden (AUßER Barrikaden – die blocken den Weg!)
// ✅ Nur Endfeld wird geprüft (1 Figur pro Feld)
// ✅ Gegner können geschmissen werden
// ✅ Bei 6: nochmal würfeln (nach evtl. Barrikaden-Platzierung)
// ✅ Barrikade:
//    - darf NICHT übersprungen werden (blockt Zwischen-Schritte)
//    - wenn du drauf landest: automatisch aufnehmen
//    - danach: irgendwo frei platzieren (auch auf Ereignisfelder / Spezialfelder)
//    - (Sicherheit) NICHT auf Startfelder platzieren

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

// Barrikaden-Positionen (separat vom Node-Type, damit wir sie "wegnehmen" & woanders platzieren können)
const barricades = new Set(); // nodeId

const state = {
  players:[1,2,3,4],
  turn:0,
  roll:null,
  phase:"loading", // loading | needRoll | chooseTarget | placeBarricade
  selected:null,
  highlighted:new Set(),       // Move targets
  placeHighlighted:new Set(),  // Barricade placement targets
  pieces:[],
  occupied:new Map(),
  carry: {1:0,2:0,3:0,4:0},    // wie viele Barrikaden trägt Team x
  pendingSix:false            // ob nach Aktion nochmal gewürfelt werden darf
};

function currentTeam(){ return state.players[state.turn]; }

function isStartNode(id){
  const n = nodesById.get(id);
  return !!n && n.type === "start";
}

function isFreeForBarricade(id){
  // frei heißt: kein Spieler drauf UND keine Barrikade drauf
  if (state.occupied.has(id)) return false;
  if (barricades.has(id)) return false;
  // Sicherheit: nicht auf Start platzieren
  if (isStartNode(id)) return false;
  return true;
}

function setStatus(t){ statusLine.textContent = t; }

function nextTurn(){
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  state.pendingSix=false;
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

function staySameTeamNeedRoll(msg){
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  dieBox.textContent="–";
  setStatus(msg || `Team ${currentTeam()} ist dran: Würfeln.`);
}

function initPieces(){
  state.pieces=[];
  state.occupied.clear();
  state.carry = {1:0,2:0,3:0,4:0};

  // Barrikaden initial aus dem Board lesen: nodes mit type "barricade"
  barricades.clear();
  for(const n of nodes){
    if(n.type === "barricade"){
      barricades.add(n.id);
    }
  }

  // Auf ALLEN Startfeldern eine Figur (wie vorher)
  const starts = nodes.filter(n=>n.type==="start");
  let i=0;
  for(const s of starts){
    const id="p"+(++i);
    const p={id,team:Number(s.props.startTeam),node:s.id,prev:null};
    state.pieces.push(p);
    state.occupied.set(s.id,id);
  }
}

function computeMoveTargets(piece,steps){
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

      // ✅ Barrikade blockt Zwischen-Schritte (nicht überspringen!)
      // Wenn auf nb eine Barrikade liegt und wir NICHT genau dort landen, ist der Pfad blockiert.
      if(barricades.has(nb) && (cur.d+1) < steps) continue;

      const key=nb+"|"+(cur.d+1);
      if(visited.has(key)) continue;
      visited.add(key);

      // ✅ Figuren unterwegs blocken NICHT (überspringen erlaubt)
      q.push({id:nb,d:cur.d+1});
    }
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

function kickToStart(other){
  // Gegner "schmeißen": zurück auf ein freies Startfeld seines Teams, sonst bleibt er in "Reserve" (node=null)
  state.occupied.delete(other.node);
  other.node = null;
  other.prev = null;

  const starts = nodes.filter(n=>n.type==="start" && Number(n.props?.startTeam)===other.team);
  for(const s of starts){
    if(!state.occupied.has(s.id)){
      other.node = s.id;
      state.occupied.set(s.id, other.id);
      return;
    }
  }
  // kein freies Startfeld -> bleibt offboard
}

function move(piece,target){
  const occ=state.occupied.get(target);
  if(occ){
    const other=state.pieces.find(p=>p.id===occ);
    if(other && other.team===piece.team) return false;
    if(other) kickToStart(other);
  }

  state.occupied.delete(piece.node);
  piece.prev=piece.node;
  piece.node=target;
  state.occupied.set(target,piece.id);
  return true;
}

function afterLanding(piece){
  const team = piece.team;

  // ✅ Wenn auf dem Zielfeld eine Barrikade liegt -> aufnehmen und danach platzieren
  if(barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    // Placement Phase
    computePlaceTargets();
    state.phase = "placeBarricade";
    setStatus(`Team ${team}: Barrikade aufgenommen! Tippe ein freies Feld zum Platzieren.`);
    return;
  }

  // Keine Barrikade aufgenommen -> normal weiter
  if(state.pendingSix){
    state.pendingSix=false;
    staySameTeamNeedRoll(`Team ${team}: Du hast eine 6! Nochmal würfeln.`);
  }else{
    nextTurn();
  }
}

function placeBarricadeAt(nodeId){
  const team = currentTeam();
  if(!state.placeHighlighted.has(nodeId)) return false;
  if((state.carry[team]||0) <= 0) return false;

  barricades.add(nodeId);
  state.carry[team] -= 1;

  // Nach Platzierung: wenn 6 -> nochmal würfeln, sonst Zugwechsel
  state.placeHighlighted.clear();
  if(state.pendingSix){
    state.pendingSix=false;
    staySameTeamNeedRoll(`Team ${team}: Barrikade platziert + 6! Nochmal würfeln.`);
  }else{
    nextTurn();
  }
  return true;
}

// ---------- Click / Tap ----------
canvas.addEventListener("click",(e)=>{
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;

  // hit test
  const R=18;
  let hit=null;
  for(const n of nodes){
    const dx=x-n.x,dy=y-n.y;
    if(dx*dx+dy*dy<=R*R){ hit=n; break; }
  }
  if(!hit) return;

  if(state.phase==="chooseTarget"){
    if(!state.highlighted.has(hit.id)) return;

    const piece=state.pieces.find(p=>p.id===state.selected);
    if(!piece) return;

    if(move(piece,hit.id)){
      // merken ob 6 (extra roll) – gilt erst NACH evtl. Barrikadenplatzierung
      state.pendingSix = (state.roll === 6);

      // Move-Ende: Targets reset
      state.highlighted.clear();

      // Landing logic (barricade pickup etc.)
      afterLanding(piece);
    }
    return;
  }

  if(state.phase==="placeBarricade"){
    placeBarricadeAt(hit.id);
    return;
  }
});

// ---------- Würfeln ----------
btnRoll.addEventListener("click",()=>{
  if(state.phase!=="needRoll") return;

  state.roll=Math.floor(Math.random()*6)+1;
  dieBox.textContent=state.roll;

  // simple Auswahl wie bisher: erste Figur des Teams
  const piece = state.pieces.find(p=>p.team===currentTeam() && p.node);
  if(!piece){
    setStatus(`Team ${currentTeam()}: Keine Figur auf dem Board.`);
    return;
  }

  state.selected=piece.id;
  computeMoveTargets(piece,state.roll);
  state.phase="chooseTarget";
  setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Tippe ein leuchtendes Zielfeld.`);
});

// ---------- Render ----------
function draw(){
  // Canvas auf CSS-Größe setzen (einfach)
  const dpr = Math.max(1, window.devicePixelRatio||1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if(canvas.width!==w || canvas.height!==h){
    canvas.width=w; canvas.height=h;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

  // Edges
  ctx.lineWidth=2;
  ctx.strokeStyle="rgba(255,255,255,.18)";
  for(const e of edges){
    const a=nodesById.get(e.a);
    const b=nodesById.get(e.b);
    if(!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

  // Nodes + Highlights
  const R=18;
  for(const n of nodes){
    ctx.beginPath();
    ctx.arc(n.x,n.y,R,0,Math.PI*2);

    let fill="rgba(255,255,255,.10)";
    if(state.highlighted.has(n.id)) fill="rgba(124,92,255,.38)";
    if(state.phase==="placeBarricade" && state.placeHighlighted.has(n.id)) fill="rgba(65,209,122,.28)";

    ctx.fillStyle=fill;
    ctx.fill();

    // outline
    ctx.strokeStyle="rgba(255,255,255,.12)";
    ctx.stroke();
  }

  // Barrikaden als Overlay (sichtbar, aber können "versteckt" sein: du darfst sie trotzdem auf Ereignisfelder setzen)
  // Wenn du sie wirklich unsichtbar auf Ereignis willst: sag Bescheid, dann mache ich "Ereignis überdeckt Barrikade optisch".
  for(const id of barricades){
    const n = nodesById.get(id);
    if(!n) continue;
    ctx.save();
    ctx.strokeStyle="rgba(255,204,102,.85)";
    ctx.lineWidth=3;
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
    ctx.fillStyle=TEAM_COLORS[p.team] || "#fff";
    ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.35)";
    ctx.lineWidth=2;
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}

// ---------- Load ----------
async function load(){
  const V = (typeof window !== "undefined" && window.BUILD_ID) ? window.BUILD_ID : String(Date.now());
  const res=await fetch(`Mitteralter.board.json?v=${V}`,{cache:"no-store"});
  board=await res.json();
  nodes=board.nodes||[];
  edges=board.edges||[];

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
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

load();
draw();

})();
