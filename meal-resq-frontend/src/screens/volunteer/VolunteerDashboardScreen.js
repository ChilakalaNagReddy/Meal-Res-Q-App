import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';


import { MobileAppFrame } from '../../components/MobileAppFrame';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { DonationCommunicationModal } from '../../components/DonationCommunicationModal';
import { DonationDetailsModal } from '../../components/DonationDetailsModal';
import { useTheme } from '../../context/ThemeContext';
import { apiService, getFoodItemImage } from '../../services/apiService';

export function VolunteerDashboardScreen({ navigation, user, onLogout }) {

  const { colors } = useTheme();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  // Communication & Details Modal State
  const [commModalVisible, setCommModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [commType, setCommType] = useState('chat'); // 'call', 'chat'
  const [selectedCommItem, setSelectedCommItem] = useState(null);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState(null);



  useEffect(() => {
    fetchPickups();
    const unsubSub = apiService.subscribeToDonations(() => {
      setAvailableDonations(apiService.getAvailableDonationsSync());
      fetchPickups();
    });
    const interval = setInterval(() => {
      fetchPickups();
    }, 1500);

    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchPickups();
    }) : null;
    return () => {
      if (unsubSub) unsubSub();
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);





  const fetchPickups = async () => {
    try {
      const avail = await apiService.getAvailableDonations();
      if (Array.isArray(avail)) {
        setPickups(avail);
      }
    } catch (e) {
      console.warn('Fetch pickups error:', e);
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateStatus = async (id, statusStr) => {
    await apiService.updatePickupStatus(id, statusStr);
    fetchPickups();
  };

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <UserProfileHeader user={user} onLogout={onLogout} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>🚲 Volunteer Dispatch Hub</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Active food rescue pickup and delivery routes</Text>
        </View>

        {/* Tab Toggle Row */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16, borderColor: colors.surfaceBorder, borderWidth: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'available' ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab('available')}
          >
            <Text style={{ fontWeight: '800', fontSize: 13, color: activeTab === 'available' ? '#FFF' : colors.textSecondary }}>
              🚚 Available Pickups ({pickups.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'history' ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab('history')}
          >
            <Text style={{ fontWeight: '800', fontSize: 13, color: activeTab === 'history' ? '#FFF' : colors.textSecondary }}>
              📜 Rescue History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : activeTab === 'available' ? (
          pickups.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🚚</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Active Pickups Assigned</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Active food rescue pickup orders will display here!</Text>
            </View>
          ) : (
            pickups.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <TouchableOpacity onPress={() => { setSelectedDetailsItem(item); setDetailsModalVisible(true); }}>
                  <View style={styles.foodImgBox}>
                    <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
                  </View>

                  <View style={styles.cardHeader}>
                    <Text style={[styles.foodName, { color: colors.textPrimary }]}>{item.donation?.food_name || item.food_name || 'Surplus Food'}</Text>
                    <Text style={[styles.donorBadge, { color: colors.accentDonor }]}>👤 {item.donor_name || item.donation?.donor_name || 'Donor'}</Text>
                  </View>
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>📦 Quantity: {item.donation?.quantity || item.quantity || '5 kg'}</Text>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 2 }}>🔍 Tap card to view full details</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                  <Text style={[styles.detail, { color: colors.textSecondary, flex: 1 }]}>📍 Address: {item.donation?.pickup_address || item.pickup_address || 'Pickup Location'}</Text>
                  <TouchableOpacity onPress={() => apiService.openMapLocation(item.donation?.pickup_address || item.pickup_address)} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '800' }}>📍 Navigate</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.detail, { color: colors.textSecondary }]}>📱 Phone: {item.donor_phone || item.donation?.donor_phone || '+91 9876543210'}</Text>
                <Text style={[styles.detail, { color: colors.primary, fontWeight: '800' }]}>{item.posted_at || item.created_at || '🕒 Posted Today'}</Text>


              {/* Call, Chat, Voice Note Action Row */}
              <View style={styles.commRow}>
                <TouchableOpacity
                  style={[styles.commBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => {
                    setSelectedCommItem(item);
                    setCommType('call');
                    setCommModalVisible(true);
                  }}
                >
                  <Text style={styles.commBtnText}>📞 Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commBtn, { backgroundColor: '#10b981', position: 'relative' }]}
                  onPress={() => {
                    setSelectedCommItem(item);
                    setCommType('chat');
                    setCommModalVisible(true);
                  }}
                >
                  <Text style={styles.commBtnText}>
                    💬 Chat {apiService.hasUnreadChat(item.id, 'volunteer') ? '🔴' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commBtn, { backgroundColor: '#8b5cf6', position: 'relative' }]}
                  onPress={() => {
                    setSelectedCommItem(item);
                    setCommType('voice');
                    setCommModalVisible(true);
                  }}
                >
                  <Text style={styles.commBtnText}>
                    🎙️ Voice Note {apiService.hasUnreadVoice(item.id, 'volunteer') ? '🔴' : ''}
                  </Text>
                </TouchableOpacity>

              </View>

              {item.status === 'available' ? (
                <TouchableOpacity style={[styles.claimBtn, { backgroundColor: colors.accentVol, marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} onPress={async () => { await apiService.acceptDonation(item.id, user); fetchPickups(); setActiveTab('history'); }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Claim Food</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )))
        ) : (
          /* VOLUNTEER RESCUE HISTORY TAB */

          /* VOLUNTEER RESCUE HISTORY TAB */
          (() => {
            const grouped = apiService.getGroupedHistoryDonations(user);
            const dateKeys = Object.keys(grouped).filter(k => grouped[k].length > 0);

            if (dateKeys.length === 0) {
              return (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📜</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Rescue History Yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Completed food rescue dispatches claimed by you will display here date-wise!</Text>
                </View>
              );
            }

            return dateKeys.map((dateCategory) => (
              <View key={dateCategory} style={{ marginBottom: 20 }}>
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 }}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                    📅 {dateCategory.toUpperCase()}
                  </Text>
                </View>

                {grouped[dateCategory].map((item) => (
                  <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, marginBottom: 10 }]}>
                    <View style={styles.foodImgBox}>
                      <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
                    </View>


                    <View style={styles.cardHeader}>
                      <Text style={[styles.foodName, { color: colors.textPrimary }]}>{item.food_name}</Text>
                      <Text style={[styles.donorBadge, { color: colors.accentDonor }]}>👤 {item.donor_name || 'Donor'}</Text>
                    </View>

                    <Text style={[styles.detail, { color: colors.textSecondary }]}>📦 Quantity: {item.quantity}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                      <Text style={[styles.detail, { color: colors.textSecondary, flex: 1 }]}>📍 Location: {item.pickup_address}</Text>
                      <TouchableOpacity onPress={() => apiService.openMapLocation(item.pickup_address)} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '800' }}>📍 Navigate</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 8, borderRadius: 8, marginTop: 8 }}>
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                        ✅ RESCUED & DELIVERED BY VOLUNTEER
                      </Text>
                    </View>

                    {/* Action Row for History Card */}
                    <View style={styles.commRow}>
                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#0284c7' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.donor_phone || '+91 8688294029', food_name: item.food_name });
                          setCommType('call');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>📞 Call Donor</Text>
                      </TouchableOpacity>



                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#10b981', position: 'relative' }]}
                        onPress={() => {
                          setSelectedCommItem(item);
                          setCommType('chat');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>
                          💬 Chat {apiService.hasUnreadChat(item.id, 'volunteer') ? '🔴' : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ));

          })()
        )}

      </ScrollView>

      <DonationCommunicationModal
        visible={commModalVisible}
        type={commType}
        item={selectedCommItem}
        currentUser={user}
        onClose={() => setCommModalVisible(false)}
      />

      <DonationDetailsModal
        visible={detailsModalVisible}
        item={selectedDetailsItem}
        onClose={() => setDetailsModalVisible(false)}
      />

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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  foodImgBox: {
    width: Platform.OS === 'web' ? 420 : '100%',
    maxWidth: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 16,
  },
  foodImg: {
    width: '100%',
    height: '100%',
  },


  foodName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  detail: {
    fontSize: 13,
    marginTop: 3,
  },
  commRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  commBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,

    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
