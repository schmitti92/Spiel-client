(() => {
  const STORAGE_KEY = "mittelalterLobby";
  const DEFAULT_STATE = {
    playerName: "",
    roomCode: "",
    isHost: false,
    players: [],
    started: false,
    lastMode: "offline-mock"
  };

  const SERVER_URL = ""; // später Render-URL eintragen

  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('[Mittelalter Lobby] Konnte Session-State nicht laden:', err);
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(patch = {}) {
    const next = { ...loadState(), ...patch };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function setInfo(text) {
    const el = $('roomInfo');
    if (el) el.innerText = text || '';
  }

  function normalizeName(name) {
    return String(name || '').trim().slice(0, 24) || 'Spieler';
  }

  function normalizeRoom(code) {
    return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  function randomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function renderPlayers(players) {
    const list = $('playerList');
    if (!list) return;
    list.innerHTML = '';
    if (!players || !players.length) {
      const div = document.createElement('div');
      div.className = 'player';
      div.innerText = 'Noch keine Spieler im Raum';
      list.appendChild(div);
      return;
    }
    players.forEach((player, index) => {
      const div = document.createElement('div');
      div.className = 'player';
      const name = typeof player === 'string' ? player : player.name;
      const host = typeof player === 'string' ? index === 0 : !!player.host;
      div.innerText = host ? `${name} (Host)` : String(name);
      list.appendChild(div);
    });
  }

  function syncFormFromState() {
    const state = loadState();
    if ($('nameInput')) $('nameInput').value = state.playerName || '';
    if ($('roomInput')) $('roomInput').value = state.roomCode || '';
    renderPlayers(state.players || []);
    if (state.roomCode) {
      const modeText = state.lastMode === 'offline-mock' ? 'Offline-Testmodus' : 'Online';
      setInfo(`Raum aktiv: ${state.roomCode} · ${modeText}`);
    } else {
      setInfo('Noch kein Raum aktiv');
    }
    const startBtn = document.querySelector('.startBtn');
    if (startBtn) {
      startBtn.disabled = !state.roomCode;
      startBtn.style.opacity = state.roomCode ? '1' : '0.6';
      startBtn.style.cursor = state.roomCode ? 'pointer' : 'not-allowed';
    }
  }

  async function createRoomOnline(playerName) {
    const res = await fetch(`${SERVER_URL}/api/mittelalter/create-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async function joinRoomOnline(roomCode, playerName) {
    const res = await fetch(`${SERVER_URL}/api/mittelalter/join-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, playerName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  window.createRoom = async function createRoom() {
    const playerName = normalizeName($('nameInput')?.value);
    if ($('nameInput')) $('nameInput').value = playerName;

    if (SERVER_URL) {
      try {
        const data = await createRoomOnline(playerName);
        saveState({
          playerName,
          roomCode: normalizeRoom(data.roomCode),
          isHost: true,
          players: data.players || [{ name: playerName, host: true }],
          started: false,
          lastMode: 'online'
        });
        syncFormFromState();
        return;
      } catch (err) {
        console.warn('[Mittelalter Lobby] Online create-room fehlgeschlagen, nutze Offline-Testmodus.', err);
      }
    }

    const roomCode = randomRoomCode();
    saveState({
      playerName,
      roomCode,
      isHost: true,
      players: [{ name: playerName, host: true }],
      started: false,
      lastMode: 'offline-mock'
    });
    syncFormFromState();
  };

  window.joinRoom = async function joinRoom() {
    const playerName = normalizeName($('nameInput')?.value);
    const roomCode = normalizeRoom($('roomInput')?.value);
    if ($('nameInput')) $('nameInput').value = playerName;
    if ($('roomInput')) $('roomInput').value = roomCode;

    if (!roomCode) {
      alert('Bitte Raumcode eingeben');
      return;
    }

    if (SERVER_URL) {
      try {
        const data = await joinRoomOnline(roomCode, playerName);
        saveState({
          playerName,
          roomCode,
          isHost: false,
          players: data.players || [{ name: playerName, host: false }],
          started: !!data.started,
          lastMode: 'online'
        });
        syncFormFromState();
        return;
      } catch (err) {
        console.warn('[Mittelalter Lobby] Online join-room fehlgeschlagen, nutze Offline-Testmodus.', err);
      }
    }

    saveState({
      playerName,
      roomCode,
      isHost: false,
      players: [{ name: playerName, host: false }],
      started: false,
      lastMode: 'offline-mock'
    });
    syncFormFromState();
  };

  window.startGame = function startGame() {
    const state = loadState();
    if (!state.roomCode) {
      alert('Kein Raum aktiv');
      return;
    }
    saveState({ started: true });
    window.location.href = 'Mittelalter.index.html';
  };

  window.goBack = function goBack() {
    window.location.href = 'index.html';
  };

  window.addEventListener('DOMContentLoaded', () => {
    syncFormFromState();

    const nameInput = $('nameInput');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        saveState({ playerName: normalizeName(nameInput.value) });
      });
    }

    const roomInput = $('roomInput');
    if (roomInput) {
      roomInput.addEventListener('input', () => {
        roomInput.value = normalizeRoom(roomInput.value);
        saveState({ roomCode: roomInput.value });
      });
    }
  });
})();
