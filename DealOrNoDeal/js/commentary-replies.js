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
