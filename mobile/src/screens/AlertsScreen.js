import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';

export default function AlertsScreen() {
  const [notifications, setNotifications] = React.useState({
    newAccidents: true,
    nearbyAccidents: true,
    criticalZones: false
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Configurações de Alertas</Text>
        
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>🚨 Novos Acidentes</Text>
            <Text style={styles.settingDesc}>Receber notificação quando houver novos acidentes</Text>
          </View>
          <Switch
            value={notifications.newAccidents}
            onValueChange={(v) => setNotifications({...notifications, newAccidents: v})}
            trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
          />
        </View>
        
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>📍 Acidentes Próximos</Text>
            <Text style={styles.settingDesc}>Alertar quando houver acidentes a menos de 5km</Text>
          </View>
          <Switch
            value={notifications.nearbyAccidents}
            onValueChange={(v) => setNotifications({...notifications, nearbyAccidents: v})}
            trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
          />
        </View>
        
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>⚠️ Zonas Críticas</Text>
            <Text style={styles.settingDesc}>Alertar ao entrar em zonas de alto risco</Text>
          </View>
          <Switch
            value={notifications.criticalZones}
            onValueChange={(v) => setNotifications({...notifications, criticalZones: v})}
            trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
          />
        </View>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.infoTitle}>ℹ️ Sobre os Alertas</Text>
        <Text style={styles.infoText}>
          Os alertas em tempo real ajudam você a evitar áreas com acidentes e tomar rotas alternativas. 
          Mantenha a localização ativada para receber alertas de proximidade.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  settingInfo: {
    flex: 1
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B'
  },
  info: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20
  }
});
