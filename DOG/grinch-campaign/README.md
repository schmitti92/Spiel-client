# DOG – Grinch-Kampagne (getrennt vom Hauptspiel)

Stand: 18.11.2026

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
- Ein neues lokales Spielstandformat (`version:3`, Key `dog-grinch-m1-single-portal-v3`) verhindert, dass ältere vierteilige-Zielbahn-Spielstände geladen werden.
- Der lokale Pilot deckt nicht alle Sonderregeln des Hauptspiels 1:1 ab, ist noch nicht an Render gekoppelt und vergibt keine offiziellen Kampagnenbelohnungen.

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

Die aktuelle Ein-Portal-Engine wurde mit 400 verschiedenen Seeds unter simulierten legalen Kartenaktionen getestet. Alle 400 Versuche endeten mit genau einem Verlust je Spieler und jeweils vier nach Welt 2 teleportierten Figuren. Die SVG-Brettsimulation zeigt alle 64 Lauffelder und drei statt zwölf Zielpositionen. Ein Browser-End-to-End-Test sowie synchronisierte Mehrgeräte-Tests stehen noch aus.


## Original-Brett erhalten

- Vier geschützte Startfelder bei 0, 16, 32 und 48 bleiben exakt gleich. Nur in Mission 1 sind die drei Portalziele an den ersten Original-Zielpositionen sichtbar.
- Für drei Kampagnenspieler werden Rot (0), Blau (16) und Gelb (48) benutzt, die grüne Bahn bleibt optisch erhalten und unbesetzt.
- Originale Design-Voreinstellungen und selbst platzierte Brettfelder werden übernommen.
- Sonderfelder und Wettereffekte dürfen lediglich **Overlay-Schichten** hinzufügen; der klassische Brettrenderer, die Feldanzahl und die Standard-Lobby werden nicht geändert.
- `mission-1-rules.js` speichert in `dog-grinch-m1-single-portal-v3`, damit frühere Teststände mit abweichender Geometrie nicht versehentlich geladen werden.
- Der SVG-Brettrenderer wurde in einem isolierten Smoke-Test mit 15 gezeichneten Spielfiguren geprüft.
