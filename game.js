
/* =========================================================
   HYBRID 3D DICE – V9 READABLE (Standalone Patch)
   - High readability overlay (large centered value)
   - Keeps existing game logic untouched
   - Offline-safe, Samsung Internet compatible
   ========================================================= */

(function () {
  const SIZE = 160;
  const VALUE_SCALE = 0.48;
  const BG_RADIUS = 26;
  const SHADOW = 'rgba(0,0,0,0.35)';

  let canvas, ctx, currentValue = 1, animating = false;

  function ensureDock() {
    return (
      document.getElementById('diceDockStatus') ||
      document.getElementById('diceCube')?.parentElement ||
      document.body
    );
  }

  function initCanvas() {
    if (canvas) return;
    const dock = ensureDock();
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    ctx = canvas.getContext('2d');
    dock.innerHTML = '';
    dock.appendChild(canvas);
    draw(currentValue);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBody() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.shadowColor = SHADOW;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    roundedRect(12, 12, SIZE - 24, SIZE - 24, BG_RADIUS);
    ctx.fillStyle = '#e9e9e9';
    ctx.fill();
    ctx.restore();

    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, '#f7f7f7');
    g.addColorStop(1, '#dcdcdc');
    roundedRect(12, 12, SIZE - 24, SIZE - 24, BG_RADIUS);
    ctx.fillStyle = g;
    ctx.fill();

    const gloss = ctx.createRadialGradient(
      SIZE * 0.35, SIZE * 0.3, 10,
      SIZE * 0.35, SIZE * 0.3, SIZE * 0.6
    );
    gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    roundedRect(12, 12, SIZE - 24, SIZE - 24, BG_RADIUS);
    ctx.fill();
  }

  function drawValue(v) {
    ctx.save();
    ctx.fillStyle = '#111';
    ctx.font = `bold ${Math.floor(SIZE * VALUE_SCALE)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(v), SIZE / 2, SIZE / 2);
    ctx.restore();
  }

  function draw(v) {
    drawBody();
    drawValue(v);
  }

  function animateTo(value) {
    initCanvas();
    currentValue = value;
    if (animating) return;
    animating = true;
    const start = performance.now();
    const D = 600;
    (function tick(t) {
      const p = Math.min(1, (t - start) / D);
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate((1 - p) * 0.06);
      ctx.translate(-SIZE / 2, -SIZE / 2);
      draw(value);
      ctx.restore();
      if (p < 1) requestAnimationFrame(tick);
      else animating = false;
    })(start);
  }

  const orig = window.setDiceFace;
  window.setDiceFace = function (n) {
    try { animateTo(n); } catch {}
    if (typeof orig === 'function') return orig.apply(this, arguments);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvas);
  } else {
    initCanvas();
  }
})();
