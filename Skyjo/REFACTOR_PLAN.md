# SKYJO – Refactoring-Plan (lokal zuerst)

Stand: 2026-10-27.

## Bestandsaufnahme
- Einstieg: `skyjo_action_local.html` und `skyjo_action.html`.
- Historische Gestaltung: zwölf `skyjo_action-style-*.css` und zahlreiche nachgeladene CSS-Dateien.
- `skyjo_action-loader.js` lädt 35 Logikteile und prüft ihre SHA-256-Hashes gegen `skyjo_action-manifest.json`. **Nach jeder Änderung eines Logikteils muss der Manifest-Hash aktualisiert werden.**
- Lokal zusätzlich: `skyjo_local_layout_runtime.js` und `skyjo_layout_editor.js`.
- Ziel: neue JSON-Layoutanordnung ohne Veränderung der funktionierenden Regeln.

## Umgesetzt
- Drei doppelte Inline-CSS-Blöcke (Goldrahmen, Premiumkarten, 4x3-Fix) in `skyjo_shared_head.css` zusammengeführt.
- Beide HTML-Einstiege verwenden dieselbe Datei in derselben Kaskadenposition.
- Spiellogik und Backend blieben unverändert.

## Nächste Schritte
1. Weitere CSS-Blöcke auf Abhängigkeiten und Überschreibungen prüfen, dann einzeln auslagern.
2. CSS-Duplikate identifizieren und nur nach visueller Prüfung entfernen.
3. JavaScript- und DOM-Abhängigkeiten inventarisieren; Logik, Rendering und Steuerung modular trennen.
4. Lokale Regressionstests: 2–4 Spieler, Bots, 4x3/5x3, Joker, Reihenabbau, Rundenende, Neustart.
5. `skyjo-layout-1.json` über Layout-Adapter integrieren.
6. Erst danach auf Online übertragen.

## Abnahme
- Keine 404-, Syntax- oder SHA-256-Fehler.
- Goldrahmen nur um aktiven Spieler.
- Tablet/PC ohne Überlappung und mit Touch-Bedienung.
- Offline-Spiel benötigt weder Firebase noch Render.
- Online-Sitzplätze und Raum-Synchronisierung unverändert.

## Risiken
- Historische CSS-Überschreibungen können absichtlich sein: keine Massenlöschung.
- Inline-Styles im Body können von der Position in der CSS-Kaskade abhängen.
- Vollständige Browser- und Spieltests sind noch offen.
