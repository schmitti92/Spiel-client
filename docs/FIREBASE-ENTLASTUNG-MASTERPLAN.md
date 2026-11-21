# 🔥 Firebase-Entlastung – Masterplan für das Spieleportal

**Stand:** 21. November 2026  
**Projekt:** [Spiel-client](https://github.com/schmitti92/Spiel-client) · [serverfinal](https://github.com/schmitti92/serverfinal)  
**Leitlinie:** Stück für Stück optimieren, reale Reads/Writes messen, bestehende Spiele, Konten und Belohnungen unverändert zuverlässig halten.

## Architekturziel

| Baustein | Aufgabe |
|---|---|
| Browser (GitHub Pages) | Brett-, Karten- und UI-Animationen, lokale Timer, Zoom, Effekte, Vorschau |
| Render HTTP/WebSocket | Live-Spielzüge, Statusverteilung, Presence, kurzlebige Caches, Aktionsprüfung |
| Firebase Auth | Login, identifizierbare Benutzer, Tokenprüfung – **beibehalten** |
| Firestore | Verlässliche Dauerstände, Spielwiederherstellung, XP, Guthaben, Gewinnquittungen, Rubbel-/Sammlungsbesitz |

**Regel:** Jede Animation und jeder Tick soll 0 Firestore-Writes erzeugen. Kein riskanter Verlust von Fortschritten durch RAM-only- oder lokale Dateien als einzige dauerhafte Quelle. Write-Entscheidungen nicht aus Browserzustand ableiten.

## Bestandsaufnahme – tatsächlich im Code gefunden

1. `serverfinal/shared-lobby.js` benutzt eine Firestore-Raumsammlung `spielesammlung_hub_v1`. Transaktionen für Änderungen, eine gemeinsame `onSnapshot`-Überwachung je Raum und Render-Instanz und WebSocket-Push sind vorhanden. Die Schutzmechanismen für No-op-Mutationen sowie WebSocket-Raumprojektionen dürfen nicht zurückgebaut werden.
2. `Spiel-client/hub-lobby.js` hat einen 12-s-Fallback, unterdrückt GETs aber bei gesunder, kürzlich aktiver WebSocket-Verbindung. Einzelne Abschlussprüfungen laufen unabhängig davon.
3. `Spiel-client/DOG/app.js` bekommt Spielstände per WebSocket, nutzt HTTP für Aktionen und Wiederherstellung. Der Server trennt private Hände und prüft Spielzüge.
4. DOG-Weihnachtsevent, Forschung, Rubbelauflagen, Gutscheine und Boni verwenden mehrere persönliche und globale Firestore-Dokumente. Diese sind **nicht** ohne Quittungs- und Konsistenztests auf RAM-only umzustellen.
5. `serverfinal/server.js` besitzt für SKYJO und Business bereits RAM-Cache + zusammengefasste ausstehende Hintergrund-Persistenzoperationen; Firestore dient beim Kaltstart der Wiederherstellung. Diese vorhandene Optimierung schützen und unter Last messen.
6. Barikade sendet standardmäßig alle 3 Sekunden einen vorhandenen Snapshot per WebSocket. Ein reiner `broadcast()` ist **kein** Firestore-Write. `persistRoomState()` dagegen schreibt persistent.
7. Deal or No Deal verwendet einen 2,5-s-Spiel-Readcache, 2-s-Raumcache, 30-s-Avatarcache, gemeinsame laufende Reads und RAM-Diagnosewerte. Gewinn- und Kofferaktionen bleiben serverseitig geprüft.
8. `profile-auth.js` verwendet Firebase Authentication. Dies ist von Firestore-Dokumentreads zu unterscheiden.

**Messstatus:** Der vorhandene [100-Tore-A-01-Bericht](./100-TORE-FIRESTORE-A01-MESSBERICHT.md) enthält Offline-Codepfad-Zählungen. Für einen 3-Spieler-Bosskampf: 100 Reads/62 Writes ohne zusätzliches simuliertes Polling; 364 Reads/62 Writes mit zusätzlichem 3-s-Polling pro Spieler. Das sind **keine real abgerechneten Firebase-Verbräuche**. Verifizierte Produktion-Billing-Zähler fehlen weiterhin. Auch die früher beobachteten Tausenden Zugriffe im Leerlauf müssen mit isolierten Live-Zählern aufgeklärt werden.

## Arbeitsplan – kleine Etappen

### Paket 1 – Gemeinsame Lobby / reine Reads (begonnen ✅)
- [x] Parallele HTTP-GETs für denselben Hub-Raum in Render während ihrer Laufzeit zusammenfassen, ohne längerfristige Autorisierung aus dem Cache.
- [x] Abgeschlossene HTTP-Reads unmittelbar freigeben, damit neue Anfragen wirklich frische Daten bekommen.
- [x] Laufende Reads bei bestätigten Raummutation über eine Epochennummer invalidieren.
- [x] Read-only-Abschluss-Preflight-Cache von 2,5 auf 12 Sekunden erhöhen; die endgültige Änderung weiter in einer echten Firestore-Transaktion prüfen.
- [x] RAM-Diagnosezähler für gemeinsame Reads und echtes `get()` ergänzen.
- [x] Regressionstest für parallele Gäste, getrennte Nutzeransicht, No-TTL und Mutation ergänzen; isolierter Funktionscheck bestanden.
- [ ] Gesamte Hub-CI vollständig grün bekommen: vorhandener Testimport `dog/christmas-scratch-editions.js` fehlt in `tests/shared-lobby.test.js`; dieser Blocker tritt schon auf älteren Commits auf und verhindert derzeit den vollständigen Hub-Testlauf.
- [ ] Firebase-Usage vor/nach Paket 1 getrennt bei 5 Minuten Lobby-Leerlauf und 3 gleichzeitigen Browsern messen.

**Backend-Commits (21.11.):** `fe8523ae5e23c96e8a3ae6ca0f25ff784755aaa7` (Backend), `c5310252941117d288ef2df3c6e22769cf80fdc5` (Tests).  
**Abnahme:** erfolgreiche Online-Lobby, autorisierte Spieler/sichtbare Aktualisierung, korrekte Sieger-/Auszahlungsübergänge, keine zusätzlichen Firestore-Writes; Reads-Vergleich in Firebase ablesen.

### Paket 2 – Leerlaufdetektor und Firebase-Messung (in Arbeit)
- [x] In sieben DOG-/Weihnachts-GET-Endpunkten 22 direkte dokumentbezogene Read-Callsites auf gemeinsam genutzte **nur laufende** Firestore-GETs umgestellt: `scratch`, `dog/stats`, `dog/christmas-intro`, `dog/research`, `dog/level`, `christmas-village`, `christmas-tree-rewards`. Kein TTL, keine Änderungen an Transaktionen oder Belohnungen.
- [x] Auf `GET /api/hub/health` den separaten Render-RAM-Zähler `dogMetaInFlightReads` ergänzt (`documentReads`, `sharedReads`, `errors`, `ttlMs: 0`); das sind Anwendungsaufruf- und Cache-Zähler, **keine Firebase-Abrechnungswerte**.
- [x] Isolierte Fake-Firestore-Tests für gemeinsame gleichzeitige Reads, Identitätstrennung und frische Werte hinzugefügt; GitHub Actions `Firebase DOG shared reads (offline)` erfolgreich (21.11.2026).
- [ ] Pro Endpoint und Spielart Zähler für **alle** tatsächlichen `get`-, `tx.get`-, `set`-, `tx.set`- und Listener-Ereignisse ergänzen, ohne zusätzliche Firestore-Zugriffe und ohne Tokens/Benutzer-IDs in Logs.
- [ ] 5 Minuten Ruhe ohne Nutzeraktionen messen: Startseite, Lobby, DOG, SKYJO, Deal, Weihnachtsdorf/100 Tore getrennt.
- [ ] Anzahl aktiver Browser, Render-Instanzen, WebSockets und Firestore-Watcher notieren; gegenüber Firebase-Konsole `spiel-barik` vergleichen.
- [ ] Null-Aktions-Writes suchen und nach Modul/Callsite entfernen; **keine** berechtigte Schreiboperation entfernen.
- [ ] Sicherheits-Alarme setzen, wenn Leerlauf-Write-Anzahl unerwartet steigt.

**Paket-2-Zwischenstand (21.11.2026):** Backend-Änderung `d0173f37770905f1ee1b55989097ed74481c8c5b`, eigenständiger Regressionstest `88fa4c591e46ede1e5c65b4d5129b5d58dc43635`. Die neue Optimierung betrifft 22 **Code-Stellen**, nicht eine garantierte Einsparung von 22 Firestore-Reads je Aufruf. Tatsächliche Einsparung entsteht nur bei zeitlich überlappenden Anforderungen derselben Dokumentpfade; reale Produktion-Zähler müssen weiterhin gemessen werden.

### Paket 2b – DOG-Leerlauf und Freischaltungsabfragen (21.11.2026, umgesetzt)

- [x] Weihnachtsdorf: periodischer Sicherheitsabgleich der gemeinsamen Dorfansicht von 30 auf frühestens 180 Sekunden reduziert (**theoretisch bis zu 83 % weniger automatische HTTP-GETs** bei dauerhaft sichtbarer Dorfansicht).
- [x] Hintergrundtabs und Event-Reiter ohne Dorfübersicht (Rubbellose, Level, Forschung, Statistik) führen keine regelmäßigen Dorf-GETs aus.
- [x] Schnelle Reiterwechsel und erneutes Sichtbarwerden fragen das Dorf nur dann neu ab, wenn der letzte erfolgreiche Stand älter als 60 Sekunden ist. **Manueller Refresh, Kauf und Fehler-Wiederherstellung bleiben sofort**.
- [x] Freischaltungsprüfung: Fokus + Sichtbarwerden innerhalb von 20 Sekunden teilen die bereits bestätigte Berechtigung; nach DOG-Partie und Siegerehrung wird unabhängig von dieser Frist unverzüglich beim Server geprüft.
- [x] Unnötige zweite Startprüfung nach 1,7 Sekunden unterdrückt, sobald Firebase Auth beim ersten Aufruf bereits angemeldet war. Nutzerwechsel während einer laufenden Prüfung löst eine neue Prüfung aus.
- [x] Script-Cache-Versionen erhöht und gezielte Regressionstests in `tests/dog-christmas-intro-gate.test.mjs` ergänzt.
- [ ] Reale Firebase-Zähler nach 5 Minuten Leerlauf und bei 3 parallelen Browsern vergleichen.

**Einschränkung:** Die 83 % sind ein Vergleich der *automatischen HTTP-Aufrufe* (30 zu 180 Sekunden), nicht verifizierte abgerechnete Firestore-Dokumentreads. Manuelle Aktionen, Anmeldung und andere UI-Abfragen sind nicht in diesem Wert enthalten. Gemeinsame Ausbauten durch andere Spieler können im offenen Dorf bis zum nächsten Sicherheitsabgleich verzögert sichtbar werden; Server-Transaktionen bleiben maßgeblich.

### Paket 3 – DOG und Weihnachts-Event
- [x] **Rubbellos-Reiter:** Für dasselbe angemeldete Profil einen erst vor maximal 20 Sekunden abgerufenen Shopstand wiederverwenden. Dies spart bei schnellen Tabwechseln den serverseitigen GET mit mindestens neun Firestore-Dokumentreads plus den Variantenauflagen.
- [x] **Sofortige Invalidierung:** Nach Level-Gutschein-Abholung, Forschungsticket oder Dorf-Ausbau muss der Scratch-Reiter frisch vom Server lesen. Manueller Aktualisieren-Button umgeht den Puffer; andere Profile können nie den alten Stand übernehmen. Käufe und Gewinne bleiben serverseitig transaktional.
- [x] Pure Offline-Regression für Nutzerwechsel, Cache-Ablauf, erzwungene Aktualisierung und ungültige Uhrzeiten; CI für DOG Weihnachts-Rubbellose prüfen.
- [ ] Andere identische Profil-/Level-/Forschungs-GETs über längere Besuche inventarisieren und sichere Singleflight-Caches mit Authentifizierung pro Benutzer hinzufügen.
- [ ] Spielzug, 7er-Zug, Tausch, Kartenwechsel, Eventfelder, Baum-Level und Gewinne unabhängig voneinander testen.
- [ ] Private Handkarten nie in globale Render-Caches oder über fremde Sockets geben.
- [ ] Gewinne nur bei serverbestätigtem Ereignis und mit eindeutigen Idempotenz-IDs speichern.

### Paket 3b – Einmalige Weihnachtsdorf-Migration (21.11.2026)

- [x] Das Event prüft die mögliche Übernahme älterer, personenbezogener DOG-Dorfstände jetzt **höchstens einmal in sechs Stunden je verifiziertem Nutzer und API-Umgebung**, statt bei jedem neuen Seitenbesuch oder Reload. Nur eine **erfolgreiche** Serverprüfung erhält einen Prüfzeitstempel im Browser; Fehler werden nicht als erledigt gespeichert. Bei deaktiviertem localStorage bleibt ein sitzungsinterner Zeitstempel.
- [x] Die neuen Clients rufen `POST /api/hub/christmas-village/import` mit `metadataOnly:true` auf und holen das aktuelle gemeinsame Dorfguthaben weiterhin **immer** separat über `GET /api/hub/christmas-village`. **Guthaben, Gebäudestufen und Gewinne werden nie aus dem lokalen Prüfstempel abgeleitet.**
- [x] Der Server liest im `metadataOnly`-Modus bei fehlendem oder bereits vollständig migriertem Altbestand nur das persönliche Legacy-Dokument (**ein statt zwei Firestore-Dokumentreads pro Importprüfung**). Existiert übertragbarer Altbestand, bleiben beide Reads und die atomaren Updates erhalten. Ältere Clients ohne `metadataOnly` erhalten weiterhin unverändert die komplette Dorfdaten-Antwort.
- [x] Serverseitige Offline-Integrationstests prüfen Authentifizierung, realen Firestore-Lesezähler, den echten Merge von Weihnachtslichtern, den Schutz vor Doppelbuchungen und die Rückwärtskompatibilität. Separater Client-Test prüft Nutzertrennung, API-Trennung, Sechs-Stunden-Ablauf und weiterhin frische Dorfdaten. Beide gezielten CI-Reihen grün.
- [ ] Firebase-Konsole vor/nach einem identischen Spiel- und Browser-Szenario auswerten.

**Rechenbeispiel:** Bei zehn erneuten Seitenbesuchen innerhalb von sechs Stunden entfallen im Normalfall zehn Import-POSTs und damit bis zu zwanzig bisherige Transaktions-Reads eines Profils; der aktuelle globale Dorfstand wird weiterhin bei jedem notwendigen Dorf-GET gelesen. Bei der ersten Prüfung ohne Altbestand sinken die Reads von zwei auf eins. Das sind **technisch vermiedene Leseaufrufe**, keine belegten abgerechneten Firebase-Einsparungen.

### Paket 3c – Rubbellos-Einstellungen, Grinch-Fortschritt und Emoji-Rechte (21.11.2026)

- [x] **Rubbellos-Einstellungen:** Beim Speichern einer alten/unvollständigen Einstellungsmaske werden die bisherigen Werte nur noch **ein einziges Mal** aus dem globalen Firestore-Dokument gelesen. Vorher konnten vier unabhängige Sicherheits-Fallbacks jeweils `ref.get()` auslösen. Vollständig ausgefüllte Einstellungen brauchen weiterhin **null** vorgeschaltete Reads.
- [x] Gesonderte Sicherheit für `coinAmounts`, Symbolwahrscheinlichkeiten, Glückszahl 1, Geschenkelinie und Schneeflocken-Bingo bleibt erhalten; die eigentliche Einstellungen-Speicherung ist unverändert. Isolierter Integrationstest `tests/firebase-scratch-settings-single-read-offline.test.js` zählt bei alten Formularen einen Read und einen Write, bei vollständigen Formularen null Reads und einen Write, bei fehlerhaften Formdaten null Writes. GitHub Actions: **erfolgreich**.
- [x] **Grinch-Fortschritt:** Gleichzeitige autorisierte `GET /api/hub/grinch/progress` teilen die *gerade laufenden* Firestore-GETs für persönliche Missionen und globalen Weihnachtsbaum, ohne persistente TTL oder fremde Nutzer-Zuordnungen.
- [x] **DOG-Emoji-Freischaltungen:** Gleichzeitig gestartete Prüfungen der persönlichen Rubbellos-/Baum-Berechtigungen verwenden dieselbe Singleflight-Leseverwaltung; die bisherige persönliche Socket-Gültigkeitsprüfung bleibt bestehen. Keine Änderungen an Auszahlungen.
- [x] **DOG-/Kniffel-Statistik und Raum-Geschenkansichten:** Parallel identische Raum-GETs und persönliche Dokument-GETs werden während ihrer Ausführung zusammengefasst; abgeschlossene Leseergebnisse werden nicht länger als Autorisierung verwendet. Für die DOG-Statistik gilt zusätzlich eine **30-Sekunden-Anzeigewiederverwendung nur bei gleichem Raum und gleichem Profil**, manuelles Aktualisieren liest stets neu. Isolierte API-/Browser-Tests für parallele Nutzer, Zugriffsrechte und Frische erfolgreich.
- [x] **No-op Raumaktionen:** Erfolglose oder identische, serverseitig geprüfte Aktionen und unveränderte Rejoins löschen nicht mehr unnötig den Render-Lesecache. Bei tatsächlicher Änderung oder einer neueren Revision auf einem zweiten Render-Server wird er weiterhin invalidiert. Fake-Firestore-Regression bestätigt.
- [ ] Tatsächliche abgerechnete Firestore-Reads/Writes unter reproduzierbarer Last bei Firebase messen.

**Einsparung:** Beim Rubbellos-Einstellungsspeichern sind durch Code und Offline-Tests **bis zu drei vermiedene GETs pro Save** nachgewiesen. Bei den anderen Optimierungen hängt die Einsparung von gleichzeitig stattfindenden Anfragen, Reiterwechseln und unveränderten Aktionen ab. Dies sind noch keine Produktion-Billingwerte.

### Paket 3d – 3.000 DOG-Schreibvorgänge in 10 Minuten: Hauptverursacher prüfen (21.11.2026)

**Beobachtung:** Nutzer meldete **3.000 Firestore-Writes in 10 Minuten** während DOG. Der Wert entspricht 5 Writes/Sekunde im Durchschnitt. Noch fehlt die Aufteilung nach Firestore-Sammlungen; die Zahl ist daher **nicht** einzelnen DOG-Teilfunktionen bewiesen zugeordnet.

- [x] **Normalen DOG-Ablauf auditiert:** Client sendet Spielzüge über `POST /api/hub/rooms/:code/dog/action`. WebSocket-Pings und das Fallback-GET im DOG-Spiel lösen keinen Spielstand-Write aus. Ein regulärer bestätigter DOG-Zug persistiert den Raum **einmal**; nur bei tatsächlichen Weihnachtslichtern, Rubbellos-Gutscheinen oder Spielende folgen zusätzliche, weiterhin transaktional gesicherte Dokumentänderungen.
- [x] **Unveränderte DOG-Bereitschaft:** Doppelte `POST /ready`-Aufrufe mit gleichem Bereitschaftsstatus erzeugen keine neue Raumrevision und keinen Firestore-Write. Die letzte echte Ready-Bestätigung startet weiterhin automatisch die Partie.
- [x] **Doppelte DOG-Lobby-Auswahl und wirkungslose DOG-Aktionen:** Der Server vergleicht den echten autoritativen Raumzustand **vor und nach** dem geprüften Callback. Nur wenn wirklich kein Feld und kein zusätzliches Transaktionsdokument geändert wurden, unterbleibt die zusätzliche Raum-Speicherung. Normale Kartenwechsel, Gewinner, Belohnungen, Hostwechsel und Zugfolgen bleiben durable.
- [x] **Live-Schreibdiagnostik:** `GET /api/hub/health` liefert `dogWrites10m` (Zahl der DOG-Transaktionen und Firestore-Schreiboperationen nach Sammlung, z. B. `spielesammlung_hub_v1`, `dog_christmas_villages_v1` oder `dog_christmas_scratch_v1`) und `hubMutationCache.dogAutoNoops`. Zähler werden ausschließlich in Render-RAM aktualisiert, enthalten keine Spieler-IDs/Geheimnisse und erzeugen **null weitere Firebase-Reads/Writes**. Nur erfolgreich beendete Transaktionen zählen – Retries werden nicht doppelt gezählt.
- [x] Regressionstests für tatsächliche Lobby-Doppelaktionen, Benutzeranmeldung, Sicherheitsvalidierung, Rollback-Prüfung und Transaktionszählung: `tests/firebase-dog-write-diagnostics-offline.test.js`, Workflow `Firebase DOG writes 10-minute diagnostics (offline)`.
- [ ] Nach einer **vergleichbaren aktiven DOG-Partie** die `dogWrites10m.byCollection`-Aufteilung prüfen. Diese zeigt, ob room, village, scratch wallet, Grinch oder andere Endpunkte zuerst saniert werden müssen. Firestore-Konsole mit demselben Zehn-Minuten-Fenster vergleichen; der RAM-Zähler deckt nicht automatisch eigenständige Endpunkte anderer Backend-Module oder externe Clients ab.
- [ ] Weitere Belohnungs-Bündelung (z. B. 10er-Losvorrat) **erst nach** Bestimmung des tatsächlichen Hauptverursachers und mit Crash-Recovery, idempotenten Gewinnbelegen sowie einer finalen Datenbankbuchung implementieren. Nicht die einzige durable Kopie im flüchtigen Render-RAM halten.

**Wichtig:** Ein verifizierter DOG-Zug muss weiterhin dauerhaft persistiert werden. Ohne einen anderen zuverlässigen dauerhaften Speicher wäre eine reine Render-RAM-Ablage verlustanfällig. Keine behauptete absolute Prozentersparnis vor dem Nachtest.

### Paket 4 – SKYJO / Business / Barikade
- [ ] Bereits vorhandene Hintergrund-Checkpoint-Queues und RAM-Caches auf Quota-/Stale-Revision-/Crash-Sicherheit prüfen.
- [ ] Überflüssige Revisionsänderungen bei unverändertem Spielzustand verhindern, aber notwendige Checkpoints beibehalten.
- [ ] Heartbeats nicht als Persistenz zählen; WebSocket-Reconnect und aktives Rejoin testen.
- [ ] Test mit 1, 3 und 4 Spielern; vorher/nachher Reads/Writes und Lade-/Eingabezeiten notieren.

### Paket 4b – KreuzKunter und schnelle Party-Minispiele (21.11.2026)

- [x] **KreuzKunter-Hub und klassische Räume:** Online-/Offline-Anwesenheit nur über WebSocket verteilen, ohne Firestore-Schreibvorgang oder Änderung der dauerhaften Revision. Nur echte Spielaktionen, neue Teilnehmer/Profilbesitz, Hostwechsel und Ergebnisquittung speichern.
- [x] Offline-Regression gegen die **echte KreuzKunter-Engine** (`tests/kreuz-hub.test.js`) zählt Firestore-Write-Aufrufe, prüft Reconnect/Disconnect, Würfelzug und Wiederherstellung nach simuliertem Neustart. GitHub Actions `Firebase KreuzKunter Presence Writes (offline)`: erfolgreich.
- [x] **Snake:** Zwischenstands-Checkpoint frühestens alle 600 ms statt 80 ms, Zeitprüfungen alle 3 s statt 800 ms. Keine unnötigen Raum-Writes bei unverändertem Spielstand; Endstand sofort.
- [x] **Lava:** Bewegungs-Checkpoint frühestens alle 350 ms statt 90 ms, Sicherheitsprüfung frühestens alle 1800 ms statt 750 ms; bei völlig inaktivem Feld ohne Gefahren/Bots wird ein Schreibvorgang ausgelassen.
- [x] Isolierte Client- und Server-Tests für die Bewegungstaktung und No-op-Transaktionen sind grün.
- [ ] Reale Firebase-Reads/Writes in der Firebase-Konsole bei denselben Spielerzahlen und Aktionen vor/nach dem Umbau vergleichen.

**Hinweis:** Alle genannten Takte betreffen HTTP-Statusmeldungen und die gezielt verhinderten Writes, nicht die Spielframerate. Tatsächliche Firebase-Abrechnung und Effekte anderer Spielmodule sind noch nicht gemessen.

### Paket 5 – Deal or No Deal und SKYJO-Slot-Belohnungen
- [ ] Doppeltes Laden von Raumstatus, Deal-Spielstand, Avatar und Geldbeutel durch mehrere Spieler zusammenführen.
- [ ] Jackpot-Payout, Kofferangebot, Slot-Gutscheine und Einlösequittungen unverändert atomar halten.
- [ ] Synchronisierung nach Render-Neustart, doppeltem Klick, wiederholten POSTs und instabiler Verbindung testen.

### Paket 6 – Profile, XP, Inventare und globaler Fortschritt
- [ ] Nur unveränderte, unkritische Lesedaten sinnvoll zwischenspeichern; bei Änderung sofort invalidieren.
- [ ] Freischaltungen, Gewinnauflagen und Käufe weiterhin Firestore-transaktional und idempotent.
- [ ] Gemeinsam genutztes Weihnachtsdorf besonders sorgfältig auf Konkurrenz zwischen Spielern prüfen.

### Paket 7 – Abschluss, Monitoring und Migration nur bei Bedarf
- [ ] Messwerte mit derselben Anzahl Spieler und Aktionen wie in der Baseline vergleichen.
- [ ] Live-Nutzungszähler aus Firebase abgleichen; Render-GETs sind **nicht** identisch mit Firestore-Dokumentreads.
- [ ] Wenn Last trotz Optimierung zu hoch bleibt: Umstellung auf Render-first room-state mit zuverlässigem durable Store/Checkpoint-, Crash-Recovery- und Mehrinstanzkonzept separat planen.
- [ ] Sicherheits-Rollback über GitHub-Commits möglich halten; Firebase Auth und bestehende Guthaben niemals pauschal abschalten.

## Messvorlage je Paket

| Messung | Vorher | Nachher |
|---|---:|---:|
| Anzahl Spieler / Browser | noch erfassen | noch erfassen |
| Dauer / Spielart / Aktionen | noch erfassen | noch erfassen |
| Firebase Firestore Reads | offen | offen |
| Firebase Firestore Writes | offen | offen |
| Server-`get()`-Aufrufe (getrennt) | offen | offen |
| HTTP GET/POST und WebSocket-Updates | offen | offen |
| p95-Latenz, Fehler, falsche/duplizierte Gewinne | offen | offen |

**Jedes Paket ist erst abgeschlossen, wenn Gameplay nicht schlechter funktioniert und die behauptete Entlastung entweder real nachgewiesen oder ausdrücklich als theoretisch gekennzeichnet wurde.**
