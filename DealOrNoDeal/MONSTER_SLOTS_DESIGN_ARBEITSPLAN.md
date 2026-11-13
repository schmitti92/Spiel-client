# Monster Slots – Design- und Umsetzungsplan
**Stand:** 13.11.2026 · **Zielbranch:** `main` · **Status:** geplant, noch nicht grafisch umgesetzt

> **Referenzhinweis:** Das zuletzt angefragte Entwurfsbild wurde während der Generierung abgebrochen und liegt hier nicht als vollständig prüfbare Bilddatei vor. Daher beschreibt dieser Plan die im Gespräch festgelegte Bildidee verbindlich in Textform (Gold/Purpur/Blau, drei große Walzen, dreifache Gewinne). Für eine pixelgenaue 1:1-Anpassung wird eine fertige Referenzaufnahme benötigt. Der technische Umbau kann dennoch anhand dieses Plans beginnen.

## 1. Ziel und Grenzen
Das automatische Gewinnfenster am Ende **jeder abgeschlossenen Deal-or-No-Deal-Partie** soll eine hochwertige, eigenständige Monster-Slotmaschine darstellen: **drei große Walzen**, alle **zeitgleich in Bewegung**, dann **nacheinander von links nach rechts** stoppen. Jede Walze hat **immer einen eigenständigen, serverseitig zugeschriebenen Gewinn** – keine Dreierkombination, keine Nieten, keine erneute Auslosung im Browser.

Das separate **Monster-Glücksrad** in der Weihnachtswelt bleibt erhalten, weil die Slots dafür 1–3 Drehgutscheine vergeben. Nur die bisherigen **Abschluss-Glücksräder** werden im neuen Abschlussablauf ersetzt. Historische Spielstände, 1-Cent-Pakete und Banker-Geschenke dürfen nicht verloren gehen.

## 2. Verbindliche Gestaltung des Fensters
- **Vollbild-Overlay:** Verdunkelte/leicht weichgezeichnete Spielsituation, Popup zentriert, auf Handy vollständig erreichbar; kein störender Seiten-Scrollzwang.
- **Hochwertige Show-Optik:** Tiefes Nachtblau und sattes Violett, sanfte Lichtstrahlen/Partikel, glänzender **goldener Außenrahmen**, plastisches Slotmaschinen-Gehäuse, zurückhaltende Glanzkanten und Schatten. Keine gewöhnliche Browser-Dialogbox.
- **Titelzone:** Goldener, großer Titel **„🎰 MONSTER SLOTS“**, darüber kleine glitzernde Sterne, darunter **„3 WALZEN · 3 GARANTIERTE GEWINNE“**.
- **Walzenzone:** Drei symmetrische, große vertikale Fenster. Jede Walze mit metallischem Goldrahmen, heller Innenfläche und realem Abrolleffekt; Symbole groß, Gewinnname und Menge deutlich lesbar. Keine vierte oder fünfte Walze. 
- **Gewinnvisualisierung:** Bild/Ikon der Kategorie zentral; z. B. **„1× Goldkiste“**, **„3× Premiumpaket“**, **„2× Goldhammer“**. Echte vorhandene Bildassets verwenden, sofern verfügbar; Emoji als sichere Fallbacks. Lange Geldbeträge und Namen dürfen nicht abschneiden.
- **Ergebniszone:** Klarer Text **„🎉 Alle drei Gewinne wurden gutgeschrieben!“** und ein großer goldener Button **„🎁 Gewinne bestätigen“**. Erst nach dem dritten Stopp aktivieren.
- **Effekte:** Kurzer Goldglanz und leichter Impuls bei jeder stoppenden Walze, stärkere Effekte nur bei legendären/Platin-/sehr hohen Geldgewinnen; keine die Lesbarkeit überdeckende Partikelwand.
- **Barrierearm:** Ausreichender Textkontrast, Tastaturfokus für den Button, `aria-live` sparsam, `prefers-reduced-motion` beachten.
- **Responsive:** Drei sichtbare Walzen nebeneinander auch auf typischen Mobilgeräten; kompakte Abstände und skalierte Typografie, gegebenenfalls vertikal scrollbares **Popup**, aber nicht die ganze Spielseite. Landscape/Portrait und kleine Bildschirmhöhen prüfen.

