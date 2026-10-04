import type { AirQualitySummary, SavedLocation, TemperatureUnit, WeatherDay, WeatherHour, WeatherSummary } from '../types/weather';

export type LocationSearchResult = SavedLocation;

const LEGACY_LABELS: Record<number, string> = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

const aqiLabel = (aqi: number) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
};

const cToF = (value: number) => (value * 9) / 5 + 32;

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    let details = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.reason === 'string') details = body.reason;
      else if (typeof body.message === 'string') details = body.message;
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new Error(details);
  }

  const json = await response.json();
  return json as T;
};

const closestTimeIndex = (times: string[] | undefined, target: string | undefined) => {
  if (!times?.length || !target) return 0;
  const targetMs = new Date(target).getTime();
  if (!Number.isFinite(targetMs)) return 0;
  let closestIndex = 0;
  let closestDifference = Number.POSITIVE_INFINITY;
  times.forEach((time, index) => {
    const difference = Math.abs(new Date(time).getTime() - targetMs);
    if (difference < closestDifference) {
      closestDifference = difference;
      closestIndex = index;
    }
  });
  return closestIndex;
};

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  if (!query.trim()) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const body = await fetchJson<{ results?: Array<any> }>(url);

  return (body.results ?? []).map((item) => ({
    id: `${item.latitude}-${item.longitude}-${item.name}`,
    name: item.name,
    country: item.country ?? 'India',
    admin1: item.admin1 ?? item.state ?? '',
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
  }));
}

