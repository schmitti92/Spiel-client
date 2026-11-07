'use strict';
/* Original, context-specific replies. All six commentators can respond to any other. */
const studioReplyLines=Object.freeze({
  "oneCent": {
    "1": [
      "Ja, ein Cent. Dafür brauchen wir jetzt aber keinen Festumzug.",
      "Das war gut. Bitte nicht gleich eine Erfolgsgeschichte draus machen."
    ],
    "2": [
      "Da stimme ich zu: Der kleinste Betrag ist weg.",
      "Richtig. Das war eine ausgezeichnete Kofferwahl."
    ],
    "3": [
      "Juhu, genau! Der Cent ist weg!",
      "Hihi, da freue ich mich mit dir!"
    ],
    "4": [
      "Ei, des sag ich doch: en Cent is prima!",
      "Jo, do haste recht. Besser geht's kaum."
    ],
    "5": [
      "Dem kann ich zustimmen. Ein optimaler Treffer.",
      "Korrekt. Dieser Verlust ist praktisch bedeutungslos."
    ],
    "7": [
      "Genau. Ein Cent ist der bestmögliche Treffer.",
      "Die Einschätzung stimmt. Der kleinste Wert ist eliminiert."
    ]
  },
  "millionLost": {
    "1": [
      "Ja, eine Million. Das muss man sich erst mal leisten können.",
      "Da hilft jetzt auch kein Schönreden mehr. Die Million ist weg."
    ],
    "2": [
      "Da hast du recht. Dieser Millionenverlust tut weh.",
      "Leider ja. Die Million hätten wir dringend gebraucht."
    ],
    "3": [
      "Oh nein, du hast recht! Die Million ist wirklich weg!",
      "Ich wollte es erst nicht glauben. Eine ganze Million!"
    ],
    "4": [
      "Ei, jo! E Million, des is doch Wahnsinn!",
      "Genau des mein ich: die Million is futsch!"
    ],
    "5": [
      "Ich teile die Einschätzung. Eine Million ist ein erheblicher Verlust.",
      "Das stimmt. Der Verlust der Million verändert unsere Aussichten."
    ],
    "7": [
      "Richtig. Eine Million weniger verändert die Rechnung.",
      "Da widerspreche ich nicht. Der Millionenkoffer war ein schwerer Treffer."
    ]
  },
  "good": {
    "1": [
      "Na, da sind wir uns ja ausnahmsweise mal einig.",
      "Ja gut. Wenigstens einer hat den richtigen Koffer erwischt."
    ],
    "2": [
      "Genau, das war eine gute Entscheidung.",
      "Das sehe ich genauso. Die großen Beträge bleiben."
    ],
    "3": [
      "Ja! Ich freue mich auch riesig!",
      "Hihi, da hast du völlig recht!"
    ],
    "4": [
      "Jo, des seh ich genauso!",
      "Ei, genau! Des war doch gut!"
    ],
    "5": [
      "Ich stimme zu. Das war ein positives Ergebnis.",
      "Richtig. Diese Kofferwahl war vorteilhaft."
    ],
    "7": [
      "Einverstanden. Der Verlust war gering.",
      "Richtig. Das verbessert unsere Position."
    ]
  },
  "neutral": {
    "1": [
      "Kann man so sehen. Ich würde jetzt weitermachen.",
      "Ja gut, darüber müssen wir jetzt nicht diskutieren."
    ],
    "2": [
      "Da bin ich bei dir. Wir sollten abwarten.",
      "Genau. Noch ist nichts entschieden."
    ],
    "3": [
      "Stimmt, mal sehen, was als Nächstes kommt!",
      "Ja, ich bin auch noch unsicher!"
    ],
    "4": [
      "Jo, da kann mer jetzt nix mache.",
      "Ei, warten mer halt ab."
    ],
    "5": [
      "Das ist eine vertretbare Einschätzung.",
      "Einverstanden. Wir bleiben sachlich."
    ],
    "7": [
      "Das ist eine nüchterne Bewertung.",
      "Stimmt. Die Lage bleibt offen."
    ]
  },
  "bad": {
    "1": [
      "Ja, das war teuer. Ich hab's ja kommen sehen.",
      "Da bin ich ausnahmsweise deiner Meinung. Das war nichts."
    ],
    "2": [
      "Leider hast du recht. Das war ein hoher Verlust.",
      "Ja, das hat unsere Chancen geschwächt."
    ],
    "3": [
      "Oh je, du hast recht. Das war schlimm!",
      "Ich hoffe, der nächste Koffer wird besser!"
    ],
    "4": [
      "Ei, do haste leider recht!",
      "Jo, des war wirklich e teurer Spaß."
    ],
    "5": [
      "Dem muss ich zustimmen. Der Verlust ist erheblich.",
      "Richtig. Diese Summe fehlt uns jetzt."
    ],
    "7": [
      "Die Einschätzung stimmt. Das war kostspielig.",
      "Einverstanden. Wir müssen unsere Erwartungen anpassen."
    ]
  },
  "bankerGood": {
    "1": [
      "Ja, diesmal hat der Banker wenigstens nachgedacht.",
      "Das Angebot kann man nicht einfach wegwischen."
    ],
    "2": [
      "Da stimme ich zu. Das Angebot ist interessant.",
      "Richtig, darüber sollte man ernsthaft nachdenken."
    ],
    "3": [
      "Oh, so viel Geld! Da werde ich ganz aufgeregt!",
      "Ja, das klingt wirklich verlockend!"
    ],
    "4": [
      "Ei, bei dem Angebot würd ich nachdenke!",
      "Jo, des is doch schon e schöne Summe."
    ],
    "5": [
      "Das Angebot ist durchaus konkurrenzfähig.",
      "Ich sehe das ähnlich. Der Betrag verdient Beachtung."
    ],
    "7": [
      "Das Angebot ist rechnerisch interessant.",
      "Einverstanden. Jetzt lohnt sich ein Vergleich."
    ]
  },
  "bankerBad": {
    "1": [
      "Ja, der Banker hat wohl den Taschenrechner verlegt.",
      "Für so ein Angebot brauchen wir keine große Konferenz."
    ],
    "2": [
      "Da bin ich bei dir. Das Angebot ist schwach.",
      "Richtig. Ich würde noch nicht zusagen."
    ],
    "3": [
      "Och nö, das ist wirklich wenig!",
      "Ja, da hatte ich auf mehr gehofft!"
    ],
    "4": [
      "Ei, des is doch viel zu wenig!",
      "Jo, do muss der Banker noch was drauflege."
    ],
    "5": [
      "Das Angebot liegt deutlich unter unseren Erwartungen.",
      "Ich stimme zu. Das ist wenig überzeugend."
    ],
    "7": [
      "Das Angebot ist mathematisch unattraktiv.",
      "Richtig. Das Risiko wird kaum angemessen bezahlt."
    ]
  },
  "finalCases": {
    "1": [
      "Ja, jetzt wird's ernst. Also bitte Konzentration.",
      "Die letzten Koffer sind nichts für Experimente."
    ],
    "2": [
      "Da hast du recht. Jetzt zählt jede Wahl.",
      "Ja. Wir müssen besonders vorsichtig sein."
    ],
    "3": [
      "Oh, jetzt bin ich richtig aufgeregt!",
      "Ja! Nur noch ein paar Koffer!"
    ],
    "4": [
      "Ei, jetzt geht's ans Eingemachte!",
      "Jo, die letzten Koffer müsse sitze."
    ],
    "5": [
      "Richtig. Die verbleibenden Entscheidungen sind entscheidend.",
      "Einverstanden. Jetzt ist Sorgfalt besonders wichtig."
    ],
    "7": [
      "Die Endphase verlangt Präzision.",
      "Stimmt. Jeder verbleibende Koffer zählt."
    ]
  }
});

