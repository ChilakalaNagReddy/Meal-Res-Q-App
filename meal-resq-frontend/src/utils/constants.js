import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getInitialBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000`;
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('exp.direct') && !ip.includes('ngrok')) {
      return `http://${ip}:8000`;
    }
  }

  return 'http://10.242.53.5:8000';
};

const detectedPrimary = getInitialBaseUrl();

export const AppConstants = {
  baseUrl: detectedPrimary,
  fallbackUrls: [
    'https://few-lines-decide.loca.lt',
    detectedPrimary,
    'http://10.242.53.5:8000',
    'https://forty-years-open.loca.lt',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://10.0.2.2:8000',
    'http://192.168.56.1:8000',
    'http://192.168.43.1:8000',
    'http://192.168.32.1:8000',
    'http://192.168.1.10:8000',
    'http://192.168.1.5:8000',
  ],
  appName: 'Meal_ResQ',
  tagline: 'Rescuing Food, Enriching Lives',
};




