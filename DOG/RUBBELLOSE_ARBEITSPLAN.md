# DOG Weihnachts-Event – Rubbellose: verbindlicher Arbeitsplan v12
Stand: 15.11.2026. Status: KORRIGIERTE KLASSEN: 2 Einfach (200) + 1 Mittel (500) + 1 Premium (1000). Die vier Varianten sind serverseitig klassengenau zugeordnet; das dritte Los ist ein ausschließlich mittleres Rubbellos, kein Premiumlos. Das dritte Motiv ist als SVG integriert und der Gewinnweg wird hervorgehoben. Das zweite Eis-Palast-WebP und das vierte Motiv bleiben offene Grafikaufgaben.
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

## Verbindliche Aufteilung: vier Rubbellose (2 Einfach + 1 Mittel + 1 Premium)

Nutzerentscheidung vom 15.11.2026 (zuletzt korrigiert): **Insgesamt vier** Spielarten, davon
**zwei einfache, ein mittleres und ein Premium-Rubbellos**. Das bisherige erste Los
„Geschenkelinie“ bleibt erhalten. **Drei weitere Lose werden einzeln
gestaltet**; die vorherigen Ideen mit sechs oder zehn aktiv beworbenen
Spielarten werden nicht weiterverfolgt.

| Nr. | Klasse | Arbeitsname | Größe | Gewinnregel | Gestaltung | Zustand |
|---|---|---|---|---|---|---|
| 1 | Einfach (200) | 🎁 Geschenkelinie | 3×3 (9) | Drei gleiche Symbole horizontal, vertikal oder diagonal | Rot/Gold, Weihnachtsmarkt, Geschenkband | [x] Grafik hochgeladen, technisches Layout vorhanden; Praxistest offen |
| 2 | Einfach (200) | ❄️ Schneeflocken-Bingo (Sammellos) | 4×4 (16) | **Drei gleiche Gewinnsymbole irgendwo; pro Symboltyp ein Gewinn. 🧊 = Nietenfeld.** | Eisblau/Silber, Eispalast-Motiv | [x] Benutzerbild übernommen, WebP bereitgestellt, 4×4-CSS ausgerichtet, Serverprüfer aktiv; [ ] Upload und Mobil-Endtest |
| 3 | Mittel (500) | 🧝 Magischer Wichtelpfad | 4×5 (20) | Durchgehender Pfad gleicher Symbole vom linken zum rechten Spielfeldrand (nur waagerecht/senkrecht) | Tiefgrün/Türkis, magischer Weihnachtswald, leuchtender Weg | [x] Eigenes SVG, 20 Felder, CSS-Ausrichtung, glühender Gewinnweg; Browsertest offen |
| 4 | Premium (1000) | 🎄 Weihnachtsbaum-Geheimnis | 5×3 (15) | ⭐🎄🎁 in genau dieser Reihenfolge von links nach rechts | Violett/Gold, glanzvoller Sternenbaum und magisches Dorf | [ ] Neues Einzelmotiv + 5×3-Ausrichtung |

Dies sind **Gestaltungsvorschläge**, keine bereits vom Nutzer abgenommenen
Endnamen oder finalisierten neuen Bilder. Die bestehende Spiellogik
für `gifts`, `snow_collect`, `elf` und `tree` ist vorhanden und muss nur auf
die gewählten Klassen, individuelle Bildflächen und Gewinnanzeige
abgestimmt werden.

### Preis- und Gewinnklassen: Übergang bewusst absichern
- **Verbindliches Modell:** Einfach = 200 Goldmünzen (Geschenkelinie oder Schneeflocken-Bingo); Mittel = 500 Goldmünzen (ausschließlich Magischer Wichtelpfad); Premium = 1.000 Goldmünzen (ausschließlich Weihnachtsbaum-Geheimnis).
- **Keine Entfernung einer Preisstufe.** Die bestehende drei-Klassen-Gewichtungsmatrix (20 % Niete je Stufe, 11 % ×2, seltene Hauptgewinnereignisse) bleibt unverändert.
- Neue Lose werden ausschließlich aus den ihrem Preis zugeordneten Spielarten gezogen: `simple=['gifts','snow_collect']`, `medium=['elf']`, `premium=['tree']`.
- Bereits erworbene Karten, Guthaben und Freischaltungen bleiben unverändert; altes Regelwerk bleibt auswertbar.
- Weitere sechs frühere Regelprüfer dürfen als **Legacy-Kompatibilität**
  bestehen bleiben. Bereits erworbene Karten werden weiter
  wiederhergestellt, auch wenn ihre Spielart nicht mehr neu erhältlich ist.

