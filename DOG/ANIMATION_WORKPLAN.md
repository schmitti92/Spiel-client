# DOG – Animations-Arbeitsplan
Stand: 14.11.2026 · Repository: schmitti92/Spiel-client · Status: Animationsdurchgang für alle vorhandenen Bereiche umgesetzt; Live-Abnahme offen
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
- [~] **A03 Handkarten.** Kartenausteilen, Umdrehen/Freigeben, Auswählen, Abwählen, Spielen, Ablagestapel und Nachziehen: leichte, kurze Bewegungen ohne verdeckte Karten preiszugeben. `card-visuals.js`, `app.js`, `ui-shell.css`.
- [~] **A04 Spezialkarten.** 1/11 & 13 (Start), 4 (Rückwärts), 7 (Aufteilen), Tauschkarte, Joker: eindeutig erkennbare spezifische Visuals, ohne andere Regeln anzudeuten. Kurzer Effekt am passenden Ort, nie ganze Anzeige blockieren.
- [~] **A05 Rundenübergänge & Partnerkartentausch.** Kartenwechsel zwischen Partnern, nächste Runde, Spielerwechsel, automatische Botschritte. Keine unnötigen Verzögerungen; keine Karteninfos von Mitspielern anzeigen.
- [~] **A06 Zugfeedback.** Auswahl einer Figur, Abwahl, erlaubter/unerlaubter Klick, bestätigter Zug, Serverprüfung, Timeout/Fehler. Visuelle Rückmeldung ohne automatische Zugvorschläge (DOG soll Kopfrechnen beibehalten).

### Phase B – Sichtbarkeit und Spannung
- [~] **B07 Spielerleiste & Zuganzeige.** Aktiven Spieler, Teamfarben, Emblem/Krone, Profilbilder, Turn-Ende dezent hervorheben; keine dauerhafte Animation, die von Spielzügen ablenkt.
- [~] **B08 Brett & Spielfeld.** Ansteuern von Feldern, schützende Startfelder, Zielbahnen, Auswahlring, Zoomen/Schwenken, Brettdesignwechsel; Bewegungen müssen mit *allen* Editor-Koordinaten kompatibel sein. Keine animierte Änderung der logischen Felder.
- [~] **B09 Partieende & Siegerehrung.** Bestehendes Einblenden prüfen, optional sanfter Team-Siegesmoment/Leuchtakzent/Konfetti mit reduzierter Partikelzahl. Nur 1x pro Match, nicht bei jeder Statusaktualisierung.

### Phase C – Oberfläche, Personalisierung, soziale Funktionen
- [~] **C10 Menüs, Fenster und Buttons.** DOG-Menü, Einstellungen, Joker-Dialog, Regeln, Erweiterungs-Tabs: einheitliche Öffnen-/Schließen-Übergänge und Klick-Feedback; keine Blockade der Bedienung.
- [~] **C11 Lobby & Spielstart.** Spielplatte auswählen, Avatare auswählen, Raum beitreten, Bereit-/Startstatus (sofern vorhanden); visuell ruhiger Übergang zum Spiel. Gemeinsame Lobby sorgfältig gegen andere Spiele absichern.
- [~] **C12 Sammlung & Freischaltungen.** Vorhandene Sammelseite: Kategorien, Detailansicht, Auswählen, Ausrüsten, echte Freischaltmeldungen; keine Animationen für nicht existierende Belohnungen.
- [~] **C13 Emoji-Reaktionen.** Bestehendes Emoji-Overlay, Ein-/Ausblendung, Mehrfachreaktionen, gute Sichtbarkeit auf kleinen Bildschirmen und reduzierte Bewegung; Nachrichten über vorhandenen Render-WebSocket, keine Extra-Synchronisation.
- [~] **C14 Bretteditor & Designstudio.** Platzieren, Versetzen, Raster/Snap, Speichern, Design-/Hintergrundvorschau, Figurenfarben und Kartenoptik; Animationen unterstützen präzise Bearbeitung statt Koordinaten zu verfälschen.

