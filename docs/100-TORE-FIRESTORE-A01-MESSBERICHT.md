# A-01 – Firestore-Verbrauch: Messbericht und technische Ausgangsbilanz

**Stand:** 12. November 2026 · **Status:** technische Baseline im Offline-Test erhoben, **reale Firebase-Abrechnung noch nicht gemessen**.

**Geltungsbereich:** Neue Boss-10-Kämpfe, v14, 135 Sekunden, fünf Minispiele; gleiche grundlegende Firestore-Abläufe gelten für andere Gruppenbosse. Für einen realen Spieleabend wurden bewusst **keine** Testkämpfe auf Produktionskonten ausgeführt und **keine** Spielstände verändert.

## 1. Was wirklich gemessen wurde – und was nicht

**Gemessen:** Die konkreten `get`-/`tx.get`- sowie `tx.set`-/`tx.create`-Aufrufe des unveränderten Backend-API-Codes. Dafür führt der automatische Test `tests/dog-firestore-a01.test.js` aus [serverfinal](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-firestore-a01.test.js) reale HTTP-Handler und fünf Minispiel-Programmpfade gegen eine **isolierte, zählende In-Memory-Firestore-Attrappe** aus. Keine Netzwerkverbindung zu Firestore, keine Gebühren, keine Produktionsänderung. **Automatischer Test erfolgreich:** [Server tests #43244351339](https://github.com/schmitti92/serverfinal/actions/runs/43244351339), 574 Tests bestanden, 0 fehlgeschlagen.

**Nicht gemessen:** Die *tatsächlich abgerechneten* Firestore-Reads/Writes im Projekt `spiel-barik`. Die Firebase-/Cloud-Usage-Metriken sind mit den aktuellen verbundenen Werkzeugen nicht auslesbar. Die angefragten Render-Metriken `http_request_count`/`http_latency` lieferten keine Datenpunkte für den abgefragten Zeitraum; dies bedeutet **nicht „0 Requests“**. Render-App-Logs bestätigen jedoch, dass Firestore im Server aktiviert ist. Render-HTTP-Metriken wären ohnehin **nicht identisch** mit Firestore-Dokumentoperationen.

**Deshalb:** Die Zahlen unten sind **reproduzierbare API-Codepfad-Zählungen**, keine Firebase-Produktions-Verbrauchswerte oder Kostenrechnungen.

## 2. Reproduzierbare Ausgangszahlen des isolierten Integrationstests

### A. Vollständiger Boss-10-Kampf: 1 / 2 / 3 echte Spieler

Je vollständigem Szenario wurden alle fünf Minispiele mit erfolgreichen Eingaben durchgeführt; je Held **9 Minispiel-POSTs** (1× Mathe-Bündel, 3× Ausweichen, 1× Farbe/Symbole-Bündel, 3× Reaktion, 1× Kettenbrecher-Bündel). Es gab die nötigen `ready`-/`start`-Aktionen, **einen** `finish`-POST und lediglich **zwei** `GET`-Statusabfragen. Keine Verbindungsprobleme, keine zusätzlichen Browser-GETs, kein Firestore-Profil-Cache und keine SDK-Transaktionswiederholungen.

| Messszenario | GETs | POSTs | Firestore-ähnliche Dokument-Reads | Dokument-Writes | Transaktionen |
|---|---:|---:|---:|---:|---:|
| **1 echter Held** | 2 | 12 | **41** | **24** | 12 |
| **2 echte Helden** | 2 | 22 | **72** | **44** | 22 |
| **3 echte Helden** | 2 | 31 | **100** | **62** | 31 |

**Wichtige Aufschlüsselung:**

- **Normales Boss-GET:** 2 Reads (Team, Fortschrittsdokument), 0 Writes, sofern kein Bot-Fortschritt und kein überfälliger Kampfabschluss gespeichert werden.
- **Frischer Boss-POST:** normalerweise 3 Reads (Idempotenz-Quittung, Team, Fortschritt), **2 Writes** (Fortschritt + Quittung). Zusätzliche Reads entstehen beim tatsächlichen Start für das Einfrieren der Held-Ausrüstung.
- **3-Spieler-Kampf:** 27 Minispiel-POSTs erzeugen allein **81 Reads + 54 Writes**; 3 Bereitschafts-POSTs (einschließlich 3 Equipment-Reads) weitere 12 Reads + 6 Writes; ein Abschluss-POST weitere 3 Reads + 2 Writes; 2 GETs weitere 4 Reads.
- **Duplikat mit identischer Request-ID:** 3 Reads bei Replay, aber im wiederholten Vorgang keine neuen Writes, sofern der Quittungsdatensatz bereits existiert. Fehlgeschlagene Transaktionen und SDK-Retries können reale Reads dennoch beeinflussen.

### B. Bosskampf mit einem echten Spieler sowie Nova und Titan

Der vollständige 135-s-Kampf lief mit **einem echten Spieler und zwei serverseitigen Testspielern**. Es gab einen `ready`-POST, neun echte Minispiel-POSTs und **29 GETs** (Startstatus plus Abfragen in Schritten von fünf Sekunden bis zum Kampfabschluss). Die Testspieler wurden über den realen Server-Algorithmus auf den GETs weiterberechnet.

| Messszenario | Gesamt-Requests | GETs | Reads | Writes | Transaktionen |
|---|---:|---:|---:|---:|---:|
| **1 Mensch + Nova + Titan** | 39 | 29 | **100** | **31** | 21 |

- **11 der 29 GETs** führten wegen fortgeschrittener Botaktionen oder Kampfabschluss eine Transaktion mit **je 1 weiterem Read und 1 Write** auf dem gemeinsamen Fortschrittsdokument aus.
- Bot-Aktionen werden im selben Fortschrittsdokument gesammelt, nicht als separate POST-Quittungen pro Bot-Tipp.
- Die **29 GETs in 135 Sekunden** sind ein **festes Testschema**, keine Messung der realen Browser-Abfragefrequenz.
- Ausgeschlossen bleiben zusätzliche Profil-Lookups, die Live-Pilot-Eigentümerprüfung, andere gleichzeitig geöffnete Seiten sowie Firestore-Retries.

### C. Leerlauf und wiederholte Statusabfragen

| Isoliertes Szenario | GETs | Dokument-Reads | Dokument-Writes |
|---|---:|---:|---:|
| Wartende Seite: **20 GETs über 5 Minuten** bei 15-s-Abstand | 20 | **40** | 0 |
| 90 Status-GETs ohne Zustandsänderung | 90 | **180** | 0 |

Damit ist der wesentliche Zusammenhang bestätigt: **Jeder zusätzliche unveränderte Boss-GET erzeugt mindestens zwei Datenbank-Leseoperationen.** Insbesondere bei mehreren gleichzeitig geöffneten Browsern kann das Polling den Verbrauch dominieren.

### D. Zusätzlicher Offline-Test mit drei Sekunden HTTP-Polling pro echtem Browser

Am **12.11.2026** wurde ein weiterer reproduzierbarer Test ergänzt, der während des ansonsten unveränderten vollständigen 135-s-Kampfes für **jeden echten Browser alle 3.000 ms** einen zusätzlichen Status-GET sendet (3 s bis 132 s, also **44 zusätzliche GETs je Browser**). Die in Abschnitt A enthaltenen zwei GETs bleiben erhalten. Dieser Test zählt dieselben isolierten Backend-Firestore-Methodenaufrufe und verändert keine Live-Spielstände.

| Szenario | Alle GETs | HTTP-Zusatz-GETs | Simulierte Dokument-Reads | Dokument-Writes |
|---|---:|---:|---:|---:|
| 1 Mensch, alle 3 s | 46 | 44 | **129** | **24** |
| 2 Menschen, je alle 3 s | 90 | 88 | **248** | **44** |
| 3 Menschen, je alle 3 s | 134 | 132 | **364** | **62** |

**Unterschied zum Minimaltest:** Bei 3 echten Spielern erzeugen allein die 132 zusätzlichen Status-GETs **264 zusätzliche Reads**, aber im isolierten Fall **keine zusätzlichen Writes**. Das ist ein klarer Hinweis auf das spätere Optimierungspotenzial bei Statusabfragen, **kein tatsächlich gemessener Produktionsverbrauch**.

**Grenzen:** Alle GETs folgen einer gleichmäßigen 3-s-Frequenz. Die reale Browserlogik verwendet je nach Phase unter anderem 850/1.200/2.800/3.800/15.000 ms, eine bestehende 3-s-Drossel, Sichtbarkeitsprüfung sowie situationsbedingte Updates. Mehrere geöffnete Tabs, Auth-/Profil-/Pilotzugriffe, Retry und Firestore-Abrechnung sind nicht abgebildet. Der Test liefert **eine illustrative Kostensensitivität** und darf nicht als vollständige reale Netzwerk- oder Cloud-Messung bezeichnet werden.

**Belege:** [Test-Commit](https://github.com/schmitti92/serverfinal/commit/90bc7902aa223162866d5db0a33247a975eef5f0) · [Server tests](https://github.com/schmitti92/serverfinal/actions/runs/43248227536) · [Node tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225233) · [Multiplayer regression tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225444) · [Shared lobby feature tests](https://github.com/schmitti92/serverfinal/actions/runs/43248225104) (alle erfolgreich).

## 3. Produktionsseitige Zusatzkosten, die im Offline-Test fehlen

Diese Faktoren sind im produktiven Code vorhanden, aber **nicht im obigen Zahlenwert enthalten**:

1. **Spieleridentität:** `profile-stats.js` liest das Firestore-Profil bei Cache-Miss; pro UID wird es auf einem Serverprozess 15 Sekunden zwischengespeichert. `Firebase Auth.verifyIdToken(idToken,true)` läuft trotzdem bei jeder Anfrage – das ist keine Firestore-Dokumentlesung, kann aber eigene Latenz verursachen.
2. **Privater Testzugang:** `dog-live-bots.js` liest das Live-Pilot-Eigentümer-Dokument bei abgelaufenem 30-s-Servercache, wenn die geschützten Gates-Routen aufgerufen werden.
3. **Browser-Polling:** Der Client prüft alle 250 ms den lokalen Zeitplan, sendet aber nur bei Ablauf der dynamischen GET-Frist einen HTTP-Request. Im Kampf unterscheidet er u. a. normale Minispiele (ca. 2,8 Sekunden, **außerhalb von Interludes zusätzliche 3-s-Drossel**) und Zwischenphasen (anfänglich ca. 0,85 Sekunden, später ca. 2,8 Sekunden). Andere geöffnete Karten-/Schmiedeseiten erzeugen eigene Zugriffe.
4. **GET mit Zustandsänderung:** Live-Bots und überfällige Abschlüsse lösen eine weitere Transaktion aus und können auf GETs tatsächlich Writes produzieren.
5. **Weitere Schreibvorgänge:** Torfortschritt, Materialbelohnungen, Schmiede, Profiländerungen oder Aktionen in Deal or No Deal gehören *nicht* zur isolierten Boss-10-Messung; bei einer Gesamtverbrauchsmessung des Firebase-Projekts müssen sie separat zugeordnet werden.
6. **Firestore-Abrechnung:** SDK-Wiederholungen, Lesezugriffe auf fehlende Dokumente, transaktionale Konflikte, mehrere Render-Instanzen, offene Client-Listener und Firestore-interne Abrechnungsdetails können die tatsächliche Projektbilanz von diesen Methoden-Aufrufzahlen unterscheiden.

## 4. Was die Daten bereits zeigen

- **Haupthebel für Reads:** Anzahl der GET-Statusabfragen, jeweils mindestens 2 Dokumentreads, zuzüglich Profil- und Pilotzugriffs-Cache-Misses.
- **Haupthebel für Writes bei echten Spielern:** Die 9 serverseitigen Minispiel-Aktionsquittungen pro Held. Bei drei echten Spielern sind es **27 Minispiel-Requests / 54 Fortschritt-und-Quittungswrites**, obwohl Mathe/Farbe/Kettenbrecher bereits gebündelt senden.
- **Haupthebel im Bot-Test:** Polling trifft Bot-Entscheidungen; in der 29-GET-Simulation entstanden **11 schreibende GET-Transaktionen**.
- **Gut:** Animationen, Treffereffekte, lokale Countdown-Ticks, Schlusswertung und Replay erzeugen laut den überprüften Kampfmodulen keine direkten Firestore-Writes pro Frame.
- **Nicht voreilig sparen:** Quittungen verhindern doppelte Belohnungen, Server-Validierung verhindert manipulierte Ergebnisse. Diese Sicherheit darf nicht einem ungemessenen Reduktionsziel geopfert werden.
- **Besonderer Vorsichtspunkt:** Der 3-s-Schutz im Frontend verhindert zusätzliche GETs außerhalb der Zwischenphasen, in den Zwischenphasen erfolgt aber schnelleres Polling. Erst **Messung der echten Abfragezahl** und des wahrgenommenen Multiplayer-Timings, dann Frequenzen ändern.

## 5. Noch fehlende Produktionsmessung – A-01 ist nicht vollständig abgenommen

Es wurde **kein neues Produktivspiel gestartet**, damit weder Bossfortschritt, Inventar noch Testspielerzustand beeinflusst werden. Die Firebase-Konsole beziehungsweise das Cloud-Monitoring-Dashboard für Projekt `spiel-barik` ist hier nicht direkt verbunden.

### Zusatzprüfung der zugänglichen Produktionsdaten am 12.11.2026

- Render-Service `serverfinal` wurde im zutreffenden Workspace geprüft; letztes Deployment war `live`. Der Render-Metrikabruf für **HTTP-Request-Anzahl** und **p95-HTTP-Latenz** im Zeitraum 14:00–15:22 UTC gab jeweils **eine leere Datenreihe** zurück. Das ist **keine Nullmessung**.
- Render-Request-Logabfragen für Boss-Routen und allgemeine Requests gaben im geprüften Abruf keine verwertbaren Request-Einträge zurück. Andere App-Logs sind vorhanden, also nicht auf „kein Traffic“ schließen.
- Der Render-Zugang stellt **keine Cloud-Firestore-Dokument-Usage-Zähler** bereit. Es gibt derzeit auch keinen verbundenen Zugang zu den Firebase-/Cloud-Monitoring-Metriken von `spiel-barik`. **A-01e bleibt offen**.
- Für die Live-Werte wurde eine **ausfüllbare [CSV-Messvorlage](./100-TORE-A01E-LIVE-MESSWERTE.csv)** hinterlegt. Nur echte, mit Zeitfenster belegte Projekt-Zähler dort eintragen; bei aggregierten Tageswerten nicht behaupten, dass genau ein Bosskampf isoliert gemessen wurde. Keine Spielstände oder Live-Aktionen für die bloße Metrikabfrage verändern.

### Korrekte Interpretation der Cloud-Firestore-Metriken

Die [offizielle Firebase-Dokumentation](https://firebase.google.com/docs/firestore/monitor-usage) unterscheidet **Usage-Dashboard** und **Abrechnungsbericht**: Dokument-Reads/-Writes aus der Firebase-/Google-Cloud-Konsole sind **Nutzungsmetriken bzw. Schätzwerte**, **keine exakte Rechnung**. Bestimmte No-op-Operationen, Index-Reads oder zusammengefasste Writes können zu Abweichungen führen; für tatsächliche abgerechnete Einheiten gilt die Abrechnung als maßgeblich.

Firestore-Metriken werden laut Dokumentation **minütlich erfasst** und können **bis zu vier Minuten verspätet** erscheinen. Für einen 135-s-Test müssen deshalb genaue Zeitfenster und die Auflösung dokumentiert und abgewartet werden. Bei überlappender Aktivität anderer Spieler darf ein Projekt-Gesamtzähler nicht einem einzelnen Kampf zugeschrieben werden. Ein reiner Tageszähler genügt nicht zur exakten Abnahme einzelner Live-Szenarien.

**Benötigt wird ein manueller Cloud-Zugriff mit Leseberechtigung** auf das Projekt `spiel-barik` (z. B. Firestore → Nutzung / Cloud Monitoring). Keine Datenbank-Anmeldedaten oder Service-Account-Schlüssel in GitHub oder Chat hochladen; CSV nur mit Zählern und Zeitfenstern füllen. Die zusätzliche Messung soll **keine** Kämpfe auf produktiven Konten unbeaufsichtigt auslösen.

### Vorzubereitende Messserie, ohne Code-/Spieländerungen

1. **Firestore-Datenbank → Nutzung/Usage** im Firebase-Projekt `spiel-barik` öffnen; exakte Zähler und zeitliche Auflösung dokumentieren. Ein Projekt-Gesamtwert kann nicht nachträglich einer einzelnen Bossrunde zugeschrieben werden, wenn parallel andere Spielmodi genutzt wurden.
2. Möglichst ohne andere aktive Spieler: 5 Minuten Leerlauf messen, **vorher/nachher** Reads/Writes sowie die genaue Start-/Enduhrzeit protokollieren.
3. Einen 135-s-Kampf **solo**, dann **zu zweit**, danach **zu dritt** starten und für jeden Lauf getrennt Reads/Writes **vorher/nachher** notieren. Wenn die Konsole nur grobe Zeitfenster bietet, die Ergebnisse als *Projektänderung im Zeitraum* kennzeichnen und nicht als exakte „Reads pro Kampf“ ausgeben.
4. Einen Lauf **mit Nova/Titan** separat messen, da hierbei GETs auch Writes auslösen können.
5. Parallel die Browser-Netzwerkübersicht für `/api/dog/gates/boss10` / `/api/dog/gates/boss/:gate` nutzen, Anzahl GET/POST und Verzögerungen erfassen; diese HTTP-Zählung ist **nicht** automatisch die Firestore-Zählung.
6. Ergebnisse in **Tabelle 6** ergänzen, erst dann **A-01 als `[x]` markieren** und das geplante mindestens-30-%-Optimierungsziel gegen die gemessene Basis bewerten.

### Tabelle 6 – reale Firestore-Projektzähler (noch nicht vorhanden)

| Produktionsszenario | Start/Ende | Firebase Reads vor → nach | Firebase Writes vor → nach | Andere Nutzer/Apps aktiv? | Verwertbarkeit |
|---|---|---|---|---|---|
| 5 Min. Leerlauf | offen | **nicht zugänglich** | **nicht zugänglich** | unbekannt | offen |
| 135 s, 1 Held | offen | **nicht zugänglich** | **nicht zugänglich** | unbekannt | offen |
| 135 s, 2 Helden | offen | **nicht zugänglich** | **nicht zugänglich** | unbekannt | offen |
| 135 s, 3 Helden | offen | **nicht zugänglich** | **nicht zugänglich** | unbekannt | offen |
| 135 s, 1 Held + Nova/Titan | offen | **nicht zugänglich** | **nicht zugänglich** | unbekannt | offen |

## 6. Belege und Status

- **Codepfad-Messung / automatischer Test:** [`tests/dog-firestore-a01.test.js`](https://github.com/schmitti92/serverfinal/blob/main/tests/dog-firestore-a01.test.js)
- **Erfolgreicher Server-Testlauf:** [Server tests #43244351339](https://github.com/schmitti92/serverfinal/actions/runs/43244351339) (574 bestanden)
- **GET/POST-Codepfad:** [`dog-boss10.js`](https://github.com/schmitti92/serverfinal/blob/main/dog-boss10.js), [`dog-group-boss.js`](https://github.com/schmitti92/serverfinal/blob/main/dog-group-boss.js)
- **Bot-Fortschritt auf GETs:** [`dog-live-bots.js`](https://github.com/schmitti92/serverfinal/blob/main/dog-live-bots.js)
- **15-s-Profilauthentifizierungs-Cache:** [`profile-stats.js`](https://github.com/schmitti92/serverfinal/blob/main/profile-stats.js)
- **Kampf-Client-Polling:** [`dog-boss10.js`](https://github.com/schmitti92/Spiel-client/blob/main/dog-boss10.js), [`dog-group-boss.js`](https://github.com/schmitti92/Spiel-client/blob/main/dog-group-boss.js)

**A-01 Status:** **Teilweise abgeschlossen / Live-Firebase-Zähler fehlen**. Die Offline-Codepfad-Zählung und der Engpass-Überblick sind abgeschlossen; Spiel- und Businesslogik unverändert. **Nächster Schritt:** Zugriff auf Firestore Usage / echte Vorher-Nachher-Zähler, dann A-01 endgültig abnehmen.


## Ergänzung 14.11.2026 – Firestore-Leerlaufoptimierung

**Status:** Code auf `main` geändert; Live-Abrechnungszähler weiterhin nicht direkt auslesbar. Änderungen gelten für sichtbare Browserseiten und erzeugen keine zusätzlichen Firestore-Schreibvorgänge.

| Ansicht und Zustand | Bisheriger HTTP-Abstand | Neuer HTTP-Abstand | GETs bei 1 h ununterbrochen sichtbarer, unveränderter Seite (vorher → nachher) |
|---|---:|---:|---:|
| 100-Tore-Karte | 60 s | 300 s | 60 → 12 (−80 %) |
| Boss-Warteraum, niemand bereit, Push verbunden | 15 s | 90 s | 240 → 40 (−83 %) |
| Boss-Warteraum, niemand bereit, Push getrennt | 15 s | 30 s | 240 → 120 (−50 %) |
| Boss-Warteraum, mindestens ein Held bereit, Push verbunden | 3,8 s (kurzer Burst 0,9 s) | 12 s als Fallback; WebSocket-Änderungshinweise sofort | im reinen Wartezustand ca. 947 → 300 (−68 %), ohne initialen Burst |
| Private 100-Tore-Testansicht, kein laufender Bosskampf | 6 s | 60 s | 600 → 60 (−90 %) |
| Kisteninventar, Tab wird erneut sichtbar | bei jedem Sichtbarwerden | nur wenn letzter Zustand älter als 120 s | abhängig vom Nutzerverhalten |

**Herleitung:** Die Zahlen sind theoretische **HTTP-GET-Anzahlen** aus den festgelegten Mindestabständen, nicht Firestore-Verbrauchszähler. Jeder normale `GET /api/dog/gates/map` liest laut aktuellem Code Team- und Fortschrittsdokument (zwei direkte `get()`). Im normalen unveränderten Kampfstatus liest das Boss-GET ebenfalls mindestens zwei Dokumente (siehe A-01-Baseline). Profilprüfung, Socket-Neuverbindungen, SDK-Retries sowie andere gleichzeitig geöffnete Tabs sind in der Tabelle nicht berücksichtigt. Der private Preview-GET liest initial ein eigenes Sandbox-Dokument und kann bei tatsächlich fälligem Bot-/Kampfabschluss zusätzlich schreibend werden. Im normalen Kartenzustand sollten keine neuen Fortschrittswrites entstehen.

**Synchronisierung:** Während laufender Bosskämpfe bleiben die schnellen 2,8-s-/Szenenintervall-Abfragen und WebSocket-Änderungshinweise erhalten. In der Wartelobby wird bei einem WebSocket-Ereignis weiterhin sofort ein echter Status-Snapshot geladen. Manuelles Aktualisieren, Kämpfe, Materialöffnen, Hero-/Teamaktionen und serverseitige Fortschrittsbestätigungen werden nicht gedrosselt.

**Abnahme:** Der Regressionstest `tests/dog-boss-reconnect.test.mjs` prüft diese Leerlaufgrenzen und die Beibehaltung des schnellen Kampfpfades. Der Vergleich `5 min ohne Aktionen` muss in der Firebase-Konsole für das Projekt `spiel-barik` noch mit isoliertem Zeitraum, genauer Zeitmarke und aktiven Tabs erfolgen. **Keine aus dieser theoretischen Tabelle abgeleitete Firestore-Ersparnis als real gemessen kennzeichnen.**
