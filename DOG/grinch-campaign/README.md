# DOG – Grinch-Kampagne (getrennt vom Hauptspiel)

Stand: 18.11.2026

## Struktur

- `mission-config.js`: Eigene Definitionen für fünf Missionen. Nur Mission 1 ist als lokaler Spieltest aktiviert.
- `mission-1-rules.js`: Unabhängige DOG-Variante (drei Personen, je fünf Figuren, **dieselben 64 Lauffelder und vier Zielfelder wie im Hauptspiel**). Keine Änderungen an `DOG/engine.js`, `DOG/app.js` oder den regulären Online-Räumen.
- `mission-board.js`: Zeichnet dieselben 64 Original-DOG-Felder mit **denselben Koordinaten und gewählten Brettdesigns**; verwendet direkt `../board-layout.js` und `../appearance-registry.js`. Die statische SVG-Brettdarstellung ist aus dem Hauptspiel isoliert übernommen; das Hauptspiel bleibt unangetastet.
- `mission-1.html`, `mission-1.css`: Eigenständige Kampagnenoberfläche **mit originalem DOG-Brett** und optionalen missionsspezifischen visuellen Effekten.
- `mission-1.js`: Anzeige, Interaktion, Wetter- und Storyeffekte sowie **nur lokaler** Browser-Testspielstand.

## Mission 1 – Der Weg zum Berg

- Drei Spieler spielen abwechselnd an **einem Gerät**.
- Fünf Spielfiguren pro Spieler am Anfang. Die fünfte Figur wird **gestapelt auf einem der vier vorhandenen Startplätze** angezeigt, statt neue Start-/Zielfelder in das Originalbrett zu bohren.
- Einmaliger garantierter Verlust je Spieler; Zuteilung von Einsturz, Entführung und Eisfluch erfolgt zufällig.
- Erst nach dem zweiten eigenen gültigen Zug wird ein Verlust auf einer tatsächlich aktiven Wegfigur ausgelöst; weitere Kampagnenverluste gibt es in dieser Mission nicht.
- Die vier verbleibenden Figuren jedes Spielers müssen die **vier originalen** Zielfelder erreichen.
- Der lokale Pilot übernimmt die gewohnten Kartenwerte, ist aber **noch keine vollständige 1:1-Portierung sämtlicher klassischer Sonderregeln, Kartenphasen und Online-Spielinteraktionen**. Normale Zugkarten im Testmodus: 1/11, 2, 3, 4 (rückwärts möglich), 5, 6, 7 als Tausch, 8, 9, 10, 12, 13 und Joker. Startkarten 1/11 und 13.
- Erdbeben: Wegfiguren werden ein Feld zurückgesetzt; Figuren im Starthaus oder Ziel werden aus Sicherheitsgründen nicht versetzt.
- Nebel und Hinweise dienen der Stimmung und erschweren nicht die Kartenbedienung.
- Gefangene werden im Teststand markiert, aber nicht als echte Account-Fortschritte eingetragen.

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

Die auf 64 Original-Felder korrigierte Regel-Engine wurde mit 300 fest vorgegebenen Seeds unter simulierten, legalen Kartenaktionen getestet. Alle 300 Versuche endeten mit genau einem Verlust und vier geretteten Figuren pro Spieler. Ein Browser-End-to-End-Test sowie synchronisierte Mehrgeräte-Tests stehen noch aus.

## Pfadfinder-Wegweiser (Mission 1)

- Die 64 Lauffelder und die Original-Zielkoordinaten sind identisch zum Hauptspiel. Nur SVG-Dekorationen im separaten Missionsrenderer werden aufgesetzt.
- Vier Orientierungsfelder: 8 (erste Spuren, links unten), 24 (Nebelpass, links oben), 40 (grünes Leuchten, rechts oben), 56 (Eisweg, rechts unten). Landet eine Figur darauf, erscheint ein reiner Storyhinweis, ohne Kartenregeln zu verändern.
- Jeder der drei Spieler hat vier vorhandene Zielfelder. Sobald alle vier Ziele besetzt sind, erhält das innere Ende seiner Zielbahn einen leuchtenden Wegweiser „M2“. Rot: (380, 496.48), Blau: (263.52, 380), Gelb: (496.48, 380) im SVG-Bereich 760×760.
- Sind alle drei Spieler durch, erscheint die Erzählung vom Bergpass zu Mission 2. **Mission 2 bleibt bis zur echten Implementierung gesperrt.**
- `mission-1-pathfinder.js` erzeugt die passiven Feldhinweise und Bergpass-Markierungen anhand der originalen Layoutkoordinaten. Normales DOG benutzt dieses Modul nicht.

## Original-Brett erhalten

- Vier geschützte Startfelder bei 0, 16, 32 und 48 und alle vier Original-Zielbahnen bleiben grafisch vorhanden.
- Für drei Kampagnenspieler werden Rot (0), Blau (16) und Gelb (48) benutzt, die grüne Bahn bleibt optisch erhalten und unbesetzt.
- Originale Design-Voreinstellungen und selbst platzierte Brettfelder werden übernommen.
- Sonderfelder und Wettereffekte dürfen lediglich **Overlay-Schichten** hinzufügen; der klassische Brettrenderer, die Feldanzahl und die Standard-Lobby werden nicht geändert.
- `mission-1-rules.js` speichert in `dog-grinch-m1-classic-board-v2`, damit frühere Teststände mit abweichender Geometrie nicht versehentlich geladen werden.
- Der SVG-Brettrenderer wurde in einem isolierten Smoke-Test mit 15 gezeichneten Spielfiguren geprüft.
