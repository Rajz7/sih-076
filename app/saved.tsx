import { router } from 'expo-router';
import { Search, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSavedLocations, saveSavedLocations } from '../src/lib/storage';
import { searchLocations, type LocationSearchResult } from '../src/lib/weather';

export default function SavedLocationsScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [saved, setSaved] = useState<LocationSearchResult[]>([]);

  useEffect(() => {
    const loadSaved = async () => {
      const items = await getSavedLocations();
      setSaved(items);
    };

    loadSaved();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const next = await searchLocations(query.trim());
    setResults(next);
  };

  const handleSave = async (item: LocationSearchResult) => {
    const merged = [item, ...saved.filter((entry) => entry.id !== item.id)].slice(0, 6);
    setSaved(merged);
    await saveSavedLocations(merged);
    router.back();
  };

  const handleRemove = async (id: string) => {
    const next = saved.filter((entry) => entry.id !== id);
    setSaved(next);
    await saveSavedLocations(next);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Saved locations</Text>
      <View style={styles.searchBox}>
        <Search size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search Indian cities"
          style={styles.input}
          placeholderTextColor="#8a97a8"
        />
      </View>

      <Pressable onPress={handleSearch} style={styles.searchButton}>
        <Text style={styles.searchButtonText}>Find cities</Text>
      </Pressable>

      {results.length > 0 ? (
        <View style={styles.resultGroup}>
          <Text style={styles.groupLabel}>Results</Text>
          {results.map((item) => (
            <Pressable key={item.id} onPress={() => handleSave(item)} style={styles.resultItem}>
              <View>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>{item.admin1 ?? item.country}</Text>
              </View>
              <Star size={16} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.savedGroup}>
        <Text style={styles.groupLabel}>Saved</Text>
        {saved.length === 0 ? <Text style={styles.emptyState}>No saved places yet.</Text> : null}
        {saved.map((item) => (
          <View key={item.id} style={styles.savedItem}>
            <View>
              <Text style={styles.savedName}>{item.name}</Text>
              <Text style={styles.savedMeta}>{item.admin1 ?? item.country}</Text>
            </View>
            <Pressable onPress={() => handleRemove(item.id)}>
              <Trash2 size={16} />
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
  },
  searchButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultGroup: {
    marginTop: 22,
    gap: 10,
  },
  savedGroup: {
    marginTop: 22,
    gap: 10,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#526074',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  resultMeta: {
    fontSize: 12,
    color: '#526074',
    marginTop: 4,
  },
  savedItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfe5eb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  savedMeta: {
    fontSize: 12,
    color: '#526074',
    marginTop: 4,
  },
  emptyState: {
    color: '#526074',
    fontSize: 14,
  },
});