/* Short, infrequent disputes: the second reply closes the exchange. */
const studioDisputeLines=Object.freeze({"1":["Moment mal, so einfach ist das nicht. Wer hat hier eigentlich die Verantwortung?","Ich hör hier viel Optimismus. Im Controlling nennt man das Wunschdenken.","Ja, wunderbar. Und wer erklärt nachher das Ergebnis der Geschäftsführung?"],"2":["Da muss ich widersprechen. Wir sollten lieber die Zahlen anschauen.","Ich finde, das ist etwas zu voreilig bewertet.","Moment, wir haben noch längst nicht alle Möglichkeiten ausgeschöpft."],"3":["Och, ihr seid immer so ernst! Ein bisschen Hoffnung muss doch sein!","Hey, so pessimistisch muss man doch nicht gleich werden!","Hihi, ihr streitet euch ja mehr als die Koffer spannend sind!"],"4":["Ei, jetzt mach doch net so e Theater draus!","Moment emol, des seh ich aber ganz anners!","Jo, und am Ende weiß wieder keiner, wer recht hat!"],"5":["Ich muss dieser Einschätzung ausdrücklich widersprechen.","Das klingt überzeugend, ist aber nicht ausreichend begründet.","Wir sollten die Diskussion nicht mit einer Gewissheit verwechseln."],"7":["Nein. Das ist eine Vermutung, keine belastbare Schlussfolgerung.","Deine Rechnung lässt eine entscheidende Möglichkeit außer Acht.","Wir diskutieren Gefühle. Ich bevorzuge Fakten."]});
const studioDisputeClosers=Object.freeze({"1":["So, und jetzt bitte zurück zur eigentlichen Entscheidung.","Ich würde sagen, wir halten das fest. Unter meiner Leitung."],"2":["Gut, dann warten wir auf den nächsten Koffer.","Wir können uns wenigstens darauf einigen, weiterzumachen."],"3":["Na, jetzt vertragt euch wieder!","Hihi, ich will lieber den nächsten Koffer sehen!"],"4":["Ei, jetzt is aber gut. Weiter geht's!","So, jetzt hört uff zu streite!"],"5":["Damit ist die Diskussion für mich abgeschlossen.","Wir können das nach dem nächsten Ergebnis erneut bewerten."],"7":["Die nächste Öffnung liefert neue Daten.","Die Diskussion ist beendet. Die Zahlen entscheiden."]});

