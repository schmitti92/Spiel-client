# DOG – Animations-Arbeitsplan
Stand: 14.11.2026 · Repository: schmitti92/Spiel-client · Status: Planung
Ziel: Alle **tatsächlich vorhandenen** DOG-Bereiche einmal systematisch auf sinnvolle Animationen prüfen und abschnittsweise überarbeiten. Bereits eingebaut: erste feldweise Spielfiguren-Bewegung, Start-/Tausch-/Schlag-/Zieleinlauf-Effekte, Auswahl, Spieleremblem, Siegerehrung (DOG/piece-animations.js, DOG/motion.css). Diese Implementierung wird im ersten Paket noch einmal qualitativ geprüft.

## Vorgehensweise für JEDES Paket
1. **Ist-Zustand prüfen:** existierende CSS-Animationen, JS-Bewegungen, Klickpfade, Mobil- und Onlineverhalten erfassen.
2. **Effekte auswählen:** nur Animationen mit klarem Nutzen (Orientierung, Rückmeldung, Freude), keine Ablenkung oder unnötige Wartezeit.
3. **Sauber implementieren:** Darstellungsmodul statt Spiellogik ändern; alte Effekte nicht doppeln; bestehende Designs respektieren.
4. **Prüfen:** Lokal mit Bots, Touch/Tablet, Tastatur wenn relevant, 2–4 Online-Spieler für synchronisierte Aktionen, reduzierte Bewegung; zielgerichtete automatisierte Tests.
5. **Abschließen:** GitHub-Commit, Tests, kurzer Bericht mit Vorher/Nachher und offenem Punkt; Status unten auf erledigt ändern.

## Priorisierte Arbeitspakete
Status-Legende: [ ] ausstehend, [~] erste Fassung vorhanden/erneut prüfen, [x] abgenommen.

### Phase A – Kernbewegungen und Aktionen (höchste Priorität)
- [~] **A01 Spielfiguren auf dem Laufweg.** Bestehende Animation auf Gleichmäßigkeit, sanften Sprung je Feld, Kurven, Vorwärts/Rückwärts, 1–13 Felder, Zoom und Figurenüberschneidung prüfen. Ziel: sichtbarer Weg, nicht teleportiert; keine falsch angezeigten Positionen. Code: `app.js`, `piece-animations.js`, `motion.css`.
- [~] **A02 Start, Ziel, Figurentausch und Schlagen.** Start aus dem Haus, Einbiegen ins Ziel, Ziellandung mit dezentem Effekt, Tausch zweier Figuren, Rückkehr geschlagener Figuren; bei Karte 7 mehrfaches Schlagen visuell prüfen. Ziel: jedes Ereignis sofort verständlich.
- [ ] **A03 Handkarten.** Kartenausteilen, Umdrehen/Freigeben, Auswählen, Abwählen, Spielen, Ablagestapel und Nachziehen: leichte, kurze Bewegungen ohne verdeckte Karten preiszugeben. `card-visuals.js`, `app.js`, `ui-shell.css`.
- [ ] **A04 Spezialkarten.** 1/11 & 13 (Start), 4 (Rückwärts), 7 (Aufteilen), Tauschkarte, Joker: eindeutig erkennbare spezifische Visuals, ohne andere Regeln anzudeuten. Kurzer Effekt am passenden Ort, nie ganze Anzeige blockieren.
- [ ] **A05 Rundenübergänge & Partnerkartentausch.** Kartenwechsel zwischen Partnern, nächste Runde, Spielerwechsel, automatische Botschritte. Keine unnötigen Verzögerungen; keine Karteninfos von Mitspielern anzeigen.
- [ ] **A06 Zugfeedback.** Auswahl einer Figur, Abwahl, erlaubter/unerlaubter Klick, bestätigter Zug, Serverprüfung, Timeout/Fehler. Visuelle Rückmeldung ohne automatische Zugvorschläge (DOG soll Kopfrechnen beibehalten).

### Phase B – Sichtbarkeit und Spannung
- [ ] **B07 Spielerleiste & Zuganzeige.** Aktiven Spieler, Teamfarben, Emblem/Krone, Profilbilder, Turn-Ende dezent hervorheben; keine dauerhafte Animation, die von Spielzügen ablenkt.
- [ ] **B08 Brett & Spielfeld.** Ansteuern von Feldern, schützende Startfelder, Zielbahnen, Auswahlring, Zoomen/Schwenken, Brettdesignwechsel; Bewegungen müssen mit *allen* Editor-Koordinaten kompatibel sein. Keine animierte Änderung der logischen Felder.
- [~] **B09 Partieende & Siegerehrung.** Bestehendes Einblenden prüfen, optional sanfter Team-Siegesmoment/Leuchtakzent/Konfetti mit reduzierter Partikelzahl. Nur 1x pro Match, nicht bei jeder Statusaktualisierung.

