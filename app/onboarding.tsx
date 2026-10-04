import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';
import { INTEREST_OPTIONS } from '../src/lib/recommendations';
import { saveInterests } from '../src/lib/storage';
import type { InterestKey } from '../src/types/weather';

export default function OnboardingScreen() {
  const [selected, setSelected] = useState<InterestKey[]>(['health', 'fitness', 'commuting']);

  const selectedCount = useMemo(() => selected.length, [selected]);

  const toggleInterest = (interest: InterestKey) => {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const handleContinue = async () => {
    await saveInterests(selected);
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Sparkles size={18} />
        <Text style={styles.kicker}>Mausam</Text>
      </View>

      <Text style={styles.title}>Personalize your weather</Text>
      <Text style={styles.subtitle}>
        Pick the moments that matter most so your homepage adapts to how you live.
      </Text>

      <View style={styles.grid}>
        {INTEREST_OPTIONS.map((interest) => {
          const active = selected.includes(interest.key);
          return (
            <Pressable
              key={interest.key}
              onPress={() => toggleInterest(interest.key)}
              style={[styles.optionCard, active && styles.optionCardActive]}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                {interest.icon}
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {interest.label}
                </Text>
                <Text style={styles.optionMeta}>{interest.summary}</Text>
              </View>
              {active ? <Check size={18} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>Continue · {selectedCount} selected</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: '#f4f6f8',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  kicker: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#111827',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#526074',
    lineHeight: 22,
    marginBottom: 26,
  },
  grid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  optionCardActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#edf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  textWrap: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: '#ffffff',
  },
  optionMeta: {
    color: '#526074',
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
