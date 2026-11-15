# DOG Weihnachts-Rubbellose – individuelle Kartenbilder

Jede Variante bekommt **eine eigene WebP- oder SVG-Hintergrundgrafik**, die keinerlei zufällige
Gewinnsymbole oder fest eingebrannte Münzpreise enthält. Alle Gewinnsymbole,
Beschichtungen und Gewinne werden dynamisch aus dem validierten Render-Los erzeugt.

## 01 Geschenkelinie
- Zielpfad: `DOG/assets/scratch/geschenkelinie-01.webp`
- Erstes fertiges Motiv: Rot-Gold-Geschenkelinie mit **neun bereits goldgerahmten Feldern**. Unter diesen Feldern liegen dynamische Symbole, darüber die interaktive Silberbeschichtung.
- Vorbereitete Datei: **geschenkelinie-01.webp** (1086×1448 Pixel, ca. 414 KB).
- Status: **Bild in GitHub hochgeladen und per CSS eingebunden**. Goldrahmen-Ausrichtung nachjustiert; echter Handytouch-Test noch offen.

## Vier Rubbellose: 2 Einfach (200), 1 Mittel (500), 1 Premium (1000)

1. **Einfach 1 – Geschenkelinie**: 3×3 (9 Felder), bereits als
   `geschenkelinie-01.webp` hochgeladen und mit Rubbeloberfläche eingebunden.
2. **Einfach 2 – Schneeflocken-Bingo / Sammellos**: 4×4 (16 Felder).
   Finale Grafik wurde aus dem vom Nutzer hochgeladenen Eispalast-Original
   `1000030731.png` als 1152×1536-WebP exportiert.
   **Download-Datei:** `schneeflocken-bingo-01.webp` (ca. 577 KB).
   **Zielpfad im GitHub-Frontend:** `DOG/assets/scratch/schneeflocken-bingo-01.webp`.
   **Regel:** Genau drei gleiche Gewinnsymbole an beliebigen Positionen
   ergeben einen Treffer, pro Symbolart höchstens ein Gewinn.
   4–6 🧊-Nietenfelder pro Los zählen nie als Gewinn.
   Server-ID: `snow_collect`; die alte 4-in-einer-Reihe-Karte `snow`
   bleibt nur für alte Kaufbelege verfügbar.
   **Technik:** Servergenerator & eigener Regelprüfer implementiert; CSS-Positionierung
   der sechzehn Silberfelder anhand der Nutzergrafik geprüft und angepasst;
   eine durchgehende Canvas-Rubbeloberfläche mit 90-%-Automatik.
   **Status:** WebP bereit zum Nutzer-Upload, CSS-Bildpfad bereits eingebunden.
   Nach Upload Bildladung und Touch/90-%-Gewinnanzeige auf Smartphone kontrollieren.
3. **Mittel (einzige Variante) – Magischer Wichtelpfad (500 Goldmünzen)**: 4×5 (20 Felder).
   Designvorschlag smaragdgrüner Weihnachtswald mit magischem Weg.
   Ein zusammenhängender Pfad von links nach rechts gewinnt.
   Eingebundenes Motiv: `wichtelpfad-mittel-01.svg` (1086×1448), eigenständiges tiefgrünes Weihnachtswald-Design mit 20 leeren Feldern. Server zeichnet auch gekrümmte Gewinnwege. Browser-/Handy-Endtest offen.
4. **Premium (einzige Variante) – Weihnachtsbaum-Geheimnis (1000 Goldmünzen)**: 5×3 (15 Felder).
   Designvorschlag Violett/Gold mit funkelndem Sternenbaum.
   ⭐🎄🎁 in genau dieser Reihenfolge gewinnt.
   Zielbild: `weihnachtsbaum-geheimnis-01.webp` (noch nicht erstellt).

Das Schneeflocken-Bingo-Motiv ist vorbereitet, das mittlere Wichtelpfad-Motiv direkt eingebunden und das Weihnachtsbaum-Premiummotiv noch in Entwicklung.

**Aktuelle Serverzuordnung:** Einfach (200 Münzen): zufällig Geschenkelinie oder Schneeflocken-Bingo. Mittel (500 Münzen): **nur Magischer Wichtelpfad**. Premium (1.000 Münzen): **nur Weihnachtsbaum-Geheimnis**. Alle drei Kaufstufen bleiben erhalten; an Gewinnchancen, Guthaben oder älteren Losbelegen wird nichts gelöscht.
Frühere Spielfeldregeln bleiben für die Wiederherstellung alter Lose
im Backend lesbar.

Die Spielmechanik und 90%-Rubbelregel stehen im Frontend bereits bereit.

## Implementierungsstatus 15.11.2026
- Nr. 3 ist in GitHub unter `DOG/assets/scratch/wichtelpfad-mittel-01.svg` vorhanden; Felder und Rubbeloberfläche sind eingebunden.
- Der unabhängige Server-Prüfer verlangt für `elf` orthogonal zusammenhängende gleiche Symbole von links nach rechts und vergibt höchstens einen Preis je Symbolart. Diagonalen zählen nicht.
- Der Wichtelpfad ist ausschließlich das mittlere Los für 500 Goldmünzen. Das Premiummotiv des vierten Loses ist weiterhin in Entwicklung.

- 15.11.2026: Hochgeladenes Schneeflocken-Bingo-Bild von `schneeflocken-bingo-01(2).webp` in `schneeflocken-bingo-01.webp` umbenannt; Originaldaten unverändert. Browser-Test offen.
