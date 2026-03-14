import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootCard from '../components/KahootCard';
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
        <Text style={styles.loadingText}>A carregar reportes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.blueLight} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Reportes</Text>
        <Text style={styles.subtitle}>{reports.length} reporte{reports.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" style={{marginBottom: SPACING.md}} />
            <Text style={styles.emptyTitle}>Nenhum reporte</Text>
            <Text style={styles.emptyText}>Os seus reportes de acidentes aparecerão aqui</Text>
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={() => navigation.navigate('ReportAccident')}
            >
              <Text style={styles.reportButtonText}>Reportar Acidente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reports.map((report, index) => {
            const grav = getGravidadeStyle(report.gravidade);
            return (
              <KahootCard key={report._id || report.acidente_id || index} accentColor={grav.bg}>
                <View style={styles.reportCard}>
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
                  ) : null}

                  <View style={styles.reportMeta}>
                    <Text style={styles.metaItem}><Ionicons name="calendar-outline" size={12} color={COLORS.gray} /> {formatDate(report.created_at)}</Text>
                    <Text style={styles.metaItem}><Ionicons name="time-outline" size={12} color={COLORS.gray} /> {formatTime(report.created_at)}</Text>
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
                      <Text style={styles.statLabel}>Lat</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{report.longitude?.toFixed(3) || '-'}</Text>
                      <Text style={styles.statLabel}>Lng</Text>
                    </View>
                  </View>
                </View>
              </KahootCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
  loadingText: { color: COLORS.white, marginTop: SPACING.md, fontSize: FONTS.sm },
  header: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  backButton: { marginBottom: SPACING.sm },
  backText: { color: COLORS.blueLight, fontSize: FONTS.sm },
  title: { fontSize: FONTS.xl, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: FONTS.sm, color: COLORS.gray, marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.white, marginBottom: SPACING.xs },
  emptyText: { fontSize: FONTS.sm, color: COLORS.gray, textAlign: 'center', marginBottom: SPACING.lg },
  reportButton: { backgroundColor: COLORS.red, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  reportButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.md },
  reportCard: { padding: SPACING.sm },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  gravidadeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  gravidadeText: { color: COLORS.white, fontSize: FONTS.xs, fontWeight: 'bold', textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: FONTS.xs, fontWeight: '600' },
  reportType: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.black, marginBottom: 4, textTransform: 'capitalize' },
  reportDesc: { fontSize: FONTS.sm, color: COLORS.gray, marginBottom: SPACING.sm },
  reportMeta: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  metaItem: { fontSize: FONTS.xs, color: COLORS.gray },
  reportStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F1F5F9', borderRadius: RADIUS.sm, padding: SPACING.sm },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.black },
  statLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase', marginTop: 2 },
});