export async function fetchWeatherSummary({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}): Promise<WeatherSummary> {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(latitude));
  forecastUrl.searchParams.set('longitude', String(longitude));
  forecastUrl.searchParams.set('timezone', 'auto');
  forecastUrl.searchParams.set(
    'current',
    ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'weather_code'].join(','),
  );
  forecastUrl.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'weather_code',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'uv_index',
      'soil_moisture_0_to_1cm',
      'visibility',
      'precipitation',
      'wind_gusts_10m',
    ].join(','),
  );
  forecastUrl.searchParams.set(
    'daily',
    ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'sunrise', 'sunset', 'uv_index_max', 'precipitation_sum'].join(','),
  );

  const forecast = await fetchJson<any>(forecastUrl.toString());
  const current = forecast.current ?? {};
  const currentHourlyIndex = closestTimeIndex(forecast.hourly?.time, current.time);
  const hourly = forecast.hourly ?? {
    time: [],
    temperature_2m: [],
    apparent_temperature: [],
    precipitation_probability: [],
    weather_code: [],
    relative_humidity_2m: [],
    wind_speed_10m: [],
    uv_index: [],
    soil_moisture_0_to_1cm: [],
    visibility: [],
    precipitation: [],
    wind_gusts_10m: [],
  };

  const hourlyData: WeatherHour[] = (hourly.time ?? []).slice(0, 12).map((time: string, index: number) => ({
    time,
    temperature: Number(hourly.temperature_2m[index] ?? current.temperature_2m ?? 0),
    feelsLike: Number(hourly.apparent_temperature[index] ?? current.apparent_temperature ?? 0),
    precipitationProbability: Number(hourly.precipitation_probability[index] ?? 0),
    weatherCode: Number(hourly.weather_code[index] ?? current.weather_code ?? 0),
    humidity: Number(hourly.relative_humidity_2m[index] ?? current.relative_humidity_2m ?? 0),
    windSpeed: Number(hourly.wind_speed_10m[index] ?? current.wind_speed_10m ?? 0),
    windDirection: Number(hourly.wind_direction_10m[index] ?? current.wind_direction_10m ?? 0),
    uvIndex: Number(hourly.uv_index[index] ?? 0),
    soilMoisture: Number(hourly.soil_moisture_0_to_1cm[index] ?? 0),
    visibility: Number(hourly.visibility[index] ?? 0),
    precipitation: Number(hourly.precipitation[index] ?? 0),
    windGust: Number(hourly.wind_gusts_10m[index] ?? 0),
  }));

  const daily = forecast.daily ?? {
    time: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    precipitation_probability_max: [],
    weather_code: [],
    sunrise: [],
    sunset: [],
    uv_index_max: [],
    precipitation_sum: [],
  };

  const dailyData: WeatherDay[] = (daily.time ?? []).slice(0, 5).map((date: string, index: number) => ({
    date,
    tempMax: Number(daily.temperature_2m_max[index] ?? 0),
    tempMin: Number(daily.temperature_2m_min[index] ?? 0),
    precipitationProbability: Number(daily.precipitation_probability_max[index] ?? 0),
    weatherCode: Number(daily.weather_code[index] ?? 0),
    sunrise: daily.sunrise[index] ?? '',
    sunset: daily.sunset[index] ?? '',
    uvIndex: Number(daily.uv_index_max[index] ?? 0),
    precipitation: Number(daily.precipitation_sum?.[index] ?? 0),
  }));

  const weatherCode = Number(current.weather_code ?? hourlyData[0]?.weatherCode ?? 0);
  const summary = LEGACY_LABELS[weatherCode] ?? 'Weather update';

  const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
  marineUrl.searchParams.set('latitude', String(latitude));
  marineUrl.searchParams.set('longitude', String(longitude));
  marineUrl.searchParams.set('timezone', 'auto');
  marineUrl.searchParams.set('hourly', ['wave_height', 'sea_surface_temperature', 'sea_level_height_msl'].join(','));

  let marine;
  try {
    const marineData = await fetchJson<any>(marineUrl.toString());
    const hours = marineData.hourly ?? { wave_height: [], sea_surface_temperature: [], sea_level_height_msl: [], time: [] };
    const waveHeight = Number((hours.wave_height ?? [0])[0] ?? 0);
    const seaTemperature = Number((hours.sea_surface_temperature ?? [0])[0] ?? 0);
    const tideHeight = Number((hours.sea_level_height_msl ?? [0])[0] ?? 0);
    marine = {
      waveHeight: Number.isFinite(waveHeight) ? waveHeight : undefined,
      seaTemperature: Number.isFinite(seaTemperature) ? seaTemperature : undefined,
      tideHeight: Number.isFinite(tideHeight) ? tideHeight : undefined,
      tideTime: Array.isArray(hours.time) && hours.time[0] ? String(hours.time[0]) : undefined,
    };
  } catch {
    marine = undefined;
  }

  const airQualityUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  airQualityUrl.searchParams.set('latitude', String(latitude));
  airQualityUrl.searchParams.set('longitude', String(longitude));
  airQualityUrl.searchParams.set('timezone', 'auto');
  airQualityUrl.searchParams.set('hourly', ['us_aqi', 'pm10', 'pm2_5', 'ozone'].join(','));

  let airQuality: AirQualitySummary | undefined;
  try {
    const airData = await fetchJson<any>(airQualityUrl.toString());
    const hours = airData.hourly ?? { time: [], us_aqi: [], pm10: [], pm2_5: [], ozone: [] };
    const index = closestTimeIndex(hours.time, current.time);
    const aqiValue = hours.us_aqi?.[index];
    const aqiIndex = Number(aqiValue);
    const pm25 = Number(hours.pm2_5?.[index]);
    const pm10 = Number(hours.pm10?.[index]);
    const ozone = Number(hours.ozone?.[index]);

    if (Number.isFinite(aqiIndex) && Number.isFinite(pm25) && Number.isFinite(pm10)) {
      airQuality = {
        aqi: Math.round(aqiIndex),
        label: aqiLabel(aqiIndex),
        pm25: Math.round(pm25),
        pm10: Math.round(pm10),
        ozone: Number.isFinite(ozone) ? Math.round(ozone) : undefined,
      };
    }
  } catch {
    airQuality = undefined;
  }

  return {
    locationName: name,
    summary,
    currentTemp: Number(current.temperature_2m ?? hourlyData[0]?.temperature ?? 0),
    feelsLike: Number(current.apparent_temperature ?? hourlyData[0]?.feelsLike ?? 0),
    humidity: Number(current.relative_humidity_2m ?? hourlyData[0]?.humidity ?? 0),
    windSpeed: Number(current.wind_speed_10m ?? hourlyData[0]?.windSpeed ?? 0),
    windDirection: Number(current.wind_direction_10m ?? hourlyData[0]?.windDirection ?? 0),
    weatherCode,
    precipitationProbability: Number(hourly.precipitation_probability?.[currentHourlyIndex] ?? 0),
    sunrise: daily.sunrise?.[0] ?? '',
    sunset: daily.sunset?.[0] ?? '',
    uvIndex: Number(hourly.uv_index?.[currentHourlyIndex] ?? 0),
    visibility: Number(hourly.visibility?.[currentHourlyIndex] ?? 0),
    hourly: hourlyData,
    daily: dailyData,
    airQuality,
    marine,
  };
}

export const toTemperature = (value: number, unit: TemperatureUnit) => {
  if (unit === 'F') return Math.round(cToF(value));
  return Math.round(value);
};

