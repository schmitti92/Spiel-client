
/* lichtarena_client.js
   Backtracking-Regel integriert:
   ❌ Niemals direkt auf das Feld zurück, von dem man gerade gekommen ist.
   Gilt bei jedem Schritt während des Würfellaufens.
*/

(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  const stage = document.getElementById("stage");
  const edgesSvg = document.getElementById("edgesSvg");
  const statusLine = document.getElementById("statusLine");

  const btnRoll = document.getElementById("btnRoll");
  const diceValueInp = document.getElementById("diceValue");
  const hudDice = document.getElementById("hudDice");

  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const gameState = {
    pieces: [],
    selectedPieceId: null,
    diceValue: 6,
    lastFromNode: null // 🔥 Backtracking-Schutz
  };

  function setStatus(text){
    if(statusLine) statusLine.textContent = "Status: " + text;
  }

  async function loadBoard() {
    const res = await fetch(BOARD_URL + "?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Board konnte nicht geladen werden");
    return await res.json();
  }

  function buildNodeMap() {
    nodeById = new Map();
    for (const n of (board.nodes || [])) nodeById.set(String(n.id), n);
  }

  function buildAdjacency() {
    adjacency = new Map();
    const add = (a, b) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push(b);
    };
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      add(a, b);
      add(b, a); // Abbiegen erlaubt
    }
  }

  function initPieces() {
    const colors = ["red","blue","green","yellow"];
    const pieces = [];
    let startNodes = board.nodes.filter(n => n.type === "start");

    colors.forEach((color,i)=>{
      const node = startNodes[i] || startNodes[0];
      pieces.push({ id: color+"_1", color, nodeId: node.id });
    });

    gameState.pieces = pieces;
    gameState.selectedPieceId = pieces[0]?.id;
  }

  function getSelectedPiece(){
    return gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  }

  function canMove(from, to){
    const neighbors = adjacency.get(String(from)) || [];
    if(!neighbors.includes(String(to))) return false;

    // 🔥 Backtracking-Regel
    if(gameState.lastFromNode && String(to) === String(gameState.lastFromNode)){
      setStatus("Direktes Zurücklaufen ist verboten.");
      return false;
    }

    return true;
  }

  function moveTo(nodeId){
    const piece = getSelectedPiece();
    if(!piece) return;

    if(!canMove(piece.nodeId, nodeId)) return;

    gameState.lastFromNode = piece.nodeId; // merken woher wir kamen
    piece.nodeId = nodeId;

    setStatus("Bewegung erlaubt.");
  }

  function rollDice(){
    const v = 1 + Math.floor(Math.random()*6);
    gameState.diceValue = v;
    diceValueInp.value = v;
    hudDice.textContent = v;

    // 🔄 Neuer Zug → Backtracking reset
    gameState.lastFromNode = null;

    setStatus("Gewürfelt: " + v);
  }

  btnRoll?.addEventListener("click", rollDice);

  async function start(){
    board = await loadBoard();
    buildNodeMap();
    buildAdjacency();
    initPieces();
    setStatus("Bereit.");
  }

  start();

})();