/* Situation-aware disputes: disagreement is about interpretation, never the revealed facts. */
const studioContextDisputes=Object.freeze({"oneCent":{"objections":["Ein Cent ist gut, aber deswegen müssen wir noch keine Siegesrede halten.","Freut euch ruhig, aber die nächste Wahl ist trotzdem wichtig.","Der kleinste Betrag ist weg. Das Spiel ist damit noch lange nicht gewonnen."],"closers":["Stimmt, guter Treffer. Und jetzt konzentrieren wir uns auf den nächsten Koffer.","Freude ist erlaubt. Aber wir bleiben aufmerksam."]},"millionLost":{"objections":["Die Million ist weg. Schuldzuweisungen holen sie allerdings nicht zurück.","Ja, das tut weh. Aber wir sollten die übrigen Koffer nicht abschreiben.","Die Million ist verloren. Jetzt hilft uns nur ein klarer Blick auf den Rest."],"closers":["Das war bitter. Wir machen mit den verbliebenen Beträgen weiter.","Einverstanden: großer Verlust, aber noch ist nicht alles entschieden."]},"good":{"objections":["Ein kleiner Betrag ist gut, aber von einem sicheren Sieg würde ich noch nicht reden.","Nicht zu früh jubeln. Die nächste Öffnung kann ganz anders aussehen.","Ein guter Treffer, ja. Aber die Strategie muss weiter stimmen."],"closers":["Also: guter Koffer, aber noch keine Entwarnung.","Wir freuen uns kurz und spielen konzentriert weiter."]},"neutral":{"objections":["Ganz so bedeutungslos finde ich den Betrag nicht.","Wir sollten den mittleren Verlust nicht einfach abtun.","Neutral klingt bequem. Die nächsten Koffer bleiben entscheidend."],"closers":["Gut, wir müssen das nicht größer machen als es ist.","Wir sehen beim nächsten Koffer, wie sich die Lage entwickelt."]},"bad":{"objections":["Der Verlust ist groß, aber Panik hilft uns jetzt auch nicht.","Jetzt alles schlechtzureden wäre auch keine Strategie.","Ja, das war teuer. Aber der nächste Koffer kann besser werden."],"closers":["Der Rückschlag steht fest. Wir bleiben trotzdem ruhig.","Ein hoher Betrag ist weg. Jetzt schauen wir nach vorn."]},"bankerGood":{"objections":["Ein starkes Angebot, ja. Aber die verbliebenen Werte müssen wir mitbedenken.","Nur weil der Banker großzügig wirkt, ist der Deal nicht automatisch richtig.","Der Betrag klingt gut. Trotzdem sollten wir nicht überstürzt zusagen."],"closers":["Das Angebot verdient eine ruhige Entscheidung.","Wir vergleichen die Summe mit den verbleibenden Chancen."]},"bankerBad":{"objections":["Schwach ist das Angebot schon. Trotzdem entscheidet jeder selbst.","Ein niedriger Betrag ist ärgerlich, aber wir sollten sachlich bleiben.","Vielleicht ist das Angebot schlecht. Die Risiken beim Weiterspielen bleiben."],"closers":["Wir kennen das Angebot. Jetzt zählt die Entscheidung.","Wir müssen nicht streiten, um den Betrag einzuordnen."]},"finalCases":{"objections":["Wenige Koffer bedeuten Spannung, nicht automatisch eine schlechte Lage.","Gerade jetzt bringt uns Hektik überhaupt nichts.","Die Endphase ist wichtig. Aber wir sollten keine voreiligen Schlüsse ziehen."],"closers":["Die letzten Koffer verdienen unsere volle Aufmerksamkeit.","Einverstanden. Jetzt konzentrieren wir uns auf die nächste Wahl."]}});

