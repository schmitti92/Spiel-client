<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Lichtarena – Figuren auswählen & laufen (stabil)</title>
  <style>
    :root { --bg:#0b0f17; --panel:#121a2a; --text:#e9eefc; --muted:#aab6d6; --line:rgba(255,255,255,.10); }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: radial-gradient(1200px 800px at 20% 10%, #1b2a5a 0%, var(--bg) 60%);
      color: var(--text); font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 12px; }
    .top {
      display:flex; gap:12px; flex-wrap:wrap; align-items:stretch;
    }
    .card {
      background: rgba(18,26,42,.92);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.35);
      padding: 12px;
    }
    .hud { flex: 1 1 360px; min-width: 320px; }
    .controls { flex: 1 1 320px; min-width: 320px; display:flex; flex-direction:column; gap:10px; }
    .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .lbl { color: var(--muted); font-size: 12px; }
    .big { font-size: 18px; font-weight: 700; }
    button, select {
      appearance:none;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.06);
      color: var(--text);
      padding: 10px 12px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      outline: none;
    }
    button:active { transform: translateY(1px); }
    button[disabled] { opacity:.55; cursor:not-allowed; }
    select { font-weight: 600; }
    .pill {
      display:inline-flex; align-items:center; gap:8px;
      padding: 6px 10px; border-radius: 999px; border: 1px solid var(--line);
      background: rgba(255,255,255,.05);
      font-size: 12px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; display:inline-block; }
    .msg { margin-top: 8px; padding: 10px; border-radius: 12px; border: 1px dashed var(--line); color: var(--muted); }
    .boardCard { margin-top: 12px; padding: 10px; }
    canvas {
      width: 100%;
      height: auto;
      display:block;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,.18);
      touch-action: none; /* wichtig für Tablet */
    }
    .hint { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.4; }
    .k { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:2px 6px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.05); }
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div class="card hud">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="lbl">Aktiver Spieler</div>
          <div class="big" id="turnLabel">–</div>
        </div>
        <div class="pill" title="Würfel">
          <span class="lbl">Wurf:</span>
          <span class="big" id="diceLabel">–</span>
        </div>
      </div>

      <div class="row" style="margin-top:10px;">
        <div class="pill" style="flex:1 1 auto;">
          <span class="lbl">Ausgewählte Figur:</span>
          <span id="selLabel">keine</span>
        </div>
        <div class="pill" style="flex:0 0 auto;" title="Ziehe erst eine Figur an, dann würfeln, dann laufen. Figur kannst du jederzeit wechseln.">
          <span class="lbl">Regel:</span>
          <span>Figur jederzeit wechselbar ✅</span>
        </div>
      </div>

      <div class="msg" id="msg">Tipp: Tippe/Klicke eine Figur im Haus an, um sie auszuwählen. Dann würfeln. Dann ein Ziel-Feld antippen/klicken.</div>

      <div class="hint">
        Demo-Board: Einfaches Grid mit vier Häusern + Lauf-Feldern.
        Das ist bewusst <b>stabil</b>: Auswahl ist nur Status und zerstört nie das Board.
      </div>
    </div>

    <div class="card controls">
      <div class="row">
        <button id="btnRoll">🎲 Würfeln</button>
        <button id="btnEnd">➡️ Nächster Spieler</button>
        <button id="btnReset">↩️ Reset</button>
      </div>
      <div class="row">
        <span class="lbl">Spieler:</span>
        <select id="playersSel">
          <option value="2">2 Spieler</option>
          <option value="3">3 Spieler</option>
          <option value="4" selected>4 Spieler</option>
        </select>
        <span class="lbl">Figuren/Farbe:</span>
        <select id="perColorSel">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4" selected>4</option>
        </select>
      </div>

      <div class="row" style="gap:8px;">
        <span class="pill"><span class="dot" style="background:#ff4d4d"></span> Rot</span>
        <span class="pill"><span class="dot" style="background:#4dff7a"></span> Grün</span>
        <span class="pill"><span class="dot" style="background:#4da3ff"></span> Blau</span>
        <span class="pill"><span class="dot" style="background:#ffd24d"></span> Gelb</span>
      </div>

      <div class="hint">
        <b>Wichtig:</b> Du kannst die Figur auch <i>nach dem Würfeln</i> noch wechseln – solange du noch nicht gelaufen bist.
        <br/>Wenn du ein Ziel wählst, wird exakt <b>die aktuell ausgewählte Figur</b> bewegt.
      </div>
    </div>
  </div>

  <div class="card boardCard">
    <canvas id="c" width="900" height="650"></canvas>
    <div class="hint">
      Steuerung: <span class="k">Figur antippen</span> → <span class="k">Würfeln</span> → <span class="k">Ziel antippen</span>.
      <br/>Du kannst auch: Figur antippen → Figur wechseln → würfeln → Figur wechseln → Ziel.
    </div>
  </div>
