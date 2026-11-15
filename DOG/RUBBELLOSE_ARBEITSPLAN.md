# DOG Weihnachts-Event – Rubbellose: verbindlicher Arbeitsplan v5
Stand: 15.11.2026. Status: IN UMSETZUNG. Gewinnlogik, Varianten und funktionale Rubbeloberfläche ins Repository integriert; Artwork und echter Mehrspieler-Endtest noch offen.
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

**Technisch festgelegt (15.11.2026):** Die Hauptkategorien werden pro Los mit 1000 gleichgewichteten Positionen gezogen. Zwei-Hauptgewinne und Hauptgewinn-×2 sind bei ausreichendem unbesessenem Pool zwei unterschiedliche seltene Ereignisse innerhalb der Freischaltungskategorie (je 0,1 % aller Lose) und schließen sich gegenseitig aus. 11 % ×2 bestehen aus 10,9 % normalem Münz-×2 plus 0,1 % Hauptgewinn-×2. Normales ×2 auf Freischaltungs-Losen gibt einen klar sichtbaren zusätzlichen Münztreffer, auf den ×2 angewendet wird. Der Extra-Münztreffer wird mit 30/40/50 % unter Gewinnlosen gezogen; falls Platz ist, können bei 20 % dieser Treffer zwei zusätzliche Münzgewinne erscheinen. Maximal drei sichtbare Gewinnkombinationen pro Los. Sind weniger als zwei freischaltbare, noch nicht besessene Hauptpreise vorhanden, können die 0,1-%-Sonderereignisse nicht mehr als zwei neue einzigartige Hauptgewinne ausgezahlt werden; ausverkaufte reguläre Freischaltungen werden zu Münzgewinnen. **Die 20-%-Nietenquote bleibt trotzdem erhalten.** Beträge innerhalb der gewählten Spanne sind gleichverteilt. Diese Auslegung ist technische Implementierung der bestätigten Hauptquoten; späteres Fine-Tuning gesondert dokumentieren.

## Varianten (Arbeitsentwurf; vor Implementierung formal spezifizieren)
1. Geschenkelinie: 3×3, 3 gleiche in horizontaler/vertikaler/diagonaler Reihe.
2. Schneeflocken-Bingo: 4×4, 4 gleiche in Reihe.
3. Sternensammler: 12 Felder, 4 gleiche **Sterne** beliebig auf dem Feld; pro vollständiger Vierergruppe ein Treffer.
4. Wichtelpfad: 20 Felder, zusammenhängender Weg.
5. Rentierglück: 12 Felder, 3 gleiche Rentiere beliebig auf dem Feld; pro vollständiger Dreiergruppe ein Treffer. Ein eigenständiger Vierer-Bonus ist NICHT implementiert und vor Einführung separat zu gewichten.
6. Zuckerstangen-Duell: 6 Felder, 3 Paare; jedes Paar möglicher Treffer.
7. Weihnachtsbaum-Los: 15 Felder (5×3); jede waagerechte ⭐🎄🎁-Folge zählt.
8. Lebkuchen-Memory: 4×4; jede 2×2-Gruppe mit zwei passenden waagerechten Paaren zählt.
9. Diamantenjagd: 3×3, 3 Diamanten, ggf. Joker/Wildcard.
10. Glocken-Jackpot: 4×5, 5 gleiche in waagerechter Reihe oder fünf Glocken auf den festen Diamant-Feldern 2/6/8/11/13 (0-basiert).
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

## Phase 2 – Spielvarianten und Generator [GRUNDLOGIK FERTIG; ENDTETST OFFEN]
- [x] Für **alle 10 Varianten** Generatoren und unabhängige Regelprüfer implementiert: `serverfinal/dog/christmas-scratch-grid.js`.
- [x] Pro Variante **0, 1, 2 oder 3** sichtbare, tatsächlich regelkonforme Gewinnkombinationen erzeugen; Nieten ohne gültige Gewinnkombination.
- [x] Preis-Zuordnung je geprüfter Gewinnkombination vorbereitet (`attachScratchPrizes`); eine manipulierte Feldzuordnung wird erkannt (`verifyScratchPrizes`).
- [x] Erste 10.000 Felder (10 Varianten × 4 Gewinnzahlen × 250 Durchläufe) mit Generator, Auswertung und Preisbindung erfolgreich getestet, zusätzlich ein eigener Testquelltext: `serverfinal/tests/christmas-scratch-grid.test.js`.
- [ ] Tests in der echten Node-Testumgebung bzw. CI ausführen und dokumentieren; Prüfung der tatsächlichen Gewinnvergabe erfolgt in Phase 3.
- [ ] Spieleranleitungen und Spielbilder in der tatsächlichen UI anzeigen; Ausgabe der Gewinnbeträge an den zugehörigen Symbolen.
- [ ] Zusätzliche Gewinnanzahl über 3 verhindern bzw. ausschließlich Varianten mit ausreichender Kapazität verwenden, bevor bestehende Echtgeld-/Eventmünzen-Auszahlung daran gebunden wird.
- Generator erzeugt Nieten ohne gültige Kombination; Gewinne mit exakt zugeordneten Treffern.
- 6/9/12/15/16/20 Felder auf Mobilgeräten gut bedienbar.
Abnahme: automatische Validierung aller 10 Varianten, auch 2–3 Gewinnkombinationen.

