# DOG Grinch – Mission 3: Grundgerüst

Stand: 21.11.2026. Arbeitspakete 1 und 2 sind als lokaler Spieltest umgesetzt. Mission 3 ist weiterhin nicht für offizielle Online-Räume freigeschaltet.

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

Paket 3: Mehrzugplanung und aggressive Grinch-KI. Der jetzige Grinch-Gegner nutzt nur einen einfachen regelkonformen Testalgorithmus.

Paket 4: Zufallsereignis am Kartenphasenende, Rückschlag, zwei eigene Züge Einfrieren und genau eine dauerhafte Gefangennahme je Mensch. Gefangene bleiben später bis Mission 4 gesperrt.

Paket 5: Drei echte Aufgaben – drei sich bei jeder neuen Kartenphase versetzende Weihnachtslichter, vier Eisbarrieren, drei frei aktivierbare Runen. Die Vorschau-Stufenauswahl wird durch regelbasierte Übergänge ersetzt.

Paket 6: Neues Grafikpaket, Animationen, Touch-Optimierung.

Paket 7: Serverseitige Grinch-KI und Online-Zugprüfung, Privatsphäre der Karten, offizielle Missionsfreischaltung nach Mission 2, Speicherung.

Paket 8: Vollständige gemeinsame Praxistests und Langzeitsimulationen.

Die offizielle Mission-3-Einstellung bleibt disabled, bis sämtliche Pakete funktionsfähig und abgesichert sind. Mission 1, Mission 2, reguläres DOG und Mission 4 werden nicht verändert.
