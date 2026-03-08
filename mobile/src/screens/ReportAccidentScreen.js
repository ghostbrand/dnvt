import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import KahootButton from '../components/KahootButton';
import KahootInput from '../components/KahootInput';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';

const GRAVIDADES = ['LEVE', 'MODERADO', 'GRAVE', 'FATAL'];
const TIPOS = [
  { id: 'COLISAO_FRONTAL', label: 'Colisão Frontal', emoji: '💥' },
  { id: 'COLISAO_TRASEIRA', label: 'Colisão Traseira', emoji: '🚗' },
  { id: 'ATROPELAMENTO', label: 'Atropelamento', emoji: '🚶' },
  { id: 'CAPOTAMENTO', label: 'Capotamento', emoji: '🔄' },
  { id: 'CHOQUE_OBSTACULO', label: 'Choque em Obstáculo', emoji: '🚧' },
  { id: 'OUTRO', label: 'Outro', emoji: '❓' },
];

export default function ReportAccidentScreen({ navigation }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização necessária');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter localização');
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Erro', 'Localização não disponível');
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

      Alert.alert(
        '✅ Sucesso!', 
        'Acidente reportado com sucesso. Obrigado por contribuir para a segurança no trânsito!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
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
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar Acidente</Text>
        <View style={styles.placeholder} />
      </View>

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
                  <Text style={styles.optionEmoji}>{tipo.emoji}</Text>
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
                      <Text style={styles.gravityCheck}>✓</Text>
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
                {location ? '📍 Localização obtida' : '⏳ Obtendo localização...'}
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
  optionEmoji: {
    fontSize: 36,
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
  locationStatus: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
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
});
