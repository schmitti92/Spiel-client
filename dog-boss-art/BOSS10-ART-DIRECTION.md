# Boss 10 – Cinematic Art Direction (100 Tore)
Version: 2026-11-11. **Gilt für Tor 10; Spielregeln bleiben auf dem Server.**

## Umsetzung auf `main`
- `arena-volcano-cinematic.svg` – eigener 1600 × 900 Vulkan-Background für Vorbereitung und Kampf.
- `arena-rune-crest.svg` – eigene skalierbare Magierune für die Kampf-Zwischensequenz.
- `../dog-boss-cinematic.css` – zusätzliche Darstellungsebene für HUD, Figuren, Licht, Treffer, Minispiele, Team-Schild und Ergebnis.
- `../dog-boss10.html` – CSS-Einbindung; bestehende Kampfskripte unverändert.
- `../tests/dog-boss-cinematic-assets.test.mjs` – prüft Bildquellen und funktionale Markup-Verträge.

## Bildpaket für das große Grafik-Upgrade
**Wichtig:** Die folgenden Bildnamen sind *geplante Austausch-Assets*, noch nicht automatisch eingebunden. Sobald sie hochgeladen werden, kann die CSS-/JS-Zuordnung angepasst werden.

| Asset | Empfohlenes Format | Einsatz |
|---|---|---|
| `boss10-arena-premium.webp` | 1920 × 1080, WebP, ohne Schrift | Cinematic-Arena mit Tiefe und Lavaschein |
| `boss10-aschewaechter-premium.webp` | 1200 × 1600, WebP mit Transparenz | Großer Boss links; Silhouette komplett freigestellt |
| `boss10-krieger-premium.webp` | 900 × 1300, WebP mit Transparenz | Goldener Krieger mit Schwert, Blick nach links |
| `boss10-magier-premium.webp` | 900 × 1300, WebP mit Transparenz | Magier in Violett, Blick nach links |
| `boss10-schildtraeger-premium.webp` | 900 × 1300, WebP mit Transparenz | Silber-blauer Schildträger, Blick nach links |
| `boss10-impact-premium.webp` | 1024 × 1024, transparentes WebP | Strahlen, Splitter und Funken beim Treffer |
| `boss10-shield-premium.webp` | 1024 × 1024, transparentes WebP | Magischer Schutzschild bei Verteidigung |
| `boss10-victory-premium.webp` | 1920 × 1080, WebP | Finale Siegsequenz, kein Text |

### Bildprompts für die Generierung
**Arena:** „High-end dark fantasy game environment, cinematic wide shot of an obsidian volcanic fortress arena, ancient basalt towers, cracked rock floor, glowing lava rivers, sparks, layered volumetric smoke, dramatic warm ember light from left and cool blue rim light from right, empty fighting stage in middle foreground for compositing characters, painterly realistic 3D videogame key art, 16:9, no characters, no writing, no HUD, no logos.“

**Aschewächter:** „Premium action RPG character concept art, colossal living volcanic stone guardian, asymmetrical black obsidian armor slabs, cracks filled with bright flowing magma, fiery glowing core in chest, ancient jagged crown, intimidating shoulders and huge stone fists, full-body three-quarter view, facing right, feet entirely visible, dramatic lighting, clean isolated transparent background, no scenery, no typography.“

**Krieger:** „Full-body fantasy RPG warrior, warm gold steel armor, real material detail and battle wear, elegant flaming longsword, heroic low combat stance, facing left, consistent semi-realistic cinematic character art, complete silhouette, isolated transparent background, no lettering.“

**Magier:** „Full-body mystic fantasy mage, violet layered battle robes, crystalline staff with pale purple light, confident defensive stance, facing left, intricate fabric and magical particles, consistent semi-realistic cinematic character art, complete silhouette, isolated transparent background, no lettering.“

**Schildträger:** „Full-body heavily armoured guardian, cold blue steel plate armor, large blue-glowing tower shield, protective forward stance, facing left, detailed weathered material, consistent semi-realistic cinematic character art, complete silhouette, isolated transparent background, no lettering.“

**Wirkung:** „Fantasy videogame visual effects sheet, bright golden sword arc, violet magical burst, blue translucent shield dome, fiery sparks, each effect isolated on transparent background, high contrast, no characters, no writing.“

## Grafik- und Performance-Vertrag
1. Die Serverantwort entscheidet ausschließlich über Treffer, Schild, Bonus, LP, Zeit und Siege.
2. Animationen visualisieren bestehende serverbestätigte Werte und dürfen keine zusätzlichen Requests pro Frame erzeugen.
3. Bilder: nach Möglichkeit WebP, komprimiert; Hintergrund möglichst unter 900 KB, einzelne Figur möglichst unter 450 KB. Keine riesigen PNGs ohne Not.
4. Alle Figuren mit gleicher Kamerahöhe und festem Blickwinkel generieren; Boss links, Team rechts.
5. Figuren **ohne Hintergrund** generieren; keine Schrift und keine eingebauten Buttons.
6. Für `prefers-reduced-motion` stehen Animationen still; HUD bleibt vollständig lesbar.
7. Vor dem Austausch: Kontrast, Tablet-Querformat, Smartphone-Hochformat und die vier Minispiele testen.

## Nächste gestalterische Ausbaustufen
- **Character polish:** echte Cut-out-Artworks statt der bisherigen Vektorsilhouetten.
- **Effects pass:** kurze Treffer- und Schild-VFX, serverzeit-synchron ohne Gameplayänderung.
- **Cinematic pass:** Angriff/Abwehr als vollständige 4,5-Sekunden-Sequenzen mit klaren Gesamtzahlen.
- **Boss phases:** dynamische Farb- und Lichtwechsel, Boss-Formen für spätere Tore als austauschbare Assets.