## Phase 3 – Serverseitige Auszahlung [INTEGRIERT; LIVE-ENDTEST OFFEN]
- [x] Render-Kauflogik `serverfinal/dog/christmas-scratch.js` und vorhandene authentifizierte API-Routen geprüft.
- [x] Atomare Firestore-Transaktion, Wiederholungen über commandId idempotent, auch bei Unterbrechung.
- [x] Neue Ergebnisstruktur inklusive alle Gewinnkombinationen, sichtbarem `board` und `variantId`, auch für Nieten und ×2.
- [x] Gewinn und validiertes Spielfeld im selben Transaktionsbeleg gespeichert; keine Datenbankwrites beim Freirubbeln.
- [x] `lastResult` wird serverseitig gespeichert; die Oberfläche bietet das noch nicht als gesehen markierte Los nach Neuladen erneut an (nur UI-Marker lokal, keine Berechtigungsprüfung damit).
Abnahme: Unit-/Integrationstests für Guthaben, Duplikate, Entitlements, Auth, Parallelkäufe.

## Phase 4 – Grafiken [KARTE 1/10 FERTIG VORBEREITET, UPLOAD AUSSTEHEND]
- [x] **Karte 1 „Geschenkelinie“** einzeln als hochwertiges Motiv (Rot/Gold, neun goldene Rubbelplätze) generiert.
- [x] Optimierte WebP-Datei erstellt: `geschenkelinie-01.webp`, **1086×1448 Pixel**, ca. 414 KB. Download aus der aktuellen Unterhaltung.
- [x] **Artwork-Feld-Ausrichtung im Frontend**: `christmas-event.html` enthält den neuen `scratch-card-art`-Wrapper; `christmas-scratch.css` positioniert das 3×3-Spielfeld auf den neun gedruckten goldenen Feldern.
- [x] Gewinn-Symbole werden weiterhin vom Render-Server generiert; das Motiv enthält keine festen Symbolkombinationen oder Münzbeträge.
- [x] Zur 3×3-Variante passende Gewinnregel sichtbar: drei gleiche Symbole waagerecht, senkrecht oder diagonal. 0–3 Gewinnreihen können gemäß Ergebnis entstehen.
- [ ] **Grafik in GitHub hochladen:** Repository `schmitti92/Spiel-client`, Pfad `DOG/assets/scratch/geschenkelinie-01.webp`.
- [ ] **Visuelle Abnahme nach Upload:** Die silbernen 3×3-Beschichtungen müssen die neun Goldflächen präzise abdecken (Desktop und Smartphone), 90-%-Automatik testen.
- [ ] Karten 2–10 nacheinander als eigene Motive gestalten, exportieren und integrieren.
- Gemeinsam genutzte Assets: Silbertextur, Emoji-Symbole, Gewinnleuchten, Qualitätsrahmen.
Abnahme: Bilddatei öffentlich verfügbar, alle neun Rubbelstellen ausgerichtet, Gewinnreihen sichtbar und 90-%-Aufdeckung auf Touch-Geräten erfolgreich überprüft.

