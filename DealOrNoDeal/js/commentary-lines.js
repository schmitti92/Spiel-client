'use strict';
/* Original placeholder lines; final character dialogue will be authored separately. */
const studioCommentLines={
 1:{name:'Stromberg',image:'buero-portrait-01-avatar.webp',oneCent:strombergCatalogue.oneCent,small:strombergCatalogue.small,neutral:strombergCatalogue.medium,millionLost:strombergCatalogue.millionLost,large:strombergCatalogue.high},
 2:{name:'Bert',image:'bert-avatar.webp',oneCent:["Ein Cent! Hervorragend, die hohen Beträge bleiben im Spiel.","Der Ein-Cent-Koffer ist weg. Ein perfektes Ergebnis.","Nur ein Cent verloren. Das war wirklich gut.","Der kleinste Koffer ist verschwunden. Ausgezeichnet!","Besser hätte diese Öffnung kaum laufen können.","Ein winziger Verlust, und die Gewinnchancen bleiben groß.","Ein Cent ist weg. Das ist ein hervorragender Start.","Genau den kleinsten Betrag wollten wir entfernen.","Die Tafel sieht nach diesem Cent gleich viel besser aus.","Ein Cent weniger Risiko. Sehr erfreulich."],small:['Gut. Ein kleiner Betrag weniger.','Das verbessert unsere Ausgangslage.',"Sehr schön, wieder ein niedriger Wert gestrichen.","Wir kommen unserem Ziel ein Stück näher.","Das war eine vernünftige Kofferwahl.","Die kleinen Summen verschwinden. Das ist unser Ziel.","Ein guter Koffer, wir bleiben konzentriert.","Das hilft uns, die wertvollen Beträge zu schützen.","Sehr ordentlich. Die Richtung stimmt."],neutral:["Das liegt im Mittelfeld. Wir machen einfach weiter.","Weder besonders gut noch besonders schlecht.","Ein mittlerer Wert. Wir behalten den Überblick.","Das Ergebnis ist verkraftbar, aber kein Grund zum Feiern.","Wir sollten uns auf die noch offenen großen Summen konzentrieren.","Ein mittlerer Betrag. Das Ergebnis ist akzeptabel.","Das lässt sich noch gut ausgleichen.","Wir sollten jetzt keine voreiligen Schlüsse ziehen.","Ein neutraler Schritt, mehr nicht."],millionLost:["Eine Million Euro weg. Das ist ein richtig schwerer Verlust!","Bei einer Million hört der Spaß wirklich auf.","Eine Million weniger im Spiel. Das müssen wir erst einmal verdauen.","Die Million hätten wir dringend behalten sollen.","Eine Million Euro! Das ist ein bitterer Moment.","Wir haben die Million verloren. Jetzt heißt es, ruhig bleiben.","Die Million ist weg. Ein schwerer Schlag für unsere Chancen.","Eine Million Euro verloren. Das ist wirklich bitter.","Ausgerechnet die Million. Das trifft uns hart.","Mit der Million verschwindet eine riesige Gewinnchance.","Die Million ist weg. Jetzt braucht es starke Nerven."],large:['Oh nein! Das ist ein erheblicher Verlust.','Wir sollten jetzt besonders vorsichtig sein.',"Das war leider einer der wertvollen Koffer.","Jetzt wird die nächste Entscheidung umso wichtiger.","Ein hoher Betrag weniger. Das schmerzt.","Ein großer Betrag weniger. Das ist bedauerlich.","Jetzt müssen wir die verbliebenen Chancen schützen.","Diese Summe hätten wir lieber behalten.","Das war ein Rückschlag, aber noch nicht das Ende."]},
 3:{name:'Ernie',image:'ernie-avatar.webp',oneCent:["Juhu! Nur ein einziger Cent!","Ein Cent! Die großen Gewinne sind noch da!","Hihi! Den winzigsten Betrag haben wir erwischt!","Hurra! Der allerkleinste Koffer ist weg!","Oh, wie schön! Da war ja fast nichts drin!","Ein Cent? Das ist ja ein Glückstreffer!","Juhu, der Cent ist weg!","Das war ja ein klitzekleiner Koffer!","Hihi, den Cent vermisst bestimmt keiner!","Toll! Der winzigste Betrag ist raus!"],small:['Juhu! Der war ja winzig!','Hihi, die großen Geschenke sind noch da!',"Jippie, wieder ein kleiner Betrag!","Das war toll! Hoffentlich geht es so weiter!","Hihi, den können wir gut verschmerzen!","Juhu, das war ein guter Koffer!","So darf es gerne weitergehen!","Hihi, die großen Zahlen bleiben stehen!","Da kann ich wieder lächeln!"],neutral:["Hm, der war mittelgroß. Mal sehen, was noch kommt!","Nicht winzig, nicht riesig. Weiter geht's!","Hm, das war jetzt so mittelgut.","Na ja, immerhin sind die ganz großen noch da.","Ich bin gespannt, was im nächsten Koffer steckt!","Hm, ich weiß noch nicht, was ich davon halten soll.","Na ja, das war wenigstens nicht der größte Betrag.","Ich drücke weiter ganz fest die Daumen!","Jetzt wird es langsam richtig spannend."],millionLost:["Oh nein! Die ganze Million ist weg!","Eine Million Euro? Das war wirklich der falsche Koffer!","Auweia! Die Million hätten wir so gerne behalten!","Jetzt ist die Million futsch. Das tut richtig weh!","Die Million ist weg? Oh nein, nein, nein!","Auweia, eine ganze Million! Das ist wirklich traurig!","So ein riesiger Gewinn! Und jetzt ist er weg!","Oh nein, die Million! Ich kann gar nicht hinsehen!","Eine Million Euro! Das ist ja furchtbar!","Auweia, unsere schöne Million ist weg!","Die Million ist futsch! Jetzt brauche ich Glück!"],large:['Oh! Damit habe ich nicht gerechnet.','Ups! Jetzt wird es spannend!',"Oh je! Das war aber ein dicker Betrag!","Uff, jetzt bin ich ein bisschen nervös.","Och nö! Den hätten wir gern behalten!","Oh weh, der tat jetzt richtig weh!","Och, so viel Geld auf einmal!","Bitte nicht noch so einen Koffer!","Uff, da musste ich erst mal schlucken!"]},
 4:{name:'Heinz Becker',image:'heinz-becker-avatar.webp',oneCent:["Ei, bloß en Cent! Des is doch prima!","Ein Cent? Na, den könne mer verschmerze!","Ei, so muss des sein. Der Cent is fort!","Ei, des war jo bloß Kleingeld!","Na also, des is doch emol e gute Sach!","So en winziger Betrag, do kann mer net meckern.","Ei, en Cent, des is doch wunderbar!","Na siehste, bloß de kleinste Betrag!","Do kannste wirklich net meckern.","So e Cent tut uns net weh."],small:['Ei, das is doch schon mal was.','Na siehste. Geht doch.',"Ei, des läuft doch ganz ordentlich.","Na guck, wenigstens nix Großes erwischt.","Des kann mer so stehe lasse.","Ei, des war doch e guter Griff!","Na also, es geht doch!","Do bleibe die große Summe noch drin.","Des gefällt mer schon besser."],neutral:["Ei, des is halt mittendrin. Machste nix.","Jo, weder besonders gut noch besonders schlecht.","Jo, des is halt weder gut noch schlecht.","Ei, jetzt warte mer halt ab, was noch kommt.","Des haut uns jetzt net aus de Schuhe.","Jo, des is halt Mittelmaß.","Na gut, des war jetzt net so schlimm.","Mer müsse halt weitergucke.","Ei, so is des Spiel eben."],millionLost:["Ei, die Million! Die hätt mer doch gebraucht!","Eine Million Euro weg, do kannste nur noch den Kopp schütteln.","Ausgerechnet die Million. Ei, des gibt's doch net!","Do war die Million drin! Jetzt is se fort.","Ei, e Million! Do wird mer jo ganz schwindlig!","Die Million is weg? Des kann doch net wahr sein!","Ausgerechnet so e Millionenkoffer, ei herrje!","Ei, die Million is weg! Jesses!","E ganze Million, einfach fort!","Na super, jetzt is die Million futsch!","Do muss mer sich erst mal hinsetze, bei so ere Million!"],large:['Ei, das war jetzt aber nix.','Da hätt mer besser en annern genomm.',"Ei, jetzt is aber e schöner Batze fort!","Do hätt mer besser die Finger weg gelasse.","Ach du liebe Zeit, des war teuer!","Ei, des geht jetzt aber ins Geld!","Na toll, e richtig großer Betrag fort!","Do hätt mer lieber en annern Koffer genomme.","Des is jetzt wirklich ärgerlich."]},
 5:{name:'Bernd',image:'buero-portrait-02-avatar.webp',oneCent:["Ein Cent aufgedeckt. Ein ausgezeichnetes Ergebnis.","Der niedrigste Betrag ist ausgeschieden. Sehr gut.","Ein Cent weniger. Unsere Ausgangslage bleibt hervorragend.","Ein minimaler Verlust. Besser geht es kaum.","Die niedrigste Summe ist erledigt. Weiter so.","Dieser Koffer war eine ausgesprochen gute Wahl.","Der Cent ist ausgeschieden. Das ist optimal.","Ein minimaler Betrag weniger. Ein klarer Vorteil.","Wir haben den kleinsten Wert erfolgreich entfernt.","Dieser Cent-Verlust ist praktisch bedeutungslos."],small:['Gut. Das können wir so festhalten.','Ein erfreuliches Zwischenergebnis.',"Das Ergebnis ist klar positiv.","Ein niedriger Betrag ausgeschieden. Sehr erfreulich.","Die wertvollen Koffer bleiben weiterhin verfügbar.","Ein positiver Schritt für unsere Gewinnchancen.","Die niedrigen Werte werden weniger.","Ein gutes Ergebnis. Wir setzen die Strategie fort.","Dieser Koffer hat uns kaum geschadet."],neutral:["Ein durchschnittlicher Betrag. Wir bleiben ruhig.","Das verändert die Lage nicht grundlegend.","Ein mittlerer Betrag. Wir bewerten die Lage nüchtern.","Das ist weder ein Erfolg noch ein schwerer Rückschlag.","Die entscheidenden Beträge sind weiterhin offen.","Ein durchschnittlicher Verlust. Wir bleiben sachlich.","Das Ergebnis verändert die Situation nur begrenzt.","Keine außergewöhnliche Entwicklung.","Wir sollten die nächsten Entscheidungen abwarten."],millionLost:["Eine Million Euro verloren. Das ist ein massiver Einschnitt.","Die Million ist ausgeschieden. Unsere Gewinnchance sinkt erheblich.","Das war der denkbar ungünstige Koffer für eine Million.","Eine Million weniger. Das verändert die gesamte Ausgangslage.","Der Verlust von einer Million Euro ist gravierend.","Eine Million ist ausgeschieden. Das verändert unsere Prognose.","Die Million hätten wir unbedingt im Spiel halten müssen.","Eine Million Euro ausgeschieden. Ein gravierender Verlust.","Der Verlust der Million ist ein Wendepunkt.","Die Million hätte unsere Gewinnchancen stark verbessert.","Mit der Million verlieren wir eine entscheidende Option."],large:['Das müssen wir jetzt erst mal einordnen.','Das war leider keine gute Entwicklung.',"Dieser Verlust belastet unsere Gewinnchancen.","Ein erheblicher Wert wurde eliminiert.","Das war ein ungünstiges Ergebnis. Wir müssen neu kalkulieren.","Ein hoher Wert ist verloren. Das ist problematisch.","Diese Summe fehlt uns jetzt deutlich.","Unsere Aussichten haben sich verschlechtert.","Das war ein finanziell schwerer Treffer."]},
 7:{name:'Heisenberg',image:'avatar-portrait-05-avatar.webp',oneCent:["Ein Cent eliminiert. Genau das wollten wir.","Der kleinste Betrag ist weg. Die großen Chancen bleiben.","Ein Cent. Das war ein optimaler Koffer.","Der kleinste Koffer. Präzise getroffen.","Ein Cent weniger. Das Risiko wurde optimal reduziert.","Ein nahezu perfekter Zug. Die hohen Summen bleiben.","Ein Cent entfernt. Genau nach Plan.","Der kleinste Wert ist eliminiert. Gut.","Ein Cent weniger. Wir behalten die Kontrolle.","Der Cent ist raus. Die wichtigen Werte bleiben."],small:['Gut. Wir behalten die Kontrolle.','Ein kleiner Betrag. Wie erwartet.',"Gut. Ein weiterer niedriger Wert ist eliminiert.","Das Ergebnis entspricht unserer Strategie.","Die Ausgangslage verbessert sich.","Ein kleiner Betrag. Ein sinnvoller Treffer.","Die niedrigen Werte verschwinden.","Unsere Chancen bleiben intakt.","Gut. Weiter mit derselben Konzentration."],neutral:["Ein mittlerer Wert. Wir bleiben bei unserem Plan.","Keine außergewöhnliche Veränderung. Weiter.","Ein mittlerer Betrag. Keine Panik.","Das war kalkulierbar. Wir bleiben fokussiert.","Die entscheidenden Summen sind noch im Rennen.","Ein mittlerer Wert. Das ist verkraftbar.","Wir sollten das nüchtern betrachten.","Kein Grund, die Strategie zu ändern.","Die Lage bleibt offen."],millionLost:["Eine Million Euro aus dem Spiel. Ein schwerwiegender Verlust.","Wir haben gerade eine Million eliminiert. Das ist nicht zu korrigieren.","Die Million ist weg. Jetzt müssen wir die verbleibenden Chancen neu bewerten.","Eine Million Euro. Genau diesen Koffer hätten wir vermeiden müssen.","Eine Million Euro verloren. Ein gravierender Fehler.","Die Million ist weg. Unsere Optionen schrumpfen.","Eine Million aus dem Rennen. Jetzt zählt jeder verbleibende Koffer.","Eine Million weg. Das war der schlimmste Treffer.","Die Million ist verloren. Das ändert alles.","Eine Million Euro eliminiert. Jetzt wird es eng.","Der Millionenkoffer ist geöffnet. Ein bitterer Moment."],large:['Ein kostspieliger Fehler.','Das verändert unsere Berechnung.',"Das war ein kostspieliger Verlust.","Ein hoher Betrag ist weg. Wir müssen umdenken.","Nicht optimal. Aber wir sind noch nicht fertig.","Ein hoher Wert verloren. Das kostet uns Optionen.","Dieser Koffer war ein Fehler.","Jetzt müssen wir präziser auswählen.","Ein schwerer Verlust. Wir bleiben fokussiert."]},
 12:{"name":"Weihnachtsmann","image":"weihnachts_event/file_0000000052f88210a16983ce1ff8c3e0.png","oneCent":["Ho ho ho! Ein Cent weniger, das ist mein Lieblingsgeschenk!","Ein Cent? Den hätte selbst ein Wichtel aus der Kasse genommen!","Der kleinste Betrag ist weg. Dafür gibt es ein dreifaches Ho!","Ein Cent verschwindet, die großen Geschenke bleiben!","Da klingeln meine Glöckchen vor Freude!","So einen Koffer lege ich gerne unter den Weihnachtsbaum!","Ho ho! Das war eine Bescherung ganz nach meinem Geschmack!","Ein Cent weg. Die Rentiere dürfen jubeln!"],"small":["Ho ho ho! Ein kleiner Betrag verabschiedet sich!","Das war eine hübsche kleine Bescherung!","Die großen Geschenke warten noch im Sack!","So mag ich das: kleine Beträge raus, Hoffnung rein!","Ein guter Treffer, mein lieber Weihnachtswichtel!","Da bleibt noch reichlich Platz für ein großes Wunder!","Rudolf, notier das auf der Liste der guten Entscheidungen!","Die Weihnachtsglocken klingen heute besonders freundlich!"],"neutral":["Ho ho, da liegt wohl ein mittleres Päckchen unterm Baum.","Nicht jeder Koffer enthält ein Weihnachtswunder.","Das ist weder Kohle noch Gold. Wir spielen weiter!","Ein mittelgroßer Betrag. Mein Geschenkesack hält das aus.","Auch am Nordpol braucht man manchmal Geduld.","Der Advent ist lang, und die Partie noch nicht vorbei.","Ho ho ... darüber muss ich erst einmal nachdenken.","Das war ein solider, aber kein festlicher Treffer."],"large":["Oje! Da ist ein ziemlich großes Geschenk verloren gegangen.","Ho ho ... oh nein. Das tut selbst dem Weihnachtsmann weh.","Der Koffer war teurer als mein kompletter Schlitten!","Rudolf, bitte die Notfall-Lichter einschalten!","Das war keine schöne Bescherung.","Mein Geschenkesack fühlt sich plötzlich viel leichter an.","So ein hoher Betrag hätte wunderbar unter den Baum gepasst.","Ho ho ... das Lachen fällt mir gerade schwer."],"millionLost":["Eine Million?! Ho ho ... nein! Das war das größte Geschenk!","Rudolf! Wir haben gerade eine Million vom Schlitten geworfen!","Eine Million Euro ist weg. Da verstummen sogar die Weihnachtsglocken.","Ho ho ho? Nein. Heute eher oh, oh, oh!","Für diese Million hätte ich dem ganzen Nordpol neue Schlitten gekauft!","Das ist die teuerste Bescherung meiner Weihnachtsgeschichte.","Eine Million verloren! Selbst meine Wichtel sind sprachlos.","Oh du schreckliche! Die Million ist aus dem Sack gefallen!"]},
 13:{"name":"Schneemann","image":"weihnachts_event/schneemann_charakter.png","oneCent":["Ein Cent! Da schmilzt mir vor Freude fast die Karottennase!","Nur ein Cent weg. Eiskalt gut gespielt!","Das war ein Treffer mit Schneeflocken-Präzision!","Ein Cent weniger. Ich bleibe cool!","Da klatschen sogar meine Schneebälle Beifall!","Ein Cent? Dafür muss ich nicht einmal meinen Schal richten!","Die großen Beträge bleiben. Das ist frostig fantastisch!","So eine Öffnung lässt mein Schneeherz hüpfen!"],"small":["Ein kleiner Betrag ist weg. Cool bleiben, das läuft!","Eiskalt erwischt – genau die richtige Größenordnung!","Die kleinen Beträge tauen dahin, die großen bleiben!","Mein Schal sitzt, die Chancen auch!","Das war ein richtig guter Schneeballwurf!","So lässt sich ein Wintermärchen gewinnen!","Ich sehe noch jede Menge glitzernde Möglichkeiten!","Kleiner Verlust, große Hoffnung. Frostig gut!"],"neutral":["Hm, ein mittlerer Betrag. Ich bleibe erst mal stehen.","Nicht schlecht, nicht gut. Ein klassischer Schneematsch-Moment.","Da muss ich kurz meine Karottennase sortieren.","Ein mittlerer Treffer. Mein Puls bleibt bei null Grad.","Das war eher Schneeregen als Pulverschnee.","Noch ist nichts eingefroren. Wir spielen weiter!","Ich brauche einen Moment zum Abkühlen.","Das Ergebnis ist okay. Kein Grund zum Schmelzen."],"large":["Autsch! Da bekomme ich Frostbeulen am Schneebauch!","Ein hoher Betrag weg? Mein Lächeln friert gerade ein.","Das war ein Schneeball mitten ins Portemonnaie!","Hilfe, meine Karottennase ist vor Schreck verrutscht!","So viel Geld weg. Da wird selbst mir kalt.","Das war eine echte Lawine für unsere Gewinnchancen.","Ich glaube, mein Schal braucht jetzt Trost.","Der Betrag ist geschmolzen. Und ich gleich mit."],"millionLost":["Eine Million?! Ich bin offiziell zum Schneematsch geworden!","Die Million ist weg! Holt schnell einen Eimer für mich!","Eine Million Euro! Selbst mein Eis-Herz bekommt Risse.","Oh nein! Das war keine Schneeflocke, das war eine Lawine!","Die Million ist geschmolzen. Ich schmelze gleich hinterher!","Bei diesem Treffer fällt mir die Karottennase ab!","Eine Million weg? Ich brauche dringend eine neue Frostschutzversicherung!","Das war der kälteste Moment meines ganzen Winters!"]},
 11:{"name":"Rudolf","image":"weihnachts_event/reindeer-9985063_640.jpg","oneCent":["Ein Cent! Meine rote Nase leuchtet vor Freude!","Nur ein Cent weg – das ist ein Volltreffer mit Geweih!","Da kann ich den Schlitten vor Freude kaum stillhalten!","Der kleinste Betrag ist fort. Rentierstark!","Ein Cent? Dafür lohnt sich nicht einmal ein Umweg!","Meine Nase blinkt: Alles richtig gemacht!","So eine Kofferöffnung bringt selbst den Nordpol zum Jubeln!","Das war besser als eine freie Landebahn!","Ein Cent weniger, die großen Geschenke bleiben!","Ich habe ein gutes Gefühl in den Hufen!"],"small":["Kleiner Betrag weg! Da trabt es sich gleich leichter!","Das war eine saubere Landung!","Die wertvollen Koffer bleiben auf unserem Schlitten!","Meine Nase zeigt weiter Richtung Hauptgewinn!","Ein guter Treffer – weiter im Galopp!","So kommt man sicher durch den Schneesturm!","Kleine Summen raus, große Hoffnung bleibt!","Der Schlitten wird leichter, die Chancen größer!","Das war ein Rentiermoment zum Feiern!","Da klappern meine Hufe vor Begeisterung!"],"neutral":["Ein mittlerer Betrag. Ich halte den Kurs.","Da muss ich erst mal mit den Hufen scharren.","Weder Rückenwind noch Gegenwind. Weiter geht's!","Meine Nase blinkt heute vorsichtig gelb.","Nicht jede Landung ist ein Volltreffer.","Der Weg zum Finale ist noch lang.","Ich behalte die restlichen Koffer im Blick.","Ein durchschnittlicher Treffer – ruhig weiterfliegen!","Da braucht es etwas Rentiergeduld.","Wir sind noch nicht vom Kurs abgekommen."],"large":["Auweia, das war ein schwerer Koffer!","Da bin ich mit dem Schlitten ins Schleudern geraten!","Meine rote Nase blinkt Alarm!","Ein hoher Betrag weg – das tut in den Hufen weh!","Da hat uns ein Schneesturm erwischt!","Der Schlitten verliert gerade ein wertvolles Geschenk.","Oh nein, das war ein teurer Umweg!","Ich brauche eine neue Route zum großen Gewinn.","Da lässt sogar mein Geweih die Ohren hängen!","So eine Öffnung macht den Flug holprig."],"millionLost":["Eine Million?! Meine Nase blinkt jetzt dunkelrot!","Die Million ist weg! Das ist ein Schlittenunfall der Extraklasse!","Eine Million Euro verloren – selbst meine Hufe zittern!","Das größte Geschenk ist vom Schlitten gefallen!","Oh nein! Dafür hätten wir eine ganze Rentierflotte bekommen!","Eine Million? Ich muss erst einmal landen!","Da hilft nicht einmal mein hellstes Nasenlicht!","Der Nordpol wird von diesem Verlust hören!","Eine Million ist weg. Das war ein bitterer Treffer!","Mein Geweih steht vor Schreck senkrecht!"],"bankerVeryGood":["Das Angebot leuchtet heller als meine Nase!","Da lohnt sich sogar ein Extra-Rundflug!","Der Banker hat offenbar Weihnachtslaune!","Das könnte eine perfekte Landung werden!"],"bankerGood":["Ein ordentliches Angebot. Ich halte den Schlitten bereit!","Meine Nase zeigt Richtung Annahme – aber entscheiden müsst ihr!","Das sieht nach einem guten Wintergeschäft aus!","Der Banker ist heute nicht knauserig!"],"bankerBad":["Das Angebot bringt meinen Schlitten nicht in Bewegung.","Da hätte ich mehr erwartet.","Meine Nase blinkt skeptisch.","Der Banker sollte noch mal nachrechnen!"],"bankerVeryBad":["Für das Angebot verlasse ich meinen Stall nicht!","Das ist nicht mal genug für Rentierfutter!","Meine Nase blinkt eindeutig Nein!","Da fliege ich lieber noch eine Runde!"]}
};

