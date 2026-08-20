import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFoodItemImage } from '../services/apiService';

export function DonationDetailsModal({ visible, item, onClose, onAction, actionLabel }) {
  const { colors } = useTheme();

  if (!visible || !item) return null;

  const isClaimed = item.status === 'claimed' || item.claimed_by_name || item.claimed_by_role;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isClaimed ? '📜 Rescued Food Details' : '🍲 Available Surplus Meal'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Food Image & Badge */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: getFoodItemImage(item) }} style={styles.foodImg} resizeMode="cover" />
              <View style={[styles.statusBadge, { backgroundColor: isClaimed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)' }]}>
                <Text style={{ color: isClaimed ? '#10b981' : '#3b82f6', fontWeight: '800', fontSize: 12 }}>
                  {isClaimed ? '✅ CLAIMED / RESCUED' : '⚡ AVAILABLE NOW'}
                </Text>
              </View>
            </View>

            {/* Food Summary */}
            <Text style={[styles.foodName, { color: colors.textPrimary }]}>{item.food_name || 'Surplus Food Meal'}</Text>
            <Text style={[styles.foodMeta, { color: colors.textSecondary }]}>
              📦 Quantity: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.quantity || '1 Serving'}</Text> • 🏷️ Category: {item.category || 'Surplus Meal'}
            </Text>
            <Text style={[styles.foodMeta, { color: colors.textSecondary, marginTop: 4 }]}>
              ⏳ Expiry: <Text style={{ color: colors.warning || '#f59e0b', fontWeight: '700' }}>{item.expiry_time || 'Consume within 4 hours'}</Text>
            </Text>

            {item.description ? (
              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 }}>📝 Food Description:</Text>
                <Text style={{ fontSize: 13, color: colors.textPrimary }}>{item.description}</Text>
              </View>
            ) : null}

            {/* SECTION 1: DONOR DETAILS (Always visible before & after claim) */}
            <View style={[styles.detailSection, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Text style={[styles.sectionTitle, { color: '#0284c7' }]}>👨‍🍳 Food Donor Details</Text>
              <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                👤 Donor Name: <Text style={{ fontWeight: '700' }}>{item.donor_name || 'Food Donor'}</Text>
              </Text>
              <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                📞 Donor Contact: <Text style={{ fontWeight: '700' }}>{item.donor_phone || '+91 8688294029'}</Text>
              </Text>
              <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                📍 Pickup Address: <Text style={{ fontWeight: '700' }}>{item.pickup_address || 'Bavani Homes, NGO Colony'}</Text>
              </Text>
            </View>

            {/* SECTION 2: CLAIMER DETAILS (Visible ONLY after claimed) */}
            {isClaimed ? (
              <View style={[styles.detailSection, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>🎉 Food Claimer Details</Text>
                <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                  🤝 Claimed By: <Text style={{ fontWeight: '700' }}>{item.claimed_by_name || 'Community Member'}</Text>
                </Text>
                <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                  📞 Claimer Contact: <Text style={{ fontWeight: '700' }}>{item.claimed_by_phone || '+91 9876543210'}</Text>
                </Text>
                <Text style={[styles.detailRow, { color: colors.textPrimary }]}>
                  🏷️ Claimer Role: <Text style={{ fontWeight: '700' }}>{item.claimed_by_role || 'Recipient'}</Text>
                </Text>
              </View>
            ) : null}

            {/* Action Button if provided (e.g. Claim Food button before claim) */}
            {onAction && !isClaimed ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => { onClose(); onAction(item.id); }}>
                <Text style={styles.actionBtnText}>{actionLabel || '⚡ Claim Surplus Food'}</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          {/* Close Footer Button */}
          <TouchableOpacity style={[styles.closeFooterBtn, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]} onPress={onClose}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Close Details</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    flexGrow: 0,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  foodImg: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  foodMeta: {
    fontSize: 13,
  },
  infoBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  detailSection: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailRow: {
    fontSize: 13,
    marginVertical: 2,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  closeFooterBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
});
