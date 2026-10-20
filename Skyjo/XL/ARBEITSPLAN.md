# SKYJO XL – Arbeitsplan und Prüfprotokoll

Stand: 20.10.2026

## Ziel
Eigenständige 4×5-Variante mit genau 20 Karten pro Spieler, drei authentifizierten Online-Spielern im gemeinsamen SKYJO-Hub, gleiche Zug- und Wertungsregeln wie SKYJO Action ohne neue Spezialkarten. Klassisches 3×4 bleibt unverändert.

## Abhängigkeiten / Schritte
1. [x] Bestandsanalyse: Lobby-Einstellung wird im Hub gespeichert; bisherige Online-Engine verteilt fest 12 Karten.
2. [x] Host-Auswahl in SKYJO-Lobby und Validierung im Hub (layoutMode classic/xl).
3. [ ] Spielengine: 20 Karten ausgeben, beim Neustart beibehalten, State und Revisionen synchronisieren.
4. [ ] Trefferlogik: 4×5-Layout mit vollständigen Vierer-Spalten; Straßen, Joker, Reihen und Bonuswerte auf XL abstimmen.
5. [ ] Darstellung: Hauptspieler 20 sichtbare Slots, beide Gegner jeweils 20 sichtbare Slots; Querformat und Vollbild; Referenzbild als Gestaltungsziel.
6. [ ] Online-Hub: Spielstart mit settings.layoutMode=xl sicher auf dieselbe Engine routen; Einstellungen serverseitig autorisieren; niemals lokale XL-Prototypen als Online-Match ausgeben.
7. [ ] Regelgleichheit: Ziehen, Ablage, Austausch, Freilegen, Spielende, letzte Runde, Punkte, Auflösung, KI und Reconnect.
8. [ ] Tests: 3 Geräte/Spieler, 20 Slots je Spieler, 4 gleiche in Spalte, Spielende, gleichzeitige Aktionen, Refresh/Reconnect, Regression klassisch.
9. [ ] Live-Freigabe: Erst nach grünen Tests; keine vorzeitige Umleitung in unvollständiges Online-Spiel.

## Analyse
- SKYJO-Frontend besteht aus 35 Logic-Teilen und 12 CSS-Teilen; monolithische Änderung riskant.
- Bestehende Engine enthält mehrere feste 12er- und 3×4-Annahmen, u.a. in Teil 10 (Austeilen), Teil 13 (Matchsuche), Teil 17 (Scoreboard) und Teil 23 (KI).
- Bestehende Spielzustände werden über /skyjo/:code/state persistiert und auf dem Server für Hub-Teilnehmer geprüft.
- XL-Prototyp in Skyjo/XL ist aktuell lokal und erfüllt keine 3-Geräte-Online-Anforderung.

## Qualitätsregel
Klassische SKYJO-Version nicht beschädigen. Keine irreführende Live-Freigabe ohne vollständige Online-Engine und Prüfung.

## Fortschritt 20.10.2026 – weiterer Durchgang
- [x] Eigenständiges Geometriemodul `Skyjo/skyjo_layouts.js` hinzugefügt: 3×4/4×5, vollständige Reihen- und Spaltenindizes, Erkennung von vier gleichen aufgedeckten Karten in XL-Spalten.
- [x] Regressionstests in `tests/skyjo-xl-layout.test.cjs` erstellt (noch nicht in CI ausgeführt).
- [ ] Bestehende SKYJO-Online-Engine verwendet das Modul noch nicht. Live-XL bleibt gesperrt, bis Austeilen, Darstellung, Auflösung und Rundenwertung auf dieselbe Layoutkonfiguration umgestellt sind.

## Fortschritt – Bereinigung XL-Prototyp
- [x] Nicht implementierten Spezialkarten-Schalter aus der lokalen XL-Oberfläche entfernt.
- [x] Kartenstapel der lokalen XL-Version nach Zahlenwerten getrennt gewichtet (−2: 5, 0: 15, sonst 10 je Wert).
- [ ] Vor Online-Freigabe: bestehende 35-teilige SKYJO-Engine vollständig layoutfähig machen; nicht durch lokalen Prototyp ersetzen.
