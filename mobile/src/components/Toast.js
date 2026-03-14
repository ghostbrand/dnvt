import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

const { width } = Dimensions.get('window');

const TOAST_DURATION = 3000;

const TOAST_TYPES = {
  success: { icon: 'check-circle', bg: '#059669', border: '#047857', iconColor: '#FFFFFF' },
  error: { icon: 'alert-circle', bg: '#DC2626', border: '#B91C1C', iconColor: '#FFFFFF' },
  warning: { icon: 'alert-triangle', bg: '#D97706', border: '#B45309', iconColor: '#FFFFFF' },
  info: { icon: 'info', bg: '#2563EB', border: '#1D4ED8', iconColor: '#FFFFFF' },
};

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const show = useCallback((type, title, message) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title, message) => show('success', title, message),
    error: (title, message) => show('error', title, message),
    warning: (title, message) => show('warning', title, message),
    info: (title, message) => show('info', title, message),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t, index) => (
        <ToastItem key={t.id} toast={t} index={index} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({ toast, index, onDismiss }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }, TOAST_DURATION - 300);

    return () => clearTimeout(timer);
  }, []);

  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          transform: [{ translateY }],
          opacity,
          marginTop: index * 4,
        },
      ]}
    >
      <View style={styles.toastIcon}>
        <Feather name={config.icon} size={20} color={config.iconColor} />
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => onDismiss(toast.id)} style={styles.toastClose}>
        <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastIcon: {
    marginRight: 10,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  toastMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONTS.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  toastClose: {
    padding: 4,
    marginLeft: 8,
  },
});
