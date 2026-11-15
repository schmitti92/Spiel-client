# DOG Weihnachts-Event – Rubbellose: verbindlicher Arbeitsplan v2
Stand: 15.11.2026. Status: PLAN GESICHERT, Umsetzung ausstehend.
Dieses Dokument ist die Arbeitsgrundlage; Änderungen nur bewusst dokumentieren.

## Fixierte Regeln
- 3 Klassen: Einfach 200, Mittel 500, Premium 1000 Eventmünzen.
- Münztreffer je Gewinn: Einfach 1–100, Mittel 1–800, Premium 1–2000.
- 20 % vollständige Nieten; 80 % Lose mit mindestens einem Gewinn, für jede Klasse.
- Münzen sind die häufigste Gewinnart. Mehrere Münztreffer auf einem Los sind möglich.
- ×2-Ereignis 11 % aller Lose; Hauptgewinn-×2 0,1 % aller Lose und **innerhalb** der 11 %.
- Zwei unterschiedliche Hauptgewinne auf einem Los: 0,1 % aller Lose.
- Hauptgewinn = freischaltbarer Gegenstand, nicht Münztreffer. Keine Doppelvergabe einmaliger Entitlements.
- Seltene Ereignisse können sich überlappen; exakte Interaktion und Auszahlungsregel vor Implementierung als Phase-1-Entscheidung dokumentieren.
- Alle Gewinnchancen gelten **pro vollständigem Los**, nicht pro Rubbelzelle.
- Freigeschaltete Baumstufen-Belohnungen bleiben exklusiv und sind nicht im Rubbellos-Pool.

## Bestätigte Gewichtung (15.11.2026)

| Kategorie / Sonderereignis | Einfach | Mittel | Premium |
|---|---:|---:|---:|
| Preis | 200 | 500 | 1000 |
| Niete | 20 % | 20 % | 20 % |
| Münz-Hauptkategorie | 68,9 % | 77 % | 76 % |
| Freischaltungs-Hauptkategorie | 11,1 % | 3 % | 4 % |
| **Summe Hauptkategorien** | **100 %** | **100 %** | **100 %** |
| ×2 (pro Los) | 11 % | 11 % | 11 % |
| ×2 auf Hauptgewinn (pro Los; innerhalb der 11 %) | 0,1 % | 0,1 % | 0,1 % |
| Zwei Hauptgewinne (pro Los) | 0,1 % | 0,1 % | 0,1 % |
| Zusätzlicher Münztreffer (nur auf Gewinnlosen) | 30 % | 40 % | 50 % |
| Münzbetrag pro Treffer | 1–100 | 1–800 | 1–2000 |
| Hauptpreise im Freischaltpool | 63 | 12 | 21 |

**Mathematische Prüfung:** 20+68,9+11,1=100; 20+77+3=100; 20+76+4=100. Gewinnlosquote jeweils 80 %. Die zusätzlichen Münztreffer ergeben über **alle** Lose 0,8×30%=24 %, 0,8×40%=32 % bzw. 0,8×50%=40 %. Da ×2 keine Niete treffen darf, entsprechen 11 % aller Lose 13,75 % unter den Gewinnlosen. Die 0,1 % für Hauptgewinn-×2 sind in diesen 11 % enthalten; sie entsprechen bei Beschränkung auf reguläre Freischaltung 0,1/11,1≈0,901 %, 0,1/3≈3,333 % bzw. 0,1/4=2,5 % bedingt auf die jeweilige Freischaltungs-Hauptkategorie. Beide 0,1-%-Ereignisse sind Erwartungswerte von 1 je 1000 Losen, keine Garantie.

**Noch in Phase 1 festzulegen:** Wie die Sonderereignisse überlappen, ob zusätzliche Münztreffer auch bei Freischaltungen vorkommen, ob mehr als zwei Münztreffer möglich sind, Münzbetragsverteilung, Verhalten bei erschöpften Freischaltpools. Die Zielwahrscheinlichkeiten sind **noch nicht im Live-Spiel implementiert**.

