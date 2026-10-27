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

## Local layout v3 diagnostic
- Fixed two escaped newline artifacts in runtime stylesheet.
- Optional `layoutPreview=1` draws noninteractive rectangles from nine JSON blocks, relative to the board. This is diagnostic only, not exact final positioning.
- Added regression tests; tablet visual verification and exact placement of external controls remain open.

## Local v3 preview fixes
- Preview now starts even if the layout JSON resolves after DOMContentLoaded.
- Preview redraws are limited to animation frames and respond to scrolling.
- Duplicate JSON block IDs are rejected to preserve the previous layout.
- Structural tests cover startup and redraw scheduling. Exact placement and visual tablet regression remain pending.

## Local tablet safety refinements
- All three board columns have minimum-size safeguards in the local landscape stylesheet.
- Reaction strip retains horizontal touch scrolling when width is constrained.
- JSON diagnostic overlay now requires `layoutPreview=1` explicitly; regular games remain overlay-free.
- Bottom HUD blocks are not absolutely repositioned yet because their placement relative to the board requires device-level visual verification.

## Local v3 footer mapping
- Keep the full width of all five status fields; rejected a 60%-width experiment before proceeding.
- Local CSS retains normal document flow for status and reaction controls.
- `layoutDebug` now reports read-only selector matches and target JSON coordinates for stats, status, reactions and pause.
- The current footer mapping is diagnostic, not a verified one-to-one placement. The same status selector is provisionally used for stats and status until the rendered DOM is inspected.
- Automated guard prevents absolute positioning of the footer in the local v3 stylesheet.

## Full-screen layout preview
- The nine imported block coordinates are now drawn against the visible viewport rather than the board rectangle, so footer targets use the same percentage reference.
- Pause diagnostics now search pause-specific selectors instead of identifying the entire bottom action bar as the pause button. A missing match is reported as missing, not silently guessed.
- Automated tests assert viewport-based preview sizing. The preview remains optional and pointer-transparent.
- Real footer relocation and physical tablet verification are still pending.

## Local editor and viewport measurement
- The drag-and-resize editor is now explicitly opt-in via `?mode=local&layoutEditor=1`; ordinary offline games no longer show its floating button.
- `layoutDebug` reports actual HUD bounds as percentages of the viewport alongside the imported target values. This is read-only.
- The HUD selectors remain provisional until verified against a rendered three-player session; no automatic HUD repositioning is enabled.

## Live local HUD geometry diagnostics
- `layoutDebug` now refreshes after DOM child changes and viewport resizing, with redraws limited to animation frames.
- HUD diagnostics include actual viewport percentages and deltas to the JSON targets.
- Stats/status are explicitly marked as a shared DOM container; their distinct target rectangles must not be applied blindly.
- Still pending: exact footer DOM mapping, automated browser screenshot verification, and physical tablet validation.

## Integrity recovery and HUD mapping refinement
- Fixed a stale Python structural assertion after the HUD actualX/actualY variables were refactored. SKYJO structural integrity passed for the corrective commit.
- Diagnostics now distinguish the first `.status.premium-status .stat` tile (provisional stats mapping) from the complete `.status.premium-status` bar (status mapping).
- This is read-only instrumentation, not a new visual layout or a verified correspondence to the user's separate stats/status JSON blocks.
- Full browser-based visual validation and footer placement remain outstanding.

## Local footer polish
- Three-player landscape local layout now explicitly uses five equal-width status tiles while preserving their normal flow.
- Reaction touch targets have a minimum 40x40 CSS-pixel area and remain horizontally scrollable when crowded.
- Local layout assets are cache-busted to v2 in the offline entrypoint; online entrypoint unchanged.
- Added regression checks for status grid, reaction targets and local asset references.
- This does not establish exact JSON HUD placement; visual browser/tablet validation remains pending.

## Local three-player footer spacing
- Added responsive gaps between board, status and action footer without taking controls out of normal flow.
- Status text now clips with ellipsis instead of spilling across neighboring tiles.
- Debug HUD geometry reports are deduplicated by their measured JSON snapshot, reducing console noise during DOM updates.
- Refreshed local layout CSS/JS asset versions to v3 and updated structural tests accordingly.
- Browser screenshot/tablet testing and exact nine-block placement remain outstanding.

## Preview lifecycle and visibility diagnostics
- Simplified opt-in preview startup for both early and late DOM readiness.
- When the three-player local board is removed, its old overlay is removed too, avoiding stale guides in other game states.
- HUD diagnostics now distinguish DOM presence from nonzero on-screen dimensions.
- Added structural regression checks and refreshed the local preview JS asset to v4.
- Exact DOM-to-JSON footer placement and device screenshots are not yet verified.
