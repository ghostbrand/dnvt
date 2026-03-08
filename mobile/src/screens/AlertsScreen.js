import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootCard from '../components/KahootCard';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

export default function AlertsScreen({ navigation }) {
  const { token } = useAuth();
  const [accidents, setAccidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getAcidentesAtivos(token);
      setAccidents(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGravidadeColor = (gravidade) => {
    const colors = {
      'FATAL': COLORS.red,
      'GRAVE': COLORS.orange,
      'MODERADO': COLORS.yellow,
      'LEVE': COLORS.green,
    };
    return colors[gravidade] || COLORS.gray;
  };

  const getGravidadeEmoji = (gravidade) => {
    const emojis = {
      'FATAL': '🔴',
      'GRAVE': '🟠',
      'MODERADO': '🟡',
      'LEVE': '🟢',
    };
    return emojis[gravidade] || '⚪';
  };

  const filteredAccidents = accidents.filter(a => {
    if (filter === 'ALL') return true;
    return a.gravidade === filter;
  });

  const filters = [
    { id: 'ALL', label: 'Todos', color: COLORS.purple },
    { id: 'FATAL', label: 'Fatal', color: COLORS.red },
    { id: 'GRAVE', label: 'Grave', color: COLORS.orange },
    { id: 'MODERADO', label: 'Moderado', color: COLORS.yellow },
    { id: 'LEVE', label: 'Leve', color: COLORS.green },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alertas</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{accidents.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterTab,
              { backgroundColor: filter === f.id ? f.color : 'rgba(255,255,255,0.1)' }
            ]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Alerts List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.white}
          />
        }
      >
        {filteredAccidents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>Nenhum acidente ativo</Text>
            <Text style={styles.emptySubtext}>As ruas estão seguras!</Text>
          </View>
        ) : (
          filteredAccidents.map((accident) => (
            <TouchableOpacity 
              key={accident.acidente_id}
              activeOpacity={0.9}
            >
              <View style={[
                styles.alertCard,
                { borderLeftColor: getGravidadeColor(accident.gravidade) }
              ]}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertEmoji}>
                    {getGravidadeEmoji(accident.gravidade)}
                  </Text>
                  <View style={styles.alertHeaderText}>
                    <Text style={styles.alertType}>
                      {accident.tipo_acidente?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.alertTime}>
                      {new Date(accident.created_at).toLocaleString('pt-AO')}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getGravidadeColor(accident.gravidade) }
                  ]}>
                    <Text style={styles.statusText}>{accident.gravidade}</Text>
                  </View>
                </View>
                
                <Text style={styles.alertDesc} numberOfLines={2}>
                  {accident.descricao}
                </Text>
                
                <View style={styles.alertFooter}>
                  <View style={styles.alertStat}>
                    <Text style={styles.alertStatEmoji}>🚗</Text>
                    <Text style={styles.alertStatText}>
                      {accident.numero_veiculos} veículo(s)
                    </Text>
                  </View>
                  <View style={styles.alertStat}>
                    <Text style={styles.alertStatEmoji}>👤</Text>
                    <Text style={styles.alertStatText}>
                      {accident.numero_vitimas} vítima(s)
                    </Text>
                  </View>
                  <View style={styles.alertStat}>
                    <Text style={styles.alertStatEmoji}>📍</Text>
                    <Text style={styles.alertStatText}>
                      {accident.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backText: {
    color: COLORS.white,
    fontSize: FONTS.md,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
    minWidth: 30,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sm,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    marginRight: SPACING.sm,
  },
  filterText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONTS.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: FONTS.md,
    marginTop: SPACING.xs,
  },
  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  alertEmoji: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  alertHeaderText: {
    flex: 1,
  },
  alertType: {
    fontSize: FONTS.md,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  alertTime: {
    fontSize: FONTS.xs,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: 'bold',
  },
  alertDesc: {
    fontSize: FONTS.sm,
    color: COLORS.grayDark,
    marginBottom: SPACING.sm,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  alertStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertStatEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  alertStatText: {
    fontSize: FONTS.xs,
    color: COLORS.gray,
  },
  bottomSpacer: {
    height: 40,
  },
});
