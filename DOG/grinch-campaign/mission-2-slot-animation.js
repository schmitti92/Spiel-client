/**
 * Mission 2: visual slot preview only.
 * The first two reels reveal the regular effect. The third reel stays EMPTY
 * unless the independently drawn 10% second slot is activated, AFTER the
 * first two reels have fully stopped. No rewards or game state are changed.
 */
import { drawSlotOutcome, DECOY_FIELDS, CATEGORY_BY_ID } from './mission-2-slot-config.js?v=2';

const $ = id => document.getElementById(id);
const CATEGORY = ['💥', '🃏', '❄️', '🎭'];
const WHEELS = Array.from(document.querySelectorAll('.reels .reel'));
const random = () => {
  if (globalThis.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const basename = path => String(path).split('/').pop();
const iconUrl = effect => './' + encodeURIComponent(basename(effect.image));
const motionReduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
let effects = [], spinning = false;

function symbolElement(info) {
  const cell = document.createElement('div');
  cell.className = 'reel-cell' + (info.decoy ? ' decoy' : '') + (info.bonus ? ' bonus' : '');
  if (info.image) {
    const im = document.createElement('img');
    im.src = iconUrl(info);
    im.alt = '';
    cell.append(im);
  } else {
    const big = document.createElement('span');
    big.className = 'reel-big';
    big.textContent = info.big ?? '';
    cell.append(big);
  }
  const label = document.createElement('span');
  label.className = 'reel-small';
  label.textContent = info.small ?? '';
  cell.append(label);
  return cell;
}

function setReel(index, info = null) {
  const reel = WHEELS[index];
  reel.replaceChildren();
  reel.classList.remove('is-spinning', 'has-stopped', 'is-bonus');
  if (!info) { reel.classList.add('is-blank'); return; }
  reel.classList.remove('is-blank');
  reel.append(symbolElement(info));
  reel.classList.add('has-stopped');
  if (info.bonus) reel.classList.add('is-bonus');
}

function effectIcon(effect, small = 'GEMEINHEIT', bonus = false) {
  return { image: effect.image, small, bonus };
}

function rollingSymbols() {
  return [
    ...DECOY_FIELDS.map(field => ({
      big: String(field.count), small: 'NUR DEKO', decoy: true
    })),
    ...effects.map(e => ({
      big: CATEGORY[CATEGORY_BY_ID(e.id)], small: '#' + e.id
    }))
  ];
}

/**
 * Real vertically traveling reel strip, including suspenseful decoys.
 * Stop target is NEVER a decoy, even though decoys can scroll through.
 * Animate from real DOM positions and settle each reel before proceeding.
 */
async function spinReel(index, finalSymbol, duration, samples = 32) {
  const reel = WHEELS[index];
  const height = Math.max(1, reel.clientHeight);
  const randomSymbols = rollingSymbols();
  const strip = document.createElement('div');
  strip.className = 'reel-strip';
  strip.style.setProperty('--reel-cell-height', height + 'px');
  const frames = Array.from({length:samples}, () => randomSymbols[Math.floor(random()*randomSymbols.length)]);
  frames.push(finalSymbol);
  for (const frame of frames) strip.append(symbolElement(frame));
  reel.replaceChildren(strip);
  reel.classList.remove('is-blank', 'has-stopped');
  reel.classList.add('is-spinning');
  if (finalSymbol.bonus) reel.classList.add('is-bonus');

  if (!motionReduced() && typeof strip.animate === 'function') {
    // The last cell matches the final result. Deceleration + tiny bounce.
    const end = samples * height;
    const animation = strip.animate([
      { transform: 'translateY(0px)', offset: 0, easing: 'ease-in' },
      { transform: 'translateY(-' + Math.round(end * 0.18) + 'px)', offset: 0.19, easing: 'linear' },
      { transform: 'translateY(-' + Math.round(end * 0.83) + 'px)', offset: 0.75, easing: 'ease-out' },
      { transform: 'translateY(-' + (end + height*0.075) + 'px)', offset: 0.975, easing: 'ease-out' },
      { transform: 'translateY(-' + end + 'px)', offset: 1 }
    ], { duration, fill:'forwards' });
    try { await animation.finished; } catch { /* animation interrupted */ }
    animation.cancel();
  } else {
    // Accessibility mode: avoid rapid symbol motion, keep ordering visible.
    await delay(140);
  }
  setReel(index, finalSymbol);
  reel.classList.add('reel-hit');
  await delay(motionReduced() ? 10 : 230);
  reel.classList.remove('reel-hit');
}

function renderBonus(effect) {
  const panel = $('bonus-text');
  panel.replaceChildren();
  const strong = document.createElement('b');
  strong.textContent = '#' + effect.id + ' · ' + effect.name;
  const description = document.createElement('span');
  description.textContent = 'Bonus-Gemeinheit (andere Kategorie). Keine Gratislose.';
  panel.append(strong, description);
  $('bonus').classList.add('show');
}

async function startSpin() {
  if (spinning || effects.length !== 40) return;
  spinning = true;
  $('spin').disabled = true;
  $('spin').textContent = '🎰 Grinchs Walzen drehen ...';
  $('double').classList.remove('show');
  $('bonus').classList.remove('show');
  $('event-name').textContent = 'Die Gemeinheit wird ermittelt ...';
  $('event-desc').textContent = 'Walze 1 und 2 drehen. Die dritte Walze bleibt noch weiß.';
  $('readout').textContent = 'DIE WALZEN DREHEN ...';

  // Draw the outcome once. The frontend here is a non-authoritative demo.
  const outcome = drawSlotOutcome(random);
  const primary = effects.find(e => e.id === outcome.first);
  const bonus = outcome.second === null ? null : effects.find(e => e.id === outcome.second);
  setReel(2, null); // remains white even while other reels are spinning
  $('machine-wrap').classList.add('spinning');

  try {
    // First and second reel run TOGETHER, then settle IN SEQUENCE.
    await Promise.all([
      spinReel(0, {big:CATEGORY[CATEGORY_BY_ID(primary.id)], small:'KATEGORIE'}, 2150, 30),
      spinReel(1, effectIcon(primary), 3150, 42)
    ]);
    $('machine-wrap').classList.remove('spinning');
    $('readout').textContent = primary.name.toUpperCase();
    $('event-name').textContent = '#' + primary.id + ' · ' + primary.name;
    $('event-desc').textContent = 'Die ersten beiden Walzen stehen still. ' +
      (bonus ? 'DOPPELTES PECH! Die rechte Bonuswalze startet jetzt.' :
        'Diesmal kein Bonus: Die rechte Walze bleibt weiß.');

    // Only NOW, after the primary result has stopped, can the bonus reel spin.
    if (bonus) {
      await delay(motionReduced() ? 100 : 730);
      $('double').classList.add('show');
      setTimeout(()=>$('double').classList.remove('show'),2200);
      $('readout').textContent = 'DOPPELTES PECH!';
      await spinReel(2, effectIcon(bonus, 'BONUS #' + bonus.id, true), 2450, 34);
      renderBonus(bonus);
      $('readout').textContent = '2 GEMEINHEITEN!';
      $('event-desc').textContent = 'Slot 1: ' + primary.name + '. Slot 2: ' + bonus.name + '. Zwei Grinch-Gemeinheiten!';
    }
  } catch (error) {
    $('event-desc').textContent = 'Die Slot-Animation konnte nicht abgeschlossen werden: ' + error.message;
    setReel(2, null);
  } finally {
    $('machine-wrap').classList.remove('spinning');
    $('spin').disabled = false;
    $('spin').textContent = '🎰 Erneut drehen';
    spinning = false;
  }
}

async function load() {
  setReel(0, {big:'💥',small:'START'});
  setReel(1, {big:'🃏',small:'BEREIT'});
  setReel(2, null);
  try {
    const response = await fetch('./manifest.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Manifest nicht erreichbar.');
    const data = await response.json();
    if (!Array.isArray(data.effects) || data.effects.length !== 40 ||
      new Set(data.effects.map(e => e.id)).size !== 40) {
      throw new Error('Erwartet: 40 unterschiedliche Gemeinheiten.');
    }
    effects = data.effects;
    $('spin').disabled = false;
  } catch (error) {
    $('event-desc').textContent = 'Fehler beim Laden der Slot-Daten: ' + error.message;
    $('spin').disabled = true;
  }
}

$('spin').disabled = true;
$('spin').addEventListener('click', startSpin);
load();
