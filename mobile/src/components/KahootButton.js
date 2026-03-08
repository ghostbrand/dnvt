import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated,
  View 
} from 'react-native';
import { COLORS, SHADOWS, SPACING, FONTS, RADIUS } from '../config';

export default function KahootButton({ 
  title, 
  onPress, 
  color = COLORS.purple,
  shadowColor,
  icon,
  size = 'md',
  disabled = false,
  style,
  textStyle 
}) {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const sizeStyles = {
    sm: { paddingVertical: 12, paddingHorizontal: 20, fontSize: FONTS.sm },
    md: { paddingVertical: 16, paddingHorizontal: 28, fontSize: FONTS.md },
    lg: { paddingVertical: 20, paddingHorizontal: 36, fontSize: FONTS.lg },
    xl: { paddingVertical: 24, paddingHorizontal: 48, fontSize: FONTS.xl },
  };

  // Calculate darker shade for bottom border
  const darkerColor = adjustColor(color, -40);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? COLORS.gray : color,
            borderBottomColor: disabled ? COLORS.grayDark : darkerColor,
            paddingVertical: sizeStyles[size].paddingVertical,
            paddingHorizontal: sizeStyles[size].paddingHorizontal,
          },
          shadowColor && SHADOWS.colored(shadowColor),
        ]}
      >
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[
            styles.text, 
            { fontSize: sizeStyles[size].fontSize },
            textStyle
          ]}>
            {title}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper function to darken/lighten colors
function adjustColor(color, amount) {
  const clamp = (num) => Math.min(255, Math.max(0, num));
  
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);
  
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: SPACING.sm,
  },
  text: {
    color: COLORS.white,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
