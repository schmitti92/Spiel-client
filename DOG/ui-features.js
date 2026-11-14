/** Optional DOG interface modules (visual placeholders only).
 * Add a new ID/label here to display another block without changing the
 * rule engine, Firebase or the online room protocol.
 */
export const DOG_UI_FEATURES=Object.freeze([
 Object.freeze({id:'magic',icon:'🪄',label:'Magie',title:'Magie',description:'Hier können später magische Karten, Effekte und Fähigkeiten erscheinen. Derzeit ist das Modul nur eine Vorschau – es beeinflusst keine laufende Partie.'}),
 Object.freeze({id:'emojis',icon:'😀',label:'Emojis',title:'Emojis & Reaktionen',description:'Geplant sind Spielerreaktionen und Emojis. Noch werden keine Nachrichten an andere Spieler übertragen.'}),
 Object.freeze({id:'special',icon:'🃏',label:'Spezialkarten',title:'Spezialkarten',description:'Dieser Bereich wird später weitere Kartentypen und Erklärungen aufnehmen. Die bekannten DOG-Spezialkarten spielst du weiterhin direkt aus deiner Hand.'}),
 Object.freeze({id:'events',icon:'🎁',label:'Events',title:'DOG-Events',description:'Für künftige saisonale Events und Bonusaktionen reserviert. Noch sind keine Eventbelohnungen aktiv.'}),
 Object.freeze({id:'items',icon:'🧪',label:'Items',title:'Items & Inventar',description:'Platz für spätere Gegenstände und Inventar-Funktionen. Zurzeit können hier keine Gegenstände eingesetzt werden.'})
]);
export function dogFeatureById(id){
 return DOG_UI_FEATURES.find(feature=>feature.id===id)||null;
}
