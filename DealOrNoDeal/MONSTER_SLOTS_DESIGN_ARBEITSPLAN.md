# Monster Slots – Design- und Umsetzungsplan
**Stand:** 13.11.2026 · **Zielbranch:** `main` · **Status:** Monster-Slots-Design sowie automatisierter Finale-/Drei-Spieler-/Inventartest implementiert; echter Multiplayer-Live-Test und pixelgenauer Bildvergleich offen

> **Referenzhinweis:** Das zuletzt angefragte Entwurfsbild wurde während der Generierung abgebrochen und liegt hier nicht als vollständig prüfbare Bilddatei vor. Daher beschreibt dieser Plan die im Gespräch festgelegte Bildidee verbindlich in Textform (Gold/Purpur/Blau, drei große Walzen, dreifache Gewinne). Für eine pixelgenaue 1:1-Anpassung wird eine fertige Referenzaufnahme benötigt. Der technische Umbau kann dennoch anhand dieses Plans beginnen.

## 0. Arbeitsfortschritt – erste Bauphase auf `main` (13.11.2026)

| ID | Umsetzung | Prüfstand |
| --- | --- | --- |
| MS-01 | Bisherige Slots, Finale-Events und fünf vorhandene Kistenbilder in GitHub `main` geprüft | Codeprüfung durchgeführt; kein pixelgenaues Referenzbild verfügbar |
| MS-02 | Goldenes, tiefblau-violettes Showgehäuse mit Lichtpunkten, Banderole, Ergebniszone und Button eingebaut | Im Quellcode umgesetzt; optische Prüfung auf echten Endgeräten offen |
| MS-03 | Drei echte vertikal scrollende Symbolstreifen eingefügt; alle starten in einem gemeinsamen Schritt | Technisch umgesetzt; Browser-Animation noch praktisch zu prüfen |
| MS-04 | Stopps nach ca. 3,0 / 4,5 / 6,0 Sekunden, individuelle Gewinnerhellung und Seltenheitseffekte | Technisch umgesetzt; flüssiges Timing und letzte Stoppanimation praktisch zu prüfen |
| MS-05 | Originalbilder für alle fünf Rohstoffkisten, Kartenpakete, drei Hammersorten, Joker, Minispiele, Monster-Rad und Spielgeld eingebunden; sichere Emoji-Fallbacks | **Im Code umgesetzt**: Sichtprüfung, Langtext-/Mobilfeinschliff noch offen |
| MS-06 | Übergang Siegerehrung → Slotanzeige → Bestätigung und Neustart korrigiert; Gleichstand überspringt die Slots nicht mehr; Bonusfenster erhalten Vorrang | **Code und simulierte Browserereignisse geprüft**; echter Live-Mehrspielertest offen |
| MS-07 | Spielerbezogene Anzeigequittung; serverseitig genau-einmalige Gutschrift; vor Neustart werden alle noch offenen Teilnehmergutschriften automatisch abgeschlossen | **Backend-Integrationstest mit drei Spielern bestanden**; Live-/Parallelitätsprüfung offen |
| MS-08 | Responsive Ansichten, kleine Displayhöhen, Fokus und Reduced Motion eingebaut | **Teilweise**: echte Mobil-/Tablet-Sichtprüfung offen |
| MS-09 | Zusätzlicher echter JS-Modul-Ablauftest mit simulierten Browserereignissen und Drei-Spieler-Backend-Integrationstest mit Quittungen, Replay und Inventarkategorien | **Gezielte Tests erfolgreich**; ältere übrige Suite weiterhin nicht durchgehend grün |
| MS-10 | Vergleich mit einer fertig generierten Referenzgrafik | Offen: ursprüngliche Bildgenerierung wurde unterbrochen |

**Zweite Bauphase (13.11.2026):** Vorhandene Kunstdateien nun für alle sieben Kategorien angebunden; echte Geschenk- und Hammerbilder statt Platzhaltern, eigene Farblichtstimmungen für Kartenpakete und Spezialgewinne, bessere Lesbarkeit langer Geldsummen, langsamer durchlaufende Symbolstreifen (2,05 s pro Zyklus). Grafik-Fehlermeldungen fallen ohne Netzwerk-Endlosschleife auf Emojis zurück. In `game.html` laden beide Slot-Assets mit neuer Versionskennung `20261113-slots-prize-art-v3`. Zusätzlich `DealOrNoDeal/tests/assets.test.mjs` an die neuen Skripte angepasst, ohne alte Ereignis-Endpunkte zu löschen.

**Dritte Bauphase (13.11.2026):** Ein Gleichstand markiert die Monster-Slots nicht mehr über die alte Gewinner-Rad-Logik als fertig. Die Slots öffnen nach noch sichtbaren Banker-/Ein-Cent-Kartenbelohnungen; ein eigenes Schließereignis und die Profil-Login-Benachrichtigung ermöglichen zuverlässiges Nachholen ohne zusätzliche Dauerpolls. Bereits zugewiesene Slot-Ergebnisse werden beim Benutzerwechsel nicht fälschlich für ein anderes Profil angezeigt. Backend: Ein gemeinsamer serverseitiger Gutschrift-Helper bündelt ausschließlich offene Slotpreise, prüft deren Spielabrechnung, liest alle relevanten Dokumente vor dem Schreiben und erstellt pro Spieler/Partie genau eine Quittung. Beim Start einer neuen Partie werden auch stillen oder vorübergehend offline Spielern die offenen drei Preise gutgeschrieben. Darauf ausgerichtete Tests: `tests/monster-slots-flow.test.mjs` im Client und `serverfinal/tests/monster-slots.test.js` im Backend. Der Browser-Ablauftest (Bankerfenster, drei Stoppzeitpunkte, Profilwechsel, Folgepartie) und der Drei-Spieler-API-Test mit Idempotenz wurden in GitHub Actions erfolgreich ausgeführt. Ein vollständiger echter Live-Test mit drei angemeldeten Geräten ist noch nicht durchgeführt. Render-Deploy konnte wegen nicht ausgewählten Render-Workspaces nicht nachgewiesen werden.