/* Additional original holiday lines; existing categories and rules remain intact. */
studioCommentLines[12].oneCent.push(...["Ein Cent weniger! Das ist ein Geschenk mit Schleife!","Ho ho! Der Koffer gehört auf die gute Liste!","So klingt eine perfekte Weihnachtsüberraschung!","Diesen Cent hätte sogar mein Sparschwein verschmäht!","Das war eine glanzvolle Kofferöffnung!","Mein Rentierteam jubelt auf dem Dach!","Der Cent ist Geschichte, das Wunder bleibt möglich!","Ein Cent? Das war leichter als ein leerer Geschenkesack!","Da tanzen die Wichtel im Lagerhaus!","So sieht eine wirklich frohe Bescherung aus!"]);
studioCommentLines[12].small.push(...["Das war ein kleiner Betrag, wunderbar!","Ho ho! Der Gewinntraum bleibt groß!","Das ist ein Grund für ein Glöckchenkonzert!","Kleine Kofferwerte dürfen gerne gehen!","Ein Geschenk weniger, aber die besten bleiben!","Mein Schlitten bleibt auf Erfolgskurs!","Die Hoffnung glänzt heller als der Weihnachtsstern!","Da gibt es heute keine Rute!","Ein hübscher Treffer für unsere Weihnachtsliste!","Ho ho, die wertvollen Päckchen warten noch!"]);
studioCommentLines[12].neutral.push(...["Das ist ein ordentliches, aber kein riesiges Päckchen.","Ho ho, wir behalten einen kühlen Kopf!","Nicht jeder Koffer muss ein Festtagswunder sein.","Ein mittlerer Wert. Die Geschichte geht weiter.","Da kratze ich mir kurz den weißen Bart.","Manchmal ist Abwarten das schönste Geschenk.","Die Spannung bleibt unter dem Weihnachtsbaum.","Noch ist kein endgültiges Urteil möglich.","Auch am Nordpol gibt es solche Zwischenergebnisse.","Ho ho, ich schaue gespannt auf die restliche Tafel."]);
studioCommentLines[12].large.push(...["Oh weh, das war ein kostspieliger Weihnachtsabend!","Der Betrag hätte für sehr viele Geschenke gereicht!","Ho ho ... dieser Koffer tut im Herzen weh.","Mein Geschenkesack hat gerade ein Loch bekommen!","Da verlieren selbst die Glöckchen ihren Rhythmus.","Das war ein schweres Paket zum Abschied.","Ich muss den Wichteln schlechte Nachrichten bringen.","Dieser Betrag fehlt uns am Weihnachtsmorgen.","So eine Bescherung wollte ich nicht erleben.","Rudolf, bitte bleib trotz allem auf Kurs!"]);
studioCommentLines[12].millionLost.push(...["Eine Million! Das ist schlimmer als ein Schlitten ohne Rentiere!","Ho ho ... die Million ist endgültig weg!","Meine Wichtel müssen sich erst einmal setzen.","Die Million war unser glänzendstes Weihnachtsgeschenk!","Da fällt selbst mein roter Mantel vor Schreck zusammen.","Ich habe schon viele Bescherungen erlebt, aber keine solche!","Die Million verschwindet wie Schnee in der Sonne!","Das war ein Koffer mit einer wirklich traurigen Überraschung.","Mein Weihnachtsstern hat gerade an Glanz verloren.","Eine Million Euro verloren! Das muss man erst verdauen!"]);
studioCommentLines[13].oneCent.push(...["Ein Cent weg! Meine Schneeflocken tanzen Polka!","So gut trifft nicht einmal mein bester Schneeball!","Der Cent ist weg, mein Grinsen bleibt!","Eiskalt perfekt! Die großen Beträge bleiben stehen!","Ein Cent weniger. Da wackle ich vor Freude!","Das ist der kleinste Schneekrümel überhaupt!","Mein Schneebauch jubelt wie eine Schneekugel!","Da wird selbst der Winter ein bisschen heller!","Die Karottennase zeigt eindeutig nach oben!","Ein Cent? Ich bleibe völlig unbeeindruckt – vor Freude!"]);
studioCommentLines[13].small.push(...["Kleiner Betrag, große Schneemannfreude!","Das war glatter als ein zugefrorener See!","Mein Schal flattert vor Begeisterung!","Die guten Chancen bleiben schön tiefgekühlt!","Da könnte ich einen Freudentanz im Schnee machen!","Ein kleiner Verlust. Das ist richtig cool!","Das ist ein Grund für ein Schneeflockenfeuerwerk!","Die wertvollen Koffer sind weiter im Rennen!","Mein Frostbarometer zeigt auf Erfolg!","Ein schöner Treffer, ohne dass jemand schmilzt!"]);
studioCommentLines[13].neutral.push(...["Das ist ein Ergebnis irgendwo zwischen Frost und Tauwetter.","Meine Karottennase zuckt, aber ich bleibe ruhig.","Ein mittelgroßer Betrag. Ich warte lieber ab.","So fühlt sich ein grauer Wintertag an.","Da brauche ich erst einmal einen heißen ... nein, lieber kalten Tee!","Das ist kein Grund, den Schal wegzuwerfen.","Ich bleibe gelassen wie ein Schneemann im Januar.","Das Ergebnis liegt genau im Schneematschbereich.","Ein durchschnittlicher Koffer. Nächste Schneeflocke, bitte!","Wir haben noch genug Eis unter den Füßen."]);
studioCommentLines[13].large.push(...["Auweia, das war ein ziemlich teurer Schneeball!","Da bricht mir fast ein Astarm ab!","Mein Frostherz hat gerade einen Sprung bekommen.","Das war keine Flocke, sondern ein ganzer Eisberg!","Ich muss mich kurz hinter meinem Schal verstecken.","Der Verlust war größer als meine Schneekugel!","So etwas bringt sogar einen Schneemann ins Schwitzen!","Mein Lächeln ist gerade im Schneesturm verschwunden.","Das war ein ordentlicher Rutsch ins Minus!","Die Karottennase hängt heute ein Stück tiefer."]);
studioCommentLines[13].millionLost.push(...["Eine Million! Ich falle gleich in einzelne Schneeflocken auseinander!","Das war ein Lawinenabgang direkt durch die Gewinnchancen!","Meine Schneekugel hat gerade einen Riss bekommen!","Eine Million Euro weg? Holt den Winterdienst!","Das ist schlimmer als Hochsommer für einen Schneemann!","Mein Schneebauch braucht dringend eine Pause!","Die Million ist weg, und ich bin sprachlos eingefroren!","Das war der größte Schneeball meines Lebens – mitten ins Gesicht!","Eine Million verloren. Ich brauche einen neuen Schal fürs Herz!","Bei diesem Betrag schmilzt selbst der Nordpol vor Schreck!"]);
studioCommentLines[12].bankerVeryGood=["Ho ho! Der Banker hat heute wohl den Geschenkesack geöffnet!","Das Angebot glitzert wie ein Weihnachtsstern!","So großzügig ist nicht einmal mein Wichtelrat!","Da klingeln alle Glocken am Nordpol!"];
studioCommentLines[12].bankerGood=["Ho ho, das ist ein ordentliches Weihnachtsangebot!","Da könnte ein schönes Geschenk auf uns warten!","Der Banker zeigt heute Festtagsstimmung!","Das Angebot verdient einen Platz unter dem Baum!"];
studioCommentLines[12].bankerBad=["Ho ho, da ist der Banker wohl knauserig!","Das Geschenk ist kleiner als erwartet.","Da hätte ich mehr Zuckerstangen angeboten!","Der Banker hat wohl seinen großen Sack vergessen."];
studioCommentLines[12].bankerVeryBad=["Ho ho? Das ist doch nur Geschenkpapier ohne Geschenk!","Für diesen Betrag starte ich den Schlitten nicht!","Der Banker verteilt heute wohl nur Krümel.","Das ist eine sehr magere Weihnachtsbescherung!"];
studioCommentLines[13].bankerVeryGood=["Wow, das Angebot bringt selbst mein Eis zum Glitzern!","So ein Angebot lässt mich vor Freude fast schmelzen!","Eiskalt stark, Herr Banker!","Da fliegen mir die Schneeflocken um die Ohren!"];
studioCommentLines[13].bankerGood=["Cool, das ist ein anständiges Angebot!","Der Banker hat seinen Geldbeutel aufgetaut!","Da kann ich meinen Schal zufrieden richten!","Das sieht nach einem schönen Wintergewinn aus!"];
studioCommentLines[13].bankerBad=["Das Angebot lässt mich kalt. Sehr kalt!","Der Banker hat sein Geld wohl tiefgefroren.","Da ist ja mein Schneeball größer!","Ich würde lieber noch ein paar Koffer sehen."];
studioCommentLines[13].bankerVeryBad=["Das ist keine Offerte, das ist Schneematsch!","Da friert mir vor Enttäuschung die Karottennase ein!","Der Banker hat wohl eine Eiszeit im Portemonnaie.","Für dieses Angebot verlasse ich meine Schneebank nicht!"];

