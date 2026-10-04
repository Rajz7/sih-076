import { Link, router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CloudLightning,
  CloudRain,
  Compass,
  HelpCircle,
  Heart,
  Languages,
  LocateFixed,
  Map,
  MapPin,
  Menu,
  Plane,
  Radar,
  RefreshCw,
  Share2,
  Settings2,
  Sparkles,
  Star,
  SunMedium,
  UserCircle2,
  Waves,
  Wind,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getInsightCards, type PersonalizedCard } from '../src/lib/recommendations';
import { DEFAULT_INTERESTS, getInterests, getSavedLocations, getTemperatureUnit, saveSavedLocations, saveTemperatureUnit } from '../src/lib/storage';
import { fetchAiWeatherInsights } from '../src/lib/ai-insights';
import { fetchWeatherSummary } from '../src/lib/weather';
import type { WeatherSummary } from '../src/types/weather';

const DEFAULT_LOCATION = {
  id: 'delhi',
  name: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  country: 'India',
};

export default function HomeScreen() {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [aiCards, setAiCards] = useState<PersonalizedCard[] | null>(null);
  const [usingAi, setUsingAi] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Location access is off');
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let headingSubscription: Location.LocationSubscription | undefined;

    Location.getForegroundPermissionsAsync()
      .then(({ granted }) => {
        if (active && granted) setLocationStatus('Location access is on');
      })
      .catch(() => undefined);

    Location.watchHeadingAsync((nextHeading) => {
      if (active) setHeading(nextHeading.trueHeading >= 0 ? nextHeading.trueHeading : nextHeading.magHeading);
    })
      .then((subscription) => {
        headingSubscription = subscription;
        if (!active) subscription.remove();
      })
      .catch(() => {
        if (active) setHeading(null);
      });

    return () => {
      active = false;
      headingSubscription?.remove();
    };
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const savedLocations = await getSavedLocations();
      const selectedLocation = savedLocations[0] ?? DEFAULT_LOCATION;

      let latitude = selectedLocation.latitude;
      let longitude = selectedLocation.longitude;
      let locationName = selectedLocation.name;

      if (selectedLocation.id === 'current') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          latitude = currentPosition.coords.latitude;
          longitude = currentPosition.coords.longitude;
          locationName = 'Your location';
        }
      }

      const summary = await fetchWeatherSummary({
        latitude,
        longitude,
        name: locationName,
      });
      setWeather(summary);
      return { summary, isLive: true };
    } catch (err) {
      setWeather(null);
      setError(err instanceof Error ? `Live weather failed to load: ${err.message}` : 'Live weather failed to load. Check your connection and retry.');
      return { summary: null, isLive: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    const [storedInterests, storedUnit] = await Promise.all([getInterests(), getTemperatureUnit()]);
    const safeInterests = storedInterests.length > 0 ? storedInterests : DEFAULT_INTERESTS;
    setInterests(safeInterests);
    setUnit(storedUnit);
    setAiCards(null);
    setUsingAi(false);

    const { summary, isLive } = await loadWeather();
    if (!isLive || !summary) return;

    try {
      const generatedCards = await fetchAiWeatherInsights(summary, safeInterests);
      const localCards = getInsightCards(summary, safeInterests);
      const generated = generatedCards.map((card) => ({
        ...card,
        accent: localCards.find((localCard) => localCard.id === card.id)?.accent ?? '#5b8def',
      }));
      if (generated.length > 0) {
        setAiCards(generated);
        setUsingAi(true);
      }
    } catch {
      setAiCards(null);
    }
  }, [loadWeather]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  const weatherCards = useMemo(() => {
    if (!weather) return [] as PersonalizedCard[];
    return aiCards ?? getInsightCards(weather, interests);
  }, [weather, interests, aiCards]);

  const formattedTemp = (value: number) => {
    if (unit === 'F') return `${Math.round((value * 9) / 5 + 32)}°F`;
    return `${Math.round(value)}°C`;
  };

  const handleUnitChange = async (nextUnit: 'C' | 'F') => {
    setUnit(nextUnit);
    await saveTemperatureUnit(nextUnit);
  };

  const handleEnableLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('Location permission was not granted');
        Alert.alert('Location permission', 'Allow location access in device settings to see weather near you.');
        return;
      }

      setLocationStatus('Finding your location…');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const place = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const firstPlace = place[0];
      const placeName = [firstPlace?.district, firstPlace?.city, firstPlace?.region].find(Boolean) ?? 'Your location';
      await saveSavedLocations([
        {
          id: 'current',
          name: placeName,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          country: firstPlace?.country ?? 'India',
          admin1: firstPlace?.region ?? '',
        },
      ]);
      setLocationStatus(`Using ${placeName}`);
      setDrawerVisible(false);
      await refreshDashboard();
    } catch (locationError) {
      setLocationStatus('Could not read your location');
      Alert.alert(
        'Could not get location',
        locationError instanceof Error ? locationError.message : 'Please check that location services are enabled and try again.',
      );
    }
  };

  const handleDrawerItem = (item: string) => {
    if (item === 'Favourites') {
      setDrawerVisible(false);
      router.push('/saved');
      return;
    }
    if (item === 'Settings') {
      setDrawerVisible(false);
      router.push('/settings');
      return;
    }
    Alert.alert(item, `${item} will be available in a future Mausam update.`);
  };

  const directionLabel = (degrees: number | null) => {
    if (degrees === null) return 'Calibrating…';
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
  };

  if (loading && !weather) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading your weather</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => setDrawerVisible(true)} style={styles.iconButton} accessibilityLabel="Open navigation menu">
          <Menu size={20} />
        </Pressable>
        <View style={styles.headerBrand}>
          <Text style={styles.brand}>Mausam</Text>
          <Text style={styles.dateText}>Today</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/saved')} style={styles.iconButton}>
            <MapPin size={18} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.iconButton}>
            <Settings2 size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.locationPrompt}>
        <View style={styles.locationPromptIcon}><LocateFixed size={18} color="#35546b" /></View>
        <View style={styles.locationPromptCopy}>
          <Text style={styles.locationPromptTitle}>Weather for where you are</Text>
          <Text style={styles.locationPromptText}>{locationStatus}</Text>
        </View>
        <Pressable onPress={() => void handleEnableLocation()} style={styles.locationAction}>
          <Text style={styles.locationActionText}>Enable</Text>
        </Pressable>
      </View>

      <Pressable style={styles.heroCard} onPress={() => void refreshDashboard()}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.location}>{weather?.locationName ?? 'New Delhi'}</Text>
            <Text style={styles.conditionText}>{weather?.summary ?? 'Clear skies'}</Text>
          </View>
          <Pressable onPress={() => void refreshDashboard()} style={styles.refreshPill}>
            <RefreshCw size={16} />
          </Pressable>
        </View>

        <View style={styles.tempRow}>
          <Text style={styles.temperature}>{weather ? formattedTemp(weather.currentTemp) : '—'}</Text>
          <View style={styles.tempMeta}>
            <Text style={styles.metaText}>Feels like {weather ? formattedTemp(weather.feelsLike) : '—'}</Text>
            <Text style={styles.metaText}>Humidity {weather?.humidity ?? '—'}%</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Wind size={15} />
            <Text style={styles.metricValue}>{weather?.windSpeed ?? '—'} km/h</Text>
          </View>
          <View style={styles.metricCard}>
            <CloudRain size={15} />
            <Text style={styles.metricValue}>{weather?.precipitationProbability ?? '—'}% rain</Text>
          </View>
          <View style={styles.metricCard}>
            <SunMedium size={15} />
            <Text style={styles.metricValue}>UV {weather?.uvIndex ?? '—'}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.compassCard}>
        <View style={styles.compassCopy}>
          <View style={styles.compassTitleRow}>
            <Compass size={18} color="#35546b" />
            <Text style={styles.compassTitle}>Compass</Text>
          </View>
          <Text style={styles.compassDirection}>{directionLabel(heading)}</Text>
          <Text style={styles.compassMeta}>
            {heading === null ? 'Move your phone to calibrate' : `${Math.round(heading)}° from north`}
          </Text>
          <View style={styles.windDirectionPill}>
            <Wind size={13} color="#526074" />
            <Text style={styles.windDirectionText}>
              Wind {weather?.windDirection !== undefined ? `${directionLabel(weather.windDirection)} · ${Math.round(weather.windDirection)}°` : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.compassDial}>
          <Text style={[styles.compassCardinal, styles.compassNorth]}>N</Text>
          <Text style={[styles.compassCardinal, styles.compassEast]}>E</Text>
          <Text style={[styles.compassCardinal, styles.compassSouth]}>S</Text>
          <Text style={[styles.compassCardinal, styles.compassWest]}>W</Text>
          <View style={[styles.compassNeedle, { transform: [{ rotate: `${heading === null ? 0 : -heading}deg` }] }]}>
            <View style={styles.needleNorth} />
            <View style={styles.needleSouth} />
          </View>
          <View style={styles.compassCenter} />
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertTriangle size={18} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void refreshDashboard()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Personalized for you</Text>
        <Link href="/settings" asChild>
          <Pressable>
            <Text style={styles.linkText}>Edit</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={styles.personalizationNote}>
        {usingAi ? 'AI suggestions · based on your interests and current conditions' : 'Based on your interests and weather conditions'}
      </Text>

      {weatherCards.length > 0 ? (
        <View style={styles.cardStack}>
          {weatherCards.map((card) => (
            <View key={card.id} style={[styles.personalCard, { borderColor: `${card.accent}30` }]}> 
              <View style={styles.cardHeaderRow}>
                <Text style={styles.personalTitle}>{card.title}</Text>
                <Sparkles size={16} />
              </View>
              {card.content.map((line) => (
                <Text key={line} style={styles.personalText}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : !weather && !loading ? (
        <Text style={styles.emptyText}>Live conditions are required to create your weather suggestions.</Text>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Hourly forecast</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyRow}>
        {weather?.hourly.map((hour: { time: string; temperature: number; precipitationProbability: number }) => (
          <View key={hour.time} style={styles.hourCard}>
            <Text style={styles.hourTime}>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</Text>
            <Activity size={18} />
            <Text style={styles.hourTemp}>{formattedTemp(hour.temperature)}</Text>
            <Text style={styles.hourRain}>{hour.precipitationProbability}%</Text>
          </View>
        )) ?? null}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Next days</Text>
      </View>
      <View style={styles.dailyList}>
        {weather?.daily.map((day: { date: string; tempMax: number; tempMin: number; precipitationProbability: number }) => (
          <View key={day.date} style={styles.dailyItem}>
            <Text style={styles.dayLabel}>{new Date(day.date).toLocaleDateString([], { weekday: 'short' })}</Text>
            <Text style={styles.dayTemp}>{formattedTemp(day.tempMax)} / {formattedTemp(day.tempMin)}</Text>
            <Text style={styles.dayRain}>{day.precipitationProbability}%</Text>
          </View>
        )) ?? null}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Sun & rain</Text>
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Sunrise</Text>
          <Text style={styles.detailValue}>{weather ? new Date(weather.sunrise).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Sunset</Text>
          <Text style={styles.detailValue}>{weather ? new Date(weather.sunset).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</Text>
        </View>
      </View>

      <Pressable style={styles.footerButton} onPress={() => router.push('/saved')}>
        <Text style={styles.footerButtonText}>Saved locations</Text>
        <ArrowRight size={16} />
      </Pressable>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerRoot}>
          <Pressable style={styles.drawerScrim} onPress={() => setDrawerVisible(false)} accessibilityLabel="Close menu" />
          <View style={styles.drawerPanel}>
            <View style={styles.drawerTopRow}>
              <View>
                <Text style={styles.drawerBrand}>Mausam</Text>
                <Text style={styles.drawerCaption}>Weather, made personal</Text>
              </View>
              <Pressable onPress={() => setDrawerVisible(false)} style={styles.drawerClose}>
                <Text style={styles.drawerCloseText}>×</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => Alert.alert('Log in', 'Account sign-in is not connected yet.')} style={styles.loginCard}>
              <View style={styles.loginAvatar}><UserCircle2 size={24} color="#35546b" /></View>
              <View style={styles.loginCopy}>
                <Text style={styles.loginTitle}>Log in</Text>
                <Text style={styles.loginSubtitle}>You are not logged in</Text>
              </View>
              <ArrowRight size={17} color="#526074" />
            </Pressable>

            <Pressable onPress={() => void handleEnableLocation()} style={styles.drawerLocation}>
              <MapPin size={18} color="#35546b" />
              <View style={styles.drawerLocationCopy}>
                <Text style={styles.drawerLocationTitle}>{weather?.locationName ?? 'Use your location'}</Text>
                <Text style={styles.drawerLocationStatus}>{locationStatus}</Text>
              </View>
              <Text style={styles.drawerEnable}>Enable</Text>
            </Pressable>
            <Text style={styles.locationRationale}>Allow location access to get local forecasts and alerts. Your location is used only to retrieve nearby weather.</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerScroll}>
              <DrawerItem icon={<Waves size={20} />} label="Agromet products" onPress={() => handleDrawerItem('Agromet products')} />
              <DrawerItem icon={<Plane size={20} />} label="Aviation" onPress={() => handleDrawerItem('Aviation')} />
              <DrawerItem icon={<Activity size={20} />} label="Crowd source" onPress={() => handleDrawerItem('Crowd source')} />
              <DrawerItem icon={<Wind size={20} />} label="Cyclone" onPress={() => handleDrawerItem('Cyclone')} />
              <DrawerItem icon={<CloudLightning size={20} />} label="Lightning" onPress={() => handleDrawerItem('Lightning')} />
              <DrawerItem icon={<Radar size={20} />} label="Radar" onPress={() => handleDrawerItem('Radar')} />
              <DrawerItem icon={<CloudRain size={20} />} label="Rain alert" onPress={() => handleDrawerItem('Rain alert')} />
              <DrawerItem icon={<Map size={20} />} label="Route nowcast" onPress={() => handleDrawerItem('Route nowcast')} />
              <View style={styles.drawerDivider} />
              <DrawerItem icon={<Languages size={20} />} label="English" trailing="›" onPress={() => handleDrawerItem('Language')} />
              <DrawerItem icon={<Heart size={20} />} label="Favourites" onPress={() => handleDrawerItem('Favourites')} />
              <DrawerItem icon={<Bell size={20} />} label="Notifications" onPress={() => handleDrawerItem('Notifications')} />
              <DrawerItem icon={<Share2 size={20} />} label="Share" onPress={() => handleDrawerItem('Share')} />
              <DrawerItem icon={<Star size={20} />} label="Rate app" onPress={() => handleDrawerItem('Rate app')} />
              <DrawerItem icon={<HelpCircle size={20} />} label="FAQ" onPress={() => handleDrawerItem('FAQ')} />
              <DrawerItem icon={<Settings2 size={20} />} label="Settings" onPress={() => handleDrawerItem('Settings')} />
            </ScrollView>
            <Text style={styles.drawerFooter}>Mausam · Weather for everyone</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DrawerItem({
  icon,
  label,
  trailing,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.drawerItem}>
      <View style={styles.drawerItemIcon}>{icon}</View>
      <Text style={styles.drawerItemLabel}>{label}</Text>
      {trailing ? <Text style={styles.drawerTrailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 32,
    backgroundColor: '#f4f6f8',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#111827',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerBrand: {
    flex: 1,
    marginLeft: 12,
  },
  brand: {
    fontWeight: '700',
    fontSize: 18,
    color: '#111827',
  },
  dateText: {
    color: '#526074',
    fontSize: 12,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce5e9',
    backgroundColor: '#edf3f4',
    padding: 12,
    marginBottom: 14,
  },
  locationPromptIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPromptCopy: { flex: 1 },
  locationPromptTitle: { color: '#1c2d36', fontWeight: '700', fontSize: 13 },
  locationPromptText: { color: '#60717a', fontSize: 11, marginTop: 3 },
  locationAction: {
    backgroundColor: '#35546b',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  locationActionText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e7edf4',
    padding: 18,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  location: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 13,
    color: '#526074',
  },
  refreshPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f4f6f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  temperature: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -2,
  },
  tempMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaText: {
    color: '#526074',
    fontSize: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#f6f8fb',
    borderWidth: 1,
    borderColor: '#edf1f6',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  compassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5ebf2',
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
  },
  compassCopy: { flex: 1, paddingRight: 12 },
  compassTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  compassTitle: { color: '#111827', fontWeight: '700', fontSize: 14 },
  compassDirection: { color: '#111827', fontSize: 26, fontWeight: '700', marginTop: 9 },
  compassMeta: { color: '#697586', fontSize: 11, marginTop: 2 },
  windDirectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f4f6f8',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 10,
  },
  windDirectionText: { color: '#526074', fontSize: 10, fontWeight: '600' },
  compassDial: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: '#dce5e9',
    backgroundColor: '#f7f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCardinal: { position: 'absolute', color: '#60717a', fontSize: 10, fontWeight: '700' },
  compassNorth: { top: 8, color: '#a34f44' },
  compassEast: { right: 9 },
  compassSouth: { bottom: 8 },
  compassWest: { left: 9 },
  compassNeedle: { width: 24, height: 74, alignItems: 'center', justifyContent: 'center' },
  needleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 34,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#c45e4b',
  },
  needleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 29,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#49677a',
  },
  compassCenter: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#35546b',
  },
  errorCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#fff7db',
    borderWidth: 1,
    borderColor: '#f4d18e',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#8a5a00',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHead: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  linkText: {
    color: '#4d73ff',
    fontWeight: '600',
    fontSize: 13,
  },
  personalizationNote: {
    color: '#697586',
    fontSize: 12,
    marginTop: -7,
    marginBottom: 12,
  },
  emptyText: {
    color: '#697586',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cardStack: {
    gap: 10,
  },
  personalCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  personalTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  personalText: {
    color: '#526074',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 3,
  },
  hourlyRow: {
    gap: 10,
    paddingRight: 10,
  },
  hourCard: {
    width: 76,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5ebf2',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  hourTime: {
    fontSize: 11,
    color: '#526074',
  },
  hourTemp: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  hourRain: {
    color: '#4560a7',
    fontSize: 11,
  },
  dailyList: {
    gap: 10,
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderColor: '#e5ebf2',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayLabel: {
    color: '#111827',
    fontWeight: '600',
    width: 54,
  },
  dayTemp: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 13,
  },
  dayRain: {
    color: '#526074',
    fontSize: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5ebf2',
    padding: 14,
  },
  detailLabel: {
    color: '#526074',
    fontSize: 12,
    marginBottom: 6,
  },
  detailValue: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  footerButton: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 16,
  },
  footerButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  drawerScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12, 25, 35, 0.48)' },
  drawerPanel: {
    width: '86%',
    maxWidth: 380,
    height: '100%',
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 18,
    elevation: 12,
  },
  drawerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  drawerBrand: { color: '#172b36', fontWeight: '800', fontSize: 21, letterSpacing: -0.4 },
  drawerCaption: { color: '#718089', fontSize: 12, marginTop: 3 },
  drawerClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCloseText: { color: '#35546b', fontSize: 28, lineHeight: 31, fontWeight: '300' },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#f2f5f6',
    padding: 13,
    marginBottom: 12,
  },
  loginAvatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCopy: { flex: 1 },
  loginTitle: { color: '#172b36', fontWeight: '700', fontSize: 15 },
  loginSubtitle: { color: '#718089', fontSize: 12, marginTop: 3 },
  drawerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  drawerLocationCopy: { flex: 1 },
  drawerLocationTitle: { color: '#172b36', fontWeight: '700', fontSize: 13 },
  drawerLocationStatus: { color: '#718089', fontSize: 11, marginTop: 3 },
  drawerEnable: { color: '#35546b', fontSize: 12, fontWeight: '700' },
  locationRationale: {
    color: '#7a878e',
    fontSize: 10,
    lineHeight: 15,
    paddingLeft: 28,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edef',
  },
  drawerScroll: { paddingTop: 9, paddingBottom: 8 },
  drawerItem: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 7,
  },
  drawerItemIcon: { width: 25, alignItems: 'center', justifyContent: 'center' },
  drawerItemLabel: { flex: 1, color: '#263942', fontSize: 14, fontWeight: '500' },
  drawerTrailing: { color: '#6b7c84', fontSize: 23, lineHeight: 25 },
  drawerDivider: { height: 1, backgroundColor: '#e8edef', marginVertical: 9 },
  drawerFooter: { color: '#9aa5aa', fontSize: 10, textAlign: 'center', paddingTop: 8 },
});
