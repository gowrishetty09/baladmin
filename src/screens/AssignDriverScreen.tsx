import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import ApiService from '../services/api';
import { Colors } from '../constants/colors';
import { Driver, RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';

type AssignNav = NativeStackNavigationProp<RootStackParamList, 'AssignDriver'>;
type AssignProps = NativeStackScreenProps<RootStackParamList, 'AssignDriver'>;

export const AssignDriverScreen: React.FC<AssignProps> = ({ route }) => {
  const navigation = useNavigation<AssignNav>();
  const bookingId = route.params.bookingId;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ApiService.getAvailableDrivers();
        setDrivers(data);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const assign = async (driver: Driver) => {
    try {
      setAssigning(driver.id);
      await ApiService.assignDriver(bookingId, driver.id);
      Alert.alert('Driver Assigned', `${driver.name} assigned successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Failed', 'Could not assign driver.');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={Colors.gold} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <FlatList
        data={drivers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.subtle}>{item.phone} · {item.vehicleNumber}</Text>
              <Text style={styles.subtle}>Category: {item.vehicleCategory} · Rating: {item.rating}</Text>
            </View>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => assign(item)}
              disabled={assigning === item.id}
            >
              {assigning === item.id ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add" size={16} color={Colors.white} />
                  <Text style={styles.assignText}>Assign</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}> 
            <Text style={styles.subtle}>No available drivers.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
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
  assignButton: { backgroundColor: Colors.gold, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignText: { color: Colors.white, fontWeight: '700', marginLeft: 6 },
});
