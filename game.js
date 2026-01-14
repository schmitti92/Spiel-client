let isAnimatingMove = false; // FIX: verhindert Klick-Crash nach Refactor

(() => {
  const $ = (id) => document.getElementById(id);

  function debugLog(...args){
    try{ console.log(...args); }catch(_e){}
    const el = document.getElementById('debugLog');
    if(el){
      try{
        el.textContent += args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ') + "\n";
        el.scrollTop = el.scrollHeight;
      }catch(_e){}
    }
  }a

  // ===== UI refs =====
  const canvas = $("c");
  const ctx = canvas.getContext("2d");
  const toastEl = $("toast");
  const netBannerEl = $("netBanner");
  const debugToggle = $("debugToggle");
  const debugLogEl = $("debugLog");

  const rollBtn = $("rollBtn");
  const ROLL_BTN_BASE_TEXT = rollBtn ? (rollBtn.textContent || "Würfeln").trim() : "Würfeln";
  const startBtn = $("startBtn");
  const endBtn  = $("endBtn");
  const skipBtn = $("skipBtn");
  const resetBtn= $("resetBtn");
  const resumeBtn = $("resumeBtn");
  const hostTools = $("hostTools");
  const saveBtn = $("saveBtn");
  const loadBtn = $("loadBtn");
  const restoreBtn = $("restoreBtn");
  const loadFile = $("loadFile");
  const autoSaveInfo = $("autoSaveInfo");

  // ... FULL CONTENT CONTINUES ...
})();