### Reihenfolge der drei Neuentwicklungen
1. **Normal 2:** Schneeflocken-Bingo – eigenständiges 16-Felder-Bild,
   präzise 4×4-Koordinaten und durchgehende Rubbeloberfläche.
2. **Mittel (einziges Los):** Magischer Wichtelpfad – 20 große Felder, der
   durchgehende Weg muss klar und ohne versteckte Zwischengewinne
   hervorgehoben werden.
3. **Premium (einziges Los):** Weihnachtsbaum-Geheimnis – 15 Felder, exakte
   Symbolfolge und sichtbare Gewinnzuordnung, keine erfundenen Preise.
4. Den Shop mit **2 Einfach + 1 Mittel + 1 Premium** darstellen. Alle vier Lose auf Touch, Reload, 90-%-Aufdeckung, Nieten und 1–3 Treffer sowie Gewinnchancen testen; kein Preisstufen-Wechsel erforderlich.

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

## Phase 2 – Spielvarianten und Generator [ZIEL 4; LIVE DERZEIT 6; ENDTEST OFFEN]
- [x] Generatoren und unabhängige Regelprüfer für die **4 künftig angebotenen Varianten** sowie die 6 früheren Varianten vorhanden: `serverfinal/dog/christmas-scratch-grid.js`.
- [x] Pro Variante **0, 1, 2 oder 3** sichtbare, tatsächlich regelkonforme Gewinnkombinationen erzeugen; Nieten ohne gültige Gewinnkombination.
- [x] Preis-Zuordnung je geprüfter Gewinnkombination vorbereitet (`attachScratchPrizes`); eine manipulierte Feldzuordnung wird erkannt (`verifyScratchPrizes`).
- [x] Erste 10.000 Felder (10 Varianten × 4 Gewinnzahlen × 250 Durchläufe) mit Generator, Auswertung und Preisbindung erfolgreich getestet, zusätzlich ein eigener Testquelltext: `serverfinal/tests/christmas-scratch-grid.test.js`.
- [ ] Tests in der echten Node-Testumgebung bzw. CI ausführen und dokumentieren; Prüfung der tatsächlichen Gewinnvergabe erfolgt in Phase 3.
- [ ] Spieleranleitungen und Spielbilder in der tatsächlichen UI anzeigen; Ausgabe der Gewinnbeträge an den zugehörigen Symbolen.
- [ ] Zusätzliche Gewinnanzahl über 3 verhindern bzw. ausschließlich Varianten mit ausreichender Kapazität verwenden, bevor bestehende Echtgeld-/Eventmünzen-Auszahlung daran gebunden wird.
- Generator erzeugt Nieten ohne gültige Kombination; Gewinne mit exakt zugeordneten Treffern.
- 6/9/12/15/16/20 Felder auf Mobilgeräten gut bedienbar.
Abnahme: automatische Validierung der vier neuen aktiven Varianten, zugehörige Klassenbindung sowie Kompatibilität der sechs archivierten Altvarianten, auch 2–3 Gewinnkombinationen.

## Phase 3 – Serverseitige Auszahlung [INTEGRIERT; LIVE-ENDTEST OFFEN]
- [x] Render-Kauflogik `serverfinal/dog/christmas-scratch.js` und vorhandene authentifizierte API-Routen geprüft.
- [x] Atomare Firestore-Transaktion, Wiederholungen über commandId idempotent, auch bei Unterbrechung.
- [x] Neue Ergebnisstruktur inklusive alle Gewinnkombinationen, sichtbarem `board` und `variantId`, auch für Nieten und ×2.
- [x] Gewinn und validiertes Spielfeld im selben Transaktionsbeleg gespeichert; keine Datenbankwrites beim Freirubbeln.
- [x] `lastResult` wird serverseitig gespeichert; die Oberfläche bietet das noch nicht als gesehen markierte Los nach Neuladen erneut an (nur UI-Marker lokal, keine Berechtigungsprüfung damit).
Abnahme: Unit-/Integrationstests für Guthaben, Duplikate, Entitlements, Auth, Parallelkäufe.

