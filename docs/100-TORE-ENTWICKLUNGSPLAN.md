# ⚔️ 100 Tore – Gemeinsamer Entwicklungs- und Aufgabenplan

> **Verbindlicher Arbeitsplan** für die schrittweise Verbesserung von „100 Tore“ auf GitHub `main`.
> Erstellt: **12. November 2026** · Status: **Plan angelegt – noch keine der neuen Aufgaben abgenommen**.
> Beteiligte Repositories: [Spiel-client](https://github.com/schmitti92/Spiel-client) (Frontend, GitHub Pages) und [serverfinal](https://github.com/schmitti92/serverfinal) (Backend, Render, Firestore).

## 0. Wie wir diesen Plan abarbeiten

- **Eine Aufgabe nach der anderen**, möglichst in kleinen, rückrollbaren Änderungen. Dabei keine bestehenden Funktionen entfernen.
- **Status nur nach tatsächlicher Arbeit ändern:** `[ ]` offen, `[-]` in Arbeit (in normalem GitHub-Markdown notfalls als `[ ]` mit Zusatz), `[x]` abgeschlossen. Jede abgeschlossene Aufgabe erhält Datum, Commit(s) und Testnachweis.
- **Reihenfolge:** zunächst Messbarkeit & Datenkonsistenz, danach Online-Synchronisation, Kampfgefühl, Minispiele, Schlusswertung, Fortschritt/Schmiede, DOG-Unlock und Abnahme.
- **Vorher/Nachher vergleichen**, speziell Datenbank-Reads/Writes, sichtbare Verzögerungen, API-Fehler und Verhalten bei Verbindungsunterbrechung.
- **Prüfen auf `main`**, CI und Deployment kontrollieren. Automatisierte Tests sind Pflicht; eine praktische Prüfung auf Android und mit drei Spielern bleibt zusätzliche Pflicht.
- Dieser Plan ist die **einzige maßgebliche Checkliste**. Nicht parallel widersprüchliche Statuslisten pflegen.

### Arbeitsvorlage für jeden Schritt

| Feld | Eintrag |
|---|---|
| Aufgaben-ID | z. B. `S-03` |
| Status | Offen / In Arbeit / Testbereit / Abgenommen |
| Änderung | Kurz: Was wurde verbessert? |
| Betroffene Bereiche | Client / Server / beide |
| Prüfnachweis | Tests, Kampf-Szenario, Ergebnis |
| Firestore-Auswirkung | Reads vorher/nachher, Writes vorher/nachher; oder ausdrücklich „unverändert“ |
| GitHub-Commits | SHA(s), Deployment-Status |
| Abschluss | Datum und ggf. verbleibende Einschränkung |

## 1. Oberstes Prinzip: Firebase/Firestore so sparsam wie möglich, so viel wie nötig

**Leitsatz: Visuell lokal, Spielregeln auf dem Server, dauerhaft speichern nur bei wirklichen Zustandsänderungen.**

1. **Keine Firestore-Reads oder -Writes pro Animation / pro Bildframe / pro Countdown-Schritt.** Waffenbewegungen, Partikel, lokale Zeitleisten, HP-Übergänge, Glücksräder, Sounds und Dialoge berechnen sich im Browser aus der letzten bestätigten Spielansicht und Server-Zeitstempeln.
2. **Schreibzugriffe nur für relevante Aktionen:** Kampfstart/Bereit, gültige Minispielergebnisse, endgültiges Kampfergebnis, Tor-/Belohnungsfortschritt, Kistenöffnung und Schmiedeänderung. Idempotente Request-IDs verhindern Doppelbuchungen.
3. **Minispielantworten bündeln, wenn dies fair und sicher möglich ist:** Mathe, Farbe/Symbole und Kettenbrecher senden ihr Ergebnis grundsätzlich gesammelt, nicht einen Firestore-Write pro Tipp. Sofortiges visuelles Feedback bleibt lokal und als *vorläufig* erkennbar.
4. **Server bleibt autoritativ** für Zufall, Schaden, HP, Sieg, Münzen, Materialien, Freischaltungen und Zeitfenster. Keine Sicherheits- oder Fairnessverluste für Sparsamkeit.
5. **Push statt aggressives Polling, wo ein echter Vorteil messbar ist:** vorhandene WebSocket-Infrastruktur prüfen und nur ereignisbasierte Status-Updates übertragen; HTTP-Polling als verlässlichen Fallback behalten. Nicht blind Firebase-Listener pro Widget ergänzen.
6. **Nur Änderungen übertragen:** kompaktes Ereignis / Revision / Sequenznummer statt immer die gesamte Kampfansicht, sofern die Konsistenz gewährleistet ist. Bei Lücken einen vollständigen GET zur Wiederherstellung.
7. **Adaptive Aktualisierung:** hohe Frequenz nur bei kritischen Ereignissen (Kampfstart, Stufenwechsel, bestätigter Einschlag), sonst langsamer; in versteckten Tabs keine sinnlosen Refreshes. Wiederholungsanfragen mit exponentiellem Backoff und Obergrenze.
8. **Bots serverseitig gesammelt fortschreiben**, nicht jede Simulationshandlung in einer eigenen Transaktion. Bots dürfen keine unkontrollierten Transaktionskaskaden durch häufige GETs auslösen.
9. **UI-only-Daten lokal halten:** Effekteinstellungen, Kamera, Wiederholung, Dialog-/„Bestätigt“-Status möglichst in `localStorage` oder flüchtigem Zustand. Eine serverseitige Quittierung nur dann hinzufügen, wenn sie tatsächlich geräteübergreifend benötigt wird; sonst keine zusätzlichen Firestore-Writes.
10. **Wirkliche Kosten messen:** Ein HTTP-GET ist nicht dasselbe wie ein Firestore-Read; die serverseitig angestoßenen Datenbankzugriffe zählen. Auch Transaktions-Retries, Firestore-Snapshots, Bot-Fortschritte und Hintergrundaktualisierungen gehören in die Bilanz.

### Mess- und Schutzkriterien (zuerst Ausgangswert ermitteln)

| Messgröße | Ziel / Schutzregel |
|---|---|
| Firestore-Reads je vollständigem Bosskampf mit 1/2/3 Spielern und 2 Bots | **Vorher/Nachher messen.** Als Optimierungsziel zunächst **mindestens 30 % weniger Reads** in vergleichbaren Läufen anstreben, ohne schlechtere Synchronisation |
| Firestore-Writes je vollständigem Bosskampf | **Keine zusätzlichen UI-/Animations-Writes**; gegenüber dem Ist-Zustand nicht steigern, außer eine nachgewiesene notwendige dauerhafte Aktion erfordert es |
| Reads/Writes bei 5 Minuten Leerlauf in Lobby/Schmiede/Karte | Separat messen und überflüssige periodische Datenbankzugriffe abbauen |
| Minispiel-Eingaben | **0 still verlorene bestätigte Eingaben** im reproduzierbaren Test; Retry/Quittung muss verständlich bleiben |
| Doppelvergabe von Toren, Rohstoffen, Belohnungen | **0** durch idempotente Servertransaktionen |
| Sichtbare Verzögerung zwischen Spielern | Vergleich mit Baseline; **niedrige Verzögerung priorisieren**, insbesondere bei Kampfstart, Treffern und Abschluss. Kein starres Versprechen ohne echte 3-Geräte-Messung |
| Netzwerkausfall / Tab-Wechsel | Nach Wiederverbindung genau einen korrekten Stand, keine wiederholte Schadensanimation oder doppelte Belohnung |
| Auflösung | Android quer/hoch, kleine Smartphones, Desktop; keine verdeckten Aktionen oder abgeschnittenen Resultate |

**Wichtig:** Die 30-%-Reduktion ist ein *Optimierungsziel*, kein bereits gemessener oder garantierter Wert. Messung und Spielfluss entscheiden über den endgültigen Kompromiss.

## 2. Phasen und abhakbare Aufgaben

### Phase A – Ist-Zustand messen und absichern `P0`
*Zuerst durchführen, damit jede spätere Verbesserung nachweisbar bleibt.*

- [ ] **A-01 – Firestore-Kosten-Baseline:** Firestore-Lese- und Schreibvorgänge für einen vollständigen 135-s-Bosskampf mit 1, 2 und 3 Helden sowie mit Nova/Titan erfassen. Zusätzlich 5 Minuten Leerlauf prüfen. **Fertig:** Vergleichstabelle mit Zählweise und reproduzierbarem Testszenario.
- [ ] **A-02 – Netzwerk- und Timing-Baseline:** API-Aufrufe pro Minute, Antwortzeiten, Verzögerungen bei Start/Runden/Treffern/Resultat, abgebrochene Requests erfassen. Keine sensiblen Tokens oder Nutzerdaten loggen. **Fertig:** dokumentierte Zahlen und konkrete Problemstellen.
- [ ] **A-03 – Regressions-Schutz:** Automatisierte Tests für 1/2/3 Helden, fünf Minispiele, 20-s-Kettenbrecher, 3-s-Countdown, Sieg/Niederlage, alte Kampfversionen und Bot-Antworten kontrollieren und ergänzen. **Fertig:** CI grün und Testfälle nachvollziehbar.
- [ ] **A-04 – Originalzustand sichern:** Vor Umbauten Startzustände, Server-Versionen, wichtige API-Ansichten und Rollback-Commit festhalten. **Fertig:** jedes Update lässt sich ohne Spielstandsverlust zurückrollen.

### Phase S – Verbindliche Kampfereignisse und Online-Synchronisation `P0`
*Größter Qualitätsgewinn für flüssige und gleichzeitig sichtbare Kämpfe.*

- [ ] **S-01 – Ein serverseitiges Kampfereignis-Protokoll:** Feste Sequenznummer, Kampf-ID, Runde, Helden-ID, Ziel, Angriffstyp, bestätigter Schaden, LP vorher/nachher und serverseitiger Einschlagzeitpunkt. **Fertig:** UI, LP-Anzeige, Chronik und Replay benutzen dieselben Ereignisse.
- [ ] **S-02 – Endschaden lückenlos erklären:** Zufall/Glück/Kritisch/Bonus so abrechnen, dass jede endgültige Boss-LP-Änderung einem sichtbaren Schlag entspricht. Keine erfundenen Einzelzahlen. **Fertig:** Summe der Ereignisse passt exakt zur endgültigen Schadensabrechnung.
- [ ] **S-03 – Firestore-Abfragen reduzieren:** Backend-Reads bei häufigen GETs prüfen, redundante Abrufe vermeiden, unveränderte Antworten nach Revision erkennen. **Fertig:** weniger Reads als A-01 bei unveränderter Sicherheit.
- [ ] **S-04 – Ereignis-Push bewerten und ggf. einführen:** Bereits vorhandenen WebSocket-Transport auf Wiederverwendbarkeit, Zugangsschutz und Kosten prüfen. Nur Start/Rundenwechsel/Treffer/Ende als wichtige Push-Events; HTTP-Fallback bei Ausfall. **Fertig:** drei Geräte zeigen Ereignisse konsistent, ohne zusätzliche Animationswrites.
- [ ] **S-05 – Robuste Reihenfolge und Nachholen:** Verpasste oder verspätete Push-Events anhand Sequenznummer erkennen, einmalig nachladen und doppelte Treffer unterdrücken. **Fertig:** WLAN-Ausfall und Tab-Wechsel ergeben korrekten Zustand.
- [ ] **S-06 – Serverseitige Bot-Bündelung optimieren:** Nova/Titan mit gebündelten Aktionen, festen Abrechnungsfenstern und maximal nötigen Transaktionen führen. **Fertig:** Bot-Tests erfolgreich, keine unkontrollierten Reads/Writes.
- [ ] **S-07 – Synchronisierungskosten als CI-Regression schützen:** Tests/Instrumentierung für „keine Datenbankaktion pro Frame“, gebündelte Antworten und idempotente Resultate. **Fertig:** neue unnötige DB-Aktionen fallen automatisch auf.

### Phase K – Kampfsystem, Überleben und Inszenierung `P0/P1`

- [ ] **K-01 – Einheitliche Kampf-Zeitleiste:** Vorbereitung → Ausholen → Angriff → exakter Einschlag → Schaden → Zurückweichen. 135-s-Kampfdauer und fünf Runden beibehalten, sofern eine gezielte Änderung nicht ausdrücklich beschlossen wird.
- [ ] **K-02 – Waffen und Figurbewegung:** Jede Heldenklasse führt ihre passende Waffe sichtbar; Boss schlägt gezielt jeden Beteiligten. **Fertig:** klar erkennbare Bewegungen statt nur CSS-Blitzen.
- [ ] **K-03 – Treffer-Effekte und LP synchronisieren:** Pop-up direkt am Ziel, Blocken/Ausweichen gesondert markieren, persönliche HP exakt beim Treffer aktualisieren. **Fertig:** kein verspätetes oder doppelt gezeigtes Pop-up.
- [ ] **K-04 – Echte persönliche Überlebensmechanik konzipieren:** Aktuelle Mindest-LP-Regel (50 %) prüfen; festlegen, ob und wie Helden auf 0 LP fallen dürfen, welche Rettungsmechaniken gelten und ob die Kampfzeit für ausgefallene Spieler weiterläuft. **Fertig:** vor Änderung des Balancings abgesprochene Regeln und Simulationen.
- [ ] **K-05 – Spannender, transparenter Schlussangriff:** Nach Kettenbrecher drei persönliche Schlussangriffe, dann exakt eine Sieg-/Niederlageentscheidung. Kein „unsichtbarer“ Zusatzschaden.
- [ ] **K-06 – Individuelle Bossattacken:** Tor-10-Aschewächter zuerst; danach eigene Waffen-/Attacken-Optik für Boss 20–100, ohne getrennte Spiellogiken pro Boss.
- [ ] **K-07 – Audio, Kamera und Effekte:** Treffer-Sound, Vorbereitungssignal, reduzierte Animationen, stumm schaltbar, ohne Extra-Firebase-Zugriffe.
- [ ] **K-08 – Kampf-CSS/JS entflechten:** Alte und neue Styles auf Überschneidungen prüfen, Verantwortlichkeiten trennen, gemeinsame Komponenten für Boss 10 und Boss 20–100. **Fertig:** weniger Konflikte, gleiche Optik/Funktion auf beiden Seiten.

### Phase M – Fünf Minispiele verständlicher und fairer machen `P1`

- [ ] **M-01 – Blitz-Mathe:** Acht Aufgaben flüssig, Zwischenfortschritt sichtbar, Sammelübertragung sicher, keine Antwort durch Zeitwechsel verlieren.
- [ ] **M-02 – Ausweichen:** Angriff sichtbar ankündigen, echte Einschlagzeit, verständliche Links-/Rechts- bzw. Richtungswahl und Reaktionsfeedback.
- [ ] **M-03 – Farbe und Symbole:** Zehn Aufgaben, klare Zielanzeige, bessere Rückmeldung und transparente Schwierigkeitsentwicklung.
- [ ] **M-04 – Reaktion/Konter:** Unterschiedliche Bildraten, Touch-Verzögerungen, grüner Zielbereich und serverseitige Zeitprüfung fair abstimmen.
- [ ] **M-05 – Kettenbrecher:** 20 Sekunden, Tippen ODER Wischen, zehn sichtbare Versuche, echte Kettenbruch-Animation und eindeutige Trefferbestätigung.
- [ ] **M-06 – Faire Gesamtbewertung:** Alle fünf Minispiele zuerst einzeln auf 0–100 % normalisieren; danach bewusst gewichten oder gleich gewichten. **Maximum nur bei echter Maximalleistung.**
- [ ] **M-07 – Erklärung von Bonus/Abwehr:** Für jeden Spieler „x/y richtig“ plus tatsächlich gewonnenen Angriffsschaden oder geschützte LP zeigen, sobald serverseitig bestätigt.
- [ ] **M-08 – Minispiel-Mobiltest:** Android Touch und Maus/Tastatur; bei kurzen Netzwerkausfällen keine stillen falschen Ergebnisse und keine doppelte Übertragung.

### Phase E – Schlusswertung, Replay und Bestätigung `P1`

- [ ] **E-01 – Garantiertes Abschlussfenster:** Nach bestätigtem Sieg ODER Niederlage erscheint ein separates, modal zentriertes Fenster. Auch beim Admin-Testprofil/übersprungener Kampfpause.
- [ ] **E-02 – „Bestätigen“ wirklich verbindlich:** Fenster wird nicht von Timer, Layoutwechsel oder Polling geschlossen. Nach Bestätigung im selben Kampf nicht unbeabsichtigt wieder öffnen.
- [ ] **E-03 – Bestätigung ressourcensparend merken:** Zunächst pro Gerät/Kampf-ID lokal speichern (**0 Firestore-Writes**); wenn geräteübergreifende Speicherung nötig wird, mit bestehendem Abschlussereignis zusammenführen.
- [ ] **E-04 – Vollständige Abrechnung:** Endschaden, alle Einzeltreffer, HP aller Helden und Boss, individuelle Minispielquoten, Gruppenwertung, konkrete Verbesserungstipps.
- [ ] **E-05 – Wirkliche Kampf-Highlights:** Gleiche bestätigte Ereignisse in der Arena noch einmal visuell abspielen, ohne neue Würfe, Schadensberechnungen oder DB-Zugriffe.
- [ ] **E-06 – Lesbarkeit und Bedienbarkeit:** Scrollbares Fenster mit dauerhaft sichtbarem Button auf Desktop, Android Hochformat und Querformat; Fokussteuerung und reduzierte Animation prüfen.

### Phase F – Schmiede, Materialien, Balance und Fortschritt `P1/P2`

- [ ] **F-01 – Langzeitsimulation:** Benötigte Deal-or-No-Deal-Partien, Kistenarten, 15 Ressourcen, Upgrade-Fehlschläge und Zeit bis zu den Bossen 10–100 simulieren.
- [ ] **F-02 – Schmiede verständlicher:** Materialien für nächstes Upgrade, fehlende Rohstoffe, Erfolgswahrscheinlichkeit, erreichbares aktuelles Maximum und Auswirkungen auf Angriff/HP zeigen.
- [ ] **F-03 – Pechschutz bewerten:** Lange Misserfolgsserien begrenzen, ohne die langfristige Herausforderung oder Materialökonomie zu zerstören.
- [ ] **F-04 – Charakterrollen prüfen:** Krieger, Magierin, Wächter bislang überwiegend optisch; mögliche kleine Rollenboni nur mit fairer Übergangsregel für bereits endgültig gewählte Figuren.
- [ ] **F-05 – Torfortschritt überprüfen:** 80 normale Tore, 10 Mini-Bosse, 10 Gruppenbosse, Vorbedingungen, Sperren und Wiederanlauf nach Niederlagen testen.
- [ ] **F-06 – Einheitliche Informationen:** Alte Tor-1-Testboss-Hinweise, widersprüchliche Kampfzeiten, alte Belohnungstexte und sonstige Legacy-Anzeigen bereinigen.
- [ ] **F-07 – Belohnungs-Sicherheit:** Jede Kiste, Materialgutschrift, Aufwertung und Bossfreischaltung exakt einmal; Wiederholung, Absturz und Doppel-Klicks testen.

### Phase D – Ziel Tor 100 und DOG-Freischaltung `P2`

- [ ] **D-01 – Endboss Tor 100:** Vollständige Schwierigkeits- und Gruppentests, Sieg- und Niederlagensequenz, Endstatistik.
- [ ] **D-02 – DOG-Unlock durchgängig durchsetzen:** Server-Sieg an Tor 100 → freigegebenes DOG im Spieleportal → korrekter lokaler/Online-Start. Berechtigung serverseitig und nicht nur als Kartenbeschriftung prüfen.
- [ ] **D-03 – Abschlussgeschichte und Belohnung:** Kurzes gemeinsames Finale, Trophäe/Eintrag in der Geschichte, ohne überflüssige Firestore-Writes.
- [ ] **D-04 – DOG erweiterbar halten:** Spielfelder, Kartendesigns, Figurenmotive und spätere Events getrennt von der Spielregel verwalten.

### Phase T – Abschlussprüfung und Freigabe `P0 vor Veröffentlichung für alle`

- [ ] **T-01 – Echter Drei-Geräte-Test:** 135-s-Kampf bei 3 echten Spielern, einschließlich Minispielen, 3 Schlussangriffen, Sieg/Niederlage, Bestätigen.
- [ ] **T-02 – Fehlerfälle:** Einer lädt neu, einer verliert WLAN, einer wechselt die App, Serverantwort verzögert sich, doppelte Klicks und verspätete Ergebnisse.
- [ ] **T-03 – Performance:** Flüssige Arena auf Android-Tablet und Smartphone; keine entscheidenden Elemente verdeckt; keine Speicher-/Animationslecks über mehrere aufeinanderfolgende Kämpfe.
- [ ] **T-04 – Kostenvergleich:** Firestore-Reads/Writes je Spiel, Leerlauf und Testteilnehmer **nach** allen Optimierungen gegen Phase A halten. Rückschritte vor Freigabe beheben.
- [ ] **T-05 – Berechtigungen/Testdaten:** Nova/Titan-Testzugang, Entwickler-Bypass, Testmaterialien und Reset-Strategie vor öffentlicher Freigabe bewusst festlegen. Keine echten Fortschritte versehentlich löschen.
- [ ] **T-06 – Produktionsfreigabe:** Frontend-/Backend-CI grün, Render `live`, GitHub Pages `success`, dokumentierter Rollback-Plan, zuletzt praktischer Test erfolgreich.

## 3. Empfohlene unmittelbare Reihenfolge

1. **A-01 → A-02 → A-03:** tatsächliche Firestore-Kosten, Latenz und aktuelle Testabdeckung erfassen.
2. **S-01 → S-02 → K-03:** sichtbare Angriffe, Boss-LP und die Endabrechnung konsistent machen.
3. **S-03 → S-04 → S-05 → S-06:** Realtime ohne unnötiges Firestore-Polling; Bot-Transaktionen reduzieren.
4. **E-01 → E-02 → E-03:** zuverlässiges Schlussfenster samt dauerhaftem Bestätigen.
5. **K-01 → K-02 → K-05 → K-08:** Kampfbewegungen und Timing abrunden.
6. **M-01 bis M-08:** alle Minispiele und die faire Gesamtskala vollenden.
7. **F-01 bis F-07 → D-01 bis D-04 → T-01 bis T-06:** Balance, Langzeitfortschritt, DOG und Abnahme.

**Nicht als Erstes:** weitere Minispiele, neue Glücksräder oder zusätzliche Firestore-Listener. Zuerst die bestehenden fünf Minispiele und die Kampfanzeige zuverlässig fertigstellen.

## 4. Prüfläufe, die wir für jede größere Phase wiederholen

- **Einzelheld, Zweierteam, Dreierteam** sowie ein Trio mit den Testspielern Nova und Titan.
- **Volle 135 Sekunden** bei aktuellen v14-Kämpfen; ältere gespeicherte Versionen behalten ihre Zeitfenster.
- **Alle fünf Phasen:** Mathe → Ausweichen → Farbe/Symbole → Reaktion → 20-s-Kettenbrecher; dazu 3-s-Übergangs-Countdown.
- **Ergebnis:** Boss mit 0 LP, Boss mit Rest-LP, schlechte Minispielquote, guter Lauf, knapper Ausgang.
- **Verbindung:** GET verzögert, POST-Antwort verloren, Tab im Hintergrund, doppelter Request, erneuter Seitenaufruf.
- **Ressourcen:** Bei rein grafischen Änderungen **0 neue Firestore-Zugriffe**. Bei Logikänderungen jede zusätzliche notwendige Transaktion ausdrücklich begründen.

## 5. Fortschrittsprotokoll

| Datum | Aufgaben-ID(s) | Ergebnis / Änderung | Tests | Reads / Writes | Commit / Deployment |
|---|---|---|---|---|---|
| 12.11.2026 | **Plan** | Entwicklungsplan mit Phasen A, S, K, M, E, F, D und T angelegt | Noch keine neue Aufgabe abgeschlossen | Ausgangswerte noch zu ermitteln | Dieses Dokument |

---

**Definition von „fertig“:** Funktion auf GitHub `main` integriert, Frontend-/Backend-Tests erfolgreich, auf echter Anzeige nachvollziehbar, keine ungeklärten Doppelbuchungen oder unnötigen Firestore-Mehrzugriffe, Task abgehakt und Fortschrittsprotokoll ergänzt.

**Nächste konkrete Aufgabe:** **A-01 – tatsächliche Firebase-/Firestore-Reads und -Writes eines vollständigen Bosskampfs messen.**
