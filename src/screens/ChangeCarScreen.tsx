import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { GradientBackground } from '../components/GradientBackground';
import { useThemeContext } from '../hooks/ThemeContext';
import ApiService from '../services/api';
import { RootStackParamList } from '../types';

type ChangeCarNav = NativeStackNavigationProp<RootStackParamList, 'ChangeCar'>;
type ChangeCarProps = NativeStackScreenProps<RootStackParamList, 'ChangeCar'>;

type CategoryItem = {
  id: string;
  name: string;
  serviceTier?: string | null;
  seats?: number | null;
  description?: string | null;
};

export const ChangeCarScreen: React.FC<ChangeCarProps> = ({ route }) => {
  const navigation = useNavigation<ChangeCarNav>();
  const { isDark } = useThemeContext();

  const bookingId = route?.params?.bookingId ?? '';
  const initialCategoryId = route?.params?.currentVehicleCategoryId;
  const initialPrice = route?.params?.currentPrice;
  const initialCurrency = route?.params?.currentCurrency ?? 'MYR';

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [priceText, setPriceText] = useState<string>(
    typeof initialPrice === 'number' && Number.isFinite(initialPrice)
      ? String(initialPrice)
      : '',
  );
  const [currency] = useState<string>(initialCurrency);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Change Car' });
  }, [navigation]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const list = await ApiService.getVehicleCategories();
      setCategories(list ?? []);
    } catch (e) {
      console.error('Error loading vehicle categories:', e);
      setLoadError('Unable to load vehicle categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleSubmit = async () => {
    if (!bookingId) {
      Alert.alert('Missing booking', 'Booking id is required.');
      return;
    }
    if (!selectedId) {
      Alert.alert('Select a vehicle', 'Please choose a vehicle category.');
      return;
    }
    const parsedPrice = priceText.trim() === '' ? undefined : Number(priceText);
    if (priceText.trim() !== '' && (!Number.isFinite(parsedPrice) || (parsedPrice as number) < 0)) {
      Alert.alert('Invalid price', 'Price must be a positive number.');
      return;
    }

    try {
      setSubmitting(true);
      await ApiService.updateBookingVehicleCategory(bookingId, {
        vehicleCategoryId: selectedId,
        price: parsedPrice,
        currency,
      });
      Alert.alert(
        'Vehicle updated',
        'The booking has been updated. Driver assignment was cleared and the hotel has been notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      const status = e?.response?.status;
      const message =
        e?.response?.data?.message ??
        (status === 403
          ? 'You are not allowed to change the vehicle for this booking.'
          : status === 400
            ? 'This booking can no longer be updated.'
            : 'Failed to update vehicle category.');
      Alert.alert('Failed', String(message));
    } finally {
      setSubmitting(false);
    }
  };

  const textColor = isDark ? Colors.ivory : Colors.navy;
  const subtleColor = isDark ? Colors.ivory + '80' : Colors.navy + '80';
  const cardBg = isDark ? '#2A2A2A' : 'rgba(255,255,255,0.95)';

  const headerSubtitle = useMemo(
    () =>
      'Picking a different category will unassign the current driver. The hotel and customer will be notified.',
    [],
  );

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={Colors.gold} />
      </GradientBackground>
    );
  }

  if (loadError) {
    return (
      <GradientBackground style={styles.center}>
        <Text style={[styles.errorText, { color: textColor }]}>{loadError}</Text>
        <TouchableOpacity style={styles.backButton} onPress={loadCategories}>
          <Text style={styles.backButtonText}>Retry</Text>
        </TouchableOpacity>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={[styles.subtitle, { color: subtleColor }]}>
              {headerSubtitle}
            </Text>
            <View style={[styles.priceCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: subtleColor }]}>
                Price ({currency})
              </Text>
              <TextInput
                value={priceText}
                onChangeText={setPriceText}
                placeholder="Auto-recalculated if left empty"
                placeholderTextColor={subtleColor}
                keyboardType="decimal-pad"
                style={[
                  styles.priceInput,
                  { color: textColor, borderColor: subtleColor },
                ]}
              />
              <Text style={[styles.helper, { color: subtleColor }]}>
                Leave blank to let the system recalculate the price for the new
                category.
              </Text>
            </View>
            <Text style={[styles.sectionLabel, { color: textColor }]}>
              Choose a vehicle category
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: cardBg,
                  borderColor: selected ? Colors.gold : 'transparent',
                  borderWidth: selected ? 2 : 0,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionName, { color: textColor }]}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  {item.serviceTier ? (
                    <Text style={[styles.tag, { color: Colors.gold }]}>
                      {String(item.serviceTier).replace(/_/g, ' ')}
                    </Text>
                  ) : null}
                  {typeof item.seats === 'number' ? (
                    <Text style={[styles.subtle, { color: subtleColor }]}>
                      {item.seats} seats
                    </Text>
                  ) : null}
                </View>
                {item.description ? (
                  <Text
                    style={[styles.subtle, { color: subtleColor, marginTop: 4 }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? Colors.gold : subtleColor}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.subtle, { color: subtleColor, textAlign: 'center', marginTop: 24 }]}>
            No vehicle categories available.
          </Text>
        }
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!selectedId || submitting) && { opacity: 0.6 },
          ]}
          disabled={!selectedId || submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={18} color={Colors.white} />
              <Text style={styles.primaryButtonText}>Update Vehicle</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, paddingBottom: 120 },
  subtitle: { fontSize: 13, marginBottom: 12 },
  priceCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  helper: { fontSize: 11, marginTop: 6 },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionName: { fontSize: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  tag: { fontSize: 12, fontWeight: '600' },
  subtle: { fontSize: 12 },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: { color: Colors.white, fontWeight: '700' },
  errorText: { textAlign: 'center', fontSize: 14, marginBottom: 12 },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: 10,
  },
  backButtonText: { color: Colors.white, fontWeight: '700' },
});

export default ChangeCarScreen;
