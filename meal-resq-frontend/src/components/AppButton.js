import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, DIMENSIONS } from '../utils/theme';

export default function AppButton({ title, onPress, variant = 'primary', style, textStyle, loading = false, disabled = false }) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';

  let btnBg = COLORS.primary;
  let txtColor = '#FFFFFF';

  if (isSecondary) btnBg = COLORS.secondary;
  if (isDanger) btnBg = COLORS.danger;
  if (isOutline) {
    btnBg = 'transparent';
    txtColor = COLORS.primary;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: btnBg, borderColor: isOutline ? COLORS.primary : 'transparent', opacity: disabled ? 0.6 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: txtColor }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    borderRadius: DIMENSIONS.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