/* Tone-specific counters respond to what the previous speaker actually asserted. */
const studioToneDisputes=Object.freeze({"oneCent":{"celebration":["Freuen dürfen wir uns. Aber ein Cent allein gewinnt noch kein Spiel.","Der Cent ist weg, ja. Jetzt nicht gleich die Siegerehrung starten."],"certainty":["Der Cent ist ein guter Treffer, aber noch keine Garantie.","Das Ergebnis ist stark. Über den Rest wissen wir noch nicht genug."]},"millionLost":{"blame":["Die Million ist weg. Schuldzuweisungen bringen sie nicht zurück.","Den Fehler können wir diskutieren, aber die Million bleibt verloren."],"alarm":["Der Verlust ist schlimm, aber wir sollten jetzt nicht in Panik geraten.","Ja, die Million ist weg. Die anderen Koffer zählen trotzdem noch."]},"good":{"celebration":["Das war gut, aber bitte nicht schon den Gesamtsieg ausrufen.","Schöner Treffer. Die nächsten Koffer bleiben trotzdem wichtig."],"certainty":["Eine gute Öffnung ist noch keine sichere Strategie.","Das war ein guter Koffer. Die Zukunft ist trotzdem offen."]},"neutral":{"certainty":["So eindeutig ist die Lage nicht. Ein mittlerer Betrag verändert etwas.","Da wäre ich mit einer endgültigen Bewertung vorsichtig."]},"bad":{"blame":["Die Summe ist weg. Schuldzuweisungen verbessern die Chancen nicht.","Jetzt jemanden verantwortlich zu machen, hilft uns nicht weiter."],"alarm":["Ein großer Verlust, ja. Aber Panik wäre die falsche Reaktion.","Es ist ärgerlich, doch das Spiel ist noch nicht entschieden."]},"bankerGood":{"celebration":["Ein gutes Angebot ist noch kein Grund, sofort einzuschlagen.","Die Summe klingt schön. Die verbliebenen Koffer muss man mitbedenken."],"certainty":["Ob der Deal richtig ist, hängt von den verbleibenden Beträgen ab.","Das ist ein starkes Angebot, aber kein automatisches Ja."]},"bankerBad":{"blame":["Der Banker mag knauserig sein. Trotzdem sollten wir das Angebot sachlich prüfen.","Wir müssen den Banker nicht beschimpfen, um die Summe einzuordnen."],"certainty":["Ablehnen kann sinnvoll sein. Aber es bleibt eine Risikoentscheidung.","Ein schwaches Angebot macht das Weiterspielen nicht risikofrei."]},"finalCases":{"alarm":["Die letzten Koffer sind spannend, aber Panik hilft nicht.","Wenige Koffer bedeuten nicht automatisch schlechte Chancen."],"certainty":["Die Endphase ist wichtig, doch niemand kennt den nächsten Koffer.","Wir sollten uns gerade jetzt nicht zu sicher sein."]}});

