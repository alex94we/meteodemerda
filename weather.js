// Open-Meteo: API gratuita, nessuna key richiesta.
const WMO_DESC = {
  0: { text: "sereno", mood: "bello" },
  1: { text: "poco nuvoloso", mood: "bello" },
  2: { text: "parzialmente nuvoloso", mood: "così così" },
  3: { text: "coperto", mood: "brutto" },
  45: { text: "nebbia", mood: "brutto" },
  48: { text: "nebbia con brina", mood: "brutto" },
  51: { text: "pioviggine leggera", mood: "brutto" },
  53: { text: "pioviggine moderata", mood: "brutto" },
  55: { text: "pioviggine intensa", mood: "brutto" },
  56: { text: "pioviggine gelata", mood: "brutto" },
  57: { text: "pioviggine gelata intensa", mood: "brutto" },
  61: { text: "pioggia debole", mood: "brutto" },
  63: { text: "pioggia moderata", mood: "brutto" },
  65: { text: "pioggia forte", mood: "pessimo" },
  66: { text: "pioggia gelata", mood: "pessimo" },
  67: { text: "pioggia gelata forte", mood: "pessimo" },
  71: { text: "nevicata debole", mood: "brutto" },
  73: { text: "nevicata moderata", mood: "pessimo" },
  75: { text: "nevicata forte", mood: "pessimo" },
  77: { text: "granelli di neve", mood: "brutto" },
  80: { text: "rovesci deboli", mood: "brutto" },
  81: { text: "rovesci moderati", mood: "pessimo" },
  82: { text: "rovesci violenti", mood: "pessimo" },
  85: { text: "rovesci di neve deboli", mood: "pessimo" },
  86: { text: "rovesci di neve forti", mood: "pessimo" },
  95: { text: "temporale", mood: "pessimo" },
  96: { text: "temporale con grandine debole", mood: "pessimo" },
  99: { text: "temporale con grandine forte", mood: "pessimo" },
};

export function describeWeatherCode(code) {
  return WMO_DESC[code] ?? { text: "boh, tempo strano", mood: "così così" };
}

async function fetchOnce(city) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe%2FRome`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo ha risposto ${res.status} per ${city.name}`);
  }
  const data = await res.json();
  const current = data.current;
  return {
    temp: Math.round(current.temperature_2m),
    wind: Math.round(current.windspeed_10m),
    ...describeWeatherCode(current.weathercode),
  };
}

export async function fetchWeather(city, retries = 2) {
  try {
    return await fetchOnce(city);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetchWeather(city, retries - 1);
  }
}