/* Extra character-specific Christmas lines, grouped by real game situation. */
studioCommentLines[11].oneCent.push(...["Ein Cent! Meine Hufe machen einen Freudentanz!","Das ist ein Treffer, bei dem mein Nasenlicht auf Grün springt!","Der kleinste Koffer ist weg – volle Fahrt voraus!","So präzise lande ich sonst nur auf verschneiten Dächern!","Ein Cent? Da muss ich nicht einmal die Bremsen testen!","Das ist besser als eine Extraportion Rentiermoos!"]);
studioCommentLines[11].small.push(...["Ein kleiner Wert weniger – ich nehme wieder Fahrt auf!","Die großen Beträge sind noch sicher auf dem Schlitten!","Meine Hufe trommeln den Siegesrhythmus!","Das war ein eleganter Bogen um den Schneesturm!","So einen Koffer würde ich sofort wieder wählen!","Mein Geweih zeigt eindeutig Richtung Glück!"]);
studioCommentLines[11].neutral.push(...["Meine Nase blinkt langsam. Ich beobachte die Lage.","Da bleibe ich lieber in der Warteschleife.","Ein mittlerer Betrag – kein Grund, die Route zu ändern.","Noch sind wir nicht auf der Zielgeraden.","Ich prüfe lieber erst die restliche Koffertafel.","Das war eine ruhige Landung ohne Feuerwerk."]);
studioCommentLines[11].large.push(...["Da hat es ordentlich an meinem Geschirr geruckelt!","Der Betrag war schwerer als ein Sack voller Geschenke!","Meine Hufe stehen vor Schreck still.","Das war ein teurer Abstecher durch den Schneesturm.","Jetzt brauchen wir eine bessere Flugroute!","Mein Nasenlicht blinkt auf höchste Warnstufe!"]);
studioCommentLines[11].millionLost.push(...["Eine Million! Ich habe gerade die Landebahn verloren!","Mein Geweih steht unter Schock – die Million ist weg!","Das war ein Absturz für unsere Gewinnhoffnung!","Ich muss den Weihnachtsmann ganz vorsichtig informieren.","Eine Million Euro! Da verstummt sogar mein Glöckchen.","Der größte Betrag ist fort. Jetzt brauchen wir Nerven aus Stahl!"]);
studioCommentLines[11].bankerVeryGood.push(...["Da leuchtet meine Nase wie ein ganzes Lichtermeer!","Ein solches Angebot könnte uns sicher nach Hause bringen!","Ich setze zur Landung an – das ist wirklich großzügig!"]);
studioCommentLines[11].bankerGood.push(...["Der Banker hat offenbar Rentierfutter eingepreist!","Das ist ein Angebot mit Rückenwind!","Meine Nase zeigt: ernsthaft darüber nachdenken!"]);
studioCommentLines[11].bankerBad.push(...["Da hebt mein Schlitten nicht einmal ab!","Für dieses Angebot lasse ich die Hufe lieber am Boden.","Ich sehe noch keinen Grund für eine Notlandung!"]);
studioCommentLines[11].bankerVeryBad.push(...["Das Angebot ist kleiner als mein Frühstück!","Mein Nasenlicht blinkt: Bitte nachbessern!","So wenig Geld? Da laufe ich lieber zu Fuß!"]);
studioCommentLines[12].oneCent.push(...["Ho ho ho! Der Cent ist verschwunden wie ein Keks vor Heiligabend!","Das war ein Geschenk ohne böse Überraschung!","Ein Cent weniger, und die Weihnachtsmagie bleibt!","Dafür bekommt der Spieler einen Platz auf meiner guten Liste!","Die Wichtel jubeln – der kleinste Koffer ist fort!","Ho ho, da kann ich vor Freude den Bart schütteln!"]);
studioCommentLines[12].small.push(...["Wieder ein kleiner Betrag weg. Der Stern leuchtet weiter!","Die besten Geschenke liegen noch unterm Baum!","Das war eine Weihnachtsüberraschung mit Happy End!","Mein Geschenkesack ist heute auf Erfolgskurs!","Ho ho, die großen Wünsche bleiben möglich!","Da bekommen die Wichtel einen zusätzlichen Feiertag!"]);
studioCommentLines[12].neutral.push(...["Ein mittleres Päckchen – ich packe noch nicht die Glocken aus.","Auch der Weihnachtsmann muss manchmal abwarten.","Da ist weder Jubel noch Trauer angebracht.","Der Inhalt war solide, aber kein Weihnachtswunder.","Ich lasse die Wichtel die restliche Tafel prüfen.","Noch ist nicht entschieden, wer das schönste Geschenk bekommt."]);
studioCommentLines[12].large.push(...["Oh du stille Nacht – das war ein teurer Koffer!","Da ist mir gerade ein Glöckchen vom Schlitten gefallen.","Dieser Betrag hätte viele Kinderaugen zum Leuchten gebracht.","Ho ho ... heute fällt mir das Lachen schwer.","Mein Geschenkesack hat gerade deutlich an Gewicht verloren.","Das war ein bitterer Moment für die Weihnachtskasse."]);
studioCommentLines[12].millionLost.push(...["Eine Million! Dafür gibt es nicht einmal einen Trost-Lebkuchen!","Ho ho ... die Million hat den Schlitten verlassen.","Das ist die traurigste Bescherung des ganzen Jahres!","Eine Million Euro! Meine Wichtel haben kollektiv Pause beantragt.","Selbst die Nordpol-Uhr ist vor Schreck stehen geblieben.","Ho ho ... bei dieser Million wird sogar mein Bart grau!"]);
studioCommentLines[12].bankerVeryGood.push(...["Ho ho! Dieses Angebot ist ein Weihnachtswunder!","Das ist ein Geschenkesack, den ich gerne tragen würde!","Der Banker hat offenbar seine großzügigste Mütze auf!"]);
studioCommentLines[12].bankerGood.push(...["Das Angebot gehört auf meine Liste der netten Überraschungen!","Ho ho, darüber sollte man ernsthaft nachdenken.","Ein solider Betrag mit festlicher Schleife!"]);
studioCommentLines[12].bankerBad.push(...["Der Banker hat wohl beim Geschenkpapier gespart!","Ho ho, da fehlt mir noch ein wenig Weihnachtszauber.","Das Angebot ist eher eine kleine Socke als ein Sack!"]);
studioCommentLines[12].bankerVeryBad.push(...["Ho ho? Das ist ja nicht einmal ein halbes Weihnachtsgeschenk!","Der Banker sollte sich schämen – meine Wichtel bieten mehr!","Das Angebot landet auf meiner Liste der Enttäuschungen!"]);
studioCommentLines[13].oneCent.push(...["Ein Cent! Mein Schneebauch macht einen Freudenhüpfer!","Das war so sauber wie frisch gefallener Pulverschnee!","Ein Cent weg – ich werfe vor Freude meine Mütze hoch!","Da glitzert sogar meine Karottennase!","Das ist ein Treffer unterhalb des Gefrierpunkts – perfekt!","Der kleinste Betrag ist fort. Ich bleibe cool und glücklich!"]);
studioCommentLines[13].small.push(...["Ein kleiner Betrag weg – ich tanze den Schneeflockenwalzer!","Die großen Koffer bleiben schön eingefroren!","Da bekomme ich fast Frühlingsgefühle. Fast!","Ein guter Treffer – mein Schal flattert vor Freude!","Das war ein Volltreffer mit Schneeballgarantie!","Die Gewinnchancen sind noch wunderbar frostfrisch!"]);
studioCommentLines[13].neutral.push(...["Ein mittlerer Betrag – mein Frostthermometer bleibt ruhig.","Da schmilzt noch nichts, aber es friert auch nichts zu.","Ich brauche erst einmal einen Moment im Schatten.","Das war eher Schneeregen als Winterwunderland.","Mein Karottenkompass zeigt noch keine Richtung.","Ich bleibe stehen. Das kann ich ohnehin besonders gut."]);
studioCommentLines[13].large.push(...["Da hat mir jemand einen Schneeball ins Gesicht geworfen!","Der Verlust hat meine Schneekugel ordentlich durchgeschüttelt.","Meine Kohleknöpfe zittern vor Schreck!","Das war ein Schneesturm für unsere Gewinnchancen.","Ich glaube, mein linker Astarm braucht Urlaub.","Bei so einem Betrag wird selbst mir heiß!"]);
studioCommentLines[13].millionLost.push(...["Eine Million! Mein Schneekörper zerfällt vor Entsetzen!","Da hilft kein Frostschutzmittel der Welt!","Die Million ist weg – ich bestelle sofort Neuschnee!","Mein Schneebauch hat gerade einen Lawinenalarm ausgelöst!","Eine Million Euro! Ich brauche dringend einen Schattenplatz!","Bei diesem Treffer wird aus mir eine Pfütze mit Karottennase!"]);
studioCommentLines[13].bankerVeryGood.push(...["Das Angebot ist cooler als ein Eisberg im Januar!","Da würde sogar ein Schneemann Freudentränen frieren!","Ein richtig glänzendes Angebot – wie Eiskristalle!"]);
studioCommentLines[13].bankerGood.push(...["Der Banker hat heute wohl einen Schneebonus verteilt!","Das klingt nach einem gemütlichen Wintergewinn.","Bei diesem Angebot bleibt meine Möhre optimistisch!"]);
studioCommentLines[13].bankerBad.push(...["Da friert mir schon beim Zuhören das Lächeln ein!","Der Banker sollte sein Portemonnaie auftauen.","Das ist eher ein Schneekrümel als ein Angebot!"]);
studioCommentLines[13].bankerVeryBad.push(...["Für diesen Betrag bewege ich nicht einmal einen Astarm!","Das Angebot ist dünner als mein letzter Schneeball!","So eine Zahl lässt mich in den Winterschlaf fallen!"]);

