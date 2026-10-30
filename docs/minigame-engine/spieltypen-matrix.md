# MiniGame Engine — Spieltypen- und Anforderungsmatrix (31.10.2026)

## Ziel
Die gemeinsame Engine wird **nicht** anhand eines einzigen Spiels optimiert. Zeitgefühl ist lediglich ein Testfall. Alle Spiele nutzen dieselben Kernverträge für Teilnehmer (1–4, explizit gewählte Bots), Start, Aktionen, Zustand, Bot-Entscheidungen, Ergebnis und Neustart. Keine eigene Raumverwaltung, Verbindung oder Online-Identität. Reihenfolge: Offline → Partybrettspiel → Online.

## Vergleich der vorhandenen Spiele
Die Zuordnung ist eine Architekturklassifikation, keine Behauptung, dass die vorhandenen HTML-Dateien bereits auf die Engine migriert sind.

| Spiel | Typ | Engine muss bereitstellen | Spielmodul bleibt zuständig |
| --- | --- | --- | --- |
| Zeitgefühl | Zeitmessung | logische Uhr, Aktionen, Timeout, Ergebnisse | Zielzeit, Abweichung, Gleichstand |
| Recheninsel Piraten | rundenbasierte Quizlogik | Runde, Aktionen, Seed, Ergebnis | Aufgaben, Antwortprüfung, Schwierigkeitsgrad |
| Snake Arena | kontinuierliche Raster-Simulation | feste Ticks, Eingabeaktionen, Zustandsübergänge | Richtung, Wachstum, Kollision, Nahrung |
| Bomber Strand Arena | Echtzeit-Arena | Ticks, gleichzeitige Eingaben, Ereignisse | Bomben, Explosionen, Reichweite, Power-ups |
| Lava Arena | Echtzeit-Bewegung | Ticks, Aktionen, Ergebnisse | Sprung- und Kollisionsregeln |
| Flusssprung | Raster- und Rundenlogik | Aktionen, Zufall, Timer | sichere Steine, Sturz, Fortschritt |
| Maulwurf Arena | simultane Reaktion | Uhr, gleichzeitige Aktionen, Ergebnis | Trefferfenster, Maulwurfpositionen |
| Hütchen Challenge | Beobachtung und Auswahl | Phasen, Seed, Aktionen | Mischfolge, Ballposition, Runden |
| Preisjäger | Fragen und Schätzungen | Runden, Aktionen, Punkte | Produkte, Preisbewertung |
| Dosenwerfen | Physik | deterministische Eingaben, Ticks, Ergebnis | Wurfphysik, Dosen-Kollisionen |
| Zielring | Physik / Geschicklichkeit | Ticks, Aktionen, Ergebnis | Ballposition, Balken, Ringwertung |
| Eisstock Duell | Physik / Zielspiel | Züge, Aktionen, Ergebnis | Reibung, Kollision, Abstände |

## Vier unabhängige Architektur-Proben (ohne UI)
1. **Rundenfixture (Recheninsel):** mehrere Fragen/Runden, gültige und doppelte Antworten, Botantworten, Ergebnis.
2. **Rasterfixture (Snake):** feste Tickfolge, Richtungswechsel, Kollision, deterministischer Neustart.
3. **Arena-Fixture (Bomber):** mehrere Aktionen zum selben Tick, zeitgesteuerte Explosionen, Reihenfolge und Konfliktauflösung.
4. **Zeitfixture (Zeitgefühl):** Countdown, Bot-Stopp, Timeout, Zeitsprung.

## Verbindliche Trennung
- **Engine:** Teilnehmer, Lifecycle, Revision/Epoche, Aktionen, logische Zeit, reproduzierbarer Zufall, Bot-Vertrag, Ergebnisse.
- **Spielmodul:** Regeln, Kollisionen, Physik, Runden-/Phasenlogik, Wertung.
- **Oberfläche:** Eingaben, Darstellung, Animation, Sound; kein autoritativer Regelzustand.
- **Host-Adapter:** Uhr-/Tick-Antrieb, später Transport/Speicherung; keine spielindividuellen Netzwerkclients.

## Aktuell noch offene Engine-Verträge
- Allgemeiner **fixed-step tick** für Echtzeitspiele mit festgelegter Ereignisreihenfolge und Obergrenze.
- Einheitlicher Ereignisvertrag: geplante Aktionen und Timeout ohne zwei konkurrierende Wege.
- Atomarer Zeitfortschritt: bei Fehlern keine halbfertigen Zustandsänderungen.
- Monotone logische Uhr auch ohne fälliges Ereignis.
- Actor-/Epoch-/Revisionsvalidierung durch den gemeinsamen Host, insbesondere vor Online-Freigabe.
- Gleichzeitige Aktionen: stabile Reihenfolge und dokumentierte Konfliktregeln.
- Generische Tests für 1–4 Menschen/Bots und Neustart für **alle vier** Fixtures.

## Abnahmekriterium
**Keine allgemeine Engine-Freigabe allein aufgrund grüner Zeitgefühl-Tests.** Alle vier unabhängigen Fixtures und gemeinsame Vertragstests müssen bestehen. Vor Änderungen an produktiven Spielen zuerst bestehende Regeln durch Regressionstests absichern.
