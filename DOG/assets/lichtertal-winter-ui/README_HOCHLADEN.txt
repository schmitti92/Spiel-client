LICHTERTAL – WINTERLICHES GRAFIKPAKET

GitHub-Zielordner: DOG/assets/lichtertal-winter-ui/

Bilder bitte unveraendert hochladen, die Namen sind CSS-freundlich.

DATEIEN

00_REFERENZ_so_soll_es_aussehen.png    Gewaehltes Referenzbild, nur zur Orientierung
01_hintergrund_winternacht.png        Breiter Winterhintergrund mit Polarlicht und Dorf
02_karte_gesperrt.png                Normaler Kartenhintergrund (ohne Text und Nummer)
03_karte_aktuell_gold.png            Goldene aktuelle Stufe
04_karte_erreicht_gruen.png           Erreichte Stufe (Gruen)
05_karte_abholbereit.png             Hervorgehobene, abholbereite Stufe
06_sidebar_winterdeko.png             Winterdeko fuer Navigation/Sidebar (halbtransparent)
07_schnee_eiszapfen_oben.png         Transparente Schnee- und Eiszapfenleiste
08_medaillon_gold_leer.png           Nummernmedaille fuer aktuelle Stufe
09_medaillon_gesperrt_leer.png       Nummernmedaille fuer gesperrte Stufen
10_medaillon_erreicht_leer.png       Nummernmedaille fuer erreichte Stufen
11_titeltafel_holz_ohne_text.png     Schnee-Holztafel als Hintergrund fuer Ueberschrift
12_button_gesperrt_leer.png          Buttonhintergrund fuer gesperrte Stufe
13_button_gesammelt_leer.png         Buttonhintergrund fuer gesammelte Stufe
14_button_abholen_gold_leer.png      Buttonhintergrund fuer Abholaktion
15_fortschrittsleiste_leer.png       Leere Fortschrittsleiste
16_fortschrittsfuellung.png          Farbige Fortschrittsfuellung
17_vorschau_grafikpaket.jpg          Uebersicht der verwendbaren Grafiken

WICHTIG
Alle Karten, Medaillen und Buttons sind absichtlich OHNE Beschriftung.
Levelnummern, Preise, Namen, Buttons und Zustand muessen dynamisch aus dem
Spiel geladen werden. Kein Bild verleiht Preise oder aendert eine Freischaltung.

EMPFOHLENE CSS-VERWENDUNG
Karte: background-image: url('.../02_karte_gesperrt.png');
       background-size: 100% 100%;
Aktuell: background-image: url('.../03_karte_aktuell_gold.png');
Erreicht: background-image: url('.../04_karte_erreicht_gruen.png');
Abholbereit: background-image: url('.../05_karte_abholbereit.png');
Medaillen/Button-Bilder als background auf vorhandene HTML-Elemente setzen.
Die Schrift (einschliesslich Status) bleibt HTML, fuer Barrierefreiheit.

Die Grafiken sind als reale PNG-Dateien erstellt; das Referenzbild ist nur
eine Gesamtvisualisierung und nicht als einzelner Hintergrund geeignet.
