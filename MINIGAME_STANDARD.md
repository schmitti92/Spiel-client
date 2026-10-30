# MiniGame Engine — Verbindlicher Standard (Entwurf 1.0)

## Spieler und Computergegner

**Entscheidung des Projektinhabers: Option B.**

- Jedes Minispiel unterstützt **1 bis 4 Teilnehmer insgesamt**.
- Teilnehmer können Menschen oder Bots sein, in beliebiger Mischung.
- **Bots werden niemals automatisch hinzugefügt.** Die Spieler-/Botanzahl wird ausdrücklich in der Spielkonfiguration festgelegt.
- Ein Spiel mit einem Menschen und null Bots ist zulässig.
- Die Engine darf die Teilnehmerliste nicht heimlich auffüllen.
- Spiele dürfen keine eigene Lobby, Raumverwaltung, Online-Identität oder Netzwerkverbindung erstellen.
- Diese Regel gilt für Offline-Minispiele und später für den gemeinsamen Online-Adapter.
- Spielindividuelle Mechaniken dürfen 1-Spieler-Partien nicht stillschweigend verbieten; falls ein Modus technisch nicht sinnvoll ist, muss die Ausnahme ausdrücklich entschieden werden.

## Einheitliche Schnittstellen

Jedes Spiel implementiert `id`, `createInitialState(context)`, `validateAction(state, action, context)`, `applyAction(state, action, context)`, `getBotAction(state, context)`, `isFinished(state)`, `getResult(state)`.

Der Runner stellt `startGame`, `dispatchAction`, `getState`, `restartGame`, `destroyGame` bereit. Spielregeln dürfen keine DOM-, Netzwerk- oder Persistenzzugriffe benötigen.

## Verbindliche Prüfungen

1. Genau 1, 2, 3 oder 4 konfigurierte Teilnehmer bleiben erhalten.
2. Keine Bots ohne ausdrückliche Konfiguration.
3. 1 Mensch / 0 Bots, 1 Mensch / 1 Bot, 2 Menschen / 2 Bots, 4 Menschen sowie reine Bot-Gruppen.
4. Mehr als 4 oder weniger als 1 Teilnehmer werden abgelehnt.
5. Ungültige Aktionen verändern den Spielzustand nicht.
6. Bestehende Spielregeln werden vor Migration durch Regressionstests abgesichert.

## Status

Der Standard ist hier dokumentiert. Die technische Durchsetzung erfolgt über die gemeinsamen Vertragstests. Bestehende produktive Minispiele werden erst nach erfolgreicher Migration auf den Standard umgestellt.
