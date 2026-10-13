# SKYJO Comic – Integrationsprüfung (13.10.2026)

## Geprüfte vorhandene Implementierung
- Client: `Skyjo/skyjo_action.html` (bestehende Engine, nicht verändern)
- Client: `Skyjo/skyjo_start.js` (Hub-Vorraum)
- Client: `Skyjo/skyjo_comic_adapter.mjs`, `skyjo_comic_snapshot_view.mjs`
- Server: `skyjo-hub-policy.js`

## Wichtige Ergebnisse
1. Die bestehende Engine nutzt `skyjo-room-v2` / Version 2. Die eigene Spielerposition wird über `cloud.doc.lobby.players.findIndex(p => p.id === cloud.deviceId)` ermittelt.
2. Die Engine besitzt bereits eine Brettauswahl: `standard`, `comic`, `christlich`. Die bisherige `comic`-Auswahl ist ein Theme, nicht die neue eigenständige 3–5-Spieler-Brettoberfläche. Beide dürfen nicht gleichgesetzt werden.
3. Der zentrale Spielvorraum verwendet separat `classic` und `illustrated` für `boardTheme`. Die unterschiedlichen Bezeichner müssen vor der Freigabe abgeglichen werden.
4. Die neue `skyjo_comic_snapshot_view.mjs` erwartet momentan `game.players[i].cards` oder `.board` mit 12 Einträgen. Ob die echte Engine diese Struktur liefert, ist noch NICHT verifiziert. Daher NICHT live einschalten.
5. Die Testansicht und CI-Prüfungen verwenden ausschließlich synthetische Testdaten. Sie beweisen keine Online-Spielbarkeit.
6. Servervalidierung prüft Sitzplätze, Host und Einstellungen. Clientseitige Schreiboperationen müssen weiterhin ausschließlich über die bestehende autorisierte Engine laufen.

## Sichere nächste Umsetzungsschritte
- A. Tatsächliches Kartenmodell und den Renderpfad in `skyjo_action.html` dokumentieren (inkl. verdeckter Karten, Jokern, entfernten Spalten).
- B. Echten Snapshot durch eine rein lesende Projektionsfunktion in ein neutrales UI-Modell transformieren. Keine zweite Engine.
- C. Neue Brettansicht zunächst nur als zuschaltbare Anzeige, nicht als Ersatz, integrieren.
- D. Vorhandene Aktionshandler der Engine für Ziehen, Ablegen, Tauschen und Spezialeffekte wiederverwenden. Keine direkten Datenbank-Schreibzugriffe im neuen UI.
- E. Bei 3/4/5 Spielern und jeder Spielerposition prüfen: Karten, Runde, Zugrecht, Sichtbarkeit und Punkte.
- F. Mehrgeräte-Test und Reconnect durchführen; erst danach die Auswahl im Hub freigeben.

## Sicherheitsentscheidung
Die bestehende `skyjo_action.html`, die Lobby und den Server in dieser Phase nicht überschreiben. Kein unbelegter 'fertig'-Status.
