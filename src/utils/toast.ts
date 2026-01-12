import { Alert, Platform, ToastAndroid } from 'react-native';

export const showToast = (title: string, message?: string) => {
  const text = message ? `${title}: ${message}` : title;
  if (Platform.OS === 'android') {
    ToastAndroid.show(text, ToastAndroid.SHORT);
    return;
  }
  // iOS/web fallback
  Alert.alert(title, message ?? '');
};

export const showSuccessToast = (title: string, message?: string) => showToast(title, message);
export const showErrorToast = (title: string, message?: string) => showToast(title, message);