## 3. Animationsablauf
1. Nach der Siegerehrung erhalten alle berechtigten Spieler ihre **eigenen** drei serverseitig festgelegten Gewinne. Die Slotoberfläche wird geöffnet; alle drei Walzen beginnen **in derselben Animationstaktung**.
2. Start: optisch sichtbare laufende Symbolstreifen (nicht nur ein wackelndes Emoji), kurzer Anlauf mit gleichem Startzeitpunkt.
3. Stopps nach etwa **3,0 / 4,5 / 6,0 Sekunden**. Jede Walze zeigt exakt ihr gespeichertes Ergebnis; ein Stopp-Glanz und ein kurzer hörbarer/visueller Akzent ist optional.
4. Nach dem letzten Stopp folgt etwa **0,5–1,0 s** Ergebnispräsentation; erst dann wird „Gewinne bestätigen“ freigeschaltet.
5. Nach Bestätigung Fenster schließen, Ergebnis bei Bedarf wieder anzeigen können, ohne irgendetwas erneut gutzuschreiben; danach kann der Host die nächste Partie starten.
6. Bei reduzierter Bewegung alle drei Gewinne ohne hektische Animation zeigen; bei Verbindungsproblemen eine verständliche Retry-Funktion ohne doppelte Auszahlung.

## 4. Unveränderliche Gewinnregeln
**Drei garantierte Gewinne pro Spieler und abgeschlossener Partie.** Jede Walze zieht unabhängig aus dem Katalog.

| Gewinnkategorie | Chance je Walze | Einzelgewinne |
| --- | ---: | --- |
| Rohstoffkisten | 35 % | Holz, Eisen, Silber, Gold, Legendär; alle ab Anfang gewinnbar, spätere Tore erhöhen die Häufigkeit besserer Kisten |
| Kartenpakete | 30 % | Normal, Gold, Premium, Platin; je 1×, 2× oder 3× |
| Hämmer | 20 % | Einfach-, Doppel-, Glücks-/Goldhammer; je 1×, 2× oder 3× |
| Kofferblick-Joker | 4 % | 1× oder 2× |
| Minispiel-Gutscheine | 3 % | 1×, 2× oder 3× |
| Monster-Glücksrad-Gutscheine | 3 % | 1×, 2× oder 3× |
| Zufallsgeld | 5 % | 0,01–100.000.000,00 € als echter Ganzzahl-Centbetrag |
| **Gesamt** | **100 %** | **3 Gewinne je Partie** |

Die garantierte **Holzkiste zusätzlich** zu den drei Slotgewinnen bleibt Teil des Plans. Schmiedestufen 1–10 begrenzen die Aufwertungen auf höchstens 5/10/…/50 Ausrüstungslevel. Der Katalog und seine Chancen dürfen durch reines CSS/JS-Redesign nicht verändert werden.

## 5. Aufgabenplan – in dieser Reihenfolge

