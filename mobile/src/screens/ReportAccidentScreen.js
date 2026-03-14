import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator
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
  { id: 'COLISAO_FRONTAL', label: 'Colisão Frontal', icon: 'car-sport' },
  { id: 'COLISAO_TRASEIRA', label: 'Colisão Traseira', icon: 'car' },
  { id: 'ATROPELAMENTO', label: 'Atropelamento', icon: 'walk' },
  { id: 'CAPOTAMENTO', label: 'Capotamento', icon: 'refresh-circle' },
  { id: 'CHOQUE_OBSTACULO', label: 'Choque em Obstáculo', icon: 'warning' },
  { id: 'OUTRO', label: 'Outro', icon: 'help-circle' },
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
        numero_veiculos: 1,
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar Acidente</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Mode chooser */}
      {mode === 'choose' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <Ionicons name="alert-circle" size={48} color={COLORS.red} style={{alignSelf:'center', marginBottom: SPACING.md}} />
            <Text style={styles.stepTitle}>Como deseja reportar?</Text>
            <Text style={styles.stepSubtitle}>Escolha a melhor opção para a situação</Text>

            <TouchableOpacity
              style={styles.quickReportCard}
              activeOpacity={0.8}
              onPress={() => setMode('quick')}
            >
              <View style={styles.quickReportInner}>
                <Ionicons name="flash" size={28} color={COLORS.white} />
                <View style={{flex:1, marginLeft: SPACING.md}}>
                  <Text style={styles.quickReportTitle}>Reporte Rápido</Text>
                  <Text style={styles.quickReportDesc}>Envie em segundos. Apenas selecione o tipo e pronto.</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailedReportCard}
              activeOpacity={0.8}
              onPress={() => setMode('detailed')}
            >
              <View style={styles.quickReportInner}>
                <Ionicons name="create" size={28} color={COLORS.white} />
                <View style={{flex:1, marginLeft: SPACING.md}}>
                  <Text style={styles.quickReportTitle}>Reporte Detalhado</Text>
                  <Text style={styles.quickReportDesc}>Preencha todos os detalhes do acidente.</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>

            <View style={[styles.locationStatus, { backgroundColor: location ? COLORS.green : COLORS.orange, marginTop: SPACING.lg }]}>
              <Ionicons name={location ? 'location' : 'locate'} size={16} color={COLORS.white} />
              <Text style={[styles.locationText, {marginLeft: 6}]}>
                {location ? 'GPS pronto' : 'Obtendo localização...'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Quick mode */}
      {mode === 'quick' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <Ionicons name="flash" size={40} color={COLORS.orange} style={{alignSelf:'center', marginBottom: SPACING.sm}} />
            <Text style={styles.stepTitle}>Reporte Rápido</Text>
            <Text style={styles.stepSubtitle}>
              {quickSelectedType ? 'Confirme o envio do reporte' : 'Selecione o tipo de acidente'}
            </Text>

            {/* Phase 1: Type selection grid */}
            {!quickSelectedType && (
              <View style={styles.optionsGrid}>
                {TIPOS.map((tipo) => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[styles.optionCard, { borderColor: COLORS.orange }]}
                    onPress={() => {
                      setQuickSelectedType(tipo);
                      // Animate pulse
                      Animated.loop(
                        Animated.sequence([
                          Animated.timing(confirmPulse, { toValue: 1.04, duration: 600, useNativeDriver: true }),
                          Animated.timing(confirmPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
                        ])
                      ).start();
                    }}
                    disabled={loading}
                  >
                    <Ionicons name={tipo.icon} size={32} color={COLORS.white} style={styles.optionIcon} />
                    <Text style={styles.optionLabel}>{tipo.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Phase 2: Confirmation card */}
            {quickSelectedType && !loading && (
              <Animated.View style={[styles.confirmCard, { transform: [{ scale: confirmPulse }] }]}>
                <View style={styles.confirmIconRow}>
                  <View style={styles.confirmIconCircle}>
                    <Ionicons name={quickSelectedType.icon} size={40} color={COLORS.white} />
                  </View>
                </View>
                <Text style={styles.confirmType}>{quickSelectedType.label}</Text>
                <Text style={styles.confirmDesc}>O reporte será enviado com a sua localização atual e classificado como GRAVE.</Text>

                <View style={styles.confirmDetails}>
                  <View style={styles.confirmDetailItem}>
                    <Ionicons name="location" size={16} color={COLORS.green} />
                    <Text style={styles.confirmDetailText}>
                      {location
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : 'Obtendo GPS...'}
                    </Text>
                  </View>
                  <View style={styles.confirmDetailItem}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.orange} />
                    <Text style={styles.confirmDetailText}>Gravidade: GRAVE</Text>
                  </View>
                  <View style={styles.confirmDetailItem}>
                    <Ionicons name="time" size={16} color={COLORS.blue} />
                    <Text style={styles.confirmDetailText}>Agora</Text>
                  </View>
                </View>

                <KahootButton
                  title="Confirmar e Enviar"
                  onPress={() => {
                    confirmPulse.stopAnimation();
                    handleQuickSubmit(quickSelectedType.id);
                  }}
                  color={COLORS.red}
                  size="lg"
                  icon={<Ionicons name="send" size={18} color={COLORS.white} style={{marginRight: 6}} />}
                  style={{marginTop: SPACING.md}}
                />
                <KahootButton
                  title="Alterar Tipo"
                  onPress={() => { confirmPulse.stopAnimation(); setQuickSelectedType(null); }}
                  color={COLORS.gray}
                  size="md"
                  style={{marginTop: SPACING.sm}}
                />
              </Animated.View>
            )}

            {loading && (
              <View style={styles.confirmCard}>
                <ActivityIndicator size="large" color={COLORS.orange} style={{marginBottom: SPACING.md}} />
                <Text style={styles.confirmType}>Enviando Reporte...</Text>
                <Text style={styles.confirmDesc}>Aguarde enquanto enviamos o seu reporte rápido. Os agentes serão notificados.</Text>
              </View>
            )}

            <View style={[styles.locationStatus, { backgroundColor: location ? COLORS.green : COLORS.orange }]}>
              <Ionicons name={location ? 'location' : 'locate'} size={16} color={COLORS.white} />
              <Text style={[styles.locationText, {marginLeft: 6}]}>
                {location ? 'GPS pronto' : 'Obtendo localização...'}
              </Text>
            </View>

            <KahootButton
              title="Voltar"
              onPress={() => { setQuickSelectedType(null); confirmPulse.stopAnimation(); setMode('choose'); }}
              color={COLORS.gray}
              size="md"
              style={{marginTop: SPACING.md}}
            />
          </View>
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
                  <Ionicons name={tipo.icon} size={32} color={formData.tipo_acidente === tipo.id ? COLORS.purple : COLORS.white} style={styles.optionIcon} />
                  <Text style={[
                    styles.optionLabel,
                    formData.tipo_acidente === tipo.id && styles.optionLabelSelected
                  ]}>
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
  backText: {
    color: COLORS.white,
    fontSize: FONTS.md,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.green,
  },
  optionIcon: {
    marginBottom: SPACING.sm,
  },
  optionLabel: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.purple,
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
  quickReportCard: {
    backgroundColor: COLORS.red,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  detailedReportCard: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  quickReportInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickReportTitle: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quickReportDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sm,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl || 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  confirmIconRow: {
    marginBottom: SPACING.md,
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  confirmType: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  confirmDesc: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.xs,
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
});
