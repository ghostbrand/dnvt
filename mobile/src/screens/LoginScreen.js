import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Animated,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
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

  const toggleMode = () => {
    Animated.timing(slideAnim, {
      toValue: isLogin ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsLogin(!isLogin);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, senha);
      } else {
        await register(nome, email, senha, telefone);
      }
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
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚗</Text>
          </View>
          <Text style={styles.title}>DNVT</Text>
          <Text style={styles.subtitle}>Trânsito Seguro em Angola</Text>
        </Animated.View>

        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              onPress={() => isLogin || toggleMode()}
              style={[styles.tab, isLogin && styles.tabActive]}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => !isLogin || toggleMode()}
              style={[styles.tab, !isLogin && styles.tabActive]}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                Registrar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <>
                <KahootInput
                  label="Nome Completo"
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Seu nome"
                  autoCapitalize="words"
                />
                <KahootInput
                  label="Telefone"
                  value={telefone}
                  onChangeText={setTelefone}
                  placeholder="+244 923 456 789"
                  keyboardType="phone-pad"
                />
              </>
            )}

            <KahootInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
            />

            <KahootInput
              label="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <KahootButton
              title={loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              onPress={handleSubmit}
              color={COLORS.green}
              size="lg"
              disabled={loading}
              style={styles.submitButton}
            />
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Direção Nacional de Viação e Trânsito
          </Text>
          <Text style={styles.footerSubtext}>Angola 🇦🇴</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: FONTS.giant,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  tabTextActive: {
    color: COLORS.purple,
  },
  form: {
    marginTop: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: COLORS.red,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: FONTS.sm,
  },
  footerSubtext: {
    color: COLORS.white,
    opacity: 0.5,
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
  },
});
