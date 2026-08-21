import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getInitialBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return `http://${host}:8000`;
    }
    return 'http://10.242.53.5:8000';
  }

  // Extract host IP dynamically from Expo manifest
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('exp.direct')) {
      return `http://${ip}:8000`;
    }
  }

  return 'http://10.242.53.5:8000';
};


export const AppConstants = {
  baseUrl: getInitialBaseUrl(),
  fallbackUrls: [
    'http://10.242.53.5:8000',
    'http://192.168.56.1:8000',
    'http://192.168.43.1:8000',
    'http://192.168.32.1:8000',
    'http://10.239.19.5:8000',
    'http://10.239.19.237:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://10.0.2.2:8000',
  ],
  appName: 'Meal_ResQ',
  tagline: 'Rescuing Food, Enriching Lives',
};




