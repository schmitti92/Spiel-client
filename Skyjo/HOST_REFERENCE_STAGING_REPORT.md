# SKYJO Action – Referenzdesign / Entwicklungsstand (Staging)

Stand: 19.10.2026. **Nicht auf `main` veröffentlicht.**

## Ausgangspunkt
Die isolierte Host-Vorschau benutzt die vorhandenen Dateien `skyjo_host_test.html`, `skyjo_host_test_visual.css`, `skyjo_host_test_polish.css`, `skyjo_host_test.js` und `skyjo_host_preview_engine.js`. Die echte Online-Spielengine, das Render-Backend und das Multiplayer-Match bleiben unverändert.

## Erledigt
- Referenzorientierte Aufteilung mit zwei Gegnern oben, eigenem Feld unten, Nachzieh- und Ablagestapel dazwischen, seitlichen Bedienelementen.
- Neues separates Stylesheet `skyjo_host_reference_layout.css` (nur isolierte Vorschau), einschließlich responsiver Quer-/Hochformatregeln.
- Kartenrückseiten, farbige Vorderseiten, Holztisch-Anmutung, hervorgehobener aktiver Spieler, besser sichtbare Emoji-/Sprücheflächen.
- Stabilisierung des lokalen Kartentest-Engines: Wenn der Nachziehstapel erschöpft ist, werden alle außer der obersten Ablagekarte gemischt und erneut zum Nachziehen bereitgestellt.
- Tests für erschöpften Stapel und unzulässige Aktionen erweitert.

## Verifiziert
- JavaScript-Syntaxprüfung.
- `tests/skyjo-host-preview.test.cjs` einschließlich Zusatzfällen.
- `tests/check_skyjo_modular.py`.
- Alle `tests/skyjo-v*.test.cjs`.
- GitHub Actions: erfolgreicher Staging-Lauf.

## Grenzen / offene Punkte
- Das Referenzbild ist ein grafisches Konzept, keine vollständig übernommene 1:1-Oberfläche. Fotos/Avatare, Tischrequisiten und aufwendige Kartenillustrationen sind noch nicht integriert.
- Keine echte Browser-Screenshot- oder Tablet-Messung der neuen CSS-Regeln; mögliche Überlappungen müssen auf Zielgeräten geprüft werden.
- Der Host-Test ist **keine** vollständige SKYJO-Action-Partie: Startaufdeckung, korrekte Rundenendregeln, Sonderkarten/Joker, Reihenauflösung und vollständige Endwertung sind noch nicht umgesetzt.
- Keine Online-Synchronisierung und keine Statistikübertragung im Host-Test; dies ist absichtlich isoliert.
- Server-/Client-Sicherheits- und Synchronisationsaudit für alle Spiele steht aus; die Änderungen in diesem Branch betreffen nur SKYJO-Host-Vorschau.

## Nächste Arbeitsschritte
1. Browser-Screenshot auf Tablet-Querformat (z. B. 1280×800) und CSS-Feinschliff.
2. Korrekte SKYJO-Action-Spielphasen und Spezialregeln anhand der bereits vorhandenen produktiven Regelimplementierung abgleichen.
3. Separate Host-Test-Engine regelgetreu machen, mit deterministischen Testfällen für Spielende, Gleichstände, Reihen und Sonderkarten.
4. Erst nach expliziter Freigabe und End-to-End-Tests die neue Ansicht in `main` integrieren.

## Nachprüfung der Nutzer-Screenshots (20:50 Uhr)
- Screenshot des produktiven Host-Tests zeigt: Kartenbretter und Seitenknöpfe vorhanden, aber mittlere Stapel-/Aktionszone ist schlecht lesbar und liegt optisch zu dicht an den Spielfeldern; Status und Testknöpfe sind sehr klein.
- Das Zielbild enthält realistische Tischrequisiten, Avatare, Kartenstapel und größere Emoji-/Sprüche-Kacheln. Diese Grafikdetails sind **noch nicht** als Assets implementiert.
- Im Staging-HTML wurde ein **konkreter Fehler** gefunden: das Stylesheet hatte ein überflüssiges doppeltes Anführungszeichen im `href`-Tag. Behoben und Cache-Version erhöht.
- Zusätzliche CSS-Constraints verhindern bei typischen Tablet-Querformatgrößen, dass Gegnerkarten, Stapel, Aktionsleiste und Status in derselben Rasterzeile liegen. Die tatsächliche Pixel-Darstellung bleibt bis zum Browser-Test unbestätigt.
- Statusbereiche erhielten `role=status` und `aria-live=polite` für Screenreader.
- Neuer Regressionstest `tests/skyjo-host-layout.test.cjs` prüft die Stylesheet-Einbindung und erforderliche Bedienelemente.

## Release-Grenze
Auch der Folgebranch `skyjo-reference-fixes-20261019` bleibt unveröffentlicht. **Keine Aktualisierung von `main` ohne explizite Freigabe.**

## Entwicklungsphase 3: Host-Controller und Stapeldarstellung
Branch: `skyjo-host-security-layout-20261019` (abgeleitet vom geprüften Staging-Branch).

### Codeänderungen
- Der Nachziehstapel wird im UI nicht mehr als leer gesperrt, wenn ein Neu-Mischen aus dem Ablagestapel möglich ist. Vorher konnte die Engine neu mischen, aber der Button war deaktiviert.
- Die automatische Simulation beendet sich nach vollständigem Durchlauf und setzt den Start-/Stop-Button zurück.
- Die Host-Prüfung nutzt weiterhin die vom Backend persönlich berechnete `room.host`-Berechtigung; zusätzlich wird explizit `true` gefordert. Ein zeitlich begrenzter Abruf verhindert unbegrenztes Warten.
- Zusätzliche visuelle Kartenstapel-Gestaltung und sichtbare Tastatur-Fokusrahmen.
- Cache-Versionen erhöht, damit neue CSS- und JS-Dateien beim Testen nicht durch alte Browserkopien verdeckt werden.
- Der Layout-Test wurde um diese Verhaltensregressionen erweitert.

### Sicherheitsgrenze
Die Host-Vorschau führt weiterhin keine Server-Spielzüge aus. Backend, Online-Statistik, Firebase-Regeln und produktive SKYJO-Dateien wurden nicht verändert. Die Host-Berechtigung wird beim Öffnen geprüft; für dauerhafte Berechtigungsüberwachung oder serverseitige Host-Testaktionen wäre zusätzliche Architektur nötig.

### Ungetestet
Die visuelle Pixelgenauigkeit auf Android-Tablets, reale Netzwerkausfälle, vollständige Regelkonformität und Live-Multiplayer-Synchronisierung sind durch die Node-/Python-Tests nicht abgedeckt.
