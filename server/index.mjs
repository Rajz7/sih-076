import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 3333);
const HOST = process.env.HOST || '0.0.0.0';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const INTERESTS = new Set(['health', 'fitness', 'beach', 'travel', 'family', 'agriculture', 'commuting', 'events']);
const COLORLESS_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: [...INTERESTS] },
          title: { type: 'string' },
          content: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'content'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
};

const requestWindows = new Map();
const MAX_REQUESTS_PER_MINUTE = 20;
const MAX_BODY_BYTES = 24_000;

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function limitForClient(request) {
  const key = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const window = requestWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  window.count += 1;
  return window.count > MAX_REQUESTS_PER_MINUTE;
}

function cleanWeather(weather) {
  if (!weather || typeof weather !== 'object') return null;
  const numeric = (value) => (Number.isFinite(value) ? value : null);
  const airQuality = weather.airQuality;
  return {
    locationName: typeof weather.locationName === 'string' ? weather.locationName.slice(0, 80) : 'Selected location',
    summary: typeof weather.summary === 'string' ? weather.summary.slice(0, 80) : null,
    currentTemp: numeric(weather.currentTemp),
    feelsLike: numeric(weather.feelsLike),
    humidity: numeric(weather.humidity),
    windSpeed: numeric(weather.windSpeed),
    precipitationProbability: numeric(weather.precipitationProbability),
    uvIndex: numeric(weather.uvIndex),
    visibility: numeric(weather.visibility),
    airQuality: airQuality && typeof airQuality === 'object'
      ? {
          aqi: numeric(airQuality.aqi),
          label: typeof airQuality.label === 'string' ? airQuality.label.slice(0, 60) : null,
          pm25: numeric(airQuality.pm25),
          pm10: numeric(airQuality.pm10),
        }
      : null,
    hourly: Array.isArray(weather.hourly)
      ? weather.hourly.slice(0, 12).map((hour) => ({
          time: typeof hour.time === 'string' ? hour.time.slice(0, 32) : null,
          temperature: numeric(hour.temperature),
          precipitationProbability: numeric(hour.precipitationProbability),
          humidity: numeric(hour.humidity),
          windSpeed: numeric(hour.windSpeed),
          uvIndex: numeric(hour.uvIndex),
          visibility: numeric(hour.visibility),
        }))
      : [],
    daily: Array.isArray(weather.daily)
      ? weather.daily.slice(0, 5).map((day) => ({
          date: typeof day.date === 'string' ? day.date.slice(0, 16) : null,
          tempMax: numeric(day.tempMax),
          tempMin: numeric(day.tempMin),
          precipitationProbability: numeric(day.precipitationProbability),
        }))
      : [],
    marine: weather.marine && typeof weather.marine === 'object'
      ? {
          waveHeight: numeric(weather.marine.waveHeight),
          seaTemperature: numeric(weather.marine.seaTemperature),
          tideHeight: numeric(weather.marine.tideHeight),
        }
      : null,
  };
}

function getOutputText(result) {
  return (result.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method === 'GET' && url.pathname === '/health') return sendJson(response, 200, { ok: true });
  if (request.method !== 'POST' || url.pathname !== '/api/insights') return sendJson(response, 404, { error: 'Not found.' });
  if (limitForClient(request)) return sendJson(response, 429, { error: 'Too many requests. Try again shortly.' });
  if (!OPENAI_API_KEY) return sendJson(response, 503, { error: 'OpenAI is not configured on the server.' });

  try {
    const body = await readJson(request);
    const interests = Array.isArray(body.interests)
      ? [...new Set(body.interests.filter((interest) => INTERESTS.has(interest)))].slice(0, 8)
      : [];
    const weather = cleanWeather(body.weather);
    if (interests.length === 0 || !weather) {
      return sendJson(response, 400, { error: 'Choose at least one interest and provide a weather summary.' });
    }

    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        max_output_tokens: 550,
        instructions: [
          'Create concise, practical weather suggestions for a mobile homepage.',
          'Return one card for each selected interest, up to four cards total. Use only the selected interest IDs as card IDs.',
          'Base every claim only on the supplied weather values. Never invent missing readings; say when data is unavailable.',
          'Do not claim pollen data is available from AQI or PM2.5. Do not provide medical diagnoses or guarantee safety.',
          'Use a short title and 1-2 concise content lines per card. Avoid alarmist language.',
        ].join(' '),
        input: JSON.stringify({ interests, weather }),
        text: {
          format: {
            type: 'json_schema',
            name: 'weather_personalization',
            strict: true,
            schema: COLORLESS_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      console.error('OpenAI request failed with status', upstream.status);
      return sendJson(response, 502, { error: 'AI suggestions are temporarily unavailable.' });
    }

    const result = await upstream.json();
    const outputText = getOutputText(result);
    if (!outputText) return sendJson(response, 502, { error: 'AI did not return suggestion text.' });

    const parsed = JSON.parse(outputText);
    const selected = new Set(interests);
    const cards = (Array.isArray(parsed.cards) ? parsed.cards : [])
      .filter((card) => selected.has(card.id) && typeof card.title === 'string' && Array.isArray(card.content))
      .slice(0, 4)
      .map((card) => ({
        id: card.id,
        title: card.title.slice(0, 60),
        content: card.content.filter((line) => typeof line === 'string').slice(0, 2).map((line) => line.slice(0, 180)),
      }))
      .filter((card) => card.content.length > 0);

    return sendJson(response, 200, { cards });
  } catch (error) {
    const status = error instanceof SyntaxError ? 502 : 400;
    if (status === 502) console.error('Could not parse AI suggestion response.');
    return sendJson(response, status, { error: status === 502 ? 'AI suggestions are temporarily unavailable.' : 'Invalid request.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mausam AI server listening on http://${HOST}:${PORT}`);
  if (!OPENAI_API_KEY) console.warn('OPENAI_API_KEY is not set; /api/insights will return 503.');
});