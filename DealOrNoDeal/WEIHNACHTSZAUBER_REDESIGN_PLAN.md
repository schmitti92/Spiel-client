# Weihnachtszauber – Premium-Redesign / Hammer-Bingo

Stand: 9. November 2026. Status: Schritt 1 (Visual Foundation) in Arbeit.
Betroffenes Frontend: `DealOrNoDeal/weihnachten.html`, CSS und neue Illustrations-Assets.
Backend/Render: `schmitti92/serverfinal` bleibt für das reine Design unverändert.

## 1. Bestandsaufnahme

- Die Hammer-Bingo-Oberfläche besteht aus zwei 4×4-Feldern: **Weihnachtswerkstatt (Karten 33–48, gewöhnlich)** und **Legendäre Winterwelt (Karten 49–64, gemischte Seltenheiten)**.
- Zehn mögliche Bingos je Feld: vier Reihen, vier Spalten und zwei Diagonalen. Die Gewinne stehen bereits zeilengenau rechts, spaltengenau darunter und die Diagonalen am unteren Rand.
- Der bestehende Client nutzt `renderHammerCollection(data)` für Spielstände und `POST /api/deal-or-no-deal/christmas/hammer/claim` für serverautorisierte, einmalige Gewinne. Vorhandene Berechnungen und Endpunkte nicht durch eine rein optische Änderung ersetzen!
- Nach 16 Karten: Jackpot Feld 3 = 10 Einfach-Hammer; Feld 4 = 10 Doppel-Hammer + 3 Glückshammer, dann ausschließlich dieses Feld zurücksetzen. Bisherige Event-1-Freischaltungen bleiben erhalten.
- Die UI steckt weitgehend in einer großen HTML-Datei mit vielen CSS-Overrides. Sie ist dadurch schwer zu warten.
- Wichtiger Fehler im Spoiler-Schutz: Gesperrte Hammer-Karten erzeugen bisher echte `img`-Elemente. Unschärfe/Verdunklung schützt nicht zuverlässig vor Motiv-Enthüllung und verursacht unnötige Downloads.

## 2. Gestaltungskonzept

### Farb- und Bildwelten

**Feld 3: Weihnachtswerkstatt**
- Stimmung: warme Holzwerkstatt, Kupfer, Bernstein, Festtagslichter und gedämpftes Tannengrün.
- Titelbereich mit vorhandener Werkstattillustration und dezentem Bild-Overlay.
- Gesperrte Karten als dunkelgrüne, ornamentierte Werkstatt-Kartenrückseite; alle Motive bleiben geheim.

**Feld 4: Legendäre Winterwelt**
- Stimmung: mystischer Eispalast, Nachtblau, Violett, kühles Kristalllicht und edles Gold.
- Separates Artwork/Atmosphäre; besondere Jackpot-Präsentation.
- Gesperrte Karten als blauviolette, ornamentierte Kristall-Kartenrückseite.

### Seitenarchitektur

1. Gemeinsame Eventnavigation behalten.
2. Kleine, detailreiche Hammer-Bingo-Bühne statt des großen Erklärungskastens.
3. Drei kompakte Hammer-Vorratskarten mit richtigen Hammerbildern und großen, schnell lesbaren Zahlen; Refresh bleibt erreichbar.
4. Zwei thematisch getrennte Sammelbretter (Landscape/Tablet nebeneinander, Portrait/Mobil untereinander).
5. Pro Brett: Feldname, Fortschritt, **4×4 Karten**, **Reihenpreise genau rechts**, **Spaltenpreise genau unten**, **Diagonalpreise darunter**, **Jackpot am Brettende**.
6. Ein kompaktes Hilfe-/Statusband; ausführliche Erklärung bleibt vollständig unter »Spielinformation & Gewinner« erreichbar.
7. Weihnachtsevent 2 gut sichtbar verbinden, ohne die Primärnavigation zu überfrachten.

### Interaktionen

- »Unentdeckt«: nur Rückseite, Nummer, Schloss, keine `src` und kein verratender `title`/`alt`.
- »Entdeckt«: echte Karte einblenden und mit Name sowie Seltenheit anzeigen; Bild nur dann lazy laden.
- »Bingo bereit«: goldener Rahmen an den vier betroffenen Karten sowie deutlich sichtbare ausstehende Belohnung.
- »Bingo erhalten«: goldgrüner, ruhiger Status; keine zweite Gutschrift.
- »Jackpot«: optische Feier mit Rücksicht auf `prefers-reduced-motion`; Auszahlung ist immer ausschließlich serverseitig.
- Keine Blinken-/Animationseffekte, die den Benutzer beim Öffnen eines Pakets blockieren.

## 3. Bild- und Assetplan

### Bereits im GitHub-Repo vorhanden
- `assets/weihnachts_event/08_wichtelwerkstatt.png` (Werkstatt-Kulisse)
- `assets/weihnachts_event/10_eisschloss.png` (Eispalast-Kulisse)
- `assets/weihnachts_event/geschenk_gold.png` (Jackpot)
- `Weihnachtsevent2/Weihnachtsbilder/hammer-einfach.webp`
- `Weihnachtsevent2/Weihnachtsbilder/hammer-doppel.webp`
- `Weihnachtsevent2/Weihnachtsbilder/hammer-glueck.webp`
- 32 Hammer-Bingo-Kartengrafiken in `Weihnachtsevent2/Weihnachtsbilder/`.