## Phase 4 – Grafiken [1/4 HOCHGELADEN; 2/4 VORBEREITET; 2 PREMIUMKARTEN OFFEN]
- [x] **Karte 1 „Geschenkelinie“** einzeln als hochwertiges Motiv (Rot/Gold, neun goldene Rubbelplätze) generiert.
- [x] Optimierte WebP-Datei erstellt: `geschenkelinie-01.webp`, **1086×1448 Pixel**, ca. 414 KB. Download aus der aktuellen Unterhaltung.
- [x] **Artwork-Feld-Ausrichtung im Frontend**: `christmas-event.html` enthält den neuen `scratch-card-art`-Wrapper; `christmas-scratch.css` positioniert das 3×3-Spielfeld auf den neun gedruckten goldenen Feldern.
- [x] Gewinn-Symbole werden weiterhin vom Render-Server generiert; das Motiv enthält keine festen Symbolkombinationen oder Münzbeträge.
- [x] Zur 3×3-Variante passende Gewinnregel sichtbar: drei gleiche Symbole waagerecht, senkrecht oder diagonal. 0–3 Gewinnreihen können gemäß Ergebnis entstehen.
- [x] **Grafik in GitHub hochgeladen und geprüft:** Repository `schmitti92/Spiel-client`, Pfad `DOG/assets/scratch/geschenkelinie-01.webp`, Blob SHA `9a8f8e461630c5c095cc755a3f02db2cf0acd6ff` (identisch mit lokalem Original).
- [x] **Statische Ausrichtung mit Originalbild überprüft und optimiert:** Die 3×3-Beschichtungen sitzen innerhalb der neun goldenen Rahmen (CSS: left 17 %, top 31,7 %, width 63,6 %, height 40,1 %, grössere Zwischenabstände). Stylesheet-Cache-Version aktualisiert.
- [ ] **Live-Abnahme** im echten Browser und auf dem Smartphone: Bild aus GitHub Pages laden, Rubbelgefühl/Pointer-Touch, Gewinnsymbol-Highlight und 90-%-Automatik kontrollieren.
- [x] **Karte 2 „Schneeflocken-Bingo“**: fertiges Bild vom Nutzer bestätigt und als `schneeflocken-bingo-01.webp` (1152×1536 Pixel, ca. 577 KB) aus dessen hochgeladenem PNG exportiert. Download liegt in dieser Unterhaltung. Noch NICHT auf GitHub hochgeladen.
- [x] Bestehende Eispalast-CSS-Einbindung mit dem Originalbild abgeglichen: 4×4-Positionierung auf 16 Silberfeldern (left 15,5 %, top 27,8 %, width 66 %, height 44,2 %, grid gaps 3 % / 7,5 %). Helle Eisfarbe unter der entfernten Silberschicht erhöht den sichtbaren Kontrast.
- [x] `snow_collect`-Gewinnregel im Backend: drei gleiche Symbole an beliebigen Positionen, je Symbolart maximal ein Preis, 4–6 🧊-Nietenfelder pro Los. Alte `snow`-Viererreihen-Regel bleibt für historische Belege bestehen. Testgenerator 300-mal je Gewinneranzahl 0–3 erfolgreich kontrolliert.
- [ ] **Karte 2 hochladen** in `schmitti92/Spiel-client/DOG/assets/scratch/schneeflocken-bingo-01.webp`, anschließend Gerätetest (Bilder, 90-%-Rubbeln, Preiszuteilung).
- [ ] **Zwei** weitere Einzelmotive erstellen, hochladen und einpassen: Magischer Wichtelpfad und Weihnachtsbaum-Geheimnis.
- Gemeinsam genutzte Assets: Silbertextur, Emoji-Symbole, Gewinnleuchten, Qualitätsrahmen.
Abnahme: Bilddatei öffentlich verfügbar, alle neun Rubbelstellen ausgerichtet, Gewinnreihen sichtbar und 90-%-Aufdeckung auf Touch-Geräten erfolgreich überprüft; danach drei weitere Motive fertigstellen.

