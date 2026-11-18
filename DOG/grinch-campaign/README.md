# DOG – Grinch-Kampagne (getrennt vom Hauptspiel)

Stand: 18.11.2026

## Struktur

- `mission-config.js`: Eigene Definitionen für fünf Missionen. Nur Mission 1 ist als lokaler Spieltest aktiviert.
- `mission-1-rules.js`: Unabhängige DOG-ähnliche Regel-Engine (drei Personen, fünf Figuren, 60 Wegfelder, fünf Zielfelder pro Spieler). Keine Änderungen an `DOG/engine.js`, `DOG/app.js` oder den regulären Online-Räumen.
- `mission-1.html`, `mission-1.css`: Eigenständiges Brettdesign (Weg zum Berg), Menü und Oberfläche.
- `mission-1.js`: Anzeige, Interaktion, Wetter- und Storyeffekte sowie **nur lokaler** Browser-Testspielstand.

## Mission 1 – Der Weg zum Berg

- Drei Spieler spielen abwechselnd an **einem Gerät**.
- Fünf Spielfiguren pro Spieler am Anfang.
- Einmaliger garantierter Verlust je Spieler; Zuteilung von Einsturz, Entführung und Eisfluch erfolgt zufällig.
- Erst nach dem zweiten eigenen gültigen Zug wird ein Verlust auf einer tatsächlich aktiven Wegfigur ausgelöst; weitere Kampagnenverluste gibt es in dieser Mission nicht.
- Die vier verbleibenden Figuren jedes Spielers müssen die eigenen Zielfelder erreichen.
- Normale Zugkarten im Testmodus: 1/11, 2, 3, 4 (rückwärts möglich), 5, 6, 7 als Tausch, 8, 9, 10, 12, 13 und Joker. Startkarten 1/11 und 13.
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

Die Regel-Engine wurde mit 300 fest vorgegebenen Seeds unter simulierten, legalen Kartenaktionen getestet. Alle 300 Versuche endeten mit genau einem Verlust und vier geretteten Figuren pro Spieler. Ein Browser-End-to-End-Test sowie synchronisierte Mehrgeräte-Tests stehen noch aus.
