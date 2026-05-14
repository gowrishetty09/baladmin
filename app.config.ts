import { ConfigContext, ExpoConfig } from 'expo/config';

const androidMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const iosMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY || androidMapsApiKey;

const normalizePluginName = (plugin: any): string | null => {
    if (!plugin) return null;
    if (typeof plugin === 'string') return plugin;
    if (Array.isArray(plugin) && typeof plugin[0] === 'string') return plugin[0];
    return null;
};

const upsertPlugin = (plugins: any[], next: any) => {
    const nextName = normalizePluginName(next);
    if (!nextName) return plugins;
    const idx = plugins.findIndex((p) => normalizePluginName(p) === nextName);
    if (idx >= 0) {
        const copy = [...plugins];
        copy[idx] = next;
        return copy;
    }
    return [...plugins, next];
};

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Bal-Adminapp',
    slug: 'bal-admin',
    version: '1.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    notification: {
        icon: './assets/notifiy-icon.png',
        color: '#2563eb',
    },
    splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
    },
    ios: {
        ...(config.ios ?? {}),
        supportsTablet: true,
        bundleIdentifier: 'com.bal.adminapp',
        config: {
            ...(config.ios?.config ?? {}),
            ...(iosMapsApiKey ? { googleMapsApiKey: iosMapsApiKey } : {}),
        },
    },
    android: {
        ...(config.android ?? {}),
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: 'com.bal.admin',
        googleServicesFile: './google-services.json',
        // Preserve any key coming from app.json; allow env to override.
        config: {
            ...(config.android?.config ?? {}),
            ...(androidMapsApiKey ? { googleMaps: { apiKey: androidMapsApiKey } } : {}),
        },
    },
    web: {
        favicon: './assets/favicon.png',
    },
    plugins: (() => {
        const base = Array.isArray(config.plugins) ? [...config.plugins] : [];

        let next = base;
        next = upsertPlugin(next, [
            'expo-notifications',
            {
                color: '#2563eb',
            },
        ]);
        next = upsertPlugin(next, 'expo-secure-store');

        const hasMaps = next.some((p) => normalizePluginName(p) === 'react-native-maps');

        // Keep existing react-native-maps plugin config from app.json.
        // Only override when a build-time env key is explicitly provided.
        if (androidMapsApiKey) {
            next = upsertPlugin(next, ['react-native-maps', { androidGoogleMapsApiKey: androidMapsApiKey }]);
        } else if (!hasMaps) {
            next = upsertPlugin(next, 'react-native-maps');
        }

        return next;
    })(),
    extra: {
        eas: {
            projectId: '7a0b27b5-a719-45b0-ae7c-68da67ac0c41',
            apiBaseUrl: 'https://bestaerolimo.com/api',
        },
        apiBaseUrl: 'https://bestaerolimo.com/api',
        googleMapsApiKey: androidMapsApiKey ?? (config as any)?.android?.config?.googleMaps?.apiKey ?? null,
    },
    owner: 'pranas9s-organization',
});
