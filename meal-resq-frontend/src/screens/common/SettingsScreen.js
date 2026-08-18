import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export function SettingsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { currentLang, changeLanguage, t } = useLanguage();

  const languages = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>⚙️ {t('settings')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('appSettings')}</Text>

        {/* Dark Theme Toggle Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.row}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>🌙 {t('darkTheme')}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                {isDarkMode ? 'Pitch Dark Mode Enabled (#0F172A)' : 'Light Theme Mode Enabled'}
              </Text>
            </View>

            <Switch
              value={isDarkMode}
              onValueChange={(val) => toggleTheme(val)}
              trackColor={{ false: '#cbd5e1', true: colors.primary }}
              thumbColor={isDarkMode ? '#ffffff' : '#f1f5f9'}
            />
          </View>
        </View>

        {/* Language Selection Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 4 }]}>🌐 {t('prefLang')}</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary, marginBottom: 14 }]}>{t('selectLangPrompt')}</Text>

          <View style={styles.langGrid}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langItem,
                  {
                    backgroundColor: currentLang === lang ? colors.primary : colors.background,
                    borderColor: currentLang === lang ? colors.primary : colors.surfaceBorder,
                  },
                ]}
                onPress={() => changeLanguage(lang)}
              >
                <Text
                  style={{
                    color: currentLang === lang ? '#FFF' : colors.textPrimary,
                    fontWeight: currentLang === lang ? '800' : '600',
                    fontSize: 14,
                  }}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About App Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 4 }]}>ℹ️ About Meal-ResQ</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary, marginBottom: 12 }]}>
            Zero Waste • Max Value • Rescuing Surplus Food Across Communities
          </Text>

          <View style={styles.aboutList}>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>App Version:</Text>
              <Text style={[styles.aboutValue, { color: colors.primary }]}>v1.0.0 (Production Release)</Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Security Standard:</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>JWT Encryption & Email OTP</Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Platform Architecture:</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>FastAPI Backend + React Native Expo</Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Supported Roles:</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>Donor 🌿, NGO 🏢, Vol 🚲, Needer 🤝, Admin 🛡️</Text>
            </View>
          </View>

          <View style={[styles.missionBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.missionText, { color: colors.textSecondary }]}>
              💚 Meal-ResQ connects restaurants, caterers, and households with local NGOs and individuals in need to eliminate food waste and ensure every surplus meal feeds a community member.
            </Text>
          </View>
        </View>
      </ScrollView>
    </MobileAppFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    width: '100%',
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  aboutList: {
    gap: 8,
    marginTop: 6,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  missionBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  missionText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
