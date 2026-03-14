import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, Modal, Animated, Dimensions 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(height))[0];

  const loadNotifs = useCallback(async () => {
    try {
      const data = await api.getNotificacoes(token);
      if (Array.isArray(data)) setNotifs(data);
    } catch (_) {}
    setLoading(false);
  }, [token]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifs();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await api.marcarTodasLidas(token);
      setNotifs(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (_) {}
  };

  const openNotif = async (notif) => {
    setSelectedNotif(notif);
    setSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 9,
      useNativeDriver: true,
    }).start();
    if (!notif.lida) {
      try {
        await api.marcarNotifLida(notif._id, token);
        setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, lida: true } : n));
      } catch (_) {}
    }
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedNotif(null);
    });
  };

  const unreadCount = notifs.filter(n => !n.lida).length;

  const formatTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const renderNotif = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notifItem, !item.lida && styles.notifUnread]}
      onPress={() => openNotif(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notifDot, !item.lida && styles.notifDotActive]} />
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.lida && styles.notifTitleBold]} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.notifMsg} numberOfLines={2}>{item.mensagem}</Text>
      </View>
      <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Ler todas</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 70 }} />}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBar}>
          <Text style={styles.unreadText}>{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={notifs}
        renderItem={renderNotif}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={56} color="rgba(255,255,255,0.3)" style={{marginBottom: SPACING.md}} />
            <Text style={styles.emptyTitle}>Sem notificações</Text>
            <Text style={styles.emptyDesc}>Quando a central enviar uma mensagem, ela aparecerá aqui.</Text>
          </View>
        }
        contentContainerStyle={notifs.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
      />

      {/* Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSheet}>
          <Animated.View style={[styles.sheetContent, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheetHandle} />
              {selectedNotif && (
                <View style={styles.sheetBody}>
                  <Text style={styles.sheetTitle}>{selectedNotif.titulo}</Text>
                  <Text style={styles.sheetDate}>
                    {selectedNotif.created_at ? new Date(selectedNotif.created_at).toLocaleString('pt-AO') : ''}
                  </Text>
                  <View style={styles.sheetDivider} />
                  <Text style={styles.sheetMessage}>{selectedNotif.mensagem}</Text>
                  <View style={styles.sheetFooter}>
                    <Text style={styles.sheetFooterText}>Central DTSER · Notificação</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 55, paddingBottom: SPACING.md, paddingHorizontal: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  backText: { color: COLORS.white, fontSize: FONTS.md },
  headerTitle: { color: COLORS.white, fontSize: FONTS.xl, fontWeight: 'bold' },
  markAllBtn: { padding: SPACING.xs },
  markAllText: { color: COLORS.blue, fontSize: FONTS.sm, fontWeight: '600' },
  unreadBar: {
    backgroundColor: 'rgba(59,130,246,0.15)', paddingVertical: 6, paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
  },
  unreadText: { color: COLORS.blue, fontSize: FONTS.xs, fontWeight: '600', textAlign: 'center' },
  notifItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  notifUnread: { backgroundColor: 'rgba(59,130,246,0.06)' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', marginRight: SPACING.sm },
  notifDotActive: { backgroundColor: COLORS.blue },
  notifContent: { flex: 1, marginRight: SPACING.sm },
  notifTitle: { color: COLORS.white, fontSize: FONTS.sm, opacity: 0.7 },
  notifTitleBold: { fontWeight: 'bold', opacity: 1 },
  notifMsg: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.xs, marginTop: 2 },
  notifTime: { color: 'rgba(255,255,255,0.35)', fontSize: FONTS.xs },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: COLORS.white, fontSize: FONTS.lg, fontWeight: 'bold', marginBottom: SPACING.xs },
  emptyDesc: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.sm, textAlign: 'center' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, maxHeight: height * 0.6,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  sheetBody: { paddingHorizontal: 24, paddingTop: 8 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B2A4A', marginBottom: 4 },
  sheetDate: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  sheetDivider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 16 },
  sheetMessage: { fontSize: 15, color: '#334155', lineHeight: 22 },
  sheetFooter: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  sheetFooterText: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
});
