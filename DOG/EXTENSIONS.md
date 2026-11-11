# DOG – Erweiterbare Architektur (Designs, Karten, Ereignisse)

Stand: November 2026. Diese Struktur ist die verbindliche Grundlage für neue
DOG-Inhalte, damit das klassische Spiel nicht bei jeder Erweiterung umgebaut
werden muss.

## 1. Verantwortlichkeiten

| Datei/Modul | Verantwortlich für | Darf NICHT ändern |
| --- | --- | --- |
| \`engine.js\` | Offizielle DOG-Regeln, Karten-IDs, Zugberechnung, Teamgewinn | Optik, Designs, Event-Assets |
| \`board-layout.js\` und \`approved-board.js\` | Unveränderliche Feldnummern 0–63 und Koordinaten für Start/4 Ziele/4 Häuser | Karten-/Figurenlogik |
| \`app.js\` | Darstellung, Interaktionen, synchronisierte Spielansicht | Unabhängige Regelvarianten im Alleingang |
| \`appearance-registry.js\` | Katalog der austauschbaren Designs mit stabilen IDs | Spielzüge, Kartenverteilung, Online-Spielzustand |
| Künftige Module unter \`events/\` | Befristete Inhalte, Themes, Aufgaben und Belohnungen | Klassische DOG-Regeln ohne separaten Modus |

Die Reihenfolge und Typen der Karten aus \`engine.js\` hängen niemals davon ab,
wie ein Kartenmotiv aussieht. Dasselbe gilt für Spielfarben und geschützte
Startfelder: optische Farbe und Zugehörigkeit eines Spielsteins sind getrennt.

## 2. Neue Hintergründe und Bilder

In \`appearance-registry.js\` unter \`BOARD_STYLES\` einen neuen eindeutigen
Schlüssel hinzufügen. Jedes Theme enthält Bezeichnung, Farbverläufe und
optional ein \`image\`-Feld. Für Bilder unter \`DOG/assets/\` einen relativen
Pfad wie \`./assets/board/winter.webp\` eintragen.

Wichtig: Nur vertrauenswürdige, im Repository eingetragene Bilddateien
verwenden. Keine ungeprüften externen URLs in SVGs übernehmen. Ohne Bild
zeigen Farbverläufe weiterhin das komplette Spielfeld.

Die Koordinaten in \`approved-board.js\` werden bei einem Motivwechsel NICHT
modifiziert. Bei Mehrspielerpartien darf jeder sein eigenes Design sehen.

## 3. Neue Figurenfarben und Formen

Die \`PIECE_STYLES\` definieren zurzeit vier komplette Farbsätze, jeweils in
der semantisch festen Reihenfolge Rot, Blau, Grün, Gelb. Ein neuer Farbsatz
braucht nur ID, Label und vier HEX-Farbwerte.

Für andere Formen (z. B. Tiere, Weihnachtsfiguren, thematische Steine)
einen neuen Renderer für Figurenformen ergänzen und die Design-ID im
Figuren-Registry-Eintrag referenzieren. Figuren-Eigentümer (0 bis 3),
\`piece.id\`, \`piece.place\` und \`piece.pos\` dürfen dadurch nicht verändert
werden. Bewegungen werden vom Server geprüft.

## 4. Neue Kartendesigns

\`CARD_STYLES\` enthält **fünf Motive**: klassisch, königlich, dunkel, Wald
und Winter. Neue Designs werden als optische Katalogeinträge ergänzt. Jedes
Motiv kennt Vorderseite, Spezialkarten, Rahmen, Schrift, Rückseite und Emblem.
Karten-Rückseite und Vorderseite werden im Designstudio angezeigt.

Später können Bildpfade pro Kartenmotiv ergänzt werden. Die
Kartenkennungen und Kartentypen (\`type\`) aus \`engine.js\` bleiben identisch.
Verschiedene Kartendesigns dürfen gleichzeitig in einem Raum verwendet werden,
ohne verdeckte Informationen freizugeben.

## 5. Events

\`EVENT_PACKS\` ist eine vorbereitete, optische Registrierstelle mit sicherem
Standard \`none\`. Für Events sollte später jedes Paket eigenständig sein:

\`\`\`js
// Beispiel für eine geplante (noch nicht aktivierte) Erweiterung
{
  id: 'winter-2027',
  version: 1,
  activeFrom: '2027-12-01T00:00:00Z',
  activeUntil: '2028-01-08T23:59:59Z',
  boardTheme: 'winter',
  cardTheme: 'winter',
  cosmetics: ['winter-pawns'],
  progressionRuleId: 'winter-dog-2027-v1'
}
\`\`\`

Das Beispiel ist **kein freigeschaltetes Event** und ändert keine bestehende
Partie. Eventfortschritt, Inventar, Belohnungen und Freischaltungen müssen
später serverseitig versioniert, geprüft und gespeichert werden; das UI zeigt
nur serverseitig bestätigte Ergebnisse. Keine Belohnung allein aufgrund einer
CSS-Klasse oder Browser-LocalStorage vergeben.

Wichtig für Render/Firebase: Fortschritt bei relevanten Ereignissen gezielt
als einmalige serverseitige Aktion persistieren; Designwechsel nur lokal,
ohne zusätzlichen Online-Request. Live-Spielzüge dürfen nicht auf neue
Designassets oder Event-Caches warten müssen.

## 6. Kompatibilität / Tests

- \`ruleset = classic-dog\` bleibt erhalten, solange wir nur Grafik ändern.
- Speicherschlüssel für Partien (\`spielportal:dog:local-v1\`) bleibt unverändert.
- Optik hat einen eigenen lokalen Schlüssel (\`dog:appearance:v1\`).
- Bereits vorhandene DOG-Räume müssen weiterhin ohne neue Datenfelder laden.
- Nicht vorhandene/ungültige Design-ID fällt auf das klassische Motiv zurück.
- Fehlende Bilddatei muss auf Farbverlauf zurückfallen.
- Neue visuelle Inhalte dürfen niemals die 64 Lauffelder, 16 Ziele oder
  16 Startpositionen überschreiben.
- Jede Erweiterung braucht mindestens einen Regressionstest und läuft durch
  \`.github/workflows/dog-board-check.yml\`.

## 7. Workflow für neue Motive

1. Optional das Bild unter \`DOG/assets/\` hinzufügen.
2. Registry-Eintrag mit stabiler ID anlegen.
3. Das Designstudio zeigt diesen Eintrag automatisch an.
4. Auf Tablet, lokal und in einer Online-Partie prüfen.
5. Tests laufen lassen und anschließend GitHub Pages veröffentlichen.
6. Bei einem Event zuerst getrennte Server-Validierung ergänzen, erst danach
   öffentliche Freischaltung.

**Leitlinie:** Klassische Spielmechanik bleibt stabil; Erweiterungen sind
austauschbare, versionierte Inhalte statt Änderungen an jeder bestehenden
Spielfunktion.