/* Further character-specific festive commentary; no changes to game logic. */
studioCommentLines[11].oneCent.push(...["Ein Cent! Mein Nasenlicht könnte heute den ganzen Himmel erhellen!","Das war eine Punktlandung auf dem kleinsten Betrag!","Ein Cent weniger. Ich schlage vor, wir fliegen eine Ehrenrunde!","So einen Treffer rieche ich schon aus zehn Kilometern Entfernung!","Meine Hufe klappern vor Freude wie Weihnachtsglocken!","Der Cent ist weg. Jetzt bloß nicht übermütig werden!"]);
studioCommentLines[11].small.push(...["Ein kleiner Kofferwert weniger. Wir gewinnen an Flughöhe!","Das lief so glatt wie mein Start vom Nordpol!","Meine Nase blinkt: gute Entscheidung!","So bleibt der Schlitten voller großer Hoffnungen!","Ich habe schon schlechtere Landungen hingelegt!","Kleine Beträge verschwinden, die Spannung steigt!"]);
studioCommentLines[11].neutral.push(...["Ein mittlerer Treffer. Ich bleibe auf Flughöhe.","Da brauche ich noch keinen Notfallplan.","Meine Nase leuchtet heute lieber vorsichtig.","Wir sollten nicht jedem Koffer hinterhertrauern.","Noch ist genügend Strecke bis zum Finale.","Ein ruhiger Flugabschnitt – mehr war das nicht."]);
studioCommentLines[11].large.push(...["Bei diesem Betrag hätte ich beinahe die Zügel verloren!","Ein teurer Treffer. Meine Nase wechselt auf Alarmrot!","Da wird sogar das Rentierfutter knapp!","Der Schlitten hat gerade ordentlich gewackelt!","Das war ein unschöner Haken auf unserer Flugroute.","Ich hoffe, die nächsten Koffer sind leichter zu verkraften."]);
studioCommentLines[11].millionLost.push(...["Eine Million weg! Ich glaube, mein Geweih hat gerade geknackt!","Das war kein Koffer, das war ein Meteorit auf unserer Flugbahn!","Meine rote Nase leuchtet, aber die Million kommt nicht zurück.","Eine Million Euro! Da braucht selbst ein Rentier erst mal eine Pause.","Ich habe schon Schneestürme überstanden, aber das war schlimmer!","Der Millionenkoffer ist offen. Jetzt heißt es Kurs halten!"]);
studioCommentLines[11].bankerVeryGood.push(...["Das Angebot ist so gut, dass ich freiwillig eine Extrarunde drehe!","Da könnte man den Schlitten zufrieden parken!","Meine Nase blinkt vor Begeisterung über diese Zahl!"]);
studioCommentLines[11].bankerGood.push(...["Das klingt nach einem vernünftigen Zwischenstopp.","Bei diesem Angebot würde ich zumindest die Zügel lockern.","Der Banker hat heute wohl ein Herz für Rentiere."]);
studioCommentLines[11].bankerBad.push(...["Meine Hufe bleiben auf dem Gaspedal!","Für diesen Betrag fliege ich noch nicht nach Hause.","Der Banker muss wohl erst seinen Taschenrechner auftauen."]);
studioCommentLines[11].bankerVeryBad.push(...["Das Angebot ist so mager, da frisst mein Geweih mehr!","Meine Nase blinkt deutlich: weiterfliegen!","So eine Zahl passt auf einen einzigen Rentierkeks."]);
studioCommentLines[12].oneCent.push(...["Ho ho ho! Ein Cent weniger, und die Weihnachtsstimmung steigt!","Den kleinsten Betrag haben wir erfolgreich ausgepackt!","Das war ein Geschenk, das man gerne zurückgibt!","Die Wichtel haben gerade eine Jubelpolonaise gestartet!","Ein Cent weg. Da darf sogar mein Bart vor Freude wackeln!","Ho ho, das war eine wirklich glückliche Bescherung!"]);
studioCommentLines[12].small.push(...["Ein kleiner Wert weniger – so mag ich meine Überraschungen!","Das Weihnachtsglück bleibt in den großen Koffern verborgen.","Die Wichtel können die Sektgläser wieder hinstellen – noch nicht gewonnen!","Ho ho, das war ein freundlicher Gruß vom Glück!","Die besten Geschenke sind noch nicht ausgepackt.","Das ist ein schöner Schritt Richtung Festtagsfinale!"]);
studioCommentLines[12].neutral.push(...["Ein mittlerer Betrag. Da raschelt nur das Geschenkpapier.","Ho ho, ich würde noch keine Entscheidung überstürzen.","Das war eine ganz gewöhnliche Bescherung.","Auch ein Weihnachtsmann muss gelegentlich nüchtern rechnen.","Die große Überraschung lässt noch auf sich warten.","Ich schaue lieber, welche Summen noch auf der Tafel stehen."]);
studioCommentLines[12].large.push(...["Oje, das war ein wirklich teures Geschenk!","Da ist mir der Lebkuchen vor Schreck aus der Hand gefallen!","Der Weihnachtsstern hat gerade kurz geflackert.","Ho ho ... dieser Koffer hätte geschlossen bleiben dürfen.","Meine Wichtel müssen jetzt die Wunschliste kürzen.","Das war ein unangenehm großer Betrag zum Abschied."]);
studioCommentLines[12].millionLost.push(...["Eine Million! Selbst mein Schlitten hat vor Schreck angehalten!","Ho ho ... nein. Das war die teuerste Überraschung des Abends.","Die Million ist weg. Ich brauche einen sehr großen Trostkeks.","Meine Wichtel haben gerade das Licht im Geschenkewarenhaus ausgemacht.","Eine Million Euro! Da verstummen selbst die Glocken am Nordpol.","Die Million ist fort. Jetzt müssen die übrigen Koffer glänzen!"]);
studioCommentLines[12].bankerVeryGood.push(...["Ho ho! Der Banker hat wohl die große Geschenkekiste geöffnet!","Das Angebot verdient eine goldene Schleife!","Bei dieser Zahl wird sogar mein Bart vor Freude lockig!"]);
studioCommentLines[12].bankerGood.push(...["Ein Angebot, über das man in Ruhe nachdenken sollte.","Ho ho, das klingt nach einem soliden Weihnachtsgeschenk.","Der Banker hat heute immerhin etwas Festtagsgefühl."]);
studioCommentLines[12].bankerBad.push(...["Das ist eher eine Socke als ein voller Geschenkesack.","Ho ho, da fehlt noch ein bisschen Weihnachtsmagie.","Ich glaube, der Banker hat den falschen Wunschzettel gelesen."]);
studioCommentLines[12].bankerVeryBad.push(...["Für diese Zahl gibt es höchstens einen Schokonikolaus!","Ho ho? Der Banker hat wohl die Geschenke verwechselt.","Das Angebot kommt auf meine Liste der besonders sparsamen Bescherungen."]);
studioCommentLines[13].oneCent.push(...["Ein Cent! Da bekomme ich vor Freude fast Sommersprossen!","Der kleinste Betrag ist weg – meine Karottennase jubelt!","Das war so präzise wie ein Schneeball durchs offene Fenster!","Ein Cent weniger. Ich schüttle vor Freude meine Schneeflocken ab!","So eine Öffnung ist besser als ein Tag bei minus zehn Grad!","Der Cent ist weg. Meine Kohleknöpfe glänzen vor Stolz!"]);
studioCommentLines[13].small.push(...["Ein kleiner Betrag weg – da bleibt mein Schneebauch entspannt!","Das war ein Treffer mit ordentlich Frost im Blut!","Die großen Gewinne bleiben noch unter einer dicken Schneedecke.","Meine Karottennase zeigt Richtung Erfolg!","So ein Ergebnis macht selbst den Winter gemütlich.","Ein guter Koffer. Ich würde vor Freude hüpfen, wenn ich Knie hätte!"]);
studioCommentLines[13].neutral.push(...["Ein mittlerer Betrag. Da friere ich erst mal weiter.","Das ist ein Ergebnis zwischen Schneeflocke und Schneematsch.","Mein Schal sitzt, aber die Lage bleibt offen.","Ich würde dazu etwas sagen, doch meine Lippen sind eingefroren.","Ein mittlerer Wert – kein Grund für einen Schneesturm.","Ich warte lieber, bevor ich die Mütze werfe."]);
studioCommentLines[13].large.push(...["Uff! Das war eine Schneelawine fürs Punktekonto!","Bei dem Betrag wird sogar meine Karottennase blass!","Ich habe gerade einen Kohleknopf vor Schreck verloren!","Das war ein teurer Schneeball ins eigene Tor.","Meine Frostreserve ist nach diesem Koffer deutlich geschrumpft.","So ein Verlust bringt selbst mich ins Schwitzen."]);
studioCommentLines[13].millionLost.push(...["Eine Million! Meine Schneeflocken sind vor Schreck stehen geblieben!","Die Million ist weg. Ich brauche einen Notfall-Schneepflug!","Das war ein Lawinenabgang mitten durch unsere Hoffnungen!","Eine Million Euro! Mein Schal reicht nicht aus, um mich zu trösten.","Ich schmelze nicht, ich verdampfe vor Schreck!","Der Millionenkoffer ist offen. Das war frostig bitter!"]);
studioCommentLines[13].bankerVeryGood.push(...["Das Angebot ist so gut, dass sogar meine Kohleknöpfe strahlen!","Da kann ich nur sagen: eisig beeindruckend!","Der Banker hat wohl seine Geldscheine aufgetaut!"]);
studioCommentLines[13].bankerGood.push(...["Ein ordentliches Angebot. Mein Schneebauch bleibt optimistisch.","Das ist ein Winterangebot mit warmer Aussicht.","Da würde ich meine Karottennase kurz zum Nachdenken benutzen."]);
studioCommentLines[13].bankerBad.push(...["Das Angebot ist kälter als mein linker Astarm.","Der Banker sollte noch ein paar Schneeflocken drauflegen.","Dafür taue ich garantiert nicht auf."]);
studioCommentLines[13].bankerVeryBad.push(...["Das ist kein Angebot, das ist ein gefrorener Krümel!","Bei dieser Zahl friert mir selbst das Lächeln fest.","Der Banker hat sein Portemonnaie wohl im Eisblock vergessen."]);


