# DOG Grinch – Mission 3: Grundgerüst

Stand: 21.11.2026. Arbeitspakete 1, 2 und 3 sind als lokaler Spieltest umgesetzt. Mission 3 ist weiterhin nicht für offizielle Online-Räume freigeschaltet.

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
- Mobile Testoberfläche mit DOG-Brett, Handkarten und Kartenstapeln, Grinch-Automatik zum Entwickeln und Stufenvorschau.

## Bewusst offen

Paket 3 umgesetzt: Deterministische taktische Grinch-KI (tactical-beam-v1). Sie wertet Treffer, Bedrohung, Annäherung und optional die öffentlich sichtbaren Aufgabenfelder aus. Ihre begrenzte Mehrzugplanung berücksichtigt bis zu drei Kartenaktionen und schätzt Kartensequenzen voraus; die Teilbewegungen der 7 werden regelkonform weitergespielt. Sie kennt niemals die Handkarten der Menschen. Auf dem Brett werden ihre Bewegungen einzeln gezeigt. Regressionstests liegen in tests/dog-grinch-mission3-ai.test.js.

Paket 4 offen: Zufallsereignis am Kartenphasenende, Rückschlag, zwei eigene Züge Einfrieren und genau eine dauerhafte Gefangennahme je Mensch. Gefangene bleiben später bis Mission 4 gesperrt.

Paket 5 offen: Drei echte Aufgaben – drei sich bei jeder neuen Kartenphase versetzende Weihnachtslichter, vier Eisbarrieren, drei frei aktivierbare Runen. Die Vorschau-Stufenauswahl wird durch regelbasierte Übergänge ersetzt.

Paket 6 offen: Neues Grafikpaket, Animationen, Touch-Optimierung.

Paket 7 offen: Autoritative Online-Ausführung der bereits entwickelten Grinch-KI und Online-Zugprüfung, Privatsphäre der Karten, offizielle Missionsfreischaltung nach Mission 2, Speicherung.

Paket 8: Vollständige gemeinsame Praxistests und Langzeitsimulationen.

Die offizielle Mission-3-Einstellung bleibt disabled, bis sämtliche Pakete funktionsfähig und abgesichert sind. Mission 1, Mission 2, reguläres DOG und Mission 4 werden nicht verändert.
