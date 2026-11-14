# DOG – Mastervorlage für Kartendesigns

**Feste Maße:** 700 × 980 Pixel (Hochformat 5:7), sRGB-PNG. Alle Kartenvorderseiten und die Rückseite einer Edition besitzen exakt diese Größe.

## Einheitliche Dateinamen (15 Bilder)

`1-11.png`, `2.png`, `3.png`, `4.png`, `5.png`, `6.png`, `7.png`, `8.png`, `9.png`, `10.png`, `12.png`, `13.png`, `tausch.png`, `joker.png`, `rueckseite.png`.

## Gestaltungsraster

- **Canvas:** 700 × 980 Pixel. Gleicher Goldrahmen und gleicher Eckenradius.
- **Außenrand:** ca. 24 Pixel; **Rahmenlinie:** ca. 16 Pixel.
- **Sichere Zone** für Zahlen, Figuren und Texte: mindestens 40 Pixel zum Rand.
- **Kopfzeile:** y=32 bis 138 (Wert, kleines Symbol).
- **Motivbereich:** y=148 bis 795 (groß, kontrastreich, auf Tablets gut lesbar).
- **Funktionsbalken:** optional y=800 bis 942.
- Normale Zahlenkarten benötigen keinen Funktionsbalken, besondere Karten möglichst einen gut erkennbaren.

## Spezialkarten – Regeln müssen visuell korrekt bleiben

- **1/11 und 13:** Figur darf das Haus verlassen; grünes Haus-/Startsymbol.
- **12:** Normale Zahlenkarte, **kein** Haus-Symbol.
- **4:** Vorwärts und rückwärts.
- **7:** Sieben Schritte auf Figuren aufteilen.
- **Tausch:** Figuren tauschen.
- **Joker:** Freie erlaubte Kartenwahl.

## Eine weitere Edition hinzufügen

1. Ordner `DOG/assets/karten/kartendesign-02/` (usw.) anlegen und **alle 15 Bilder** mit den festen Namen hochladen.
2. Automatischer GitHub-Workflow erstellt im Unterordner `normiert/` die 700×980-Spielbilder. Alternativ lokal `python DOG/assets/karten/normalisieren_karten.py --edition kartendesign-02` (Pillow benötigt).
3. Neue Edition in `DOG/card-visuals.js` bei `CARD_EDITIONS` registrieren. Die Spiellogik in `DOG/engine.js` und die Netzwerk-Synchronisierung nicht ändern.
4. Auf Tablet im Querformat sechs Karten, Joker-Fenster und Stapel prüfen.

**Wichtig:** Die Originalbilder werden nie überschrieben. Der Unterordner `normiert/` enthält nur abgeleitete Spieldateien. Frühere PNGs von Kartendesign 01 sind aus einer Collage ausgeschnitten und haben verschiedene Bildformate; bei der ersten Normalisierung werden sie einmalig neu skaliert. Für spätere Editionen am besten gleich im Masterformat zeichnen, damit keine Nachbearbeitung die Proportionen beeinflusst.
