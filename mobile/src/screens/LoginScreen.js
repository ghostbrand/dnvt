import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Animated,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import OtpInput from '../components/OtpInput';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

// BI validation: 9 digits + 2 letters + 3 digits (e.g. 123456789AB123)
const validateBI = (bi) => {
  const pattern = /^\d{9}[A-Za-z]{2}\d{3}$/;
  return pattern.test(bi);
};

export default function LoginScreen() {
  const { login, register } = useAuth();
  // Modes: 'login' | 'register' | 'recovery' | 'recovery_code'
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  // Register fields
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bi, setBi] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');

  // Progressive registration state
  const [regStep, setRegStep] = useState(1); // 1=email, 2=phone, 3=otp, 4=details
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Disclaimer modal
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Recovery fields
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
    if (newMode === 'register') {
      setRegStep(1);
      setEmailValid(false);
      setPhoneVerified(false);
      setOtpCode('');
    }
  };

  const handleValidateEmail = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return setError('Email é obrigatório');
    setValidatingEmail(true);
    try {
      const result = await api.validarEmail(trimmed);
      if (result.valido) {
        setEmailValid(true);
        setRegStep(2);
      } else {
        setError(result.erro || 'Email inválido');
      }
    } catch (err) {
      setError(err.message || 'Erro ao validar email');
    } finally {
      setValidatingEmail(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    if (!telefone.trim()) return setError('Telefone é obrigatório');
    setSendingOtp(true);
    try {
      const result = await api.enviarOtp(telefone.trim());
      if (result.success) {
        setRegStep(3);
        setSuccessMsg('Código enviado por SMS para ' + telefone);
      } else {
        setError(result.error || 'Erro ao enviar código');
      }
    } catch (err) {
      setError(err.message || 'Erro ao enviar código');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setSuccessMsg('');
    if (!otpCode.trim() || otpCode.trim().length !== 6) return setError('Insira o código de 6 dígitos');
    setVerifyingOtp(true);
    try {
      const result = await api.verificarOtp(telefone.trim(), otpCode.trim());
      if (result.valido) {
        setPhoneVerified(true);
        setRegStep(4);
        setSuccessMsg('Telefone verificado com sucesso!');
      } else {
        setError(result.erro || 'Código inválido');
      }
    } catch (err) {
      setError(err.message || 'Erro ao verificar código');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !senha.trim()) {
      return setError('Email e senha são obrigatórios');
    }
    setLoading(true);
    try {
      await login(email, senha);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!nome.trim()) return setError('Nome completo é obrigatório');
    if (!telefone.trim()) return setError('Telefone é obrigatório');
    if (!bi.trim()) return setError('Bilhete de Identidade é obrigatório');
    if (!validateBI(bi.trim())) {
      return setError('BI inválido. Formato: 9 dígitos + 2 letras + 3 dígitos (ex: 123456789AB123)');
    }
    if (!email.trim()) return setError('Email é obrigatório');
    if (!senha.trim() || senha.length < 6) return setError('Senha deve ter no mínimo 6 caracteres');
    if (senha !== senhaConfirm) return setError('As senhas não coincidem');

    setLoading(true);
    try {
      await register(nome, email, senha, telefone, bi.trim().toUpperCase());
      // If register succeeds, it means account was created with status 'pendente'
      // AuthContext will NOT auto-login (we updated it)
      setSuccessMsg('Conta criada com sucesso! Aguarde a aprovação do administrador. Receberá uma notificação quando for aprovado.');
      setMode('login');
      // Clear register fields
      setNome('');
      setTelefone('');
      setBi('');
      setSenha('');
      setSenhaConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecovery = async () => {
    setError('');
    if (!recoveryEmail.trim()) return setError('Insira o seu email');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao solicitar recuperação');
      setSuccessMsg('Código de verificação enviado para o seu email.');
      setMode('recovery_code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!recoveryCode.trim()) return setError('Insira o código de verificação');
    if (!newPassword.trim() || newPassword.length < 6) return setError('Nova senha deve ter no mínimo 6 caracteres');
    if (newPassword !== newPasswordConfirm) return setError('As senhas não coincidem');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim().toLowerCase(),
          code: recoveryCode.trim(),
          nova_senha: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao redefinir senha');
      setSuccessMsg('Senha redefinida com sucesso! Faça login com a nova senha.');
      setMode('login');
      setRecoveryEmail('');
      setRecoveryCode('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with logos */}
        <Animated.View 
          style={[
            styles.header,
            { 
              opacity: fadeAnim,
              transform: [{ 
                scale: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                })
              }]
            }
          ]}
        >
          <View style={styles.logosRow}>
            <Image source={require('../img/logo-g.png')} style={styles.logoGov} resizeMode="contain" />
            <View style={styles.logoMainContainer}>
              <Image source={require('../img/Logo_DTSER.png')} style={styles.logoMain} resizeMode="contain" />
            </View>
          </View>
          <Text style={styles.title}>DTSER</Text>
          <Text style={styles.subtitle}>Direcção de Trânsito e Segurança Rodoviária</Text>
        </Animated.View>

        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>

          {/* Register mode header */}
          {mode === 'register' && (
            <View style={styles.registerHeader}>
              <Text style={styles.registerTitle}>Criar Conta</Text>
            </View>
          )}

          {/* Recovery header */}
          {(mode === 'recovery' || mode === 'recovery_code') && (
            <View style={styles.recoveryHeader}>
              <Text style={styles.recoveryTitle}>
                {mode === 'recovery' ? 'Recuperar Senha' : 'Código de Verificação'}
              </Text>
              <Text style={styles.recoveryDesc}>
                {mode === 'recovery' 
                  ? 'Insira o email associado à sua conta para receber um código de verificação.'
                  : 'Insira o código enviado para o seu email e defina a nova senha.'}
              </Text>
            </View>
          )}

          {/* Success message */}
          {successMsg ? (
            <View style={styles.successContainer}>
              <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Error message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-triangle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ===== LOGIN FORM ===== */}
          {mode === 'login' && (
            <View style={styles.form}>
              <KahootInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <KahootInput
                label="Senha"
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••••"
                secureTextEntry
              />
              <KahootButton
                title={loading ? 'Aguarde...' : 'Entrar'}
                onPress={handleLogin}
                color={COLORS.green}
                size="lg"
                disabled={loading}
                style={styles.submitButton}
              />
              <TouchableOpacity onPress={() => switchMode('recovery')} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register link — opens disclaimer first */}
              <TouchableOpacity onPress={() => setShowDisclaimer(true)} style={styles.registerLink}>
                <Text style={styles.registerLinkText}>Não tem conta? </Text>
                <Text style={styles.registerLinkBold}>Criar Conta</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== REGISTER FORM — Progressive Steps ===== */}
          {mode === 'register' && (
            <View style={styles.form}>
              {/* Step indicator */}
              <View style={styles.stepIndicator}>
                {[1,2,3,4].map(s => (
                  <View key={s} style={[styles.stepDot, regStep >= s && styles.stepDotActive]} />
                ))}
              </View>

              {/* Step 1: Email */}
              {regStep === 1 && (
                <View>
                  <Text style={styles.stepTitle}>Qual é o seu email?</Text>
                  <Text style={styles.stepDesc}>Vamos verificar se o seu email é válido.</Text>
                  <KahootInput
                    label="Email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setEmailValid(false); }}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <KahootButton
                    title={validatingEmail ? 'Verificando...' : 'Verificar Email'}
                    onPress={handleValidateEmail}
                    color={COLORS.blue}
                    size="lg"
                    disabled={validatingEmail}
                    style={styles.submitButton}
                  />
                  {validatingEmail && <ActivityIndicator color={COLORS.blue} style={{marginTop: 12}} />}
                </View>
              )}

              {/* Step 2: Phone */}
              {regStep === 2 && (
                <View>
                  <View style={styles.stepCheck}>
                    <Feather name="check-circle" size={13} color="#6ee7b7" style={{ marginRight: 6 }} /><Text style={styles.stepCheckText}>Email verificado: {email}</Text>
                  </View>
                  <Text style={styles.stepTitle}>Qual é o seu telefone?</Text>
                  <Text style={styles.stepDesc}>Enviaremos um código SMS para confirmar.</Text>
                  <KahootInput
                    label="Telefone"
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="+244 923 456 789"
                    keyboardType="phone-pad"
                  />
                  <KahootButton
                    title={sendingOtp ? 'Enviando...' : 'Enviar Código SMS'}
                    onPress={handleSendOtp}
                    color={COLORS.orange}
                    size="lg"
                    disabled={sendingOtp}
                    style={styles.submitButton}
                  />
                  {sendingOtp && <ActivityIndicator color={COLORS.orange} style={{marginTop: 12}} />}
                </View>
              )}

              {/* Step 3: OTP Verification */}
              {regStep === 3 && (
                <View>
                  <View style={styles.stepCheck}>
                    <Feather name="check-circle" size={13} color="#6ee7b7" style={{ marginRight: 6 }} /><Text style={styles.stepCheckText}>Email: {email}</Text>
                  </View>
                  <View style={styles.stepCheck}>
                    <Feather name="smartphone" size={13} color="#6ee7b7" style={{ marginRight: 6 }} /><Text style={styles.stepCheckText}>SMS enviado para: {telefone}</Text>
                  </View>
                  <Text style={styles.stepTitle}>Código de verificação</Text>
                  <Text style={styles.stepDesc}>Insira o código de 6 dígitos recebido por SMS.</Text>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                  <KahootButton
                    title={verifyingOtp ? 'Verificando...' : 'Verificar Código'}
                    onPress={handleVerifyOtp}
                    color={COLORS.green}
                    size="lg"
                    disabled={verifyingOtp}
                    style={styles.submitButton}
                  />
                  <TouchableOpacity onPress={handleSendOtp} style={styles.forgotButton}>
                    <Text style={styles.forgotText}>Reenviar código</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 4: Remaining details */}
              {regStep === 4 && (
                <View>
                  <View style={styles.stepCheck}>
                    <Feather name="check-circle" size={13} color="#6ee7b7" style={{ marginRight: 6 }} /><Text style={styles.stepCheckText}>Email: {email}</Text>
                  </View>
                  <View style={styles.stepCheck}>
                    <Feather name="check-circle" size={13} color="#6ee7b7" style={{ marginRight: 6 }} /><Text style={styles.stepCheckText}>Telefone: {telefone}</Text>
                  </View>
                  <Text style={styles.stepTitle}>Complete o seu registo</Text>
                  <KahootInput
                    label="Nome Completo"
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Seu nome completo"
                    autoCapitalize="words"
                  />
                  <KahootInput
                    label="Bilhete de Identidade (BI)"
                    value={bi}
                    onChangeText={(text) => setBi(text.toUpperCase())}
                    placeholder="123456789AB123"
                    autoCapitalize="characters"
                  />
                  <Text style={styles.biHint}>Formato: 9 dígitos + 2 letras + 3 dígitos</Text>
                  <KahootInput
                    label="Senha"
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry
                  />
                  <KahootInput
                    label="Confirmar Senha"
                    value={senhaConfirm}
                    onChangeText={setSenhaConfirm}
                    placeholder="Repita a senha"
                    secureTextEntry
                  />
                  <KahootButton
                    title={loading ? 'Criando conta...' : 'Criar Conta'}
                    onPress={handleRegister}
                    color={COLORS.green}
                    size="lg"
                    disabled={loading}
                    style={styles.submitButton}
                  />
                </View>
              )}

              {/* Voltar button at bottom of register form */}
              <TouchableOpacity onPress={() => switchMode('login')} style={styles.backToLoginButton}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={14} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} /><Text style={styles.backToLoginText}>Voltar ao Login</Text></View>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== RECOVERY — Step 1: Email ===== */}
          {mode === 'recovery' && (
            <View style={styles.form}>
              <KahootInput
                label="Email da conta"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <KahootButton
                title={loading ? 'Enviando...' : 'Enviar Código'}
                onPress={handleRequestRecovery}
                color={COLORS.orange}
                size="lg"
                disabled={loading}
                style={styles.submitButton}
              />
              <TouchableOpacity onPress={() => switchMode('login')} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Voltar ao Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== RECOVERY — Step 2: Code + New Password ===== */}
          {mode === 'recovery_code' && (
            <View style={styles.form}>
              <KahootInput
                label="Código de Verificação"
                value={recoveryCode}
                onChangeText={setRecoveryCode}
                placeholder="123456"
                keyboardType="number-pad"
              />
              <KahootInput
                label="Nova Senha"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
              />
              <KahootInput
                label="Confirmar Nova Senha"
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                placeholder="Repita a nova senha"
                secureTextEntry
              />
              <KahootButton
                title={loading ? 'Redefinindo...' : 'Redefinir Senha'}
                onPress={handleResetPassword}
                color={COLORS.green}
                size="lg"
                disabled={loading}
                style={styles.submitButton}
              />
              <TouchableOpacity onPress={() => switchMode('recovery')} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Reenviar código</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Direcção de Trânsito e Segurança Rodoviária
          </Text>
          <Text style={styles.footerSubtext}>Angola</Text>
        </View>
      </ScrollView>

      {/* ===== LEGAL DISCLAIMER MODAL ===== */}
      <Modal
        visible={showDisclaimer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialCommunityIcons name="scale-balance" size={28} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Aviso Legal</Text>
                <Text style={styles.modalSubtitle}>Leia atentamente antes de prosseguir</Text>
              </View>

              {/* Disclaimer Content */}
              <View style={styles.disclaimerContent}>
                <View style={styles.disclaimerSection}>
                  <Text style={styles.disclaimerHeading}>Natureza da Aplicação</Text>
                  <Text style={styles.disclaimerText}>
                    A aplicação DTSER — Direcção de Trânsito e Segurança Rodoviária — é uma plataforma oficial de registo e gestão de ocorrências de trânsito na República de Angola. Esta aplicação tem carácter institucional e os dados aqui submetidos possuem valor legal.
                  </Text>
                </View>

                <View style={styles.disclaimerSection}>
                  <Text style={styles.disclaimerHeading}>Enquadramento Legal</Text>
                  <Text style={styles.disclaimerText}>
                    Ao utilizar esta aplicação, o utilizador compromete-se a respeitar a legislação angolana vigente, incluindo:
                  </Text>
                  <View style={styles.lawItem}>
                    <Text style={styles.lawBullet}>•</Text>
                    <Text style={styles.lawText}>
                      <Text style={styles.lawBold}>Código de Estrada (Lei n.º 5/08, de 29 de Agosto)</Text> — que regulamenta a circulação rodoviária, os deveres dos condutores e as obrigações em caso de acidente de viação.
                    </Text>
                  </View>
                  <View style={styles.lawItem}>
                    <Text style={styles.lawBullet}>•</Text>
                    <Text style={styles.lawText}>
                      <Text style={styles.lawBold}>Lei dos Crimes Informáticos (Lei n.º 7/17, de 16 de Fevereiro)</Text> — que penaliza o uso indevido de sistemas informáticos, a falsificação de dados e a prestação de informações falsas em plataformas digitais.
                    </Text>
                  </View>
                  <View style={styles.lawItem}>
                    <Text style={styles.lawBullet}>•</Text>
                    <Text style={styles.lawText}>
                      <Text style={styles.lawBold}>Lei da Protecção de Dados Pessoais (Lei n.º 22/11, de 17 de Junho)</Text> — que garante a protecção dos dados pessoais e obriga ao tratamento responsável das informações dos cidadãos.
                    </Text>
                  </View>
                  <View style={styles.lawItem}>
                    <Text style={styles.lawBullet}>•</Text>
                    <Text style={styles.lawText}>
                      <Text style={styles.lawBold}>Código Penal Angolano</Text> — Artigos relativos à falsidade de declarações, denúncia caluniosa e obstrução à justiça.
                    </Text>
                  </View>
                </View>

                <View style={styles.disclaimerSection}>
                  <Text style={styles.disclaimerHeading}>Responsabilidades do Utilizador</Text>
                  <Text style={styles.disclaimerText}>
                    O registo de informações falsas, fraudulentas ou caluniosas constitui crime punível nos termos da lei angolana. O utilizador é inteiramente responsável pela veracidade dos dados fornecidos e dos relatos submetidos.
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <Feather name="alert-triangle" size={20} color="#FCA5A5" />
                  <Text style={styles.warningText}>
                    O uso indevido desta aplicação pode resultar em processo criminal, multas e pena de prisão conforme a legislação em vigor.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowDisclaimer(false)} 
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setShowDisclaimer(false);
                  switchMode('register');
                }} 
                style={styles.modalAcceptBtn}
              >
                <Text style={styles.modalAcceptText}>Li e Aceito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: SPACING.md,
  },
  logoGov: {
    width: 60,
    height: 60,
  },
  logoMainContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMain: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.7,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  // Register header with Voltar
  registerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.sm,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  registerTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  recoveryHeader: {
    marginBottom: SPACING.lg,
  },
  recoveryTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  recoveryDesc: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  form: {
    marginTop: SPACING.xs,
  },
  biHint: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: -4,
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },
  successContainer: {
    backgroundColor: '#059669',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sm,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: COLORS.red,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sm,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONTS.xs,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  // Register link on login page
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  registerLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONTS.sm,
  },
  registerLinkBold: {
    color: COLORS.blueLight,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  // Back to login from register
  backToLoginButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  backToLoginText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  // Step indicators
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: {
    backgroundColor: COLORS.green,
    width: 24,
  },
  stepTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  stepCheck: {
    backgroundColor: 'rgba(5,150,105,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCheckText: {
    color: '#6ee7b7',
    fontSize: FONTS.xs,
    fontWeight: '600',
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.white,
    opacity: 0.5,
    fontSize: FONTS.sm,
  },
  footerSubtext: {
    color: COLORS.white,
    opacity: 0.3,
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
  },
  // ===== Legal Disclaimer Modal =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalScroll: {
    paddingHorizontal: SPACING.lg,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.5)',
  },
  disclaimerContent: {
    paddingBottom: SPACING.md,
  },
  disclaimerSection: {
    marginBottom: SPACING.lg,
  },
  disclaimerHeading: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  lawItem: {
    flexDirection: 'row',
    marginTop: 10,
    paddingLeft: 4,
  },
  lawBullet: {
    color: COLORS.blueLight,
    fontSize: FONTS.md,
    marginRight: 8,
    marginTop: 1,
  },
  lawText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 21,
  },
  lawBold: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  warningBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: SPACING.sm,
  },
  warningIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: '#FCA5A5',
    fontWeight: '600',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  modalAcceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.green,
    alignItems: 'center',
  },
  modalAcceptText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: '700',
  },
});
