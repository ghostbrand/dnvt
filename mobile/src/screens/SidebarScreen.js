import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, Alert, Dimensions 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SidebarScreen({ navigation }) {
  const { user, logout } = useAuth();
  const isCidadao = user?.role === 'cidadao' || user?.tipo === 'cidadao';

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout }
      ]
    );
  };

  const menuSections = [
    {
      title: 'Principal',
      items: [
        { id: 'home', label: 'Início', icon: 'home', screen: 'Home' },
        { id: 'report', label: 'Reportar Acidente', icon: 'alert-circle', screen: 'ReportAccident' },
        { id: 'history', label: 'Meus Reportes', icon: 'document-text', screen: 'MyReports' },
      ],
    },
    {
      title: 'Explorar',
      items: [
        { id: 'map', label: 'Mapa', icon: 'map', screen: 'Map' },
        ...(!isCidadao ? [
          { id: 'alerts', label: 'Todos os Acidentes', icon: 'notifications', screen: 'Alerts' },
        ] : []),
        { id: 'notif', label: 'Notificações', icon: 'mail', screen: 'Notifications' },
      ],
    },
    {
      title: 'Conta',
      items: [
        { id: 'profile', label: 'Meu Perfil', icon: 'person-circle', screen: 'Profile' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header — Profile card */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <TouchableOpacity 
          style={styles.profileCard} 
          activeOpacity={0.8}
          onPress={() => { navigation.goBack(); navigation.navigate('Profile'); }}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.nome)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.nome}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Text style={styles.profileArrow}>›</Text>
        </TouchableOpacity>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.goBack();
                  if (item.screen !== 'Home') {
                    navigation.navigate(item.screen);
                  }
                }}
              >
                <Ionicons name={item.icon} size={22} color="rgba(255,255,255,0.8)" style={styles.menuIconStyle} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out" size={22} color="#ef4444" style={styles.menuIconStyle} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>DTSER · Direcção de Trânsito</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    paddingTop: 55, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.md,
    flexDirection: 'row', justifyContent: 'flex-end',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, paddingHorizontal: SPACING.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl, padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.blue,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.lg },
  profileInfo: { flex: 1, marginLeft: SPACING.md },
  profileName: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.md },
  profileEmail: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.xs, marginTop: 2 },
  profileArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 24, fontWeight: '300' },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: FONTS.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, marginBottom: 2,
  },
  menuIconStyle: { marginRight: SPACING.md, width: 28, textAlign: 'center' },
  menuLabel: { color: COLORS.white, fontSize: FONTS.md, fontWeight: '500' },
  logoutSection: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: SPACING.md, marginTop: SPACING.sm,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  logoutText: { color: '#ef4444', fontSize: FONTS.md, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: SPACING.xl, paddingTop: SPACING.md },
  footerText: { color: 'rgba(255,255,255,0.2)', fontSize: FONTS.xs },
  footerVersion: { color: 'rgba(255,255,255,0.12)', fontSize: 10, marginTop: 4 },
});
