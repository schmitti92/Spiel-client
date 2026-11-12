# 100 Tore – M-08 Praxisabnahme: Android, Touch, Netzwerk & sichere Antworten

**Stand:** 12.11.2026 · **Status:** automatisierte Tests erledigt; echte Geräteprüfung **noch nicht durchgeführt**.

Die Technik für Boss 10 und die Gruppenbosse ist dieselbe. Die Tests sollen mit der aktuellen GitHub-Pages-Version und dem tatsächlich eingesetzten Render-Backend stattfinden. Dieses Dokument ist eine manuelle Abnahme-Anleitung, **kein Beleg für bereits erfolgte echte Mobilgeräte-Tests**.

## 1. Geräte und Vorbereitung

- Android Chrome (oder Chrome auf Android-Tablet): einmal **Hochformat**, einmal **Querformat**.
- Desktop: **Maus**, **Enter/Leertaste** per Tastatur, optional Touchscreen.
- Zunächst ein Spieler, anschließend **2–3 echte Mitglieder gleichzeitig**. Gespiegelte Zweitfenster mit demselben Login ersetzen keine echten getrennten Spieler für eine Mehrspielerabnahme.
- Neu laden, damit die aktuelle Version von `dog-boss-mini-ui.js` aktiv ist. Teste einen frisch begonnenen Kampf; alte v1–v14 Kämpfe bleiben absichtlich kompatibel.
- Bei jeder Probe notieren: Gerät, Browser, Tor, Runde, Eingaben, Ergebnis, Zeitpunkt eventueller Netzunterbrechung. Keine Zugangstoken, Passwörter oder persönlichen Account-IDs protokollieren.

## 2. Eingabetest für alle fünf Minispiele

| Spiel | Eingabe | Erwartetes Ergebnis |
|---|---|---|
| 🧮 Blitz-Mathe | Acht Optionen zügig antippen; dieselbe Aufgabe auch per Maus bedienen | Sofortiges lokales Weiterschalten, keine 8 POSTs; später echte serverbestätigte 0–8 Treffer |
| 🛡️ Ausweichen | Pro Angriff eine Richtung wählen; direkt vor dem Einschlag tippen; in nächste Runde wechseln | Einmalige Richtungserfassung, keine Aktion in der falschen Runde, „Ergebnis offen“ bis Server bestätigt |
| 🎨 Farben/Symbole | Zehn Optionen möglichst schnell treffen; Farben und Zeichen unterscheiden | Keine verlorenen/verdoppelten Taps; Sammelübertragung, offiziell erst nach Serverprüfung |
| ⚡ Reaktion/Konter | Dreimal im grünen Bereich drücken; zweite Fingerberührung, lange Berührung, anschließenden Click prüfen | Ein physischer Tap zählt nur einmal, keine zusätzliche Berührung durch Androids verzögertes Click; Tastatur weiterhin möglich |
| ⛓️ Kettenbrecher | Kurzer Tap, Wisch, abgebrochener Wisch, Tastatur, zehn schnelle Schnitte | Abbruch ist kein Treffer; verzögerter Android-Click zählt nicht erneut; nach zehn Versuchen genau eine Sammelantwort |

Bei sichtbarer Differenz zwischen lokaler Treffervorschau und bestätigtem Serverergebnis ist die lokale Anzeige als **vorläufig** beschriftet. Ohne bestätigten Serverdatensatz darf kein erfundener Erfolg angezeigt werden.

## 3. Netzwerkunterbrechung, Wiederholung und Wechsel

1. Während Mathe, Farbe/Symbole, Reaktion oder Kettenbrecher die Antworten lokal erfassen, kurzfristig das WLAN/Mobilnetz trennen. Vergewissern, dass die Eingaben nicht plötzlich als offiziell richtig ausgegeben werden.
2. Einen Test **nach dem letzten Tap, aber vor der Antwortbestätigung** durchführen. Netz wieder einschalten, aktualisieren. Falls der Server die Antwort schon hat, muss der GET-Status diese offiziell anzeigen und es darf **kein zweiter POST** gesendet werden.
3. Wenn der Server die Aktion **noch nicht** verarbeitet hat, darf nur derselbe gespeicherte Auftrag mit **derselben requestId** über den vorhandenen Wiederholen-Button erneut gesendet werden. Die Wiederholung erzeugt keinen zweiten Treffer.
4. Ein weiterer Test: Direkt nach einer Ausweichrichtung geht die Szene in die folgende Runde über. Der alte Tipp darf niemals als Reaktion/Farbauswahl des neuen Spiels erscheinen.
5. Einmal den Tab in den Hintergrund legen und zurückwechseln. Zeit, Fortschritt und offizielle Treffer müssen der **Serveruhr** folgen; bei abgelaufenen Zeitfenstern dürfen keine nachträglichen Treffer entstehen.
6. Auf zwei oder drei echten Geräten prüfen, dass jeder dieselbe serverbestätigte Runde, eindeutige Schadenswerte und die gemeinsame Sieg-/Niederlagewertung sieht.

## 4. Firebase und Abnahmekriterien

- Die automatisierten Tests messen **keinen** tatsächlichen Firebase-Verbrauch. Für eine echte Messung vor einer einzelnen Partie den aktuellen Zähler ablesen, eine 135-Sekunden-Partie spielen, anschließend erneut ablesen. Währenddessen keine anderen Aktionen ausführen.
- Für Reaktion, Mathe, Farben/Symbole und Kettenbrecher ist pro Spieler pro kompletter Runde **höchstens ein neu angelegter Antwortauftrag** vorgesehen; Ausweichen nutzt weiterhin bis zu drei serverseitig geprüfte Einzelaktionen.
- Kein ungeplanter GET-/Firestore-Sturm bei kurzer Verbindungsunterbrechung; vorhandene Polling-Drosselung darf nicht umgangen werden.
- Bestehende Matches und Siegerchancen nicht ändern; alte gespeicherte Kampfversionen weiter lesen können.
- Erst wenn Android Hoch-/Querformat, Desktop-Maus/Tastatur und mindestens ein echter Mehrgeräte-/Netzausfall-Test bestanden sind, **M-08 endgültig abhaken**. Bei Problemen genaue Reproduktion mit Tor/Runde und Browser notieren.

## 5. Technische Nachweise

- `tests/dog-boss-m08-mobile.test.mjs` – simulierte Touch-, Keyboard-, Batch- und Offline-Tests
- `tests/dog-boss-reconnect.test.mjs` – lokale Request-ID, Reconnect und POST-/GET-Reconciliation für beide Boss-Controller
- `.github/workflows/dog-boss-ui-check.yml` – prüft die M-08-Szenarien bei jeder Änderung
- `.github/workflows/dog-boss-reconnect.yml` – führt Controller-Tests aus

**Keine Test-Belohnungen vergeben und keine neue Firestore-Sammlung anlegen.**
