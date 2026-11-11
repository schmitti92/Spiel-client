# DOG – Phase 1: Prüfstand der klassischen Regeln

Stand: 11. November 2026

## Geltungsbereich

Die Hauptpartie benutzt **vier Farben und zwei Zweierteams**, auch wenn
Menschen durch Bots vertreten werden. Regeln basieren auf Schmidt Spiele,
DOG 49201, deutscher Anleitung:
https://www.schmidtspiele.de/files/Produkte/4/49201%20-%20DOG%C2%AE/49201_DOG_DE-FR-IT-GB.pdf

Die Sonderregeln des Verlags für Partien mit genau 2, 3 oder 5 Personen sind
derzeit **kein** eigener Modus der Spieleplattform. Auch eine optionale
umgekehrte Laufrichtung ist nicht als Raumoption aktiviert.

## Aktuell durch automatisierte Prüfungen abgedeckt

- Spielkartensatz: 110 Karten, sechs Joker und je acht Exemplare der 13
  weiteren Kartentypen.
- Kartengeben 6/5/4/3/2 und Wiederholung ab sechs; wechselnder Startspieler.
- Nach jedem Geben verdeckter Partner-Kartentausch; keine fremden Handkarten
  in `publicState`.
- Nicht spielbare vollständige Hände müssen abgeworfen werden.
- Start mit 1/11, 13 und Joker; eigenes Startfeld ist geschützt.
- **Korrektur 2026-11-11:** Ein ungeschützter gegnerischer oder Partnerstein
  auf dem farbigen Startfeld wird beim Heraussetzen geschlagen; die vorherige
  Sperre war zu streng.
- Blockade durch geschütztes farbiges Startfeld; keine Überschreitungen.
- Normale Züge überspringen freie/ungeschützte besetzte Zwischenfelder,
  Schlagen auf dem Endfeld (auch eigene Figur).
- Vier Felder vorwärts oder rückwärts, aber kein rückwärtiger Zieleinlauf.
- Die Zielbahn wird nur durch **Überqueren** des eigenen Startfelds vorwärts
  betreten; direkt auf dem Startfeld beginnen und sofort ins Ziel abbiegen
  ist unzulässig. Keine Überholungen, Schläge oder Rückwärtszüge im Ziel.
- Sieben: alle sieben Schritte müssen verbraucht werden, auch in Teilzügen,
  Schlagen aller überlaufenen Figuren; Partnerzug nach Abschluss der
  eigenen vier Ziele wird unterstützt.
- Tauschkarte: keine geschützten Start- oder Zielfiguren; möglich mit
  Partner und Gegner, andernfalls wirkungslos ablegbar.
- Joker ersetzt jeden übrigen Kartentyp.
- Sieg erst mit allen acht Figuren eines Teams im Ziel.
- Gezielte Abwehr von gefälschten oder nicht erlaubten Zugaktionen.
- **Korrektur 2026-11-11:** Wenn eine Austauschrunde automatisch die nächste
  Kartenrunde auslöst, wird der mitgegebene Zufallszahlengenerator nun
  weitergereicht. Tests bestätigen reproduzierbares Nachmischen und die
  Erhaltung aller 110 eindeutigen Karten.
- Automatisierter Stresstest: Figuren dürfen sich auf dem Rundweg oder
  im gleichen Ziel nie überlagern; kein Kartenverlust.

## Dateien und Tests

- Spielregeln: `Spiel-client/DOG/engine.js` und `serverfinal/dog/engine.js`;
  sie sind nach jeder Regeländerung bytegleich zu halten.
- Backend: `serverfinal/tests/dog-engine.test.js`,
  `serverfinal/tests/dog-official-rules.test.js` und der isolierte
  Workflow `DOG classic official rules`.
- Frontend: `Spiel-client/tests/dog-official-rules.test.mjs`,
  bestehende Geometrie-/Editor-/Designregressionen und
  Workflow `DOG classic board checks`.

## Noch zu prüfende Integrationspunkte

1. Zwei bis vier echte Browser gleichzeitig, insbesondere Verbindungsabbrüche
   während des verdeckten Kartentauschs oder aufgeteilter Sieben.
2. Server-Deployment auf Render sowie Room-Revisionsschutz bei doppelten
   Touch- und Netzwerkaktionen.
3. Tablet-Interaktionen und Animationen mit echten Spielern.
4. Zusätzliche offiziell beschriebene Varianten (2/3/5 Spieler oder
   Laufrichtungswahl) **nur als getrennte Regelversion** einführen, ohne
   bestehende klassische Partien stillschweigend umzubauen.

Diese Punkte sind nicht durch reine Unit-Tests abschließend nachgewiesen.