### Phase D – Qualität, zukünftige Erweiterbarkeit
- [~] **D15 Animationseinstellungen.** Optional später: Aus / Normal / Schnell, gespeichert *nur lokal*, plus automatische Beachtung von `prefers-reduced-motion`. Keine Pflichtoption oder neue Online-Eigenschaft.
- [~] **D16 Online-Konsistenz.** Vier Teilnehmer mit unterschiedlichen Displays; neue Revisionszustände, Doppelupdates, Reconnect, mehrere kurz aufeinanderfolgende Züge, Tab-Wechsel; Animation darf keinen Zustand zurückrollen oder Zug blockieren. Render muss keine Einzelbilder senden.
- [~] **D17 Performance & Barrierefreiheit.** FPS/Framezeiten auf Handy/Tablet, Akku/CPU, wenig DOM-Rebuilds, SVG/Transform statt Layout-Reflow, kein Scroll-/Tap-Konflikt, keine flackernden Dauerloops; animiertes Element bei Tab-Wechsel korrekt beenden.
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

## Nächster konkreter Schritt: reale Abnahme (D18)
Die erste, nicht blockierende Animationsfassung ist für die Punkte A01–D17 implementiert. Bevor ein Punkt `[x]` erhält, müssen die sichtbaren Abläufe auf echten Endgeräten und mit mehreren Online-Teilnehmern abgenommen werden. Besonders zu prüfen: 7er-Karte mit mehreren Schlägen, unterbrochene Netzwerkverbindung, Board-Zoom während der Bewegung, kleine Displays, lokale 2–4-Spieler-Übergabe und Betrieb mit Animation = Aus.

## Fortschrittsprotokoll (14.11.2026)
| Paket | Implementierung | Ausstehende Abnahme |
| --- | --- | --- |
| A01–A02 | Verbesserte Schrittbewegung; sofortiges Startbild, gestaffelte Schläge, Ein-/Aussetzen und Goal-/Capture-Effekte (`DOG/piece-animations.js`) | Sichtkontrolle lange Züge/7er/Sonderfelder auf echten Browsern |
| A03–A06 | Karten-Handanimationen, Ablagestapel, Spezialkarten-Lichtfarben, Server-Check-Indikator und ungültiger Zug (`DOG/ui-animations.js`, `DOG/motion.css`) | Kartenübergabe und Joker auf Mehrspielergeräten |
| B07–B09 | Spielerwechsel-Highlight, Auswahlring, lokaler Brettpicker, Sieg-Highlights | Kleine Bildschirme, Zoom/Touch, kein doppelter Sieger-Effekt |
| C10–C14 | Menüs, Lobby-Boardpicker, Profilwahl, Sammlung, Emoji-Overlay, Bretteditor, Designstudio | Bedienbarkeit/Lesbarkeit Tablet + Mobil, bestehende Sperren |
| D15 | Geräteeinstellung Normal/Schnell/Aus, `prefers-reduced-motion` (`DOG/motion-settings.js`) | Nach Neustart und Wechsel der Geräteansicht prüfen |
| D16 | Deduplizierung bei wiederholten Raumzuständen und kein separates Animations-Networking | 2–4 echte Online-Spieler und Reconnect |
| D17 | SVG-Transforms, reduzierte unnötige Hand-/Spieler-Neuzeichnungen und reduzierte Bewegung | FPS/CPU-Messung auf schwachem Handy/Tablet |
| D18 | Schriftlicher Plan und neue automatisierte Tests angelegt | Reale Gesamt-Abnahme noch nicht durchgeführt |

### Technische Tests
- `tests/dog-piece-animations.test.mjs` (Figurenzüge, 4 rückwärts, Start, Ziel, Tauschen, Schlagen und First-Frame)
- `tests/dog-motion-settings.test.mjs` (lokale Geschwindigkeiten und reduzierte Bewegung)
- `tests/dog-ui-animations.test.mjs` (keine doppelten Animationen bei gleichen Online-Daten)
- Eingebunden in `.github/workflows/dog-board-check.yml`. Automatische Tests reichen für visuelle 4-Spieler-Abnahme nicht aus.
- Backend `serverfinal` und DOG-Regel-Engine für diese Arbeiten unverändert; keine neuen Firestore-Schreibwege.

### Fertigstellungsregel
Ein Paket wird nur dann als `[x]` markiert, wenn Code-Checks und die passenden echten Browser-/Spieler-Szenarien nachweislich erfolgreich waren. Ohne manuelle Browser-Überprüfung bleibt `[~]` korrekt.
