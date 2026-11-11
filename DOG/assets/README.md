# DOG-Grafikpakete

Hier können wir künftig eigene Bilder für DOG sammeln, ohne an der Spielmechanik
etwas zu ändern.

Empfohlene Ordner:

- `board/` – Hintergründe und Spielfeldmotive (z. B. `board/winter.webp`)
- `cards/<motiv>/` – Vorder- und Rückseiten der Karten
- `pawns/` – alternative Spielstein-Grafiken
- `events/<event-id>/` – Event-Hintergründe und Animationen

Ein Hintergrund lässt sich im Registry-Eintrag `DOG/appearance-registry.js`
als `image: './assets/board/winter.webp'` angeben. Kartenmotive erhalten
optional `faceImage`, `specialImage` und `backImage`.

Bis die Dateien existieren, verwendet DOG weiterhin ein vollständiges
CSS-/SVG-Motiv. Die Felder, Startplätze, Zielfelder, verdeckten Karten und
Spielregeln sind von diesen Bilddateien unabhängig.

Für eine bessere Ladezeit empfehlen sich optimierte WebP-Dateien,
keine unnötig großen PNGs, und für animierte Inhalte nur kurze Sequenzen.
Keine Bilder aus unbekannten Quellen direkt über externe URLs einbinden.
