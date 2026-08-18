import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, setActiveThemeMode } from '../utils/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      let saved = null;
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        saved = localStorage.getItem('app_theme');
      } else if (AsyncStorage) {
        saved = await AsyncStorage.getItem('app_theme');
      }
      if (saved !== null) {
        const darkBool = saved === 'dark';
        setIsDarkMode(darkBool);
        setActiveThemeMode(darkBool);
      } else {
        setIsDarkMode(true);
        setActiveThemeMode(true);
      }
    } catch (e) {
      console.warn('Load theme error:', e);
    }
  };

  const toggleTheme = async (enableDark) => {
    const nextVal = typeof enableDark === 'boolean' ? enableDark : !isDarkMode;
    setIsDarkMode(nextVal);
    setActiveThemeMode(nextVal);
    try {
      const themeVal = nextVal ? 'dark' : 'light';
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('app_theme', themeVal);
      } else if (AsyncStorage) {
        await AsyncStorage.setItem('app_theme', themeVal);
      }
    } catch (e) {
      console.warn('Save theme error:', e);
    }
  };

  const themeColors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDarkMode: true,
      toggleTheme: () => {},
      colors: darkColors,
    };
  }
  return context;
}
