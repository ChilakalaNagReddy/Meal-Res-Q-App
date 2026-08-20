import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, DIMENSIONS } from '../utils/theme';

export default function StatusBadge({ status = 'available', label }) {
  const isAvailable = status === 'available';
  const isClaimed = status === 'claimed';
  const isEnRoute = status === 'en_route';

  let bg = 'rgba(16, 185, 129, 0.2)';
  let fg = COLORS.success;
  let text = label || 'AVAILABLE';

  if (isClaimed) {
    bg = 'rgba(59, 130, 246, 0.2)';
    fg = COLORS.accentDonor;
    text = label || 'RESCUED';
  } else if (isEnRoute) {
    bg = 'rgba(245, 158, 11, 0.2)';
    fg = COLORS.warning;
    text = label || 'EN ROUTE';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: DIMENSIONS.borderRadiusSm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
