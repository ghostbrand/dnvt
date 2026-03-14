import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Dimensions, Platform, Linking
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../components/Toast';

const { width } = Dimensions.get('window');
const ARRIVAL_RADIUS_METERS = 100;

export default function AccidentDetailScreen({ route, navigation }) {
  const { accidentId } = route.params;
  const { user, token } = useAuth();
  const [accident, setAccident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [showBoletim, setShowBoletim] = useState(false);
  const [boletimData, setBoletimData] = useState({
    observacoes: '',
    numero_processo: '',
  });
  const [savingBoletim, setSavingBoletim] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const toast = useToast();
  const mapRef = useRef(null);
  const locationSubRef = useRef(null);
  const locationIntervalRef = useRef(null);

  useEffect(() => {
    loadAccident();
    getInitialLocation();
    return () => {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, []);

  // Show confirmation dialog once accident is loaded
  useEffect(() => {
    if (accident && !confirmed && !showConfirmDialog) {
      setShowConfirmDialog(true);
      Alert.alert(
        'Confirmar Deslocação',
        `Deseja confirmar que está a ir para o local deste acidente?\n\n${(accident.tipo_acidente || 'Acidente').replace(/_/g, ' ')} — ${accident.gravidade}`,
        [
          { text: 'Não, apenas ver', style: 'cancel', onPress: () => setShowConfirmDialog(false) },
          { text: 'Sim, estou a ir', style: 'default', onPress: () => handleConfirmIda() }
        ]
      );
    }
  }, [accident]);

  useEffect(() => {
    if (userLocation && accident && !arrived) {
      checkArrival();
      fetchRoute();
    }
  }, [userLocation, accident]);

  const loadAccident = async () => {
    try {
      const data = await api.getAcidente(accidentId, token);
      setAccident(data);
    } catch (err) {
      console.error('Error loading accident:', err);
      toast.error('Erro', 'Não foi possível carregar os detalhes do acidente.');
    } finally {
      setLoading(false);
    }
  };

  const getInitialLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permissão', 'Permissão de localização é necessária para calcular a rota.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  const handleConfirmIda = async () => {
    setConfirmed(true);
    setShowConfirmDialog(false);
    try {
      // Get current position for the confirmation
      let lat = userLocation?.latitude;
      let lng = userLocation?.longitude;
      if (!lat) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
        } catch (_) {}
      }

      // Confirm with backend
      await api.confirmarIda(accidentId, { latitude: lat, longitude: lng }, token);

      // Start continuous location tracking
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 },
        (loc) => {
          const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(newLoc);
        }
      );
      locationSubRef.current = sub;
      setTrackingLocation(true);

      // Send location updates to backend every 10 seconds
      locationIntervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await api.updateAgentLocation(accidentId, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          }, token);
        } catch (_) {}
      }, 10000);

    } catch (err) {
      console.error('Confirm error:', err);
      toast.error('Erro', 'Não foi possível registar a confirmação.');
    }
  };

  const checkArrival = () => {
    if (!userLocation || !accident) return;
    const dLat = (userLocation.latitude - accident.latitude) * 111320;
    const dLng = (userLocation.longitude - accident.longitude) * 111320 * Math.cos(accident.latitude * Math.PI / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist <= ARRIVAL_RADIUS_METERS && !arrived) {
      setArrived(true);

      // Notify backend that agent arrived
      if (confirmed) {
        api.updateAgentLocation(accidentId, {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          status: 'CHEGOU'
        }, token).catch(() => {});

        // Stop the location broadcast interval
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = null;
        }
      }

      toast.success('Chegou ao Local', 'Você chegou ao local do acidente.');
      setTimeout(() => setShowBoletim(true), 1500);
    }
  };

  const fetchRoute = async () => {
    if (!userLocation || !accident) return;

    try {
      // Use Google Directions API or OSRM for route
      const origin = `${userLocation.longitude},${userLocation.latitude}`;
      const dest = `${accident.longitude},${accident.latitude}`;

      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoords(coords);

        // Duration in seconds, distance in meters
        const durationMin = Math.ceil(route.duration / 60);
        const distKm = (route.distance / 1000).toFixed(1);
        setEta(durationMin);
        setDistance(distKm);
      }
    } catch (err) {
      // Fallback: straight-line distance
      const dLat = (userLocation.latitude - accident.latitude) * 111320;
      const dLng = (userLocation.longitude - accident.longitude) * 111320 * Math.cos(accident.latitude * Math.PI / 180);
      const distM = Math.sqrt(dLat * dLat + dLng * dLng);
      setDistance((distM / 1000).toFixed(1));
      setEta(Math.ceil(distM / 500)); // rough ~30km/h estimate
    }
  };

  const openInMaps = () => {
    if (!accident) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${accident.latitude},${accident.longitude}`,
      android: `google.navigation:q=${accident.latitude},${accident.longitude}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${accident.latitude},${accident.longitude}`);
    });
  };

  const handleCreateBoletim = async () => {
    if (!boletimData.observacoes.trim()) {
      toast.warning('Campos obrigatórios', 'As observações são obrigatórias.');
      return;
    }
    setSavingBoletim(true);
    try {
      await api.createBoletim({
        acidente_id: accident._id || accident.acidente_id,
        numero_processo: boletimData.numero_processo || `BOL-${Date.now()}`,
        observacoes: boletimData.observacoes,
        modo_criacao: 'MOBILE_AGENTE',
        created_by: user?.id || user?._id || user?.email,
        vitimas_info: [],
        veiculos_info: [],
        testemunhas: [],
      }, token);
      toast.success('Sucesso', 'Boletim de ocorrência registado com sucesso!');
      setShowBoletim(false);
      setBoletimData({ observacoes: '', numero_processo: '' });
    } catch (err) {
      toast.error('Erro', err.message || 'Erro ao criar boletim.');
    } finally {
      setSavingBoletim(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.updateAcidente(accident._id || accident.acidente_id, { status: newStatus }, token);
      setAccident(prev => ({ ...prev, status: newStatus }));
      toast.success('Sucesso', `Status atualizado para ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const getGravidadeColor = (g) => {
    const map = { FATAL: COLORS.red, GRAVE: COLORS.orange, MODERADO: COLORS.yellow, LEVE: COLORS.green };
    return map[g] || COLORS.gray;
  };

  const getStatusColor = (s) => {
    const map = { REPORTADO: '#EAB308', VALIDADO: '#3B82F6', EM_ATENDIMENTO: '#F97316', RESOLVIDO: '#22C55E' };
    return map[s] || COLORS.gray;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>A carregar detalhes...</Text>
      </View>
    );
  }

  if (!accident) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.red} />
        <Text style={styles.loadingText}>Acidente não encontrado</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnAlt}>
          <Text style={styles.backBtnAltText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: SPACING.sm }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {accident.tipo_acidente?.replace(/_/g, ' ') || 'Acidente'}
          </Text>
          <Text style={styles.headerSub}>
            {new Date(accident.created_at).toLocaleString('pt-AO')}
          </Text>
        </View>
        <View style={[styles.gravBadge, { backgroundColor: getGravidadeColor(accident.gravidade) }]}>
          <Text style={styles.gravText}>{accident.gravidade}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map with route */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: accident.latitude,
              longitude: accident.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
          >
            {/* Accident marker */}
            <Marker
              coordinate={{ latitude: accident.latitude, longitude: accident.longitude }}
              title="Local do Acidente"
            >
              <View style={[styles.marker, { backgroundColor: getGravidadeColor(accident.gravidade) }]}>
                <Ionicons name="car" size={18} color={COLORS.white} />
              </View>
            </Marker>

            {/* Route line */}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={COLORS.blue}
                strokeWidth={4}
              />
            )}
          </MapView>

          {/* ETA overlay */}
          {eta != null && (
            <View style={styles.etaOverlay}>
              <Ionicons name="navigate" size={16} color={COLORS.blue} />
              <Text style={styles.etaText}>{eta} min</Text>
              <Text style={styles.etaDistText}>{distance} km</Text>
            </View>
          )}

          {/* Navigate button */}
          <TouchableOpacity style={styles.navButton} onPress={openInMaps} activeOpacity={0.8}>
            <Ionicons name="navigate-circle" size={20} color={COLORS.white} />
            <Text style={styles.navButtonText}>Abrir Rota</Text>
          </TouchableOpacity>

          {/* Arrived badge */}
          {arrived && (
            <View style={styles.arrivedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
              <Text style={styles.arrivedText}>No local</Text>
            </View>
          )}
        </View>

        {/* Status + actions */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { borderColor: getStatusColor(accident.status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(accident.status) }]} />
            <Text style={[styles.statusLabel, { color: getStatusColor(accident.status) }]}>
              {accident.status?.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {confirmed && !arrived && (
              <View style={[styles.trackingBadge, { backgroundColor: 'rgba(37,99,235,0.15)' }]}>
                <Ionicons name="navigate" size={12} color={COLORS.blue} />
                <Text style={[styles.trackingText, { color: COLORS.blue }]}>A caminho</Text>
              </View>
            )}
            {trackingLocation && (
              <View style={styles.trackingBadge}>
                <View style={styles.trackingDot} />
                <Text style={styles.trackingText}>GPS ativo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Confirm button if agent hasn't confirmed yet */}
        {!confirmed && !arrived && (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmIda}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-circle" size={22} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>Confirmar que estou a ir para o local</Text>
          </TouchableOpacity>
        )}

        {/* Quick status actions for agent */}
        <View style={styles.actionRow}>
          {accident.status === 'REPORTADO' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.blue }]}
              onPress={() => handleUpdateStatus('VALIDADO')}
            >
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Validar</Text>
            </TouchableOpacity>
          )}
          {['REPORTADO', 'VALIDADO'].includes(accident.status) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.orange }]}
              onPress={() => handleUpdateStatus('EM_ATENDIMENTO')}
            >
              <Ionicons name="car" size={18} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Em Atendimento</Text>
            </TouchableOpacity>
          )}
          {accident.status === 'EM_ATENDIMENTO' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.green }]}
              onPress={() => handleUpdateStatus('RESOLVIDO')}
            >
              <Ionicons name="checkmark-done" size={18} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Resolver</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.purple }]}
            onPress={() => setShowBoletim(true)}
          >
            <Ionicons name="document-text" size={18} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Boletim</Text>
          </TouchableOpacity>
        </View>

        {/* Accident info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Detalhes do Acidente</Text>
          {accident.descricao ? (
            <Text style={styles.infoDesc}>{accident.descricao}</Text>
          ) : null}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="car-outline" size={20} color={COLORS.blue} />
              <Text style={styles.infoValue}>{accident.numero_veiculos || 0}</Text>
              <Text style={styles.infoLabel}>Veículos</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color={COLORS.orange} />
              <Text style={styles.infoValue}>{accident.numero_vitimas || 0}</Text>
              <Text style={styles.infoLabel}>Vítimas</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color={COLORS.red} />
              <Text style={styles.infoValue}>{accident.latitude?.toFixed(4)}</Text>
              <Text style={styles.infoLabel}>Latitude</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color={COLORS.red} />
              <Text style={styles.infoValue}>{accident.longitude?.toFixed(4)}</Text>
              <Text style={styles.infoLabel}>Longitude</Text>
            </View>
          </View>
          {accident.causa_principal ? (
            <View style={styles.causaRow}>
              <Ionicons name="warning-outline" size={16} color={COLORS.orange} />
              <Text style={styles.causaText}>Causa: {accident.causa_principal.replace(/_/g, ' ')}</Text>
            </View>
          ) : null}
          {accident.endereco ? (
            <View style={styles.causaRow}>
              <Ionicons name="pin-outline" size={16} color={COLORS.gray} />
              <Text style={styles.causaText}>{accident.endereco}</Text>
            </View>
          ) : null}
        </View>

        {/* Boletim form */}
        {showBoletim && (
          <View style={styles.boletimCard}>
            <View style={styles.boletimHeader}>
              <Text style={styles.boletimTitle}>Registar Boletim de Ocorrência</Text>
              <TouchableOpacity onPress={() => setShowBoletim(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Número do Processo</Text>
            <TextInput
              style={styles.input}
              value={boletimData.numero_processo}
              onChangeText={t => setBoletimData(d => ({ ...d, numero_processo: t }))}
              placeholder="Ex: BOL-2026-001"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.fieldLabel}>Observações *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={boletimData.observacoes}
              onChangeText={t => setBoletimData(d => ({ ...d, observacoes: t }))}
              placeholder="Descreva a situação encontrada no local..."
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, savingBoletim && { opacity: 0.7 }]}
              onPress={handleCreateBoletim}
              disabled={savingBoletim}
              activeOpacity={0.8}
            >
              {savingBoletim ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="document-text" size={18} color={COLORS.white} />
                  <Text style={styles.submitBtnText}>Registar Boletim</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
  loadingText: { color: COLORS.white, marginTop: SPACING.md, fontSize: FONTS.sm },
  backBtnAlt: { marginTop: SPACING.lg, backgroundColor: COLORS.blue, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  backBtnAltText: { color: COLORS.white, fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 55, paddingBottom: SPACING.md, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgDark,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.white, textTransform: 'capitalize' },
  headerSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  gravBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  gravText: { color: COLORS.white, fontSize: FONTS.xs, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: SPACING.md },
  mapContainer: {
    height: 260, borderRadius: RADIUS.lg, overflow: 'hidden',
    marginBottom: SPACING.md, ...SHADOWS.medium,
  },
  map: { flex: 1 },
  marker: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
  },
  etaOverlay: {
    position: 'absolute', top: SPACING.sm, left: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    ...SHADOWS.small,
  },
  etaText: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.blue },
  etaDistText: { fontSize: FONTS.xs, color: COLORS.gray },
  navButton: {
    position: 'absolute', bottom: SPACING.sm, right: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.blue, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    ...SHADOWS.medium,
  },
  navButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sm },
  arrivedBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  arrivedText: { fontSize: FONTS.xs, fontWeight: 'bold', color: COLORS.green },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: FONTS.sm, fontWeight: '700' },
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  trackingText: { fontSize: FONTS.xs, color: '#22C55E', fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.blue, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, marginBottom: SPACING.md,
    ...SHADOWS.medium, borderBottomWidth: 4, borderBottomColor: '#1D4ED8',
  },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.md },
  actionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, ...SHADOWS.small,
  },
  actionBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sm },
  infoCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.medium,
  },
  infoTitle: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.black, marginBottom: SPACING.sm },
  infoDesc: { fontSize: FONTS.sm, color: COLORS.grayDark, marginBottom: SPACING.md, lineHeight: 20 },
  infoGrid: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoItem: { alignItems: 'center' },
  infoValue: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.black, marginTop: 4 },
  infoLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase', marginTop: 2 },
  causaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  causaText: { fontSize: FONTS.sm, color: COLORS.grayDark, flex: 1 },
  boletimCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.medium,
  },
  boletimHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  boletimTitle: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.purple },
  fieldLabel: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.gray, marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md, padding: SPACING.sm,
    fontSize: FONTS.sm, color: COLORS.black, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 100 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.purple, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, marginTop: SPACING.sm,
    ...SHADOWS.medium, borderBottomWidth: 4, borderBottomColor: '#0F172A',
  },
  submitBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.md },
});