/* Jan Schlappen: eigenständige, norddeutsch-trockene Originaldialoge für Koffer und Banker. */
studioCommentLines[14]={
 "name": "Jan Schlappen",
 "image": "jan-schlappen.webp",
 "oneCent": [
  "Moin oder wat! Ein Cent? Dafür kriegste ja nich mal 'ne Tüte Luft.",
  "Ein Cent weg. Herrlich! Da kannste den Banker gleich mal winken lassen.",
  "Junge, für den Cent hätt ich nich mal den Koffer angefasst.",
  "Ein Cent! So, nu sind wir doch schon fast Millionäre, ne?",
  "Jo, Kleingeld entsorgt. Dat nenn ich mal 'ne vernünftige Mülltrennung.",
  "Moin! Dat war der günstigste Schreck seit Langem.",
  "Ein Cent. Da kannste noch nich mal 'nen Kaugummi von kaufen.",
  "Jo, der kleinste Betrag is wech. Da geht mir doch glatt die Sonne auf."
 ],
 "small": [
  "Na siehste! So muss dat. Kleinen Kram raus und die dicken Dinger drinlassen.",
  "Moin oder wat! Dat war doch 'n sauberer Griff.",
  "Jo, den Betrag kannste verschmerzen. Is ja nich mein Geld. Noch nich.",
  "Dat war so wenig, dafür mach ich nich mal die Kaffeemaschine an.",
  "Junge, ich sach dir: Wenn dat so weitergeht, wird dat noch richtig gemütlich.",
  "Da kannste mal 'n Haken dran machen. Schön klein, schön wech.",
  "Na, wenigstens einer hier hat 'n glückliches Händchen.",
  "Moin! Dat is 'n Koffer, den würd ich freiwillig zum Altglas bringen.",
  "So, und jetzt bloß nich übermütig werden, ne?",
  "Jo, da klatsch ich sogar. Aber nur einmal, sonst wird dat zu feierlich."
 ],
 "neutral": [
  "Joah. Dat is jetzt so 'ne Zahl, da weißte auch nich, ob du lachen sollst.",
  "Moin, ich sach mal: Hätte schlimmer kommen können. Aber auch besser.",
  "Na, dat war 'n mittelprächtiger Griff ins Portemonnaie.",
  "Junge, dat is weder 'n Grund zum Feiern noch zum Auswandern.",
  "Da guckste erstmal blöd. Und dann spielste weiter, ne?",
  "Jo, den Betrag muss man erstmal sacken lassen. Kaffee?",
  "Dat war jetzt so mittel. Wie lauwarmer Filterkaffee.",
  "Moin oder wat, dat macht die Sache auch nich einfacher.",
  "Da kannste lange drüber schnacken. Der Koffer is nu offen.",
  "Nu bleib mal locker. Die richtig dicken Dinger sind vielleicht noch drin."
 ],
 "large": [
  "Ach du dickes Ei! Den hättste mal schön zugelassen.",
  "Moin oder wat! Wer hat denn da mit verbundenen Augen geklickt?",
  "Junge, Junge, dat war 'n Griff direkt ins Klo.",
  "Da wird selbst mein Kaffee bitter. Und der is schon stark.",
  "Na prima. Dat Geld winkt uns jetzt von ganz weit weg.",
  "Jo, und ich dachte, schlimmer kann's nich werden. War wohl nix.",
  "Dat tut weh. Richtig. Da brauchste auch nich schönreden.",
  "Mensch, den Koffer hätt ich lieber als Türstopper behalten.",
  "Da lacht der Banker sich doch die Bügel aus der Hose.",
  "Moin. Einmal tief durchatmen und bloß nich noch so'n Ding öffnen."
 ],
 "millionLost": [
  "MOIN ODER WAT?! EINE MILLION?! Junge, dat is doch nich dein Ernst!",
  "Eine Million wech! Da kannste auch gleich die ganze Sendung abschalten.",
  "Jo, prima. Den teuersten Koffer haben wir jetzt wenigstens gefunden.",
  "Mensch, für die Million hättste dir 'n ganzes Haus mit Kaffeemaschine kaufen können.",
  "Da fällt mir sogar das Moin im Hals stecken.",
  "Eine Million! Und der Banker sitzt da und grinst sich einen, ne?",
  "Junge, Junge. Dat war kein Koffer, dat war 'ne finanzielle Vollbremsung.",
  "So, ich geh erstmal Kaffee holen. Dat muss ich verarbeiten.",
  "Moin oder wat, dat war der teuerste Klick des Tages.",
  "Eine Million weniger auf der Tafel. Da wird mir ganz anders, sach ich dir."
 ],
 "bankerVeryGood": [
  "Moin! Na, der Banker kann ja doch vernünftig rechnen.",
  "Junge, bei dem Angebot würd ich erstmal die Hände stillhalten.",
  "Jo, dat is 'ne Ansage. Da kannste nich einfach drüberweggucken.",
  "Moin oder wat! Hat der Banker heute Geburtstag oder warum is der so großzügig?",
  "Na, dat würd ich mir aber zweimal überlegen, bevor ich Nein sage.",
  "So 'n Angebot kriegste nich jeden Dienstag, ne?"
 ],
 "bankerGood": [
  "Jo, dat kannste machen. Musste aber nich.",
  "Moin, der Banker hat wohl 'n halbwegs guten Tag.",
  "Na, dat is doch mal 'ne Zahl, über die man schnacken kann.",
  "Junge, da musste jetzt mal den Kopf einschalten, nich nur den Daumen.",
  "Dat is kein schlechtes Angebot. Aber ich würd nochmal auf die Tafel schielen.",
  "Joah, könnte passen. Ich würd trotzdem erstmal 'nen Kaffee drüber trinken."
 ],
 "bankerBad": [
  "Moin oder wat! Dat soll 'n Angebot sein?",
  "Nee, du. Dafür geb ich doch meinen Koffer nich her.",
  "Der Banker soll mal die Brille putzen und neu rechnen.",
  "Jo, dat is aber 'n bisschen dünn auf der Brust.",
  "Junge, da kannste auch gleich 'nen Einkaufsbon anbieten.",
  "Na, der hat wohl Angst um seine eigene Kohle, ne?"
 ],
 "bankerVeryBad": [
  "Moin oder wat! Will der Banker uns auf den Arm nehmen?",
  "Dat is kein Angebot. Dat is 'ne Frechheit mit Schleifchen.",
  "Junge, Junge. Da würd ich nich mal ans Telefon gehen.",
  "Der Banker hat wohl sein Portemonnaie mit 'nem Teebeutel verwechselt.",
  "Für dat Geld kriegste ja nich mal 'nen vernünftigen Urlaub.",
  "Nee. Einfach nee. Da brauchste gar nich weiterzureden."
 ]
};

