import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminWebView } from './src/webview/AdminWebView';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AdminWebView />
    </SafeAreaProvider>
  );
}
