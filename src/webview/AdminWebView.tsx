import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import Constants from 'expo-constants';
import { configureNotificationHandler, registerForPushNotificationsAsync } from '../services/notifications';
import { adminConfig, isAdminUrl, isExternalUrl, notificationPath, safeFilename } from './policy';

const configuredUrl = process.env.EXPO_PUBLIC_ADMIN_URL || Constants.expoConfig?.extra?.adminUrl || 'https://bestaerolimo.com/admin/';
const SESSION_KEY = 'bal_web_admin_session_v1';
const PUSH_KEY = 'bal_web_admin_push_v1';
const LAST_NOTIFICATION_KEY = 'bal_web_admin_notification_v1';
const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

async function cleanExpiredExports() {
  if (!FileSystem.cacheDirectory) return;
  // Do not remove files immediately after the Android chooser returns: the
  // receiving app may still be reading its granted content URI.
  const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
  for (const name of entries) {
    const match = /^bal-export-(\d+)\/$/.exec(name + '/');
    if (match && Date.now() - Number(match[1]) > 24 * 60 * 60 * 1000) {
      await FileSystem.deleteAsync(FileSystem.cacheDirectory + name, { idempotent: true });
    }
  }
}

export function AdminWebView() {
  const webview = useRef<WebView>(null);
  const [config] = useState(() => { try { return adminConfig(configuredUrl); } catch { return null; } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState(0);
  const canGoBack = useRef(false);
  const authenticated = useRef(false);
  const ready = useRef(false);
  const pendingRoute = useRef<{ id: string; path: string } | null>(null);
  const pushToken = useRef<string | null>(null);
  const pushRequest = useRef<Promise<string | null> | null>(null);
  const storageQueue = useRef<Promise<unknown>>(Promise.resolve());
  const documentBusy = useRef(false);
  const pageGeneration = useRef(0);

  const emit = useCallback((event: string, detail: unknown) => {
    if (!config) return;
    // Async native work may finish after navigation; never send secrets to another origin.
    webview.current?.injectJavaScript(`(function(){if(location.origin===${JSON.stringify(config.origin)} && (location.pathname===${JSON.stringify(config.path)} || location.pathname.startsWith(${JSON.stringify(config.path + '/')})) {window.dispatchEvent(new CustomEvent(${JSON.stringify(event)}, {detail:${JSON.stringify(detail)}}));}})();true;`);
  }, [config]);

  const sendPendingRoute = useCallback(() => {
    if (ready.current && authenticated.current && pendingRoute.current) {
      emit('bal:native-event', { version: 1, type: 'navigate', payload: pendingRoute.current });
    }
  }, [emit]);

  useEffect(() => {
    configureNotificationHandler();
    void cleanExpiredExports().catch(() => undefined);
    const handleTap = async (response: Notifications.NotificationResponse) => {
      const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (await SecureStore.getItemAsync(LAST_NOTIFICATION_KEY) === id) return;
      pendingRoute.current = { id, path: notificationPath(response.notification.request.content.data ?? {}) };
      sendPendingRoute();
    };
    const tap = Notifications.addNotificationResponseReceivedListener(response => { void handleTap(response).catch(() => undefined); });
    const foreground = Notifications.addNotificationReceivedListener(notification => {
      emit('bal:native-event', { version: 1, type: 'notification', payload: {
        data: notification.request.content.data,
        notification: { title: notification.request.content.title, body: notification.request.content.body },
      } });
    });
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) return handleTap(response);
    }).catch(() => undefined);
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        emit('bal:native-event', { version: 1, type: 'resume' });
        sendPendingRoute();
      }
    });
    const tokenChanged = Notifications.addPushTokenListener(() => {
      pushToken.current = null;
      emit('bal:native-event', { version: 1, type: 'resume' });
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { webview.current?.goBack(); return true; }
      return false;
    });
    return () => { tap.remove(); foreground.remove(); appState.remove(); tokenChanged.remove(); back.remove(); };
  }, [emit, sendPendingRoute]);

  const external = useCallback((url: string) => {
    if (!isExternalUrl(url)) return;
    void Linking.openURL(url).catch(() => Alert.alert('Unable to open link', 'No app is available to open this link.'));
  }, []);

  const handleMessage = async ({ nativeEvent }: WebViewMessageEvent) => {
    if (!config || !isAdminUrl(nativeEvent.url, config)) return;
    let request: { version: number; id: string; type: string; payload?: any };
    try { request = JSON.parse(nativeEvent.data); } catch { return; }
    if (request?.version !== 1 || typeof request.id !== 'string' || request.id.length > 100 || typeof request.type !== 'string') return;
    const generation = pageGeneration.current;
    let result: unknown = null;
    try {
      switch (request.type) {
        case 'session.read':
          await storageQueue.current.catch(() => undefined);
          result = await SecureStore.getItemAsync(SESSION_KEY);
          break;
        case 'session.write': {
          const value = request.payload?.value;
          if (value !== null && (typeof value !== 'string' || value.length > 100000)) throw new Error('Invalid session');
          const operation = storageQueue.current.catch(() => undefined).then(() => value === null
            ? SecureStore.deleteItemAsync(SESSION_KEY)
            : SecureStore.setItemAsync(SESSION_KEY, value, secureOptions));
          storageQueue.current = operation;
          await operation;
          if (value === null) authenticated.current = false;
          break;
        }
        case 'ready':
          ready.current = true;
          authenticated.current = request.payload?.authenticated === true;
          sendPendingRoute();
          break;
        case 'navigation.ack':
          if (request.payload?.id && request.payload.id === pendingRoute.current?.id) {
            await SecureStore.setItemAsync(LAST_NOTIFICATION_KEY, pendingRoute.current!.id, secureOptions);
            pendingRoute.current = null;
            await Notifications.clearLastNotificationResponseAsync();
          }
          break;
        case 'push.get': {
          if (!authenticated.current) throw new Error('Sign in to enable notifications');
          if (!pushRequest.current) {
            pushRequest.current = registerForPushNotificationsAsync().finally(() => { pushRequest.current = null; });
          }
          const token = await pushRequest.current;
          pushToken.current = token;
          if (token) await SecureStore.setItemAsync(PUSH_KEY, token, secureOptions);
          result = { token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' };
          break;
        }
        case 'push.peek':
          result = { token: pushToken.current || await SecureStore.getItemAsync(PUSH_KEY) };
          break;
        case 'push.clear':
          await Notifications.dismissAllNotificationsAsync();
          await Notifications.setBadgeCountAsync(0);
          break;
        case 'file.share': {
          if (!authenticated.current) throw new Error('Sign in to download documents');
          if (documentBusy.current) throw new Error('Please finish the current document action first');
          const { base64, filename, mimeType } = request.payload ?? {};
          if (typeof base64 !== 'string' || base64.length > 70 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('Invalid or oversized document');
          if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable');
          documentBusy.current = true;
          const directory = `${FileSystem.cacheDirectory}bal-export-${Date.now()}/`;
          try {
            await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
            const uri = directory + safeFilename(filename);
            await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
            await Sharing.shareAsync(uri, { mimeType: typeof mimeType === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : undefined });
          } catch (error) {
            await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => undefined);
            throw error;
          } finally {
            documentBusy.current = false;
          }
          break;
        }
        case 'print':
          if (!authenticated.current || typeof request.payload?.html !== 'string' || request.payload.html.length > 5000000) throw new Error('Invalid print request');
          if (documentBusy.current) throw new Error('Please finish the current document action first');
          documentBusy.current = true;
          try { await Print.printAsync({ html: request.payload.html }); }
          finally { documentBusy.current = false; }
          break;
        default: throw new Error('Unsupported mobile action');
      }
      if (generation === pageGeneration.current) emit('bal:native-response', { version: 1, id: request.id, result });
    } catch {
      if (generation === pageGeneration.current) emit('bal:native-response', { version: 1, id: request.id, error: 'Unable to complete this action. Please try again.' });
    }
  };

  const retry = () => { setError(null); setLoading(true); setInstance(value => value + 1); };
  if (!config) return <SafeAreaView style={styles.center}><Text>Invalid admin URL. Configure EXPO_PUBLIC_ADMIN_URL with the HTTPS admin address.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <WebView
        key={instance}
        ref={webview}
        source={{ uri: config.url }}
        applicationNameForUserAgent="BALAdminMobile/1"
        style={styles.container}
        originWhitelist={['*']}
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        contentInsetAdjustmentBehavior="never"
        onMessage={event => { void handleMessage(event); }}
        onShouldStartLoadWithRequest={request => {
          if (request.isTopFrame === false) return request.url === 'about:blank' || request.url.startsWith('https://');
          if (isAdminUrl(request.url, config)) return true;
          external(request.url);
          return false;
        }}
        onOpenWindow={({ nativeEvent }) => {
          if (isAdminUrl(nativeEvent.targetUrl, config)) {
            webview.current?.injectJavaScript(`window.location.assign(${JSON.stringify(nativeEvent.targetUrl)});true;`);
          } else if (nativeEvent.targetUrl.startsWith('blob:')) {
            emit('bal:native-event', { version: 1, type: 'download', payload: { url: nativeEvent.targetUrl } });
          } else external(nativeEvent.targetUrl);
        }}
        onNavigationStateChange={state => { canGoBack.current = state.canGoBack; }}
        onLoadStart={() => { pageGeneration.current++; ready.current = false; authenticated.current = false; setLoading(true); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError('Cannot connect to BAL Admin. Check your internet connection and try again.'); }}
        onHttpError={event => {
          if (isAdminUrl(event.nativeEvent.url, config) && !event.nativeEvent.url.includes('/assets/')) {
            setLoading(false); setError('BAL Admin is temporarily unavailable. Please try again.');
          }
        }}
        onContentProcessDidTerminate={retry}
        onRenderProcessGone={retry}
        onFileDownload={({ nativeEvent }) => emit('bal:native-event', { version: 1, type: 'download', payload: { url: nativeEvent.downloadUrl } })}
      />
      {loading && !error && <View style={styles.loading} accessibilityLiveRegion="polite"><ActivityIndicator color="#8a652f" /><Text>Loading BAL Admin…</Text></View>}
      {error && <View style={styles.error}><Text style={styles.title}>Unable to load admin</Text><Text style={styles.explanation}>{error}</Text><Pressable accessibilityRole="button" style={styles.button} onPress={retry}><Text style={styles.buttonText}>Try again</Text></Pressable></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  loading: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', gap: 10, backgroundColor: '#fff', padding: 14, borderRadius: 8 },
  error: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f5f6fa', justifyContent: 'center', alignItems: 'center', padding: 28 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  explanation: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#252525', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
