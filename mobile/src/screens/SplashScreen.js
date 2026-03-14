import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../config';

export default function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        <Animated.View 
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.logo}>
            <Image source={require('../img/Logo_DTSER.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Animated.View 
            style={[
              styles.ring,
              { transform: [{ rotate: spin }] }
            ]}
          />
        </Animated.View>
        
        <Text style={styles.title}>DTSER</Text>
        <Text style={styles.subtitle}>Direcção de Trânsito e Segurança Rodoviária</Text>
        
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 200} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function LoadingDot({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.dot,
        { 
          opacity: anim,
          transform: [{ 
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            })
          }]
        }
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  title: {
    fontSize: FONTS.giant,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 20,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 8,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 40,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    marginHorizontal: 6,
  },
});
