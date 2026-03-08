import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import KahootCard from '../components/KahootCard';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

export default function ProfileScreen({ navigation }) {
  const { user, token, logout, refreshUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    telefone: user?.telefone || '',
    bilhete_identidade: user?.bilhete_identidade || '',
    endereco: user?.endereco || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateProfile(formData, token);
      await refreshUser();
      setEditMode(false);
      Alert.alert('✅ Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTipoColor = (tipo) => {
    const colors = {
      'ADMIN': COLORS.purple,
      'POLICIA': COLORS.blue,
      'CIDADAO': COLORS.green,
    };
    return colors[tipo] || COLORS.gray;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity 
          onPress={() => setEditMode(!editMode)} 
          style={styles.editButton}
        >
          <Text style={styles.editText}>{editMode ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: getTipoColor(user?.tipo) }]}>
            <Text style={styles.avatarText}>{getInitials(user?.nome)}</Text>
          </View>
          <Text style={styles.userName}>{user?.nome}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTipoColor(user?.tipo) }]}>
            <Text style={styles.typeText}>{user?.tipo}</Text>
          </View>
        </View>

        {/* Form / Info Cards */}
        {editMode ? (
          <View style={styles.formContainer}>
            <KahootInput
              label="Nome Completo"
              value={formData.nome}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              autoCapitalize="words"
            />
            <KahootInput
              label="Telefone"
              value={formData.telefone}
              onChangeText={(text) => setFormData({ ...formData, telefone: text })}
              keyboardType="phone-pad"
            />
            <KahootInput
              label="Bilhete de Identidade"
              value={formData.bilhete_identidade}
              onChangeText={(text) => setFormData({ ...formData, bilhete_identidade: text.toUpperCase() })}
              placeholder="123456789LA123"
            />
            <KahootInput
              label="Endereço"
              value={formData.endereco}
              onChangeText={(text) => setFormData({ ...formData, endereco: text })}
            />

            <KahootButton
              title={loading ? 'Salvando...' : 'Salvar Alterações'}
              onPress={handleSave}
              color={COLORS.green}
              size="lg"
              disabled={loading}
              style={styles.saveButton}
            />
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <KahootCard title="Informações de Contato" accentColor={COLORS.blue}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📧 Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📱 Telefone</Text>
                <Text style={styles.infoValue}>{user?.telefone || 'Não informado'}</Text>
              </View>
            </KahootCard>

            <KahootCard title="Documentação" accentColor={COLORS.purple}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🪪 BI</Text>
                <Text style={styles.infoValue}>
                  {user?.bilhete_identidade || 'Não informado'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📍 Endereço</Text>
                <Text style={styles.infoValue}>{user?.endereco || 'Não informado'}</Text>
              </View>
            </KahootCard>

            <KahootCard title="Configurações de Alertas" accentColor={COLORS.orange}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>🔔 Alertas de Acidentes</Text>
                <View style={[
                  styles.toggleBadge,
                  { backgroundColor: user?.alertas_novos_acidentes ? COLORS.green : COLORS.gray }
                ]}>
                  <Text style={styles.toggleText}>
                    {user?.alertas_novos_acidentes ? 'Ativo' : 'Desativado'}
                  </Text>
                </View>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>🔊 Alertas Sonoros</Text>
                <View style={[
                  styles.toggleBadge,
                  { backgroundColor: user?.alertas_sonoros ? COLORS.green : COLORS.gray }
                ]}>
                  <Text style={styles.toggleText}>
                    {user?.alertas_sonoros ? 'Ativo' : 'Desativado'}
                  </Text>
                </View>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>📲 Alertas SMS</Text>
                <View style={[
                  styles.toggleBadge,
                  { backgroundColor: user?.alertas_sms ? COLORS.green : COLORS.gray }
                ]}>
                  <Text style={styles.toggleText}>
                    {user?.alertas_sms ? 'Ativo' : 'Desativado'}
                  </Text>
                </View>
              </View>
            </KahootCard>

            <KahootCard title="Conta" accentColor={COLORS.red}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🆔 ID</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{user?.user_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📅 Membro desde</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-AO') : '-'}
                </Text>
              </View>
            </KahootCard>
          </View>
        )}

        {/* Logout Button */}
        {!editMode && (
          <KahootButton
            title="Sair da Conta"
            onPress={handleLogout}
            color={COLORS.red}
            size="lg"
            style={styles.logoutButton}
          />
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
  editButton: {
    padding: SPACING.sm,
  },
  editText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: FONTS.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
  },
  typeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sm,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
  infoContainer: {
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  infoLabel: {
    fontSize: FONTS.sm,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: FONTS.sm,
    color: COLORS.black,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: FONTS.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  toggleLabel: {
    fontSize: FONTS.sm,
    color: COLORS.grayDark,
  },
  toggleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  toggleText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: SPACING.xl,
  },
  bottomSpacer: {
    height: 60,
  },
});
