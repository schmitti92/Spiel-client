# Zeitgefühl V6 – Bestandsregeln (vor Migration)

Quelle: `Minispiele/Zeitgefuehl_v6_Premium.html`. Diese Datei bleibt während der Vorbereitung unverändert.

## Beobachtete Regeln

- Eine Runde; Zielzeit wird als ganzzahlige Sekundenzahl von 10 bis einschließlich 20 gewählt.
- Nach einem Countdown startet die monotone Zeitmessung mit `performance.now()`.
- Die laufende Zeitanzeige wird nach 3000 ms ausgeblendet; die Messung läuft weiter.
- Jeder Teilnehmer darf während der laufenden Runde genau einmal stoppen.
- Nach 30000 ms werden noch offene Teilnehmer automatisch als Timeout gestoppt.
- Die Abweichung ist `abs(elapsedMs - targetMs)`; kleinere Abweichung gewinnt.
- Bei der Gewinnerkennzeichnung gilt ein Abstand von unter 5 ms zum besten Ergebnis als Gleichstand. Die Platzierungsberechnung vergleicht aufeinanderfolgende sortierte Abweichungen mit einer 5-ms-Grenze; diese Besonderheit muss separat getestet werden.
- Bots stoppen automatisch bei `max(3200, targetMs + noise)`, wobei `noise = (r1+r2+r3-1.5)*1700` und r1–r3 unabhängige Zufallswerte in [0,1) sind.
- Spielende, sobald alle Teilnehmer gestoppt haben.

## Vor der Migration zu klären

1. Ist die aktuelle Gleichstands-Platzierungslogik (Vergleich mit vorherigem Ergebnis) ausdrücklich gewünscht? Nicht stillschweigend verändern.
2. Bei 1 Spieler und reinen Bot-Gruppen: die neue Engine muss 1–4 Teilnehmer unterstützen; bestehende Oberfläche derzeit gesondert prüfen.
3. Browser- und Online-Zeitmessung nicht vermischen: Regelkern erhält Zeitwerte als Eingaben.
4. Ergebnisformat des Partybrettspiels gegen bestehende Ergebnisübertragung absichern.

## Pflicht-Regressionstests

- Zielwerte 10 und 20 Sekunden möglich; 9 und 21 ausgeschlossen.
- Uhr nach 3 Sekunden verborgen, Messung nicht angehalten.
- Stop vor Start, doppelte Stopps und Stop nach Spielende verändern Zustand nicht.
- Automatischer Timeout nach 30 Sekunden.
- Gewinner bei geringster absoluter Abweichung; Gleichstand unter 5 ms.
- 1, 2, 3, 4 Teilnehmer sowie Menschen/Bots gemischt.
- Bot-Aktionen benutzen denselben Stop-Mechanismus.
- Neustart ohne Übernahme des vorherigen Spielzustands.

## Migrationsregel

Erst Regressionstests für das bestehende Verhalten erstellen, dann neuen reinen Regelkern ergänzen. Die produktive HTML-Datei nicht ersetzen, bevor die Tests erfolgreich sind.
