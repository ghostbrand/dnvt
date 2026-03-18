import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { Ionicons } from '@expo/vector-icons';

export default function MyReportsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = async () => {
    try {
      const all = await api.getAcidentes(token);
      const userId = user?.id || user?._id;
      const mine = all.filter(a => 
        a.created_by === userId || a.created_by === user?.email
      );
      setReports(mine.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const getGravidadeStyle = (gravidade) => {
    const map = {
      GRAVE: { bg: COLORS.red, label: 'Grave' },
      MODERADO: { bg: COLORS.orange, label: 'Moderado' },
      LEVE: { bg: COLORS.green, label: 'Leve' },
    };
    return map[gravidade] || { bg: COLORS.gray, label: gravidade };
  };

  const getStatusLabel = (status) => {
    const map = {
      REPORTADO: 'Reportado',
      VALIDADO: 'Validado',
      EM_ATENDIMENTO: 'Em Atendimento',
      RESOLVIDO: 'Resolvido',
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      REPORTADO: '#EAB308',
      VALIDADO: '#3B82F6',
      EM_ATENDIMENTO: '#F97316',
      RESOLVIDO: '#22C55E',
    };
    return map[status] || COLORS.gray;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>A carregar relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Histórico pessoal</Text>
          <Text style={styles.title}>Meus Reportes</Text>
          <Text style={styles.subtitle}>{reports.length} reporte{reports.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={42} color={COLORS.white} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum reporte ainda</Text>
            <Text style={styles.emptyText}>Os seus reportes de acidentes vão aparecer aqui assim que enviar o primeiro.</Text>
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={() => navigation.navigate('ReportAccident')}
            >
              <Text style={styles.reportButtonText}>Novo Reporte</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reports.map((report, index) => {
            const grav = getGravidadeStyle(report.gravidade);
            return (
              <TouchableOpacity
                key={report._id || report.acidente_id || index}
                style={styles.reportCard}
                activeOpacity={0.92}
                onPress={() => navigation.navigate('AccidentDetail', { accidentId: report._id || report.acidente_id })}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.gravidadeBadge, { backgroundColor: grav.bg }]}>
                    <Text style={styles.gravidadeText}>{grav.label}</Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(report.status) }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(report.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                      {getStatusLabel(report.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reportType}>
                  {report.tipo_acidente?.replace(/_/g, ' ') || 'Acidente'}
                </Text>
                
                {report.descricao ? (
                  <Text style={styles.reportDesc} numberOfLines={2}>{report.descricao}</Text>
                ) : (
                  <Text style={styles.reportDesc} numberOfLines={2}>Sem descrição adicional.</Text>
                )}

                <View style={styles.reportMetaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={13} color="#CBD5E1" />
                    <Text style={styles.metaText}>{formatDate(report.created_at)}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={13} color="#CBD5E1" />
                    <Text style={styles.metaText}>{formatTime(report.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.reportStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{report.numero_vitimas || 0}</Text>
                    <Text style={styles.statLabel}>Vítimas</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{report.numero_veiculos || 0}</Text>
                    <Text style={styles.statLabel}>Veículos</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{report.latitude?.toFixed(3) || '-'}</Text>
                    <Text style={styles.statLabel}>Latitude</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{report.longitude?.toFixed(3) || '-'}</Text>
                    <Text style={styles.statLabel}>Longitude</Text>
                  </View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.cardPrimaryAction}
                    onPress={() => navigation.navigate('AccidentDetail', { accidentId: report._id || report.acidente_id })}
                  >
                    <Text style={styles.cardPrimaryActionText}>Ver detalhes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardSecondaryAction}
                    onPress={() => navigation.navigate('Map', { focusAccidentId: report._id || report.acidente_id })}
                  >
                    <Ionicons name="map-outline" size={16} color={COLORS.white} />
                    <Text style={styles.cardSecondaryActionText}>Ver no mapa</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#05070B' },
  loadingText: { color: COLORS.white, marginTop: SPACING.md, fontSize: FONTS.sm },
  header: {
    paddingTop: 54,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 36 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 70,
    backgroundColor: '#10161F',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: '#0B72FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.white, marginBottom: SPACING.xs },
  emptyText: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.68)', textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 20 },
  reportButton: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 18
  },
  reportButtonText: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.md },
  reportCard: {
    backgroundColor: '#10161F',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 14,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  gravidadeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  gravidadeText: { color: COLORS.white, fontSize: FONTS.xs, fontWeight: 'bold', textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: FONTS.xs, fontWeight: '600' },
  reportType: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 6, textTransform: 'capitalize' },
  reportDesc: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.68)', marginBottom: SPACING.sm, lineHeight: 20 },
  reportMetaRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: FONTS.xs,
    color: '#CBD5E1',
    marginLeft: 6,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: SPACING.sm
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md,
  },
  cardPrimaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#0B72FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPrimaryActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  cardSecondaryAction: {
    minWidth: 126,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  cardSecondaryActionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FONTS.md, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', marginTop: 2 },
});
