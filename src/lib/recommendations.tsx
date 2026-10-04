import {
  Activity,
  CalendarRange,
  CarFront,
  Dumbbell,
  HeartPulse,
  Leaf,
  Plane,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import type { InterestKey, WeatherSummary } from '../types/weather';

export type PersonalizedCard = {
  id: string;
  title: string;
  accent: string;
  content: string[];
};

export const INTEREST_OPTIONS: Array<{
  key: InterestKey;
  label: string;
  summary: string;
  icon: ReactNode;
}> = [
  { key: 'health', label: 'Health', summary: 'Air quality and comfort', icon: <HeartPulse size={18} /> },
  { key: 'fitness', label: 'Fitness', summary: 'Running windows', icon: <Dumbbell size={18} /> },
  { key: 'beach', label: 'Beach', summary: 'Sea conditions', icon: <Waves size={18} /> },
  { key: 'travel', label: 'Travel', summary: 'Packing and routes', icon: <Plane size={18} /> },
  { key: 'family', label: 'Family', summary: 'Day plans', icon: <Users size={18} /> },
  { key: 'agriculture', label: 'Agriculture', summary: 'Rainfall and moisture', icon: <Leaf size={18} /> },
  { key: 'commuting', label: 'Commuting', summary: 'Travel advisories', icon: <CarFront size={18} /> },
  { key: 'events', label: 'Events', summary: 'Outdoor timing', icon: <CalendarRange size={18} /> },
];

export function getInsightCards(weather: WeatherSummary, interests: string[]): PersonalizedCard[] {
  const cards: PersonalizedCard[] = [];

  if (interests.includes('health')) {
    const aqiText = weather.airQuality ? `AQI ${weather.airQuality.aqi} • ${weather.airQuality.label}` : 'AQI data unavailable';
    const pollenNote = weather.airQuality ? `PM2.5 ${weather.airQuality.pm25} μg/m³ • UV ${weather.uvIndex}` : 'Air quality data unavailable';
    cards.push({
      id: 'health',
      title: 'Health outlook',
      accent: '#5b8def',
      content: [
        aqiText,
        `${weather.humidity}% humidity • ${pollenNote}`,
        weather.currentTemp > 31 ? 'Heat load is elevated; hydrate and reduce outdoor intensity during midday.' : 'Comfort looks steady for sensitive groups today.',
      ],
    });
  }

  if (interests.includes('fitness')) {
    const bestWindow = weather.hourly.find((hour) => {
      const uvIndex = hour.uvIndex ?? 6;
      return hour.temperature >= 18 && hour.temperature <= 28 && hour.precipitationProbability < 40 && uvIndex < 7;
    }) ?? null;
    cards.push({
      id: 'fitness',
      title: 'Fitness suggestion',
      accent: '#2eb37f',
      content: bestWindow
        ? [
            `Best running window: ${new Date(bestWindow.time).toLocaleTimeString([], { hour: 'numeric' })}`,
            `Wind ${bestWindow.windSpeed} km/h • ${bestWindow.precipitationProbability}% rain risk • UV ${bestWindow.uvIndex ?? 'n/a'}`,
          ]
        : ['No strong running slot is visible in the next few hours.', 'A lighter or indoor session looks safer.'],
    });
  }

  if (interests.includes('beach')) {
    const marineInfo = weather.marine;
    cards.push({
      id: 'beach',
      title: 'Beach check',
      accent: '#4c9eff',
      content: marineInfo?.waveHeight || marineInfo?.seaTemperature
        ? [
            `Wave height ${marineInfo.waveHeight ?? 'n/a'} m • sea ${marineInfo.seaTemperature ?? 'n/a'}°C`,
            marineInfo.tideTime ? `Tide window: ${new Date(marineInfo.tideTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Tide timings are unavailable for this location.',
          ]
        : ['Marine data is unavailable for this coastline today.', 'Suggested check: revisit before planning a beach or surf trip.'],
    });
  }

  if (interests.includes('travel')) {
    const rainDay = weather.daily[0]?.precipitationProbability ?? 0;
    cards.push({
      id: 'travel',
      title: 'Travel note',
      accent: '#ff9b5e',
      content: [
        `Top day: ${weather.daily[0]?.tempMax ?? weather.currentTemp}°C / ${weather.daily[0]?.tempMin ?? weather.currentTemp}°C`,
        rainDay > 50 ? 'Pack a rain layer and keep a flexible departure plan.' : 'Conditions look travel-friendly with mild weather.',
      ],
    });
  }

  if (interests.includes('family')) {
    const familyAlert = weather.hourly.find((hour) => hour.precipitationProbability > 50 && hour.temperature > 20) ?? null;
    cards.push({
      id: 'family',
      title: 'Family plan',
      accent: '#ff7b7b',
      content: familyAlert
        ? ['Rain risk rises around the afternoon window.', 'Suggested plan: move outdoor time earlier or keep a backup indoor option ready.']
        : ['The next few hours look manageable for family activity outdoors.', 'A flexible day plan remains a good option.'],
    });
  }

  if (interests.includes('agriculture')) {
    const moisture = weather.hourly[0]?.soilMoisture;
    const frostRisk = weather.daily.some((day) => day.tempMin < 2);
    cards.push({
      id: 'agriculture',
      title: 'Agriculture watch',
      accent: '#40b37f',
      content: [
        `Topsoil moisture ${moisture !== undefined ? `${(moisture * 100).toFixed(0)}%` : 'data unavailable'} • rain ${weather.daily[0]?.precipitationProbability ?? 0}%`,
        frostRisk ? 'Frost risk is elevated overnight; protect sensitive crops.' : 'Moisture and temperature look stable for field activity.',
      ],
    });
  }

  if (interests.includes('commuting')) {
    const commuteConcern = weather.hourly.find((item) => item.precipitationProbability > 45 || item.windSpeed > 25 || (item.visibility ?? 0) < 5000) ?? null;
    cards.push({
      id: 'commuting',
      title: 'Commute advice',
      accent: '#7c6cf5',
      content: commuteConcern
        ? [`Travel risk likely around ${new Date(commuteConcern.time).toLocaleTimeString([], { hour: 'numeric' })}.`, `Visibility ${commuteConcern.visibility ? `${Math.round(commuteConcern.visibility / 1000)} km` : 'data unavailable'} • wind ${commuteConcern.windSpeed} km/h.`]
        : ['Conditions look mostly manageable for your usual commute.', 'A normal route remains the lower-risk option.'],
    });
  }

  if (interests.includes('events')) {
    const eventHour = weather.hourly.find((hour) => hour.precipitationProbability > 40 || hour.windSpeed > 20 || (hour.uvIndex ?? 0) > 6) ?? null;
    cards.push({
      id: 'events',
      title: 'Event timing',
      accent: '#ef5da8',
      content: eventHour
        ? ['Outdoor conditions look variable later today.', `Suggested window: ${new Date(eventHour.time).toLocaleTimeString([], { hour: 'numeric' })} or earlier.`, `Comfort index is softer with ${eventHour.precipitationProbability}% rain risk.`]
        : ['There is no strong disruption in the next few hours.', 'Outdoor timing looks reasonable for the current window.'],
    });
  }

  return cards.slice(0, 4);
}
