# DOG – Hintergrundbilder für das Design-Studio

Dieser Ordner enthält ausschließlich echte **Seiten- und Bühnenhintergründe**. Spielbrett-Oberflächen und feldfreie Spielplatten-Grafiken gehören ausdrücklich **nicht** in diese Galerie.

Aktuell ist genau **ein Motiv** vorhanden:

- `dog-hintergrund-magisches-schloss.png` – Magisches Schloss am Nebelsee

Im DOG Design-Studio kann links dieses Bild oder »Ohne Hintergrundbild« gewählt werden. Rechts liegen alle Brettdesigns aus `BOARD_STYLES` (unter anderem Zauberwald, Märchental, Küstenabenteuer, Alpenland, Royal-Karten, Goldwellen, Holz und Schiefer).

Neue Hintergrundmotive bitte hier als PNG, JPG oder WebP mit kleingeschriebenem Dateinamen ohne Leerzeichen hochladen und dann in `DOG/appearance-registry.js` unter `SCENE_STYLES` registrieren. Wenn das Bild auch in den separaten Spieleinstellungen für den rechten Seitenbereich erscheinen soll, zusätzlich unter `SIDEBAR_BACKGROUNDS` registrieren. Die Auswahl und gespeicherte Kombinationen werden lokal gespeichert und erzeugen keine zusätzlichen Firebase-Schreibvorgänge.

Die eigentlichen Spielbretter befinden sich unter `DOG/assets/boards/` und `DOG/Bilder/Spielhintergrundbilder/`. Deren Dateien werden nicht als Seitenhintergründe gelistet.
