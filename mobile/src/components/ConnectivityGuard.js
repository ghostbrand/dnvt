import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

const CHECK_INTERVAL_MS = 5000;

export default function ConnectivityGuard({ children }) {
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [internetEnabled, setInternetEnabled] = useState(true);
  const [checking, setChecking] = useState(true);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAll();
    intervalRef.current = setInterval(checkAll, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkAll();
      }
      appState.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  const checkAll = async () => {
    // Check GPS
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setGpsEnabled(enabled);
    } catch (_) {
      setGpsEnabled(false);
    }

    // Check Internet — lightweight ping
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setInternetEnabled(res.ok || res.status === 204);
    } catch (_) {
      setInternetEnabled(false);
    }

    setChecking(false);
  };

  if (checking) return null;

  if (!gpsEnabled || !internetEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather
              name={!internetEnabled ? 'wifi-off' : 'map-pin'}
              size={40}
              color={COLORS.red}
            />
          </View>
          <Text style={styles.title}>
            {!internetEnabled && !gpsEnabled
              ? 'Sem Internet e GPS'
              : !internetEnabled
              ? 'Sem Ligacao a Internet'
              : 'GPS Desactivado'}
          </Text>
          <Text style={styles.description}>
            {!internetEnabled && !gpsEnabled
              ? 'Esta aplicacao requer ligacao a internet e GPS activo para funcionar. Por favor, active ambos e tente novamente.'
              : !internetEnabled
              ? 'Esta aplicacao requer ligacao a internet para funcionar. Por favor, verifique a sua conexao Wi-Fi ou dados moveis.'
              : 'Esta aplicacao requer o GPS activo para funcionar. Por favor, active a localizacao nas definicoes do seu dispositivo.'}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Feather
                name={internetEnabled ? 'wifi' : 'wifi-off'}
                size={18}
                color={internetEnabled ? COLORS.green : COLORS.red}
              />
              <Text style={[styles.statusText, { color: internetEnabled ? COLORS.green : COLORS.red }]}>
                Internet {internetEnabled ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Feather
                name={gpsEnabled ? 'navigation' : 'navigation'}
                size={18}
                color={gpsEnabled ? COLORS.green : COLORS.red}
              />
              <Text style={[styles.statusText, { color: gpsEnabled ? COLORS.green : COLORS.red }]}>
                GPS {gpsEnabled ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>A verificar automaticamente...</Text>
        </View>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: SPACING.lg,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  hint: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
});
