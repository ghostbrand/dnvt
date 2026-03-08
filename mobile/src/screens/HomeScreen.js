import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootCard from '../components/KahootCard';
import { AnimatedStatCard } from '../components/StatCard';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAccidents, setRecentAccidents] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadData();
    
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

  const loadData = async () => {
    try {
      const [statsData, accidentsData] = await Promise.all([
        api.getEstatisticas(),
        api.getAcidentesAtivos(token)
      ]);
      setStats(statsData);
      setRecentAccidents(accidentsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const menuItems = [
    { 
      id: 'map', 
      title: 'Ver Mapa', 
      emoji: '🗺️', 
      color: COLORS.blue,
      screen: 'Map',
      description: 'Acidentes em tempo real'
    },
    { 
      id: 'report', 
      title: 'Reportar', 
      emoji: '🚨', 
      color: COLORS.red,
      screen: 'ReportAccident',
      description: 'Reportar acidente'
    },
    { 
      id: 'alerts', 
      title: 'Alertas', 
      emoji: '🔔', 
      color: COLORS.orange,
      screen: 'Alerts',
      description: 'Notificações'
    },
    { 
      id: 'profile', 
      title: 'Perfil', 
      emoji: '👤', 
      color: COLORS.purple,
      screen: 'Profile',
      description: 'Meus dados'
    },
  ];

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
        <View>
          <Text style={styles.greeting}>Olá, {user?.nome?.split(' ')[0]}! 👋</Text>
          <Text style={styles.headerSubtitle}>Bem-vindo ao DNVT</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
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
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Accidents */}
        {recentAccidents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Acidentes Recentes</Text>
            {recentAccidents.map((accident, index) => (
              <KahootCard 
                key={accident.acidente_id}
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
    backgroundColor: COLORS.purple,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: '600',
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
  menuEmoji: {
    fontSize: 36,
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
});
