# MiniGame Engine V2 – neues Spiel integrieren

Die Engine verwaltet nur Teilnehmer, Start, Aktionen, Zustand, Bots, Ergebnis und Neustart. Regeln, Runden, Zeitfortschritt, Teams, Gewinner und Wertungen gehören zum jeweiligen Spiel. Keine eigenen Räume, Netzwerkverbindungen, Online-IDs oder Speicherung im Spiel.

## Spieldefinition

Ein Spiel stellt diese Funktionen bereit:

- `id`: eindeutige Kennung (kleine Buchstaben, Zahlen und Bindestriche).
- `initialState(players, options)`: neuen, unabhängig verwendbaren Spielzustand erstellen.
- `applyAction(state, {playerId, action, players})`: Spielaktion prüfen und nächsten Zustand liefern. Bei ungültigen Aktionen Fehler werfen.
- `getResult(state)`: `null` während des Spiels, sonst ein gültiges Endergebnis.
- `botAction(state, playerId, players)`: nächste Aktion für einen Computerteilnehmer liefern.

Optional: `minPlayers`, `maxPlayers` (innerhalb 1–4), `capabilities` (`rounds`, `timed`, `simultaneous`), `roundCount`, `timeLimitMs`, `scoreDirection`. Diese Angaben sind Metadaten, keine durch die Engine erzwungenen Spielregeln. Die Engine startet weder eigene Timer noch wertet sie Punkte aus.

## Ergebnisse

- V1 (Standard, wenn `resultVersion` fehlt): `{finished:true, results:[{playerId,score}, ...]}`. Für jeden Teilnehmer eine endliche numerische Punktzahl.
- V2: `{resultVersion:2,finished:true,results:[{playerId,outcome:'complete'}, ...]}`. `score` ist optional; falls vorhanden, muss er eine endliche Zahl sein. Spieldefinierte Zusatzdaten bleiben erhalten.
- Jedes Ergebnis enthält genau einen Eintrag je Teilnehmer. Die Engine berechnet weder Sieger noch Rangfolgen.

## Registrierung und Start

```js
import {createGameRegistry} from './engine/GameRegistry.js';
import {createGameLauncher} from './engine/GameLauncher.js';

const registry = createGameRegistry([myGame]);
const launcher = createGameLauncher(registry);
const session = launcher.create(myGame.id, [
  {id:'player-1',type:'human'},
  {id:'bot-1',type:'bot'}
], {difficulty:'easy'});

session.start();
session.dispatch('player-1',{type:'move'});
session.botTurn('bot-1');
const snapshot = session.snapshot();
// session.restart() ist nach Spielende möglich.
```

Spielmodule verwenden die vom gemeinsamen System gelieferten Spieler-IDs. `MinispieleV2/games.js` bleibt bis zur ausdrücklichen Freigabe leer. Erst lokal testen, danach Partybrettspiel, Online-Multiplayer zuletzt.

## Vor Integration prüfen

`node --test MinispieleV2/tests/*.test.mjs`

Neue Spielregeln zusätzlich mit individuellen Regeltests absichern. Keine Anpassungen am gemeinsamen Engine-Kern für einzelne Spielmechaniken; falls eine neue Schnittstelle unvermeidbar ist, zuerst Vertrag und Rückwärtskompatibilität prüfen.
