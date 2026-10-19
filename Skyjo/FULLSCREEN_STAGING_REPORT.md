# SKYJO Action – Immersive Vollbild-Entwicklungsphase

Stand: 19. Oktober 2026. Entwicklungsbranch: `skyjo-immersive-fullscreen-staging-20261019`.

## Ziel
Schrittweise Annäherung an das vom Nutzer ausgewählte Referenzbild: hochwertiger Holztisch, 3 kompakte Kartenfelder, zugängliche Aktionen und Tablet-Vollbild.

## Änderungen
1. `Skyjo/assets/wood_table_ambient.svg`: eigenständiger SVG-Hintergrund mit Holzmaserung, warmem Licht, Pflanzendekoration und Spieltisch-Requisiten. Textbasierte, skalierbare Asset-Datei statt einer großen Rastergrafik.
2. `Skyjo/skyjo_immersive.css`: optionale Darstellungsschicht für den isolierten Host-Test; Hintergrund, responsiver Vollbildaufbau, Fokuszustände.
3. `Skyjo/skyjo_fullscreen.js`: `requestFullscreen`, `exitFullscreen`, `fullscreenchange`, `fullscreenerror`; keine automatische Vollbildaktivierung, nur auf Nutzerklick.
4. `Skyjo/skyjo_host_test.html`: Vollbild-Schaltfläche und Einbindung der getrennten CSS/JS-Dateien.
5. `tests/skyjo-fullscreen.test.cjs`: Prüft Asset, Schaltfläche und grundlegende Browser-API-Anbindung.
6. `tests/skyjo-host-layout.test.cjs`: Aktualisierung der CSS-Cacheversionsprüfung.

## Tests
- GitHub Actions Lauf 39308201799: fehlgeschlagen wegen veralteter CSS-Versionsnummer im Regressionstest.
- Regressionstest korrigiert.
- GitHub Actions Lauf 39308296610: **success**. JavaScript-Syntax, Host-Preview-Tests, Layouttests, SKYJO-Modultests bestanden.

## Nicht getestet / nicht fertig
- Keine echte Screenshot- oder Android-Tablet-Prüfung des Fullscreen API-Verhaltens.
- Kein Pixel-für-Pixel-Nachbau des generierten Mockups. Die generierte Rastergrafik selbst wurde nicht als Asset in GitHub hochgeladen; der neue Hintergrund ist eine separate, leichtgewichtige SVG-Illustration.
- Keine neuen Spielerfotos, hochwertigen Kartenbilddateien oder 3D-Animationen.
- Keine Änderungen an der produktiven Online-Spielengine, am Render-Server oder an Firebase.
- Vollbild kann browserseitig eingeschränkt sein; der Button zeigt bei fehlender Unterstützung einen Hinweis.

## Nächste Schritte
1. Browser-Screenshot auf dem Zieltablet, sowohl normal als auch Vollbild, auf Überlappungen prüfen.
2. Optional hochwertige Hintergrundgrafik als komprimiertes WebP über einen Binärdatei-Upload in GitHub einbinden.
3. Kartenstapel, Avatare und Sprüche-Bereich optisch näher ans Referenzbild bringen, dabei Spielbarkeit priorisieren.
4. Spielregeln und echte Online-Synchronisierung unabhängig vom visuellen Host-Test validieren.
5. Erst nach ausdrücklicher Freigabe den Branch nach `main` übernehmen.

## Entwicklungsphase 2: Tablet-Dichte und Bedienelemente
- Neue Datei `Skyjo/skyjo_tablet_density.css` als letzte optionale CSS-Schicht eingebunden.
- Reaktionsleiste und Sprüche-Kategorien als feste 4er-/3er-Raster im Querformat gestaltet.
- Seitliche Buttons, Kartenabstände und Statusbereiche für geringe Bildschirmhöhen verdichtet.
- Im Vollbild-Hochformat bewusst vertikales Scrollen zugelassen, statt Spielbereiche abzuschneiden.
- `tests/skyjo-fullscreen.test.cjs` erweitert: Einbindung und responsive Regeln geprüft.
- GitHub Actions Lauf **39308580984**: erfolgreich (Syntax-, Host-, Layout- und SKYJO-Modulprüfungen).

