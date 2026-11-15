# DOG – Vollbild-Seitenhintergründe

Dieser Ordner enthält **Vollbildhintergründe für die DOG-Seite**, keine Spielbretter, Spielfelder oder Dorf-Gebäude. Das eigentliche Weihnachtsdorf in `DOG/christmas-event.html` besitzt einen separaten Hintergrund im Ordner `DOG/weihnachtsevent-bilder/`.

## Standardhintergrund

- `dog-hintergrund-magisches-schloss.png` – Magisches Schloss am Nebelsee, normal auswählbar

## Lichtertal-Weihnachtsevent – fünf gesperrte Belohnungen

Die folgenden Dateien sind bereits vorhanden und als **geplante, gesperrte** Sammlungsinhalte registriert:

- `Lichtertal_Vollbild_Neu_01_Maerchenwald.webp` – Märchenhafter Weihnachtswald
- `Lichtertal_Vollbild_Neu_02_Realistische_Mondnacht.webp` – Realistische Mondnacht
- `Lichtertal_Vollbild_Neu_03_Weihnachtskarte_Aquarell.webp` – Aquarell-Weihnachtskarte
- `Lichtertal_Vollbild_Neu_04_Low_Poly_3D.webp` – Winterwelt in Low-Poly-3D
- `Lichtertal_Vollbild_Neu_05_Magischer_Polarlicht_Fjord.webp` – Magischer Polarlicht-Fjord

Die Metadaten und zukünftigen Belohnungs-IDs stehen in `DOG/christmas-background-catalog.js`. Angezeigt werden sie unter **Meine Sammlung → Hintergründe** sowie in **Weihnachtsevent → Geschenke & Lichter**.

**Wichtig:** Die fünf Motive sind derzeit nicht freischaltbar und nicht ausrüstbar. Die spätere Vergabe braucht nachweislich serverseitig überprüfte Eventbelohnungen für den jeweiligen Spieler. Ein lokaler Flag oder das Vorhandensein einer Bilddatei ist kein Eigentumsnachweis. Zeitpunkt und konkrete Freischaltbedingungen stehen noch nicht fest.

Die normalen wählbaren Seitenhintergründe werden separat in `DOG/appearance-registry.js` unter `SCENE_STYLES` geführt. Erst mit einer sicheren serverseitigen Freischaltprüfung dürfen diese Eventmotive zusätzlich als auswählbare Hintergrunddesigns registriert werden.

Die Gestaltung ändert keine DOG-Spielregeln und erzeugt keine zusätzlichen Firebase-Schreibvorgänge.
