# Minispiele NEU – verbindlicher Entwicklungsstandard V1.0

Beschlossen am 31.10.2026. Geltungsbereich: alle neuen Minispiele in MinispieleV2.

1. **Gemeinsame Engine:** Ausschließlich MiniGame Engine V2; keine eigene Raumverwaltung, Identität oder Netzwerkverbindung pro Spiel.
2. **Spieler:** Jedes Spiel unterstützt 1–4 Teilnehmer, Menschen und Bots; in der Testlobby maximal zwei simulierte Testspieler.
3. **Gemeinsame Lobby:** Raumcode, Teilnehmer, Host, Bereitstatus, Spielauswahl und Neustart werden zentral verwaltet; Raum bleibt beim Spielwechsel erhalten.
4. **Firebase-sparsam:** Keine Firestore-Lesevorgänge pro Spielzug, Animation oder Position. Laufende Online-Spiele nutzen die zentrale Render-Verbindung.
5. **Einheitlicher Ablauf:** Auswahl → Teilnehmer → Bereit → Start → Spielen → Ergebnis → Neustart oder Lobby.
6. **Gleiche Schnittstellen:** Spielstart, Aktionen, Zustand, Bot-Aktionen, Spielende, Ergebnis, Neustart.
7. **Trennung der Logik:** Regeln unabhängig von HTML/CSS, Netzwerk und Speicherung.
8. **Sparsame Synchronisation:** Nur relevante Aktionen und Zustandsänderungen übertragen; Animationen lokal; Server entscheidet Online-Ergebnisse verbindlich.
9. **Fehlertoleranz:** Reconnect ohne doppelte Teilnehmer; Aktionen eindeutig; Neustart erzeugt keinen neuen Raum.
10. **Tests:** Vor Regeländerungen bestehende Tests; jedes neue Spiel besteht gemeinsame Vertragstests und individuelle Regeltests.
11. **Altversion schützen:** MinispieleV2 bleibt von der bisherigen Minispielversion getrennt.
12. **Entwicklungsreihenfolge:** Offline-Minispiele → Partybrettspiel → Online-Multiplayer. Online-Anforderungen bereits im Entwurf berücksichtigen.
13. **Neue Spiele ohne Lobby-Änderung:** Spiele als Module im zentralen GameCatalog registrieren; Lobby liest den Katalog.
14. **Keine stillen Sonderlösungen:** Abweichungen explizit dokumentieren und testen.
15. **Stabilität vor Design:** Start, Ablauf, Ergebnis und Neustart müssen zuverlässig funktionieren, bevor optisch perfektioniert wird.

## Verbindliche Bot-Entscheidung
- Zwei simulierte Testspieler sind offline ohne Netzwerk nutzbar.
- Dieselbe Bot-Schnittstelle ist später online verwendbar; Online-Bots werden zentral durch den autoritativen Spielserver gesteuert.
- Bots benötigen keine eigenen Firebase-Konten, Spieleridentitäten oder Raumverbindungen.
- Mensch und Bot folgen denselben Spielregeln und Validierungen.
- Gemeinsame Vertragstests prüfen Mensch/Bot-Mischungen mit 1–4 Teilnehmern.

## Technische Standards
- Raumcode: zentrale Verwaltung, aktuell 3 Ziffern; bestehende Legacy-Codes nur soweit zentral unterstützt.
- Spielzustand: genau eine autoritative Quelle je Spielmodus.
- Persistenz: nur bei tatsächlichem Bedarf.
- Ergebnisformat, Neustart und Registrierung: gemeinsame Schnittstellen.
- Keine Änderung an Altspielen ohne ausdrückliche Freigabe.

Änderungen dieses Standards nur nach ausdrücklicher Entscheidung; keine stillschweigenden Ausnahmen.
