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

## Fortschritt 2026-10-27 – JavaScript
- Fünf identische Inline-Skripte in eigenständige JS-Dateien ausgelagert: `skyjo_hub_autostart.js`, `skyjo_active_outline_sync.js`, `skyjo_online_motion.js`, `skyjo_clear_board_bonus.js`, `skyjo_clear_victory.js`.
- Reihenfolge der klassischen Skripte und DOM-Platzierung beibehalten (keine neuen `async`/`defer`-Attribute).
- HTML-Nachkontrolle: online 0 Inline-Skripte, lokal 1 Inline-Skript für den lokalen URL-Modus; beide 0 Inline-CSS-Blöcke.
- Vor Entfernung weiterer CSS-Dateien: visuelle Regression und Überprüfung von Selektor-Überschreibungen erforderlich.
- WICHTIG: Auslagerung ist noch keine nachgewiesene Browser-Funktionsprüfung; Tests auf Tablet und im Mehrspielermodus stehen aus.

## Fortschritt – Inline-Code vollständig entfernt
- `skyjo_local_mode_guard.js` enthält jetzt auch den bisher letzten Inline-JavaScript-Block der lokalen Einstiegsseite.
- Nachkontrolle der GitHub-Dateien: beide Einstiege enthalten 0 Inline-CSS und 0 Inline-JavaScript.
- Lokal: 29 CSS- und 12 JS-Verlinkungen; online: 28 CSS- und 12 JS-Verlinkungen (einschließlich Profilskripten).
- Die zwölf historischen CSS-Teile beginnen mit Basisselektoren und enthalten zahlreiche `!important`-Überschreibungen. Sie dürfen nicht ungeprüft entfernt oder alphabetisch neu sortiert werden.
- **Nächster Gate:** automatisierte Linkprüfung und CSS-Kaskadeninventar; danach visuelle Regression auf Tablet/PC, erst dann tatsächliches Zusammenführen/Löschen von CSS.

## CSS-Konsolidierung – 2026-10-27
- `skyjo_action-style-12.css` unverändert an Ende von `skyjo_action-style-11.css` angehängt; Einbindung von 12 in beiden Einstiegspunkten entfernt.
- `skyjo_action-style-10.css` unverändert an Ende von `skyjo_action-style-09.css` angehängt; Einbindung von 10 in beiden Einstiegspunkten entfernt.
- Ursprungsdateien 10 und 12 verbleiben als Rückfalloption im Repository, werden jedoch von den beiden Hauptseiten nicht mehr geladen.
- Vor dem Zusammenführen wurden beide Dateipaare auf `@charset`, `@import` und geschweifte Klammern geprüft. Reihenfolge der Regeln blieb erhalten.
- Für den nächsten Schritt: verbleibende Stylesheets auf relative `url(...)`-Referenzen und Kaskadenwirkung prüfen; Browser-Sichtprüfung erforderlich.

## CSS-Konsolidierung – weitere vier Dateipaare
- Originalsegmente 01+02, 03+04, 05+06, 07+08 wurden jeweils in den ungeraden Teil zusammengeführt.
- CSS-Einbindungen der historischen zwölf Dateien sind damit auf sechs reduziert: 01, 03, 05, 07, 09, 11.
- Ursprungsdateien 02, 04, 06, 08, 10 und 12 bleiben im Repository, werden von den zwei Einstiegspunkten nicht geladen.
- Es wurden keine Regeln entfernt und die Reihenfolge der Segmente blieb erhalten. Dadurch ist dies eine Kaskaden-konsistente Konsolidierung, noch keine Selektor-Entdoppelung.
- Vor dem Löschen alter Dateien sind weitere Referenzen anderer Seiten zu prüfen.

## Design-CSS Konsolidierung (2026-10-27)
- Vier benachbarte Royal-Gestaltungsdateien in `skyjo_royal_visual_bundle.css` zusammengeführt: realism, detail, reference_finish, photo_backdrop.
- Reaktionsleiste und Touch-Status-Korrektur in `skyjo_reactions_status_bundle.css` zusammengeführt.
- CSS-Reihenfolge und Regeln wurden übernommen; ursprüngliche Dateien bleiben als Rückfalloption erhalten.
- Aktuelle Einbindungen: lokal 19 Stylesheets, online 18; beide ohne Inline-CSS und Inline-JavaScript.
- Nächster Schritt: Browser-Sichtvergleich und Kaskadenanalyse, danach gezielte Entfernung tatsächlich überschüssiger Selektoren. Automatische Strukturtests ersetzen keine visuelle Prüfung.

## Lokales Layout aus Nutzer-JSON v3
- `skyjo_layout_local_v3.json` enthält die neun vom Nutzer übermittelten Blöcke samt Positionen, Größen, Sichtbarkeit und Z-Index.
- `skyjo_local_layout_v3.js` validiert die Datei ohne Firebase und setzt CSS-Variablen für die relativen Größen der drei Spielspalten, Hand-/Stapelzonen und beiden rechten Spielerbereiche.
- `skyjo_local_layout_v3.css` aktiviert die Größenverhältnisse ausschließlich für die lokale Drei-Spieler-Querformatansicht; bei Fehlern bleibt das bisherige Layout erhalten.
- Die exakten X-/Y-Positionen, Statistik-/Status-/Reaktions-/Pause-Geometrie sind **noch nicht** übernommen, weil diese Elemente teilweise außerhalb der Spielfeld-Gridstruktur liegen und eine eigene Kollisionsprüfung benötigen.
- Automatischer Test validiert neun Blöcke und stellt sicher, dass Online-HTML unverändert bleibt. Visuelle Prüfung auf Tablet weiterhin ausstehend.

## Layout v3 – Koordinaten und Abstände
- Alle neun JSON-Blöcke werden als CSS-Variablen `--skyjo-v3-<id>-{x,y,w,h,z}` bereitgestellt.
- Abstände zwischen den drei Spalten sowie zwischen Handzone/Stapel und den rechten Spielerfeldern werden aus den gelieferten Koordinaten berechnet, mit begrenzten responsiven CSS-Werten.
- Nur die lokale Drei-Spieler-Querformatansicht verwendet diese Abstände; die exakte absolute Positionierung von Status, Statistik, Reaktionen und Pause steht noch aus.
- Der Integritätstest überprüft zusätzlich die Originalinhalte aller sechs historischen CSS-Zusammenführungen und beider neuen Design-Bundles.
