import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

import { apiService } from '../../services/apiService';

export function NotificationsScreen({ navigation, user }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifs();
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchNotifs();
    }) : null;
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);



  const fetchNotifs = async () => {
    try {
      const data = await apiService.getNotifications(user);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Fetch notifications error:', e);
    } finally {
      setLoading(false);
    }
  };




  const handleDeleteNotif = async (id) => {
    setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    await apiService.deleteNotification(id);
  };

  const handleClearAll = async () => {
    setNotifications([]);
    await apiService.clearAllNotifications();
  };

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.textPrimary, marginBottom: 0 }]}>🔔 {t('notificationsAlerts')}</Text>
          {notifications.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={[styles.clearAllBtn, { borderColor: colors.surfaceBorder }]}>
              <Text style={{ color: colors.error, fontWeight: '800', fontSize: 12 }}>🗑️ Clear All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : notifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noNotificationsYet')}</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('realtimeNotice')}</Text>
          </View>
        ) : (
          notifications.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary, flex: 1, paddingRight: 8 }]}>{item.title}</Text>
                <Text style={[styles.timeBadge, { color: colors.primary }]}>{item.posted_at || item.created_at || '🕒 Just now'}</Text>
              </View>
              <Text style={[styles.itemMsg, { color: colors.textSecondary }]}>{item.message}</Text>

              <TouchableOpacity onPress={() => handleDeleteNotif(item.id)} style={{ alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 6, paddingVertical: 4 }}>
                <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700' }}>🗑️ Delete Alert</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </MobileAppFrame>
  );
}


const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  emptyCard: {
    borderRadius: 16,
    padding: 30,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  timeBadge: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  itemMsg: {
    fontSize: 13,
    lineHeight: 18,
  },
});

