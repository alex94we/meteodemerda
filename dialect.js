// Generatore a template in italiano: intercalari + oggetti meteo + chiuse,
// combinati a caso danno frasi sempre diverse. Pensato come satira/goliardia
// per un canale Discord privato: modifica liberamente gli array per alzare o
// abbassare i toni.

const ESCLAMAZIONI = ["Porco Giuda", "Ostia", "Mannaggia", "Sacramento", "Perdio", "Madonna santa"];

const WEATHER_OBJECTS = [
  "pioggia", "nuvola", "vento", "grandine", "nebbia", "temporale", "umidità", "afa",
];

const INSULTI = [
  "coso rimbambito", "capoccione senza cervello", "sfaticato certificato",
  "citrullo di prima categoria", "gastemma vivente", "disgraziato patentato",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// mood: "bello" | "così così" | "brutto" | "pessimo"
export function buildFlavor(_dialectKey, mood) {
  const escl = pick(ESCLAMAZIONI);
  const oggetto = pick(WEATHER_OBJECTS);
  const insulto = pick(INSULTI);

  const templates = {
    "bello": [
      `${escl}! Per una volta 'sta ${oggetto} di Dio ci lascia in pace, godetevela finché dura.`,
      `${escl}, giornata degna di una cartolina: manco il tempo ce l'ha con noi oggi.`,
    ],
    "così così": [
      `${escl}, tempo indeciso come un ${insulto}: mezzo bello e mezzo una fregatura.`,
      `${escl}! Manco il cielo sa che cavolo vuole fare oggi.`,
    ],
    "brutto": [
      `${escl}, ${oggetto} di Dio che rovina la giornata a tutti quanti, altro che pazienza.`,
      `${escl}! Ma chi gliel'ha data 'sta ${oggetto} di Dio proprio oggi, ${insulto} che non è altro.`,
    ],
    "pessimo": [
      `${escl}, ${oggetto} boia di Dio che si sta abbattendo, uscite di casa solo se siete ${insulto}.`,
      `${escl}!!! ${oggetto.charAt(0).toUpperCase() + oggetto.slice(1)} bastarda di Dio, giornata da ${insulto} certificato.`,
    ],
  };

  return pick(templates[mood] ?? templates["così così"]);
}
