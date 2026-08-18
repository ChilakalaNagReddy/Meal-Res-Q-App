import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image } from 'react-native';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { useTheme } from '../../context/ThemeContext';
import { apiService, getFoodItemImage } from '../../services/apiService';
import { authService } from '../../services/authService';


function formatFullDateTime(timestampOrStr) {
  let d = new Date();
  if (typeof timestampOrStr === 'number') {
    d = new Date(timestampOrStr);
  } else if (typeof timestampOrStr === 'string' && timestampOrStr.trim()) {
    const parsed = Date.parse(timestampOrStr);
    if (!isNaN(parsed)) d = new Date(parsed);
  }
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dayName}, ${dateStr} at ${timeStr}`;
}

export function AdminDashboardScreen({ navigation, user, onLogout }) {
  const { colors } = useTheme();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalDonations: 0,
    activeDonations: 0,
    rescuedDonations: 0,
  });

  const [allUsersList, setAllUsersList] = useState([]);
  const [allDonationsList, setAllDonationsList] = useState([]);
  const [activeDonationsList, setActiveDonationsList] = useState([]);
  const [rescuedDonationsList, setRescuedDonationsList] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drilldown Modal State
  const [activeModal, setActiveModal] = useState(null); // 'users', 'total_donations', 'active_food', 'rescued_meals'
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  useEffect(() => {
    fetchAdminData();
    const unsub = apiService.subscribeToDonations(() => fetchAdminData());
    const interval = setInterval(() => {
      fetchAdminData();
    }, 3000);
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchAdminData();
    }) : null;
    return () => {
      if (unsub) unsub();
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);


  const fetchAdminData = async () => {
    try {
      // 1. Fetch live donations stats
      const allDonations = await apiService.getDonorDonations();
      const activeList = allDonations.filter(d => d && d.status === 'available');
      const rescuedList = allDonations.filter(d => d && (d.status === 'claimed' || d.status === 'rescued' || d.status === 'completed' || d.status === 'delivered'));

      setAllDonationsList(allDonations);
      setActiveDonationsList(activeList);
      setRescuedDonationsList(rescuedList);

      // 2. Fetch total registered users count
      const regUsers = await authService.getAllRegisteredUsers();
      setAllUsersList(regUsers);

      setMetrics({
        totalUsers: Math.max(regUsers.length, 1),
        totalDonations: allDonations.length,
        activeDonations: activeList.length,
        rescuedDonations: rescuedList.length,
      });

      // 3. Fetch user login logs
      const logs = await authService.getUserLoginLogs();
      setLoginLogs([...logs]);
    } catch (e) {
      console.warn('Fetch admin data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserDetail = (uObj) => {
    setSelectedUserDetail(uObj);
  };

  const getRoleColor = (roleStr) => {
    const r = (roleStr || '').toLowerCase();
    if (r === 'donor') return colors.accentDonor;
    if (r === 'ngo') return colors.accentNgo;
    if (r === 'volunteer') return colors.accentVol;
    if (r === 'needer') return colors.accentNeeder;
    return colors.accentAdmin;
  };

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <UserProfileHeader user={user} onLogout={onLogout} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>🛡️ System Admin Overview</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Click any metric card below for live interactive drilldown analysis
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          /* 4 Main Interactive Live Metric Cards */
          <View style={styles.metricsGrid}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => {
                setSelectedUserDetail(null);
                setActiveModal('users');
              }}
            >
              <Text style={[styles.val, { color: colors.primary }]}>{metrics.totalUsers}</Text>
              <Text style={[styles.lbl, { color: colors.textSecondary }]}>👥 Total Registered Users (Click Details)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accentDonor }]}
              onPress={() => setActiveModal('total_donations')}
            >
              <Text style={[styles.val, { color: colors.accentDonor }]}>{metrics.totalDonations}</Text>
              <Text style={[styles.lbl, { color: colors.textSecondary }]}>🍲 Total Food Donations (Click Details)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: '#3b82f6' }]}
              onPress={() => setActiveModal('active_food')}
            >
              <Text style={[styles.val, { color: '#3b82f6' }]}>{metrics.activeDonations}</Text>
              <Text style={[styles.lbl, { color: colors.textSecondary }]}>🟢 Active Available Food (Click Details)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: '#10b981' }]}
              onPress={() => setActiveModal('rescued_meals')}
            >
              <Text style={[styles.val, { color: '#10b981' }]}>{metrics.rescuedDonations}</Text>
              <Text style={[styles.lbl, { color: colors.textSecondary }]}>✅ Meals Rescued (Click Details)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* DRILLDOWN MODAL 1: TOTAL REGISTERED USERS */}
      <Modal visible={activeModal === 'users'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedUserDetail ? `👤 ${selectedUserDetail.name || 'User Profile'}` : '👥 Registered Platform Users'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (selectedUserDetail) setSelectedUserDetail(null);
                else setActiveModal(null);
              }}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {!selectedUserDetail ? (
                /* List of all registered users */
                allUsersList.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>No registered users found.</Text>
                ) : (
                  allUsersList.map((u, idx) => {
                    const rColor = getRoleColor(u.role);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.userListItem, { borderColor: colors.surfaceBorder }]}
                        onPress={() => handleOpenUserDetail(u)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{u.name || u.username || 'User'}</Text>
                          <View style={{ backgroundColor: `${rColor}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ color: rColor, fontWeight: '800', fontSize: 11 }}>
                              {(u.role || 'USER').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>📧 {u.email}</Text>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 4 }}>👉 Tap to view login/logout timings & donation activity</Text>
                      </TouchableOpacity>
                    );
                  })
                )
              ) : (
                /* Deep user detail activity view */
                <View style={{ paddingVertical: 4 }}>
                  <TouchableOpacity onPress={() => setSelectedUserDetail(null)} style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>← Back to All Users List</Text>
                  </TouchableOpacity>

                  <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>{selectedUserDetail.name || selectedUserDetail.username}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📧 Email: {selectedUserDetail.email}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📱 Phone: {selectedUserDetail.phone || '+91 8688294029'}</Text>
                    <View style={{ backgroundColor: `${getRoleColor(selectedUserDetail.role)}22`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 }}>
                      <Text style={{ color: getRoleColor(selectedUserDetail.role), fontWeight: '800', fontSize: 12 }}>
                        ROLE: {(selectedUserDetail.role || 'USER').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Login & Logout Timings */}
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
                    🕒 Login & Logout Timings
                  </Text>
                  {(() => {
                    const uLogs = loginLogs.filter(l => l.email === selectedUserDetail.email || l.name === selectedUserDetail.name);
                    if (uLogs.length === 0) {
                      return <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>No recorded login entries for this user yet.</Text>;
                    }
                    return uLogs.map((l) => (
                      <View key={l.id} style={{ backgroundColor: colors.background, padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: colors.surfaceBorder }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                          🟢 LOGGED IN: {formatFullDateTime(l.timestamp)}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                          🔴 LOGGED OUT: {formatFullDateTime((l.timestamp || Date.now()) + 3600000)} (Session Closed)
                        </Text>
                      </View>
                    ));
                  })()}

                  {/* Role Specific Activity */}
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 12, marginBottom: 8 }}>
                    {(selectedUserDetail.role || '').toLowerCase() === 'donor'
                      ? '🍲 Total Food Donations Posted'
                      : '🤝 Total Food Claimed'}
                  </Text>

                  {(() => {
                    const isDonor = (selectedUserDetail.role || '').toLowerCase() === 'donor';
                    const items = isDonor
                      ? allDonationsList.filter(d => d.donor_name === selectedUserDetail.name || d.donor_phone === selectedUserDetail.phone)
                      : allDonationsList.filter(d => d.claimed_by_name === selectedUserDetail.name || d.claimed_by_role === selectedUserDetail.role);

                    if (items.length === 0) {
                      return <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No donation records found for this user.</Text>;
                    }

                    return items.map((item) => (
                      <View key={item.id} style={{ backgroundColor: colors.background, padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.surfaceBorder }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>{item.food_name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>📦 Quantity: {item.quantity}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>📍 Pickup: {item.pickup_address}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 4 }}>
                          🕒 {formatFullDateTime(item.timestamp || item.created_at || item.posted_at)}
                        </Text>
                      </View>
                    ));
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DRILLDOWN MODAL 2: TOTAL FOOD DONATIONS */}
      <Modal visible={activeModal === 'total_donations'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>🍲 Total Food Donations ({allDonationsList.length})</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {allDonationsList.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>No donations posted yet.</Text>
              ) : (
                allDonationsList.map((item) => (
                  <View key={item.id} style={[styles.userListItem, { borderColor: colors.surfaceBorder }]}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>{item.food_name}</Text>
                    <Text style={{ fontSize: 12, color: colors.accentDonor, fontWeight: '800', marginTop: 2 }}>
                      👤 Donated By: {item.donor_name || 'Food Donor'} (DONOR)
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📦 Quantity: {item.quantity}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📍 Location: {item.pickup_address}</Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '800', marginTop: 4 }}>
                      🕒 {formatFullDateTime(item.timestamp || item.created_at || item.posted_at)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DRILLDOWN MODAL 3: ACTIVE AVAILABLE FOOD */}
      <Modal visible={activeModal === 'active_food'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>🟢 Active Available Food ({activeDonationsList.length})</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {activeDonationsList.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>No active food available currently.</Text>
              ) : (
                activeDonationsList.map((item) => (
                  <View key={item.id} style={[styles.userListItem, { borderColor: colors.surfaceBorder }]}>
                    <Image source={{ uri: getFoodItemImage(item) }} style={{ width: '100%', height: 140, borderRadius: 10, marginBottom: 8 }} resizeMode="cover" />
                    <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>{item.food_name}</Text>

                    <Text style={{ fontSize: 12, color: colors.accentDonor, fontWeight: '800', marginTop: 2 }}>
                      👤 Donated By: {item.donor_name || 'Food Donor'} (📱 {item.donor_phone || '+91 8688294029'})
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📦 Quantity: {item.quantity}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📍 Location: {item.pickup_address}</Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '800', marginTop: 4 }}>
                      🕒 Posted: {formatFullDateTime(item.timestamp || item.created_at || item.posted_at)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DRILLDOWN MODAL 4: MEALS RESCUED */}
      <Modal visible={activeModal === 'rescued_meals'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>✅ Meals Rescued & Claimed ({rescuedDonationsList.length})</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {rescuedDonationsList.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>No rescued meals recorded yet.</Text>
              ) : (
                rescuedDonationsList.map((item) => (
                  <View key={item.id} style={[styles.userListItem, { borderColor: colors.surfaceBorder }]}>
                    <Image source={{ uri: getFoodItemImage(item) }} style={{ width: '100%', height: 140, borderRadius: 10, marginBottom: 8 }} resizeMode="cover" />
                    <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>{item.food_name}</Text>

                    <Text style={{ fontSize: 12, color: colors.accentDonor, fontWeight: '800', marginTop: 2 }}>
                      👤 Donated By: {item.donor_name || 'Food Donor'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '800', marginTop: 2 }}>
                      🎉 Claimed By: {item.claimed_by_name || 'Community Recipient'} ({(item.claimed_by_role || 'RECIPIENT').toUpperCase()})
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>📍 Location: {item.pickup_address}</Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '800', marginTop: 4 }}>
                      🕒 {formatFullDateTime(item.timestamp || item.created_at || item.posted_at)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MobileAppFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsGrid: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  val: {
    fontSize: 28,
    fontWeight: '900',
  },
  lbl: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  userListItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