## Varianten (Arbeitsentwurf; vor Implementierung formal spezifizieren)
1. Geschenkelinie: 3×3, 3 gleiche in horizontaler/vertikaler/diagonaler Reihe.
2. Schneeflocken-Bingo: 4×4, 4 gleiche in Reihe.
3. Sternensammler: 12 Felder, 4 gleiche irgendwo.
4. Wichtelpfad: 20 Felder, zusammenhängender Weg.
5. Rentierglück: 12 Felder, 3 gleiche; 4 gleiche Zusatzchance.
6. Zuckerstangen-Duell: 6 Felder, 3 Paare; jedes Paar möglicher Treffer.
7. Weihnachtsbaum-Los: 15 Felder, definierte Symbolsequenz.
8. Lebkuchen-Memory: 4×4, passende Paare.
9. Diamantenjagd: 3×3, 3 Diamanten, ggf. Joker/Wildcard.
10. Glocken-Jackpot: 4×5, 5 gleiche in Reihe oder Glockenmuster.
Die Varianten dürfen nicht unbeabsichtigt die globalen Gewinnchancen verändern. Ergebnis serverseitig ziehen, Spielfeld passend dazu generieren, anschließend unabhängig validieren.

## Phase 1 – Regelwerk und mathematische Gewichtung [ ]
- Hauptkategorien mathematisch geprüft (siehe Tabelle); noch offen: 1/2/3 Münztreffer und Verteilung der Münzbeträge.
- Exakte Semantik 11 % ×2 und 0,1 % Hauptgewinn-×2 sowie Überschneidung mit 0,1 % Doppel-Hauptgewinn klären.
- Festlegen: bei bereits vollständigen Sammlungen fairer Ersatzpreis, bei Einmal-Freischaltungen ×2.
- Prüfen: Gewinn-/Nietenwahrscheinlichkeit exakt 80/20 trotz ausverkaufter Pools.
Abnahme: Wahrscheinlichkeitsmatrix und Testfälle schriftlich freigegeben.

## Verbindliche Sichtbarkeitsregel (bestätigt am 15.11.2026)
- **Kein unsichtbarer Gewinn:** Jede ausgezahlte Belohnung muss durch die aufgerubbelten Symbole und die Regel der gewählten Variante eindeutig belegbar sein.
- **Keine falschen Gewinne:** Eine Niete darf unter keiner erlaubten Auswertung eine gültige Gewinnkombination enthalten.
- Jeder einzelne Münztreffer und jeder Hauptpreis benötigt eine eigene klar erkennbare Gewinnkombination; bei mehreren Treffern müssen mehrere Kombinationen sichtbar sein.
- ×2 muss sichtbar und eindeutig einem gültigen Treffer zugeordnet sein. Es darf auf Nieten keinen Bonus auslösen.
- Gewinnkombinationen tragen ihre konkreten Beträge/Preise; der Endbildschirm markiert genau die geprüften Felder.
- **Technische Abnahme:** Für jede der 10 Varianten Generator und davon unabhängigen Regelprüfer bauen; generierte Ergebnisse vor Auszahlung serverseitig gegenprüfen. Keine Belohnung allein aus einer Anzeige oder einem clientseitigen Zufallswurf ableiten.
- Serverseitiges Losergebnis und Spielfeld zusammen atomar persistieren, damit Neuladen/Verbindungsabbruch keine andere Karte erzeugt.

## Phase 2 – Spielvarianten und Generator [IN ARBEIT]
- [x] Basisgenerator und unabhängiger Regelprüfer für Geschenkelinie (3×3) und Schneeflocken-Bingo (4×4), derzeit exakt 0 oder 1 Gewinnreihe. Backend: `serverfinal/dog/christmas-scratch-grid.js`.
- [x] 2.000 generierte Testfelder (je 500 Nieten und 500 Gewinnfelder pro Variante) erfolgreich validiert.
- [ ] Jedes Los als Datenstruktur mit variantId, Feldlayout, Symbolen, Gewinnkombinationen und sichtbarer Anleitung.
- Generator erzeugt Nieten ohne gültige Kombination; Gewinne mit exakt zugeordneten Treffern.
- 6/9/12/15/16/20 Felder auf Mobilgeräten gut bedienbar.
Abnahme: automatische Validierung aller 10 Varianten, auch 2–3 Gewinnkombinationen.

