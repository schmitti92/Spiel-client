/* game_rules_lights_barricades.js
   Lichtarena Regeln – Lights + Barricades (Server-first, aber auch offline nutzbar)

   Grundidee:
   - "normale" Felder: nodes mit type === "normal" (oder ohne type -> normal)
   - Licht darf nur auf freie normale Felder spawnen
   - Barikaden dürfen nur auf freie normale Felder spawnen
   - Board 1: initial liegen Lichter auf den (vorab platzierten) Lichtfeldern
   - Wenn alle aktiven Lichter eingesammelt sind -> neues Licht spawnt irgendwo (freies normales Feld)

   Designed to be used on server (authoritative) OR offline prototype.
*/

(function(global){
  "use strict";

  // ---------- Utilities ----------
  function toStr(x){ return String(x ?? "").trim(); }

  function mulberry32(seed){
    // deterministischer RNG (für Server / Replay geeignet)
    let t = seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, maxExclusive){
    return Math.floor(rng() * maxExclusive);
  }

  function pickRandom(rng, arr){
    if(!arr || !arr.length) return null;
    return arr[randInt(rng, arr.length)];
  }

  function isNormalNode(node){
    // du kannst später weitere Typen ergänzen
    const t = (node && node.type) ? String(node.type).toLowerCase() : "normal";
    return (t === "normal");
  }

  // optional: Nodes, auf die wir NIE random spawnen wollen
  function isBlockedByType(node){
    const t = (node && node.type) ? String(node.type).toLowerCase() : "normal";
    if(t === "start") return true;
    if(t === "goal") return true;
    if(t === "gate") return true;
    if(t === "portal") return true;
    if(t === "house") return true;
    // lightfield ist kein "normal" -> fällt sowieso raus
    return false;
  }

  // ---------- Core: free-node calculation ----------
  function collectOccupiedNodeIds(gameState){
    // gameState ist absichtlich generisch gehalten
    // Erwartete Felder (wenn vorhanden):
    // - gameState.pieces: [{nodeId, ...}] oder piecesByColor etc.
    // - gameState.barricades: [nodeId, ...]
    // - gameState.lights.active: [nodeId, ...]
    const occ = new Set();

    // pieces (mehrere Formate möglich)
    if(Array.isArray(gameState?.pieces)){
      for(const p of gameState.pieces){
        const id = toStr(p?.nodeId);
        if(id) occ.add(id);
      }
    }
    if(gameState?.piecesByColor && typeof gameState.piecesByColor === "object"){
      for(const color of Object.keys(gameState.piecesByColor)){
        const arr = gameState.piecesByColor[color];
        if(!Array.isArray(arr)) continue;
        for(const p of arr){
          const id = toStr(p?.nodeId ?? p?.pos);
          if(id) occ.add(id);
        }
      }
    }

    // barricades
    if(Array.isArray(gameState?.barricades)){
      for(const b of gameState.barricades){
        const id = toStr(b);
        if(id) occ.add(id);
      }
    }

    // active lights
    if(Array.isArray(gameState?.lights?.active)){
      for(const l of gameState.lights.active){
        const id = toStr(l);
        if(id) occ.add(id);
      }
    }

    return occ;
  }

  function listFreeNormalNodes(board, gameState, extraBlockedSet){
    const blocked = collectOccupiedNodeIds(gameState);
    if(extraBlockedSet){
      for(const x of extraBlockedSet) blocked.add(toStr(x));
    }

    const out = [];
    for(const n of (board?.nodes || [])){
      if(!n || !n.id) continue;
      if(!isNormalNode(n)) continue;
      if(isBlockedByType(n)) continue;
      if(blocked.has(String(n.id))) continue;
      out.push(String(n.id));
    }
    return out;
  }

  // ---------- Lights ----------
  function ensureLightsState(gameState){
    if(!gameState.lights || typeof gameState.lights !== "object"){
      gameState.lights = {};
    }
    if(!Array.isArray(gameState.lights.active)) gameState.lights.active = [];
    if(!gameState.lights.collectedByColor || typeof gameState.lights.collectedByColor !== "object"){
      gameState.lights.collectedByColor = { red:0, blue:0, green:0, yellow:0 };
    }
    if(typeof gameState.lights.totalCollected !== "number") gameState.lights.totalCollected = 0;
    if(typeof gameState.lights.globalGoal !== "number") gameState.lights.globalGoal = 5;
    if(typeof gameState.lights.spawnAfterCollect !== "boolean") gameState.lights.spawnAfterCollect = true;
    if(typeof gameState.lights.seed !== "number") gameState.lights.seed = Date.now() >>> 0;
  }

  function initLights(board, gameState, opts){
    // opts:
    // - globalGoal (default 5)
    // - spawnAfterCollect (default true)
    // - seed (optional)
    // - initialActiveNodeIds: Array von NodeIDs, auf denen am Anfang Licht liegt
    ensureLightsState(gameState);
    const o = opts || {};
    if(typeof o.globalGoal === "number") gameState.lights.globalGoal = o.globalGoal;
    if(typeof o.spawnAfterCollect === "boolean") gameState.lights.spawnAfterCollect = o.spawnAfterCollect;
    if(typeof o.seed === "number") gameState.lights.seed = o.seed >>> 0;

    const initIds = Array.isArray(o.initialActiveNodeIds) ? o.initialActiveNodeIds.map(toStr).filter(Boolean) : [];
    // wir nehmen nur welche, die existieren und NICHT auf Start/Goal/Gate/Portal/House liegen
    const byId = new Set((board?.nodes || []).map(n => String(n.id)));
    const active = [];
    for(const id of initIds){
      if(!byId.has(id)) continue;
      // Licht darf auch auf lightfield liegen (dein Wunsch fürs Startbrett)
      // aber nicht auf blockierten Spezialtypen
      const node = (board.nodes || []).find(n => String(n.id) === id);
      if(node && !isBlockedByType(node)){
        active.push(id);
      }
    }
    gameState.lights.active = active;
    return gameState.lights;
  }

  function spawnOneLightOnRandomFreeNormal(board, gameState, rng){
    ensureLightsState(gameState);
    const free = listFreeNormalNodes(board, gameState);
    const picked = pickRandom(rng, free);
    if(!picked) return null;
    gameState.lights.active.push(picked);
    return picked;
  }

  function maybeRespawnLightAfterCollection(board, gameState, rng){
    ensureLightsState(gameState);
    if(!gameState.lights.spawnAfterCollect) return null;
    if(gameState.lights.totalCollected >= gameState.lights.globalGoal) return null;
    if(gameState.lights.active.length > 0) return null; // erst wenn ALLE aktiven weg sind
    return spawnOneLightOnRandomFreeNormal(board, gameState, rng);
  }

  function onPieceArrived(board, gameState, color, landedNodeId){
    // call after a move is confirmed (server-authoritative!)
    ensureLightsState(gameState);
    const c = String(color || "").toLowerCase();
    const id = toStr(landedNodeId);

    let picked = false;
    const idx = gameState.lights.active.indexOf(id);
    if(idx >= 0){
      gameState.lights.active.splice(idx, 1);
      gameState.lights.totalCollected += 1;
      if(gameState.lights.collectedByColor[c] == null) gameState.lights.collectedByColor[c] = 0;
      gameState.lights.collectedByColor[c] += 1;
      picked = true;
    }

    const rng = mulberry32(gameState.lights.seed ^ (Date.now() >>> 0));
    let spawned = null;
    if(picked){
      spawned = maybeRespawnLightAfterCollection(board, gameState, rng);
      // seed weiterdrehen (damit Server + Clients deterministischer bleiben, wenn du willst)
      gameState.lights.seed = (gameState.lights.seed + 1) >>> 0;
    }

    return { picked, spawned, total: gameState.lights.totalCollected, goal: gameState.lights.globalGoal };
  }

  // ---------- Barricades ----------
  function ensureBarricadeState(gameState){
    if(!Array.isArray(gameState.barricades)) gameState.barricades = [];
    if(typeof gameState.barricadesMax !== "number") gameState.barricadesMax = 15;
    if(typeof gameState.barricadesSeed !== "number") gameState.barricadesSeed = (Date.now() >>> 0);
  }

  function spawnBarricadeOnRandomFreeNormal(board, gameState, rng){
    ensureBarricadeState(gameState);
    if(gameState.barricades.length >= gameState.barricadesMax) return null;

    const free = listFreeNormalNodes(board, gameState);
    const picked = pickRandom(rng, free);
    if(!picked) return null;

    gameState.barricades.push(picked);
    return picked;
  }

  // ---------- Public API ----------
  const API = {
    mulberry32,
    listFreeNormalNodes,

    // lights
    initLights,
    onPieceArrived,
    spawnOneLightOnRandomFreeNormal,

    // barricades
    spawnBarricadeOnRandomFreeNormal,
  };

  // UMD-like export
  if(typeof module !== "undefined" && module.exports){
    module.exports = API;
  } else {
    global.GameRulesLightsBarricades = API;
  }

})(typeof window !== "undefined" ? window : globalThis);
