# SKYJO Comic – eigenständige Online-Beta

**Beta-Start:** [skyjo_action_comic_beta.html](./skyjo_action_comic_beta.html)

## Was integriert ist
- Vollständige Kopie der vorhandenen SKYJO-Engine in einer **separaten HTML-Datei**. `skyjo_action.html` bleibt unangetastet.
- Die Beta meldet nach dem Rendern Online-Spielstände über `skyjo-comic-snapshot`.
- Bei **3–5 Spielern** erscheint der Schalter **„🏞️ Neues Brett (Beta)“**.
- Das neue Brett wird im Querformat als Bergsee-Comic in einem gleichursprünglichen iframe angezeigt.
- Die eigenen Karten und Stapelaktionen verwenden `Game.selectCard`, `Game.drawFromDeck`, `Game.drawFromDiscard` und `Game.discardDrawn`.
- Das Originalbrett bleibt über **„✕ Klassisches Brett“** erreichbar, besonders für Joker, Spezialaktionen, Rundenende und Modals.

## Bekannte Grenzen
- **Nicht** im zentralen Online-Vorraum als Brettoption freigeschaltet.
- **Nicht** mit 3–5 echten Geräten durchgetestet.
- In der Beta sind noch nicht alle Funktionen der alten Oberfläche auf der Comic-Oberfläche erreichbar.
- Das neue Brett ist nur bei aktivem Online-Spiel mit 3–5 Spielern sichtbar; bei lokalem Spiel wird kein Comic-Schalter angezeigt.
- Das Öffnen der Beta-Adresse allein erstellt keinen Raum. Verwende die üblichen Online-Einstiege bzw. den bestehenden gemeinsamen Raum.
- Eine Beta-Kopie der Engine muss bei späteren Engine-Fixes separat synchronisiert werden.

## Manueller Abnahmetest
1. Mit drei unterschiedlichen angemeldeten Spielern denselben Online-Raum betreten.
2. Eine Partie starten und in der Beta den Comic-Schalter öffnen.
3. Auf allen Geräten kontrollieren, ob jeweils das **eigene Brett unten** erscheint.
4. Auf dem aktiven Gerät eine Karte ziehen und auf dem eigenen Brett ersetzen.
5. Auf den anderen Geräten prüfen, ob die Karte und der Spielerwechsel korrekt synchronisiert wurden.
6. Nichtaktive Spieler versuchen Kartenaktionen: Sie dürfen keine Spielzüge auslösen.
7. Spezialkarten, Joker, abgeräumte Reihen/Spalten, Rundenende und Spielende auf dem klassischen Brett prüfen.
8. Test für vier und fünf Spieler wiederholen.
9. Erst nach erfolgreichen Tests die Brettauswahl im zentralen Vorraum freigeben.

## Sicherheit
Die Beta benutzt weiterhin die bestehende Engine und deren Online-Synchronisation. Die Comic-Module schreiben nicht direkt in Firebase oder Render. Das Comic-Brett ist ausdrücklich als **Beta** gekennzeichnet.
