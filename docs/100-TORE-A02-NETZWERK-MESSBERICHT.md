# A-02 – Netzwerk- und Timing-Baseline für 100 Tore

**Stand: 12.11.2026 · Status: Messwerkzeug auf `main` eingebaut und automatisch getestet; reale Kampfmessung mit 1/2/3 Geräten noch offen.**

## Ziel und Geltungsbereich

HTTP-Aufrufe/Minute, tatsächliche Antwortzeiten (p50/p95), fehlgeschlagene oder abgebrochene Requests und das erste sichtbare Eintreffen bestimmter **serverbestätigter** Kampfereignisse erfassen – zunächst für Boss 10, anschließend für Tor 20–100. Keine Änderung der Kampfregeln oder Firestore-Lese-/Schreibfrequenz durch das Messwerkzeug.

## 1. Quellcode-Ausgangslage vor einer Optimierung

Die Browseroberfläche in `dog-boss10.js` und `dog-group-boss.js` läuft alle **250 ms** durch einen lokalen UI-/Zeitplan-Tick. Dies ist **kein** HTTP-Request pro Tick:

| Bedingung im Client | Angeforderter Statusabstand | Verbindlicher Zusatzhinweis |
|---|---:|---|
| Lobby/Team wartet ohne Bereitschaft | 15.000 ms | Sichtbare Seite, kein laufender Request |
| Team wartet mit Bereitschaft | 3.800 ms | Kurzzeitig 900 ms nach Wechsel, aber reguläre `reload(false)`-Drossel |
| Normaler laufender Kampf | 2.800 ms | Reguläres GET mindestens ca. alle 3.000 ms |
| Erste 5 s nach Kampfstart | 1.200 ms | `reload(false)`-Drossel von 3.000 ms bleibt wirksam |
| Ausweich-Minispiel | 850 ms | `reload(false)`-Drossel von 3.000 ms bleibt wirksam |
| Inszenierter Schlagabtausch | 850 ms | `reload(true)` – hier kann die 3-s-Drossel umgangen werden |
| Verlängerte Schlagabtausch-Szene | 2.800 ms | `reload(true)` für die Szene |
| Browser-Tab verborgen | kein automatischer Tick-GET | Beim Wieder-Sichtbarwerden wird einmalig `reload(true)` angestoßen |

Außerdem verhindern `inflight` und `working` weitere Status-GETs während laufender Abfrage oder Schreibaktion. Der Client setzt `lastLoad` nach **erfolgreichem UND erfolglosem GET**, um direkte Fehlerschleifen zu verhindern. Die Abfrage wird grundsätzlich nach **18.000 ms** abgebrochen; für `minigame`-POSTs gelten **4.500 ms**. Dies sind **Quellcode-Konfigurationen**, keine beobachteten Netzwerkmesswerte.

**Wichtig:** Die 850-ms-Szenen sind bei großem Antwortzeitversatz oder längerer Antwortdauer nicht gleichbedeutend mit 70 erfolgreichen Antworten pro Minute. GET-Dauer, 250-ms-Tick, Drossel, `inflight`, Spielphase, Tab-Sichtbarkeit und Nutzeraktionen beeinflussen die tatsächlich gemessene Anzahl.

## 2. Eingebautes, freiwilliges Messwerkzeug (A-02a)

**Datei:** [`dog-network-diagnostics.js`](../dog-network-diagnostics.js). In beide Boss-Seiten eingebunden, standardmäßig **inaktiv**.

**Aktivieren:** Auf der Boss-Seite an die URL `?netdiag=1` anhängen. Falls bereits `?gate=20` oder `?room=...` vorhanden ist, **`&netdiag=1`** anhängen. Beispiele:

- `dog-boss10.html?netdiag=1`
- `dog-group-boss.html?gate=20&netdiag=1`

Unten rechts erscheint **„📊 Netzwerk-Messung (lokal)“**. Vor einem geplanten Test **„Neue Messung“** drücken, dann einen regulären Bosskampf spielen und danach **„CSV herunterladen“**. Für einen echten Drei-Geräte-Vergleich auf allen drei Geräten den Parameter aktivieren und die drei CSV-Dateien separat sammeln. Das Werkzeug verändert keine Spielzüge, Vergaben, Minispiele, Requests oder Firestore-Dokumente.

**Gemessene HTTP-Daten ab Beginn des `fetch`:** Arena `boss10/group`, Methode+normalisierter Aktionstyp (`status/ready/start/react/minigame/finish/other`), Zeit seit Messbeginn, Dauer in Millisekunden, `ok/failed/aborted`, HTTP-Status (nur Zahl). Das Auth-Token wird **vor** Beginn der Netzwerkuhr abgerufen; Verzögerungen des Tokenbezugs sind nicht Bestandteil dieser Messung.

**Aggregierte Anzeige:** Anzahl Requests gesamt, Requests/Minute über das Messfenster, Fehler-/Abbruchzahl, p50 und p95 je Aktionstyp. Diese Werte werden ausschließlich **in-memory im Browser** gehalten und nach Reload gelöscht. Kein verstecktes Telemetrie-Upload, keine Verbindung zu Firebase durch die Messung, keine gespeicherten Spieler-IDs, Namen, Raumcodes, Request-IDs, Antworten, Header, Tokens oder Fehlermeldungen.