## Phase 5 – Rubbeloberfläche [ECHTES FREIRUBBELN + 90-%-AUTOMATIK EINGEBAUT, HANDYTEST OFFEN]
- [x] **Eine durchgehende Canvas-Beschichtung über dem gesamten Spielfeld** (6–20 Felder). Der Finger bzw. Mauszeiger darf ohne Absetzen über sämtliche Felder und Zwischenräume streichen; keine per-Zelle-Klick- oder Einzelwischpflicht mehr. Silbertextur wird im Fingerpfad transparent.
- [x] Fortschritt wird anhand der **Alpha-Pixel der gemeinsamen Silberschicht** ermittelt: Zähler = tatsächlich entfernte beschichtete Bildpunkte, Nenner = alle anfänglich beschichteten Bildpunkte, transparente Lücken zwischen den Feldern zählen nicht. Kein Messen nach Wischstrecke oder Klickzahl.
- [x] Ab **90 % der gesamten Beschichtungsfläche** gibt die UI automatisch alle restlichen Felder und Gewinnkombinationen frei; sichtbarer Prozentbalken.
- [x] Keine pro-Feld-90-%-Abkürzung mehr; erst bei insgesamt 90 % der gemeinsam beschichteten Fläche wird die restliche Karte automatisch aufgedeckt.
- [x] Sofort-Aufdecken für neue Lose ausgeblendet; für Tastaturbedienung einzelne Felder per Enter/Leertaste freigebbar; Altlostickets behalten Kompatibilitätsbutton.
- [ ] Auf Mobilgeräten prüfen, dass ein durchgehender Touch-Drag über mehrere Zellen, Pointer Capture, Scroll-Unterdrückung nur auf der Rubbeloberfläche und die tatsächliche 90-%-Schwelle zuverlässig funktionieren.
- [x] Gewinnkombinationen werden nach Freirubbeln gold markiert und ihre Preise separat ausgewiesen; ×2 und seltenes Hauptgewinn-×2 gekennzeichnet.
- [x] Nieten werden nach dem Aufrubbeln ohne leuchtende Gewinnkombination und mit Nieten-Hinweis gezeigt.
Abnahme: Touch, Maus, Vollbild, Reload, kleine Displays.

## Phase 6 – Integration [CODE EINGEBAUT, BROWSERTEST OFFEN]
- [x] Vorhandene Kaufoberfläche mit drei Preisstufen und technisch sechs neu ziehbaren Varianten (IST-Stand); [ ] auf zwei Normal- und zwei Premium-Spiele samt Klassenbindung, unveränderten Freischaltungen und Altlosen migrieren.
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

## Nach Abschluss aller vier Lose – Host-Einstellungen (bewusst zurückgestellt)
**Status: GEPLANT, NICHT JETZT IMPLEMENTIEREN.** Nutzerwunsch vom 15.11.2026: Erst wenn alle vier Rubbellose fertig gestaltet, korrekt zugeordnet und getestet sind, wird die Host-Einstellungsfunktion entwickelt. Bis dahin keine Änderungen an Kauf-/Gewinnlogik und kein funktionsloser Einstellungen-Button.

