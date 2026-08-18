import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export function UserProfileHeader({ user, onLogout }) {
  const { colors } = useTheme();
  const { t } = useLanguage();


  if (!user) return null;

  const roleLabels = {
    donor: 'Food Donor 🌿',
    ngo: 'NGO / Charity 🏢',
    volunteer: 'Volunteer 🚲',
    needer: 'Person in Need 🤝',
    admin: 'System Admin 🛡️',
  };

  const roleColors = {
    donor: colors.accentDonor,
    ngo: colors.accentNgo,
    volunteer: colors.accentVol,
    needer: colors.accentNeeder,
    admin: colors.accentAdmin,
  };

  const activeColor = roleColors[user.role] || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrapper}>
          {user.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: `${activeColor}25`, borderColor: activeColor }]}>
              <Text style={[styles.avatarInitials, { color: activeColor }]}>
                {(user.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRoleRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              {user.name || 'User'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: `${activeColor}20`, borderColor: activeColor }]}>
              <Text style={[styles.roleBadgeText, { color: activeColor }]}>
                {roleLabels[user.role] || user.role}
              </Text>
            </View>
          </View>

          <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
            📧 {user.email}
          </Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
            📱 {user.phone || '+91 9876543210'}
          </Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
            📍 {user.address || 'Registered Location'}
          </Text>
        </View>

        {onLogout && (
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }]}
            onPress={onLogout}
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
            <Text style={{ fontSize: 10, color: colors.error, fontWeight: '800', marginTop: 2 }}>{t('logout')}</Text>
          </TouchableOpacity>
        )}


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },


  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
