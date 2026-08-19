import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';

import { MobileAppFrame } from '../../components/MobileAppFrame';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { DonationCommunicationModal } from '../../components/DonationCommunicationModal';
import { useTheme } from '../../context/ThemeContext';
import { apiService, getFoodItemImage } from '../../services/apiService';

export function NeederDashboardScreen({ navigation, user, onLogout }) {

  const { colors } = useTheme();
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  // Communication Modal State
  const [commModalVisible, setCommModalVisible] = useState(false);
  const [commType, setCommType] = useState('chat'); // 'call', 'chat', 'voice'
  const [selectedCommItem, setSelectedCommItem] = useState(null);


  useEffect(() => {
    fetchFood();
    const unsubSub = apiService.subscribeToDonations(() => {
      setAvailableFood(apiService.getAvailableDonationsSync());
      fetchFood();
    });
    const interval = setInterval(() => {
      fetchFood();
    }, 3000);
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchFood();
    }) : null;
    return () => {
      if (unsubSub) unsubSub();
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);





  const fetchFood = async () => {
    try {
      const avail = await apiService.getAvailableDonations();
      if (Array.isArray(avail)) {
        setFoodItems(avail);
      }
    } catch (e) {
      console.warn('Fetch food error:', e);
    } finally {
      setLoading(false);
    }
  };



  const handleReserve = async (id) => {
    setFoodItems(prev => prev.filter(d => String(d.id) !== String(id)));
    setActiveTab('history');
    await apiService.reserveFood(id, user);
    fetchFood();
  };


  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <UserProfileHeader user={user} onLogout={onLogout} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>🤝 Community Food Assistance</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Browse and claim available fresh surplus meals for your household</Text>
        </View>

        {/* Tab Toggle Row */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16, borderColor: colors.surfaceBorder, borderWidth: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'available' ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab('available')}
          >
            <Text style={{ fontWeight: '800', fontSize: 13, color: activeTab === 'available' ? '#FFF' : colors.textSecondary }}>
              🍲 Available Meals ({foodItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'history' ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab('history')}
          >
            <Text style={{ fontWeight: '800', fontSize: 13, color: activeTab === 'history' ? '#FFF' : colors.textSecondary }}>
              📜 Claimed History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : activeTab === 'available' ? (
          foodItems.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🍲</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Food Available Right Now</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Please check back soon for newly posted surplus meals!</Text>
            </View>
          ) : (
            foodItems.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={styles.foodImgBox}>
                  <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
                </View>

                <View style={styles.cardHeader}>
                  <Text style={[styles.foodTitle, { color: colors.textPrimary }]}>{item.food_name}</Text>
                  <Text style={[styles.donorBadge, { color: colors.accentDonor }]}>👤 {item.donor_name || 'Donor'}</Text>
                </View>
                <Text style={[styles.detail, { color: colors.textSecondary }]}>📦 Quantity: {item.quantity}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                  <Text style={[styles.detail, { color: colors.textSecondary, flex: 1 }]}>📍 Location: {item.pickup_address}</Text>
                  <TouchableOpacity onPress={() => apiService.openMapLocation(item.pickup_address)} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '800' }}>📍 Navigate</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.detail, { color: colors.textSecondary }]}>📱 Phone: {item.donor_phone || '+91 9876543210'}</Text>
                <Text style={[styles.detail, { color: colors.primary, fontWeight: '800' }]}>{item.posted_at || item.created_at || '🕒 Posted Today'}</Text>

                <TouchableOpacity style={[styles.reserveBtn, { backgroundColor: colors.accentNeeder }]} onPress={() => handleReserve(item.id)}>
                  <Text style={styles.reserveBtnText}>Claim Food</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          /* NEEDER CLAIMED HISTORY TAB */
          (() => {
            const grouped = apiService.getGroupedHistoryDonations(user);
            const dateKeys = Object.keys(grouped).filter(k => grouped[k].length > 0);

            if (dateKeys.length === 0) {
              return (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📜</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Claimed History Yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Surplus food meals reserved by you will display here date-wise!</Text>
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
                      <Text style={[styles.foodTitle, { color: colors.textPrimary }]}>{item.food_name}</Text>
                      <Text style={[styles.donorBadge, { color: colors.accentDonor }]}>👤 {item.donor_name || 'Donor'}</Text>
                    </View>

                    <Text style={[styles.detail, { color: colors.textSecondary }]}>📦 Servings: {item.quantity}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                      <Text style={[styles.detail, { color: colors.textSecondary, flex: 1 }]}>📍 Pickup: {item.pickup_address}</Text>
                      <TouchableOpacity onPress={() => apiService.openMapLocation(item.pickup_address)} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '800' }}>📍 Navigate</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 8, borderRadius: 8, marginTop: 8 }}>
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                        ✅ RESERVED & CLAIMED FOR HOUSEHOLD
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
                          💬 Chat {apiService.hasUnreadChat(item.id, 'needer') ? '🔴' : ''}
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

  foodTitle: {
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
  reserveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  reserveBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

