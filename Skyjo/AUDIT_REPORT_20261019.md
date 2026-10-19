# SKYJO Codeaudit – 19.10.2026

## Untersuchte Dateien
`Skyjo/skyjo_host_test.js`, `skyjo_host_test.html`, `skyjo_host_preview_engine.js`, `skyjo_piles_actions.css`, ergänzende Host-Regressionstests.

## Nachgewiesene Befunde
1. Aktionsbuttons sind vor dem Kartenziehen absichtlich deaktiviert. Die Oberfläche erklärte den Zustand unzureichend; das kann wie ein Defekt wirken.
2. Die Zahlen-/Kartendarstellung wird über mehrere übereinanderliegende CSS-Dateien beeinflusst. Die neue Stapeldatei verwendet viele `!important`-Regeln und übersteuert ältere Breakpoints. Browser-Screenshots sind nötig.
3. Der Host-Test verwendet eine lokale, vereinfachte Engine; er ist nicht mit der produktiven Online-Partie synchronisiert. Ein erfolgreicher Host-Test belegt keine Multiplayer-Stabilität.
4. Die Simulation deckt nicht die vollständigen SKYJO-Action-Regeln ab; sie ist ausdrücklich als Vorschau gekennzeichnet.
5. Versionsgebundene Asset-Assertions sind wartungsanfällig: nach einem JS-Cache-Bump schlug ein bestehender Test zunächst fehl.

## Behoben im Audit-Branch
- `Skyjo/skyjo_host_test.js`: konkreter Statushinweis, dass zuerst ein Stapel gewählt werden muss; Tooltips für deaktivierte Aktionen; dynamische ARIA-Beschreibungen für Nachzieh- und Ablagestapel.
- `Skyjo/skyjo_host_test.html`: Skriptversion erhöht.
- `tests/skyjo-host-audit.test.cjs`: 40 Spielstarts mit Negativtests für illegale Aktionen und Prüfung des Zugübergangs.
- `tests/skyjo-piles-actions.test.cjs`: Cacheversionsprüfung angepasst.
- `.github/workflows/skyjo-audit-stage.yml`: CI-Regressionen.

## Testprotokoll
- GitHub Actions **39311466159**: fehlgeschlagen wegen veralteter Skriptversion im bestehenden statischen Test.
- Test korrigiert.
- GitHub Actions **39311573847**: **success**. Neue und bestehende Host-Tests bestanden.

## Nicht geprüft
- Echte Browser-Interaktion auf dem Samsung-Tablet (Querformat, Vollbild, Touch, Scrolling).
- Render-Server/Firebase-Verbindungsstabilität, Wiederverbindung und Live-Multiplayer-Synchronisierung.
- Vollständiger Client- und Server-Sicherheitsaudit.
- Vergleich mit Referenzbild auf Pixel-/Screenshot-Ebene.

## Empfohlene Prioritäten
1. Tablet-Screenshot nach Laden der aktuellen Version prüfen und Karten-/Aktionsflächen in echten Viewportgrößen justieren.
2. CSS-Kaskade der Host-Vorschau konsolidieren, um `!important`-Konflikte zu reduzieren.
3. Separat die produktive SKYJO-Engine samt Serverprotokoll und Synchronisierung analysieren.
4. Nach Freigabe getestete Auditänderungen veröffentlichen.

**Produktivstatus:** Änderungen ausschließlich auf Branch `skyjo-audit-hardening-20261019`. `main` wurde nicht verändert.

## Entwicklungsphase 2: produktive V19-Loader-Integrität
- Repository-Baum untersucht: 35 separate SKYJO-V19-Logikdateien, Manifest und dynamischer Loader; zwölf Style-Teile mit teils über 140 KB und mehrere CSS-Schichten im Host-Test.
- `Skyjo/skyjo_action-loader.js`: Dateinamen und Reihenfolge der 35 erwarteten Teile sowie SHA-256-Format vor dem Laden ausdrücklich validiert.
- `tests/skyjo-manifest-integrity.test.cjs`: SHA-256-Prüfsumme jeder der 35 tatsächlichen Dateien unabhängig vom Browser-Loader geprüft.
- GitHub Actions **39311943489**: **success**, einschließlich Host-Regressionen und vollständigem Manifest-Integritätstest.

### Weitere Befunde
- Der V19-Loader ruft alle 35 Teile mit `Promise.all` parallel ab und prüft die Integrität; die Dateien werden in Manifest-Reihenfolge verkettet. Ein fehlendes Modul führt zu einer sichtbaren Fehlermeldung mit Retry.
- Die produktive CSS-Dateigruppe ist umfangreich und sollte nur mit visuellen Regressionstests schrittweise refaktoriert werden.
- Client/Server-Protokoll und Multiplayer-Wiederverbindung sind noch nicht Ende-zu-Ende getestet.

### Veröffentlichung
Die Änderungen sind ausschließlich im Audit-Branch; `main` bleibt unverändert. Keine produktive Freigabe im aktuellen Auftrag.
