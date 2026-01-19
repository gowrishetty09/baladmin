import { ConfigContext, ExpoConfig } from 'expo/config';

const androidMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const iosMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY || androidMapsApiKey;

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Bal-Adminapp',
    slug: 'bal-admin',
    version: '1.0.0',
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
        supportsTablet: true,
        bundleIdentifier: 'com.bal.adminapp',
        config: iosMapsApiKey ? { googleMapsApiKey: iosMapsApiKey } : undefined,
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: 'com.bal.admin',
        googleServicesFile: './google-services.json',
        config: androidMapsApiKey ? { googleMaps: { apiKey: androidMapsApiKey } } : undefined,
    },
    web: {
        favicon: './assets/favicon.png',
    },
    plugins: [
        [
            'expo-notifications',
            {
                color: '#2563eb',
            },
        ],
        'expo-secure-store',
    ],
    extra: {
        eas: {
            projectId: '7a0b27b5-a719-45b0-ae7c-68da67ac0c41',
            apiBaseUrl: 'https://bestaerolimo.online/api',
        },
        apiBaseUrl: 'https://bestaerolimo.online/api',
        googleMapsApiKey: androidMapsApiKey ?? null,
    },
    owner: 'pranas9s-organization',
});
