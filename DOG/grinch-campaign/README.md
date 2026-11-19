# DOG – Grinch-Kampagne (getrennt vom Hauptspiel)

Stand: 19.11.2026

## Struktur

- `mission-config.js`: Eigene Definitionen für fünf Missionen. Nur Mission 1 ist als lokaler Spieltest aktiviert.
- `mission-1-rules.js`: Unabhängige DOG-Variante (drei Personen, je fünf Figuren, **dieselben 64 Lauffelder, aber jeweils nur ein wiederverwendbares Portal-Zielfeld**). Keine Änderungen an `DOG/engine.js`, `DOG/app.js` oder den regulären Online-Räumen.
- `mission-board.js`: Zeichnet dieselben 64 Original-DOG-Lauffelder mit **denselben Koordinaten und gewählten Brettdesigns**; verwendet direkt `../board-layout.js` und `../appearance-registry.js`. Die statische SVG-Brettdarstellung ist aus dem Hauptspiel isoliert übernommen; das Hauptspiel bleibt unangetastet.
- `mission-1.html`, `mission-1.css`: Eigenständige Kampagnenoberfläche **mit originalem DOG-Brett** und optionalen missionsspezifischen visuellen Effekten.
- `mission-1.js`: Anzeige, Interaktion, Wetter- und Storyeffekte sowie **nur lokaler** Browser-Testspielstand.

## Mission 1 – Pfadfinder und die Portale nach Welt 2

- Eigenständiger lokaler Hotseat-Test für drei Spieler. Das normale DOG bleibt unverändert.
- Hintergrund: `winterliches_portal_im_alpenreich.png`, vom Benutzer in diesen Kampagnenordner hochgeladen.
- Der `mission-board.js`-Renderer legt die *originalen 64 DOG-Lauffelder* und die normalen Startbereiche über die Winterlandschaft.
- Mission 1 unterdrückt das DOG-Wappen in der Mitte, damit der bebilderte Welt-2-Eingang sichtbar bleibt.
- Jedem menschlichen Spieler wird nur **das allererste Feld der bisherigen vierteiligen Zielbahn** als aktives Portal gezeigt: Rot `GOAL_POINTS[0][0]`, Blau `GOAL_POINTS[1][0]`, Gelb `GOAL_POINTS[3][0]`. Die anderen drei Zielfelder je Bahn und die grüne Zielbahn sind im Kampagnenmodus ausgeblendet.
- Pro Spieler fünf Figuren zum Start. Vier stehen in den normalen Hausfeldern und die fünfte wird zunächst **nur als Reserveanzeige** auf dem eigenen Startfeld dargestellt. Verlässt eine Figur das Haus, rückt die fünfte in den freien Hausplatz. Wird eine eigene aktive Figur vom Startfeld durch eine andere eigene aus dem Haus verdrängt, kehrt die erste ohne Verlust ins Haus zurück. Keine Figur wird beim Startfeldwechsel unsichtbar.
- Pro Spieler fünf Figuren zum Start. Eine Figur wird garantiert durch Einsturz, Entführung oder Eisfluch gefangen und verbleibt kampagnenbedingt vermisst.
- Die übrigen vier Figuren müssen mit genau passender Kartenzahl auf das eine Portal-Zielfeld gelangen (`steps === 64`). Bei Eintritt wechselt die Figur dauerhaft in den `teleported`-Zustand und verschwindet **sofort** vom Brett. Das Portal bleibt für beliebig viele weitere Figuren wieder frei.
- Sobald alle drei Spieler je vier Figuren teleportiert haben (12 insgesamt), ist der lokale Missionsversuch abgeschlossen; ein echter Server-Aufstieg in Mission 2 existiert noch nicht.
- Die vier Orientierungsfelder 8/24/40/56 zeigen rein erzählerische Hinweise. Nebel und Erdbeben gelten ausschließlich für den Missionsmodus.
- Der neue Regelstand verwendet lokales Spielstandformat `version:4` mit Key `dog-grinch-m1-canonical-cards-v4`. Ältere lokale Testpartien bleiben unter ihren alten Speicher-Keys als Backup, werden aber nicht fortgeführt.
- Die Missionskarten stammen aus demselben offiziellen Kartensatz wie `DOG/engine.js`: 110 Karten, 14 Kartentypen, Original-Kartenbilder über `card-visuals.js`, separate Tauschkarte, teilbare 7, Joker, vier Schritte rückwärts, Kartenphasen 6/5/4/3/2. Im Drei-Spieler-Jeder-für-sich-Modus **entfällt der 2-gegen-2-Partnerkartentausch** des klassischen Spiels; die Karteneffekte selbst bleiben erhalten. Keine Render-Anbindung und keine offiziellen Kampagnenbelohnungen.

## Unbedingt beachten

