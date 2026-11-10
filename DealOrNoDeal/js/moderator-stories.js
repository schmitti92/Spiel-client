'use strict';
/* Eight original, prewritten German story arcs. Each match picks one stable arc
   by public game ID; five chapters are selected from public, confirmed events.
   NO private values, network calls or gameplay mutations are used. */
(function(root){
 const stories=[
 {
  "id": "herbert",
  "title": "Herberts verschwundener Gartenzwerg",
  "intro": "Heute erzähle ich Ihnen von Herbert, meinem Nachbarn. Herbert glaubt, dass ein Gartenzwerg namens Günther ihm Reichtum bringt. Er hat ihn vor der Sendung heimlich unter dem Moderatorentisch versteckt. Wenn hier gleich seltsame Dinge passieren, wissen wir wenigstens, wem wir die Rechnung schicken.",
  "banker": {
   "stingy": "Herbert hat gerade den Banker gehört und sofort nach seinem Gartenzwerg gegriffen. Der Banker bietet so wenig, dass Günther nicht einmal eine neue Schubkarre bekäme. Herbert sagt, wir sollen ihm höflich erklären, dass ein Gartenzwerg zwar aus Ton besteht, aber nicht auf den Kopf gefallen ist.",
   "normal": "Herbert steht hinter der Kamera und hält Günther den Gartenzwerg hoch. Er behauptet, der Banker müsse das Angebot verdoppeln, sobald er Günther in die Augen schaut. Bisher schaut der Banker allerdings nur auf seinen Taschenrechner. Das ist vielleicht auch besser für den Gartenzwerg.",
   "generous": "Herbert ist völlig aus dem Häuschen! Der Banker hat ein Angebot gemacht, bei dem sich sogar sein Gartenzwerg eine Eigentumswohnung leisten könnte. Herbert will schon feiern, aber Günther starrt noch immer grimmig auf die Koffer. Ein kritischer kleiner Mann."
  },
  "twist": {
   "top": "Katastrophe im Gartenzwerglager! Der höchste Gewinnbetrag ist aus dem Rennen. Herbert hat Günther vor Schreck fallen lassen. Der Gartenzwerg ist heil geblieben, aber Herbert behauptet, sein Optimismus müsse jetzt erst mal mit zwei Schrauben und etwas Sekundenkleber repariert werden.",
   "cent": "Herbert jubelt! Der kleinste Betrag ist verschwunden und Günther der Gartenzwerg bekommt einen Ehrenplatz auf dem Studiotisch. Herbert sagt, ein guter Koffer sei wie ein guter Garten: Erst muss das Unkraut raus, dann darf das große Geld blühen. Ich frage mich nur, was er da düngt.",
   "lucky": "Herbert hat gerade drei günstige Kofferöffnungen gesehen und Günther den Gartenzwerg zum Finanzberater befördert. Der Kleine bekommt jetzt ein eigenes Büro in einem Blumentopf. Wenn die Serie weitergeht, verlangt Herbert vermutlich auch noch ein Diensthandy für den Zwerg.",
   "rough": "Herbert schwitzt. Der Garten zwerg Günther hat schon drei teure Koffer nicht verhindert. Herbert überlegt, ihn gegen eine Gießkanne auszutauschen. Ich habe ihm gesagt, eine Gießkanne könne immerhin nicht behaupten, sie hätte das vorher alles genau gewusst.",
   "balanced": "Herbert schaut auf das Spielfeld und erklärt, Günther brauche eine kurze Denkpause. Ich persönlich glaube, der Gartenzwerg macht einfach seinen üblichen Mittagsschlaf. Aber solange er nicht versehentlich einen Koffer öffnet, lasse ich ihm seinen kleinen Aberglauben."
  },
  "late": {
   "hope": "Es wird eng, aber der größte Gewinn ist noch nicht ausgeschieden. Herbert hat Günther inzwischen mit einer winzigen goldenen Krone ausgestattet. Der Zwerg sitzt da wie ein König, dem man noch nicht gesagt hat, dass sein Königreich aus drei Blumentöpfen besteht. Jetzt zählen nur noch Nerven.",
   "lost": "Die letzten Koffer rücken näher und Herberts Gartenzwerg trägt inzwischen eine schwarze Schleife. Herbert nennt das würdige Trauer um den verlorenen Höchstbetrag. Ich nenne es dramatisches Theater mit Keramik. Trotzdem: Ein schönes Ende ist noch möglich."
  },
  "finale": {
   "early": "Herbert hat seine Gartenzwerg-Zeremonie kaum begonnen, da ist die Partie schon vorbei. Ein schneller Deal! Günther schaut etwas enttäuscht, weil er noch nicht einmal seine Glückspose vorführen konnte. Herbert behauptet natürlich, genau das sei der Plan gewesen.",
   "triumph": "Was für ein Ende! Herbert küsst gerade seinen Gartenzwerg Günther. Ich möchte ausdrücklich festhalten, dass das nicht zum offiziellen Regelwerk gehört. Aber nach so einem starken Ergebnis darf man auch mal ein Stück Keramik zum Ehrenbürger ernennen.",
   "ordinary": "Die Koffer sind Geschichte, Herbert packt Günther sorgfältig in Zeitungspapier und erklärt: Nicht jedes Abenteuer endet mit einer Villa, aber wenigstens sind alle Gartenzwerge heil. Vielleicht ist das die schönste Art, eine ziemlich verrückte Partie zu beenden."
  }
 },
 {
  "id": "pizza",
  "title": "Die Pizza des Schicksals",
  "intro": "Unsere heutige Geschichte beginnt mit einem Pizzaboten namens Luigi. Er sollte eigentlich nur eine Margherita ins Studio bringen. Stattdessen behauptet er, die Kofferzahlen könnten ihm verraten, ob seine Pizzeria jemals eine zweite Filiale eröffnet. Ich habe ihm erlaubt zuzuschauen. Das war möglicherweise mein erster Fehler.",
  "banker": {
   "stingy": "Luigi hat das Bankangebot gesehen und sofort einen Prospekt mit Sonderangeboten herausgeholt. Er sagt, für diese Summe gäbe es bei ihm eine Pizza mit Luft und einem einzigen Blatt Basilikum. Der Banker wollte trotzdem einen Rabatt. Luigi hat aufgelegt. Ich verstehe ihn.",
   "normal": "Der Banker hat angerufen, und Luigi möchte wissen, ob man das Angebot auch in Pizzakartons auszahlen lassen kann. Ich erkläre ihm gerade zum vierten Mal, dass wir hier keine Großküche betreiben. Er nickt verständnisvoll und fragt nach extra Käse.",
   "generous": "Luigi starrt auf das Bankangebot, als hätte jemand seine Pizzeria mit Trüffeln tapeziert. Er rechnet aus, wie viele Familienpizzen man davon backen könnte. Die Antwort ist offenbar so groß, dass er den Taschenrechner gegen einen Notizblock mit vierzig Seiten ausgetauscht hat."
  },
  "twist": {
   "top": "Luigi hat gerade gesehen, wie der größte Geldbetrag verschwindet. Er hat vor Schreck seine Pizza in die Luft geworfen. Sie ist mit der Käse seite auf dem Studioboden gelandet. Luigi sagt, das sei ein schlechtes Omen. Ich sage, das ist vor allem ein Fall für die Reinigungskraft.",
   "cent": "Der kleinste Betrag ist weg! Luigi ruft, das sei besser als eine kostenlose Knoblauchsoße. Er wirft eine imaginäre Pizza durch den Raum und verspricht jedem Kandidaten einen Rabatt. Allerdings nur, wenn seine Pizzeria nach dieser Sendung noch existiert.",
   "lucky": "Drei gute Koffer hintereinander! Luigi behauptet, das liege an seinem neuen Rezept: Vier Käsesorten, ein Schuss Glück und bloß keine Million in den Ofen. Das Rezept klingt fragwürdig, aber die Koffer scheinen vorerst mitzuspielen.",
   "rough": "Luigi hat nach mehreren teuren Verlusten beschlossen, die Pizza des Schicksals auf vegetarisch umzustellen. Warum? Er meint, Fleisch bringe offenbar Unglück. Ich habe ihn nicht gefragt, was ein Champignon mit einem verlorenen Geldbetrag zu tun haben soll.",
   "balanced": "Luigi sitzt am Rand des Studios und beobachtet das Feld wie eine Pizza im Ofen. Ab und zu ruft er: Noch zwei Minuten! Ich weiß nicht, ob er das Spiel oder seinen Teig meint. Inzwischen riecht es verdächtig nach Oregano und Nervosität."
  },
  "late": {
   "hope": "Der Höchstbetrag ist noch im Rennen. Luigi hat eine Pizza in Form des größten Geldkoffers gebacken. Er sagt, solange sie nicht anbrennt, hätten wir eine Chance auf das große Finale. Ich habe ihm erklärt, dass wir hier Mathematik benutzen. Er hat den Ofen höher gestellt.",
   "lost": "Das ganz große Geld ist raus, aber Luigi lässt sich nicht entmutigen. Er hat eine kleinere Pizza gebacken und nennt sie die realistische Hoffnung. Das klingt weniger glamourös, schmeckt aber offenbar besser. Vielleicht ist das auch eine vernünftige Strategie."
  },
  "finale": {
   "early": "Die Partie endet schneller als Luigis Lieferzeit. Er hat gerade erst die Pizza geschnitten und schon wurde ein Deal gemacht. Luigi ist enttäuscht, weil sein großes Werbefinale ausfällt. Wir haben ihm erlaubt, wenigstens einmal laut Buon appetito zu rufen.",
   "triumph": "Luigi tanzt mit einem Pizzakarton durch das Studio! Nach diesem Ergebnis will er seine nächste Filiale direkt neben der Bank eröffnen. Ich habe ihm geraten, sich vorher mit dem Banker zu verständigen. Luigi sagt, der könne gern die erste Pizza zum vollen Preis bestellen.",
   "ordinary": "Luigi packt seine Pizza ein, schaut ein letztes Mal auf die Koffer und sagt: Nicht jede Bestellung kommt mit extra Käse. Ich glaube, das ist die tiefsinnigste Lebensweisheit, die jemals auf einem Pizzakarton stand. Guten Appetit und gute Heimreise."
  }
 },
 {
  "id": "blubb",
  "title": "Professor Blubb und das Goldfisch-Orakel",
  "intro": "Im Studio steht heute ein Aquarium. Darin schwimmt Professor Blubb, ein Goldfisch, den sein Besitzer für ein Finanzgenie hält. Blubb hat angeblich sämtliche Börsenkrisen vorausgesehen. Seine Methode: Er schwimmt nach links oder rechts. Ich fürchte, wir haben uns wieder einen sehr teuren Experten eingeladen.",
  "banker": {
   "stingy": "Das Bankangebot ist da. Professor Blubb schwimmt sofort hinter seine kleine Burg. Sein Besitzer nennt das eine klare Ablehnung. Ich nenne es normales Verhalten eines Fisches. Aber wenn selbst ein Goldfisch bei diesem Angebot das Weite sucht, sollte der Banker vielleicht nachrechnen.",
   "normal": "Professor Blubb dreht drei Runden um seine Plastikpflanze. Sein Besitzer behauptet, das bedeute: Angebot prüfen, Risiko abwägen, Würmer bestellen. Ich finde die dritte Empfehlung durchaus verständlich. Über den Rest müssen wir noch sprechen.",
   "generous": "Professor Blubb hat beim Bankangebot plötzlich wild mit der Schwanzflosse gewedelt. Sein Besitzer interpretiert das als enthusiastische Zustimmung. Vielleicht hat der Fisch aber auch nur das Futter gesehen. In der Finanzwelt ist der Unterschied manchmal schwer zu erkennen."
  },
  "twist": {
   "top": "Der größte Betrag ist ausgeschieden. Professor Blubb ist gegen die Scheibe geschwommen und hat kurz so getan, als kenne er uns nicht. Sein Besitzer spricht von einer schweren Marktbereinigung. Ich spreche von einem Goldfisch, der seine Karriere als Anlageberater besser überdenken sollte.",
   "cent": "Ein Cent ist raus! Professor Blubb macht eine Ehrenrunde um seine Burg und sein Besitzer nennt ihn das Orakel des Jahrhunderts. Ich möchte daran erinnern, dass derselbe Fisch gestern versucht hat, einen Kieselstein zu essen. Aber heute gönnen wir ihm den Erfolg.",
   "lucky": "Drei erfreuliche Koffer hintereinander! Professor Blubb hat eine neue Fanschar gewonnen. Sein Besitzer verkauft bereits imaginäre Aktien seines Aquariums. Ich rate dringend davon ab. Blubb selbst ist nicht erreichbar. Er jagt gerade eine Luftblase.",
   "rough": "Drei unangenehme Öffnungen! Professor Blubb sitzt regungslos zwischen zwei Kieselsteinen. Sein Besitzer sagt, er betreibe intensive Marktanalyse. Ich sage, er ist beleidigt, weil jemand das Futter vergessen hat. Beides klingt plausibel.",
   "balanced": "Es geht hin und her. Professor Blubb schwimmt im Kreis und sein Besitzer spricht von einer komplexen strategischen Wende. Wir haben inzwischen gelernt, dass bei diesem Fisch jede Bewegung eine große Bedeutung haben soll. Nur stillstehen gilt als Kaffeepause."
  },
  "late": {
   "hope": "Der größte Betrag lebt noch! Professor Blubb hat sich auf die rechte Seite seines Aquariums gestellt. Sein Besitzer schlägt Alarm: Das sei das große Zeichen! Ich hoffe sehr, dass dort nicht einfach der Futterspender hängt. Sonst wird das ein besonders kurzes Wunder.",
   "lost": "Das große Geld ist fort. Professor Blubb taucht vorsichtig aus seiner kleinen Burg auf und schaut auf den Rest der Partie. Sein Besitzer spricht jetzt von langfristiger Stabilität. Ich bin froh, dass wenigstens der Fisch seine Erwartungen anpassen kann."
  },
  "finale": {
   "early": "Die Partie ist schon vorbei. Professor Blubb hatte noch gar keine Gelegenheit, sein berühmtes Doppelschwimmen zu zeigen. Sein Besitzer behauptet, der schnelle Deal sei exakt von ihm vorhergesehen worden. Ich behalte mir vor, die wissenschaftlichen Belege anzufordern.",
   "triumph": "Professor Blubb bekommt heute eine goldene Futterdose! Nach diesem Ergebnis ruft sein Besitzer ihn zum besten Finanzberater der Nation aus. Ich gratuliere dem Fisch herzlich. Und ich hoffe, niemand fragt ihn morgen nach den Zinsen.",
   "ordinary": "Professor Blubb hat das Finale ruhig in seiner Plastikburg erlebt. Sein Besitzer findet, das Ergebnis habe er selbstverständlich vorhergesagt. Da Blubb dazu nicht Stellung nimmt, bleibt der Fall ungeklärt. Vielleicht ist gerade diese Gelassenheit das Erfolgsgeheimnis."
  }
 },
 {
  "id": "hilde",
  "title": "Oma Hildes unerlaubter Glücksclub",
  "intro": "Meine Damen und Herren, heute sitzt Oma Hilde in der ersten Reihe. Sie ist achtundachtzig und leitet einen geheimen Glücksclub im Seniorenheim. Dort tippen sie angeblich mit Bingo-Kugeln auf unsere Koffer. Hilde sagt, sie habe schon dreimal den Hauptgewinn vorausgesagt. Leider jedes Mal in einer anderen Sendung.",
  "banker": {
   "stingy": "Oma Hilde hat das Bankangebot gesehen und laut gerufen: Dafür stehe ich morgens nicht mal auf! Der Banker konnte es angeblich bis ins Büro hören. Hilde schüttelt nur den Kopf und holt einen selbstgebackenen Keks hervor. Ein gefährlicher Moment für seine Verhandlungsposition.",
   "normal": "Hilde notiert das Bankangebot sorgfältig in ihr Kreuzworträtselheft. Daneben schreibt sie: Könnte besser sein. Als ich frage, ob sie einen konkreten Tipp hat, zeigt sie auf eine Bingo-Zahl und sagt: Die Wahrheit liegt irgendwo zwischen Mut und Apfelkuchen.",
   "generous": "Oma Hilde ist begeistert vom Angebot und möchte sofort den Seniorenheim-Bus chartern. Ihr Glücksclub hat bereits beschlossen, im Erfolgsfall einen goldenen Bingo-Käfig zu kaufen. Ich weiß nicht, warum man dafür einen Käfig braucht. Aber ich möchte Hilde heute nicht widersprechen."
  },
  "twist": {
   "top": "Der größte Betrag ist weg! Oma Hilde hat so laut auf den Tisch geschlagen, dass ihre Bingo-Kugeln durch das Studio gerollt sind. Sie beschuldigt den Banker der Sabotage. Ich habe versucht, sie zu beruhigen. Jetzt beschuldigt sie mich ebenfalls.",
   "cent": "Ein Cent ist raus! Oma Hilde springt auf, reißt die Arme hoch und ruft: Bingo! Der halbe Glücksclub steht ebenfalls auf, obwohl niemand weiß, welche Zahl gerade gezogen wurde. So viel Freude über einen Cent habe ich wirklich noch nie gesehen.",
   "lucky": "Die kleinen Beträge verschwinden am laufenden Band! Hilde sagt, sie habe gestern schon eine Glückssträhne im Kaffeesatz gesehen. Ich vermute, sie hatte einfach zu viel Zucker im Kaffee. Aber ich will den Glücksclub nicht aus der Konzentration bringen.",
   "rough": "Mehrere teure Beträge sind draußen. Oma Hilde erklärt ihren Bingo-Kugeln eine strenge Verwarnung und streicht dem Glücksclub die Kekspause. Ich finde, das geht zu weit. Andererseits habe ich gerade selbst ziemlich großen Respekt vor dieser Frau.",
   "balanced": "Oma Hilde beobachtet den Verlauf mit verschränkten Armen. Ihr Glücksclub tuschelt, rechnet und verteilt Bonbons. Ich bin mir nicht sicher, ob wir hier eine Spielshow oder eine sehr ernsthafte Vereinsversammlung veranstalten. Wahrscheinlich beides."
  },
  "late": {
   "hope": "Der größte Betrag ist noch im Rennen! Oma Hilde setzt ihre Brille auf und erklärt dies zum wichtigsten Moment seit dem Bingo-Finale von neunzehnhundertachtundneunzig. Ich habe gefragt, was damals geschah. Sie sagt, sie habe einen Toaster gewonnen. Die Spannung ist also historisch.",
   "lost": "Das ganz große Geld ist weg, aber Oma Hilde ist noch nicht fertig. Sie trommelt mit einem Kugelschreiber auf die Armlehne und sagt: Solange noch ein Koffer steht, ist der Kuchen nicht gegessen. Ich verstehe das als eine Mischung aus Motivation und Drohung."
  },
  "finale": {
   "early": "Oma Hilde kann nicht glauben, wie schnell der Deal zustande kam. Ihr Glücksclub hatte gerade erst die Bingo-Kugeln sortiert. Hilde erklärt, das sei trotzdem ein disziplinierter Sieg über die Ungeduld. Dann nimmt sie sich zwei Kekse als Entschädigung.",
   "triumph": "Oma Hilde jubelt und ihr Glücksclub feiert, als wäre gerade das gesamte Seniorenheim zum Mond geflogen! Sie hat schon einen neuen Vereinsnamen vorgeschlagen: Die millionenschweren Kugelschubser. Ich glaube, diesen Abend wird dort niemand so schnell vergessen.",
   "ordinary": "Das Spiel endet, Oma Hilde klopft auf ihren Bingo-Beutel und sagt: Morgen ist auch noch ein Tag zum Gewinnen. Dann verlangt sie ihre Kekse zurück, die ich versehentlich aufgegessen habe. Ich fürchte, die eigentliche Verhandlung beginnt erst jetzt."
  }
 },
 {
  "id": "krumel",
  "title": "Banker-Buchhalter Herr Krümel",
  "intro": "Heute haben wir einen Gast aus der Buchhaltung des Bankers: Herrn Krümel. Er trägt einen Anzug, einen Taschenrechner und vier Kugelschreiber in der Brusttasche. Krümel behauptet, er könne jede Entscheidung erklären. Bislang hat er drei Mal versucht, den Stromverbrauch der Studiobeleuchtung zu berechnen.",
  "banker": {
   "stingy": "Herr Krümel schaut auf das Angebot und nickt zufrieden. Angeblich habe der Banker seine Zahlen hervorragend im Griff. Ich frage, wie viel davon reine Vorsicht sei. Krümel antwortet, man dürfe Geld nicht ohne schriftlichen Antrag aus dem Haus lassen.",
   "normal": "Der Banker hat sein Angebot geschickt. Herr Krümel prüft sofort die zweite Nachkommastelle und entdeckt einen Rundungsfehler, der niemandem auffällt. Er möchte die Sendung für siebenundzwanzig Minuten unterbrechen. Ich habe seinen Taschenrechner vorsichtshalber ausgeschaltet.",
   "generous": "Herr Krümel wird bleich. Der Banker bietet ungewöhnlich viel! Krümel telefoniert sofort mit der Finanzabteilung und verlangt zusätzliche Sicherungen am Tresor. Ich glaube, der Mann hat noch nie erlebt, dass jemand freiwillig Geld ausgibt."
  },
  "twist": {
   "top": "Der höchste Betrag ist ausgeschieden. Herr Krümel springt von seinem Stuhl, applaudiert und bittet um ein Foto für den Geschäftsbericht. Das ist das erste Mal heute, dass ich ihn lächeln sehe. Ich hätte dieses Lächeln nicht unbedingt kennenlernen müssen.",
   "cent": "Ein Cent verschwindet aus der Geldtafel! Herr Krümel wird nervös und sucht sofort nach der passenden Buchungsnummer. Er sagt, selbst ein Cent müsse sauber abgeschrieben werden. Ich habe selten jemanden gesehen, der mit so wenig Geld so viel Arbeit hat.",
   "lucky": "Drei gute Koffer hintereinander! Herr Krümel schreibt hektisch neue Prognosen auf. Sein Taschenrechner piept, sein Kugelschreiber ist leer und der Banker wartet vermutlich auf einen beruhigenden Bericht. Ich bezweifle, dass er heute noch einen bekommt.",
   "rough": "Mehrere teure Beträge sind verloren gegangen. Herr Krümel hält triumphierend seinen Taschenrechner hoch und sagt, das sei exakt im Risikoordner vorhergesehen worden. Ich habe den Ordner gesehen. Auf dem Deckblatt steht nur: Hoffentlich passiert nichts.",
   "balanced": "Herr Krümel jongliert mit Tabellen und Versicherungsunterlagen. Er erklärt, die Situation sei statistisch hochinteressant, emotional aber unzulässig. Ich kann ihm nicht ganz folgen. Allerdings hat sich sein dritter Kugelschreiber gerade in zwei Teile zerlegt."
  },
  "late": {
   "hope": "Nur wenige Koffer übrig und der höchste Betrag ist noch da! Herr Krümel hat mittlerweile alle Kugelschreiber verbraucht. Er rechnet jetzt mit den Fingern. Falls gleich die große Summe gewinnt, müssen wir vermutlich jemanden aus der Buchhaltung wiederbeleben.",
   "lost": "Der höchste Betrag ist weg und Herr Krümel will die Studiodekoration als betriebliche Einsparung verbuchen. Ich habe ihn gestoppt, bevor er den Moderatorentisch verkauft. Noch ist die Partie nicht vorbei, und ich brauche meine Notizen."
  },
  "finale": {
   "early": "Die Partie endet mit einem schnellen Deal. Herr Krümel atmet auf, stempelt die Akte und geht endlich nach Hause. Zumindest wollte er das. Jetzt verlangt der Banker noch eine schriftliche Erklärung, warum die Show überhaupt so aufregend sein musste.",
   "triumph": "Was für ein Ergebnis! Herr Krümel blickt auf die Zahlen und erklärt sich offiziell für überfordert. Die Buchhaltung des Bankers hat offenbar eine spontane Teambesprechung einberufen. Ich hoffe, sie bestellen ausreichend Kaffee. Den werden sie brauchen.",
   "ordinary": "Herr Krümel schließt seinen Ordner, addiert ein letztes Mal die Zahlen und sagt trocken: Vorgang abgeschlossen. So unspektakulär kann man natürlich auch eine spannende Partie beenden. Vielleicht leihe ich ihm fürs nächste Mal einen Sinn für Humor."
  }
 },
 {
  "id": "keks",
  "title": "Kapitän Keks auf der Mission Millionen",
  "intro": "Willkommen zur Mission Millionen! Kapitän Keks hat behauptet, man könne mit einem goldenen Koffer bis zum Mond fliegen. Deshalb steht heute ein kleines Pappraumschiff hinter unserem Studio. Sein erster Offizier ist ein Staubsauger namens Apollo. Ich ahne, das wird keine gewöhnliche Raumfahrtmission.",
  "banker": {
   "stingy": "Funkspruch vom Banker! Kapitän Keks betrachtet das Angebot und behauptet, dafür reiche der Treibstoff gerade einmal bis zum Parkplatz. Apollo der Staubsauger brummt zustimmend. Wenn sogar ein Haushaltsgerät eine bessere Finanzstrategie kennt, wird es ernst.",
   "normal": "Der Banker funkt ein Angebot ins Raumschiff. Kapitän Keks prüft es mit einem Taschenrechner, der als Bordcomputer verkleidet ist. Apollo saugt derweil die Bodenkrümel auf. Ich kann nicht sagen, ob die Mission erfolgreich wird, aber sauber wird sie auf jeden Fall.",
   "generous": "Ein großzügiges Angebot! Kapitän Keks ruft sofort: Startfreigabe! Apollo der Staubsauger geht auf höchster Stufe an und verschluckt den Missionsplan. Wir haben nun entweder genug Geld für die Reise oder überhaupt keine Ahnung, wohin es gehen soll."
  },
  "twist": {
   "top": "Der höchste Betrag ist weg! Kapitän Keks erklärt einen Notfall und setzt einen Papphelm auf. Apollo rast quer durchs Studio, als müsste er das verlorene Geld einsaugen. Ich muss dem Kapitän leider mitteilen, dass zehn Millionen nicht einfach unter dem Teppich liegen.",
   "cent": "Ein Cent ist raus! Kapitän Keks jubelt und verkündet: Wir haben den ersten Asteroiden umflogen! Apollo macht ein zufriedenes Geräusch. Vermutlich hat er ein Stück Papier erwischt. Aber auf dieser Mission zählen wir jeden kleinen Erfolg.",
   "lucky": "Drei günstige Kofferöffnungen in Folge! Kapitän Keks ruft volle Fahrt voraus und hisst eine selbstgemalte Weltraumflagge. Der Staubsauger Apollo dreht beeindruckende Kreise um den Moderatorentisch. Ich bin froh, dass die Raumfahrtbehörde davon nichts weiß.",
   "rough": "Nach mehreren teuren Verlusten meldet Kapitän Keks eine ernste Störung im Antrieb. Apollo hat angeblich nur noch halbe Saugkraft. Ich sehe vor allem einen sehr nervösen Mann in einem Papphelm. Vielleicht sollten wir erst die Finanzen retten, dann den Mond.",
   "balanced": "Die Mission geht weiter. Kapitän Keks beobachtet das Kofferfeld wie eine Sternenkarte. Apollo brummt im Hintergrund. Niemand weiß genau, was als Nächstes passiert. Aber so ähnlich muss es sich angefühlt haben, als jemand zum ersten Mal einen Staubsauger eingeschaltet hat."
  },
  "late": {
   "hope": "Die größte Summe ist noch auf dem Spielfeld! Kapitän Keks meldet direkten Kurs auf den Reichtumsplaneten. Apollo hat seine Staubbeutel gewechselt und ist bereit für das Finale. Ich möchte nicht übertreiben, aber selbst die Papprakete sieht gerade entschlossen aus.",
   "lost": "Die große Summe ist verloren. Kapitän Keks gibt das Ziel Mond auf und schlägt stattdessen eine Landung beim nächsten Supermarkt vor. Apollo könnte dort immerhin die Krümel aus dem Einkaufswagen saugen. Es ist keine Weltraumlegende, aber eine vernünftige Notlandung."
  },
  "finale": {
   "early": "Mission beendet, bevor der Kapitän überhaupt den Countdown starten konnte! Ein schneller Deal hat das Pappraumschiff am Boden gehalten. Apollo der Staubsauger hat allerdings trotzdem abgehoben. Wir wünschen der Besatzung einen schönen Rückflug ins Wohnzimmer.",
   "triumph": "Mission erfolgreich! Kapitän Keks schreit vor Freude, und Apollo saugt zur Feier des Tages das gesamte Konfetti auf. Dieses Ergebnis ist mindestens einen kleinen Mond wert. Ich gratuliere der Crew und bitte darum, das Raumschiff nicht durch die Studiotür zu fliegen.",
   "ordinary": "Kapitän Keks erklärt die Mission für abgeschlossen. Der Mond wurde zwar nicht erobert, aber die Pappkirche des Raumschiffs steht noch und Apollo funktioniert weiterhin. Manchmal ist eine sichere Landung mehr wert als ein spektakulärer Absturz."
  }
 },
 {
  "id": "erwin",
  "title": "Onkel Erwins geheimnisvolles Testament",
  "intro": "Meine Damen und Herren, heute habe ich ein Testament von Onkel Erwin dabei. Er war angeblich reich, geizig und so misstrauisch, dass er selbst seinen eigenen Schatten überprüfen ließ. In diesem Testament steht: Wer die richtigen Koffer öffnet, erbt meinen legendären goldenen Gartenschlüssel. Was der öffnet, wissen wir nicht.",
  "banker": {
   "stingy": "Onkel Erwin hätte bei diesem Bankangebot vermutlich laut gelacht. In seinem Testament steht nämlich: Wer bei Geld zu knauserig wird, muss dreimal um seinen Tresor laufen. Ich sehe den Banker gedanklich schon Sportschuhe anziehen. Ein bisschen Bewegung schadet ihm nicht.",
   "normal": "Ein Bankangebot ist eingetroffen. Im Testament steht dazu nur ein seltsamer Satz: Prüfe jedes Geschenk, selbst wenn ein Banker nett lächelt. Ich frage mich langsam, ob Onkel Erwin den Banker persönlich kannte. Die beiden hätten sich vermutlich hervorragend gestritten.",
   "generous": "Der Banker bietet überraschend viel! Onkel Erwin hätte wahrscheinlich sofort seinen goldenen Gartenschlüssel gezückt. Im Testament steht: Bei großzügigen Angeboten darf man ruhig zweimal hinschauen. Vor allem, wenn der andere dabei plötzlich so nervös wird."
  },
  "twist": {
   "top": "Der Höchstbetrag ist weg! Ich lese schnell noch einmal Erwins Testament. Da steht: Wer den großen Schatz verliert, soll nicht weinen, sondern erst einmal die Brille putzen. Eine merkwürdige Weisheit. Allerdings könnte ich gerade selbst eine neue Brille gebrauchen.",
   "cent": "Ein Cent ist raus! Erwin hätte das gefeiert, denn sein Testament enthält tatsächlich eine Regel: Wer einen Cent loswird, soll sofort einen Glückskeks essen. Wir haben keine Glückskekse mehr, weil ich sie vor der Sendung aufgegessen habe. Ich übernehme die Verantwortung.",
   "lucky": "Drei erfreuliche Kofferöffnungen! Ich glaube, Onkel Erwins geheimnisvoller Schlüssel könnte tatsächlich etwas wert sein. Im Testament steht, er sei ein Zeichen großer Weisheit. Oder vielleicht nur der Schlüssel zum Gartenhäuschen. Wir werden es herausfinden.",
   "rough": "Mehrere teure Verluste! Ich habe versucht, Onkel Erwins Testament zu entziffern. Ein Satz lautet: Wer oft danebenliegt, soll den nächsten Koffer mit den Augen und nicht mit den Füßen aussuchen. Ein durchaus sinnvoller Ratschlag, wenn man bedenkt, was hier gerade passiert.",
   "balanced": "Das Testament liegt noch auf meinem Tisch, und ich entdecke einen neuen Satz: Nicht jeder Koffer verbirgt einen Schatz, aber jeder Koffer verbirgt eine Geschichte. Das klingt tiefsinnig. Vermutlich hat Erwin es nach zwei Gläsern Apfelsaft geschrieben."
  },
  "late": {
   "hope": "Der größte Gewinn ist noch möglich! Ich schlage die letzte Seite von Erwins Testament auf. Dort steht: Vertraue niemals der letzten Tür, aber unterschätze sie auch nicht. Ich beginne zu verstehen, warum dieser Mann so viele Schlösser besaß. Er hatte offenbar wirklich Freude an Spannung.",
   "lost": "Der höchste Betrag ist ausgeschieden, aber das Testament ist noch nicht am Ende. Dort steht: Ein verlorener Schatz ist kein verlorener Abend, solange jemand die Geschichte zu Ende erzählt. Na schön, Onkel Erwin. Dann machen wir genau das."
  },
  "finale": {
   "early": "Die Partie ist schon beendet! Im Testament steht nichts über derart schnelle Entscheidungen. Onkel Erwin wäre vermutlich misstrauisch geworden und hätte vorsichtshalber drei Zeugen bestellt. Wir nehmen den Deal einfach so hin und hoffen, dass sein Gartenschlüssel weiterhin in sicheren Händen ist.",
   "triumph": "Was für ein Finale! Ich öffne das kleine Kästchen mit Erwins Gartenschlüssel. Darin liegt ein Zettel: Der wahre Schatz war der Mut, weiterzuspielen. Na gut, Erwin, das ist ein bisschen kitschig. Aber nach diesem Ergebnis verzeihe ich dir sogar die schlechte Pointe.",
   "ordinary": "Die Geschichte endet, und ich lese die letzte Zeile des Testaments: Wer lachen konnte, hat schon etwas gewonnen. Vielleicht hatte Onkel Erwin tatsächlich etwas verstanden. Den goldenen Gartenschlüssel darf er trotzdem behalten. Ich weiß nämlich immer noch nicht, was er öffnet."
  }
 },
 {
  "id": "kater",
  "title": "Der Studio-Kater und die verschwundene Million",
  "intro": "Heute ist unser Studio-Kater Momo heimlich in die Regie geschlichen. Er hat beschlossen, die Koffer seien seine neuen Kratzbäume. Der Aufnahmeleiter behauptet, Momo besitze ein sechstes Gespür für Geld. Ich glaube eher, er besitzt ein sechstes Gespür für Leckerlis und warme Scheinwerfer.",
  "banker": {
   "stingy": "Momo hat den Banker-Anruf gehört und sich demonstrativ auf das Telefon gesetzt. Bei diesem Angebot kann ich es ihm nicht verdenken. Der Banker wollte weiterverhandeln, aber Momo hat nur geschnurrt und aufgelegt. Ein erstaunlich wirkungsvoller Mitarbeiter.",
   "normal": "Der Banker hat angerufen. Momo betrachtet die Geldsumme, gähnt und versucht, mit dem Schwanz den Hörer vom Tisch zu fegen. Offenbar findet er unsere Wirtschaftspolitik genauso anstrengend wie ich. Vielleicht sollte er das nächste Angebot selbst verlesen.",
   "generous": "Das Bankangebot ist groß! Momo springt vor Freude auf die Tastatur und tippt eine Reihe völlig sinnloser Zeichen. Der Banker fragt, ob das unsere Antwort sei. Ich sage, wir müssen erst mit der Katzengewerkschaft Rücksprache halten."
  },
  "twist": {
   "top": "Der höchste Geldbetrag ist verloren! Momo faucht den geöffneten Koffer an, als hätte er persönlich einen Termin beim Tierarzt bekommen. Danach versteckt er sich in der Requisite. Wenn uns jetzt jemand eine Katze mit Finanzabschluss anbietet, bin ich offen für Verhandlungen.",
   "cent": "Ein Cent ist ausgeschieden! Momo klopft stolz mit der Pfote auf den Tisch und bekommt ein Leckerli. Ich frage mich, ob wir ihm damit zu viel Anerkennung geben. Er hat immerhin nur zugesehen. Aber bei diesem Blick kann man schlecht Nein sagen.",
   "lucky": "Drei gute Koffer hintereinander! Momo marschiert erhobenen Schwanzes durchs Studio, als hätte er jeden einzelnen persönlich ausgesucht. Der Aufnahmeleiter spricht schon von einer Glückskatze. Ich frage mich, ob wir künftig Eintritt für sein Schnurren verlangen können.",
   "rough": "Drei teure Verluste! Momo hat offenbar genug von unseren Entscheidungen und liegt mit dem Rücken zum Spielfeld. Der Aufnahmeleiter sagt, er denke strategisch nach. Ich befürchte, der Kater träumt einfach nur von Thunfisch.",
   "balanced": "Momo bleibt mitten im Studio sitzen und beobachtet die Koffer. Manchmal hebt er eine Pfote, dann wieder nicht. Der Aufnahmeleiter hält das für eine geheime Vorhersage. Ich halte es für einen guten Grund, die Versicherungsprämie für unsere Möbel zu erhöhen."
  },
  "late": {
   "hope": "Der größte Betrag lebt noch! Momo sitzt plötzlich kerzengerade und starrt auf die letzten Koffer. Die Regie hält den Atem an. Ich hoffe, er sieht eine goldene Zukunft und nicht einfach nur einen Staubfussel hinter der Kamera.",
   "lost": "Das große Geld ist weg, aber Momo lässt sich nicht stören. Er rollt sich auf dem warmen Scheinwerferkoffer zusammen und schläft ein. Vielleicht sollten wir uns ein Beispiel nehmen. Nicht von der Müdigkeit, sondern von der beneidenswerten Gelassenheit."
  },
  "finale": {
   "early": "Ein schneller Deal, und Momo hat die wichtigste Szene verschlafen. Als ich ihn wecke, schaut er mich an, als hätte ich ihn um drei Uhr nachts zur Steuererklärung gebeten. Der Kater bleibt unbeeindruckt und die Sendung endet überraschend friedlich.",
   "triumph": "Ein großartiges Finale! Momo springt auf die Gewinnerdekoration und beansprucht sie als neuen Schlafplatz. Ich gratuliere dem Kandidaten und dem Kater, der sich selbstverständlich für den eigentlichen Star des Abends hält. Vielleicht ist er das tatsächlich.",
   "ordinary": "Die Partie ist vorbei. Momo streckt sich, gähnt und marschiert ohne ein Wort aus dem Studio. Hinter ihm bleiben ein paar Katzenhaare und die Erkenntnis, dass man auch mit vier Pfoten keine Garantie auf Glück hat. Gute Nacht, Momo!"
  }
 }
];
 function hash(value){
  const text=String(value||'');
  let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return h>>>0;
 }
 function pick(gameId){return stories[hash(gameId)%stories.length]}
 function revealContext(game){
  const opened=Array.isArray(game?.openedAmounts)?game.openedAmounts:[];
  const count=[26,27,28,29].includes(game?.caseCount)?game.caseCount:26;
  const top={26:100000000,27:300000000,28:500000000,29:1000000000}[count];
  const amounts=opened.map(p=>Number(p.amount)).filter(Number.isSafeInteger);
  const last=amounts.slice(-3);
  const topLost=amounts.includes(top),centLost=amounts.includes(1);
  const good=last.length===3&&last.every(a=>a<=10000);
  const bad=last.length===3&&last.every(a=>a>=2000000);
  return {count,top,topLost,centLost,good,bad,opened:amounts.length};
 }
 function chapter(gameId,stage,game){
  const story=pick(gameId);
  if(!story||!game)return null;
  const ctx=revealContext(game),opened=ctx.opened;
  const history=Array.isArray(game.history)?game.history:[];
  const first=history[0];
  const ratio=first?.expectedValue>0?Number(first.offer)/Number(first.expectedValue):.6;
  const bankerTone=ratio<=.45?'stingy':ratio>=.8?'generous':'normal';
  const turn=ctx.topLost?'top':ctx.centLost?'cent':ctx.good?'lucky':ctx.bad?'rough':'balanced';
  const finalists=Array.isArray(game.finalValues)?game.finalValues:[];
  const maxPayout=Math.max(0,...finalists.map(p=>Number(p.payout)||0));
  const finish=opened<=6?'early':maxPayout>=100000000?'triumph':'ordinary';
  const content=stage==='intro'?story.intro:
   stage==='banker'?story.banker[bankerTone]:
   stage==='turn'?story.twist[turn]:
   stage==='climax'?story.late[ctx.topLost?'lost':'hope']:
   stage==='final'?story.finale[finish]:null;
  if(typeof content!=='string'||!content)return null;
  return {storyId:story.id,title:story.title,stage,text:content};
 }
 root.DealModeratorStories=Object.freeze({stories,pick,chapter,revealContext,hash});
})(window);