### Testgrenzen
Die Tests sind statisch und automatisiert; sie belegen nicht, dass auf einem realen Samsung-Tablet sämtliche Elemente pixelgenau oder ohne Browser-Besonderheiten sichtbar sind. Ein manueller Querformat-/Vollbild-Screenshot bleibt nötig.

## Entwicklungsphase 3: Robustheit und Simulationsprüfung
- `Skyjo/skyjo_fullscreen.js`: Vollbild-Unterstützung wird geprüft; der Button wird bei fehlender Browser-API deaktiviert; Status und Fehlerbehandlung verbessert.
- `tests/skyjo-host-invariants.test.cjs`: 35 randomisierte komplette Testpartien. Nach jedem Zug werden Kartenanzahl und Werteverteilung, Turn-Zähler, fehlende ausstehende Karten und Abschlusszustand überprüft.
- GitHub Actions Lauf **39308917788**: fehlgeschlagen, weil ein bestehender Test weiterhin `catch(e)` statt `catch(error)` erwartete. Der Test wurde an die neue Implementierung angepasst.
- GitHub Actions Lauf **39309013109**: **success**; die erweiterte Testserie einschließlich 35 Partien wurde ausgeführt.
- Der Host-Test bleibt isoliert. Es gab keine Änderung am Render-Server oder an der produktiven SKYJO-Action-Engine.

### Noch offen
- Echter Browser-Test der Fullscreen API auf Android/Tablet.
- Bildgetreue Darstellung des gewünschten fotorealistischen Referenzdesigns.
- Vollständige Spielregeln, Joker und Spezialeffekte im isolierten Host-Test (bisher vereinfachte Engine).
- Online-Multiplayer-Last- und Wiederverbindungstests; diese wurden in dieser Phase nicht ausgeführt.

## Entwicklungsphase 4: Bedienbarkeit und Zugänglichkeit
- `Skyjo/skyjo_host_test_visual.js`: Dialoge stellen beim Schließen den Tastaturfokus wieder her; Escape und Klick auf den Hintergrund verwenden denselben Schließpfad.
- `Skyjo/skyjo_host_test.html`: Dialogsemantik `role=dialog`, `aria-modal`, beschrifteter Titel und Beschreibung; Versionen der Fullscreen- und Dialogskripte angehoben, damit Browser aktuelle Assets laden.
- `tests/skyjo-host-accessibility.test.cjs`: neue statische Prüfungen für Dialogattribute, Fokuswiederherstellung und Vollbild-Unterstützung.
- Der erste Lauf **39309311003** schlug wegen eines veralteten Asset-Versionsasserts fehl. Dieser wurde korrigiert.
- GitHub Actions Lauf **39309432762**: **success**; bestehende und neue Tests bestanden.

### Grenzen dieser Phase
Die Tests prüfen Code und Markup, ersetzen jedoch weder echte Screenreader-Tests noch Tablet-Browser-Interaktion. Es wurden keine Änderungen an produktivem Multiplayer oder Server vorgenommen.

## Entwicklungsphase 5: Dialog-Fokus und abgeschnittene Tablet-Menüs
- `Skyjo/skyjo_host_test_visual.js`: Tab und Shift+Tab bleiben im geöffneten Dialog, Escape schließt ihn; beim Schließen wird der vorherige Fokus wiederhergestellt.
- `Skyjo/skyjo_tablet_density.css`: Seitenspalten scrollen bei zu geringer Höhe vertikal statt Buttons und Reaktionen abzuschneiden.
- `Skyjo/skyjo_host_test.html`: CSS-/JS-Cacheversionen aktualisiert.
- `tests/skyjo-host-accessibility.test.cjs`: erweiterte statische Tests für Fokusbegrenzung und Tablet-Scrollverhalten.
- GitHub Actions **39309765203**: zunächst fehlgeschlagen wegen einer fehlerhaften Regex im Test; Prüfung durch robuste explizite Zeichenkettenasserts ersetzt.
- GitHub Actions **39309871112**: **success** (einschließlich aller bereits vorhandenen Regressionstests).

### Noch offene Prüfung
Eine reale Tablet-Ansicht mit Browser-Vollbild, Bildschirmtastatur und verschiedenen Höhen ist weiterhin erforderlich. Der Fokus-Test ist statisch und ersetzt keinen echten Tastatur- oder Screenreader-Test.
