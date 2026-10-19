(()=>{'use strict';
const dialog=document.getElementById('test-dialog'),title=document.getElementById('dialog-title'),body=document.getElementById('dialog-body');
let returnFocus=null;
const close=()=>{if(dialog.hidden)return;dialog.hidden=true;if(returnFocus?.isConnected)returnFocus.focus()};
const open=(name,message)=>{returnFocus=document.activeElement;title.textContent=name;body.textContent=message;dialog.hidden=false;document.getElementById('dialog-close').focus()};
document.getElementById('dialog-close').onclick=close;
dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const messages={
'Regeln':'Du kannst den Nachzieh- oder Ablagestapel wählen, anschließend eine Karte tauschen. Nach dem Ziehen vom Nachziehstapel kannst du alternativ die gezogene Karte abwerfen und eine verdeckte Karte aufdecken. Joker und Spezialfähigkeiten gehören noch nicht zu dieser Vorschau.',
'Statistik':'Testpartien verändern keine Online-Statistiken. Die Kartenwerte werden ausschließlich am Ende eines vollständigen Testdurchlaufs angezeigt.',
'Chat':'Die simulierten Spieler sind keine echten Online-Teilnehmer. Nachrichten werden hier nicht versendet.',
'Spezial':'Spezialfähigkeiten sind in dieser Vorschau noch nicht spielbar. Die produktive SKYJO-Logik bleibt unverändert.',
'Joker':'Joker sind in dieser Vorschau noch nicht spielbar.',
'Reihe lösen':'Reihen und Spalten können in dieser Vorschau noch nicht entfernt werden.',
'Menü':'Nachziehstapel oder Ablagestapel antippen, dann Tauschen oder Abwerfen & Aufdecken wählen und eine eigene Karte antippen. ▶ Zug simulieren: vereinfachter Zug. 🤖 Auto-Test: alle drei Spieler automatisch. ↻ Neu mischen: zurücksetzen. Keine Online-Statistik.'
};
document.querySelectorAll('[data-dialog]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.dialog,messages[b.dataset.dialog])));
const quotes={
humor:['Manchmal ist die beste Strategie: erst denken, dann klicken.','Wenn der Plan nicht aufgeht, mischen wir neu.','Eine gute Karte macht noch keinen Sieger.'],
bible:['Alles hat seine Zeit. – Prediger 3,1','Die Liebe hört niemals auf. – 1. Korinther 13,8','Prüft alles und behaltet das Gute. – 1. Thessalonicher 5,21'],
office:['Das Meeting war erfolgreich. Wir planen ein weiteres.','Wir haben die Lösung – jetzt suchen wir das Problem.','Bitte den Prozess einhalten, auch wenn er im Weg steht.']
};const counters={humor:0,bible:0,office:0};
document.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.quote,items=quotes[type];open('💬 '+b.textContent,items[counters[type]++%items.length])}));
document.querySelectorAll('[data-emoji]').forEach(b=>b.addEventListener('click',()=>{const el=document.createElement('div');el.className='reaction-burst';el.textContent=b.dataset.emoji;document.body.append(el);if(matchMedia('(prefers-reduced-motion: reduce)').matches){setTimeout(()=>el.remove(),750);return}const animation=el.animate([{opacity:0,transform:'translateX(-50%) scale(.6)'},{opacity:1,transform:'translateX(-50%) scale(1.2)'},{opacity:0,transform:'translateX(-50%) translateY(-80px)'}],{duration:1300});animation.finished.then(()=>el.remove()).catch(()=>el.remove())}));
})();