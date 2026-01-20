import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';
import useAuth from '../hooks/useAuth';
import { getAdminSocket, isAdminSocketConnected } from '../services/adminSocket';
import type { Socket } from 'socket.io-client';

type DriverLocation = {
  driverId: string;
  bookingId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  status?: 'online' | 'offline';
  lastSeenAt?: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://bestaerolimo.online/api';

const shouldLogSocket =
  (__DEV__ && (process.env.EXPO_PUBLIC_DEBUG_WS === '1' || process.env.EXPO_PUBLIC_DEBUG_WS === 'true'));

const getSocketBaseUrl = (): string => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  return base.replace(/\/api\/?$/, '');
};

export const MonitoringScreen: React.FC = () => {
  const { isDark } = useThemeContext();
  const { token } = useAuth();

  const [isConnected, setIsConnected] = useState(isAdminSocketConnected());
  const [drivers, setDrivers] = useState<Record<string, DriverLocation>>({});
  const [connectedUrl, setConnectedUrl] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const coordsRef = useRef<Map<string, AnimatedRegion>>(new Map());
  const msgCountRef = useRef(0);
  const mapRef = useRef<MapView | null>(null);

  const driverList = useMemo(() => Object.values(drivers), [drivers]);

  const initialRegion = useMemo(
    () => ({
      latitude: driverList[0]?.latitude ?? 3.139,
      longitude: driverList[0]?.longitude ?? 101.6869,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    }),
    [driverList]
  );

  const toMs = (value: any): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
      const ms = Date.parse(value);
      return Number.isFinite(ms) ? ms : 0;
    }
    return 0;
  };

  const extractLocation = (raw: any): DriverLocation | null => {
    if (!raw) return null;

    const driverId = raw.driverId ?? raw.driver_id ?? raw.id ?? raw.driver?.id ?? raw.driver?.driverId;
    const latitude = raw.latitude ?? raw.lat ?? raw.location?.latitude ?? raw.location?.lat;
    const longitude = raw.longitude ?? raw.lng ?? raw.lon ?? raw.location?.longitude ?? raw.location?.lng;
    if (driverId === undefined || latitude === undefined || longitude === undefined) return null;

    return {
      driverId: String(driverId),
      bookingId: raw.bookingId ? String(raw.bookingId) : raw.booking?.id ? String(raw.booking.id) : undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: raw.heading !== undefined ? Number(raw.heading) : undefined,
      speed: raw.speed !== undefined ? Number(raw.speed) : undefined,
      timestamp: String(raw.timestamp ?? raw.updatedAt ?? raw.sentAt ?? new Date().toISOString()),
    };
  };

  const calculateBearing = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number => {
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const deg = (θ * 180) / Math.PI;
    return (deg + 360) % 360;
  };

  const upsertDriver = (next: DriverLocation) => {
    setDrivers((prev) => {
      const current = prev[next.driverId];
      const currentMs = current?.timestamp ? toMs(current.timestamp) : 0;
      const nextMs = next.timestamp ? toMs(next.timestamp) : 0;
      if (currentMs && nextMs && currentMs > nextMs) {
        return prev;
      }

      const computedHeading =
        next.heading !== undefined
          ? next.heading
          : current
            ? calculateBearing(
                { latitude: current.latitude, longitude: current.longitude },
                { latitude: next.latitude, longitude: next.longitude }
              )
            : undefined;

      return { ...prev, [next.driverId]: { ...current, ...next, heading: computedHeading } };
    });

    const existing = coordsRef.current.get(next.driverId);
    if (existing) {
      existing
        .timing({
          // react-native-maps typing expects a toValue config
          toValue: { latitude: next.latitude, longitude: next.longitude },
          duration: 900,
          useNativeDriver: false,
        } as any)
        .start();
    } else {
      coordsRef.current.set(
        next.driverId,
        new AnimatedRegion({
          latitude: next.latitude,
          longitude: next.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        })
      );
    }
  };

  const connect = () => {
    const baseUrl = getSocketBaseUrl();
    msgCountRef.current = 0;

    const socket = getAdminSocket(token);
    if (!socket) {
      setIsConnected(false);
      setConnectedUrl(null);
      return;
    }

    socketRef.current = socket;
    setIsConnected(socket.connected);
    if (socket.connected) {
      setConnectedUrl(baseUrl);
    }

    const handleConnect = () => {
      setIsConnected(true);
      setConnectedUrl(baseUrl);
      if (shouldLogSocket) {
        console.log('[Socket] Connected');
      }
    };

    const handleDisconnect = (reason: string) => {
      if (shouldLogSocket) {
        console.log('[Socket] Disconnected', reason);
      }
      setIsConnected(false);
    };

    const handleConnectError = (err: unknown) => {
      if (shouldLogSocket) {
        console.log('[Socket] Connect error', (err as any)?.message ?? err);
      }
      setIsConnected(false);
    };

    const handleAdminFleet = (payload: any) => {
      msgCountRef.current += 1;
      if (shouldLogSocket && msgCountRef.current <= 25) {
        console.log('[Socket] ← admin:fleet', payload?.type ?? '(no-type)');
      }

      if (payload?.type === 'driver:location') {
        const loc = extractLocation(payload?.data);
        if (loc) upsertDriver(loc);
        return;
      }

      if (payload?.type === 'driver:presence') {
        const data = payload?.data;
        const driverId = data?.driverId ? String(data.driverId) : null;
        const status = data?.status === 'offline' ? 'offline' : data?.status === 'online' ? 'online' : null;
        if (!driverId || !status) return;

        setDrivers((prev) => {
          const current = prev[driverId];
          if (!current) return prev;
          return {
            ...prev,
            [driverId]: {
              ...current,
              status,
              lastSeenAt: data?.lastSeenAt ? String(data.lastSeenAt) : current.lastSeenAt,
            },
          };
        });
        return;
      }

      if (payload?.type === 'snapshot') {
        const driversList = Array.isArray(payload?.drivers) ? payload.drivers : [];
        driversList.forEach((item: any) => {
          const loc = extractLocation(item);
          if (loc) upsertDriver(loc);
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('admin:fleet', handleAdminFleet);

    // Store handlers for cleanup
    (socketRef as any)._handlers = { handleConnect, handleDisconnect, handleConnectError, handleAdminFleet };
  };

  useEffect(() => {
    connect();
    return () => {
      // Only remove listeners, never disconnect the socket
      const socket = socketRef.current;
      const handlers = (socketRef as any)._handlers;
      if (socket && handlers) {
        socket.off('connect', handlers.handleConnect);
        socket.off('disconnect', handlers.handleDisconnect);
        socket.off('connect_error', handlers.handleConnectError);
        socket.off('admin:fleet', handlers.handleAdminFleet);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleDrivers = useMemo(() => {
    if (!selectedDriverIds.length) return driverList;
    const selected = new Set(selectedDriverIds);
    return driverList.filter((d) => selected.has(d.driverId));
  }, [driverList, selectedDriverIds]);

  const visibleKey = useMemo(() => {
    return visibleDrivers
      .map((d) => `${d.driverId}:${d.latitude.toFixed(5)},${d.longitude.toFixed(5)}`)
      .join('|');
  }, [visibleDrivers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedDriverIds.length) return;

    const coords = visibleDrivers.map((d) => ({ latitude: d.latitude, longitude: d.longitude }));
    if (!coords.length) return;

    if (coords.length === 1) {
      map.animateToRegion(
        {
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600
      );
      return;
    }

    map.fitToCoordinates(coords, {
      animated: true,
      edgePadding: { top: 80, right: 80, bottom: 160, left: 80 },
    });
  }, [selectedDriverIds, visibleKey]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
        <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>
          Monitoring
        </Text>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isConnected ? Colors.success + '20' : Colors.danger + '20' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? Colors.success : Colors.danger },
              ]}
            />
            <Text style={[styles.statusText, { color: isConnected ? Colors.success : Colors.danger }]}
            >
              {isConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={connect}>
            <Ionicons name="refresh" size={18} color={Colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={() => setIsFilterOpen(true)}>
            <Ionicons name="filter" size={18} color={Colors.navy} />
          </TouchableOpacity>
        </View>
      </View>

      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {visibleDrivers.map((d) => {
          const animated = coordsRef.current.get(d.driverId);
          const isOffline = d.status === 'offline';
          return (
            <Marker.Animated
              key={d.driverId}
              coordinate={(animated ?? { latitude: d.latitude, longitude: d.longitude }) as any}
              title={`Driver ${d.driverId}`}
              description={d.bookingId ? `Booking: ${d.bookingId}` : isOffline ? 'Offline' : undefined}
              rotation={d.heading ?? 0}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.marker, isOffline && { backgroundColor: Colors.navy + '80' }]}>
                <Ionicons name="car" size={16} color={Colors.white} />
              </View>
            </Marker.Animated>
          );
        })}
      </MapView>

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Drivers</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: Colors.borderLight }]}
                onPress={() => setSelectedDriverIds([])}
              >
                <Text style={styles.actionPillText}>Show All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: Colors.primary }]}
                onPress={() => setIsFilterOpen(false)}
              >
                <Text style={[styles.actionPillText, { color: Colors.white }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {driverList.map((d) => {
                const selected = selectedDriverIds.includes(d.driverId);
                const isOffline = d.status === 'offline';
                return (
                  <TouchableOpacity
                    key={d.driverId}
                    style={[styles.modalRow, selected && { backgroundColor: Colors.primary + '10' }]}
                    onPress={() => {
                      setSelectedDriverIds((prev) =>
                        prev.includes(d.driverId)
                          ? prev.filter((id) => id !== d.driverId)
                          : [...prev, d.driverId]
                      );
                    }}
                  >
                    <View style={styles.modalRowLeft}>
                      <Text style={styles.modalRowTitle}>
                        Driver {d.driverId}{isOffline ? ' (offline)' : ''}
                      </Text>
                      {d.bookingId ? (
                        <Text style={styles.modalRowSub}>Booking: {d.bookingId}</Text>
                      ) : (
                        <Text style={styles.modalRowSub}>No booking</Text>
                      )}
                    </View>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? Colors.primary : Colors.navy}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>{visibleDrivers.length} Drivers Visible</Text>
        <Text style={styles.bottomSubText} numberOfLines={1}>
          {connectedUrl ? connectedUrl : getSocketBaseUrl()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ivory,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bottomText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSubText: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.navy + '80',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 120,
    alignItems: 'center',
  },
  actionPillText: {
    fontWeight: '700',
    color: Colors.navy,
  },
  modalList: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 6,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  modalRowTitle: {
    fontWeight: '700',
    color: Colors.navy,
  },
  modalRowSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.navy,
    opacity: 0.7,
  },
});
