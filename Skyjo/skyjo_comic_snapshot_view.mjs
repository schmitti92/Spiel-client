/** SKYJO Comic snapshot bridge v1: read-only, opt-in. No network or mutations. */
import { normalizeComicSnapshot, layoutForComicSeats } from './skyjo_comic_adapter.mjs';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function visibleCard(raw) {
  if (raw === null || raw === undefined || raw === false) return null;
  if (typeof raw === 'number' || typeof raw === 'string') return String(raw);
  if (typeof raw !== 'object') return null;
  if (raw.faceUp === false || raw.revealed === false || raw.hidden === true) return null;
  const value = raw.type === 'star' ? '★' : (raw.value ?? raw.number ?? raw.label);
  return value === undefined || value === null ? null : String(value);
}
function cardHTML(raw, playerIndex, cardIndex, interactive) {
  if (raw === null || raw === undefined) return '<div class="card empty" aria-label="Entfernte Karte"></div>';
  const value = visibleCard(raw);
  const cls = value === null ? 'hidden' : value === '★' || value.toLowerCase() === 'joker'
    ? 'joker' : Number(value) < 0 ? 'green' : Number(value) === 0 ? 'blue'
    : Number(value) < 4 ? 'yellow' : 'red';
  const attrs = interactive ? ' data-comic-action="selectGridCard" data-player-index="'+playerIndex+'" data-card-index="'+cardIndex+'" role="button" tabindex="0"' : '';
  return '<div class="card '+cls+'" aria-label="'+(value === null ? 'Verdeckte Karte' : 'Karte '+escapeHTML(value))+'"'+attrs+'>'+(value === null ? '' : escapeHTML(value))+'</div>';
}
function boardHTML(player, gamePlayer, classes, playerIndex, interactive = false) {
  const cards = gamePlayer?.grid ?? gamePlayer?.cards ?? gamePlayer?.board;
  if (!Array.isArray(cards) || cards.length !== 12) throw new TypeError('Expected 12 cards for every player');
  return '<div class="board '+classes+'"><h3><span class="player-name">'+escapeHTML(player.name)+
    '</span></h3><div class="cards">'+cards.map((card, index) => cardHTML(card, playerIndex, index, interactive)).join('')+'</div></div>';
}
/**
 * Render an explicitly supplied, validated snapshot into the existing comic preview DOM.
 * Callers must provide an authenticated snapshot from the real server and their own seat ID.
 * This module intentionally does not invent WebSocket endpoints, issue moves or save state.
 */
export function renderComicSnapshot(room, selfSeatId, root = document) {
  const snapshot = normalizeComicSnapshot(room);
  if (!snapshot.game) throw new TypeError('Game not started');
  const selfIndex = snapshot.players.findIndex(p => p.seatId === String(selfSeatId));
  if (selfIndex < 0) throw new TypeError('Current seat not in room');
  const { opponents } = layoutForComicSeats(snapshot.players.length, selfIndex);
  const enemies = root.getElementById('enemies');
  const self = root.getElementById('self');
  if (!enemies || !self) throw new TypeError('Comic board elements missing');
  // Build all HTML before updating the DOM, to avoid partial render on invalid data.
  const enemyHTML = opponents.map(({ index, position }) =>
    boardHTML(snapshot.players[index], snapshot.game.players[index], 'enemy '+position, index)).join('');
  const selfHTML = boardHTML(snapshot.players[selfIndex], snapshot.game.players[selfIndex], 'self', selfIndex, false);
  enemies.innerHTML = enemyHTML;
  self.innerHTML = selfHTML;
  const note = root.querySelector('.note');
  if (note) note.textContent = 'SPIEGELANSICHT – nur Anzeige; Spielzüge erfolgen weiterhin im Originalspiel.';
  return { players: snapshot.players.length, selfIndex, opponents: opponents.length };
}
