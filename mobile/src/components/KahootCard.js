import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SHADOWS, SPACING, FONTS, RADIUS } from '../config';

export default function KahootCard({ 
  children, 
  color = COLORS.white,
  accentColor,
  title,
  subtitle,
  style,
  animated = false
}) {
  return (
    <View style={[
      styles.card,
      { backgroundColor: color },
      accentColor && { borderLeftColor: accentColor, borderLeftWidth: 5 },
      SHADOWS.medium,
      style
    ]}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, accentColor && { color: accentColor }]}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
});
