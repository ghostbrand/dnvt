import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/Toast';

const GRAVIDADES = ['LEVE', 'MODERADO', 'GRAVE', 'FATAL'];
const TIPOS = [
  { id: 'COLISAO_FRONTAL', label: 'Colisão Frontal', icon: 'car-sport', color: '#EF4444' },
  { id: 'COLISAO_TRASEIRA', label: 'Colisão Traseira', icon: 'car', color: '#F59E0B' },
  { id: 'ATROPELAMENTO', label: 'Atropelamento', icon: 'walk', color: '#3B82F6' },
  { id: 'CAPOTAMENTO', label: 'Capotamento', icon: 'refresh-circle', color: '#F97316' },
  { id: 'CHOQUE_OBSTACULO', label: 'Choque Obstáculo', icon: 'warning', color: '#10B981' },
  { id: 'OUTRO', label: 'Outro', icon: 'help-circle', color: '#8B5CF6' },
];

export default function ReportAccidentScreen({ navigation }) {
  const { user, token } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('choose'); // 'choose', 'quick', 'detailed'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [quickSelectedType, setQuickSelectedType] = useState(null);
  const confirmPulse = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;
  
  const [formData, setFormData] = useState({
    tipo_acidente: '',
    gravidade: 'MODERADO',
    descricao: '',
    numero_veiculos: '1',
    numero_vitimas: '0',
  });

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLocation();
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (step - 1) / 2,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const getLocation = async () => {
    try {
      // Check if GPS/location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'GPS Desligado',
          'É obrigatório ligar o GPS para reportar um acidente. Por favor, active o GPS nas definições do seu telefone.',
          [
            { text: 'Tentar Novamente', onPress: () => getLocation() },
            { text: 'Voltar', onPress: () => navigation.goBack(), style: 'cancel' },
          ]
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'A permissão de localização é obrigatória para reportar acidentes.',
          [
            { text: 'Tentar Novamente', onPress: () => getLocation() },
            { text: 'Voltar', onPress: () => navigation.goBack(), style: 'cancel' },
          ]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter a sua localização. Verifique se o GPS está ligado.',
        [
          { text: 'Tentar Novamente', onPress: () => getLocation() },
          { text: 'Voltar', onPress: () => navigation.goBack(), style: 'cancel' },
        ]
      );
    }
  };

  const handleQuickSubmit = async (tipo) => {
    if (!location) {
      toast.warning('Erro', 'Localização não disponível. Aguarde o GPS.');
      return;
    }
    setLoading(true);
    try {
      await api.createAcidente({
        tipo_acidente: tipo,
        gravidade: 'GRAVE',
        descricao: 'Reporte rápido - necessita assistência urgente',
        latitude: location.latitude,
        longitude: location.longitude,
        numero_veiculos: 0,
        numero_vitimas: 0,
        origem_registro: 'MOBILE_CIDADAO',
      }, token);
      toast.success('Reporte Enviado!', 'O seu reporte rápido foi enviado. Os agentes serão notificados.');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      toast.error('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      toast.warning('Erro', 'Localização não disponível');
      return;
    }

    setLoading(true);
    try {
      await api.createAcidente({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        numero_veiculos: parseInt(formData.numero_veiculos) || 1,
        numero_vitimas: parseInt(formData.numero_vitimas) || 0,
        origem_registro: 'MOBILE_CIDADAO',
      }, token);

      toast.success('Sucesso!', 'Acidente reportado com sucesso. Obrigado por contribuir para a segurança no trânsito!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      toast.error('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const gpsLabel = location
    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
    : 'Obtendo localização...';

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => navigation.goBack());
  };

  return (
    <View style={styles.overlayContainer}>
      <StatusBar translucent={false} backgroundColor="#1B2A4A" barStyle="light-content" />
      <TouchableOpacity 
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Ionicons name="close" size={28} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerEyebrow}>Reporte estilo mapa</Text>
              <Text style={styles.headerTitle}>Reportar Acidente</Text>
            </View>
          </View>

          {mode === 'choose' && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <Ionicons name="warning" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.heroTitle}>Reportar Acidente</Text>
                <Text style={styles.heroSubtitle}>Selecione Localização & Confirme</Text>
                <View style={styles.heroStepsRow}>
                  <View style={styles.heroStepItem}>
                    <View style={styles.heroStepCircle}>
                      <Text style={styles.heroStepNumber}>1</Text>
                    </View>
                    <Text style={styles.heroStepText}>Localizar</Text>
                  </View>
                  <View style={styles.heroStepDivider} />
                  <View style={styles.heroStepItem}>
                    <View style={styles.heroStepCircle}>
                      <Text style={styles.heroStepNumber}>2</Text>
                    </View>
                    <Text style={styles.heroStepText}>Detalhar</Text>
                  </View>
                  <View style={styles.heroStepDivider} />
                  <View style={styles.heroStepItem}>
                    <View style={styles.heroStepCircle}>
                      <Text style={styles.heroStepNumber}>3</Text>
                    </View>
                    <Text style={styles.heroStepText}>Enviar</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modeSection}>
                <Text style={styles.sectionLabel}>Escolha o modo</Text>
                <TouchableOpacity
                  style={[styles.modeCard, styles.modeCardPrimary]}
                  activeOpacity={0.8}
                  onPress={() => setMode('quick')}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={styles.modeCardIcon}>
                      <Ionicons name="flash" size={24} color={COLORS.white} />
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                  </View>
                  <Text style={styles.modeCardTitle}>Reporte rápido</Text>
                  <Text style={styles.modeCardDesc}>Selecione o tipo e envie em segundos, no estilo do botão rápido do mock.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeCard, styles.modeCardSecondary]}
                  activeOpacity={0.8}
                  onPress={() => setMode('detailed')}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={[styles.modeCardIcon, styles.modeCardIconSecondary]}>
                      <Ionicons name="create" size={24} color={COLORS.white} />
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                  </View>
                  <Text style={styles.modeCardTitle}>Reporte detalhado</Text>
                  <Text style={styles.modeCardDesc}>Abra o fluxo completo para preencher gravidade, descrição, veículos e vítimas.</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.locationCard, location ? styles.locationCardReady : styles.locationCardLoading]}>
                <View style={styles.locationCardIcon}>
                  <Ionicons name={location ? 'location' : 'locate'} size={18} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationCardTitle}>{location ? 'GPS pronto' : 'A procurar GPS'}</Text>
                  <Text style={styles.locationCardText}>{gpsLabel}</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {mode === 'quick' && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.quickHeroCard}>
                <View style={styles.quickHeroBadge}>
                  <Ionicons name="flash" size={18} color={COLORS.white} />
                  <Text style={styles.quickHeroBadgeText}>Reporte rápido</Text>
                </View>
                <Text style={styles.quickHeroTitle}>Qual é o tipo de acidente?</Text>
                <Text style={styles.quickHeroSubtitle}>
                  {quickSelectedType ? 'Confirme o envio do reporte' : 'Selecione o tipo de acidente'}
                </Text>
              </View>

              {!quickSelectedType && (
                <View style={styles.reportGrid}>
                  {TIPOS.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={styles.reportGridCard}
                      onPress={() => {
                        setQuickSelectedType(tipo);
                        Animated.loop(
                          Animated.sequence([
                            Animated.timing(confirmPulse, { toValue: 1.04, duration: 600, useNativeDriver: true }),
                            Animated.timing(confirmPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
                          ])
                        ).start();
                      }}
                      disabled={loading}
                    >
                      <View style={[styles.reportCircleIcon, { borderColor: tipo.color }]}>
                        <Ionicons name={tipo.icon} size={32} color={COLORS.white} />
                      </View>
                      <Text style={styles.reportGridText}>{tipo.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {quickSelectedType && !loading && (
                <Animated.View style={[styles.confirmCard, { transform: [{ scale: confirmPulse }] }]}>
                  <View style={styles.confirmTopRow}>
                    <View style={[styles.confirmIconCircle, { backgroundColor: quickSelectedType.color }]}>
                      <Ionicons name={quickSelectedType.icon} size={34} color={COLORS.white} />
                    </View>
                    <View style={styles.confirmTopText}>
                      <Text style={styles.confirmType}>{quickSelectedType.label}</Text>
                      <Text style={styles.confirmDesc}>O reporte será enviado com a sua localização atual e marcado como GRAVE.</Text>
                    </View>
                  </View>

                  <View style={styles.confirmDetails}>
                    <View style={styles.confirmDetailItem}>
                      <Ionicons name="location" size={16} color={COLORS.greenLight} />
                      <Text style={styles.confirmDetailText}>{gpsLabel}</Text>
                    </View>
                    <View style={styles.confirmDetailItem}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.orangeLight} />
                      <Text style={styles.confirmDetailText}>Gravidade: GRAVE</Text>
                    </View>
                    <View style={styles.confirmDetailItem}>
                      <Ionicons name="time" size={16} color={COLORS.blueLight} />
                      <Text style={styles.confirmDetailText}>Envio imediato</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.primarySubmitButton}
                    onPress={() => {
                      confirmPulse.stopAnimation();
                      handleQuickSubmit(quickSelectedType.id);
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primarySubmitButtonText}>ENVIAR REPORTE</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondarySubmitButton}
                    onPress={() => { confirmPulse.stopAnimation(); setQuickSelectedType(null); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondarySubmitButtonText}>Alterar Tipo</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {loading && (
                <View style={styles.confirmCard}>
                  <ActivityIndicator size="large" color={COLORS.orange} style={{marginBottom: SPACING.md}} />
                  <Text style={styles.confirmType}>Enviando Reporte...</Text>
                  <Text style={styles.confirmDesc}>Aguarde enquanto enviamos o seu reporte rápido. Os agentes serão notificados.</Text>
                </View>
              )}

              <View style={[styles.locationCard, location ? styles.locationCardReady : styles.locationCardLoading]}>
                <View style={styles.locationCardIcon}>
                  <Ionicons name={location ? 'location' : 'locate'} size={18} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationCardTitle}>{location ? 'GPS pronto' : 'A procurar GPS'}</Text>
                  <Text style={styles.locationCardText}>{gpsLabel}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backToModesButton}
                onPress={() => { setQuickSelectedType(null); confirmPulse.stopAnimation(); setMode('choose'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.white} />
                <Text style={styles.backToModesText}>Voltar</Text>
              </TouchableOpacity>
              <View style={{height: 40}} />
            </ScrollView>
          )}

          {/* Detailed mode */}
          {mode === 'detailed' && (
          <>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressText}>Passo {step} de 3</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Step 1: Type Selection */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Qual o tipo de acidente?</Text>
                <Text style={styles.stepSubtitle}>Selecione uma opção</Text>
                
                <View style={styles.optionsGrid}>
                  {TIPOS.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[
                        styles.optionCard,
                        formData.tipo_acidente === tipo.id && styles.optionCardSelected
                      ]}
                      onPress={() => setFormData({ ...formData, tipo_acidente: tipo.id })}
                    >
                      <View style={[
                        styles.optionCircleIcon,
                        { borderColor: tipo.color },
                        formData.tipo_acidente === tipo.id && { borderWidth: 4 }
                      ]}>
                        <Ionicons name={tipo.icon} size={32} color={COLORS.white} />
                      </View>
                      <Text style={styles.optionLabel}>
                        {tipo.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <KahootButton
                  title="Próximo"
                  onPress={() => setStep(2)}
                  color={COLORS.blue}
                  size="lg"
                  disabled={!formData.tipo_acidente}
                  style={styles.nextButton}
                />
              </View>
            )}

            {/* Step 2: Gravity Selection */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Qual a gravidade?</Text>
                <Text style={styles.stepSubtitle}>Selecione com base na situação</Text>
                
                <View style={styles.gravityOptions}>
                  {GRAVIDADES.map((grav) => {
                    const colors = {
                      'LEVE': COLORS.green,
                      'MODERADO': COLORS.yellow,
                      'GRAVE': COLORS.orange,
                      'FATAL': COLORS.red,
                    };
                    return (
                      <TouchableOpacity
                        key={grav}
                        style={[
                          styles.gravityCard,
                          { backgroundColor: colors[grav] },
                          formData.gravidade === grav && styles.gravityCardSelected
                        ]}
                        onPress={() => setFormData({ ...formData, gravidade: grav })}
                      >
                        <Text style={styles.gravityText}>{grav}</Text>
                        {formData.gravidade === grav && (
                          <Feather name="check" size={16} color={COLORS.white} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.buttonRow}>
                  <KahootButton
                    title="Voltar"
                    onPress={() => setStep(1)}
                    color={COLORS.gray}
                    size="md"
                    style={styles.backBtn}
                  />
                  <KahootButton
                    title="Próximo"
                    onPress={() => setStep(3)}
                    color={COLORS.blue}
                    size="md"
                    style={styles.nextBtn}
                  />
                </View>
              </View>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Detalhes do Acidente</Text>
                <Text style={styles.stepSubtitle}>Preencha as informações</Text>

                <KahootInput
                  label="Descrição"
                  value={formData.descricao}
                  onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                  placeholder="Descreva o que aconteceu..."
                />

                <View style={styles.numberRow}>
                  <View style={styles.numberInput}>
                    <KahootInput
                      label="Nº Veículos"
                      value={formData.numero_veiculos}
                      onChangeText={(text) => setFormData({ ...formData, numero_veiculos: text })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.numberInput}>
                    <KahootInput
                      label="Nº Vítimas"
                      value={formData.numero_vitimas}
                      onChangeText={(text) => setFormData({ ...formData, numero_vitimas: text })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Location Status */}
                <View style={[
                  styles.locationStatus,
                  { backgroundColor: location ? COLORS.green : COLORS.orange }
                ]}>
                  <Text style={styles.locationText}>
                    {location ? 'Localização obtida' : 'Obtendo localização...'}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <KahootButton
                    title="Voltar"
                    onPress={() => setStep(2)}
                    color={COLORS.gray}
                    size="md"
                    style={styles.backBtn}
                  />
                  <KahootButton
                    title={loading ? 'Enviando...' : 'Enviar Reporte'}
                    onPress={handleSubmit}
                    color={COLORS.green}
                    size="md"
                    disabled={loading || !formData.descricao || !location}
                    style={styles.nextBtn}
                  />
                </View>
              </View>
            )}
          </ScrollView>
          </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '85%',
    backgroundColor: '#05070B',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#05070B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
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
    fontSize: FONTS.lg,
    fontWeight: '800',
  },
  placeholder: {
    width: 60,
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  heroCard: {
    backgroundColor: '#10161F',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  heroStepsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 10,
  },
  heroStepItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B72FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  heroStepNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heroStepText: {
    color: '#E5E7EB',
    fontSize: 10,
    fontWeight: '700',
  },
  heroStepDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 3,
  },
  modeSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modeCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  modeCardPrimary: {
    backgroundColor: '#FF7A00',
  },
  modeCardSecondary: {
    backgroundColor: '#0B72FF',
  },
  modeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardIconSecondary: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  modeCardTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modeCardDesc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
  },
  locationCardReady: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  locationCardLoading: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.22)',
  },
  locationCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationCardTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  locationCardText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
  stepContainer: {
    paddingTop: SPACING.md,
  },
  stepTitle: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: FONTS.md,
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  optionCard: {
    width: '48%',
    minHeight: 130,
    backgroundColor: 'rgba(16,22,31,0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    padding: 12,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(16,22,31,0.9)',
  },
  optionCircleIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(30,41,59,0.95)',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickHeroCard: {
    backgroundColor: '#10161F',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  quickHeroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,122,0,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  quickHeroBadgeText: {
    color: '#FDBA74',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quickHeroTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
  },
  quickHeroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  reportGridCard: {
    width: '48%',
    minHeight: 130,
    borderRadius: 20,
    backgroundColor: 'rgba(16,22,31,0.6)',
    padding: 14,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCircleIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30,41,59,0.95)',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reportGridText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  gravityOptions: {
    marginBottom: SPACING.lg,
  },
  gravityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  gravityCardSelected: {
    borderColor: COLORS.white,
  },
  gravityText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: 'bold',
  },
  gravityCheck: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: 'bold',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberInput: {
    width: '48%',
  },
  locationStatus: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  locationText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  backBtn: {
    flex: 0.45,
  },
  nextBtn: {
    flex: 0.45,
  },
  nextButton: {
    marginTop: SPACING.md,
  },
  confirmCard: {
    backgroundColor: '#10161F',
    borderRadius: RADIUS.xl || 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  confirmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  confirmIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  confirmTopText: {
    flex: 1,
  },
  confirmType: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  confirmDesc: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 20,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    marginBottom: SPACING.md,
  },
  confirmDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmDetailText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sm,
  },
  primarySubmitButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#0B72FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySubmitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondarySubmitButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondarySubmitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  backToModesButton: {
    marginTop: 4,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backToModesText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
