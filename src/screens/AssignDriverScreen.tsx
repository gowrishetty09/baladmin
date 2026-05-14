import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import ApiService from '../services/api';
import { Colors } from '../constants/colors';
import { Driver, RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { useThemeContext } from '../hooks/ThemeContext';

type AssignNav = NativeStackNavigationProp<RootStackParamList, 'AssignDriver'>;
type AssignProps = NativeStackScreenProps<RootStackParamList, 'AssignDriver'>;

type VehicleItem = {
  id: string;
  registrationNumber: string;
  categoryName?: string;
  status?: string;
  assignedDriver?: { id: string; name: string; phone?: string } | null;
};

function normalizeVehicle(v: any): VehicleItem {
  const ad = v?.assignedDriver ?? v?.driver ?? null;
  return {
    id: String(v?.id ?? ''),
    registrationNumber: String(v?.registrationNumber ?? v?.regNumber ?? ''),
    categoryName: v?.category?.name ?? v?.categoryName ?? undefined,
    status: v?.status ?? undefined,
    assignedDriver: ad
      ? {
          id: String(ad.id ?? ''),
          name: String(ad.name ?? ad.fullName ?? 'Unknown'),
          phone: ad.phone ?? undefined,
        }
      : null,
  };
}

export const AssignDriverScreen: React.FC<AssignProps> = ({ route }) => {
  const navigation = useNavigation<AssignNav>();
  const { isDark } = useThemeContext();
  const bookingId = route?.params?.bookingId ?? '';
  const isReassign = route?.params?.isReassign ?? false;
  const vehicleCategoryId = route?.params?.vehicleCategoryId;

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Driver picker state
  const [pickerVehicle, setPickerVehicle] = useState<VehicleItem | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerDrivers, setPickerDrivers] = useState<Driver[]>([]);
  const [pickerSelectedId, setPickerSelectedId] = useState<string | null>(null);
  const [pickerSaving, setPickerSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isReassign ? 'Reassign Driver' : 'Assign Driver',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!bookingId) return;
            navigation.replace('ChangeCar', {
              bookingId,
              currentVehicleCategoryId: vehicleCategoryId,
            });
          }}
          style={{ paddingHorizontal: 8 }}
          accessibilityLabel="Change Car"
        >
          <Ionicons name="swap-horizontal" size={20} color={Colors.gold} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isReassign, bookingId, vehicleCategoryId]);

  const fetchVehicles = useCallback(async () => {
    if (!bookingId) {
      setLoadError('Missing booking details. Please open the ride and try again.');
      setLoading(false);
      return;
    }
    try {
      const data = await ApiService.getVehicles({
        categoryId: vehicleCategoryId,
        limit: 200,
      });
      setVehicles((data ?? []).map(normalizeVehicle));
      setLoadError(null);
    } catch (e) {
      console.error('Error loading vehicles:', e);
      setLoadError('Unable to load vehicles. Please try again.');
    }
  }, [bookingId, vehicleCategoryId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchVehicles();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchVehicles]);

  const handleAssignVehicle = async (vehicle: VehicleItem) => {
    if (!vehicle.assignedDriver) {
      Alert.alert(
        'No driver',
        'This vehicle has no driver assigned. Tap "Assign Driver" first.',
      );
      return;
    }
    try {
      setAssigning(vehicle.id);
      await ApiService.assignDriver(bookingId, vehicle.assignedDriver.id, vehicle.id);
      const actionText = isReassign ? 'reassigned' : 'assigned';
      Alert.alert(
        'Success',
        `${vehicle.assignedDriver.name} ${actionText} to vehicle ${vehicle.registrationNumber}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      const actionText = isReassign ? 'reassign' : 'assign';
      Alert.alert('Failed', `Could not ${actionText} driver.`);
    } finally {
      setAssigning(null);
    }
  };

  const openDriverPicker = useCallback(
    async (vehicle: VehicleItem) => {
      setPickerVehicle(vehicle);
      setPickerSelectedId(vehicle.assignedDriver?.id ?? null);
      setPickerDrivers([]);
      setPickerLoading(true);
      try {
        // Drivers are not bound to a specific vehicle category — list all
        // available (active, not currently busy) drivers and let the operator
        // pick. The selected driver will then be assigned to this vehicle.
        const drivers = await ApiService.getAvailableDrivers();
        setPickerDrivers(drivers ?? []);
      } catch (e) {
        console.error('Error loading drivers for picker:', e);
        Alert.alert('Failed', 'Could not load drivers.');
      } finally {
        setPickerLoading(false);
      }
    },
    [],
  );

  const closeDriverPicker = () => {
    setPickerVehicle(null);
    setPickerSelectedId(null);
    setPickerDrivers([]);
    setPickerSaving(false);
  };

  const handlePickerSave = async () => {
    if (!pickerVehicle || !pickerSelectedId) return;
    try {
      setPickerSaving(true);
      await ApiService.assignVehicleToDriver(pickerSelectedId, pickerVehicle.id);
      closeDriverPicker();
      setRefreshing(true);
      await fetchVehicles();
      setRefreshing(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? 'Failed to assign driver to vehicle.';
      Alert.alert('Failed', String(msg));
    } finally {
      setPickerSaving(false);
    }
  };

  const itemBg = isDark ? '#2A2A2A' : 'rgba(255,255,255,0.95)';
  const textColor = isDark ? Colors.ivory : Colors.navy;
  const subtleColor = isDark ? Colors.ivory + '80' : Colors.navy + '80';

  const headerSubtitle = useMemo(() => {
    if (vehicleCategoryId) return 'Choose a vehicle for this booking';
    return 'Choose a vehicle';
  }, [vehicleCategoryId]);

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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchVehicles();
          setRefreshing(false);
        }}
        ListHeaderComponent={
          <Text style={[styles.subtle, { color: subtleColor, marginBottom: 8 }]}>
            {headerSubtitle}
          </Text>
        }
        renderItem={({ item }) => {
          const driverName = item.assignedDriver?.name;
          const driverPhone = item.assignedDriver?.phone;
          return (
            <View style={[styles.card, { backgroundColor: itemBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: textColor }]}>
                  {item.registrationNumber || 'Unknown plate'}
                </Text>
                {item.categoryName ? (
                  <Text style={[styles.subtle, { color: subtleColor }]}>
                    {item.categoryName}
                    {item.status ? ` · ${item.status}` : ''}
                  </Text>
                ) : null}
                <View style={styles.driverRow}>
                  <Ionicons
                    name={driverName ? 'person' : 'person-outline'}
                    size={14}
                    color={subtleColor}
                  />
                  <Text style={[styles.subtle, { color: subtleColor, marginLeft: 6 }]}>
                    {driverName
                      ? `${driverName}${driverPhone ? ` · ${driverPhone}` : ''}`
                      : 'No driver assigned'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeDriverLink}
                  onPress={() => openDriverPicker(item)}
                >
                  <Ionicons
                    name={driverName ? 'create-outline' : 'add-circle-outline'}
                    size={14}
                    color={Colors.gold}
                  />
                  <Text style={styles.changeDriverText}>
                    {driverName ? 'Change driver' : 'Assign driver'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  !driverName && { opacity: 0.5 },
                ]}
                onPress={() => handleAssignVehicle(item)}
                disabled={assigning === item.id || !driverName}
              >
                {assigning === item.id ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                    <Text style={styles.assignText}>Select</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={[styles.subtle, { color: subtleColor }]}>
              No vehicles available.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <Modal
        visible={pickerVehicle !== null}
        animationType="slide"
        transparent
        onRequestClose={closeDriverPicker}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#1f1f1f' : Colors.white },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Select driver for {pickerVehicle?.registrationNumber}
              </Text>
              <TouchableOpacity onPress={closeDriverPicker}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtle, { color: subtleColor, marginBottom: 8 }]}>
              If the chosen driver is currently assigned to another vehicle, that
              vehicle will become unassigned. The vehicle's previous driver will
              also be unassigned.
            </Text>
            {pickerLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator color={Colors.gold} />
              </View>
            ) : (
              <FlatList
                data={pickerDrivers}
                keyExtractor={(d) => d.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => {
                  const selected = pickerSelectedId === item.id;
                  return (
                    <Pressable
                      onPress={() => setPickerSelectedId(item.id)}
                      style={[
                        styles.pickerRow,
                        selected && { borderColor: Colors.gold, borderWidth: 2 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: textColor }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.subtle, { color: subtleColor }]}>
                          {item.phone}
                          {item.vehicleNumber ? ` · on ${item.vehicleNumber}` : ''}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? Colors.gold : subtleColor}
                      />
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.subtle, { color: subtleColor, textAlign: 'center', paddingVertical: 12 }]}>
                    No available drivers.
                  </Text>
                }
              />
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: '#888' }]}
                onPress={closeDriverPicker}
                disabled={pickerSaving}
              >
                <Text style={styles.backButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  (!pickerSelectedId || pickerSaving) && { opacity: 0.5 },
                ]}
                onPress={handlePickerSave}
                disabled={!pickerSelectedId || pickerSaving}
              >
                {pickerSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.backButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  subtle: { color: Colors.navy + '80' },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  changeDriverLink: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  changeDriverText: { color: Colors.gold, fontWeight: '600', marginLeft: 4, fontSize: 13 },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  assignButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignText: { color: Colors.white, fontWeight: '700', marginLeft: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
