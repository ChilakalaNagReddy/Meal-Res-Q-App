import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';

import { MobileAppFrame } from '../../components/MobileAppFrame';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { DonationCommunicationModal } from '../../components/DonationCommunicationModal';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiService, getFoodItemImage } from '../../services/apiService';

export function DonorDashboardScreen({ navigation, user, onLogout }) {

  const { colors } = useTheme();
  const { t } = useLanguage();
  const [donations, setDonations] = useState(() => apiService.getLocalDonationsSync(user));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  const activeDonations = donations.filter(d => d && d.status === 'available');
  const historyDonationsCount = donations.filter(d => d && d.status === 'claimed').length;

  // Communication Modal State

  const [commModalVisible, setCommModalVisible] = useState(false);
  const [commType, setCommType] = useState('call');
  const [selectedCommItem, setSelectedCommItem] = useState(null);



  useEffect(() => {
    fetchDonations();
    const unsubSub = apiService.subscribeToDonations(() => {
      setDonations(apiService.getLocalDonationsSync(user));
      fetchDonations();
    });
    const interval = setInterval(() => {
      fetchDonations();
    }, 3000);
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchDonations();
    }) : null;
    return () => {
      if (unsubSub) unsubSub();
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);





  const fetchDonations = async () => {
    try {
      const data = await apiService.getDonorDonations(user);
      if (Array.isArray(data)) {
        setDonations(data);
      }
    } catch (e) {
      console.warn('Fetch donor donations error:', e);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id) => {
    setDonations((prev) => prev.filter((d) => String(d.id) !== String(id)));
    await apiService.deleteDonation(id);
  };



  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live Profile Details Header */}
        <UserProfileHeader user={user} onLogout={onLogout} />

        {/* Dashboard Title & Post Action */}
        <View style={styles.actionRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🍲 {t('yourFoodDonations')}</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('trackListings')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: colors.accentDonor }]}
            onPress={() => navigation.navigate('AddDonation', { user })}

          >
            <Text style={styles.postBtnText}>{t('postFood')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statVal, { color: colors.accentDonor }]}>{donations.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{t('totalPosted')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{activeDonations.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{t('activeListings')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statVal, { color: colors.accentVol }]}>{historyDonationsCount}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{t('rescuedMeals')}</Text>
          </View>

        </View>

        {/* Dashboard Tabs: Active vs History */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#FFF' : colors.textSecondary }]}>
              🟢 Active ({activeDonations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === 'history' ? '#FFF' : colors.textSecondary }]}>
              📜 Rescued History ({historyDonationsCount})
            </Text>
          </TouchableOpacity>

        </View>

        {/* Donations List or History List */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : activeTab === 'active' ? (
          activeDonations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🍲</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noFoodDonationsYet')}</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('tapPostFoodMsg')}</Text>
            </View>
          ) : (
            activeDonations.map((item) => (
              <View key={item.id} style={[styles.donationItem, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={styles.foodImgBox}>
                  <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
                </View>


                <View style={styles.itemHeader}>
                  <Text style={[styles.foodTitle, { color: colors.textPrimary }]}>{item.food_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'available' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)' }]}>
                    <Text style={{ color: item.status === 'available' ? colors.primary : colors.accentDonor, fontWeight: '700', fontSize: 12 }}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.itemText, { color: colors.textSecondary }]}>📦 Quantity: {item.quantity || '5 kg'} ({item.category || 'Vegetarian'})</Text>
                <Text style={[styles.itemText, { color: colors.textSecondary, marginTop: 3 }]}>📍 Pickup: {item.pickup_address}</Text>
                <Text style={[styles.itemText, { color: colors.primary, fontWeight: '800' }]}>{item.posted_at || item.created_at || '🕒 Posted Today'}</Text>


                {item.status === 'claimed' ? (
                  <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: 10, borderRadius: 10, marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                      🎉 CLAIMED BY: {item.claimed_by_name || 'Helping Hands NGO'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      👤 Role: {item.claimed_by_role || 'NGO Partner'} | 📱 Contact: {item.claimed_by_phone || '+91 9876500000'}
                    </Text>

                    {/* Donor Contact Claimer Row */}
                    <View style={styles.commRow}>
                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#0284c7' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('call');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>📞 Call Claimer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#10b981', position: 'relative' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('chat');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>
                          💬 Chat {apiService.hasUnreadChat(item.id, 'donor') ? '🔴' : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#8b5cf6', position: 'relative' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('voice');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>
                          🎙️ Voice Note {apiService.hasUnreadVoice(item.id, 'donor') ? '🔴' : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: 10, borderRadius: 10, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                      ⏳ Waiting for an NGO, Volunteer, or Person in Need to claim this food donation. Contact options will enable once claimed.
                    </Text>
                  </View>
                )}


                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id)}>
                  <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700' }}>🗑️ Delete Listing</Text>
                </TouchableOpacity>
              </View>
            ))

          )
        ) : (
          /* DONATION HISTORY TAB - DATE WISE GROUPED */
          (() => {
            const grouped = apiService.getGroupedHistoryDonations(user);
            const dateKeys = Object.keys(grouped).filter(k => grouped[k].length > 0);


            if (dateKeys.length === 0) {
              return (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📜</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Completed History Yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Completed food rescue distributions will appear in your history log under date headings!</Text>
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
                  <View key={item.id} style={[styles.donationItem, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, marginBottom: 10 }]}>
                    <View style={styles.foodImgBox}>
                      <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
                    </View>


                    <View style={styles.itemHeader}>
                      <Text style={[styles.foodTitle, { color: colors.textPrimary }]}>{item.food_name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
                        <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }}>
                          ✅ RESCUED
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.itemText, { color: colors.textSecondary }]}>📦 Quantity: {item.quantity}</Text>
                    <Text style={[styles.itemText, { color: colors.textSecondary }]}>📍 Pickup Location: {item.pickup_address}</Text>
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 4 }}>
                      🎉 Claimed By: {item.claimed_by_name || 'Community Member'} ({item.claimed_by_role || 'Recipient'})
                    </Text>

                    {/* Action Row for History Card */}
                    <View style={styles.commRow}>
                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#0284c7' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('call');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>📞 Call Claimer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#10b981', position: 'relative' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('chat');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>
                          💬 Chat {apiService.hasUnreadChat(item.id, 'donor') ? '🔴' : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.commBtn, { backgroundColor: '#8b5cf6', position: 'relative' }]}
                        onPress={() => {
                          setSelectedCommItem({ ...item, phone: item.claimed_by_phone || '+91 9876500000', food_name: item.food_name });
                          setCommType('voice');
                          setCommModalVisible(true);
                        }}
                      >
                        <Text style={styles.commBtnText}>
                          🎙️ Voice Note {apiService.hasUnreadVoice(item.id, 'donor') ? '🔴' : ''}
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

    </MobileAppFrame>
  );
}


const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  postBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLbl: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
  donationItem: {
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















  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 13,
    marginTop: 4,
  },
  dayTagBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  commBtn: {
    flex: 1,
    paddingVertical: 7,
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
  delBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
});

