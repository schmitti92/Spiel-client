# DOG Grinch – Mission 3: Grundgerüst

Stand: 21.11.2026. Arbeitspakete 1, 2, 3, 4 und 5 sind als lokaler Spieltest umgesetzt. Mission 3 ist weiterhin nicht für offizielle Online-Räume freigeschaltet.

## Neue Dateien

Frontend: DOG/grinch-campaign/mission-3.html, mission-3.js, mission-3.css, mission-3-board.js, mission-3-rules.js.

Backend: dog/grinch-mission3.js.

Tests: Backend tests/dog-grinch-mission3-foundation.test.js und Frontend tests/dog-grinch-mission3-foundation.test.mjs, jeweils mit eigenem GitHub-Action-Workflow.

Frontend- und Backend-Regelmodule sind bytegleich. Die Testseite verwendet ausschließlich lokalen Browser-Speicher, keine offiziellen Räume, Belohnungen oder Freischaltungen.

## Bereits umgesetzt

- Originale 64 DOG-Felder und 14 Figuren: drei je Mensch, fünf grüne Grinch-Figuren.
- Zufällige, überschneidungsfreie Anfangspositionen; alle 14 Figuren stehen beim Start auf dem Brett.
- Jeder menschliche Spieler bewegt ausschließlich seine eigenen Figuren.
- Menschen dürfen sich gegenseitig ins Häuschen schlagen. Der Grinch ist unbesiegbar.
- Grinch-Treffer auf Menschen: zurück zum eigenen Start, sofern das Zielfeld frei ist; sonst ins Häuschen. Startfelder bleiben geschützt.
- Ein gemeinsamer Stapel mit genau 110 Original-DOG-Karten.
- Menschen erhalten pro Kartenphase je sechs Karten. Der Grinch erhält 6, 12 oder 18 Karten.
- Zugfolge Rot, Blau, Gelb, Grinch; je nach Stufe 1, 2 oder 3 Kartenaktionen mit unterschiedlichen Grinch-Figuren.
- Startkarten 1/11 und 13, keine Startfunktion für 12, 4 vorwärts/rückwärts, teilbare 7, Tauschkarte und Joker.
- Kartenerhaltung, geschützte Felder, Schutz verdeckter fremder Handkarten in der vorgesehenen Serveransicht.
- Mobile Testoberfläche mit DOG-Brett, Handkarten und Kartenstapeln, Grinch-Automatik sowie echtem Fortschrittsbalken für drei Gemeinschaftsaufgaben.

## Weitere Umsetzung und offener Umfang

Paket 3 umgesetzt: Deterministische taktische Grinch-KI (tactical-beam-v1). Sie wertet Treffer, Bedrohung, Annäherung und optional die öffentlich sichtbaren Aufgabenfelder aus. Ihre begrenzte Mehrzugplanung berücksichtigt bis zu drei Kartenaktionen und schätzt Kartensequenzen voraus; die Teilbewegungen der 7 werden regelkonform weitergespielt. Sie kennt niemals die Handkarten der Menschen. Auf dem Brett werden ihre Bewegungen einzeln gezeigt. Regressionstests liegen in tests/dog-grinch-mission3-ai.test.js.

Paket 4 umgesetzt und getestet: Bei Ende der vollständigen Handkartenphase wird deterministisch aus dem Seed und dem Spielstand entweder ein Rückwurf um 2–6 freie DOG-Felder oder eine zweizügige Einfrierung bestimmt. Gesperrte Figuren sind nicht beweglich und tauen erst nach zwei tatsächlichen eigenen Kartenzügen auf; bei vollständig blockierten Spielern wird pro Zug nur eine Karte abgelegt. Treffer auf das eigene freie Startfeld und auf ein eigenes besetztes Startfeld werden unterschiedlich behandelt; fremde Figuren auf dem Startfeld werden ohne Doppelbelegung abgewickelt. Pro Aufgabenabschnitt darf höchstens eine andere Farbe eine Figur dauerhaft verlieren (Überraschungsereignis, zurzeit vorläufig 28 % nach einer Kartenphase). Bei jedem erreichten Aufgabenabschluss löst die Engine eine fehlende Gefangennahme automatisch aus. Jede menschliche Farbe kann nur einen neuen Gefangenen erhalten; alle werden bis Mission 4 gesperrt. Geheime Fangreihenfolge wird aus dem clientseitigen Sichtmodell entfernt. Die UI zeigt Eis-Symbole, verbleibende Eiszüge, den letzten Fluch und die Gefangenenzahl. Eigene Regressionstests: serverfinal/tests/dog-grinch-mission3-attacks.test.js.

