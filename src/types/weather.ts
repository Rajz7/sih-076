export type InterestKey =
  | 'health'
  | 'fitness'
  | 'beach'
  | 'travel'
  | 'family'
  | 'agriculture'
  | 'commuting'
  | 'events';

export type TemperatureUnit = 'C' | 'F';

export interface WeatherHour {
  time: string;
  temperature: number;
  feelsLike: number;
  precipitationProbability: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  uvIndex?: number;
  soilMoisture?: number;
  visibility?: number;
  precipitation?: number;
  windGust?: number;
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndex?: number;
  precipitation?: number;
}

export interface MarineSummary {
  waveHeight?: number;
  seaTemperature?: number;
  tideTime?: string;
  tideHeight?: number;
}

export interface AirQualitySummary {
  aqi: number;
  label: string;
  pm25: number;
  pm10: number;
  ozone?: number;
}

export interface WeatherSummary {
  locationName: string;
  summary: string;
  currentTemp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  weatherCode: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  visibility?: number;
  hourly: WeatherHour[];
  daily: WeatherDay[];
  airQuality?: AirQualitySummary;
  marine?: MarineSummary;
}

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}
