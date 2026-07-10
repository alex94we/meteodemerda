import "dotenv/config";
import { CITIES } from "./cities.js";
import { fetchWeather } from "./weather.js";
import { buildFlavor } from "./dialect.js";

const { DISCORD_TOKEN, CHANNEL_ID } = process.env;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error("Manca DISCORD_TOKEN o CHANNEL_ID nell'ambiente. Vedi .env.example.");
  process.exit(1);
}

const CITIES_PER_EMBED = 16; // ~8 field da 2 città, resta larghi sotto il limite 6000 char/embed
const DISCORD_API = "https://discord.com/api/v10";

const WEATHER_CONCURRENCY = 10; // limita richieste simultanee a Open-Meteo per evitare fetch failed sporadici

async function fetchCityLine(city) {
  try {
    const w = await fetchWeather(city);
    const flavor = buildFlavor(city.dialectKey, w.mood);
    return `**${city.name}** (${city.region}) — ${w.temp}°C, ${w.text}, vento ${w.wind} km/h\n${flavor}`;
  } catch (err) {
    console.error(`Errore meteo per ${city.name}:`, err.message);
    return `**${city.name}** (${city.region}) — dati meteo non disponibili, pure Dio se n'è fregato de darceli.`;
  }
}

async function buildLines() {
  const batches = chunk(CITIES, WEATHER_CONCURRENCY);
  const lines = [];
  for (const batch of batches) {
    lines.push(...(await Promise.all(batch.map(fetchCityLine))));
  }
  return lines;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildEmbed(lines, part, total, today) {
  const fields = chunk(lines, 2).map((pair) => ({ name: "​", value: pair.join("\n\n") }));
  return {
    title: total > 1 ? `METEO DE MERDA — ${today} (${part}/${total})` : `METEO DE MERDA — ${today}`,
    color: 0x8b0000,
    description: part === 1 ? "Il meteo di tutta Italia, come ve lo meritate." : undefined,
    fields,
    footer: { text: "MeteoDeMerda • dati Open-Meteo" },
  };
}

async function sendMessage(embed) {
  const res = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status}: ${body}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const lines = await buildLines();
  const batches = chunk(lines, CITIES_PER_EMBED);
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  for (let i = 0; i < batches.length; i++) {
    const embed = buildEmbed(batches[i], i + 1, batches.length, today);
    await sendMessage(embed);
    console.log(`Inviato blocco ${i + 1}/${batches.length}`);
    if (i < batches.length - 1) await sleep(1200);
  }
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