/* Dry, event-specific sarcasm; no claims about unopened cases. */
const studioSarcasmLines=Object.freeze({"oneCent":{"1":["Die Geschäftsführung meldet: Ein Cent weniger. Die Finanzabteilung wird eine Gedenktafel bestellen.","Das nenne ich effiziente Planung: Na, dafür lohnt sich ja fast eine Pressekonferenz."],"2":["Na wunderbar. Großartig, der Cent ist weg. Jetzt fehlt nur noch der Rest des Spiels.","Ich würde sagen: Ein Cent weg. Das war bestimmt der schwierigste Teil."],"3":["Hihi, na toll! Ein Cent! Hoffentlich verkraftet der Banker diesen Verlust.","Oh, wie schön: Exzellente Nachricht. Unser Haushalt ist um einen Cent erleichtert."],"4":["Ei, prima. Na, dafür lohnt sich ja fast eine Pressekonferenz.","Jo, ganz großartig: Ein Cent weniger. Die Finanzabteilung wird eine Gedenktafel bestellen."],"5":["Hervorragend. Ein Cent weg. Das war bestimmt der schwierigste Teil.","Ich protokolliere: Großartig, der Cent ist weg. Jetzt fehlt nur noch der Rest des Spiels."],"7":["Faszinierend. Exzellente Nachricht. Unser Haushalt ist um einen Cent erleichtert.","Statistisch bemerkenswert: Ein Cent! Hoffentlich verkraftet der Banker diesen Verlust."]},"millionLost":{"1":["Die Geschäftsführung meldet: Eine Million weg. Wenigstens wird die Geldtafel übersichtlicher.","Das nenne ich effiziente Planung: Prima, jetzt müssen wir uns um diese Million keine Sorgen mehr machen."],"2":["Na wunderbar. Fantastisch. Den größten Verlust nennen wir einfach Teamleistung.","Ich würde sagen: Da ist die Million. Ach nein, da war sie."],"3":["Hihi, na toll! Eine Million verloren? Das spart immerhin die Diskussion über den Gewinn.","Oh, wie schön: Eine Million weniger. Die Stimmung steigt bestimmt gleich wieder."],"4":["Ei, prima. Prima, jetzt müssen wir uns um diese Million keine Sorgen mehr machen.","Jo, ganz großartig: Eine Million weg. Wenigstens wird die Geldtafel übersichtlicher."],"5":["Hervorragend. Da ist die Million. Ach nein, da war sie.","Ich protokolliere: Fantastisch. Den größten Verlust nennen wir einfach Teamleistung."],"7":["Faszinierend. Eine Million weniger. Die Stimmung steigt bestimmt gleich wieder.","Statistisch bemerkenswert: Eine Million verloren? Das spart immerhin die Diskussion über den Gewinn."]},"good":{"1":["Die Geschäftsführung meldet: Ein kleiner Betrag. Wie langweilig, wenn mal etwas klappt.","Das nenne ich effiziente Planung: Na sieh mal einer an. Eine Entscheidung ohne Totalschaden."],"2":["Na wunderbar. Oh, ein guter Treffer. Da muss wohl jemand versehentlich richtig gelegen haben.","Ich würde sagen: Das lief gut. Wir sollten sofort einen Expertenbericht bestellen."],"3":["Hihi, na toll! Ein kleiner Verlust? Wir sind offenbar auf dem Weg zur Weltherrschaft.","Oh, wie schön: Kaum etwas verloren. Das wird die Kritiker schwer enttäuschen."],"4":["Ei, prima. Na sieh mal einer an. Eine Entscheidung ohne Totalschaden.","Jo, ganz großartig: Ein kleiner Betrag. Wie langweilig, wenn mal etwas klappt."],"5":["Hervorragend. Das lief gut. Wir sollten sofort einen Expertenbericht bestellen.","Ich protokolliere: Oh, ein guter Treffer. Da muss wohl jemand versehentlich richtig gelegen haben."],"7":["Faszinierend. Kaum etwas verloren. Das wird die Kritiker schwer enttäuschen.","Statistisch bemerkenswert: Ein kleiner Verlust? Wir sind offenbar auf dem Weg zur Weltherrschaft."]},"neutral":{"1":["Die Geschäftsführung meldet: Ein mittlerer Betrag. Genau die Sorte Spannung, für die man Buchhalter braucht.","Das nenne ich effiziente Planung: Na, das war ja eine bahnbrechend durchschnittliche Entscheidung."],"2":["Na wunderbar. Weder toll noch katastrophal. Wie aufregend ausgewogen.","Ich würde sagen: Mittelfeld. Dafür gibt es bestimmt eine Urkunde."],"3":["Hihi, na toll! Ein Ergebnis mit der emotionalen Wucht eines Kassenbons.","Oh, wie schön: So mittelmäßig, dass sogar der Banker gähnen dürfte."],"4":["Ei, prima. Na, das war ja eine bahnbrechend durchschnittliche Entscheidung.","Jo, ganz großartig: Ein mittlerer Betrag. Genau die Sorte Spannung, für die man Buchhalter braucht."],"5":["Hervorragend. Mittelfeld. Dafür gibt es bestimmt eine Urkunde.","Ich protokolliere: Weder toll noch katastrophal. Wie aufregend ausgewogen."],"7":["Faszinierend. So mittelmäßig, dass sogar der Banker gähnen dürfte.","Statistisch bemerkenswert: Ein Ergebnis mit der emotionalen Wucht eines Kassenbons."]},"bad":{"1":["Die Geschäftsführung meldet: Ein großer Betrag weg. Das nennen wir ab sofort eine mutige Investition.","Das nenne ich effiziente Planung: Na, das hat sich ja gelohnt. Für den Banker."],"2":["Na wunderbar. Wunderbar, die teuren Koffer erledigen sich praktisch von allein.","Ich würde sagen: Großartig. Die Spannung ist jetzt wenigstens unbezahlbar."],"3":["Hihi, na toll! Ein hoher Verlust. Aber immerhin konsequent.","Oh, wie schön: Ein großer Betrag weg. Das wird ein kurzer Kassenbericht."],"4":["Ei, prima. Na, das hat sich ja gelohnt. Für den Banker.","Jo, ganz großartig: Ein großer Betrag weg. Das nennen wir ab sofort eine mutige Investition."],"5":["Hervorragend. Großartig. Die Spannung ist jetzt wenigstens unbezahlbar.","Ich protokolliere: Wunderbar, die teuren Koffer erledigen sich praktisch von allein."],"7":["Faszinierend. Ein großer Betrag weg. Das wird ein kurzer Kassenbericht.","Statistisch bemerkenswert: Ein hoher Verlust. Aber immerhin konsequent."]},"bankerGood":{"1":["Die Geschäftsführung meldet: Ein gutes Angebot. Hat der Banker heute seinen großzügigen Tag?","Das nenne ich effiziente Planung: Na, jetzt wird der Banker noch zum Wohltäter."],"2":["Na wunderbar. So viel Geld? Da hat wohl jemand die Freigabe übersehen.","Ich würde sagen: Das Angebot klingt gut. Da ist bestimmt irgendwo ein Haken."],"3":["Hihi, na toll! Ein ordentliches Angebot. Fast verdächtig vernünftig.","Oh, wie schön: Großzügig. Man möchte dem Banker fast danken. Fast."],"4":["Ei, prima. Na, jetzt wird der Banker noch zum Wohltäter.","Jo, ganz großartig: Ein gutes Angebot. Hat der Banker heute seinen großzügigen Tag?"],"5":["Hervorragend. Das Angebot klingt gut. Da ist bestimmt irgendwo ein Haken.","Ich protokolliere: So viel Geld? Da hat wohl jemand die Freigabe übersehen."],"7":["Faszinierend. Großzügig. Man möchte dem Banker fast danken. Fast.","Statistisch bemerkenswert: Ein ordentliches Angebot. Fast verdächtig vernünftig."]},"bankerBad":{"1":["Die Geschäftsführung meldet: Dieses Angebot ist so klein, man braucht eine Lupe dafür.","Das nenne ich effiziente Planung: Großzügigkeit sieht anders aus. Aber immerhin hat er angerufen."],"2":["Na wunderbar. Der Banker hat offenbar die Portokasse geplündert.","Ich würde sagen: Das ist kein Angebot, das ist ein höflich formulierter Scherz."],"3":["Hihi, na toll! Was für eine Summe. Reicht bestimmt für einen neuen Kugelschreiber.","Oh, wie schön: Da hat der Banker aber tief in die leere Tasche gegriffen."],"4":["Ei, prima. Großzügigkeit sieht anders aus. Aber immerhin hat er angerufen.","Jo, ganz großartig: Dieses Angebot ist so klein, man braucht eine Lupe dafür."],"5":["Hervorragend. Das ist kein Angebot, das ist ein höflich formulierter Scherz.","Ich protokolliere: Der Banker hat offenbar die Portokasse geplündert."],"7":["Faszinierend. Da hat der Banker aber tief in die leere Tasche gegriffen.","Statistisch bemerkenswert: Was für eine Summe. Reicht bestimmt für einen neuen Kugelschreiber."]},"finalCases":{"1":["Die Geschäftsführung meldet: Nur noch wenige Koffer. Jetzt wäre ein schlechter Rat besonders effizient.","Das nenne ich effiziente Planung: Die letzten Koffer. Ein bisschen Druck hat ja noch niemandem geschadet."],"2":["Na wunderbar. Die Endphase. Der ideale Zeitpunkt für spontane Fehlentscheidungen.","Ich würde sagen: Jetzt ist jeder Koffer wichtig. Wie beruhigend."],"3":["Hihi, na toll! Kaum noch Koffer. Wenigstens wird das Zählen leichter.","Oh, wie schön: Wenig Auswahl, große Nerven. Klingt nach einem entspannten Finale."],"4":["Ei, prima. Die letzten Koffer. Ein bisschen Druck hat ja noch niemandem geschadet.","Jo, ganz großartig: Nur noch wenige Koffer. Jetzt wäre ein schlechter Rat besonders effizient."],"5":["Hervorragend. Jetzt ist jeder Koffer wichtig. Wie beruhigend.","Ich protokolliere: Die Endphase. Der ideale Zeitpunkt für spontane Fehlentscheidungen."],"7":["Faszinierend. Wenig Auswahl, große Nerven. Klingt nach einem entspannten Finale.","Statistisch bemerkenswert: Kaum noch Koffer. Wenigstens wird das Zählen leichter."]}});

