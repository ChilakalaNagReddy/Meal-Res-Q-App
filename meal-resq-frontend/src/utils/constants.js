import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getInitialBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000`;
  }

  // Extract host IP from Expo manifest (e.g. 192.168.x.x or 10.239.19.5)
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  return 'http://10.239.19.5:8000';
};

export const AppConstants = {
  baseUrl: getInitialBaseUrl(),
  fallbackUrls: [
    'http://10.239.19.5:8000',
    'http://192.168.56.1:8000',
    'http://localhost:8000',
    'http://10.0.2.2:8000',
    'http://127.0.0.1:8000',
  ],
  appName: 'Meal_ResQ',
  tagline: 'Rescuing Food, Enriching Lives',
};