## Phase 3 – Serverseitige Auszahlung [ ]
- Bestehende Render-Implementierung dog/christmas-scratch.js und API-Routen zuerst prüfen.
- Sichere, atomare Käufe, einmalige commandId, Wiederholung idempotent.
- Neue Ergebnisstruktur für mehrere Münztreffer, seltene Hauptgewinne, ×2, Nieten und variantId.
- Gewinn sofort dauerhaft speichern; Firebase nicht pro Rubbelbewegung schreiben.
- Reconnect/Reload: nicht fertig aufgedecktes Los erneut anzeigen.
Abnahme: Unit-/Integrationstests für Guthaben, Duplikate, Entitlements, Auth, Parallelkäufe.

## Phase 4 – Grafiken [ ]
- Erst Layouts/Hitboxen finalisieren, dann 10 einzelne, hochwertige Hintergrundbilder generieren.
- Gemeinsame Assets: Symbole, Silber-Rubbeltextur, Gewinnleuchten, 3 Klassenrahmen.
- Bilder ohne fest eingebrannte Gewinnsymbole oder Beträge, da dynamisch.
- Assets in DOG-Verzeichnis des Frontend-Repos hochladen; Pfade dokumentieren.
Abnahme: alle 10 auf Desktop und Smartphone ohne Überdeckung.

## Phase 5 – Rubbeloberfläche [ ]
- Canvas/Pointer/Touch; Fortschritt, klare Anleitung, barrierearme Alternative zum Rubbeln.
- Mehrere Gewinne klar hervorheben, ×2 besonders inszenieren.
- Nieten freundlich, aber eindeutig anzeigen.
Abnahme: Touch, Maus, Vollbild, Reload, kleine Displays.

## Phase 6 – Integration [ ]
- 3 Losklassen im bestehenden Weihnachts-Event-Tab.
- Nur verifizierte, vom Server vergebene Freischaltungen im Sammlungssystem.
- Münzsaldo, Gewinnhistorie, tägliches Gratislos und Poolstatus.
Abnahme: durchgängiger Kauf→Rubbeln→Anzeige→Sammlung-Flow.

## Phase 7 – Wahrscheinlichkeitstests und Balance [ ]
- Deterministische Grenztests: 20 % Niete, 11 % ×2, 0,1 % Doppel-Hauptgewinn, 0,1 % Hauptgewinn-×2.
- Simulation von mindestens 1 Million Losen pro Klasse; Konfidenzbereiche statt exakter Simulationsquote.
- Fairness, erwartete Münzauszahlung, langfristige Münzquellen und Poolerschöpfung prüfen.
Abnahme: Testbericht mit erwarteten und beobachteten Werten.

## Phase 8 – Rollout [ ]
- Code-Review, Backend-Deploy auf Render, Frontend-Deploy auf GitHub Pages.
- Kleine Testgruppe, Serverlogs, Fehlerraten, keine unnötigen Firestore-Writes.
- Freigabe erst nach bestandenem End-to-End-Test; Rückfallplan.
Abnahme: echte Spielrunde über mehrere Geräte.

## Statusprotokoll
- 15.11.2026: Plan v1 erstellt und im Frontend-Repository hinterlegt. Keine Spielmechanik durch dieses Dokument geändert.
- 15.11.2026: Plan v2 – bestätigte Gewichtungen ergänzt und rechnerisch geprüft. Spielcode unverändert.
- 15.11.2026: Sichtbarkeitsregel und Pflicht zu Generator + unabhängiger Regelprüfung für alle zehn Varianten verbindlich ergänzt. Umsetzung noch ausstehend.
- 15.11.2026: Phase 2 begonnen. Backend-Grundmodul für 3×3 und 4×4 implementiert, 2.000 Generator-/Prüfungen bestanden. Noch nicht an Shop oder Auszahlung angebunden.
- Nächster Schritt: Mehrere eindeutig zuordenbare Gewinnkombinationen, anschließend die acht übrigen Varianten und Integration.
