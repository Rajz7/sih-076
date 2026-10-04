import type { PersonalizedCard } from './recommendations';
import type { WeatherSummary } from '../types/weather';

type GeneratedCard = Pick<PersonalizedCard, 'id' | 'title' | 'content'>;

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export async function fetchAiWeatherInsights(
  weather: WeatherSummary,
  interests: string[],
): Promise<GeneratedCard[]> {
  if (!apiBaseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend server URL to enable AI insights.');
  }

  const response = await fetch(`${apiBaseUrl}/api/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weather, interests }),
  });

  if (!response.ok) {
    throw new Error(`AI insights request failed (${response.status}).`);
  }

  const result = (await response.json()) as { cards?: GeneratedCard[] };
  if (!Array.isArray(result.cards)) {
    throw new Error('The AI server returned an invalid response.');
  }

  return result.cards.filter(
    (card) =>
      typeof card.id === 'string' &&
      typeof card.title === 'string' &&
      Array.isArray(card.content) &&
      card.content.every((line) => typeof line === 'string'),
  );
}