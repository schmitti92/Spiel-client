# Schmiede der Helden – Bildhintergründe (D1)

Die Seite `dog-forge.html` ist für zwei fertig entworfene, optimierte Bildhintergründe vorbereitet:

| Repo-Datei | Empfohlene Ausrichtung | Dateigröße der vorbereiteten Grafik |
|---|---|---:|
| `dog-forge-art/forge-workshop-desktop.webp` | Querformat (16:9), 1672 × 941 px | ca. 171 KB |
| `dog-forge-art/forge-workshop-mobile.webp` | Hochformat (9:16), 941 × 1672 px | ca. 151 KB |

**Einbau:** Beide WebP-Dateien nach GitHub `schmitti92/Spiel-client` → Branch `main` → Ordner `dog-forge-art` hochladen. Den exakten Dateinamen beibehalten. Die Datei `dog-forge-fx.js` erkennt den mobilen Bildausschnitt anhand von `max-width: 720px`; es sind keine weiteren Codeänderungen nötig.

**Bis zum Hochladen:** `forge-workshop-fallback.svg` ist bereits im Repository und wird als offline-fähiges Fantasy-Schmiedebild angezeigt. Ein fehlendes oder defektes WebP wird nicht als kaputtes Bild angezeigt: Die Seite bleibt bei dieser SVG-Szene.

**Bedienung:** In der Schmiede kann man mit `🏰 Werkstatt an/aus` den Hintergrund auf dem jeweiligen Gerät umschalten. Die Einstellung wird ausschließlich in `localStorage` gespeichert und verändert weder Spielstände noch Rohstoffe. Der optionale Ton-Schalter bleibt davon unabhängig.

**Technik:** Die Oberflächen- und Effekt-Schichten haben dunkle Kontrastverläufe über den Hintergründen, sodass Name, Rohstoffe, Meilensteine und Bestätigungsdialoge lesbar bleiben. Es werden keine zusätzlichen Firebase-Lese- oder Schreibvorgänge benötigt.

**Optionale eigene Bilder:** Beliebige andere selbst erstellte WebP-/PNG-/JPEG-Dateien mit sicheren Dateinamen in denselben Ordner hochladen und anschließend in `dog-forge.html` die Attribute `data-forge-background-desktop` und `data-forge-background-mobile` auf diese Namen umstellen. `data-forge-background` bleibt als Kompatibilitätsfallback bestehen.

**Wichtig:** Die WebP-Dateien sind keine Git-Textdateien. Sie müssen als echte Binärdateien hochgeladen werden (nicht als Base64-Text und nicht als SVG-Verweis auf einen lokalen Dateipfad).
