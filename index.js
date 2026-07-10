import "dotenv/config";
import { CITIES } from "./cities.js";
import { fetchWeather } from "./weather.js";
import { buildFlavor } from "./dialect.js";

const { DISCORD_TOKEN, CHANNEL_ID } = process.env;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error("Manca DISCORD_TOKEN o CHANNEL_ID nell'ambiente. Vedi .env.example.");
  process.exit(1);
}

const CITIES_PER_EMBED = 25; // con 20 capoluoghi entra tutto in un unico messaggio
const DISCORD_API = "https://discord.com/api/v10";
const AUTH_HEADER = { Authorization: `Bot ${DISCORD_TOKEN}` };

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

async function getBotUserId() {
  const res = await fetch(`${DISCORD_API}/users/@me`, { headers: AUTH_HEADER });
  if (!res.ok) throw new Error(`Discord API ${res.status} su /users/@me`);
  const me = await res.json();
  return me.id;
}

async function fetchChannelMessages() {
  const res = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages?limit=100`, {
    headers: AUTH_HEADER,
  });
  if (!res.ok) throw new Error(`Discord API ${res.status} su GET messages`);
  return res.json();
}

async function deleteMessage(id) {
  const res = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages/${id}`, {
    method: "DELETE",
    headers: AUTH_HEADER,
  });
  if (!res.ok && res.status !== 404) {
    console.error(`Errore cancellazione messaggio ${id}: ${res.status}`);
  }
}

// Ripulisce il canale dai vecchi post del bot prima di mandarne uno nuovo,
// così non si accumulano messaggi giorno dopo giorno. Cancellazione singola:
// il bulk-delete richiederebbe il permesso Manage Messages che il bot non ha.
async function cleanChannel() {
  const botId = await getBotUserId();
  const messages = await fetchChannelMessages();
  const ownMessages = messages.filter((m) => m.author?.id === botId);
  if (ownMessages.length === 0) return;

  for (const m of ownMessages) {
    await deleteMessage(m.id);
  }
  console.log(`Ripuliti ${ownMessages.length} messaggi precedenti.`);
}

async function main() {
  await cleanChannel();
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