/* Weitere eigens verfasste Zeilen, thematisch angelehnt an Jans öffentlich bekannte Parkour-, Freerunning- und 'oder watt'-Motive; keine wörtlichen Zitate. */
studioCommentLines[14].oneCent.push(...["Oder watt?! Dat war jetzt der kleinste Sprung überhaupt.","Ein Cent! Dafür brauchste weder Anlauf noch 'ne GoPro.","Dat Ding is weg, und ich hab noch nicht mal Puls.","Schlappen-Alarm! Ein Cent – der Koffer hat uns ja richtig erschreckt.","Dat war kein Risiko, dat war Aufwärmen.","Ein Cent? Da verdient ja meine alte Socke mehr.","Junge, der Koffer war so leicht, den hättste rückwärts aufgemacht.","So, jetzt Full Send auf die kleinen Zahlen, oder watt?","Watt 'ne Nummer. Einen Cent weniger, Stimmung trotzdem stabil.","Wenn dat so weitergeht, mach ich gleich 'nen Rückwärtssalto."]);
studioCommentLines[14].small.push(...["Full Send, oder watt? Genau so muss dat aussehen.","Dat war 'n sauberer Landing, Junge!","Schlappen, wir sind drin! Kleine Zahl, dicke Hoffnung.","Für so 'nen Betrag spring ich nicht mal vom Bordstein.","Dat war stabiler als meine Landung auf'm Hallenboden.","Junge, der Banker guckt schon, als hätt er 'nen Bauchplatscher gemacht.","So 'n Koffer macht Laune, sach ich dir.","Dat is ja fast zu einfach. Wo is der Haken, oder watt?","Kleine Kohle weg – die Show kann weitergehen.","So, jetzt nicht abheben. Erstmal noch 'nen vernünftigen Sprung.","Dat nenn ich 'nen kontrollierten Abgang.","Watt 'ne saubere Nummer! Da gibt's nix zu meckern."]);
studioCommentLines[14].neutral.push(...["Moin oder watt? Dat war jetzt 'n halber Bauchplatscher.","Ich hab schon wildere Landungen hingelegt, sach ich mal.","Dat war jetzt nicht Full Send, eher halbe Strecke.","Junge, da musste erst mal gucken, wo du gelandet bist.","So mittel. Wie 'n Sprung, bei dem keiner klatscht.","Watt soll's. Koffer auf, Zahl raus, weiter geht's.","Jo, das war 'n solider Versuch mit fragwürdiger Landung.","Für die Zahl würd ich jetzt keine neue GoPro kaufen.","Dat is wie beim Parkour: Wenn du zu lange zögerst, wird's nicht besser.","Da is noch alles drin. Außer dem Koffer. Der is offen.","Nicht ganz sauber gelandet, aber noch stehen wir.","Moin, ich hab schon schlechtere Entscheidungen gefilmt."]);
studioCommentLines[14].large.push(...["JUNGE! Dat war kein Sprung, dat war freier Fall!","Moin oder watt?! Den Koffer hätten wir lieber in Kanada gelassen.","Dat war 'n Bauchplatscher direkt ins Preisgeld.","Wer hat da bitte Full Send auf den falschen Koffer gemacht?","Junge, ich brauch jetzt erstmal 'ne Pause vom Denken.","Dat is ja wie 'n Salto ohne Landung. Komplett daneben.","Der Banker freut sich 'nen Ast, ich seh dat doch.","Für die Nummer gibt's kein Like von mir.","Da hat einer den Anlauf aber komplett falsch eingeschätzt.","Watt 'ne Bruchlandung! Da wird mir ja anders.","Ich hab schon viel Blödsinn gemacht, aber dat war teuer.","Schlappen, wir müssen reden. Dat ging voll in die Hose."]);
studioCommentLines[14].millionLost.push(...["MOIN ODER WATT?! DIE MILLION?! Ich glaub, ich spring gleich rückwärts raus!","Dat war kein Bauchplatscher, dat war ein Millionensalto ins Nichts!","Junge, die Million war unser Endgegner – und jetzt isse weg.","Für 'ne Million hätt ich mir 'ne ganze Halle zum Springen gebaut.","Da kannst du so viel Full Send rufen, die Million kommt nicht zurück.","Watt 'ne Katastrophe. Die GoPro hätt ich lieber ausgemacht.","Moin, ich glaub, ich muss erstmal 'ne Runde um den Block rennen.","Dat war ein Sprung ohne Landung und ohne Preisgeld.","Junge, der Banker lacht sich gerade schlapp. Ich hör dat bis hier.","Eine Million! Da fällt sogar dem Schlappen nix mehr ein."]);
studioCommentLines[14].bankerVeryGood.push(...["Moin oder watt! Der Banker hat heute richtig einen rausgehauen.","Dat Angebot landet sauber. Da kannste fast applaudieren.","Junge, für die Kohle brauch ich nicht mehr von Dächern springen.","Full Send auf den Deal? Könnte man glatt machen.","Dat is so viel Geld, da brauchste keinen Luxusquatsch mehr.","Watt? Der Banker meint dat ernst? Dann her mit dem Stift.","Ich sach mal: Dat ist mehr als 'n guter Bauchplatscher wert.","Jo, der hat offenbar doch noch 'n Herz im Anzug."]);
studioCommentLines[14].bankerGood.push(...["Dat Angebot hat 'ne halbwegs vernünftige Landung.","Moin, die Zahl kann man sich mal anschauen.","Junge, dat ist jetzt 'ne echte Entscheidung.","Full Send oder Sicherheitslandung? Musste selber wissen.","Da kannste schon drüber nachdenken, oder watt?","Nicht schlecht. Aber die dicken Koffer winken noch.","Jo, das is zumindest kein kompletter Fehlstart.","Da musste den Kopf benutzen, nicht nur die Beine."]);
studioCommentLines[14].bankerBad.push(...["Moin oder watt?! Dafür spring ich nicht mal vom Dreier.","Dat Angebot is 'n Bauchplatscher mit Ansage.","Junge, da hat der Banker wohl beim Rechnen 'nen Salto gemacht.","Für die Kohle würd ich nicht mal die GoPro einschalten.","Nee, dat ist kein Full Send. Dat ist Rückwärtsgang.","Schlappen, sag dem Banker, er soll mal vernünftig werden.","Da kannste ja gleich mit 'nem Einkaufswagen bezahlen.","Dat Angebot is so flach wie 'ne missglückte Landung."]);
studioCommentLines[14].bankerVeryBad.push(...["MOIN ODER WATT?! Der Banker will uns doch veräppeln!","Dat is kein Angebot, dat is 'n Sturz ins Bodenlose.","Junge, dafür würd ich nicht mal meine Schuhe anziehen.","Der Banker macht heute offenbar Comedy. Nur leider schlechte.","Watt 'ne Frechheit! Da kriegste ja nicht mal 'ne vernünftige Matte für.","Full Send auf Nein, sag ich da.","Da kann er auch 'nen leeren Koffer anbieten.","Ich sach mal: Bauchplatscher des Jahres."]);

