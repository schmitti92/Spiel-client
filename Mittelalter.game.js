// Mittelalter – Stabile Basis + Barrikaden + Sidebar + Pan/Zoom (ohne Funktionsverlust)
// - Figur auswählen: Tippe eigene Figur
// - Figuren dürfen übersprungen werden (Figuren blocken NICHT)
// - Barrikaden dürfen NICHT übersprungen werden (blocken Zwischen-Schritte)
// - Landest du auf Barrikade: aufnehmen → danach frei platzieren (auch auf Ereignisfeldern), nicht auf Start
// - 6 = nochmal würfeln (nach evtl. Barrikaden-Platzierung)
// - Gegner können geschmissen werden (gehen vom Feld, Startlogik kann später kommen)
// - Anti-Hüpfen: nicht direkt zurück aufs vorherige Feld
// - Zielfelder werden sichtbar gehighlightet

(() => {
  const $ = (id) => document.getElementById(id);

  const canvas = $("boardCanvas");
  const ctx = canvas.getContext("2d");

  const btnRoll = $("btnRoll");
  const btnFit  = $("btnFit");
  const dieBox  = $("dieBox");
  const statusLine = $("statusLine");
  const curPlayerEl = $("curPlayer");
  const curPhaseEl  = $("curPhase");
  const carryInfoEl = $("carryInfo");

  const TEAM_COLORS = {
    1: "#ff5151",
    2: "#3aa0ff",
    3: "#42d17a",
    4: "#ffd166"
  };

  // --- Camera / Pan / Zoom ---
  const cam = { x: 0, y: 0, scale: 1, minScale: 0.35, maxScale: 2.8 };

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  function resizeCanvasToDisplaySize(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));
    const cw = Math.floor(w * dpr), ch = Math.floor(h * dpr);
    if(canvas.width !== cw || canvas.height !== ch){
      canvas.width = cw; canvas.height = ch;
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return { w, h };
  }

  function worldToScreen(wx, wy){
    return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
  }
  function screenToWorld(sx, sy){
    return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
  }

  let bounds = null;

  function computeBounds(nodes){
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for(const n of nodes){
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    return { minX, minY, maxX, maxY };
  }

  function fitToBoard(){
    if(!bounds) return;
    const { w, h } = resizeCanvasToDisplaySize();
    const pad = 90;
    const bw = (bounds.maxX - bounds.minX) + pad*2;
    const bh = (bounds.maxY - bounds.minY) + pad*2;
    const s = clamp(Math.min(w/bw, h/bh), cam.minScale, cam.maxScale);
    cam.scale = s;
    cam.x = bounds.minX - pad;
    cam.y = bounds.minY - pad;
  }

  // --- Board ---
  let board=null, nodes=[], edges=[];
  let nodesById = new Map();
  let adj = new Map();

  // Barrikaden dynamisch
  const barricades = new Set(); // nodeId

  const state = {
    players:[1,2,3,4],
    turn:0,
    roll:null,
    phase:"loading",          // loading | needRoll | choosePiece | chooseTarget | placeBarricade
    selected:null,            // pieceId
    highlighted:new Set(),     // move targets (nodeId)
    placeHighlighted:new Set(),// barricade placement targets
    pieces:[],
    occupied:new Map(),        // nodeId -> pieceId
    carry:{1:0,2:0,3:0,4:0},
    pendingSix:false
  };

  function currentTeam(){ return state.players[state.turn]; }

  function setDie(v){ dieBox.textContent = (v==null? "–" : String(v)); }
  function setStatus(t){ statusLine.textContent = t; }

  function setSidebar(){
    const t = currentTeam();
    curPlayerEl.textContent = `Team ${t}`;
    curPhaseEl.textContent = ({
      loading:"Lade…",
      needRoll:"Würfeln",
      choosePiece:"Figur wählen",
      chooseTarget:"Zielfeld wählen",
      placeBarricade:"Barrikade platzieren"
    })[state.phase] || state.phase;

    const carry = state.carry[t] || 0;
    carryInfoEl.textContent = String(carry);
  }

  function nextTurn(){
    state.turn = (state.turn+1)%state.players.length;
    state.roll=null;
    state.selected=null;
    state.highlighted.clear();
    state.placeHighlighted.clear();
    state.phase="needRoll";
    state.pendingSix=false;
    setDie(null);
    setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
    setSidebar();
  }

  function stayNeedRollSameTeam(msg){
    state.roll=null;
    state.selected=null;
    state.highlighted.clear();
    state.placeHighlighted.clear();
    state.phase="needRoll";
    setDie(null);
    setStatus(msg || `Team ${currentTeam()} ist dran: Würfeln.`);
    setSidebar();
  }

  function isStartNode(id){
    const n = nodesById.get(id);
    return !!n && n.type === "start";
  }

  function isFreeForBarricade(id){
    if(state.occupied.has(id)) return false;
    if(barricades.has(id)) return false;
    if(isStartNode(id)) return false; // Sicherheit
    return true;
  }

  function initPieces(){
    state.pieces = [];
    state.occupied.clear();
    state.carry = {1:0,2:0,3:0,4:0};
    barricades.clear();

    // initiale Barrikaden: nodes mit type "barricade"
    for(const n of nodes){
      if(n.type === "barricade") barricades.add(n.id);
    }

    const starts = nodes.filter(n=>n.type==="start");
    let i=0;
    for(const s of starts){
      const id="p"+(++i);
      const p={ id, team:Number(s.props.startTeam), node:s.id, prev:null };
      state.pieces.push(p);
      state.occupied.set(s.id, id);
    }
  }

  function computePlaceTargets(){
    state.placeHighlighted.clear();
    for(const n of nodes){
      if(isFreeForBarricade(n.id)) state.placeHighlighted.add(n.id);
    }
  }

  // Path search: figures don't block; barricades block in-between
  function computeMoveTargets(piece, steps){
    state.highlighted.clear();
    const start = piece.node;
    const prev  = piece.prev;

    const q = [{ id:start, d:0 }];
    const visited = new Set([start+"|0"]);

    while(q.length){
      const cur = q.shift();

      if(cur.d === steps){
        if(cur.id !== start){
          const occ = state.occupied.get(cur.id);
          if(!occ){
            state.highlighted.add(cur.id);
          }else{
            const op = state.pieces.find(x=>x.id===occ);
            if(op && op.team !== piece.team) state.highlighted.add(cur.id);
          }
        }
        continue;
      }

      for(const nb of (adj.get(cur.id)||[])){
        if(cur.d===0 && prev && nb===prev) continue; // anti-hop

        // barricade blocks unless it's final landing step
        if(barricades.has(nb) && (cur.d+1) < steps) continue;

        const key = nb+"|"+(cur.d+1);
        if(visited.has(key)) continue;
        visited.add(key);
        q.push({ id:nb, d:cur.d+1 });
      }
    }
  }

  function kickOther(other){
    state.occupied.delete(other.node);
    other.node = null;
    other.prev = null;
  }

  function movePiece(piece, targetId){
    const occ = state.occupied.get(targetId);
    if(occ){
      const other = state.pieces.find(p=>p.id===occ);
      if(other && other.team===piece.team) return false;
      if(other) kickOther(other);
    }
    state.occupied.delete(piece.node);
    piece.prev = piece.node;
    piece.node = targetId;
    state.occupied.set(targetId, piece.id);
    return true;
  }

  function afterLanding(piece){
    const team = piece.team;

    // landed on barricade -> pickup and place
    if(barricades.has(piece.node)){
      barricades.delete(piece.node);
      state.carry[team] = (state.carry[team]||0) + 1;
      computePlaceTargets();
      state.phase = "placeBarricade";
      setStatus(`Team ${team}: Barrikade aufgenommen! Feld zum Platzieren tippen.`);
      setSidebar();
      return;
    }

    if(state.pendingSix){
      state.pendingSix = false;
      stayNeedRollSameTeam(`6! Team ${team} darf nochmal würfeln.`);
    }else{
      nextTurn();
    }
  }

  function placeBarricadeAt(nodeId){
    const team = currentTeam();
    if((state.carry[team]||0) <= 0) return false;
    if(!state.placeHighlighted.has(nodeId)) return false;

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

  // --- Hit testing ---
  function findNodeAtWorld(wx, wy){
    const r = (board?.ui?.radius ?? 18) * 1.25;
    let best = null, bestD2 = Infinity;
    for(const n of nodes){
      const dx = wx - n.x, dy = wy - n.y;
      const d2 = dx*dx + dy*dy;
      if(d2 <= r*r && d2 < bestD2){
        best = n; bestD2 = d2;
      }
    }
    return best;
  }

  function findPieceAtNode(nodeId){
    const pid = state.occupied.get(nodeId);
    if(!pid) return null;
    return state.pieces.find(p=>p.id===pid) || null;
  }

  function onTap(sx, sy){
    const { x:wx, y:wy } = screenToWorld(sx, sy);
    const n = findNodeAtWorld(wx, wy);
    if(!n) return;

    if(state.phase === "needRoll"){
      setStatus(`Team ${currentTeam()}: Würfeln.`);
      return;
    }

    if(state.phase === "choosePiece"){
      const p = findPieceAtNode(n.id);
      if(!p) return;
      if(p.team !== currentTeam()) return;
      state.selected = p.id;
      computeMoveTargets(p, state.roll);
      state.phase = "chooseTarget";
      setStatus(`Team ${currentTeam()}: Zielfeld wählen (${state.roll}).`);
      setSidebar();
      return;
    }

    if(state.phase === "chooseTarget"){
      if(!state.highlighted.has(n.id)) return;
      const piece = state.pieces.find(p=>p.id===state.selected);
      if(!piece) return;
      if(movePiece(piece, n.id)){
        state.pendingSix = (state.roll === 6);
        state.highlighted.clear();
        afterLanding(piece);
      }
      return;
    }

    if(state.phase === "placeBarricade"){
      placeBarricadeAt(n.id);
      setSidebar();
      return;
    }
  }

  // --- Pointer pan/zoom ---
  let pointers = new Map();
  let lastTap = 0;
  let pinchLast = null;

  canvas.addEventListener("pointerdown", (e)=>{
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

    const now = Date.now();
    if(now - lastTap < 280){
      fitToBoard();
      lastTap = 0;
    }else{
      lastTap = now;
    }
  });

  function zoomAtScreen(sx, sy, factor){
    const before = screenToWorld(sx, sy);
    cam.scale = clamp(cam.scale * factor, cam.minScale, cam.maxScale);
    const after  = screenToWorld(sx, sy);
    cam.x += (before.x - after.x);
    cam.y += (before.y - after.y);
  }

  canvas.addEventListener("pointermove", (e)=>{
    if(!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur  = { x:e.clientX, y:e.clientY };
    pointers.set(e.pointerId, cur);

    const arr = Array.from(pointers.values());
    if(arr.length === 1){
      const dx = (cur.x - prev.x) / cam.scale;
      const dy = (cur.y - prev.y) / cam.scale;
      cam.x -= dx;
      cam.y -= dy;
      return;
    }

    if(arr.length === 2){
      const [a,b] = arr;
      const dist = Math.hypot(a.x-b.x, a.y-b.y);
      if(pinchLast == null) pinchLast = dist;
      const ratio = dist / pinchLast;
      pinchLast = dist;
      const center = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
      zoomAtScreen(center.x, center.y, ratio);
    }
  });

  function pointerUp(e){
    if(pointers.has(e.pointerId)) pointers.delete(e.pointerId);
    if(pointers.size < 2) pinchLast = null;
  }
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);

  canvas.addEventListener("click", (e)=>{
    const rect = canvas.getBoundingClientRect();
    onTap(e.clientX-rect.left, e.clientY-rect.top);
  });

  canvas.addEventListener("wheel", (e)=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAtScreen(e.clientX-rect.left, e.clientY-rect.top, Math.pow(1.0015, -e.deltaY));
  }, { passive:false });

  btnFit.addEventListener("click", ()=> fitToBoard());

  // --- Roll ---
  btnRoll.addEventListener("click", ()=>{
    if(state.phase !== "needRoll") return;

    state.roll = Math.floor(Math.random()*6)+1;
    setDie(state.roll);

    // After rolling, choose piece (no auto-selection to avoid "funktionsverlust")
    state.phase = "choosePiece";
    state.selected = null;
    state.highlighted.clear();
    setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Figur wählen.`);
    setSidebar();
  });

  // --- Draw ---
  function draw(){
    const { w, h } = resizeCanvasToDisplaySize();
    ctx.clearRect(0,0,w,h);

    if(!board){
      requestAnimationFrame(draw);
      return;
    }

    // edges
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    for(const e of edges){
      const a = nodesById.get(e.a);
      const b = nodesById.get(e.b);
      if(!a||!b) continue;
      const sa = worldToScreen(a.x,a.y);
      const sb = worldToScreen(b.x,b.y);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
    ctx.restore();

    const R = board.ui?.radius ?? 18;

    // targets glow
    for(const nid of state.highlighted){
      const n = nodesById.get(nid);
      if(!n) continue;
      const s = worldToScreen(n.x,n.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, R*1.55*cam.scale, 0, Math.PI*2);
      ctx.fillStyle = "rgba(124,92,255,.12)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, R*1.10*cam.scale, 0, Math.PI*2);
      ctx.fillStyle = "rgba(124,92,255,.22)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(200,180,255,.75)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, R*0.90*cam.scale, 0, Math.PI*2);
      ctx.stroke();
    }

    // place targets glow
    if(state.phase === "placeBarricade"){
      for(const nid of state.placeHighlighted){
        const n = nodesById.get(nid);
        if(!n) continue;
        const s = worldToScreen(n.x,n.y);
        ctx.beginPath();
        ctx.arc(s.x, s.y, R*1.25*cam.scale, 0, Math.PI*2);
        ctx.fillStyle = "rgba(66,209,122,.14)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(66,209,122,.55)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, R*0.92*cam.scale, 0, Math.PI*2);
        ctx.stroke();
      }
    }

    // nodes
    for(const n of nodes){
      const s = worldToScreen(n.x,n.y);
      const rr = R*cam.scale;

      let fill = "rgba(255,255,255,.10)";
      if(n.type === "start") fill = "rgba(66,209,122,.18)";
      if(n.type === "event") fill = "rgba(180,120,255,.16)";
      if(n.type === "portal") fill = "rgba(124,92,255,.16)";
      if(n.type === "obstacle") fill = "rgba(255,107,107,.14)";
      if(n.type === "boss") fill = "rgba(255,107,107,.09)";

      ctx.beginPath();
      ctx.arc(s.x, s.y, rr, 0, Math.PI*2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 2*cam.scale);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.stroke();

      // obstacle minRoll label if present
      if(n.type === "obstacle" && n.props && n.props.minRoll != null){
        ctx.fillStyle = "rgba(255,255,255,.78)";
        ctx.font = `${Math.max(10, 12*cam.scale)}px system-ui, sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(String(n.props.minRoll), s.x, s.y);
      }
    }

    // barricades (yellow square) – visible even on event fields (can be hidden later if you want)
    for(const id of barricades){
      const n = nodesById.get(id);
      if(!n) continue;
      const s = worldToScreen(n.x,n.y);
      const sz = 24*cam.scale;
      ctx.save();
      ctx.strokeStyle = "rgba(255,204,102,.92)";
      ctx.lineWidth = 3;
      ctx.strokeRect(s.x - sz/2, s.y - sz/2, sz, sz);
      ctx.restore();
    }

    // pieces
    for(const p of state.pieces){
      if(!p.node) continue;
      const n = nodesById.get(p.node);
      if(!n) continue;
      const s = worldToScreen(n.x,n.y);
      const rr = R*0.62*cam.scale;

      ctx.beginPath();
      ctx.arc(s.x, s.y, rr, 0, Math.PI*2);
      ctx.fillStyle = TEAM_COLORS[p.team] || "#fff";
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;

      if(state.selected === p.id){
        ctx.strokeStyle = "rgba(255,255,255,.92)";
        ctx.lineWidth = Math.max(2, 3*cam.scale);
        ctx.beginPath();
        ctx.arc(s.x, s.y, rr*1.25, 0, Math.PI*2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = Math.max(1, 2*cam.scale);
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  // --- Load ---
  async function load(){
    const V = (typeof VERSION !== "undefined" && VERSION) ? VERSION : String(Date.now());
    const res = await fetch(`Mitteralter.board.json?v=${V}`, { cache:"no-store" });
    board = await res.json();
    nodes = board.nodes || [];
    edges = board.edges || [];

    nodesById = new Map(nodes.map(n=>[n.id,n]));
    adj = new Map();
    for(const n of nodes) adj.set(n.id,[]);
    for(const e of edges){
      if(!adj.has(e.a)) adj.set(e.a,[]);
      if(!adj.has(e.b)) adj.set(e.b,[]);
      adj.get(e.a).push(e.b);
      adj.get(e.b).push(e.a);
    }

    bounds = computeBounds(nodes);
    initPieces();
    state.phase = "needRoll";
    setDie(null);
    setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
    setSidebar();
    fitToBoard();
  }

  load().catch(err=>{
    console.error(err);
    setStatus("Fehler beim Laden. Schau in die Konsole.");
    state.phase = "loading";
    setSidebar();
  });

  window.addEventListener("resize", ()=> resizeCanvasToDisplaySize());
  requestAnimationFrame(draw);
})();
