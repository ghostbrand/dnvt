import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import KahootCard from '../components/KahootCard';
import OtpInput from '../components/OtpInput';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { useToast } from '../components/Toast';

export default function ProfileScreen({ navigation }) {
  const { user, token, logout, refreshUser } = useAuth();
  const toast = useToast();
  const isCidadao = user?.role === 'cidadao' || user?.tipo === 'cidadao';

  // Edit mode: 'none' | 'email' | 'telefone'
  const [editField, setEditField] = useState('none');
  const [loading, setLoading] = useState(false);

  // Edit email state
  const [newEmail, setNewEmail] = useState('');
  const [emailValidating, setEmailValidating] = useState(false);

  // Edit phone state
  const [newTelefone, setNewTelefone] = useState('');
  const [phoneStep, setPhoneStep] = useState(1); // 1=enter phone, 2=otp
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // GPS location state
  const [locationData, setLocationData] = useState({ provincia: null, endereco: null, loading: true });

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationData(prev => ({ ...prev, loading: false, provincia: 'Sem permissao GPS', endereco: 'Sem permissao GPS' }));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const provincia = geo.region || geo.subregion || geo.city || 'Desconhecida';
        const parts = [geo.street, geo.streetNumber, geo.district, geo.city].filter(Boolean);
        const endereco = parts.length > 0 ? parts.join(', ') : 'Desconhecido';
        setLocationData({ provincia, endereco, loading: false });
        // Auto-save to profile
        try {
          await api.updateProfile({ provincia, endereco }, token);
        } catch (_) {}
      } else {
        setLocationData(prev => ({ ...prev, loading: false }));
      }
    } catch (_) {
      setLocationData(prev => ({ ...prev, loading: false, provincia: 'Erro GPS', endereco: 'Erro GPS' }));
    }
  };

  // === Email edit flow ===
  const startEditEmail = () => {
    setEditField('email');
    setNewEmail(user?.email || '');
  };

  const handleValidateAndSaveEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return toast.warning('Erro', 'Email e obrigatorio');
    if (trimmed === (user?.email || '').toLowerCase()) {
      setEditField('none');
      return;
    }
    setEmailValidating(true);
    try {
      const result = await api.validarEmail(trimmed);
      if (!result.valido) {
        toast.error('Erro', result.erro || 'Email invalido');
        return;
      }
      // Email is valid — save it
      await api.updateProfile({ email: trimmed }, token);
      await refreshUser();
      setEditField('none');
      toast.success('Sucesso', 'Email atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro', err.message || 'Erro ao atualizar email');
    } finally {
      setEmailValidating(false);
    }
  };

  // === Phone edit flow ===
  const startEditPhone = () => {
    setEditField('telefone');
    setNewTelefone(user?.telefone || '');
    setPhoneStep(1);
    setOtpCode('');
  };

  const handleSendPhoneOtp = async () => {
    const trimmed = newTelefone.trim();
    if (!trimmed) return toast.warning('Erro', 'Telefone e obrigatorio');
    if (trimmed === (user?.telefone || '')) {
      setEditField('none');
      return;
    }
    setSendingOtp(true);
    try {
      const result = await api.enviarOtp(trimmed);
      if (result.success) {
        setPhoneStep(2);
      } else {
        toast.error('Erro', result.error || 'Erro ao enviar codigo');
      }
    } catch (err) {
      toast.error('Erro', err.message || 'Erro ao enviar codigo');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      return toast.warning('Erro', 'Insira o codigo de 6 digitos');
    }
    setVerifyingOtp(true);
    try {
      const result = await api.verificarOtp(newTelefone.trim(), otpCode.trim());
      if (!result.valido) {
        toast.error('Erro', result.erro || 'Codigo invalido');
        return;
      }
      // OTP valid — save phone
      await api.updateProfile({ telefone: newTelefone.trim() }, token);
      await refreshUser();
      setEditField('none');
      toast.success('Sucesso', 'Telefone atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro', err.message || 'Erro ao verificar codigo');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const cancelEdit = () => {
    setEditField('none');
    setPhoneStep(1);
    setOtpCode('');
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
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 38 }} />
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

        {/* === Email Edit Panel === */}
        {editField === 'email' && (
          <View style={styles.editPanel}>
            <Text style={styles.editPanelTitle}>Alterar Email</Text>
            <Text style={styles.editPanelDesc}>O novo email sera validado antes de ser guardado.</Text>
            <KahootInput
              label="Novo Email"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="novo@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.editPanelActions}>
              <TouchableOpacity onPress={cancelEdit} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <KahootButton
                title={emailValidating ? 'Validando...' : 'Validar e Guardar'}
                onPress={handleValidateAndSaveEmail}
                color={COLORS.green}
                size="md"
                disabled={emailValidating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* === Phone Edit Panel === */}
        {editField === 'telefone' && (
          <View style={styles.editPanel}>
            <Text style={styles.editPanelTitle}>Alterar Telefone</Text>
            {phoneStep === 1 ? (
              <>
                <Text style={styles.editPanelDesc}>Enviaremos um codigo SMS para validar o novo numero.</Text>
                <KahootInput
                  label="Novo Telefone"
                  value={newTelefone}
                  onChangeText={setNewTelefone}
                  placeholder="+244 923 456 789"
                  keyboardType="phone-pad"
                />
                <View style={styles.editPanelActions}>
                  <TouchableOpacity onPress={cancelEdit} style={styles.editCancelBtn}>
                    <Text style={styles.editCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <KahootButton
                    title={sendingOtp ? 'Enviando...' : 'Enviar Codigo SMS'}
                    onPress={handleSendPhoneOtp}
                    color={COLORS.orange}
                    size="md"
                    disabled={sendingOtp}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.editPanelDesc}>Insira o codigo de 6 digitos enviado para {newTelefone}.</Text>
                <OtpInput value={otpCode} onChange={setOtpCode} />
                <View style={styles.editPanelActions}>
                  <TouchableOpacity onPress={() => setPhoneStep(1)} style={styles.editCancelBtn}>
                    <Text style={styles.editCancelText}>Voltar</Text>
                  </TouchableOpacity>
                  <KahootButton
                    title={verifyingOtp ? 'Verificando...' : 'Verificar e Guardar'}
                    onPress={handleVerifyPhoneOtp}
                    color={COLORS.green}
                    size="md"
                    disabled={verifyingOtp}
                    style={{ flex: 1 }}
                  />
                </View>
                <TouchableOpacity onPress={handleSendPhoneOtp} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Reenviar codigo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* === Info Cards (read-only view) === */}
        {editField === 'none' && (
          <View style={styles.infoContainer}>
            <KahootCard title="Informacoes de Contacto" accentColor={COLORS.blue}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="mail" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <View style={styles.infoValueRow}>
                  <Text style={styles.infoValue} numberOfLines={1}>{user?.email}</Text>
                  <TouchableOpacity onPress={startEditEmail} style={styles.editIconBtn}>
                    <Feather name="edit-2" size={14} color={COLORS.blue} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="phone" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>Telefone</Text>
                </View>
                <View style={styles.infoValueRow}>
                  <Text style={styles.infoValue}>{user?.telefone || 'Nao informado'}</Text>
                  <TouchableOpacity onPress={startEditPhone} style={styles.editIconBtn}>
                    <Feather name="edit-2" size={14} color={COLORS.blue} />
                  </TouchableOpacity>
                </View>
              </View>
            </KahootCard>

            <KahootCard title="Documentacao" accentColor={COLORS.purple}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="credit-card" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>BI</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user?.bilhete_identidade || 'Nao informado'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="map-pin" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>Localizacao</Text>
                </View>
                {locationData.loading ? (
                  <ActivityIndicator size="small" color={COLORS.blue} />
                ) : (
                  <Text style={styles.infoValue}>{locationData.endereco || 'Desconhecido'}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="navigation" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>Provincia</Text>
                </View>
                {locationData.loading ? (
                  <ActivityIndicator size="small" color={COLORS.blue} />
                ) : (
                  <View style={styles.infoValueRow}>
                    <Text style={styles.infoValue}>{locationData.provincia || 'Desconhecida'}</Text>
                    <TouchableOpacity onPress={detectLocation} style={styles.editIconBtn}>
                      <Feather name="refresh-cw" size={13} color={COLORS.green} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KahootCard>

            {/* Hide alert settings for citizens */}
            {!isCidadao && (
              <KahootCard title="Configuracoes de Alertas" accentColor={COLORS.orange}>
                <View style={styles.toggleRow}>
                  <View style={styles.infoLabelRow}>
                    <Feather name="bell" size={14} color={COLORS.gray} />
                    <Text style={styles.toggleLabel}>Alertas de Acidentes</Text>
                  </View>
                  <View style={[styles.toggleBadge, { backgroundColor: user?.alertas_novos_acidentes ? COLORS.green : COLORS.gray }]}>
                    <Text style={styles.toggleText}>{user?.alertas_novos_acidentes ? 'Ativo' : 'Desativado'}</Text>
                  </View>
                </View>
                <View style={styles.toggleRow}>
                  <View style={styles.infoLabelRow}>
                    <Feather name="volume-2" size={14} color={COLORS.gray} />
                    <Text style={styles.toggleLabel}>Alertas Sonoros</Text>
                  </View>
                  <View style={[styles.toggleBadge, { backgroundColor: user?.alertas_sonoros ? COLORS.green : COLORS.gray }]}>
                    <Text style={styles.toggleText}>{user?.alertas_sonoros ? 'Ativo' : 'Desativado'}</Text>
                  </View>
                </View>
                <View style={styles.toggleRow}>
                  <View style={styles.infoLabelRow}>
                    <Feather name="message-square" size={14} color={COLORS.gray} />
                    <Text style={styles.toggleLabel}>Alertas SMS</Text>
                  </View>
                  <View style={[styles.toggleBadge, { backgroundColor: user?.alertas_sms ? COLORS.green : COLORS.gray }]}>
                    <Text style={styles.toggleText}>{user?.alertas_sms ? 'Ativo' : 'Desativado'}</Text>
                  </View>
                </View>
              </KahootCard>
            )}

            <KahootCard title="Conta" accentColor={COLORS.red}>
              {!isCidadao && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelRow}>
                    <Feather name="hash" size={14} color={COLORS.gray} />
                    <Text style={styles.infoLabel}>ID</Text>
                  </View>
                  <Text style={[styles.infoValue, styles.monoText]}>{user?.user_id}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Feather name="calendar" size={14} color={COLORS.gray} />
                  <Text style={styles.infoLabel}>Membro desde</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-AO') : '-'}
                </Text>
              </View>
            </KahootCard>
          </View>
        )}

        {/* Logout Button */}
        {editField === 'none' && (
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
    backgroundColor: COLORS.bgDark,
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
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: 'bold',
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
  // Edit panels
  editPanel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  editPanelTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  editPanelDesc: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  editPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: SPACING.md,
  },
  editCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
  },
  editCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resendText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  // Info cards
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
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: FONTS.sm,
    color: COLORS.gray,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: FONTS.sm,
    color: COLORS.black,
    fontWeight: '600',
    textAlign: 'right',
  },
  editIconBtn: {
    padding: 4,
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
