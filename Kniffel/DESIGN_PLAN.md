# Kniffel – Referenztreue und Phasen-Gates (Stand 2026-11-01)

## Leitbild
Premium-Wald-Kniffel im Querformat, Holz/Papier/Filz, auf Grundlage des im Chat ausgewählten Entwurfs Nr. 7. **Ein gerendertes Referenzbild ist keine HTML-Vorlage**: Texte, Würfel, Scores und Schaltflächen bleiben echte DOM-Elemente. Vor einer behaupteten 1:1-Abnahme ist ein exportiertes Original-Referenzbild im Repository erforderlich; das bisherige Kartenmotiv ist lediglich eine Übergangsgrafik.

## Bestand (Repository-Audit)
- `index.html`: lokale Navigation, Setup für 1–4 Plätze, Fullscreen-Steuerung separat, Scorecard links, Tablett rechts.
- `rules.js`: eigenständige Offline-Spielregeln, 13 Kategorien, 35er-Bonus.
- `game.js`: Spielzustand, Botzüge und Rendering noch in einer Datei; keine Änderung im Designschritt.
- `fullscreen.js`: unabhängig von Spielmodul; auf Tablet durch Nutzer-Screenshot bestätigt.
- `style.css`: mehrere aufeinanderfolgende Media-Query-Overrides aus v1.1–1.8. **Technische Schuld**: bereinigen, bevor neue Layout-CSS hinzukommt.
- `theme-woodland.css`: getrenntes Farbschema, aber zahlreiche `!important` und ein unscharfes **Kachelbild** als Hintergrund; kein eigenständiges Waldmotiv.
- `#social-extension`: Platzhalter, noch keine Reaktionen, Witze oder Showgrass-Funktionen.

## Designvertrag – Zielproportionen
Referenz-Viewport: Tablet Querformat 1536 × 960 (Screenshot im echten Vollbild).
- Kopfzeile: ca. 5–7 % der Höhe.
- Spielerleiste: ca. 4–6 %.
- Hauptspielfeld: Resthöhe, links Punkteblock **46 %**, rechts Würfelbereich **54 %** abzüglich Abstand.
- Hintergrund: immer sichtbarer Rand/Atmosphäre, **kein Text** und keine Spielobjekte im Bild.
- Punkteblock: 1 Tabellenkopf + 13 Kategorien + 3 Summenzeilen = 17 Zeilen; ohne Scrollen sichtbar, auch bei 4 Spielern.
- Würfel: 5 echte interaktive DOM-Würfel, Mindest-Touchfläche 44 × 44 CSS-Pixel.
- Erweiterungs-Dock: reservierter Bereich am unteren Rand der Würfelarena; keine Überdeckung von Würfel-/Wertungskontrollen.
- Andere Bildschirmgrößen: responsive Skalierung; bei sehr kleinen Viewports ist ein eigener kompakter Aufbau statt abgeschnittener Tabellen erlaubt.

## Grafik-Layer und Dateikonventionen
`Kniffel/assets/forest.webp` – reine Hintergrundszene ohne UI oder Schrift.
`Kniffel/assets/wood.webp` – kachelbare Holzoberfläche.
`Kniffel/assets/paper.webp` – kachelbare Papiertextur.
`Kniffel/assets/felt.webp` – kachelbarer grüner Filz.
`Kniffel/assets/decorations/` – optionale transparente Dekorationen.
Fallbacks müssen bei fehlenden Assets per CSS-Farbverlauf funktionieren; keine defekten Bild-Platzhalter. Kein unnötiges Laden von Remote-Bildern: offline bleibt Pflicht.

## Verbindliche Gate-Prüfung vor jeder Phase
1. **Bestand analysieren**: geänderte Dateien und CSS-Spezifität, Abhängigkeiten, bekannte Probleme.
2. **Planvergleich**: welche Vorgabe erfüllt / gefährdet / noch offen?
3. **Kleinste sichere Änderung**: isolierte Dateien, keine neue Regelmechanik.
4. **Technische Prüfung**: HTML/JS/CSS, bestehende Regeltests und Interaktion.
5. **Visuelle Prüfung**: Screenshot im echten Vollbild (Tablet quer), Scorecard mit 1–4 Spielern, kein Scrollen/Überlappen.
6. **Abnahme**: erst danach nächste Phase; bei Abweichung Plan korrigieren und dokumentieren.

## Phase 1 – Bestandsaufnahme und Referenzplan
- [x] Live-Struktur und zentrale Dateien gelesen.
- [x] Layout-Proportionen und Zielkomponenten dokumentiert.
- [x] CSS-Override-Schuld und unpassendes Hintergrund-Kachelmotiv erkannt.
- [ ] Originales Referenzbild als dedizierte Vergleichsdatei verfügbar.
- [ ] Automatisierter visueller Screenshotvergleich möglich.

## Phase 2 – Assetproduktion (noch nicht abgenommen)
Erst Hintergrundbild als eigenständige, UI-freie Szene erstellen, dann Papier/Holz/Filz; Assets einzeln integrieren und auf Tablet prüfen. Nicht die gesamte Referenzgrafik als Hintergrund mit eingebrannten UI-Elementen verwenden.

## Risiko- und Korrekturliste
- **Hoch**: bestehende CSS-Regeln überschreiben sich. Vor dem nächsten größeren Layoutumbau zu konsistentem Layout-CSS konsolidieren.
- **Hoch**: Kachelmotiv enthält Schrift/Objekte und eignet sich nicht als echtes Spielhintergrundbild. Durch UI-freies Waldmotiv ersetzen.
- **Mittel**: vier Spieler verengen Punkteblock-Spalten; eigenständigen 4-Spieler-Test einplanen.
- **Mittel**: Fullscreen darf nicht wieder an Spielstart oder asynchronen Code gekoppelt werden.
- **Mittel**: optionales Social-Dock darf nicht die 17 Tabellenzeilen oder Würfelsteuerung verdrängen.

## Stand
Phase 1: technische Inventur abgeschlossen, visuelle 1:1-Referenzmessung noch offen. Phase 2: nicht gestartet. Keine Online-Implementierung.
