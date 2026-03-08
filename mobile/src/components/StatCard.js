import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS, SPACING } from '../config';

export default function StatCard({ 
  value, 
  label, 
  color = COLORS.purple,
  icon,
  delay = 0 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop-in animation
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Count up animation
    Animated.timing(countAnim, {
      toValue: typeof value === 'number' ? value : 0,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const displayValue = typeof value === 'number' 
    ? countAnim.interpolate({
        inputRange: [0, value || 1],
        outputRange: ['0', String(value)],
        extrapolate: 'clamp',
      })
    : value;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Animated.Text style={styles.value}>
        {typeof value === 'number' ? Math.round(countAnim._value || 0) : value}
      </Animated.Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

// Use a functional version for the count display
export function AnimatedStatCard({ value, label, color = COLORS.purple, icon, delay = 0 }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Count animation
    if (typeof value === 'number') {
      const duration = 1000;
      const startTime = Date.now();
      const startValue = 0;
      
      const animate = () => {
        const elapsed = Date.now() - startTime - delay;
        if (elapsed < 0) {
          requestAnimationFrame(animate);
          return;
        }
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(startValue + (value - startValue) * eased));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, [value]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.value}>
        {typeof value === 'number' ? displayValue : value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.xs,
    minHeight: 100,
  },
  iconContainer: {
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONTS.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.white,
    opacity: 0.9,
    textTransform: 'uppercase',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
