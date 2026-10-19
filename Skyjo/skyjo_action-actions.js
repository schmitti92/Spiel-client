/* SKYJO Action: catalog of nine special cards. Load before game loader. */
window.SKYJO_ACTION_DEFINITIONS=Object.freeze({
 ownswap:{name:'Eigene Karten tauschen',icon:'🔀',kind:'normal',desc:'Zwei eigene Karten tauschen; Ausrichtung neu wählen.'},
 double:{name:'Doppelter Spielzug',icon:'⏩',kind:'normal',desc:'Danach zwei vollständige Züge hintereinander.'},
 draw3:{name:'Drei Karten ziehen',icon:'3️⃣',kind:'normal',desc:'Drei ziehen, höchstens eine behalten.'},
 enlight:{name:'Erleuchtung',icon:'🔎',kind:'normal',desc:'Eine komplette Reihe oder Spalte geheim ansehen.'},
 react:{name:'Reaktivierung',icon:'♻️',kind:'normal',desc:'Eine Aktionskarte aus der Ablage sofort erneut spielen.'},
 defense:{name:'Verteidigung',icon:'🛡️',kind:'defense',desc:'Blockt einen Angriff; aktiv gespielt = Extrazug.'},
 swapother:{name:'Kartentausch Mitspieler',icon:'🔁',kind:'attack',desc:'Eine Karte zwischen zwei Spielern tauschen.'},
 thief:{name:'Aktionskarten-Dieb',icon:'🥷',kind:'attack',desc:'Aktionskarte stehlen + Extrazug.'},
 meteor:{name:'Meteoritenschauer',icon:'☄️',kind:'attack',desc:'Bei jedem Mitspieler eine Karte ersetzen.'}
});