**Beobachtungs-Zeitversatz:** Das Messwerkzeug speichert die Differenz zwischen `serverNow` der empfangenen Serverantwort und dem vom Server vorgesehenen Zeitpunkt von Kampfstart, Rundenstart, bestätigtem Einschlag sowie Kampfschluss. Diese Werte zeigen die **erste Beobachtung bei einem Server-Snapshot**. Sie messen **nicht** Pixel-Rendering, Audio-Latenz oder exakte physische Netzwerklaufzeit. Beim Kampfende wird `endsAt` als Referenz für `result-after-end` verwendet – nicht der unbekannte tatsächliche Commit-Zeitpunkt. In der Admin-Variante mit verborgenem Cooldown kann ein Resultat in der Antwort nicht als `cooldown` angezeigt werden; die entsprechenden Event-Werte sind dann unvollständig.

**Datenlimit:** maximal 2.500 Request-Zeilen und 700 Beobachtungszeilen pro Seitenaufruf; das Tool meldet, wenn die Grenze erreicht ist. Für die kurze Standardkampf-Messung genügt dies typischerweise. **Nur die Diagnosedaten-CSV weitergeben; keine Bildschirmaufnahmen mit Tokens oder Entwickler-Konsolen-Inhalten nötig.**

## 3. Reproduzierbare automatische Prüfungen

- **`tests/dog-network-diagnostics.test.mjs`** prüft, dass die Diagnose ohne URL-Freigabe ausgeschaltet bleibt.
- Misst GET und POST-Laufzeiten, p95, HTTP-Fehler und Timeout/Abort ohne doppeltes Zählen.
- Prüft das erste Beobachten von Kampfstart, Rundenstart, serverbestätigtem Treffer und Resultat sowie Event-Entdoppelung.
- Prüft, dass sensible Felder eines Spielstands nicht in die CSV gelangen.
- Prüft, dass beide Boss-Seiten das Diagnoseskript vor den Kampfskripten laden und bestehendes `fetch` weiter benutzen.

**Client-CI:** [Spielesammlung client checks](https://github.com/schmitti92/Spiel-client/actions/runs/43250565768) am 12.11.2026 erfolgreich. Der normale GitHub-Pages-Deploy bleibt gesondert zu prüfen.

## 4. Bisherige Messergebnisse

| Kennzahl | Heute belegt | Für vollständigen A-02-Abschluss fehlt |
|---|---|---|
| Request-Abstände | Aus Quellcode ermittelt | Tatsächliche GET/POST-Anzahl pro Minute im Live-Kampf |
| Antwortzeit | Diagnoseskript und Tests vorhanden | p50/p95 real über Android, Desktop, 1/2/3 Spieler |
| Fehler/Abbrüche | Testfälle vorhanden | Rate von Timeouts/HTTP-Fehlern bei realem Betrieb |
| Kampfstart/Minispiel/Schlag/Resultat | Serverzeit-basierte Beobachtungsstempel eingebaut | Vergleich der ersten Beobachtung auf mehreren Geräten |
| Render-HTTP-Metriken | API-Abfragen lieferten zuvor leere Reihen | Zusätzliche Produktionswerte, falls künftig verfügbar |
| Firestore-Reads/Writes | A-01-Offline-Baseline dokumentiert | Echte Projekt-Nutzungszähler aus Firebase-Konsole (A-01e) |

**Eine Online-CSV mit tatsächlich beobachteten Antwortzeiten liegt noch nicht vor.** Keine Messwerte oder erfolgreich synchronisierten Drei-Geräte-Kämpfe wurden erfunden.

## 5. Testablauf und Abnahmekriterien

1. Auf 1 Gerät starten: Fenster aufklappen, **Neue Messung**, Lobby 5 Minuten beobachten, CSV exportieren.
2. Danach einen Bosskampf mit 1 echtem Spieler starten und vollständige CSV sichern; wiederholen mit 2/3 echten Geräten (je Gerät eigene CSV). Einen eigenen Durchgang mit Nova/Titan prüfen.
3. Für jedes Gerät GETs/Minute und p50/p95 je Aktion messen, HTTP-Fehler/Timeouts sowie Start-/Runden-/Treffer-/Ergebnisbeobachtung gegenüber dem Serverzeitstempel auswerten.
4. Keine Änderungen an taktischen Spielzügen oder Kampfdaten allein zur Messung; keine Testkämpfe ungefragt auf fremden Profilen auslösen.
5. Daten hier eintragen, auffällige Verzögerungsspitzen dokumentieren und erst **danach** A-02 als abgeschlossen markieren. Ohne echte Drei-Geräte-CSV bleibt der Live-Synchronisationsnachweis offen.

### Messreihe A-02: echte Browserverbindungen (offen)

| Szenario | Anzahl CSV-Dateien | GET/Minute | POST/Minute | GET p95 | POST p95 | Fehlerrate | Auffälligste Ereignisverzögerung |
|---|---:|---:|---:|---:|---:|---:|---|
| 5 Minuten Leerlauf | – | – | – | – | – | – | – |
| 1 echter Spieler | – | – | – | – | – | – | – |
| 2 echte Spieler | – | – | – | – | – | – | – |
| 3 echte Spieler | – | – | – | – | – | – | – |
| 1 Spieler + Nova/Titan | – | – | – | – | – | – | – |

**A-02 Status:** Lokale Messtechnik und Tests fertig; reale Produktions- und Endgerätedaten fehlen. **Nicht vollständig abgenommen.** Das automatische Testen verursacht keine Firebase-Gebühren und keine Änderungen an Spielständen.
