'use strict';
/* Goldstudio Broadcast V2. Public, read-only show graphics; never sends commands. */
(() => {
  const stage = document.querySelector('.case-stage');
  const feed = document.querySelector('#banker-call .banker-call-portrait');
  const call = document.getElementById('banker-call');
  if (!stage || !feed || !call) return;

  const strap = document.createElement('div');
  strap.className = 'broadcast-strap';
  strap.innerHTML =
    '<div class="broadcast-identity"><span class="broadcast-emblem">✦</span><span>GOLDSTUDIO <small>PRIMETIME</small></span></div>' +
    '<div class="broadcast-ticker" id="broadcast-ticker">26 Koffer. Eine große Entscheidung.</div>' +
    '<span class="broadcast-stakes" id="broadcast-stakes">● LIVE</span>';
  stage.insertBefore(strap, stage.querySelector('.cases'));
  // A non-blocking television stinger for a unanimous NO DEAL decision.
  const stinger = document.createElement('div');
  stinger.id = 'broadcast-no-deal-stinger';
  stinger.className = 'broadcast-no-deal-stinger';
  stinger.hidden = true;
  stinger.setAttribute('role', 'status');
  stinger.innerHTML = '<span>🔥 DIE KANDIDATEN BLEIBEN MUTIG</span><strong>ALLE SAGEN NO DEAL!</strong><small>Die Kofferjagd geht weiter …</small>';
  stage.append(stinger);

  const feedLabels = document.createElement('div');
  feedLabels.className = 'broadcast-feed-labels';
  feedLabels.setAttribute('aria-hidden', 'true');
  feedLabels.innerHTML =
    '<div class="broadcast-feed-top"><b><span class="broadcast-feed-dot"></span> LIVE</b><span>EXKLUSIV · BANKBÜRO</span></div>' +
    '<span class="broadcast-feed-bottom">DIREKTLEITUNG 01 <i>▂▄▆▄▂</i></span>';
  feed.append(feedLabels);

  const offerMath = document.createElement('div');
  offerMath.id = 'broadcast-offer-math';
  offerMath.className = 'broadcast-offer-math';
  offerMath.setAttribute('aria-label', 'Einordnung des Bankangebots');
  offerMath.hidden = true;
  offerMath.innerHTML =
    '<div class="broadcast-math-title">📊 DIE ZAHLEN HINTER DEM DEAL</div>' +
    '<div class="broadcast-math-grid">' +
    '<div><span>Durchschnitt der unbekannten Beträge</span><strong id="broadcast-math-average">–</strong></div>' +
    '<div><span>Bankangebot im Vergleich</span><strong id="broadcast-math-ratio">–</strong></div>' +
    '</div><div class="broadcast-trend" id="broadcast-trend">☎ Das erste Angebot ist da!</div>' +
    '<p id="broadcast-math-note">Rechnerische Orientierung, keine Gewinnprognose.</p>';
  const callSub = document.getElementById('banker-call-sub');
  if (callSub) callSub.insertAdjacentElement('afterend', offerMath);

  const $ = id => document.getElementById(id);
  const currency = amount => typeof eur === 'function'
    ? eur(amount)
    : (amount / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  let previousKey = '', previousPhase = '', previousGameId = '';
  let noDealTimer = null;
  const shownNoDeals = new Set();
  function update() {
    if (document.hidden) return;
    const game = typeof g === 'undefined' ? null : g;
    const openedAmounts = Array.isArray(game?.openedAmounts) ? game.openedAmounts : [];
    const stateKey = String(game?.id || 'none') + ':' + String(game?.revision ?? '-') + ':' + String(game?.phase || '');
    if (previousKey === stateKey) return;
    previousKey = stateKey;
    const opened = new Set(openedAmounts.map(item => item.amount));
    const scale = typeof values === 'undefined' ? [] : values;
    const remaining = scale.filter(value => !opened.has(value));
    const count = remaining.length;
    const largest = count ? Math.max(...remaining) : 0;
    const highCount = remaining.filter(v => v >= 100000000).length; // At least one million euros, values are cents.
    const phase = game?.phase || 'waiting';
    const lastRound = game?.history?.at(-1);
    const allRefused = lastRound?.participants?.length > 0 &&
      lastRound.decisions?.length === lastRound.participants.length &&
      lastRound.decisions.every(decision => decision.deal === false);
    const roundKey = String(game?.id || '') + ':' + String(lastRound?.round || '');
    if (game && game.id === previousGameId && previousPhase === 'decision' &&
      phase === 'open' && allRefused && !shownNoDeals.has(roundKey)) {
      shownNoDeals.add(roundKey);
      stinger.hidden = false;
      stinger.classList.remove('on-air');
      void stinger.offsetWidth;
      stinger.classList.add('on-air');
      window.clearTimeout(noDealTimer);
      noDealTimer = window.setTimeout(() => {
        stinger.hidden = true;
        stinger.classList.remove('on-air');
      }, 2200);
    } else if (phase === 'final' || !game || (game.id !== previousGameId && previousGameId)) {
      window.clearTimeout(noDealTimer);
      stinger.hidden = true;
      stinger.classList.remove('on-air');
    }
    previousPhase = phase;
    previousGameId = game?.id || '';

    let headline;
    if (!game) headline = 'Willkommen zur großen Koffershow!';
    else if (phase === 'select') headline = 'Wählt euren persönlichen Glückskoffer!';
    else if (phase === 'reveal') headline = 'Achtung: Der nächste Koffer öffnet sich!';
    else if (phase === 'decision') headline = '☎ Der Banker ist in der Leitung – Deal oder No Deal?';
    else if (phase === 'final') headline = '🏆 Das große Finale – jetzt fällt die Entscheidung!';
    else if (phase === 'open') {
      headline = highCount
        ? highCount + ' Millionenbeträge sind noch im Rennen!'
        : 'Jetzt entscheidet jeder Koffer über das Finale!';
    } else headline = 'Goldstudio · Deine große Show';
    const ticker = $('broadcast-ticker');
    if (ticker && ticker.textContent !== headline) {
      ticker.textContent = headline;
      ticker.classList.remove('broadcast-reel');
      void ticker.offsetWidth;
      ticker.classList.add('broadcast-reel');
    }
    const stakes = $('broadcast-stakes');
    if (stakes) stakes.textContent = game
      ? (phase === 'decision' ? '☎ BANKER LIVE' : phase === 'final' ? '★ FINALE' : '★ TOP ' + currency(largest))
      : '● LIVE';
    document.body.classList.toggle('broadcast-bank-live', phase === 'decision');
    document.body.classList.toggle('broadcast-finale', phase === 'final');
    document.body.classList.toggle('broadcast-high-risk', phase !== 'final' && count > 0 && count <= 5);
    document.body.classList.toggle('broadcast-modal-active', phase === 'decision' || phase === 'final');

    if (!offerMath.isConnected) return;
    if (phase !== 'decision' || !Number.isFinite(game.offer) || count === 0) {
      offerMath.hidden = true;
      feed.dataset.bankerMood = 'idle';
      return;
    }
    const avg = remaining.reduce((sum, amount) => sum + amount, 0) / count;
    const ratio = avg > 0 ? game.offer / avg * 100 : 0;
    const previousOffer = game.history?.length > 1 ? game.history.at(-2)?.offer : null;
    const trend = $('broadcast-trend');
    if (trend) {
      if (Number.isFinite(previousOffer) && previousOffer > 0) {
        const percentage = Math.round((game.offer - previousOffer) / previousOffer * 100);
        trend.textContent = percentage > 0
          ? '↗ Der Banker erhöht sein Angebot um ' + percentage + ' %.'
          : percentage < 0
            ? '↘ Der Banker senkt sein Angebot um ' + Math.abs(percentage) + ' %.'
            : '→ Der Banker bleibt bei seinem bisherigen Angebot.';
        trend.dataset.direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'same';
      } else {
        trend.textContent = '☎ Das erste Bankangebot liegt auf dem Tisch.';
        trend.dataset.direction = 'first';
      }
    }
    const mood = ratio < 35 ? 'poker' : ratio >= 80 ? 'generous' : 'calculating';
    feed.dataset.bankerMood = mood;
    $('broadcast-math-average').textContent = currency(avg);
    $('broadcast-math-ratio').textContent = ratio.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' %';
    $('broadcast-math-note').textContent = count + ' unbekannte Beträge · ' +
      highCount + ' davon mindestens 1 Mio. € · Der Durchschnitt ist keine Garantie.';
    offerMath.hidden = false;
  }
  update();
  window.setInterval(update, 850);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { previousKey = ''; update(); } });
})();
