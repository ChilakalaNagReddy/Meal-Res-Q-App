import React, { useEffect } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function MobileAppFrame({ children }) {
  const { colors } = useTheme();

  // Inject web CSS rules to hide scrolling sidebar while maintaining mouse wheel & touchpad scrolling
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'meal-resq-web-scroll-style';
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = `
        /* Hide visual scrollbar sidebar for Chrome, Safari, Opera */
        ::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
          background: transparent !important;
        }

        /* Hide visual scrollbar sidebar for IE, Edge and Firefox */
        html, body, #root {
          -ms-overflow-style: none !important;  /* IE and Edge */
          scrollbar-width: none !important;  /* Firefox */
          overflow-y: auto !important;
        }
      `;
    }
  }, []);

  return (
    <View
      style={[
        styles.mobileContainer,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 24 : Platform.OS === 'android' ? 20 : 16,
        },
      ]}
    >
      <View style={styles.scrollWrapper}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    width: '100%',
  },
  scrollWrapper: {
    flex: 1,
    width: '100%',
  },
});