</div>

<script>
(() => {
  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  // =========================
  // Canvas
  // =========================
  const canvas = $("c");
  const ctx = canvas.getContext("2d", { alpha: true });

  function fitCanvasToCSS() {
    // Zeichnen in Canvas-Pixeln (width/height), aber Input muss in Canvas-Koordinaten.
    // Wir lassen width/height fix (stabil) und skalieren Input.
  }

  // =========================
  // UI
  // =========================
  const ui = {
    turnLabel: $("turnLabel"),
    diceLabel: $("diceLabel"),
    selLabel: $("selLabel"),
    msg: $("msg"),
    btnRoll: $("btnRoll"),
    btnEnd: $("btnEnd"),
    btnReset: $("btnReset"),
    playersSel: $("playersSel"),
    perColorSel: $("perColorSel"),
  };

  const setMsg = (t) => ui.msg.textContent = String(t);

  // =========================
  // Game State (stabil)
  // =========================
  const COLORS = [
    { name: "Rot",  key:"R", fill:"#ff4d4d" },
    { name: "Grün", key:"G", fill:"#4dff7a" },
    { name: "Blau", key:"B", fill:"#4da3ff" },
    { name: "Gelb", key:"Y", fill:"#ffd24d" },
  ];

  const state = {
    playersCount: 4,
    piecesPerColor: 4,
    players: [],
    currentPlayerIndex: 0,
    dice: null,
    hasRolled: false,
    selectedPieceId: null, // <— robust: nur ID speichern
    awaitingMove: false,
  };

  // Board: simples Grid + "Häuser" + "Lauf-Felder"
  const board = {
    cols: 13,
    rows: 9,
    cell: 60,
    offsetX: 60,
    offsetY: 60,
    // definierte Haus-Zellen (je Farbe) & Laufpfad (Liste von Zellen)
    houses: {},  // key -> array of cells
    path: [],    // list of cells (x,y)
  };

  function buildBoard() {
    // Häuser: 2x2 Blöcke in den Ecken (mit je 4 Slots)
    // Koordinaten im Grid (0..cols-1, 0..rows-1)
    board.houses = {
      R: [ {x:1,y:1},{x:2,y:1},{x:1,y:2},{x:2,y:2} ],
      G: [ {x:10,y:1},{x:11,y:1},{x:10,y:2},{x:11,y:2} ],
      B: [ {x:1,y:6},{x:2,y:6},{x:1,y:7},{x:2,y:7} ],
      Y: [ {x:10,y:6},{x:11,y:6},{x:10,y:7},{x:11,y:7} ],
    };

    // Einfacher Laufpfad: Rahmen + Mittelkreuz (nur Demo)
    const p = [];
    // oberer Rand
    for (let x=3; x<=9; x++) p.push({x, y:1});
    // rechter Rand
    for (let y=2; y<=6; y++) p.push({x:9, y});
    // unterer Rand
    for (let x=8; x>=3; x--) p.push({x, y:6});
    // linker Rand
    for (let y=5; y>=2; y--) p.push({x:3, y});
    // kleines Kreuz in der Mitte
    p.push({x:6,y:2},{x:6,y:3},{x:6,y:4},{x:6,y:5});
    p.push({x:5,y:4},{x:4,y:4},{x:7,y:4},{x:8,y:4});
    // remove duplicates
    const seen = new Set();
    board.path = p.filter(c => {
      const k = c.x + "," + c.y;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // =========================
  // Players & Pieces
  // =========================
  function makePlayers() {
    state.players = [];
    for (let i=0; i<state.playersCount; i++) {
      const c = COLORS[i];
      state.players.push({
        index: i,
        colorKey: c.key,
        colorName: c.name,
        fill: c.fill,
      });
    }
    state.currentPlayerIndex = 0;
  }

  function makePieces() {
    // Jede Figur startet in einem Haus-Slot (einzeln auf eigenes Feld im Haus)
    const pieces = [];
    for (const pl of state.players) {
      const slots = board.houses[pl.colorKey];
      for (let k=0; k<state.piecesPerColor; k++) {
        const slot = slots[k % slots.length];
        pieces.push({
          id: pl.colorKey + "_" + k,
          owner: pl.colorKey,
          index: k,
          // position: grid cell
          gx: slot.x,
          gy: slot.y,
          // pathIndex (wenn auf dem Laufpfad), sonst null
          pathIndex: null,
          selected: false,
        });
      }
    }
    state.pieces = pieces;

    // Auswahl resetten (stabil)
    state.selectedPieceId = null;
    state.hasRolled = false;
    state.awaitingMove = false;
    state.dice = null;
  }

  function currentPlayer() {
    return state.players[state.currentPlayerIndex];
  }

  function getPieceById(id) {
    return state.pieces.find(p => p.id === id) || null;
  }

  function clearSelection() {
    for (const p of state.pieces) p.selected = false;
    state.selectedPieceId = null;
    ui.selLabel.textContent = "keine";
  }

  function selectPiece(piece) {
    const pl = currentPlayer();
    if (!piece || piece.owner !== pl.colorKey) {
      setMsg("Du kannst nur deine eigenen Figuren auswählen.");
      return;
    }

    // Selection is ONLY status (stabil)
    for (const p of state.pieces) p.selected = false;
    piece.selected = true;
    state.selectedPieceId = piece.id;

    ui.selLabel.textContent = `${pl.colorName} #${piece.index+1}`;
    setMsg("Figur ausgewählt. Du kannst jederzeit wechseln. Dann würfeln, dann Ziel wählen.");
    redraw();
  }

  // =========================
  // Move Logic (Demo, aber stabil)
  // =========================
  function rollDice() {
    state.dice = randInt(1, 6);
    state.hasRolled = true;
    state.awaitingMove = true;
    ui.diceLabel.textContent = String(state.dice);

    if (!state.selectedPieceId) {
      setMsg("Gewürfelt. Bitte zuerst eine Figur auswählen (du kannst auch jetzt noch wechseln), dann Ziel wählen.");
    } else {
      setMsg("Gewürfelt. Du kannst die Figur noch wechseln. Dann ein Ziel-Feld antippen.");
    }
    redraw();
  }

  function endTurn() {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playersCount;
    state.hasRolled = false;
    state.awaitingMove = false;
    state.dice = null;
    ui.diceLabel.textContent = "–";
    // Optional: Auswahl beim Spielerwechsel löschen (sauber)
    clearSelection();
    updateTurnUI();
    setMsg("Nächster Spieler. Wähle eine Figur, würfle, dann ziehe.");
    redraw();
  }

  function canMoveTo(cell) {
    // Du darfst nur auf Laufpfad-Zellen ziehen (Demo)
    // Schrittzahl = dice, aber wir erlauben "Ziel-Auswahl": Ziel muss exakt dice Schritte auf Pfad liegen.
    if (!state.awaitingMove || !state.hasRolled) return false;
    if (!state.selectedPieceId) return false;

    const piece = getPieceById(state.selectedPieceId);
    if (!piece) return false;

    // piece muss im Haus oder auf Pfad sein
    // Wenn im Haus: wir lassen als Startpunkt den ersten Pfad-Knoten je Farbe (Demo)
    // Wenn auf Pfad: Start = pathIndex

    const pl = currentPlayer();
    if (piece.owner !== pl.colorKey) return false;

    const targetIndex = board.path.findIndex(c => c.x === cell.x && c.y === cell.y);
    if (targetIndex === -1) return false;

    let startIndex;
    if (piece.pathIndex == null) {
      // Startpunkte je Farbe (Demo, fix = 0, 4, 8, 12 verteilt)
      const startMap = { R:0, G: Math.floor(board.path.length*0.25), B: Math.floor(board.path.length*0.5), Y: Math.floor(board.path.length*0.75) };
      startIndex = startMap[piece.owner] ?? 0;
    } else {
      startIndex = piece.pathIndex;
    }

    const steps = state.dice;
    const expected = (startIndex + steps) % board.path.length;
    return targetIndex === expected;
  }

  function moveSelectedTo(cell) {
    if (!state.awaitingMove || !state.hasRolled) {
      setMsg("Du musst zuerst würfeln.");
      return;
    }
    if (!state.selectedPieceId) {
      setMsg("Bitte zuerst eine Figur auswählen.");
      return;
    }
    const piece = getPieceById(state.selectedPieceId);
    if (!piece) return;

    const pl = currentPlayer();
    if (piece.owner !== pl.colorKey) {
      setMsg("Du kannst nur deine eigenen Figuren ziehen.");
      return;
    }

    if (!canMoveTo(cell)) {
      setMsg("Ungültiges Ziel. Tipp: Ziel muss exakt dem Würfelwurf entsprechen (Demo-Regel).");
      return;
    }

    // Set piece onto path
    const idx = board.path.findIndex(c => c.x === cell.x && c.y === cell.y);
    piece.pathIndex = idx;
    piece.gx = cell.x;
    piece.gy = cell.y;

    // Zug abgeschlossen
    state.awaitingMove = false;

    // Extra-Regel: bei 6 nochmal würfeln (wie du wolltest)
    if (state.dice === 6) {
      state.hasRolled = false;
      state.dice = null;
      ui.diceLabel.textContent = "–";
      setMsg("Du hast eine 6! Du darfst nochmal würfeln. Figur kannst du jederzeit wechseln.");
    } else {
      state.hasRolled = false;
      state.dice = null;
      ui.diceLabel.textContent = "–";
      setMsg("Zug ausgeführt. Du kannst die Figur wechseln oder den Spieler wechseln.");
    }

    redraw();
  }

  // =========================
  // Drawing
  // =========================
  function cellToPx(gx, gy) {
    return {
      x: board.offsetX + gx * board.cell,
      y: board.offsetY + gy * board.cell
    };
  }

  function drawGrid() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Background glow
    const g = ctx.createRadialGradient(w*0.5, h*0.35, 50, w*0.5, h*0.4, 520);
    g.addColorStop(0, "rgba(90,120,255,.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;

    for (let x=0; x<=board.cols; x++) {
      const px = board.offsetX + x * board.cell;
      ctx.beginPath();
      ctx.moveTo(px, board.offsetY);
      ctx.lineTo(px, board.offsetY + board.rows * board.cell);
      ctx.stroke();
    }
    for (let y=0; y<=board.rows; y++) {
      const py = board.offsetY + y * board.cell;
      ctx.beginPath();
      ctx.moveTo(board.offsetX, py);
      ctx.lineTo(board.offsetX + board.cols * board.cell, py);
      ctx.stroke();
    }
  }

  function drawCells() {
    // Häuser
    const houseStyle = (fill) => {
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    for (const c of COLORS) {
      const slots = board.houses[c.key];
      for (const s of slots) {
        const p = cellToPx(s.x, s.y);
        ctx.beginPath();
        ctx.roundRect(p.x+6, p.y+6, board.cell-12, board.cell-12, 12);
        houseStyle(c.fill);
        ctx.strokeStyle = "rgba(255,255,255,.10)";
        ctx.stroke();
      }
    }

    // Pfad-Felder
    for (const cell of board.path) {
      const p = cellToPx(cell.x, cell.y);
      ctx.beginPath();
      ctx.roundRect(p.x+8, p.y+8, board.cell-16, board.cell-16, 12);

      // Highlight: gültige Ziele
      if (canMoveTo(cell)) {
        ctx.fillStyle = "rgba(255,215,0,.18)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,215,0,.55)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = "rgba(255,255,255,.05)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.10)";
        ctx.stroke();
      }
    }
  }

  function drawPiece(piece) {
    const p = cellToPx(piece.gx, piece.gy);
    const cx = p.x + board.cell/2;
    const cy = p.y + board.cell/2;

    // Base
    const owner = COLORS.find(c => c.key === piece.owner);
    ctx.fillStyle = owner ? owner.fill : "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI*2);
    ctx.fill();

    // small shadow ring
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI*2);
    ctx.stroke();

    // Selected ring
    if (piece.selected) {
      ctx.strokeStyle = "gold";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI*2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Index label
    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(piece.index+1), cx, cy+0.5);
  }

  function redraw() {
    drawGrid();
    drawCells();

    // pieces above
    for (const piece of state.pieces) drawPiece(piece);

    // overlay: current player frame
    const pl = currentPlayer();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width-20, canvas.height-20);
    ctx.restore();

    // Top-left badge
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.roundRect(20, 20, 260, 50, 14);
    ctx.fill();
    ctx.fillStyle = pl.fill;
    ctx.beginPath();
    ctx.arc(45, 45, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Aktiv: " + pl.colorName, 65, 45);
    ctx.restore();
  }

  // =========================
  // Input (Tablet-sicher)
  // =========================
  function getCanvasPosFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
    const clientY = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function pxToCell(x, y) {
    const gx = Math.floor((x - board.offsetX) / board.cell);
    const gy = Math.floor((y - board.offsetY) / board.cell);
    if (gx < 0 || gy < 0 || gx >= board.cols || gy >= board.rows) return null;
    return { x: gx, y: gy };
  }

  function cellEquals(a,b){ return a && b && a.x===b.x && a.y===b.y; }

  function handleTap(ev) {
    ev.preventDefault();
    const pos = getCanvasPosFromEvent(ev);
    const cell = pxToCell(pos.x, pos.y);
    if (!cell) return;

    // 1) check if a piece is in that cell
    // If multiple overlap (sollte nicht passieren), pick selected or first
    const piecesHere = state.pieces.filter(p => p.gx === cell.x && p.gy === cell.y);
    if (piecesHere.length) {
      // If tapped a piece: selection can ALWAYS happen (vor dem Laufen wechseln können)
      // BUT only own pieces selectable
      selectPiece(piecesHere[0]);
      return;
    }

    // 2) otherwise: target cell move attempt
    if (state.awaitingMove && state.hasRolled) {
      moveSelectedTo(cell);
    }
  }

  canvas.addEventListener("click", handleTap, { passive:false });
  canvas.addEventListener("touchstart", handleTap, { passive:false });

  // =========================
  // UI Wiring
  // =========================
  function updateTurnUI() {
    const pl = currentPlayer();
    ui.turnLabel.textContent = pl.colorName;
  }

  ui.btnRoll.addEventListener("click", () => {
    if (state.hasRolled && state.awaitingMove) {
      setMsg("Du hast schon gewürfelt. Wähle jetzt ein Ziel (Figur kannst du noch wechseln).");
      return;
    }
    rollDice();
  });

  ui.btnEnd.addEventListener("click", () => endTurn());

  ui.btnReset.addEventListener("click", () => {
    initGame();
    setMsg("Reset. Wähle eine Figur, würfle, dann ziehe.");
  });

  ui.playersSel.addEventListener("change", () => {
    state.playersCount = parseInt(ui.playersSel.value, 10);
    initGame();
    setMsg("Spieleranzahl geändert. Wähle eine Figur, würfle, dann ziehe.");
  });

  ui.perColorSel.addEventListener("change", () => {
    state.piecesPerColor = parseInt(ui.perColorSel.value, 10);
    initGame();
    setMsg("Figuren pro Farbe geändert. Wähle eine Figur, würfle, dann ziehe.");
  });

  // =========================
  // Init
  // =========================
  function initGame() {
    buildBoard();
    makePlayers();
    makePieces();
    updateTurnUI();
    ui.diceLabel.textContent = "–";
    ui.selLabel.textContent = "keine";
    redraw();
  }

  // Canvas roundRect polyfill for older browsers
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      const rr = (typeof r === "number") ? {tl:r,tr:r,br:r,bl:r} : r;
      this.beginPath();
      this.moveTo(x + rr.tl, y);
      this.lineTo(x + w - rr.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + rr.tr);
      this.lineTo(x + w, y + h - rr.br);
      this.quadraticCurveTo(x + w, y + h, x + w - rr.br, y + h);
      this.lineTo(x + rr.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - rr.bl);
      this.lineTo(x, y + rr.tl);
      this.quadraticCurveTo(x, y, x + rr.tl, y);
      this.closePath();
      return this;
    };
  }

  initGame();
})();
</script>
</body>
</html>
```0
