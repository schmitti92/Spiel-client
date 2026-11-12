# ⚔️ 100 Tore – Gemeinsamer Entwicklungs- und Aufgabenplan

> **Verbindlicher Arbeitsplan** für die schrittweise Verbesserung von „100 Tore“ auf GitHub `main`.
> Erstellt: **12. November 2026** · Fortschritt: **A-01 technisch gemessen; erster kontrollierter Praxiswert der Firestore-Usage dokumentiert; weitere Szenarien offen.** Keine neue Aufgabe vollständig abgenommen.
> Beteiligte Repositories: [Spiel-client](https://github.com/schmitti92/Spiel-client) (Frontend, GitHub Pages) und [serverfinal](https://github.com/schmitti92/serverfinal) (Backend, Render, Firestore).

## 0. Wie wir diesen Plan abarbeiten

- **Eine Aufgabe nach der anderen**, möglichst in kleinen, rückrollbaren Änderungen. Dabei keine bestehenden Funktionen entfernen.
- **Status nur nach tatsächlicher Arbeit ändern:** `[ ]` offen, `[-]` in Arbeit (in normalem GitHub-Markdown notfalls als `[ ]` mit Zusatz), `[x]` abgeschlossen. Jede abgeschlossene Aufgabe erhält Datum, Commit(s) und Testnachweis.
- **Reihenfolge:** zunächst Messbarkeit & Datenkonsistenz, danach Online-Synchronisation, Kampfgefühl, Minispiele, Schlusswertung, Fortschritt/Schmiede, DOG-Unlock und Abnahme.
- **Vorher/Nachher vergleichen**, speziell Datenbank-Reads/Writes, sichtbare Verzögerungen, API-Fehler und Verhalten bei Verbindungsunterbrechung.
- **Prüfen auf `main`**, CI und Deployment kontrollieren. Automatisierte Tests sind Pflicht; eine praktische Prüfung auf Android und mit drei Spielern bleibt zusätzliche Pflicht.
- Dieser Plan ist die **einzige maßgebliche Checkliste**. Nicht parallel widersprüchliche Statuslisten pflegen.

### ⚡ Schnellmodus für die weitere Entwicklung (12.11.2026)

**Ziel: schneller sichtbar verbessern, ohne Sicherheits- oder Datenverluste.** Die ausführliche A-01/A-02-Baseline war eine einmalige Bestandsaufnahme; danach werden Messung und Dokumentation schlanker.

- **Pro zusammenhängendem Änderungspaket ein Commit** statt vieler kleiner Nachbesserungs-Commits. Keine unnötigen Test-only-Deployments auf dem Render-Backend.
- **Kleine rein optische Anpassung:** kurz passende Oberfläche/Dateien prüfen, vorhandenen gezielten Test nutzen, nur wenn tatsächlich nötig einen neuen Test ergänzen. Keine neue umfangreiche Messstudie.
- **Normale Änderung an UI/Minispiel:** 1–3 passende Tests plus vorhandene automatische GitHub-CI; nur bei Fehlern breiter prüfen.
- **Kritische Änderung an Firestore/Spielständen, Guthaben, Gewinnen, Sicherheitsprüfung oder Multiplayer-Synchronisierung:** gezielte Fälle für Doppelbuchung, Wiederholung, Unterbrechung und 1/2/3 Spieler beibehalten. Volle Regression vor großen Releases und nach riskanten Umbauten.
- **Automatische CI und GitHub-Pages/Render-Deployments nicht mehr nach jedem Zwischencommit einzeln abfragen**; nach dem fertigen Paket einmal den Status prüfen und offen kennzeichnen, was noch nicht geprüft wurde.
- **Knappe Dokumentation:** pro Paket 1–3 Sätze in diesem Plan (was geändert, grob getestet, GitHub-Commit, Auswirkungen auf Firestore). Umfangreiche Zusatzberichte nur bei tatsächlich neuen Messungen oder Architekturentscheidungen.
- **Primär Spielqualität:** gefühlte Reaktionszeit, Synchronität und fehlerfreie Bedienung haben Vorrang vor dem Erstellen immer neuer theoretischer Tests. Firestore möglichst sparsam, aber nicht zulasten eines flüssigen Spiels.

**Kontrollierter Praxisvergleich vom Nutzer:** Für **ein Spiel** wurden die Firebase-Firestore-Projektzähler vor und nach dem Spiel mit bewusst großzügigem zeitlichem Abstand aufgenommen, sodass laut Nutzer keine anderen Vorgänge im Messfenster aktiv waren: **145 Reads, 26 Writes, zusammen 171 Operationen**. Das ersetzt die frühere grobe Schätzung von 200–250 „Abfragen“. Cloud-Metriken können verzögert nachlaufen; eine isolierte vollständige Messreihe zu allen A-01e-Szenarien liegt noch nicht vor.

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

- [ ] **A-01 – Firestore-Kosten-Baseline (TEILWEISE ERLEDIGT):** Firestore-Lese- und Schreibvorgänge für einen vollständigen 135-s-Bosskampf mit 1, 2 und 3 Helden sowie mit Nova/Titan erfassen. Zusätzlich 5 Minuten Leerlauf prüfen. **Fertig erst nach:** tatsächlichen Firestore-Usage-Zählern aus der Produktion, Vergleichstabelle und Testnachweis. Die reproduzierbare Codepfad-Baseline ist bereits erfolgreich.
  - [x] **A-01a:** Unveränderte Backend-API mit einer isolierten, zählenden In-Memory-Firestore-Attrappe für 1/2/3 reale Helden testen, fünf Minispiele und Abschluss durchspielen.
  - [x] **A-01b:** 135-s-Simulation mit 1 echtem Testhelden sowie Nova und Titan durchführen; schreibende Bot-GETs erfassen.
  - [x] **A-01c:** 5-Minuten-Leerlauf, konstante GET-Kosten und zusätzliche Profil-/Pilot-Reads im Quellcode untersuchen.
  - [x] **A-01d:** Messbericht auf GitHub ablegen und klar zwischen Offline-Operationen und echter Firebase-Abrechnung unterscheiden.
  - [ ] **A-01e – NOCH OFFEN:** Tatsächliche Cloud-Firestore-Usage-Zähler für 5 Minuten Leerlauf und die vier Kampfszenarien vor/nach einem kontrollierten Live-Lauf erfassen. Erst dann A-01 abnehmen; keine erfundenen Produktivzahlen.
  - [x] **A-01e-Vorbereitung (12.11.):** Zusätzlichen 3-s-Status-Polling-Offline-Test mit 1/2/3 gleichzeitigen Browsern ausführen, CI prüfen, Render-Metrikzugriff kontrollieren und leere Messvorlage für echte Zähler bereitstellen. **Ersetzt nicht A-01e.**
- [ ] **A-02 – Netzwerk- und Timing-Baseline (TEILWEISE ERLEDIGT):** API-Aufrufe pro Minute, Antwortzeiten, Verzögerungen bei Start/Runden/Treffern/Resultat, abgebrochene Requests erfassen. Keine sensiblen Tokens oder Nutzerdaten loggen. **Fertig erst mit:** echten Live-Messungen in 1/2/3-Geräte-Kämpfen; Testwerkzeug allein reicht nicht.
  - [x] **A-02a:** Polling-Regeln und GET/POST-Timeouts der beiden Boss-Clients aus dem Quellcode aufnehmen.
  - [x] **A-02b:** Freiwillige, nur lokal arbeitende Netzwerk-Diagnose mit `netdiag=1` für Boss 10 und Gruppenbosse integrieren (HTTP-Zeiten, Fehler/Abbrüche, Serverzeit-Ereignisbeobachtung, CSV).
  - [x] **A-02c:** Datenschutz-, Aktivierungs-, Event-Deduplizierungs- und Client-Integrationstests erfolgreich ausführen.
  - [x] **A-02d:** [Technischen A-02-Messbericht und Live-Testanleitung](./100-TORE-A02-NETZWERK-MESSBERICHT.md) auf `main` hinterlegen, ohne neue Firebase-Anfragen.
  - [ ] **A-02e – NOCH OFFEN:** Echte Browser-CSV von 1/2/3 gleichzeitig spielenden Geräten und Nova/Titan (GET/POST/min, p50/p95, Fehler, Beobachtungslags) erheben, auswerten und A-02 erst danach abnehmen.
- [x] **A-03 – Regressions-Schutz (12.11.2026):** Bereits vorhandene Regressionstests für 1/2/3 Helden, alle fünf Minispiele, 20-s-Kettenbrecher, 3-s-Übergänge, Sieg/Niederlage, gespeicherte ältere Kampfversionen sowie Bot-Antworten überprüft. **Kein neuer Testcode erforderlich; die bestehenden CI-Workflows waren grün.** Konkrete Testdateien und Nachweise siehe unten.
#### A-03: Nachweis der bereits vorhandenen Regressionstests

| Prüfung | Vorhandener Testnachweis |
|---|---|
| 1 / 2 / 3 Spieler und kompletter 135-s-Kampf | [Backend: dog-firestore-a01.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-firestore-a01.test.js), Test „count actual API-code mock operations for one, two and three heroes“ |
| Fünf Minispiele, serverseitig gültige Zeitfenster, 20-s-Kettenbrecher | [Backend: dog-boss-final5.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-boss-final5.test.js), [Frontend: dog-boss-chain-breaker.test.mjs](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-chain-breaker.test.mjs) |
| Dreisekündiger Übergangs-Countdown und einzelne Angriffe | [Frontend: dog-boss-battle-v3.test.mjs](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-battle-v3.test.mjs), Test „three seconds are reserved for countdown“ |
| Sieg / Niederlage, Freischaltung, genaue serverseitige Ergebnisanzeige | [Backend: dog-group-boss.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-group-boss.test.js), [Frontend: dog-boss-result-report.test.mjs](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-result-report.test.mjs) |
| Ältere v1 / v11 / v12 / v13-Kämpfe bleiben kompatibel | [Backend: dog-boss-minigames.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-boss-minigames.test.js), [dog-boss-final5.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-boss-final5.test.js), [Frontend: dog-boss-chain-breaker.test.mjs](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-chain-breaker.test.mjs) |
| Nova / Titan: Antworten, Fortschritt und idempotenter Abschluss | [Backend: dog-live-bots.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-live-bots.test.js), [dog-firestore-a01.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-firestore-a01.test.js) |
| Abgebrochene Verbindung, Wiederholen ohne Doppel-Aktion | [Frontend: dog-boss-reconnect.test.mjs](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-reconnect.test.mjs), [Backend: dog-group-boss.test.js](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-group-boss.test.js) |

**CI-Nachweis bei Kontrolle:** Backend [Server tests](https://github.com/schmitti92/serverfinal/actions/runs/43248227536), [Node tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225233), [Multiplayer regression tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225444) und [Shared lobby feature tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225104) jeweils **erfolgreich**; Frontend [Client checks](https://github.com/schmitti92/Spiel-client/actions/runs/43252085732) und [GitHub Pages](https://github.com/schmitti92/Spiel-client/actions/runs/43252082647) ebenfalls **erfolgreich**. Das ist **Regressionstest-Abdeckung**, kein neuer Drei-Geräte-Livetest und kein Nachweis für perfekte Performance.

**Schnellmodus angewendet:** keine doppelten Tests, kein neuer Backend-Deploy und keine Änderung am Kampf, an Firebase oder an Spielständen. A-03 abgehakt; nächste technische Aufgabe **A-04 (Rollback-Sicherung)**.

- [x] **A-04 – Originalzustand sichern (12.11.2026):** Ausgangs-Commits und **zwei echte GitHub-Backup-Branches** angelegt, ihre unveränderten HEAD-SHAs bestätigt, Render-Live-Deployment, Frontend-CI/Pages, API-Verträge und vorsichtigen Rückweg dokumentiert. **Wichtig:** Quellcode-Backup ist **kein** Firestore-Datenbankbackup; bei späteren Datenstrukturänderungen ist eine separate Sicherung/Kompatibilitätsprüfung vor dem Update verpflichtend.

#### A-04: Gesicherter Rücksprungpunkt vor S-01

| Bereich | Backup-Branch (verifiziert) | Exakter Ausgangs-Commit | Bestätigter Zustand |
|---|---|---|---|
| Frontend `schmitti92/Spiel-client` | [`backup/a04-2026-11-12`](https://github.com/schmitti92/Spiel-client/tree/backup/a04-2026-11-12) | [`36249ef6cb2c830c50f422604bda09cf427fe88a`](https://github.com/schmitti92/Spiel-client/commit/36249ef6cb2c830c50f422604bda09cf427fe88a) | [Client checks erfolgreich](https://github.com/schmitti92/Spiel-client/actions/runs/43252576463), [Pages veröffentlicht](https://github.com/schmitti92/Spiel-client/actions/runs/43252573736) |
| Backend `schmitti92/serverfinal` | [`backup/a04-2026-11-12`](https://github.com/schmitti92/serverfinal/tree/backup/a04-2026-11-12) | [`90bc7902aa223162866d5db0a33247a975eef5f0`](https://github.com/schmitti92/serverfinal/commit/90bc7902aa223162866d5db0a33247a975eef5f0) | [Server-CI erfolgreich](https://github.com/schmitti92/serverfinal/actions/runs/43248227536), Render-Deployment `dep-dbqtmc15efls73femb40` **live** (Service `srv-d5815dur433s73f0mv6g`) |

**API-Ansichten / bekannte Verträge aus dem gesicherten Servercode (keine privaten Live-Daten ausgelesen):**

- **Boss 10:** `GET /api/dog/gates/boss10`, `POST /api/dog/gates/boss10/{ready,start,react,minigame,finish}`. Im GET u. a. `phase`, `startedAt`, `endsAt`, `roster`, `miniGames`, `result`, `bossHp`, `bossLiveHp`, `teamHealth`, `serverNow`, `remainingMs`.
- **Gruppenbosse 20–100:** `GET /api/dog/gates/boss/:gate`, entsprechende `POST .../:gate/{ready,start,react,minigame,finish}`; zusätzlich z. B. `forgeLevel`, `finalBoss`, `dogUnlocked`.
- **Fortschritt/Schmiede:** `GET /api/dog/gates/map`, `POST /api/dog/gates/{join,hero,fight}`, `GET /api/dog/forge/me`, `POST /api/dog/forge/{upgrade,exchange}`. Persistierte Modellversionen u. a. `dog_gate_progress_v1` und `dog_hero_v1`. Der aktuelle `boss10`-Startzustand besitzt `phase: waiting`, leere `ready/reactions/roster`, `attempt: 1`, keine `miniGames` und `result: null`. **Nur Strukturreferenz**, keine produktiven Dokumentinhalte kopiert.
- Bestehende Kampf-Tests: [Regressionstest-Matrix unter A-03](#a-03-nachweis-der-bereits-vorhandenen-regressionstests). Damit sind wichtige alte Kampfversionen abgesichert.

**Vorgehen beim Rückrollen (ohne `main` gewaltsam zurückzusetzen):**

1. Aktuellen Stand und GitHub-Commit/Render-Deploy identifizieren; Änderung am besten durch **neuen Revert-Commit** auf `main` zurücknehmen. Alternativ betroffene Dateien gezielt aus dem jeweiligen `backup/a04-2026-11-12`-Branch in einen neuen Commit übernehmen. Backup-Branches nicht überschreiben.
2. Bei Änderungen an **Backend und Frontend** Schnittstellen aufeinander abstimmen; Backend-Autodeploy (Render `main`) und GitHub Pages (`main`) anschließend prüfen. Nicht allein einen alten Backend-Deploy als automatische Wiederherstellung aller App-Daten betrachten.
3. Vor allem bei einer neuen Firestore-Dokumentstruktur: **zuerst** Kompatibilität der gespeicherten Daten mit der alten Serverversion prüfen, bei destruktiven/inkompatiblen Änderungen zuvor einen **echten Firestore-Datenexport/Backup** sicher bereitstellen. Ein Git-Revert stellt niemals gelöschte oder umgeschriebene Firestore-Dokumente wieder her.
4. Bestehende Profile/Belohnungen nicht löschen oder zurücksetzen; nach Rollback die passenden Regressionstests, einen lesenden Statusabruf und einen normalen Nutzer-Test verifizieren. Live-Spielstände wurden bei dieser Sicherung **nicht** geändert.

**Firestore-Kosten für A-04:** 0 zusätzliche Reads/Writes durch die Branch-Sicherung und Dokumentation. **Aktive Spiele** wurden nicht gestartet; es wurde weder eine Datenbankkopie angefertigt noch ein Rollback ausgelöst. A-04 sichert den Code-Ausgangszustand; die allgemeine Aussage „ohne jeden möglichen Spielstandsverlust“ ist nur gültig, wenn spätere Updates abwärtskompatibel bleiben oder ein gesichertes Migrations-/Restore-Verfahren besteht.


### A-01 – Technische Ausgangsmessung vom 12.11.2026

**Messbericht:** [Firestore-A-01-Messbericht](./100-TORE-FIRESTORE-A01-MESSBERICHT.md) · **Testquelle:** [`serverfinal/tests/dog-firestore-a01.test.js`](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-firestore-a01.test.js) · [erfolgreicher Server-Testlauf](https://github.com/schmitti92/serverfinal/actions/runs/43244351339).

**Messart:** echte Backend-API-Programmpfade gegen **isolierte, zählende In-Memory-Firestore-Attrappe**; **KEIN produktiv abgerechneter Firebase-Verbrauch**. Keine Änderung an Spielregeln oder Spielständen.

| A-01-Testszenario | GETs / POSTs | Gezählt: Reads | Gezählt: Writes | Einschränkung |
|---|---|---:|---:|---|
| 135 s, 1 echter Held | 2 / 12 | **41** | **24** | nur 2 GETs; keine Auth-/Pilot-Reads |
| 135 s, 2 echte Helden | 2 / 22 | **72** | **44** | nur 2 GETs; keine Auth-/Pilot-Reads |
| 135 s, 3 echte Helden | 2 / 31 | **100** | **62** | nur 2 GETs; keine Auth-/Pilot-Reads |
| 135 s, 1 Held + Nova/Titan | 29 / 10 | **100** | **31** | 5-s-GET-Testschema; 11 schreibende GETs |
| 5 Min. Leerlauf, 20 GETs | 20 / 0 | **40** | **0** | ohne Profilcache und Pilotzugriff |

**Ergebnis:** Ein unveränderter Status-GET hat im Backend mindestens **2 Dokumentreads**. Ein neuer gültiger Minispiel-POST verursacht üblicherweise **3 Reads und 2 Writes** (Fortschritt + idempotente Quittung). Im Bot-Test verursachten **11 von 29 GETs** je eine weitere Dokumentänderung; das ist ein wichtiges Optimierungsthema für S-06.

**Achtung:** Bei echten Online-Spielen entstehen weitere Reads durch häufigeres Polling, Profil-Cache-Misses (15-s-Fenster), Pilot-Berechtigungscache (30-s-Fenster) sowie ggf. SDK-Transaktionswiederholungen. Render liefert derzeit keine Firestore-Abrechnungsdaten; die Firebase-Usage-Konsole des Projekts `spiel-barik` ist für A-01e noch erforderlich. **Nicht als „100 Firestore-Reads pro realem Dreierkampf“ interpretieren.**

**Zusätzlicher kontrollierter Offline-Polling-Test (12.11.):** Mit jeweils **44 zusätzlichen Status-GETs pro Browser** bei festem 3-s-Abstand ergeben sich **129 Reads / 24 Writes** (1 Mensch), **248 / 44** (2 Menschen) und **364 / 62** (3 Menschen). Das ist eine illustrative Sensitivitätsrechnung aus dem tatsächlichen API-Codepfad, **keine Firebase-Usage- oder echte Browsermessung**. Alle vier CI-Testworkflows zum [Test-Commit](https://github.com/schmitti92/serverfinal/commit/90bc7902aa223162866d5db0a33247a975eef5f0) bestanden. Render `http_request_count` und `http_latency` lieferten leere Datenreihen, **nicht null Traffic**. [Details](./100-TORE-FIRESTORE-A01-MESSBERICHT.md) · [CSV-Vorlage für echte Cloud-Werte](./100-TORE-A01E-LIVE-MESSWERTE.csv).

### A-01e – erster kontrollierter Praxiswert aus Firestore-Screenshots (12.11.2026)

Der Nutzer hat **vor und nach genau einem Spiel** die Nutzungszähler in der Firebase-Konsole (`Spiel barik` → Cloud Firestore → Nutzung) fotografiert. **Er bestätigt ausdrücklich**, dass er zwischen beiden Aufnahmen genügend Abstand gelassen und andere Vorgänge ausgeschlossen hat. Dies ist damit eine **kontrollierte Nutzerbeobachtung für ein einzelnes Spiel**, kein willkürliches Projektzeitfenster.

| Screenshot (lokale Uhrzeit) | Lesevorgänge | Schreibvorgänge |
|---|---:|---:|
| **16:32 Uhr** | 1.688 | 325 |
| **16:45 Uhr** | 1.833 | 351 |
| **Differenz für die beobachtete Spielmessung** | **145** | **26** |

**Insgesamt: 171 angezeigte Firestore-Vorgänge pro beobachtetem Spiel** (145 Dokumentlesevorgänge + 26 Dokumentschreibvorgänge). Die Screenshots zeigen die echte **Projekt-Usage**, keine HTTP-Anfragen und keine simulierten Zähler. Der Abstand zwischen den Bildern beträgt 13 Minuten, **nicht zwingend die Dauer des Spiels**. Zuordnung zu einem spezifischen Boss-Tor und zur Zahl der menschlichen Mitspieler ist noch nicht notiert. Eine mögliche Verzögerung/Aggregation der Firebase-Nutzungsanzeige bleibt als kleine Messunsicherheit; die bewusste Ruhezeit rund um das Spiel verbessert die Zuordenbarkeit erheblich.

**Entwicklungsentscheidung:** 171 Gesamtoperationen für ein gespieltes Spiel sind ein sinnvoller erster Richtwert. Keine zusätzlichen schwergewichtigen Testserien nur um diese Zahl erneut zu schätzen; weitere Live-Messungen bei Gelegenheit gesammelt erfassen. **A-01e insgesamt noch offen**, weil 5-Minuten-Leerlauf sowie gesonderte 1-/2-/3-Spieler- und Bot-Szenarien nicht vollständig belegt sind. Spielkomfort und Synchronität nicht für marginale Einsparungen verschlechtern.

### A-02 – Stand der Netzwerk-/Timing-Messung vom 12.11.2026

**Dokumentation:** [A-02-Messbericht](./100-TORE-A02-NETZWERK-MESSBERICHT.md) · **Messwerkzeug:** [dog-network-diagnostics.js](../dog-network-diagnostics.js) · **Tests:** [dog-network-diagnostics.test.mjs](../tests/dog-network-diagnostics.test.mjs).

**Bereits umgesetzt:** Optionale Browsermessung, aktiviert ausschließlich durch `?netdiag=1` bzw. `&netdiag=1`, für Boss 10 und Gruppenbosse. Zählt GET/POST pro Minute, p50/p95, Fehler/Abbrüche und das erste Eintreffen ausgewählter serverzeitgestempelter Ereignisse. **Standardmäßig aus; keine zusätzliche HTTP-/Firestore-Abfrage und keine Änderungen an der Spiellogik.** Lokal gespeicherte CSV enthält keine Spieler-IDs, Tokens, Request-Bodys oder Raumcodes. Client-Tests [erfolgreich](https://github.com/schmitti92/Spiel-client/actions/runs/43250565768).

**Quellcode-Baseline:** 250-ms-Tick dient der lokalen Oberfläche, nicht einem 250-ms-GET. Je nach Phase 850/1.200/2.800/3.800/15.000-ms-Anforderungen; außerhalb erzwungener Schlagabtausch-GETs greift zusätzlich 3-s-Drossel, ferner keine automatischen Updates in verstecktem Tab. GET-Timeout 18 s; Minispiel-POST-Timeout 4,5 s. **Es gibt noch keine realen p95-Live-Latenzen oder echten Drei-Geräte-Vergleichswerte.** A-01e (Firebase-Usage) bleibt davon unabhängig offen.

### S-03a – Kurzoptimierung ohne neue Cache-Schicht

**Stand 12.11.2026:** In `dog-boss10.js` und `dog-group-boss.js` kommt nach erfolgreichem POST bereits `data.view` vom Server. Bisher wurde zwar `view` gesetzt, jedoch **nicht** `lastLoad` aktualisiert. Dadurch konnte der nächste lokale 250-ms-Tick einen zeitlich unnötigen Status-GET auslösen, obwohl der Browser genau diesen verifizierten Stand soeben empfangen hatte.

**Änderung:** `lastLoad=Date.now()` ausschließlich **nach erfolgreich bestätigtem POST** (mit `data.view`). Die bisherige normale 3-s-GET-Drossel wirkt dann ab dieser Bestätigung, während `reload(true)` für Kampfsequenzen, manuelle Aktualisierung, Tab-Rückkehr und Fehlerklärung unverändert bleibt. Kein HTTP-/Firestore-Cache, kein Verbergen fremder Updates für eine fest codierte Dauer, keine Änderungen am Server oder an Schreibvorgängen.

**Erwartete Kostensenkung:** Jeder tatsächlich entfallene Status-GET spart gemäß isolierter A-01-API-Codepfad-Messung ungefähr **2 Firestore-Dokument-Reads**. Es gibt hier **keine Behauptung einer festen Ersparnis pro Kampf**; die Anzahl hängt von Nutzertiming und Phasen ab. Die bekannte kontrollierte Praxis-Baseline von **145 Reads + 26 Writes = 171 Operationen** bleibt der Ausgangswert. Ein Vorher/Nachher-Praxistest und ggf. ein bereits erreichter unveränderter Revisionsmechanismus stehen noch aus.

**Gezielter Test:** Die bestehenden [Reconnect-Tests](https://github.com/schmitti92/Spiel-client/blob/main/tests/dog-boss-reconnect.test.mjs) wurden um den Fall „POST-Antwort verhindert unnötigen GET unmittelbar danach, normales Polling und manueller Refresh funktionieren weiter“ für **Boss 10 und Gruppenbosse** ergänzt. Keine zusätzliche Firestore-Collection und keine neue serverseitige Transaktion.

### Phase S – Verbindliche Kampfereignisse und Online-Synchronisation `P0`
*Größter Qualitätsgewinn für flüssige und gleichzeitig sichtbare Kämpfe.*

- [x] **S-01 – Ein serverseitiges Kampfereignis-Protokoll (12.11.2026):** Server erstellt aus bereits bestätigten Schlägen deterministische Ereignisse mit `fightId`, `eventId`, `sequence`, `round`, `heroId`, `actorId`, `targetId`, `attackType`, `damage`, `hpBefore`, `hpAfter`, `impactAt`. Boss 10 und die Gruppenbosse liefern `combat` in der normalen API-Antwort; neue Kampf-UI, LP-Anzeige, Trefferchronik, Ergebnisstatistik und Replay bevorzugen dieselben Ereignisse. **Keine zusätzlichen Firestore-Reads/Writes, neue Collection oder erneute Kampf-Schadenswürfe.** Ältere v1–v10-Kämpfe behalten den bisherigen Darstellungspfad. Automatische Tests erfolgreich; echter Drei-Geräte-Sichttest folgt in Phase T. **S-02 ist inzwischen ebenfalls umgesetzt:** der finale Serverwert wird durch einen gesonderten Abschlussangriff bzw. bei älteren Kampfstufen eine ausgewiesene Glücksabwehr mit der Trefferfolge abgeglichen.

#### S-01 – Implementierungsnachweis (Codepaket)

- **Backend:** [Commit 48fbb290](https://github.com/schmitti92/serverfinal/commit/48fbb290ecc04c88e34621a77ae615f41414d5ca). Reiner `buildDogCombatStream`-Projektor im Modul [`dog-combat-events.js`](https://github.com/schmitti92/serverfinal/blob/main/dog-combat-events.js); integriert in `boss10View` und `groupBossView`. Die serverseitige `miniGames.exchange.strikes`-Liste bleibt als Kompatibilitätsfeld bestehen; die neuen Events enthalten stabile IDs und exakte bereits bestätigte Schlag-LP. Keine Speicherung der abgeleiteten Events.
- **Frontend:** [Commit 717aeae](https://github.com/schmitti92/Spiel-client/commit/717aeae93e6504321be2c11a413413134dd232a0) plus [Legacy-Korrektur 41925ad](https://github.com/schmitti92/Spiel-client/commit/41925ad89b2c3ff3291a92d198ff58730a81457c). Trefferanimation und Chronik (`dog-boss-battle-v3.js`), Boss-/Helden-LP (`dog-boss-live-ui.js`) sowie Statistik/Replay (`dog-boss-result-report.js`) nutzen bevorzugt `combat.events` inklusive der Server-Zeitstempel. Veraltete Szenen unter v11 verwenden unverändert die alte Anzeige; kein neuer HTTP-Request.
- **Automatischer Nachweis:** [Backend: Server tests grün](https://github.com/schmitti92/serverfinal/actions/runs/43254116063) und [Multiplayer-Regression grün](https://github.com/schmitti92/serverfinal/actions/runs/43254115780); [Frontend: Boss-Arena grün](https://github.com/schmitti92/Spiel-client/actions/runs/43254575086) und [Client checks grün](https://github.com/schmitti92/Spiel-client/actions/runs/43254574944).
- **S-01/S-02-Grenze:** Die laufende Treffersequenz bleibt vor Kampfschluss unverändert; erst der endgültig gespeicherte Serverentscheid fügt bei Bedarf den Team-Finalschlag oder eine frühere konservative Schadensschätzung korrigierende Glücksabwehr hinzu. Kein Client berechnet dafür eigene Zufallswerte. Ein echter Drei-Geräte-Live-Vergleich steht weiterhin aus.

- [x] **S-02 – Endschaden lückenlos erklären (12.11.2026):** Der Server ergänzt **erst nach dem persistierten Kampfergebnis** eine sequenzierte `team-finisher`-Attacke für den noch fehlenden LP-Schaden. Seltener alter Niedrigglück-Fall wird als `boss-guard` (Glücksabwehr) ausgewiesen. `reconciliation` bestätigt: Summe der auf Boss-LP wirksamen Ereignisse = `bossHp - result.hpRemaining`; Summe inklusive `rawDamage` = `result.damage` (Übertreffer separat ausgewiesen). Gleiche Daten in Schlusswertung, Trefferliste und Replay; kein zweiter Zufallswurf, keine neue Firestore-Abfrage/-Speicherung. Bestehende Spielregeln unverändert. Gezielt getestet; realer Sicht-/Mehrgerätevergleich bleibt für Phase T.
**S-02-Nachweis:** [Backend-Implementierung](https://github.com/schmitti92/serverfinal/commit/9681f8fd76813a49039bfa32527d2a043553b9a0) · [Frontend-Schlusswertung](https://github.com/schmitti92/Spiel-client/commit/b76054620481762189ca3ba122aa7dcb74ae9863) · [Cache-Aktualisierung beider Boss-Seiten](https://github.com/schmitti92/Spiel-client/commit/0ce7d42882a6d0c328e5b857f1155d433a9aa1fe). **Tests:** [Backend-Server tests bestanden](https://github.com/schmitti92/serverfinal/actions/runs/43256585289), [Multiplayer bestanden](https://github.com/schmitti92/serverfinal/actions/runs/43256585644), [Frontend-Client checks bestanden](https://github.com/schmitti92/Spiel-client/actions/runs/43256793565), [Boss-Arena bestanden](https://github.com/schmitti92/Spiel-client/actions/runs/43256793877). Ein allgemeiner Backend-Workflow zeigte zunächst einen **nicht zu S-02 gehörigen DOG-Online-Kartenzählungsfehler (5 statt 6)**, bestand aber beim **einmaligen erneuten Lauf** ([Link](https://github.com/schmitti92/serverfinal/actions/runs/43256585721)). Der Render-Service deployte den bestätigten Backend-Commit als `live`. Keine zusätzlichen Firestore-Operationen durch diese Projektion; der Nutzer-Praxiswert von **145 Reads / 26 Writes** ist die frühere Baseline, **keine neue Live-Nachmessung**.

- [ ] **S-03 – Firestore-Abfragen reduzieren (Teilfortschritt):** Häufige GETs und redundante Abfragen prüfen, unveränderte Antworten nach Revision bewerten. **S-03a erledigt:** Nach einem erfolgreichen Boss-POST nutzt der Browser die vollständige bestätigte Serveransicht aus der Antwort und setzt den GET-Takt zurück. Unnötige unmittelbare Doppelabfragen entfallen; nach spätestens 3 s läuft normales Polling weiter, **erzwungene Szenen-/Manuell-/Wiederverbindungsabfragen bleiben unverändert**. Für die komplette Abnahme fehlen ein gemessener Live-Vorher/Nachher-Vergleich und gegebenenfalls weitere nachweisbar sichere Optimierungen; **nicht** allein wegen der Codeänderung als „Reads reduziert“ abnehmen.
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
| 12.11.2026 | **Plan** | Entwicklungsplan mit Phasen A, S, K, M, E, F, D und T angelegt | Dokumentation erstellt | Noch keine Werte | [Plan-Commit](https://github.com/schmitti92/Spiel-client/commit/697a22925ccaedf95ae0ce0dc1df6eeeeef1554f) |
| 12.11.2026 | **A-01a–d, Teilabschluss** | Isolierte API-Codepfad-Baseline 1/2/3 Spieler, Nova/Titan und Leerlauf erhoben. **A-01e offen:** Cloud-Zähler. | [Server Tests](https://github.com/schmitti92/serverfinal/actions/runs/43244351339) – 574 bestanden | 1/2/3: **41/24, 72/44, 100/62**; Bots **100/31**; Idle **40/0** (*nur Offline-Methodenaufrufe*) | [Test-Commit](https://github.com/schmitti92/serverfinal/commit/4203f7fdb61deb917ad19205dd003db26e0b2d2a) · [Messbericht](./100-TORE-FIRESTORE-A01-MESSBERICHT.md) |
| 12.11.2026 | **A-01e: kontrollierte Live-Spielmessung** | Zwei Firebase-Nutzungsscreenshots vor/nach einem Spiel, laut Nutzer bei ruhendem sonstigem Projektbetrieb; Messabstand 16:32–16:45 Uhr, nicht als Spieldauer interpretiert. Weitere Szenarien offen. | Nutzerbeobachtung mit Original-Screenshots | **+145 Reads / +26 Writes = 171 Firestore-Vorgänge** | Dokumentation auf `main`, keine Spielfunktionen geändert |
| 12.11.2026 | **A-01e Vorbereitung** | Dreiergruppen-Polling mit 3 s je Client isoliert gemessen, echte Render-/Cloud-Messbarkeit geprüft, CSV vorbereitet. **Produktivwerte noch offen.** | [Server CI erfolgreich](https://github.com/schmitti92/serverfinal/actions/runs/43248227536) + drei weitere Workflows grün | 1/2/3: **129/24, 248/44, 364/62**, nur simulierte DB-Methodenaufrufe | [Test](https://github.com/schmitti92/serverfinal/commit/90bc7902aa223162866d5db0a33247a975eef5f0) · [Bericht](./100-TORE-FIRESTORE-A01-MESSBERICHT.md) · [Live-Werte-Vorlage](./100-TORE-A01E-LIVE-MESSWERTE.csv) |
| 12.11.2026 | **A-02a–d, Teilabschluss** | Freiwillige lokale HTTP-/Serverzeit-Diagnose in Boss 10 und Gruppenbossen; CSV-Export für echte Messungen verfügbar. **A-02e offen.** | [Client checks grün](https://github.com/schmitti92/Spiel-client/actions/runs/43250565768) | **Keine** neuen diagnostischen Firestore-Reads/Writes; Browser-Live-Messwerte fehlen | [Messbericht](./100-TORE-A02-NETZWERK-MESSBERICHT.md) · [Diagnosemodul](../dog-network-diagnostics.js) |

---

| 12.11.2026 | **A-03 erledigt** | Bestehende Regressionstests nach Anforderungen zugeordnet: 1/2/3 Helden, 5 Minispiele, Kettenbrecher, Countdown, Sieg/Niederlage, Legacy-Versionen, Bots und Wiederholungsschutz. Keine doppelten Testdateien erstellt. | [Backend-CI grün](https://github.com/schmitti92/serverfinal/actions/runs/43248227536), [Frontend-CI grün](https://github.com/schmitti92/Spiel-client/actions/runs/43252085732) | 0 zusätzliche Reads/Writes; keine Spielfunktionsänderung | Dieser Plan; nächster Schritt A-04 |

| 12.11.2026 | **A-04 erledigt (Code-Backup)** | Beide Repositories auf gesicherte Branches `backup/a04-2026-11-12` mit verifizierter Commit-SHA gesetzt; Render/Pages und Boss-API-Verträge dokumentiert. Daten-Rollback bei zukünftigen Schemaänderungen separat sichern. | [Frontend-CI](https://github.com/schmitti92/Spiel-client/actions/runs/43252576463) · [Backend-CI](https://github.com/schmitti92/serverfinal/actions/runs/43248227536) | 0 zusätzliche Firestore-Reads/Writes | [Frontend-Backup](https://github.com/schmitti92/Spiel-client/tree/backup/a04-2026-11-12) · [Backend-Backup](https://github.com/schmitti92/serverfinal/tree/backup/a04-2026-11-12) |

| 12.11.2026 | **S-01 implementiert** | Stabiles serverseitiges Trefferprotokoll mit Sequenz/Kampf-ID und LP-Änderung, für Boss 10 und Gruppenbosse. Live-UI, Chronik, Resultat/Replay lesen denselben Stream, Legacy-Fallback bis v10. Keine Änderungen an Rewards oder gespeicherten Spielständen. | [Server-CI grün](https://github.com/schmitti92/serverfinal/actions/runs/43254116063) · [Frontend-CI grün](https://github.com/schmitti92/Spiel-client/actions/runs/43254574944) | **0 neue Firestore-Reads/Writes durch die Ableitung** | [Backend-Commit](https://github.com/schmitti92/serverfinal/commit/48fbb290ecc04c88e34621a77ae615f41414d5ca) · [Frontend-Commit](https://github.com/schmitti92/Spiel-client/commit/41925ad89b2c3ff3291a92d198ff58730a81457c) |

| 12.11.2026 | **S-02 erledigt (technisch)** | Serverseitige Endschaden-Abstimmung mit Team-Finalschlag, separatem Übertreffer und historischer Glücksabwehr; Tabelle und Replay zeigen das Ergebnis. Alte Kampfdaten werden nicht umgeschrieben. | [Server-CI grün](https://github.com/schmitti92/serverfinal/actions/runs/43256585289), [Frontend-CI grün](https://github.com/schmitti92/Spiel-client/actions/runs/43256793565); echtes Mehrgeräte-UI noch offen | **0 zusätzliche Firestore-Reads/Writes** durch abgeleitete Events | [Backend](https://github.com/schmitti92/serverfinal/commit/9681f8fd76813a49039bfa32527d2a043553b9a0) · [Frontend](https://github.com/schmitti92/Spiel-client/commit/0ce7d42882a6d0c328e5b857f1155d433a9aa1fe) |

| 12.11.2026 | **S-03a (Teilfortschritt)** | Nach erfolgreichem Boss-POST wird die bereits bestätigte `data.view` genutzt und das normale GET-Timing zurückgesetzt. Force-/Reconnect-GET weiterhin möglich; Server unverändert. | Erweiterte bestehende Boss-Reconnect-Tests + reguläre CI (Status nach Commit) | **Bis zu 2 dokumentierte Codepfad-Reads pro vermiedenem GET**; Live-Ersparnis noch nicht erhoben | Frontend-Commit dieses Arbeitsschritts |

**Definition von „fertig“:** Funktion auf GitHub `main` integriert, Frontend-/Backend-Tests erfolgreich, auf echter Anzeige nachvollziehbar, keine ungeklärten Doppelbuchungen oder unnötigen Firestore-Mehrzugriffe, Task abgehakt und Fortschrittsprotokoll ergänzt.

**Nächster Entwicklungsblock:** **S-03b – nach dem schlanken POST/GET-Fix die übrigen Firestore-Reads kritisch prüfen und nur bei echter Kostenersparnis und unverändert schneller Synchronisation weiter optimieren.** A-01e/A-02e und der echte Mehrgeräte-Sichttest bleiben als ergänzende Praxisaufgaben offen.

**Nächste konkrete Schritte:** **A-01e** – bereits dokumentierten kontrollierten Praxiswert (145 Reads / 26 Writes) bei künftigen Spielen um Leerlauf und weitere Szenarien ergänzen und **A-02e** – mit dem neuen `netdiag=1`-Messfeld die reale 1/2/3-Geräte-Baseline plus Nova/Titan erheben. Danach A-01/A-02 abnehmen. **Keine Optimierung als abgeschlossen bezeichnen, solange der Vergleich zur Live-Baseline fehlt.**
