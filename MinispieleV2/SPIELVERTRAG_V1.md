# Minispiele V2 – Spielvertrag (Phase 1)

Status: Vertragsdefinition; keine Freigabe eines Spiels. Gilt für alle neuen Minispiele.

## Entwicklungsweg
1. Ein Minispiel wird zuerst als **eine eigenständig offline spielbare HTML-Datei** entwickelt. Keine Firebase-, Render-, Raum- oder Profilabhängigkeit.
2. Die Spiellogik ist auch in dieser Datei eine isolierte Einheit: keine DOM-, Netzwerk- oder Speicherzugriffe in den Regel-Funktionen.
3. Die Offline-Datei darf eine einfache lokale Ergebnisanzeige haben. Bei der Integration wird diese **durch die gemeinsame Siegerehrung ersetzt**; die Wertung bleibt identisch.
4. Bei der Integration werden Regelkern und Darstellung als GameCatalog-kompatible Module bereitgestellt. Die Engine steuert Spielstart, Aktionen, Bots, Ergebnis und Neustart. Eine beliebige HTML-Datei wird nicht ungeprüft automatisch onlinefähig.
5. Zunächst offline testen, dann Partybrettspiel, zuletzt Online-Multiplayer. V1 bleibt unverändert.

## Bestehende Regelmodul-Schnittstelle (Engine CONTRACT_VERSION = 1)
```js
export const id = 'spiel-id';
export function initialState(players, options) { /* serialisierbarer Zustand */ }
export function applyAction(state, {playerId, action, players}) { /* neuer Zustand */ }
export function getResult(state) { /* null während des Spiels, Ergebnis bei Ende */ }
export function botAction(state, playerId, players) { /* normale Spielaktion */ }
```
- Spieler: 1–4, eindeutige `id`, `type: 'human' | 'bot'`.
- Alle Teilnehmer durchlaufen dieselben Regeln und Validierungen.
- Regel-Funktionen dürfen keine DOM-, Netzwerk-, Storage- oder Raumzugriffe ausführen.
- `applyAction` verarbeitet eine Aktion und liefert den nächsten Zustand; ungültige Aktionen werden abgewiesen.
- `botAction` liefert eine normale Aktion, die durch `applyAction` verarbeitet wird.
- Die Engine bietet `createSession(game, players, options)` mit `snapshot()`, `dispatch(playerId, action)`, `botTurn(playerId)` und `restart()`.
- Der aktuelle GameHost erwartet getrennte `game.js`- und `view.js`-Module; die Offline-HTML-Datei ist die Entwicklungsvorlage, nicht das endgültige Integrationsformat.

## Einheitliches Ergebnisformat (Ziel für Phase 4)
```js
{
  finished: true,
  results: [
    { playerId: 'p1', score: 100 },
    { playerId: 'p2', score: 70 }
  ]
}
```
- `getResult(state)` liefert `null`, solange das Spiel läuft.
- Bei Spielende liefert es `finished: true` und genau einen Eintrag je Teilnehmer mit eindeutiger `playerId` und endlicher numerischer `score`.
- Standardwertung: höhere Punktzahl ist besser; abweichende Wertungsrichtung muss explizit als Spieloption/Metadatum festgelegt und getestet werden.
- Gleichstände erhalten denselben Rang. Der gemeinsame ResultManager sortiert, vergibt Ränge und stellt die zentrale Siegerehrung dar; er ändert niemals Spielpunkte.
- Das ist der **geplante Zielvertrag**; die bestehende Engine validiert dieses Ergebnisformat noch nicht. Validierung und Migration erfolgen testgestützt in Phase 1/4.

## Zuständigkeiten
- **Spiel:** Regeln, Aktionen, Bot-Entscheidungen, Punkte, Spielende, grafische Darstellung.
- **Gemeinsame Engine/Host:** Teilnehmerübergabe, Zustandswechsel, Start, Bot-Ausführung, Neustart, Ergebnisannahme.
- **Zentrale Lobby/Render-Hub:** Raumcode, Identität, Host, Bereitstatus, Online-Synchronisation. Keine spielindividuellen Räume oder WebSockets.
- **Zentrale Siegerehrung:** Rangliste, Medaillen, Gleichstand, Nochmal spielen, Zur Lobby.

## Abnahme vor Phase 2
- Bestehende Engine- und Katalogtests müssen erfolgreich laufen.
- Zusätzliche Vertragstests prüfen 1–4 Teilnehmer, Bot-Aktionen, Ergebnisformat, Gleichstand und Unabhängigkeit der Regeln.
- Keine Aktivierung von Spielen im V2-Katalog vor Freigabe des Grundgerüsts.
