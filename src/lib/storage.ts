import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InterestKey, SavedLocation, TemperatureUnit } from '../types/weather';

const INTERESTS_KEY = 'mausam:interests';
const SAVED_LOCATIONS_KEY = 'mausam:saved';
const TEMP_UNIT_KEY = 'mausam:temp-unit';

export const DEFAULT_INTERESTS: InterestKey[] = ['health', 'fitness', 'commuting'];

export async function getInterests(): Promise<InterestKey[]> {
  const value = await AsyncStorage.getItem(INTERESTS_KEY);
  if (!value) return DEFAULT_INTERESTS;

  try {
    const parsed = JSON.parse(value) as InterestKey[];
    return parsed.length > 0 ? parsed : DEFAULT_INTERESTS;
  } catch {
    return DEFAULT_INTERESTS;
  }
}

export async function saveInterests(interests: InterestKey[]) {
  await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
}

export async function getSavedLocations(): Promise<SavedLocation[]> {
  const value = await AsyncStorage.getItem(SAVED_LOCATIONS_KEY);
  if (!value) return [];

  try {
    return JSON.parse(value) as SavedLocation[];
  } catch {
    return [];
  }
}

export async function saveSavedLocations(locations: SavedLocation[]) {
  await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(locations));
}

export async function getTemperatureUnit(): Promise<TemperatureUnit> {
  const value = await AsyncStorage.getItem(TEMP_UNIT_KEY);
  return value === 'F' ? 'F' : 'C';
}

export async function saveTemperatureUnit(unit: TemperatureUnit) {
  await AsyncStorage.setItem(TEMP_UNIT_KEY, unit);
}
