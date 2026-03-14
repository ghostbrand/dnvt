import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootCard from '../components/KahootCard';
import { AnimatedStatCard } from '../components/StatCard';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAccidents, setRecentAccidents] = useState([]);
  const [urgencias, setUrgencias] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const isCidadao = user?.role === 'cidadao' || user?.tipo === 'cidadao';
  const isAgent = !isCidadao;

  useEffect(() => {
    loadData();
    loadNotifCount();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadNotifCount = async () => {
    try {
      const data = await api.getNotificacoes(token);
      if (Array.isArray(data)) {
        setNotifCount(data.filter(n => !n.lida).length);
      }
    } catch (_) {}
  };

  const loadData = async () => {
    try {
      if (isCidadao) {
        // Citizen: only show their own reported accidents
        const accidentsData = await api.getAcidentes(token);
        const userId = user?.id || user?._id;
        const myAccidents = accidentsData.filter(a => 
          a.created_by === userId || a.created_by === user?.email
        );
        setRecentAccidents(myAccidents.slice(0, 5));
        setStats({
          meus_reportes: myAccidents.length,
          ativos: myAccidents.filter(a => ['REPORTADO','VALIDADO','EM_ATENDIMENTO'].includes(a.status)).length,
          resolvidos: myAccidents.filter(a => a.status === 'RESOLVIDO').length,
        });
      } else {
        // Agent: see all accidents + urgencies from monitored zones
        const [statsData, accidentsData, urgenciasData] = await Promise.all([
          api.getEstatisticas(),
          api.getAcidentesAtivos(token),
          api.getUrgencias(token).catch(() => [])
        ]);
        setStats(statsData);
        setRecentAccidents(accidentsData.slice(0, 5));
        setUrgencias(urgenciasData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadNotifCount()]);
    setRefreshing(false);
  };

  const allMenuItems = [
    { 
      id: 'report', 
      title: 'Reportar Acidente', 
      icon: 'alert-circle', 
      iconType: 'ion',
      color: COLORS.red,
      screen: 'ReportAccident',
      description: 'Reportar ocorrência'
    },
    { 
      id: 'history', 
      title: 'Meus Reportes', 
      icon: 'document-text', 
      iconType: 'ion',
      color: COLORS.blue,
      screen: 'MyReports',
      description: 'Histórico de reportes'
    },
    { 
      id: 'alerts', 
      title: 'Alertas', 
      icon: 'notifications', 
      iconType: 'ion',
      color: COLORS.orange,
      screen: 'Alerts',
      description: 'Todos os acidentes',
      hideForCidadao: true,
    },
    { 
      id: 'map', 
      title: 'Mapa', 
      icon: 'map', 
      iconType: 'ion',
      color: COLORS.purple,
      screen: 'Map',
      description: 'Ver mapa'
    },
  ];

  const menuItems = isCidadao 
    ? allMenuItems.filter(i => !i.hideForCidadao) 
    : allMenuItems;

  const getGravidadeColor = (gravidade) => {
    const colors = {
      'FATAL': COLORS.red,
      'GRAVE': COLORS.orange,
      'MODERADO': COLORS.yellow,
      'LEVE': COLORS.green,
    };
    return colors[gravidade] || COLORS.gray;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Sidebar')} style={styles.menuButton}>
          <Ionicons name="menu" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Olá, {user?.nome?.split(' ')[0]}!</Text>
          <Text style={styles.headerSubtitle}>Bem-vindo ao DNVT</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifButton}>
          <Ionicons name="notifications" size={20} color={COLORS.white} />
          {notifCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
        {/* Stats Cards */}
        <Animated.View 
          style={[
            styles.statsContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {isCidadao ? (
            <View style={styles.statsRow}>
              <AnimatedStatCard 
                value={stats?.meus_reportes || 0}
                label="Meus Reportes"
                color={COLORS.blue}
                delay={0}
              />
              <AnimatedStatCard 
                value={stats?.ativos || 0}
                label="Ativos"
                color={COLORS.orange}
                delay={100}
              />
              <AnimatedStatCard 
                value={stats?.resolvidos || 0}
                label="Resolvidos"
                color={COLORS.green}
                delay={200}
              />
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <AnimatedStatCard 
                  value={stats?.acidentes_ativos || 0}
                  label="Acidentes Ativos"
                  color={COLORS.red}
                  delay={0}
                />
                <AnimatedStatCard 
                  value={stats?.acidentes_hoje || 0}
                  label="Hoje"
                  color={COLORS.orange}
                  delay={100}
                />
              </View>
              <View style={styles.statsRow}>
                <AnimatedStatCard 
                  value={stats?.assistencias_ativas || 0}
                  label="Assistências"
                  color={COLORS.blue}
                  delay={200}
                />
                <AnimatedStatCard 
                  value={stats?.total_acidentes || 0}
                  label="Total"
                  color={COLORS.purple}
                  delay={300}
                />
              </View>
            </>
          )}
        </Animated.View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: item.color }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              {item.iconType === 'ion' 
                ? <Ionicons name={item.icon} size={32} color={COLORS.white} style={styles.menuIconStyle} />
                : <MaterialCommunityIcons name={item.icon} size={32} color={COLORS.white} style={styles.menuIconStyle} />
              }
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgencies — agent only */}
        {isAgent && urgencias.length > 0 && (
          <>
            <View style={styles.urgencyHeader}>
              <Text style={styles.sectionTitle}>Urgências na Sua Zona</Text>
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyBadgeText}>{urgencias.length}</Text>
              </View>
            </View>
            {urgencias.slice(0, 3).map((urg, index) => (
              <TouchableOpacity
                key={urg._id || urg.acidente_id || index}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AccidentDetail', { accidentId: urg._id || urg.acidente_id })}
              >
                <KahootCard accentColor={COLORS.red} style={styles.accidentCard}>
                  <View style={styles.accidentHeader}>
                    <View style={[styles.gravityBadge, { backgroundColor: COLORS.red }]}>
                      <Text style={styles.gravityText}>URGÊNCIA</Text>
                    </View>
                    <Text style={styles.accidentType}>
                      {urg.tipo_acidente?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.accidentDesc} numberOfLines={2}>
                    {urg.descricao}
                  </Text>
                  <View style={styles.urgencyFooter}>
                    <Text style={styles.accidentTime}>
                      {new Date(urg.created_at).toLocaleString('pt-AO')}
                    </Text>
                    <View style={styles.routeHint}>
                      <Ionicons name="navigate" size={12} color={COLORS.blue} />
                      <Text style={styles.routeHintText}>Ver rota</Text>
                    </View>
                  </View>
                </KahootCard>
              </TouchableOpacity>
            ))}
            {urgencias.length > 3 && (
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('Alerts')}
              >
                <Text style={styles.seeAllText}>Ver todas as {urgencias.length} urgências</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.blue} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Recent Accidents */}
        {recentAccidents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {isAgent ? 'Todos os Acidentes Ativos' : 'Acidentes Recentes'}
            </Text>
            {recentAccidents.map((accident, index) => (
              <TouchableOpacity
                key={accident._id || accident.acidente_id || index}
                activeOpacity={0.85}
                onPress={() => isAgent
                  ? navigation.navigate('AccidentDetail', { accidentId: accident._id || accident.acidente_id })
                  : null
                }
              >
                <KahootCard 
                  accentColor={getGravidadeColor(accident.gravidade)}
                  style={styles.accidentCard}
                >
                  <View style={styles.accidentHeader}>
                    <View style={[
                      styles.gravityBadge, 
                      { backgroundColor: getGravidadeColor(accident.gravidade) }
                    ]}>
                      <Text style={styles.gravityText}>{accident.gravidade}</Text>
                    </View>
                    <Text style={styles.accidentType}>
                      {accident.tipo_acidente?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.accidentDesc} numberOfLines={2}>
                    {accident.descricao}
                  </Text>
                  <Text style={styles.accidentTime}>
                    {new Date(accident.created_at).toLocaleString('pt-AO')}
                  </Text>
                </KahootCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  greeting: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 2,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  statsContainer: {
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  menuItem: {
    width: (width - SPACING.md * 2 - SPACING.sm) / 2,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  menuIconStyle: {
    marginBottom: SPACING.sm,
  },
  menuTitle: {
    fontSize: FONTS.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  menuDesc: {
    fontSize: FONTS.xs,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
  },
  accidentCard: {
    marginBottom: SPACING.sm,
  },
  accidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  gravityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  gravityText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: 'bold',
  },
  accidentType: {
    fontSize: FONTS.sm,
    color: COLORS.gray,
    flex: 1,
  },
  accidentDesc: {
    fontSize: FONTS.sm,
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  accidentTime: {
    fontSize: FONTS.xs,
    color: COLORS.gray,
  },
  bottomSpacer: {
    height: 40,
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  urgencyBadge: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  urgencyBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: 'bold',
  },
  urgencyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeHintText: {
    fontSize: FONTS.xs,
    color: COLORS.blue,
    fontWeight: '600',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: FONTS.sm,
    color: COLORS.blue,
    fontWeight: '600',
  },
});
