import {loadMotionMode,motionFactor} from './motion-settings.js';

/**
 * DOG motion layer: presentation only. Never mutates a game, sends network
 * traffic, or changes editor coordinates. All route positions are SVG units.
 */
export function snapshotPieces(pieces = []) {
  return pieces.map(({id, owner, place, pos}) => ({id, owner, place, pos}));
}
const sameSpot = (a, b) => !!a && !!b && a.place === b.place && a.pos === b.pos && a.owner === b.owner;
const mod64 = value => (value % 64 + 64) % 64;
export function pointForPiece(piece, board) {
  if (!piece) return null;
  if (piece.place === 'track') return board.track?.[piece.pos] || null;
  if (piece.place === 'goal') return board.goal?.[piece.owner]?.[piece.pos] || null;
  if (piece.place === 'home') return board.home?.[piece.owner]?.[piece.id % 4] || null;
  return null;
}
function walk(from, to, count, viaGoal, board) {
  if (!Number.isInteger(count) || !count || Math.abs(count) > 13 || from.place === 'home') return null;
  let current = {...from}, cameFromBehind = false;
  const points = [pointForPiece(from, board)];
  for (let i = 0; i < Math.abs(count); i++) {
    if (current.place === 'goal') {
      if (count < 0 || current.pos >= 3) return null;
      current = {...current, pos: current.pos + 1};
    } else {
      const oldPos = current.pos;
      const nextPos = mod64(oldPos + (count > 0 ? 1 : -1));
      if (count > 0 && nextPos === from.owner * 16) cameFromBehind = true;
      if (count > 0 && viaGoal && oldPos === from.owner * 16 && cameFromBehind) {
        current = {...current, place: 'goal', pos: 0};
      } else {
        current = {...current, place: 'track', pos: nextPos};
      }
    }
    points.push(pointForPiece(current, board));
  }
  return sameSpot(current, to) && points.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y)) ? points : null;
}
function routeForMove(before, after, board) {
  const paths = [];
  // DOG has forward cards up to 13, a four-step reverse, and the split seven.
  for (let steps = 1; steps <= 13; steps++) {
    for (const viaGoal of [false, true]) {
      const path = walk(before, after, steps, viaGoal, board);
      if (path) paths.push(path);
    }
  }
  const backwards = walk(before, after, -4, false, board);
  if (backwards) paths.push(backwards);
  // Avoid following a full circuit when an unexpectedly old snapshot arrives.
  return paths.sort((a, b) => a.length - b.length)[0] || null;
}
export function planPieceMotions(beforePieces, afterPieces, board) {
  if (!Array.isArray(beforePieces) || !Array.isArray(afterPieces) || beforePieces.length !== afterPieces.length) return [];
  const previous = new Map(beforePieces.map(piece => [piece.id, piece]));
  const changes = afterPieces.filter(piece => !sameSpot(previous.get(piece.id), piece));
  if (!changes.length || changes.length > 10) return [];
  const swap = changes.length === 2 &&
    changes.every(p => p.place === 'track' && previous.get(p.id)?.place === 'track') &&
    changes.every(p => changes.some(other => other.id !== p.id && previous.get(other.id)?.pos === p.pos));
  const motions = [];
  for (const piece of changes) {
    const from = previous.get(piece.id);
    const start = pointForPiece(from, board);
    const end = pointForPiece(piece, board);
    if (!from || !start || !end || !Number.isFinite(start.x) || !Number.isFinite(end.x)) continue;
    let kind = 'step', points = null;
    if (swap) {
      kind = 'swap';
      points = [start, end];
    } else if (from.place === 'home' && piece.place === 'track') {
      kind = 'launch';
      points = [start, end];
    } else if (from.place !== 'home' && piece.place === 'home') {
      kind = 'capture';
      points = [start, end];
    } else {
      points = routeForMove(from, piece, board);
      if (points && from.place === 'track' && piece.place === 'goal') kind = 'goal';
    }
    if (!points) {
      kind = 'relocate';
      points = [start, end];
    }
    motions.push({id: piece.id, owner: piece.owner, kind, points});
  }
  return motions;
}
/**
 * Room updates may combine several non-board revisions (exchange, research,
 * rewards or a burst of bot moves). A single skipped revision must not make
 * the next visible opponent move teleport. Ignore very old reconnect snapshots.
 * This is purely a visual decision; the server game is never replayed.
 */
export function shouldAnimatePieceUpdate({sameMatch,previousRevision,currentRevision,previousPieces,currentPieces}={}) {
  if(!sameMatch || !Number.isSafeInteger(previousRevision) ||
     !Number.isSafeInteger(currentRevision) ||
     currentRevision<=previousRevision || currentRevision-previousRevision>12 ||
     !Array.isArray(previousPieces) || !Array.isArray(currentPieces) ||
     previousPieces.length!==currentPieces.length)return false;
  const previous=new Map(previousPieces.map(piece=>[piece.id,piece]));
  return currentPieces.some(piece=>!sameSpot(previous.get(piece.id),piece));
}

/**
 * Identify who actually performed the last board action by the public history.
 * A capture can move a human pawn back home on a BOT turn, so classifying
 * animations by the moved pawn's owner would suppress the wrong moves.
 */
export function isDogBotMove(game,motions){
 if(!Array.isArray(motions)||!motions.length)return false;
 const line=game?.history?.[0];
 if(typeof line!=='string')return false;
 return !!game?.players?.some(player=>player?.bot===true&&!player.inactive&&
   typeof player.name==='string'&&line.startsWith(player.name+' '));
}

