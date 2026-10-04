import { router } from 'expo-router';
import { Check, ChevronRight, SlidersHorizontal, ThermometerSun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { INTEREST_OPTIONS } from '../src/lib/recommendations';
import { getInterests, getTemperatureUnit, saveInterests, saveTemperatureUnit } from '../src/lib/storage';
import type { InterestKey } from '../src/types/weather';

export default function SettingsScreen() {
  const [interests, setInterests] = useState<InterestKey[]>([]);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [deviceLocation, setDeviceLocation] = useState(true);

  useEffect(() => {
    const load = async () => {
      const storedInterests = await getInterests();
      const storedUnit = await getTemperatureUnit();
      setInterests(storedInterests);
      setUnit(storedUnit);
    };

    load();
  }, []);

  const toggleInterest = (interest: InterestKey) => {
    if (interests.includes(interest) && interests.length === 1) return;

    const next = interests.includes(interest) ? interests.filter((item) => item !== interest) : [...interests, interest];
    setInterests(next);
  };

  const handleSave = async () => {
    await saveInterests(interests);
    router.back();
  };

  const handleUnitChange = async (nextUnit: 'C' | 'F') => {
    setUnit(nextUnit);
    await saveTemperatureUnit(nextUnit);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.sectionCard}>
        <View style={styles.rowLabel}>
          <ThermometerSun size={18} />
          <Text style={styles.sectionTitle}>Temperature unit</Text>
        </View>

        <View style={styles.unitRow}>
          <Pressable
            onPress={() => handleUnitChange('C')}
            style={[styles.unitOption, unit === 'C' && styles.unitOptionActive]}
          >
            <Text style={[styles.unitText, unit === 'C' && styles.unitTextActive]}>°C</Text>
          </Pressable>
          <Pressable
            onPress={() => handleUnitChange('F')}
            style={[styles.unitOption, unit === 'F' && styles.unitOptionActive]}
          >
            <Text style={[styles.unitText, unit === 'F' && styles.unitTextActive]}>°F</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.rowLabel}>
          <SlidersHorizontal size={18} />
          <Text style={styles.sectionTitle}>Location preference</Text>
        </View>
        <View style={styles.inlineRow}>
          <Text style={styles.inlineText}>Use device location</Text>
          <Switch value={deviceLocation} onValueChange={setDeviceLocation} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.grid}>
          {INTEREST_OPTIONS.map((interest) => {
            const active = interests.includes(interest.key);
            return (
              <Pressable
                key={interest.key}
                onPress={() => toggleInterest(interest.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{interest.label}</Text>
                {active ? <Check size={14} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={handleSave} style={styles.footerButton}>
        <Text style={styles.footerButtonText}>Save changes</Text>
        <ChevronRight size={16} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe5eb',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  unitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitOption: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  unitOptionActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  unitText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  unitTextActive: {
    color: '#ffffff',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineText: {
    color: '#111827',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  footerButton: {
    marginTop: 14,
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
});
