# ✨ Spielseiten-Studio · Designer

Eigenständiges, statisches Layout- und Mockup-Werkzeug für die Spielesammlung.

Live: https://schmitti92.github.io/Spiel-client/Designer/

## Zweck
Im Browser neue Spielseiten entwerfen, ohne den laufenden Spielcode
anzufassen. Ergebnisse als bearbeitbare JSON-Datei (alle Ansichten) oder
aktuelle Ansicht als PNG exportieren und später im Chat zur Umsetzung teilen.

## Projektvorlagen
- **100 Tore · Bosskampf LIVE:** Kampfbeginn, Reaktion, Blitz-Mathe, Ausweichen, Zieltreffer, Sieg, Niederlage. Jede Ansicht zeigt den kompletten Kampf auf **einer** Leinwand, mit Boss, LP, Timer und den drei Teamkarten an identischen Positionen. Der mittlere Bereich wechselt zwischen den Minispielen.
- **100 Tore · Boss-Arena:** Vor dem Kampf, Boss erscheint, Minispiel, Sieg, Niederlage.
- **100 Tore · Schmiede:** Schmiede, Waffe verbessern, Materialien, Upgrade-Erfolg.
- **Spielportal · Lobby:** Hauptlobby, Spielauswahl, Raum & Spieler.
- **Freie Seite:** Leere Ansicht.

Jedes Projekt kann mehrere Ansichten haben. Ansichten lassen sich erstellen,
umbenennen, duplizieren und löschen. Jede Ansicht hat einen eigenen Hintergrund,
Farbfilter und eigene Elemente.

## Editor
- Text, transparente/verschwommene Glas-Panels, Formen, Kreise, Buttons, Bilder,
  Lebensleisten, Spielerkarten, Pfeile und Notizen.
- Elemente auswählen, verschieben, unten rechts skalieren, per Doppelklick
  Beschriftung bearbeiten, sperren, ausblenden, duplizieren und die Ebene wechseln.
- Farbe, Deckkraft, Umrandung, Rundung, Glasunschärfe, Schatten und Textstil.
- Eigene Hintergrundbilder oder Elementbilder direkt hochladen.
- Formate Desktop 1440 × 810, Tablet 1024 × 768, Handy 390 × 844.
- Raster, Rasterausrichtung, Zoom, Vollbild, Vorschau, Rückgängig/Wiederholen.
- 💾 Projekt: Alle Ansichten und eingebettete Bilder als JSON herunterladen.
- 📷 Bild: Aktuelle Ansicht als PNG herunterladen.
- Automatisch im Browser gespeichert; regelmäßig die JSON-Datei exportieren.

## Aufbau
- index.html: Studio-Menüs, Werkzeuge und Eigenschaften.
- studio.css: Responsive Design und Canvas.
- studio-model.mjs: Testbares Datenmodell und Vorlagen.
- studio.js: Editor, Bilder, Projektdatei und PNG.
- tests/studio.test.mjs: Automatische Sicherheits- und Strukturtests.
- .github/workflows/designer-studio-check.yml: GitHub Actions CI.

Keine Anmeldung und keine Firebase-, Render- oder anderen Spiel-APIs.
Das Studio verändert keine Live-Spielstände und speichert Entwürfe nicht auf
dem Server. Hochgeladene Bilder werden verkleinert und in JSON eingebettet.
Der PNG-Export zeichnet die Ansicht im Browser nach; die Darstellung kann
bei Glasunschärfe und Schrift leicht von der Vorschau abweichen.

## Gemeinsam weiterarbeiten
Projekt und gegebenenfalls PNG herunterladen, im Chat hochladen und erklären,
welche Bereiche wie umgesetzt werden sollen. Die JSON-Projektdatei bleibt
vollständig bearbeitbar. Der Umbau der echten Spielseiten erfolgt später.

## Direktstart: Bosskampf LIVE

[Bosskampf-LIVE-Vorlage direkt im Designer öffnen](https://schmitti92.github.io/Spiel-client/Designer/?template=boss-live)

Beim Öffnen per Direktlink wird ein bereits im Browser vorhandenes Projekt **nicht ohne Nachfrage** ersetzt. Alternativ im linken Auswahlmenü **„100 Tore · Bosskampf LIVE“** wählen und auf **„Neues Projekt“** tippen. Danach alle Bereiche frei anpassen und die JSON-Projektdatei exportieren.

Die Ansichten sind reine visuelle Entwürfe mit Platzhaltern und erfüllen keinerlei Server- oder Kampfmechanik. Die echten Boss-Minispiele werden erst in einem separaten Entwicklungsschritt anhand des fertigen Designer-Projekts umgesetzt.