/* Christmas commentators: contextual answers to every existing studio topic. */
const studioHolidayReplies=Object.freeze({"oneCent":{"12":["Ho ho! Genau so fängt eine schöne Bescherung an!","Ein Cent weg? Ich verteile schon mal Zuckerstangen!","Das ist besser als ein Sack voller Goldglöckchen!","Der kleinste Betrag ist fort. Rudolf, bitte applaudieren!"],"13":["Eiskalt richtig! Die Million darf weiter frieren!","Ein Cent? Den puste ich mit meiner Karottennase weg!","Das nenne ich einen Treffer mit Pulverschnee!","Mein Schneebauch macht vor Freude einen Purzelbaum!"]},"millionLost":{"12":["Ho ho ... bitte sagt mir, dass das ein schlechter Scherz ist!","Die Million war doch das größte Päckchen!","Rudolf, wir müssen den Schlitten neu beladen!","Selbst am Nordpol wird diese Nachricht für Stille sorgen."],"13":["Bei einer Million schmelzen sogar meine guten Vorsätze!","Eine Million? Meine Karottennase hat gerade gekündigt!","Das war eine Lawine, kein Schneeball!","Ich brauche eine Kühltruhe für meine Nerven!"]},"good":{"12":["Genau! Die kleinen Geschenke dürfen verschwinden!","Ho ho, das war eine ausgezeichnete Wahl!","So wird aus einer Partie ein Weihnachtsmärchen!","Das gehört auf die Liste der guten Entscheidungen!"],"13":["Cool! Das war ein sauberer Schneeballtreffer!","Da kann man nur frostig gratulieren!","Die großen Zahlen bleiben schön eingefroren!","Das lief glatter als eine frisch vereiste Rodelbahn!"]},"neutral":{"12":["Ho ho, da bleibe ich erst einmal vorsichtig.","Das Päckchen war weder winzig noch riesig.","Auch Wichtel müssen manchmal geduldig sein.","Wir wissen noch nicht, was die restlichen Koffer bringen."],"13":["Mein Schneebauch sagt: erst mal abwarten.","Das ist weder Eiszeit noch Tauwetter.","Bei diesem Ergebnis bleibe ich gelassen.","Ich richte meinen Schal und schaue weiter zu."]},"bad":{"12":["Oh je, das war ein ziemlich teures Geschenk!","Ho ho ... da ist die Freude kurz eingeschneit.","So einen Verlust wünsche ich keinem Wichtel.","Der Sack wird leichter, aber die Hoffnung bleibt."],"13":["Uff! Das war ein Treffer direkt in die Schneekugel!","Ich friere vor Schreck gleich am Boden fest!","Da hilft nicht einmal ein extra dicker Schal!","So viel Geld? Das ist eine ausgewachsene Lawine!"]},"bankerGood":{"12":["Ho ho, dieses Angebot klingt nach einem vollen Geschenkesack!","Das könnte ein schönes Weihnachtsgeschenk werden.","Der Banker hat heute wohl seine großzügige Seite entdeckt.","Bei diesem Angebot klingeln sogar meine Schlittenkufen!"],"13":["Cool, das Angebot glitzert wie frischer Schnee!","Da könnte ich fast meine Karottennase verwetten.","So ein Angebot taut sogar den Banker auf!","Das ist eine ordentliche Portion Winterglück!"]},"bankerBad":{"12":["Ho ho, da war der Banker wohl auf der Sparliste!","Das ist eher eine einzelne Zuckerstange als ein Geschenk.","Für dieses Angebot würde ich den Schlitten nicht wenden.","Der Banker sollte noch einmal in seinen Sack schauen."],"13":["So ein Angebot lässt mich kalt. Und das will etwas heißen!","Der Banker hat wohl sein Geld eingefroren.","Das ist dünner als die Eisdecke im Frühling!","Da friert mir das Lächeln im Gesicht fest."]},"finalCases":{"12":["Ho ho, die letzten Päckchen liegen bereit!","Jetzt entscheidet sich, was unterm Baum bleibt!","Ich halte die Rentiere für das große Finale bereit.","Die Spannung ist höher als mein Schornstein!"],"13":["Die letzten Koffer! Jetzt wird es frostig spannend!","Mein Schneebauch zittert wie eine Schneekugel!","Noch wenige Koffer. Bloß nicht ins Rutschen kommen!","Jetzt entscheidet sich, ob wir jubeln oder schmelzen!"]}});