**Originaldateien (nur eingebunden, nicht dupliziert):** `dog-chest-art/*.png`, `DealOrNoDeal/Weihnachtsevent2/Weihnachtsbilder/hammer-*.webp`, `DealOrNoDeal/assets/hats/reward-*.svg` und `prize-pack.svg`, außerdem das vorhandene Monster-Rad-PNG. Das Monster-Rad-Gewinnasset wird nur beim entsprechenden Gewinn geladen.

**Gewinngewichtung unverändert:** serverseitige Gewinnkategorien (35/30/20/4/3/3/5), Mengen und Gewinnwahrscheinlichkeiten; das separate Monster-Glücksrad bleibt erhalten. **Neu im Backend**: Die Auszahlung wird vor dem Start einer neuen Partie für alle noch offenen Teilnehmer in einem gemeinsamen idempotenten Firestore-Transaktionsbatch abgeschlossen; keine zusätzlichen oder mehrfachen Gewinne.

**Dateien der ersten Bauphase:** `js/monster-slots-final.js`, `css/monster-slots-final.css`, `js/finale.js`, `js/app.js`, `game.html` und `tests/monster-slots-design.test.mjs` (alle relativ zu `DealOrNoDeal/`).

**Vierte Designphase (13./14.11.2026):** Premium-Studio-Feinschliff auf `main` in `css/monster-slots-shared-show.css`: vorhandene Originalgrafik `slot-reel-panel.png` als Walzenverkleidung und `slot-win-glow.png` als dezenter Hintergrund der Gewinneranzeige eingebunden. Lichtleisten, Goldkanten, Walzenzustände, seltene Preise und Bestätigungsbuttons optisch nachgearbeitet. Ergebnisfenster erhält einen reinen Fade statt Scale-Animation, stabile Scrollleisten und Kartenbilder mit einem 2:3-Rahmen bei `object-fit: contain`, damit Karten im mobilen Zuschauermodus vollständig erkennbar bleiben. Cachekennung für die Show-CSS in `game.html` aktualisiert und gezielten Styling-Kontrakttest ergänzt. **Keine Veränderung** am serverseitigen Gewinnkatalog, den Auszahlungen, der gemeinsamen Drehrangfolge oder Firestore-Polling. Die automatische Browser-/Live-Sichtprüfung auf mehreren echten Geräten bleibt offen; der hier dokumentierte Fortschritt ist ein Code- und Styling-Update, keine bestätigte pixelgenaue Abnahme.

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

## 7a. Neue Regel: gewonnene Kartenpakete nur bei neuen Karten animieren (13.11.2026)

- **Slot-Gewinn `pack`:** Der Server öffnet alle 1–3 gewonnenen Normal-, Gold-, Premium- oder Platinpakete beim einmaligen Slot-Settlement direkt. Jede gezogene Karte wird dem DOG-Saison-2-Sammelalbum gutgeschrieben – unabhängig davon, ob sie neu oder doppelt ist.
- **Neue Karten:** Der Server berechnet `isNew` anhand des tatsächlich gespeicherten Kartenbestands, nicht aus einer Vermutung des Browsers. Enthält ein Paket mindestens eine neue Karte, öffnet es sich nach dem dritten Slot-Stopp automatisch und zeigt seine Karten; nur neu entdeckte Karten erhalten die auffällige Kennzeichnung.
- **Nur Duplikate:** Kein zeitaufwendiges Karten-Opening, aber alle doppelten Karten bleiben gutgeschrieben. Die Slot-Gewinne können direkt bestätigt werden.
- **Mehrere Pakete:** Jedes gewonnene Paket wird separat geprüft, und die Neuheit wird auch über mehrere Pakete derselben Slotrunde korrekt ermittelt.
- **Sicherheitsregeln:** Das alte Gutscheinmodell bleibt für historische Slot-Quittungen bestehen; neue Karten dürfen nicht nachträglich ein zweites Mal gezogen werden. Neuaufruf/Reload nutzt nur die gespeicherte Quittung; keine Extra-Firestore-Leseabfrage für die Enthüllung. Bei abwesenden Spielern werden die Pakete spätestens beim nächsten gemeinsamen Rundenstart serverseitig ausgezahlt.
- **UX:** Große Kartenmotive aus `Weihnachtsevent2/Sammelalbum_Saison_2_Bilder/`, Möglichkeit zum Überspringen der laufenden Enthüllung, barrierearme Kurzfassung bei `prefers-reduced-motion`.
- **Status:** Serverlogik und Frontend-Opening auf `main` eingebaut, gezielte Tests ergänzt; vollständiger Livetest mit 3 aktiven Spielern weiterhin offen.

## 8. Noch offen / ausdrücklich nicht zugesagt
- Eine **pixelgenaue Übernahme** ist erst möglich, wenn das vollständige Entwurfsbild tatsächlich vorliegt. Die bisherige Bildgenerierung wurde abgebrochen.
- Dieser Plan ist **nur die Aufgabenliste**, keine Behauptung, dass Design, End-to-End-Tests oder Live-Deployment abgeschlossen sind.
- Keine umfassende Löschung von historischen Glücksrad-Dateien ohne Kontrolle der Verweise und laufenden Spielstände.