Die zufällige frühe Entführungswahrscheinlichkeit (momentan 28 %) und die Rückwurfweite (2–6) sind vorläufige Balancingwerte und können vor dem offiziellen Online-Start angepasst werden.

Paket 5 umgesetzt: Drei feste Gemeinschaftsaufgaben werden automatisch nacheinander gestartet:
1. ✨ Drei Weihnachtslichter durch GENAUEN Karten-Landungstreffer einsammeln; bereits eingesammelte Lichter bleiben erledigt, verbleibende wechseln auf neue freie Felder nach der NÄCHSTEN vollständigen Kartenverteilung.
2. 🧊 Vier Eisbarrieren einmal durch genaues Landen zerstören; die zufällig erzeugten Eisfelder bleiben während dieser Aufgabe fest.
3. 🔮 Drei Runen in beliebiger Reihenfolge genau betreten und aktivieren; ihre Felder bleiben während des Finales fest.

Alle Zielfelder werden pro Partie deterministisch und einheitlich erzeugt, ohne doppelte Positionen, ohne geschützte Startfelder und ohne besetzte Zielfelder. Unbesiegbare Grinch-Figuren dürfen offene Missionsfelder und menschliche Startfelder überqueren, aber dort nicht stehen bleiben, damit die Aufgabe lösbar bleibt. Ein Griff, Tauschen oder bloßes Überqueren zählt NICHT als Sammeln. Die teilbare 7 darf bei einem tatsächlichen Zwischenstopp ein Ziel erfüllen. Beim Übergang ist die Folgeaufgabe sofort verfügbar; 6/12/18 Grinch-Karten und 1/2/3 Kartenaktionen gelten ab der nächsten vollständigen Kartenverteilung. Jede abgeschlossene Aufgabe garantiert genau eine Entführung eines bislang nicht betroffenen Menschen. Im Siegzustand sind 3+4+3 Ziele erledigt, genau drei Figuren bleiben bis zur Rettung am Ende von Mission 4 gefangen, und sechs Figuren sind frei. Nach Sieg keine weiteren Kartenaktionen oder Test-Neuverteilungen.

Die lokale Testseite zeigt Aufgaben-Markierungen als SVG auf dem originalen DOG-Brett, die 0/3–0/4–0/3 Fortschrittsanzeigen und den abgeschlossenen Missionsstatus. Die manuelle Stufenauswahl wurde entfernt; für Testzwecke bleibt die gesonderte vorgezogene Kartenverteilung vorhanden. Eigenständige Backend-Regressionstests: tests/dog-grinch-mission3-objectives.test.js.

Paket 6 noch offen: Neues Grafikpaket, Animationen, Touch-Optimierung.

Paket 7 noch offen: Autoritative Online-Ausführung der bereits entwickelten Grinch-KI und Online-Zugprüfung, Privatsphäre der Karten, offizielle Missionsfreischaltung nach Mission 2, Speicherung.

Paket 8: Vollständige gemeinsame Praxistests und Langzeitsimulationen.

Die offizielle Mission-3-Einstellung bleibt disabled, bis sämtliche Pakete funktionsfähig und abgesichert sind. Mission 1, Mission 2, reguläres DOG und Mission 4 werden nicht verändert.
