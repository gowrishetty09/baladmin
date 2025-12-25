import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';

type DriverLocation = {
  driverId: string;
  bookingId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
};

type WSMessage<T = unknown> = {
  event: string;
  data: T;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://bestaerolimo.online/api';

const shouldLogWs =
  (__DEV__ && (process.env.EXPO_PUBLIC_DEBUG_WS === '1' || process.env.EXPO_PUBLIC_DEBUG_WS === 'true'));

const getWsUrlCandidates = (): string[] => {
  // In production, this backend is typically reverse-proxied under `/api`, so WS becomes `/api/ws`.
  // Some deployments may expose WS directly at `/ws`.
  const base = API_BASE_URL.replace(/\/+$/, '');
  const origin = base.replace(/\/api\/?$/, '');

  const apiWs = base.replace(/^http/, 'ws') + '/ws';
  const rootWs = origin.replace(/^http/, 'ws') + '/ws';

  // De-dupe, keep order (prefer api/ws first)
  return Array.from(new Set([apiWs, rootWs]));
};

export const MonitoringScreen: React.FC = () => {
  const { isDark } = useThemeContext();

  const [isConnected, setIsConnected] = useState(false);
  const [drivers, setDrivers] = useState<Record<string, DriverLocation>>({});
  const [connectedUrl, setConnectedUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const coordsRef = useRef<Map<string, AnimatedRegion>>(new Map());
  const msgCountRef = useRef(0);

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

  const send = (event: string, data: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({ event, data });
    if (shouldLogWs) {
      console.log(`[WS] → ${event}`, data);
    }
    ws.send(payload);
  };

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

    const driverId = raw.driverId ?? raw.driver_id ?? raw.driver?.id ?? raw.driver?.driverId;
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

  const upsertDriver = (next: DriverLocation) => {
    setDrivers((prev) => {
      const current = prev[next.driverId];
      const currentMs = current?.timestamp ? toMs(current.timestamp) : 0;
      const nextMs = next.timestamp ? toMs(next.timestamp) : 0;
      if (currentMs && nextMs && currentMs > nextMs) {
        return prev;
      }
      return { ...prev, [next.driverId]: next };
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
    const urls = getWsUrlCandidates();

    if (shouldLogWs) {
      console.log('[WS] Candidate URLs:', urls);
    }

    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }

    setIsConnected(false);
    setConnectedUrl(null);
    msgCountRef.current = 0;

    let attemptIndex = 0;

    const attachHandlers = (ws: WebSocket) => {
      ws.onopen = () => {
        setIsConnected(true);
        setConnectedUrl((ws as any)?._url ?? connectedUrl);
        if (shouldLogWs) {
          console.log('[WS] Open');
        }
        send('join', { room: 'monitoring' });
      };

      ws.onmessage = (msg) => {
        try {
          const rawText = String((msg as any)?.data ?? '');
          if (!rawText) return;

          msgCountRef.current += 1;
          const json = JSON.parse(rawText);

          // Support either envelope { event, data } OR direct payload.
          const envelopeEvent = (json as any)?.event ?? (json as any)?.type;
          const envelopeData = (json as any)?.data ?? (json as any)?.payload ?? json;

          if (shouldLogWs && msgCountRef.current <= 25) {
            console.log('[WS] ←', envelopeEvent ?? '(no-event)', envelopeData);
          }

          const maybeList = Array.isArray(envelopeData) ? envelopeData : null;

          const isDriverEvent = typeof envelopeEvent === 'string'
            ? /driver/i.test(envelopeEvent) && /(loc|location|position|track)/i.test(envelopeEvent)
            : false;

          if (maybeList && (isDriverEvent || maybeList.length)) {
            maybeList.forEach((item) => {
              const loc = extractLocation(item);
              if (loc) upsertDriver(loc);
            });
            return;
          }

          // Known event name
          if (envelopeEvent === 'driver:location') {
            const loc = extractLocation(envelopeData);
            if (loc) upsertDriver(loc);
            return;
          }

          // Fallback: if it looks like a location payload, accept it.
          const loc = extractLocation(envelopeData);
          if (loc) {
            upsertDriver(loc);
          }
        } catch {
          if (shouldLogWs) {
            console.log('[WS] Non-JSON message or parse error');
          }
        }
      };

      ws.onclose = (evt: any) => {
        if (shouldLogWs) {
          console.log('[WS] Close', { code: evt?.code, reason: evt?.reason });
        }
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        if (shouldLogWs) {
          console.log('[WS] Error', err);
        }
        setIsConnected(false);
      };
    };

    const tryNext = () => {
      if (attemptIndex >= urls.length) {
        setIsConnected(false);
        setConnectedUrl(null);
        return;
      }

      const url = urls[attemptIndex++];
      const ws = new WebSocket(url);
      wsRef.current = ws;

      let opened = false;

      ws.onopen = () => {
        opened = true;
        setIsConnected(true);
        setConnectedUrl(url);
        if (shouldLogWs) {
          console.log('[WS] Connected:', url);
        }
        send('join', { room: 'monitoring' });
      };

      ws.onerror = () => {
        if (!opened) {
          if (shouldLogWs) {
            console.log('[WS] Failed:', url);
          }
          try {
            ws.close();
          } catch {
            // ignore
          }
          tryNext();
        }
      };

      ws.onclose = () => {
        // If we never opened, this attempt failed: try the next URL.
        if (!opened) {
          tryNext();
          return;
        }
        setIsConnected(false);
      };

      attachHandlers(ws);
    };

    tryNext();
  };

  useEffect(() => {
    connect();
    return () => {
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}
      >
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
        </View>
      </View>

      <MapView style={styles.map} initialRegion={initialRegion}>
        {driverList.map((d) => {
          const animated = coordsRef.current.get(d.driverId);
          return (
            <Marker.Animated
              key={d.driverId}
              coordinate={(animated ?? { latitude: d.latitude, longitude: d.longitude }) as any}
              title={`Driver ${d.driverId}`}
              description={d.bookingId ? `Booking: ${d.bookingId}` : undefined}
              rotation={d.heading ?? 0}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.marker}>
                <Ionicons name="car" size={16} color={Colors.white} />
              </View>
            </Marker.Animated>
          );
        })}
      </MapView>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>{driverList.length} Drivers Visible</Text>
        <Text style={styles.bottomSubText} numberOfLines={1}>
          {connectedUrl ? connectedUrl : getWsUrlCandidates()[0]}
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
});
