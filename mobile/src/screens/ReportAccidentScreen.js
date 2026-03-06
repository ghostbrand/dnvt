import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { acidentesApi } from '../services/api';

const TIPOS_ACIDENTE = [
  { value: 'COLISAO_FRONTAL', label: 'Colisão Frontal' },
  { value: 'COLISAO_TRASEIRA', label: 'Colisão Traseira' },
  { value: 'COLISAO_LATERAL', label: 'Colisão Lateral' },
  { value: 'CAPOTAMENTO', label: 'Capotamento' },
  { value: 'ATROPELAMENTO', label: 'Atropelamento' },
  { value: 'OUTRO', label: 'Outro' },
];

const GRAVIDADES = [
  { value: 'LEVE', label: 'Leve', color: '#16A34A' },
  { value: 'MODERADO', label: 'Moderado', color: '#D97706' },
  { value: 'GRAVE', label: 'Grave', color: '#EA580C' },
  { value: 'FATAL', label: 'Fatal', color: '#DC2626' },
];

export default function ReportAccidentScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    latitude: route.params?.location?.latitude || -8.8368,
    longitude: route.params?.location?.longitude || 13.2343,
    descricao: '',
    tipo_acidente: 'OUTRO',
    gravidade: 'MODERADO',
    numero_vitimas: '0',
    numero_veiculos: '1'
  });

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setFormData({
        ...formData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      Alert.alert('Sucesso', 'Localização atualizada');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter a localização');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      Alert.alert('Erro', 'Por favor, descreva o acidente');
      return;
    }

    setLoading(true);
    try {
      await acidentesApi.create({
        ...formData,
        numero_vitimas: parseInt(formData.numero_vitimas) || 0,
        numero_veiculos: parseInt(formData.numero_veiculos) || 1
      });
      
      Alert.alert(
        'Sucesso',
        'Acidente reportado com sucesso. Obrigado pela sua colaboração!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível reportar o acidente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Localização</Text>
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.locationButtonText}>Usar Minha Localização</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.coordinates}>
          Lat: {formData.latitude.toFixed(6)} | Lng: {formData.longitude.toFixed(6)}
        </Text>
      </View>

      {/* Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Tipo de Acidente</Text>
        <View style={styles.optionsRow}>
          {TIPOS_ACIDENTE.map((tipo) => (
            <TouchableOpacity
              key={tipo.value}
              style={[
                styles.optionButton,
                formData.tipo_acidente === tipo.value && styles.optionButtonActive
              ]}
              onPress={() => setFormData({ ...formData, tipo_acidente: tipo.value })}
            >
              <Text style={[
                styles.optionText,
                formData.tipo_acidente === tipo.value && styles.optionTextActive
              ]}>
                {tipo.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Gravidade</Text>
        <View style={styles.severityRow}>
          {GRAVIDADES.map((grav) => (
            <TouchableOpacity
              key={grav.value}
              style={[
                styles.severityButton,
                { borderColor: grav.color },
                formData.gravidade === grav.value && { backgroundColor: grav.color }
              ]}
              onPress={() => setFormData({ ...formData, gravidade: grav.value })}
            >
              <Text style={[
                styles.severityText,
                { color: grav.color },
                formData.gravidade === grav.value && { color: '#fff' }
              ]}>
                {grav.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Descrição</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Descreva o que aconteceu..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          value={formData.descricao}
          onChangeText={(text) => setFormData({ ...formData, descricao: text })}
        />
      </View>

      {/* Numbers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Envolvidos</Text>
        <View style={styles.numberRow}>
          <View style={styles.numberInput}>
            <Text style={styles.numberLabel}>Vítimas</Text>
            <TextInput
              style={styles.numberField}
              keyboardType="number-pad"
              value={formData.numero_vitimas}
              onChangeText={(text) => setFormData({ ...formData, numero_vitimas: text })}
            />
          </View>
          <View style={styles.numberInput}>
            <Text style={styles.numberLabel}>Veículos</Text>
            <TextInput
              style={styles.numberField}
              keyboardType="number-pad"
              value={formData.numero_veiculos}
              onChangeText={(text) => setFormData({ ...formData, numero_veiculos: text })}
            />
          </View>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>🚨 Enviar Reporte</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Ao enviar este reporte, você está ajudando a melhorar a segurança viária em Angola.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12
  },
  locationButton: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  locationButtonText: {
    color: '#0F172A',
    fontWeight: '600'
  },
  coordinates: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  optionButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A'
  },
  optionText: {
    color: '#64748B',
    fontSize: 13
  },
  optionTextActive: {
    color: '#fff'
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  severityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  severityText: {
    fontWeight: 'bold',
    fontSize: 12
  },
  textArea: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#0F172A'
  },
  numberRow: {
    flexDirection: 'row',
    gap: 12
  },
  numberInput: {
    flex: 1
  },
  numberLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  numberField: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0F172A'
  },
  submitButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  disclaimer: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 32
  }
});
