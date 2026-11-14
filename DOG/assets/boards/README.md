# DOG – wählbare Spielfeldhintergründe (ohne Spielfelder)

Die Bilddateien enthalten **keine** fest eingezeichneten Lauffelder, Zielbahnen, Startpositionen oder Figuren. Diese Elemente zeichnet DOG live aus `board-layout.js` und `app.js`, damit Bewegung, Zoom und Spielregeln korrekt bleiben.

## Enthaltene einfache Varianten

`schiefer.svg`, `pergament.svg`, `holz.svg`, `bergsee.svg`, `goldwellen.svg`

## Aufwendige Bildeditionen (optionaler Upload)

Lade die fünf **1024 × 1024 px**-WebP-Bilder in genau diesen Ordner hoch:

- `royal-marmor.webp`
- `alpenland.webp`
- `kuestenabenteuer.webp`
- `royal-karten.webp`
- `zauberwald.webp`

Diese Namen sind bereits in `DOG/appearance-registry.js` registriert. Sind die WebP-Dateien noch nicht hochgeladen, zeigt das Spiel automatisch ein passendes, mitgeliefertes SVG-Grunddesign an.

## Auswahl

In `spielauswahl-lokal.html` und `hub-lobby.html` gibt es einen DOG-Brettdesign-Wähler. Er speichert nur die Optik **auf dem jeweiligen Gerät** unter `dog:appearance:v1`; der gespeicherte DOG-Spielstand, Online-Raum und die serverseitigen Regeln werden nicht verändert.

Ein neues Design wird durch einen zusätzlichen Eintrag in `BOARD_STYLES` angeboten. Die Spielbrett-Geometrie ist vom Hintergrund unabhängig.
