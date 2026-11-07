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
