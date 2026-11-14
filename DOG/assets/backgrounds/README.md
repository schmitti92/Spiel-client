# DOG – Hintergrundgalerie

Hier liegen zukünftig die **Seitenhintergründe** von DOG (nicht die Spielbretter).

- Erstes Motiv: `dog-hintergrund-magisches-schloss.png`
- Weitere Motive als separate PNG-, JPG- oder WebP-Dateien hier ablegen.
- Dateinamen: klein, ohne Leerzeichen oder Umlaute, mit Bindestrichen.
- Spielbretter liegen getrennt in `DOG/assets/boards/`.

**Im Spiel aktiv:** `dog-hintergrund-magisches-schloss.png` ist jetzt der Standardhintergrund der rechten DOG-Steuerleiste. Die Auswahl liegt unter **Einstellungen → Hintergrund der rechten Seite**. Daneben gibt es die Option **Ohne Hintergrundbild**.

**Weitere Motive:** Datei in diesen Ordner hochladen und anschließend als Eintrag in `DOG/appearance-registry.js` unter `SIDEBAR_BACKGROUNDS` registrieren. Damit wird sie automatisch in der Auswahlliste angezeigt. Diese Einstellung bleibt lokal und verursacht keine zusätzlichen Firebase-Schreibvorgänge.