| ID | Priorität | Aufgabe | Fertig, wenn … |
| --- | --- | --- | --- |
| MS-01 | Hoch | Ausgangszustand der tatsächlichen UI und des Serververtrags dokumentieren | Aktuelle Slots-/Finale-Dateien, bekannte Testfehler und Screenshots festgehalten; Referenzdesign in eigenen Worten definiert |
| MS-02 | Hoch | Popup-Gehäuse visuell modernisieren | Goldene Einfassung, dunkle Showbühne, Licht/Glanz, Titel und Ergebniszone entsprechen der Designspezifikation |
| MS-03 | Hoch | Drei realistisch scrollende Walzen gestalten | Alle Walzen beginnen gleichzeitig; jede rollt sichtbar durch mehrere Symbole, Ergebnis wird nicht clientseitig neu gezogen |
| MS-04 | Hoch | Stopp- und Gewinnsequenz gestalten | Walzen stoppen links–rechts bei ca. 3/4,5/6 s; Goldglanz, klare Menge und Kategorie, Seltenheitsakzente |
| MS-05 | Hoch | Gewinngrafiken und Texte integrieren | Für alle sieben Kategorien passen Symbole, Namen, Mengen (1–3; Joker 1–2) und formatierte Centbeträge |
| MS-06 | Hoch | Finale-Ablauf vereinheitlichen | Nach der Siegerehrung startet nur Monster Slots; keine alten Abschlussräder erscheinen oder blockieren; Sonderbelohnungen bleiben funktionsfähig |
| MS-07 | Hoch | Zuverlässigkeit und Zustandsverwaltung | Kein doppelter Gewinn nach Reload, Doppelklick, Reconnect oder Spielwechsel; Serverquittung bleibt Quelle der Wahrheit |
| MS-08 | Mittel | Mobile UX und Zugänglichkeit | Bedienbar mit Touch und Tastatur, lesbar auf Smartphone/Tablet/PC; kleine Höhen und Reduced Motion berücksichtigt |
| MS-09 | Hoch | Gezielte Regression und Livekontrolle | Je Spielertyp drei Gewinne gebucht, alle Bestände richtig, Ties, 1-Cent, Banker, nächste Runde und Wiederöffnen geprüft |
| MS-10 | Mittel | Visueller Soll-Ist-Abgleich und Feinschliff | Desktop-/Mobilansichten mit fertiger Referenz verglichen; Abstände, Goldglanz, Größen und Bewegungsrhythmus korrigiert |

## 6. Codebezug
**Frontend:** `DealOrNoDeal/js/monster-slots-final.js`, `DealOrNoDeal/css/monster-slots-final.css`, `DealOrNoDeal/js/finale.js`, `DealOrNoDeal/js/app.js`, `DealOrNoDeal/game.html`.

**Backend:** `schmitti92/serverfinal/monster-slots.js`, `deal-or-no-deal-api.js`, `dog-materials.js`, `dog-album-season2.js`.

Die Frontend-Animation darf **keine eigenen Gewinnauslosungen** vornehmen. Der Server stellt genau drei festgeschriebene Preise aus und schreibt sie exakt einmal in die bestehenden Konten. Alte Endpunkte nicht ohne Migrationsprüfung löschen; separater Monster-Rad-Gutschein muss weiterhin einlösbar sein.

## 7. Tests und Abnahme
- **Sichtprüfung** auf Desktop und Handy mit 1×Kiste, 3×Kartenpaket, 2×Hammer, Joker, Gutscheinen, hoher Geldsumme; keine Überläufe oder überdeckte Buttons.
- **Ablauftest**: Alle drei gleichzeitig starten, nacheinander stoppen, einzelne Gewinne ablesbar, Bestätigen erst nach dem letzten Stopp.
- **Backend-Abnahme**: 3 Gewinnquittungen als ein idempotentes Bündel pro Person/Partie; alle sieben Gewinnkategorien in richtigen Inventaren; Gutschriften bei Reconnect und parallelem Abruf genau einmal.
- **Spielverträglichkeit**: Echter Gruppenspielabschluss und Gleichstand; keine Verzögerung durch nicht mehr aktive Abschlussräder; neue Runde/lobby zuverlässig.
- **Performance**: Visuelle Animation lokal; keine zusätzlichen Firestore-Dauerabfragen.
- **Transparenz**: Ziel von ungefähr 300 DoND-Partien bis 100 Tore bleibt separater Balancing-Auftrag; die Gestaltung der Slots ändert die Gewinnwahrscheinlichkeiten nicht.

## 8. Noch offen / ausdrücklich nicht zugesagt
- Eine **pixelgenaue Übernahme** ist erst möglich, wenn das vollständige Entwurfsbild tatsächlich vorliegt. Die bisherige Bildgenerierung wurde abgebrochen.
- Dieser Plan ist **nur die Aufgabenliste**, keine Behauptung, dass Design, End-to-End-Tests oder Live-Deployment abgeschlossen sind.
- Keine umfassende Löschung von historischen Glücksrad-Dateien ohne Kontrolle der Verweise und laufenden Spielstände.
