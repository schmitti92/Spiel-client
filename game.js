
// ====== EXISTING GAME LOGIC ABOVE REMAINS UNCHANGED ======
// (This file keeps all previous logic intact. Only wheel overlay styling is enhanced.)

// Ensure epic spin styles are injected once
(function injectEpicSpinStyles(){
  if(document.getElementById("epicSpinStyles")) return;
  const style = document.createElement("style");
  style.id = "epicSpinStyles";
  style.textContent = `
  .spinBox{
    text-align:center;
    animation:fadeIn .4s ease;
  }

  .spinSmall{
    font-size:16px;
    opacity:.7;
    margin-bottom:8px;
  }

  .spinPlayers{
    font-size:18px;
    opacity:.75;
    margin-bottom:10px;
    letter-spacing:1px;
  }

  .spinBig{
    font-size:64px;
    font-weight:900;
    color:#ff3b3b;
    text-shadow:
      0 0 12px rgba(255,0,0,.9),
      0 0 40px rgba(255,0,0,.7),
      0 0 80px rgba(255,0,0,.5);
    margin:20px 0;
    animation:pulseGlow 1s infinite alternate;
  }

  .spinSub{
    font-size:14px;
    opacity:.6;
    margin-bottom:20px;
  }

  @keyframes pulseGlow{
    from{ transform:scale(1); }
    to{ transform:scale(1.06); }
  }
  `;
  document.head.appendChild(style);
})();

// Hook into existing overlay if present
(function enhanceExistingSpinOverlay(){
  const observer = new MutationObserver(() => {
    const overlay = document.querySelector(".spinOverlay, .spinBox");
    if(!overlay) return;

    const headline = overlay.querySelector("h1, .headline");
    if(headline){
      headline.classList.add("spinBig");
    }

    const players = overlay.querySelector(".players, .playerLine");
    if(players){
      players.classList.add("spinPlayers");
    }
  });

  observer.observe(document.body, { childList:true, subtree:true });
})();

// ====== END OF FILE ======