// Bonus-Spruch: Jan Schlappen, bei einem großen Verlust.
studioCommentLines[14].large.push('Moin oder watt! Dat war ein Rückwärtssalto direkt ins finanzielle Aus, Junge!');

/* Vollständiger Jan-Schlappen-Katalog: zusätzliche Spielsituationen und eigene Dialoge. */
(studioCommentLines[14].oneCent||(studioCommentLines[14].oneCent=[])).push(...["Moin oder watt, dat war ja der kleinste Bauchplatscher aller Zeiten.","Für einen Cent mach ich doch nich mal die Kamera an.","Junge, die große Kohle bleibt drin. So muss dat laufen.","Ein Cent! Da kannste ja beinahe rückwärts jubeln.","Dat war ein Sprung aus zehn Zentimetern Höhe. Völlig entspannt.","Watt für 'ne Zahl. Der Banker kann sich warm anziehen.","Dat war so wenig, ich hab die Zahl fast übersehen.","Ein Cent weniger auf der Tafel, hundert Prozent bessere Laune."]);
(studioCommentLines[14].small||(studioCommentLines[14].small=[])).push(...["Moin! Der Koffer war 'ne saubere Punktlandung.","Junge, dat is ja wie Parkour mit eingebautem Geländer.","Da kannste ruhig grinsen, der Banker tut's gerade nich.","Dat war 'n schöner Auftakt. Jetzt nicht auf dicke Hose machen.","So klein, den Betrag kannste zwischen zwei Fingern tragen.","Jo, die Landung war stabil. Nächster Koffer, oder watt?","Mensch, dat läuft ja wie geschmiert, nur ohne Öl auf der Matte.","Die großen Dinger stehen noch. Ich sach: Weiter geht's!","Watt für ein Glück. Dafür gibt's 'nen Daumen nach oben.","Jo, den Koffer hätt ich auch genommen. Schön handlich."]);
(studioCommentLines[14].neutral||(studioCommentLines[14].neutral=[])).push(...["Moin, dat war ein Sprung mit mittelmäßiger Landung.","Da kannste jetzt lange drüber reden. Bringt die Zahl auch nich zurück.","Junge, da weißte nich, ob du jubeln oder meckern sollst.","Jo, war jetzt kein Weltrekord, aber immerhin noch im Spiel.","Dat hat ungefähr so viel Schwung wie 'n nasser Waschlappen.","Nicht schön, nicht schlimm. Weiter, oder watt?","Ich sach mal: Den hätte ich lieber geschlossen gelassen, aber nun gut.","Dat is so 'ne Zahl, da macht der Banker nur 'ne Augenbraue hoch.","Moin, bei dem Ergebnis brauch ich erstmal 'nen Moment.","Jo, jetzt bitte wieder die kleinen Koffer finden."]);
(studioCommentLines[14].large||(studioCommentLines[14].large=[])).push(...["Moin oder WATT! Dat war 'ne Landung ohne Matte!","Junge, die Zahl hat mir gerade die Schuhe ausgezogen.","Da kannste Full Send schreien, dat Geld is trotzdem weg.","Der Banker macht jetzt bestimmt Freudentänze im Büro.","Dat war kein Koffer, dat war 'ne finanzielle Klippe.","Mensch, dat hat gescheppert wie 'n Einkaufswagen auf Kopfsteinpflaster.","Da wäre rückwärts weglaufen die bessere Taktik gewesen.","Jo, der Koffer hat uns ordentlich einen eingeschenkt.","Dat war mal richtig daneben. Und ich kenn mich mit daneben aus.","Moin. So 'nen Betrag wollt ich heute eigentlich nich sehen."]);
(studioCommentLines[14].millionLost||(studioCommentLines[14].millionLost=[])).push(...["JUNGE! Die Million is wech. Da hilft kein Flickflack mehr.","Moin oder watt, dat war der teuerste Fehltritt seit Erfindung der Treppe.","Die Million! Dat is ein Sturz, den kannste nich einfach wegschneiden.","Für die Million hätt ich die halbe Halle neu ausstatten können.","Jo, da braucht der Banker jetzt erstmal Sauerstoff vor Lachen.","Mensch, bei der Zahl krieg ich selbst Höhenangst.","Dat war ein Millionensprung ohne Absprung. Katastrophe, Junge.","Moin, wer hat hier eigentlich die Koffer sortiert, oder watt?","Eine Million weniger. Da is sogar mein Spruch kurz verschwunden.","Watt für 'n Schock. Dat wird 'n langes Video."]);
(studioCommentLines[14].bankerVeryGood||(studioCommentLines[14].bankerVeryGood=[])).push(...["Moin oder watt, der Banker hat heute offenbar seine Spendierhosen an.","Junge, die Summe is stabiler als jede Landung.","Da würd ich nicht zu lange auf der Kante stehen bleiben.","Jo, bei dem Angebot kannste mal die Knie durchstrecken.","Dat ist 'n Angebot mit richtig Schwung.","Mensch, für die Summe würd ich sogar den Helm aufsetzen."]);
(studioCommentLines[14].bankerGood||(studioCommentLines[14].bankerGood=[])).push(...["Moin, dat kannste mitnehmen. Musste aber selber wissen.","Jo, der Banker springt heute nicht ganz daneben.","Dat Angebot hat immerhin beide Füße auf dem Boden.","Junge, ich würd erstmal gucken, wat noch auf der Tafel steht.","Dat is 'ne Zahl, bei der man kurz still wird.","Jo, kannste machen. Aber die Spannung wär dann weg."]);
(studioCommentLines[14].bankerBad||(studioCommentLines[14].bankerBad=[])).push(...["Moin oder watt, der Banker bietet ja weniger als 'ne kaputte Matte.","Junge, dat is 'n Angebot auf Knien.","Da kannste gleich mit 'nem leeren Rucksack nach Hause gehen.","Jo, der Banker hat die Zahlen wohl im Dunkeln gelesen.","Dat reicht doch nich mal für 'ne ordentliche Landung.","Mensch, da muss er nochmal ordentlich Schwung holen."]);
(studioCommentLines[14].bankerVeryBad||(studioCommentLines[14].bankerVeryBad=[])).push(...["Moin oder WATT?! Dat is ja 'ne Frechheit auf zwei Beinen.","Der Banker soll erstmal lernen, wie man 'ne Zahl richtig landet.","Junge, für die Summe steh ich nich mal vom Sofa auf.","Dat Angebot hat weniger Höhe als 'n Bordstein.","Jo, dat war wohl ein Salto direkt am Taschenrechner vorbei.","Nee, danke. Ich bleib lieber im Spiel."]);
(studioCommentLines[14].finalCases||(studioCommentLines[14].finalCases=[])).push(...["Moin oder watt, jetzt entscheidet sich, ob wir landen oder fliegen.","Junge, dat is die letzte Kurve. Bloß nich ausrutschen.","Jetzt wird's eng. Da passt kein zweiter Versuch mehr rein.","Jo, dat Finale hat mehr Spannung als 'n Sprung vom Zehner.","Mensch, die letzten Koffer. Ich hör schon meinen Puls.","Jetzt heißt's: Augen auf und sauber landen.","Moin, ich würd jetzt gern wissen, wat da drin is.","Dat is der Moment, wo man besser nicht groß rumlabert.","Junge, jetzt muss der letzte Klick sitzen.","Full Send ins Finale, oder watt?"]);
(studioCommentLines[14].deal||(studioCommentLines[14].deal=[])).push(...["Moin oder watt, Deal! Dat Geld nehm ich mit beiden Händen.","Jo, ich steig aus. Sauber gelandet, reicht mir.","Junge, ich nehm die Kohle. Die Show muss auch mal gut sein.","Dat war 'n sicherer Sprung. Und sicher is manchmal richtig.","Moin, lieber 'n Deal in der Hand als 'n Bauchplatscher auf der Tafel.","Jo, unterschrieben. Jetzt kann der Banker alleine weiterzittern.","Watt soll's, dat Angebot is gut genug. Deal!","Junge, ich bin doch nich komplett lebensmüde. Ich nehm dat Geld.","Da mach ich 'nen Haken dran. Saubere Sache.","Moin! Ich hab genug Nervenkitzel für heute."]);
(studioCommentLines[14].noDeal||(studioCommentLines[14].noDeal=[])).push(...["Moin oder watt! No Deal, wir springen weiter.","Junge, für dat Angebot bleib ich doch nich stehen.","Full Send! Dat Risiko gehört hier doch dazu.","Jo, ich will sehen, wat die nächsten Koffer bringen.","Nee, Banker. Versuch's später nochmal mit 'ner richtigen Zahl.","Moin, wir haben noch Sprungkraft. Weiter geht's!","Dat war mir zu wenig. Da is noch Luft nach oben.","Junge, wer jetzt schon aufgibt, hat die Landung nich verdient.","No Deal. Ich guck mir die Sache noch 'n bisschen an.","Jo, jetzt aber bitte nich die Million aufmachen."]);
(studioCommentLines[14].streakGood||(studioCommentLines[14].streakGood=[])).push(...["Moin, drei kleine Beträge hintereinander! Dat is 'ne saubere Serie.","Junge, dat läuft wie 'ne Parkour-Line ohne Fehltritt.","Jo, der Banker kriegt langsam schwitzige Hände.","Watt für 'ne Glückssträhne! Bloß nich übermütig werden.","Dat war jetzt mehrfach richtig gut. Ich sag: Stabil!"]);
(studioCommentLines[14].streakBad||(studioCommentLines[14].streakBad=[])).push(...["Moin oder watt, dat is jetzt aber 'ne Serie von Bauchplatschern.","Junge, einer muss hier mal die Bremse finden.","Jo, die Kofferwahl hat heute wohl Urlaub.","Dat läuft ja wie 'ne Parkour-Line mit verbundenen Augen.","Watt für 'n Pech. Jetzt bitte endlich 'ne kleine Zahl."]);


