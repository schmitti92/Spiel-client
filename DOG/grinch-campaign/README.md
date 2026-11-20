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

## Mission 2 – Der verfluchte Aufstieg (Stand 20.11.2026)

- **Ausschließlich Mission 2:** Eigene `mission-2.html`, `mission-2.js`, `mission-2-rules.js`, `mission-2-effects.js`, `mission-2-board.js`, `mission-2-markers.js`, `mission-2-online.js`, `mission-2-slot-ui.js` und `mission-2.css`. Das reguläre DOG und Mission 1 haben keine neuen Grinch-Slot-Regeln bekommen.
- **Kampagnenfortsetzung:** Pro Spieler vier Figuren, davon die vierte Figur auf dem geschützten Startfeld. Die fünfte wurde in Mission 1 bereits verloren. Im Verlauf von Mission 2 geht eine weitere Figur je Spieler durch den Story-Fluch verloren; die jeweils drei verbleibenden Figuren müssen das exakt erreichbare, wiederverwendbare Portal verlassen. Insgesamt neun Portalrettungen.
- **40 Slot-Gemeinheiten:** Sofortige Rückschläge, temporäre Kartenwerte, Eisfelder und Spielerstreiche; ausgelöst beim Geben jeder neuen Kartenphase. 110 unveränderte DOG-Karten bilden die Basis. Der zweite Slot erscheint unabhängig mit 10 % Wahrscheinlichkeit und wählt eine kompatible andere Kategorie.
- **Nur optische Lockpreise:** 10, 50 oder 100 kostenlose Rubbellose dürfen bei der Animation als ausdrücklich nicht gewinnbare Attrappen vorbeilaufen. In der Ziehung sind ausschließlich die 40 Gemeinheiten. Die Slotmaschine hat keine Geld-, Voucher- oder Rubbellos-Auszahlungsfunktion.
- **Animation:** Zwei Hauptwalzen mit nacheinander einsetzenden Stopps; rechte Walze bleibt leer, bis nach dem Haupt-Stopp der Bonus ausgelöst ist. Der Bonusbanner erscheint kurz. Animationen enthalten keine eigene Spielmechanik.
- **Offizieller Online-Start:** Bereits bestehender HUB-Raum mit exakt drei menschlichen Nutzern; Host startet via `/api/hub/rooms/:code/grinch/launch2`. Der Server verifiziert Weihnachtsbaumstufe 10 und für alle drei Konten einen echten Abschluss von Mission 1. Aktionen bleiben an Match-ID, Revision und eindeutige Aktionskennung gebunden. Nur der Server speichert einen gemeinsamen Sieg und `highestUnlocked:3`.
- **Privatheit:** Eigene Kartenhände nur beim angemeldeten Besitzer. Deck, Seed und RNG-Zähler werden nicht an andere Spieler gesendet.
- **Separater lokaler Test:** `mission-2.html` ohne Raumcode; kein Schreiben von offiziellen Freischaltungen oder Gewinnständen.
- **Tests:** `serverfinal/tests/dog-grinch-mission2.test.js`, `serverfinal/tests/dog-grinch-mission2-hub.test.js`, Frontend `tests/dog-grinch-mission2-scope.test.mjs`. Browser-Praxistests mit drei verschiedenen Geräten und langfristige Balance-Simulationen bleiben zu prüfen.
