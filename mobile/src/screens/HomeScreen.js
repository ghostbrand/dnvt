import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { acidentesApi, zonasApi } from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    acidentes_ativos: 0,
    zonas_criticas: 0
  });
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    fetchData();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [acidentes, zonas] = await Promise.all([
        acidentesApi.listAtivos(),
        zonasApi.list()
      ]);
      setStats({
        acidentes_ativos: acidentes.length,
        zonas_criticas: zonas.filter(z => z.nivel_risco === 'ALTO').length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: logout, style: 'destructive' }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeText}>Olá, {user?.nome?.split(' ')[0]}!</Text>
        <Text style={styles.welcomeSubtext}>Bem-vindo ao sistema DNVT</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.acidentes_ativos}</Text>
          <Text style={styles.statLabel}>Acidentes Ativos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.zonas_criticas}</Text>
          <Text style={styles.statLabel}>Zonas Alto Risco</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
        onPress={() => navigation.navigate('ReportAccident', { location })}
      >
        <Text style={styles.actionIcon}>🚨</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Reportar Acidente</Text>
          <Text style={styles.actionSubtitle}>Informe um acidente em tempo real</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#2563EB' }]}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.actionIcon}>🗺️</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Ver Mapa</Text>
          <Text style={styles.actionSubtitle}>Visualize acidentes e zonas críticas</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#059669' }]}
        onPress={() => navigation.navigate('Alerts')}
      >
        <Text style={styles.actionIcon}>🔔</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Alertas</Text>
          <Text style={styles.actionSubtitle}>Receba notificações de acidentes</Text>
        </View>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileButtonText}>👤 Meu Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  welcome: {
    backgroundColor: '#0F172A',
    padding: 20,
    paddingTop: 10
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  welcomeSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  statLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16
  },
  actionText: {
    flex: 1
  },
  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2
  },
  profileButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center'
  },
  profileButtonText: {
    color: '#0F172A',
    fontWeight: '600'
  },
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center'
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '600'
  }
});