## Phase 5 – Rubbeloberfläche [ECHTES FREIRUBBELN + 90-%-AUTOMATIK EINGEBAUT, HANDYTEST OFFEN]
- [x] Individuelle Canvas-Rubbelfelder (6–20 pro Los) mit Silbertextur, die unter Finger/Maus tatsächlich transparent wird.
- [x] Fortschritt wird aus dem **Alpha-Kanal der Rubbelbeschichtung** ermittelt (Abtastung pro Canvas), nicht aus Wischstrecke oder Anzahl von Tipps.
- [x] Ab **90 % der gesamten Beschichtungsfläche** gibt die UI automatisch alle restlichen Felder und Gewinnkombinationen frei; sichtbarer Prozentbalken.
- [x] Ab 90 % lokalem Rubbelanteil eines Felds verschwindet dessen Restbeschichtung; das zählt als aufgedeckte Fläche.
- [x] Sofort-Aufdecken für neue Lose ausgeblendet; für Tastaturbedienung einzelne Felder per Enter/Leertaste freigebbar; Altlostickets behalten Kompatibilitätsbutton.
- [ ] Auf Mobilgeräten prüfen, dass Touch/Pointer-Verhalten und tatsächliche 90-%-Schwelle sauber funktionieren.
- [x] Gewinnkombinationen werden nach Freirubbeln gold markiert und ihre Preise separat ausgewiesen; ×2 und seltenes Hauptgewinn-×2 gekennzeichnet.
- [x] Nieten werden nach dem Aufrubbeln ohne leuchtende Gewinnkombination und mit Nieten-Hinweis gezeigt.
Abnahme: Touch, Maus, Vollbild, Reload, kleine Displays.

## Phase 6 – Integration [CODE EINGEBAUT, BROWSERTEST OFFEN]
- [x] Drei Losklassen im bestehenden Weihnachts-Event-Tab mit aktueller Wahrscheinlichkeit und 10 zufälligen Spielvarianten.
- Nur verifizierte, vom Server vergebene Freischaltungen im Sammlungssystem.
- [x] Münzsaldo, aktueller letzter Losbeleg, tägliches Gratislos; [ ] vollständige Gewinnhistorie und Poolstatus sichtbar im UI.
Abnahme: durchgängiger Kauf→Rubbeln→Anzeige→Sammlung-Flow.

## Phase 7 – Wahrscheinlichkeitstests und Balance [ ]
- Deterministische Grenztests: 20 % Niete, 11 % ×2, 0,1 % Doppel-Hauptgewinn, 0,1 % Hauptgewinn-×2.
- [x] 12.000 unabhängige Testkäufe (4.000 je Klasse) mit passender Symbolprüfung in der Entwicklungsumgebung; [ ] 1 Million Losen je Klasse mit Konfidenzbereichen und produktionsnahem Testsystem.
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
- 15.11.2026: Alle zehn Generatoren/Regelprüfer für 0–3 Gewinnkombinationen ergänzt; 10.000 erzeugte Spielfelder in einer isolierten JS-Prüfung erfolgreich kontrolliert; Node-Testdatei eingecheckt. Noch kein Live-Gameplay.
- 15.11.2026: Phase 3: Gewinnlogik mit exakt gewichteten drei Hauptkategorien und Sonderregeln mit dem 10-Varianten-Generator verbunden; Spielfeld und Gewinn werden zusammen im Kaufbeleg gespeichert. 12.000 simulierte Testkäufe mit erfolgreichen Feld-Prüfungen; dauerhafter Node-Test in `serverfinal/tests/christmas-scratch-purchase.test.js` angelegt.
- 15.11.2026: Phase 5/6: 6–20 einzelne Rubbel-Felder, Anleitung, Gewinnreihe, Niete, ×2, Mehrfachgewinn und Reload-Wiederherstellung im Frontend eingecheckt. Render rollt Backend via AutoDeploy aus. Browser-Endtest und Artwork stehen noch aus.
- 15.11.2026: Echte Silberschicht-Erasure mit Pixel-Alpha-Messung, 90-%-Automatik und Prozentbalken im Frontend ergänzt. Statische Codeprüfung bestanden, Browser-/Touch-Praxistest steht aus.
- 15.11.2026: Karte 1 „Geschenkelinie“ einzeln als Bildkonzept generiert und als WebP exportiert; eigenes Rot/Gold-CSS bereits im Frontend. WebP-Asset muss noch vom Nutzer in `DOG/assets/scratch/geschenkelinie-01.webp` hochgeladen und danach eingebunden werden.
- 15.11.2026: Erstes Geschenkelinie-Finalbild exportiert und 3×3-Goldfelder im Frontend per separatem Artwork-Wrapper präzise positioniert. Cache-Version erhöht, restliche neun Varianten erhalten ihre generische Oberfläche. Image-Upload und Geräteprüfung bleiben offen.
- Nächster Schritt: WebP-Bild über GitHub nach `DOG/assets/scratch/geschenkelinie-01.webp` hochladen, 3×3-Felder auf Handy testen, dann Karte 2 entwickeln.