### Eigene neue Dateien in Schritt 1
- `assets/weihnachts_event/card-back-workshop.svg`
- `assets/weihnachts_event/card-back-winter.svg`
- `css/christmas-hammer-premium.css` (zusätzliche, abgekoppelte Stil-Ebene)

### Spätere Illustrationsrunde
- Ein bildfüllender Werkstatt-Header und ein Eispalast-Header, abgestimmt auf Brett und Navigationsstil.
- Eigenständige Siegessiegel, Geschenkglanz und 3D-ähnliche Jackpot-Rahmen.
- Kleine, optimierte Hintergrund-Szenenelemente statt vieler riesiger PNGs.
- Bilder WebP/AVIF bevorzugt, SVG für Ornamente, keine Hotlinks; klare, dauerhaft lesbare Dateinamen, Alt-Texte.
- Ziel: deutlich verbesserte Bildsprache ohne spürbar höhere Ladezeit auf Tablets.

## 4. Technischer Umbau nach Phasen

### Phase A – sichere Gestaltungsbasis (jetzt)
- Feature-Branch statt Direktänderung der Live-Seite.
- Externe Premium-CSS-Datei als letzte CSS-Schicht laden.
- Vorhandene Werkstatt-/Winter-/Hammerbilder wiederverwenden.
- Echte Kartenrückseiten hinzufügen und gesperrte Bild-Downloads vermeiden.
- Bildfreigabe auf den bereits vom Server geladenen Eigentumsstand stützen.
- Keine Änderungen an Jackpot, Kauf-, Claim- oder Render-API-Logik.
- Review und statische Regressionstests für IDs, Formeln und Responsivität.

### Phase B – Feinschliff und Designsystem
- Wiederholte, widersprüchliche Inline-CSS-Regeln schrittweise in modulare Stylesheets überführen.
- Päckchen-Seite, Sammlung und Eventnavigation gestalterisch angleichen.
- Schriftgrößen, Touch-Ziele, Kontrast, Hover-/Fokuszustände und Vollbild nachprüfen.
- Tablet-Landscape und Smartphones (auch mit großer Textskalierung) testen.

### Phase C – Premium-Bewegung
- Nur bei tatsächlich neu erhaltenen Bingo-Gewinnen: kurze goldene Leuchtspur, Münz-/Hammer-Animation (rein lokal).
- Jackpot-Feier mit überspringbarer Kurzanimation, ohne Blockade der Server-Gutschrift.
- Optionale, stumm startende Effekte; Nutzereinstellung für Sound und reduzierte Bewegung.

### Phase D – Stabilität / Release
- Testprofile: 0/16, 1/16, 3/4 in einer Reihe, 4/4 fertig, Spalte, Diagonale, mehrere parallele Bingos, 16/16 und Neustart.
- Prüfen, dass Server-Claim idempotent und synchron mit Kontostand aus Event 2 ist.
- Profile mit schwacher Verbindung, Offline-Status, langsam ladenden Bildern, erneuter Anmeldung.
- Screenshot-Vergleich in 1536px-Landscape, 768px, 390px; Touch und Tab-Navigation.
- CSS und Asset-Größe beobachten; keine unnötigen Firebase-/Render-Anfragen.
- Erst nach Review und Prüfung in `main` übernehmen.

## 5. Abnahmekriterien

- [ ] Bei gesperrten Karten ist kein Motiv erkennbar; Kartenmotive werden erst nach Eigentumsbestätigung geladen.
- [ ] Jede der 4 Reihen hat genau rechts eine Belohnung in gleicher Höhe; jede Spalte darunter eine ausgerichtete Belohnung.
- [ ] Zwei Diagonalpreise stehen unter dem Raster.
- [ ] Beide 16-Karten-Jackpots und ihr Reset bleiben exakt wie bisher.
- [ ] Der Hammer-Vorrat bezieht sich weiter auf das Event-2-Profil.
- [ ] Alle drei Hammerarten und ihre echten Grafiken sind gut erkennbar.
- [ ] Texte/Spielinformation bleiben auffindbar, auch wenn der Einstieg stark verkürzt wird.
- [ ] Keine zusätzlichen API-/Firebase-Lesevorgänge durch UI-Redesign.
- [ ] Tablet-Landscape wirkt hochwertig, Mobile bleibt ohne horizontales Scrollen bedienbar.
- [ ] Wechsel zwischen Sammlung, Hammer-Bingo, Pakete, Info und Event 2 funktioniert weiterhin.

## 6. Technischer Hinweis zu Render

Das UI liegt auf GitHub Pages; das auf Render laufende Backend verarbeitet Echtgeld-freie Spielkonten, Paketkäufe und Bingo-Auszahlungen. Für diesen ersten visuellen Umbau sind weder ein Render-Restart noch neue API-Endpunkte erforderlich. Änderungen an Auszahlungen benötigen gesonderte serverseitige Tests.