/** Show only public move-history text; never expose an opponent's cards. */
export function opponentMoveNotice(game,motions,{online=false,ownSeat=null}={}) {
  if(!Array.isArray(motions)||!motions.length)return null;
  const line=game?.history?.[0];
  if(typeof line!=='string')return null;
  const actor=game?.players?.find(p=>!p.inactive&&typeof p.name==='string'&&
    line.startsWith(p.name+' '));
  if(!actor || (!online&&!actor.bot) || (online&&actor.seat===ownSeat))return null;
  return {seat:actor.seat,text:(actor.bot?'🤖 ':'🎲 ')+line};
}

export function createPieceAnimator(svg) {
  let frame = 0;
  let active = [];
  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    svg.querySelectorAll('.dog-motion-arrival').forEach(node=>node.remove());
    svg.removeAttribute('aria-busy');
    frame = 0;
    for (const item of active) {
      item.node.removeAttribute('transform');
      item.node.style.opacity = '';
      item.node.classList.remove('dog-pawn-moving');
    }
    active = [];
  }
  function play(motions, colors = []) {
    cancel();
    const factor=motionFactor(loadMotionMode(),window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false);
    if (!motions.length || document.hidden || factor===0) return 0;
    const started = performance.now();
    for (const motion of motions) {
      const node = svg.querySelector('[data-piece="' + motion.id + '"]');
      if (!node || motion.points.length < 2) continue;
      const steps = motion.points.length - 1;
      const baseDuration = motion.kind === 'swap' ? 690
        : motion.kind === 'capture' ? 540
        : motion.kind === 'launch' ? 580
        : motion.kind === 'relocate' ? 330
        : Math.min(1650, 250 + steps * 102);
      const duration=baseDuration*factor;
      // Keep the token at its previous field BEFORE the first animation frame.
      // Otherwise the freshly drawn final board flickers for one browser frame.
      const start=motion.points[0],end=motion.points.at(-1);
      node.setAttribute('transform','translate('+(start.x-end.x).toFixed(2)+' '+(start.y-end.y).toFixed(2)+')');
      node.classList.add('dog-pawn-moving');
      active.push({node, motion, duration, delay:0, color: colors[motion.owner] || '#f3dba2', done: false});
    }
    if (!active.length) return 0;
    // The seven can knock out multiple tokens at different intermediate fields.
    // Start each capture only when the moving piece reaches that field.
    for(const captured of active.filter(item=>item.motion.kind==='capture')){
      const hit=captured.motion.points[0];
      for(const walker of active.filter(item=>!['capture','swap'].includes(item.motion.kind))){
        const steps=walker.motion.points.length-1;
        const at=walker.motion.points.findIndex((p,i)=>i>0&&Math.hypot(p.x-hit.x,p.y-hit.y)<.05);
        if(at!==-1){captured.delay=Math.max(0,(at-.6)/steps*walker.duration);break;}
      }
    }
    svg.setAttribute('aria-busy','true');
    const maxDuration = Math.max(...active.map(x => x.duration+x.delay));
    function arrival(item) {
      item.node.removeAttribute('transform');
      item.node.style.opacity = '';
      item.node.classList.remove('dog-pawn-moving');
      const end = item.motion.kind === 'capture' ? item.motion.points[0] : item.motion.points.at(-1);
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('class', 'dog-motion-arrival dog-arrival-' + item.motion.kind);
      ring.setAttribute('cx', String(end.x));
      ring.setAttribute('cy', String(end.y));
      ring.setAttribute('r', item.motion.kind === 'capture' ? '18' : '13');
      ring.setAttribute('stroke', item.motion.kind === 'capture' ? '#ffe8a8' : item.color);
      ring.setAttribute('pointer-events', 'none');
      svg.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), {once: true});
    }
    function tick(now) {
      if (document.hidden) {
        cancel();
        return;
      }
      let pending = false;
      for (const item of active) {
        if (item.done) continue;
        const elapsed=now-started-item.delay;
        if(elapsed<0){pending=true;continue;}
        const t = Math.min(1, Math.max(0, elapsed / item.duration));
        const pts = item.motion.points;
        const end = pts[pts.length - 1];
        let x, y, lift = 0;
        if (item.motion.kind === 'swap') {
          const a = pts[0], b = end;
          const cx = (a.x + b.x) / 2 - (b.y - a.y) * .20;
          const cy = (a.y + b.y) / 2 + (b.x - a.x) * .20;
          const inv = 1 - t;
          x = inv * inv * a.x + 2 * inv * t * cx + t * t * b.x;
          y = inv * inv * a.y + 2 * inv * t * cy + t * t * b.y;
          lift = Math.sin(Math.PI * t) * 7;
        } else {
          const progress = t * (pts.length - 1);
          const index = Math.min(pts.length - 2, Math.floor(progress));
          const fraction = Math.min(1, progress - index);
          const eased = fraction * fraction * (3 - 2 * fraction);
          x = pts[index].x + (pts[index + 1].x - pts[index].x) * eased;
          y = pts[index].y + (pts[index + 1].y - pts[index].y) * eased;
          lift = Math.sin(Math.PI * fraction) * (item.motion.kind === 'capture' ? 12 : 7);
        }
        item.node.setAttribute('transform', 'translate(' + (x - end.x).toFixed(2) + ' ' + (y - end.y - lift).toFixed(2) + ')');
        if (item.motion.kind === 'capture') item.node.style.opacity = String(1 - .45 * Math.sin(Math.PI * t));
        if (t === 1) {
          item.done = true;
          arrival(item);
        } else pending = true;
      }
      if (pending) frame = requestAnimationFrame(tick);
      else {frame = 0; active = [];svg.removeAttribute('aria-busy');}
    }
    frame = requestAnimationFrame(tick);
    return maxDuration;
  }
  return {play, cancel, isActive:()=>!!frame};
}
