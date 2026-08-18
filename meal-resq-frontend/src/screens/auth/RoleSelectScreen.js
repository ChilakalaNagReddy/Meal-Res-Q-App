import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { MobileAppFrame } from '../../components/MobileAppFrame';

export function RoleSelectScreen({ onSelectRole }) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const roles = [
    {
      key: 'donor',
      title: t('donorRole'),
      subtitle: 'Restaurants, caterers, hotels & households with excess food',
      icon: '🍲',
      color: colors.accentDonor,
    },
    {
      key: 'ngo',
      title: t('ngoRole'),
      subtitle: 'Shelters, food banks & community welfare organizations',
      icon: '🏢',
      color: colors.accentNgo,
    },
    {
      key: 'volunteer',
      title: t('volRole'),
      subtitle: 'Delivery drivers, riders & food rescue champions',
      icon: '🚲',
      color: colors.accentVol,
    },
    {
      key: 'needer',
      title: t('neederRole'),
      subtitle: 'Individuals or families seeking immediate meal support',
      icon: '🤝',
      color: colors.accentNeeder,
    },
    {
      key: 'admin',
      title: t('adminRole'),
      subtitle: 'Platform analytics, metrics & user access log control',
      icon: '🛡️',
      color: colors.accentAdmin,
    },
  ];




  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIconBadge}>
              <Text style={{ fontSize: 24 }}>🌿</Text>
            </View>
            <Text style={[styles.logo, { color: colors.textPrimary }]}>Meal-ResQ</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Zero Waste • Max Value</Text>
          
          {/* Header Box Container */}
          <View style={[styles.headerBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.prompt, { color: colors.primary }]}>✨ {t('selectRoleTitle')}</Text>
            <Text style={[styles.headerBoxSub, { color: colors.textSecondary }]}>
              Select your organization or personal account type to enter
            </Text>
          </View>
        </View>

        {/* Roles Box Grid */}
        <View style={styles.grid}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.roleCardBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.color,
                  shadowColor: item.color,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectRole(item)}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${item.color}22` }]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>

              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
                  <View style={[styles.arrowBox, { backgroundColor: `${item.color}18` }]}>
                    <Text style={[styles.arrow, { color: item.color }]}>→</Text>
                  </View>
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </MobileAppFrame>
  );

}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  headerBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 480,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerBoxSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    gap: 14,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  roleCardBox: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