### Phase C – Oberfläche, Personalisierung, soziale Funktionen
- [ ] **C10 Menüs, Fenster und Buttons.** DOG-Menü, Einstellungen, Joker-Dialog, Regeln, Erweiterungs-Tabs: einheitliche Öffnen-/Schließen-Übergänge und Klick-Feedback; keine Blockade der Bedienung.
- [ ] **C11 Lobby & Spielstart.** Spielplatte auswählen, Avatare auswählen, Raum beitreten, Bereit-/Startstatus (sofern vorhanden); visuell ruhiger Übergang zum Spiel. Gemeinsame Lobby sorgfältig gegen andere Spiele absichern.
- [ ] **C12 Sammlung & Freischaltungen.** Vorhandene Sammelseite: Kategorien, Detailansicht, Auswählen, Ausrüsten, echte Freischaltmeldungen; keine Animationen für nicht existierende Belohnungen.
- [ ] **C13 Emoji-Reaktionen.** Bestehendes Emoji-Overlay, Ein-/Ausblendung, Mehrfachreaktionen, gute Sichtbarkeit auf kleinen Bildschirmen und reduzierte Bewegung; Nachrichten über vorhandenen Render-WebSocket, keine Extra-Synchronisation.
- [ ] **C14 Bretteditor & Designstudio.** Platzieren, Versetzen, Raster/Snap, Speichern, Design-/Hintergrundvorschau, Figurenfarben und Kartenoptik; Animationen unterstützen präzise Bearbeitung statt Koordinaten zu verfälschen.

### Phase D – Qualität, zukünftige Erweiterbarkeit
- [ ] **D15 Animationseinstellungen.** Optional später: Aus / Normal / Schnell, gespeichert *nur lokal*, plus automatische Beachtung von `prefers-reduced-motion`. Keine Pflichtoption oder neue Online-Eigenschaft.
- [ ] **D16 Online-Konsistenz.** Vier Teilnehmer mit unterschiedlichen Displays; neue Revisionszustände, Doppelupdates, Reconnect, mehrere kurz aufeinanderfolgende Züge, Tab-Wechsel; Animation darf keinen Zustand zurückrollen oder Zug blockieren. Render muss keine Einzelbilder senden.
- [ ] **D17 Performance & Barrierefreiheit.** FPS/Framezeiten auf Handy/Tablet, Akku/CPU, wenig DOM-Rebuilds, SVG/Transform statt Layout-Reflow, kein Scroll-/Tap-Konflikt, keine flackernden Dauerloops; animiertes Element bei Tab-Wechsel korrekt beenden.
- [ ] **D18 Gesamt-Abnahme.** Ausgewählte Szenarien nochmals vollständig durchspielen; fehlende Effekte dokumentieren; Versionsübersicht und finaler Stilguide für zukünftige Themen/Spielfiguren erstellen.

## Stilregeln
- **Spielfiguren:** warm, flüssig, leicht federnd; Bewegung nachvollziehbar vor Partikeleffekten.
- **Karten:** fühlbares Aufnehmen/Ablegen; kurze, leise Übergänge.
- **Bestätigung:** kurze Glanz-/Farbimpulse; Fehler sanft, aber erkennbar.
- **Besondere Ereignisse:** deutlich beeindruckender als normale Aktionen, aber sparsam.
- **Tempolimit:** normale kurze Bedienreaktionen ca. 120–280 ms, Spielfiguren abhängig vom Weg; lange Visuals dürfen Entscheidungen und nächsten Zug nicht blockieren.
- **Keine zusätzlichen Firestore-Schreibvorgänge.** Animationen nur aus bestehender lokaler/Render-Spielzustandsänderung ableiten. `engine.js` und serverseitige Regeln bleiben unverändert.
- **Nicht vorhandene Funktionen nicht vortäuschen:** Magie/Items/Events sind aktuell teilweise Platzhalter und kommen erst als eigenständiger Funktionsumfang an die Reihe.

## Abnahmekriterien pro Paket
- [ ] Die Animation verbessert die Verständlichkeit und wird nicht störend.
- [ ] Browser-Tests und vorhandene DOG-Regressionstests laufen.
- [ ] Lokales Spiel und Online-Spiel verhalten sich logisch identisch.
- [ ] Desktop, Tablet (Querformat), Mobilgerät, Touch, Zoom und wechselnde Designs funktionieren.
- [ ] `prefers-reduced-motion` ist respektiert.
- [ ] Keine neuen Netzwerk-/Firebase-Vorgänge, keine Änderung von Spielständen oder Belohnungen.

## Nächster konkreter Schritt
**A01 – Spielfiguren auf dem Laufweg** starten: aktuelles Bewegungsmodul in drei Situationen (lange Zugkarte, 4 rückwärts, Zieleinlauf mit Zoom) untersuchen, Schritttempo/Unterbrechungen optimieren, Tests ergänzen und A01 nach manueller Abnahme abhaken. Danach A02 → A03 usw.

## Fortschrittsprotokoll
| Paket | Status | Implementierung / Abnahme |
|---|---|---|
| A01–A02 | Erste Fassung, Review offen | `DOG/piece-animations.js`, `DOG/motion.css` |
| B09 | Erste Fassung, Review offen | `DOG/motion.css` |
| Alle übrigen | Ausstehend | — |