/* Monster-Wheel exclusive: original grumpy Giftzwerg dialogue. */
studioCommentLines[15]={
  "name": "Muffiger Giftzwerg",
  "image": "giftzwerg.svg",
  "oneCent": [
    "Pah! Ein Cent weg. Nicht mal mein verschimmeltes Geschenk ist so billig.",
    "Na schön, das Kupfer ist raus. Endlich einmal kein Unfug.",
    "Ein Cent! Ich hätte mehr verloren, wenn ich geniest hätte.",
    "Hmpf. Der Cent ist verschwunden. Der Rest darf gern bleiben.",
    "Was für ein Wunder: eine Entscheidung ohne Katastrophe.",
    "Ein Cent weniger. Selbst mein Giftkessel würde darüber lachen.",
    "Ach, ein Winzling. Den hätte ich aus Versehen weggeatmet.",
    "Kleinster Betrag weg. Jetzt bloß keine gute Laune vortäuschen."
  ],
  "small": [
    "Hmpf, kleiner Betrag. Das war ja beinahe erträglich.",
    "So soll es sein: Kleingeld raus, dicke Beute drin.",
    "Nicht schlecht. Aber ich bleibe vorsichtshalber schlecht gelaunt.",
    "Das war ein vernünftiger Griff. Widerlich, ich muss loben.",
    "Der Banker bekommt davon bestimmt Ausschlag. Köstlich.",
    "Na, wenigstens ist dieser Koffer kein finanzielles Gift.",
    "So wenig Verlust? Das ist geradezu unverschämt gut.",
    "Pah! Noch ein kleiner Betrag. Langsam wird das verdächtig."
  ],
  "neutral": [
    "Hm. Nicht gut, nicht grausam. Langweiliger als kalter Pilztee.",
    "Das ist ein mittelgroßer Ärger. Meine Spezialität.",
    "Pff. Der Koffer stinkt nach Durchschnitt.",
    "Diese Zahl liegt mir schwer im Magen. Genau wie mein Frühstück.",
    "Nicht jubeln! Aber zum Heulen reicht es auch noch nicht.",
    "Ein bisschen Verlust, ein bisschen Hoffnung. Widerlich ausgewogen.",
    "Na, das Ergebnis hat immerhin keinen Fluch verdient.",
    "Hmpf. Ich hätte mir mehr Drama gewünscht."
  ],
  "large": [
    "AUA! So eine Summe öffnet man doch nicht freiwillig!",
    "Wer war das? Ich notiere den Namen in mein Fluchbuch.",
    "Das tat weh. Selbst mein Giftkessel kocht vor Empörung.",
    "Pah! Da freut sich nur der Banker. Und der ist schon schlimm genug.",
    "Riesiger Betrag raus! Jetzt wird es unangenehm.",
    "Das war kein Koffer, das war eine Falle mit Goldrand.",
    "Ich habe schlechte Laune bestellt, aber doch nicht so viel!",
    "Noch so ein Verlust und ich verwandle die Tafel in Schimmel."
  ],
  "millionLost": [
    "EINE MILLION?! Jetzt habe ich endgültig schlechte Laune!",
    "Die Million ist weg! Ich brauche drei Tage allein im Giftsumpf.",
    "Mögen hundert faule Pilze auf diesen Koffer regnen!",
    "Eine Million verloren. Der Banker lacht bis zum Nordpol.",
    "Die Million! Rührt mich nicht an, ich werde bissig.",
    "Wer öffnet freiwillig so einen Koffer? Das ist ja ein Fluch!",
    "Selbst mein schlechtestes Geschenk wäre mehr wert gewesen!",
    "Eine Million weniger. Ich brauche sofort meinen Wutkessel."
  ],
  "bankerVeryGood": [
    "Pah! Das ist ja tatsächlich ein ausgezeichnetes Angebot.",
    "So viel Geld? Der Banker muss einen giftigen Pilz erwischt haben.",
    "Ich mag diesen Banker nicht. Aber diese Zahl schon.",
    "Hmpf, bei dem Angebot kribbelt sogar meine Geldbörse.",
    "Wenn du das ablehnst, flucht mein ganzes Zwergenvolk.",
    "Das Angebot riecht überraschend gut. Unheimlich."
  ],
  "bankerGood": [
    "Das Angebot ist ordentlich. Aber ich traue dem Telefon nicht.",
    "Hm, das könnte man nehmen. Was für ein fürchterliches Kompliment.",
    "Pah. Nicht übel für jemanden in einem schicken Büro.",
    "Eine brauchbare Summe. Ich muss meine Meinung überdenken.",
    "Ich würde darüber nachgrummeln, bevor ich Nein sage.",
    "Das ist zumindest mehr als drei Säcke verdorbener Lebkuchen."
  ],
  "bankerBad": [
    "Was? Für diesen Kleckerbetrag soll jemand aufgeben?",
    "Der Banker versucht uns wohl mit Schimmelgeld abzuspeisen.",
    "So ein Angebot gehört in den Kompost.",
    "Unverschämtheit! Meine alten Socken sind mehr wert.",
    "Nicht mal für einen neuen Giftkessel reicht das.",
    "Pah, der Banker spart ja sogar beim schlechten Witz."
  ],
  "bankerVeryBad": [
    "DAS nennt er ein Angebot?! Ich verfluche seine Rechenmaschine!",
    "Für diesen Betrag schleiche ich nicht mal aus meiner Höhle.",
    "Der Banker soll seine Münzen selber polieren.",
    "Hmpf! Ich habe bessere Summen im Abfluss gefunden.",
    "So billig komme ich euch nicht davon, ihr Festtagsnarren!",
    "Finger weg von diesem Deal. Das ist Betrug am Weihnachtsmuffel!"
  ],
  "finalCases": [
    "Jetzt wird es ernst. Mein Giftkessel ist vor Spannung übergekocht.",
    "Letzte Koffer! Wer jetzt zittert, darf bei mir Pilze sortieren.",
    "Hmpf. Das Finale macht mir fast gute Laune. Widerlich.",
    "Ein letzter Griff zwischen Reichtum und meinem ewigen Spott.",
    "Nicht blinzeln! Selbst meine Sporen halten den Atem an.",
    "Das letzte Geschenk ist meist das mit dem fiesesten Fluch."
  ],
  "deal": [
    "Deal! Her mit dem Geld. Ich brauche neue Schimmelpilze.",
    "Ich nehme das Angebot. Freut euch bloß nicht zu früh.",
    "Unterschrieben. Aber ich grummle trotzdem weiter.",
    "Das sichere Geld ist mir lieber als Überraschungen aus dem Sumpf.",
    "Der Banker darf seinen Handel behalten. Ich nehme die Münzen.",
    "Jetzt habe ich genug. Mein Giftkessel ruft."
  ],
  "noDeal": [
    "NO DEAL! Mit mir handelt man nicht so leicht.",
    "Pah, viel zu wenig! Weiter geht die Plünderung.",
    "Ich öffne lieber weitere Koffer, als diesem Banker zu vertrauen.",
    "Nicht mal meine zerbeulte Mütze würde ich dafür hergeben!",
    "Noch mehr Risiko? Vorzüglich. Darauf habe ich gewartet.",
    "Der Banker soll nachbessern. Und zwar ordentlich!"
  ],
  "streakGood": [
    "Drei kleine Beträge? Selbst mein mieses Herz hüpft.",
    "Eine Glückssträhne! Lasst bloß keinen Sonnenschein herein.",
    "Der Banker schwitzt. Ich rieche es bis in meinen Sumpf.",
    "Zu viele gute Koffer. Das ist ja fast ungesund.",
    "Ich könnte lächeln. Lieber nicht, sonst erschrecken alle."
  ],
  "streakBad": [
    "Hmpf, jetzt reicht es mit den teuren Koffern!",
    "Noch ein großer Betrag weg. Das ist ja ein ganzer Fluch.",
    "Das läuft so schlecht, dass meine Pilze freiwillig welken.",
    "Drei Mal Pech? Da hat jemand meinen Zauberkessel umgerührt.",
    "Ich kündige der Glücksfee. Sofort."
  ]
};