- Im Rubbellos-Tab ganz oben **rechts** erscheint nur für den authentifizierten **Spielhost** ein Zahnrad-Button „Einstellungen“; Gäste und normale Mitspieler sehen ihn nicht.
- Ein Klick öffnet ein übersichtliches Host-Einstellungsfenster, ohne die Rubbellos-Seite zu verlassen.
- **„Kostenlose Rubbellose für mich“**: vom Host aktivierbarer/deaktivierbarer Schalter; wenn aktiv, darf nur der berechtigte Host selbst Lose für 0 Goldmünzen öffnen. Alle anderen Spieler bezahlen unverändert den normalen Preis; bestehendes tägliches Gratislos bleibt separat.
- Auch kostenlose Lose müssen **serverseitig** autorisiert, regelkonform erzeugt, gegen Missbrauch/Doppelbuchung geprüft und korrekt gutgeschrieben werden. Keine manipulierten Clientwerte und keine zusätzlichen Firestore-Schreibvorgänge beim eigentlichen Rubbeln.
- **Spätere Einstellung der individuellen Gewinn-Gewichtung jedes der vier Lose**: jeweils separate Einstellungen für 🎁 Geschenkelinie (Einfach 200), ❄️ Schneeflocken-Bingo (Einfach 200), 🧝 Magischer Wichtelpfad (Mittel 500) und 🎄 Weihnachtsbaum-Geheimnis (Premium 1000). Nieten, Münzgewinne, Freischaltungen sowie Sonderereignisse als verständliche, servergeprüfte Prozent-/Gewichtungsfelder mit Standardwerten und „Zurücksetzen“. Nicht versehentlich die Häufigkeit der Losarten mit ihrer Gewinnauszahlung vermischen.
- Vor Aktivierung die genauen einstellbaren Parameter und ihre Auswirkungen auf Spieler, Guthaben und Fairness gemeinsam festlegen. Einstellungen nur für **neue** Lose anwenden, nie bereits gekaufte oder verbuchte Lose nachträglich verändern; serverseitig persistieren und nur dem Host Bearbeitungsrechte geben.
- **Abnahmereihenfolge:** zuerst alle vier Lose vollständig fertigstellen und mobil testen; danach Hostberechtigung und kostenloses Öffnen; zuletzt die individuelle Gewichtungsoberfläche samt Validierung, Simulation und Sicherheitstests. **Aktuell nur dokumentieren.**

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
- 15.11.2026: Erstes Geschenkelinie-Finalbild exportiert und 3×3-Goldfelder im Frontend per separatem Artwork-Wrapper präzise positioniert. Cache-Version erhöht, restliche neun Varianten erhalten ihre generische Oberfläche.
- 15.11.2026: Nutzer hat Geschenkelinie-WebP hochgeladen. SHA/Dateidimensionen geprüft, 3×3-Feldgeometrie mit Bild verglichen und CSS-Abstände innerhalb der neun Goldrahmen nachjustiert. Bild ist in CSS verlinkt. Echter Mobilgeräte-Endtest offen.
- 15.11.2026: Einheitlicher Canvas über dem gesamten Symbolraster implementiert. Ein einziger Pointer-Drag radiert quer über Zellen und Zwischenräume; pro-Zelle-Rubbelzwang entfernt. Gesamtfortschritt wird aus Alpha-Pixeln gemessen und die automatische Aufdeckung greift bei 90 % des gesamten Rasters. CSS-/JS-Cacheversionen angehoben; echter Smartphone-Test noch offen.
- 15.11.2026: Anzahl der aktiven Rubbellos-Spielarten von zehn auf **sechs** korrigiert. Backend-Auswahl auf die sechs aktiven IDs eingeschränkt; alte vier Varianten bleiben für bereits ausgestellte Lose auswertbar. Testannahmen angepasst. Freischaltpools, Preise und Wahrscheinlichkeiten unverändert.
- 15.11.2026: Ziel auf **vier Rubbellose, zwei Normal und zwei Premium**, neu festgelegt. Geschenkelinie bleibt Nr. 1; drei Neuentwicklungen vorgeschlagen (Schneeflocken-Bingo, Wichtelpfad, Weihnachtsbaum-Geheimnis). Plan angepasst, LIVE-Code noch mit sechs auswählbaren Spielarten und drei Preisstufen: Migration ausstehend, Altlose schützen.
- 15.11.2026: Nutzer bestätigt das Eispalast-Bild als Rubbellos 2. Server-ID `snow_collect` aktiv, 3 gleiche irgendwo, 4–6 leere Nietenfelder und max. ein Treffer je Symbolart. Vom Nutzer hochgeladene 1152×1536-Vorlage als WebP exportiert; Rubbel-Zellen CSS-mäßig genau abgestimmt und Cache-Versionen erhöht. Backend war bei der letzten Render-Prüfung live; echter Browser-Endtest steht aus.
- Nächster Schritt: `schneeflocken-bingo-01.webp` nach GitHub hochladen und mit dem normalen Konto testen; dann die zwei Premium-Motive nacheinander entwickeln.

- 15.11.2026: Verbindliche Nutzerkorrektur: Los 3 „Magischer Wichtelpfad“ ist die einzige **mittlere** Variante für **500 Goldmünzen**, nicht Premium. Server-Pool auf `simple: gifts/snow_collect`, `medium: elf`, `premium: tree` geändert. Das Motiv ist `wichtelpfad-mittel-01.svg`; Shop zeigt pro Preisklasse die zugehörigen Varianten. Preise, bestehende Lose und Wahrscheinlichkeitsmatrix unverändert. Echtes End-to-End noch offen.

- 15.11.2026: Host-Wunsch für spätere Phase festgehalten: Rubbellos-Zahnrad oben rechts (nur Host), Schalter zum kostenfreien Eigenöffnen sowie je Los einzeln konfigurierbare Gewichtungen. Entwicklung ausdrücklich bis zur Fertigstellung aller vier Rubbellose zurückgestellt; keine aktuelle Funktionsänderung.
