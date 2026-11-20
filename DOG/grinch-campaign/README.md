# GRINCH CHAOS SLOTS – Grafikpaket für DOG Mission 2

Dieses Paket enthält 5 große freigestellte PNG-Grafiken, 40 einzeln nutzbare,
nummerierte Effekt-Icons (je 256 × 256 px) und die zusätzlich 40 aus dem
Quellblatt ausgeschnittenen Motivbilder ohne Nummern.

## Dateien

- `grafiken/slotmaschine_haupt.png` – großes Hauptgehäuse mit 3 leeren Walzen.
- `grafiken/slotmaschine_bonus.png` – separate Maschine für den zweiten Slot (10 %).
- `grafiken/slot_gemeinheit_popup.png` – Effektergebnis-Fenster mit Platz für Symbol, Name und Erklärung.
- `grafiken/doppeltes_pech_banner.png` – Overlay für den zusätzlichen Slot.
- `grafiken/40_symbole_quellblatt.png` – Originalillustration mit allen 40 Motiven.
- `icons/` – 40 nummerierte Effekt-Icons gemäß `manifest.json`.
- `icon_motive/` – 40 unnummerierte, originale Einzelmotive.
- `vorschau/alle_40_gemeinheiten.jpg` – Gesamtübersicht.

## Einbau in GitHub

Vorgesehener Zielordner im Frontend-Repo `schmitti92/Spiel-client`:
`DOG/grinch-campaign/assets/grinch-slots/`

Zum Hochladen ZIP **entpacken** und die Dateien/Verzeichnisse im Repo anlegen.
Das ZIP allein im Repository hochzuladen macht die Bilder noch nicht im Spiel sichtbar.
Die Grafiken werden erst bei der späteren Programmierung mit der Spielmechanik verbunden.

## Hinweise zur Gestaltung / technische Grenzen

- Die drei Walzen sind grafisch als **leere Fenster** vorbereitet, das tatsächliche
  Rotieren und die Ergebnisanzeige müssen durch JavaScript/CSS umgesetzt werden.
- Das Bild für den zweiten Slot ist ebenfalls eine **statische Grafik**.
- 40 Effekt-Icons sind bereits passend nummeriert und benannt. Bei manchen
  ähnlichen Effekten wurde ein Quellmotiv mehrfach benutzt (z. B. großes/kleines
  Erdbeben), da das generierte Originalblatt nicht 1:1 jede der 40 ausgearbeiteten
  Regelideen zeigte; die eingeblendete Nummer und der Spieltext unterscheiden sie.
- Die zwei großen Maschinen-/Pop-up-Grafiken enthalten dekorativen fest gerenderten Text.
  Namen und Beschreibungen der Gemeinheiten werden später **dynamisch als HTML** eingeblendet.
- Die Illustrationen enthalten Alpha-Transparenz. Einige grüne Glüheffekte können
  die Außenkonturen bewusst weich erscheinen lassen.
- Spielregel: 110 Original-DOG-Karten, nach jeder neuen Kartenphase 1 Slot,
  unabhängig 10 % Chance auf einen zweiten, maximal 2 Slots. Grafikpaket enthält
  keine Spiel-Engine und verändert nicht GitHub/Render.
