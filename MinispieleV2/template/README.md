# Vorlage für jedes neue Minispiel (MiniGame Engine V2)

1. `template/example-game.js` nach `games/mein-spiel.js` kopieren.
2. `id` eindeutig setzen; `minPlayers`/`maxPlayers` (1–4) und optionale Fähigkeiten angeben.
3. **Nur Spielregeln** implementieren: `initialState`, `applyAction`, `getResult`, `botAction`.
4. Spielregeln mit eigenen Tests absichern; alle Engine-Vertragstests ausführen.
5. Spiel in der **gemeinsamen** Registry registrieren. `games.js` wird erst bei ausdrücklicher Freigabe für die Integration geändert.
6. Darstellung in einem separaten UI-Modul implementieren: aus `flow.snapshot()` rendern, Aktionen über `flow.dispatch(playerId,action)` senden; Bots über `flow.botTurn(botId)`. Keine Regelberechnung im UI.
7. Zeitabhängige Spiele erhalten Zeitinformationen über explizite, validierte Spielaktionen aus dem gemeinsamen Host. Die Engine startet keine Timer.
8. Erst offline prüfen, anschließend Partybrettspiel und Online-Integration über die vorhandene gemeinsame Lobby.

## Was die Engine übernimmt
- Spieler (menschlich/Bot), Start und Neustart, Spielzustand und Revision
- Validierung der Ergebnisse, Übergabe an die gemeinsame Gesamtwertung
- Gemeinsamer Spielablauf und Raumreferenz über `LobbyGameBridge`

## Was das Spiel selbst übernimmt
- Eigene Mechanik, Punkte, Endbedingung, Bot-Strategie und Anzeige
- Regeltests und spieltypische Eingabevalidierung

**Verboten in einem Spielmodul:** eigene Raumverwaltung, WebSocket/Firebase-Verbindungen, Online-Spieleridentitäten, Speicherung und DOM-Zugriffe.

Testbefehl: `node --test MinispieleV2/tests/*.test.mjs`

Die Beispielregeln sind nur eine technische Vorlage, kein echtes Minispiel. Eine Kopie wird nicht automatisch veröffentlicht oder online freigeschaltet.