**Kein offizieller Multiplayer-Modus:** Der Teststand nutzt `localStorage` ausschließlich zur Fortsetzung eines lokalen Versuchs. Er ist nicht manipulationssicher, hat keine Render-API-Anbindung und darf **niemals** als offizieller Kampagnensieg, Dorfbelohnung oder Spielfigurenbestand im Account behandelt werden.

Ein späterer Server-Modus benötigt ein getrenntes Namensschema, z. B.
`dog_grinch_campaign_v1` für freigeschaltete Missionen, eingesperrte Figuren und echte Resultate sowie
`dog_grinch_room_v1` für autorisierte Runden und transaktional bestätigte Züge. Server und Clients dürfen dabei nicht die üblichen DOG-Rundenobjekte verwenden.

## Erweiterbarkeit für Mission 2–5

Jede Mission erhält einen eigenen `mission-n-rules.js`-Adapter, eigene Brettgrafik und eine Felddefinition, z. B.:

```js
{
  id: 17,
  type: 'collapse', // fog, ice, portal, warning, boss-spawn
  position: 17,
  trigger: 'onEnter',
  effect: {kind: 'trap', severity: 1}
}
```

Die Grafik- und Ereignisebene zeigt die Felder an, die Regel-Engine entscheidet über deren Wirkungen. Weder die ursprüngliche DOG-Engine noch bestehende reguläre Partien müssen hierfür verändert werden.

## Lokale Tests

Link aus der Grinch-Eventseite: Mission 1 > Details > „Mission 1 im Testmodus spielen“.

Die Vorgängerversion mit Einzelportal wurde in 400 Partien getestet. Der aktuelle Kartensatz-/Startschutz-/Erdbeben-Regelstand wurde danach nochmals in **225 simulierten Partien mit mehreren Spielstrategien** ohne Stillstand oder Feldüberlappung und mit korrektem Figurenabschluss getestet. Zusätzlich gezielt getestet: geschützte Startfigur nicht schlagen/überspringen/tauschen, eigenes Startfeld verdrängen ohne Figurenverlust, Erdbeben mit besetztem Startfeld (Figur davor bleibt stehen), Rückwärts-4, geteilte 7 einschließlich Schlagen auf überquerten Feldern und Pflichtverlust nur nach Abschluss einer geteilten 7, exakte Portal-Landung. Ein Browser-End-to-End-Test sowie synchronisierte Mehrgeräte-Tests stehen noch aus.


## Original-Brett erhalten

- Vier geschützte Startfelder bei 0, 16, 32 und 48 bleiben exakt gleich. Nur in Mission 1 sind die drei Portalziele an den ersten Original-Zielpositionen sichtbar.
- Für drei Kampagnenspieler werden Rot (0), Blau (16) und Gelb (48) benutzt, die grüne Bahn bleibt optisch erhalten und unbesetzt.
- Originale Design-Voreinstellungen und selbst platzierte Brettfelder werden übernommen.
- Sonderfelder und Wettereffekte dürfen lediglich **Overlay-Schichten** hinzufügen; der klassische Brettrenderer, die Feldanzahl und die Standard-Lobby werden nicht geändert.
- `mission-1-rules.js` speichert in `dog-grinch-m1-canonical-cards-v4`, damit alte Teststände mit abweichender Kartendeck- oder Zielgeometrie nicht versehentlich geladen werden.
- Der SVG-Brettrenderer wurde in einem isolierten Smoke-Test mit 15 gezeichneten Spielfiguren geprüft.

## Geschütztes Startfeld und Erdbeben (Mission 1)

- Eine Figur ist **nur auf ihrem eigenen farbigen Startfeld** gegen normales Schlagen, Überqueren mit Karten und Tauschen geschützt. Eine weitere eigene Figur darf bewusst herausgesetzt werden; die bisherige Startfigur kehrt dabei ins Haus zurück.
- Ein Erdbeben bewegt **alle beweglichen Lauffiguren um genau ein Feld zurück**, außer Figuren auf farbigen Startfeldern. Hausfiguren, teleportierte und verlorene Figuren bleiben unverändert.
- Das Erdbeben wertet die ursprüngliche Belegung aller 64 Felder aus: Steht auf dem rückwärtigen Zielfeld bereits eine Figur, bleibt die betroffene Figur stehen, auch wenn der Vordermann sonst ebenfalls zurücklaufen könnte. Es wird weder geschlagen noch überlappt.
- Die Pflichtfalle darf erst nach einer *vollständig* gespielten Karte aktiv werden. Eine aufgeteilte 7 zählt als **eine Karte**; die Falle wird nicht zwischen Teilbewegungen ausgelöst.

## Noch offen für offizielle Freigabe

- 3 unabhängige Spieler sind momentan nur lokal an einem Gerät spielbar; keine echte Online-Mehrspielerpartie.
- Kein klassischer 2v2-Partnerkartentausch im Drei-Spieler-Modus, da in dieser Mission jeder für sich spielt.
- Browser- und Handy-Praxistest, Render-API-Spielstand, verifizierter Missionsabschluss und Freischaltung von Mission 2 fehlen noch.
