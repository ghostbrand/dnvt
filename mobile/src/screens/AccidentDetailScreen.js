import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Dimensions, Platform, Linking,
  Modal, Image, KeyboardAvoidingView
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  const [trackingLocation, setTrackingLocation] = useState(false);

  // Delegation state
  const [missionStatus, setMissionStatus] = useState(null); // null, 'PENDENTE', 'APROVADA', 'REJEITADA'
  const [requestingMission, setRequestingMission] = useState(false);

  // Expandable map
  const [mapExpanded, setMapExpanded] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [annotationPhotos, setAnnotationPhotos] = useState([]);
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);

  const toast = useToast();
  const mapRef = useRef(null);
  const expandedMapRef = useRef(null);
  const locationSubRef = useRef(null);
  const locationIntervalRef = useRef(null);

  const isAgent = user?.role === 'policia' || user?.role === 'admin' || user?.tipo === 'policia';
  const acidenteId = accident?._id || accident?.acidente_id || accidentId;

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

  // Check delegation status once accident and user are loaded
  useEffect(() => {
    if (accident && isAgent && user) {
      checkDelegationStatus();
      loadAnnotations();
    }
  }, [accident]);

  useEffect(() => {
    if (userLocation && accident && !arrived && missionStatus === 'APROVADA') {
      checkArrival();
      fetchRoute();
    } else if (userLocation && accident) {
      fetchRoute();
    }
  }, [userLocation, accident, missionStatus]);

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

  const checkDelegationStatus = async () => {
    try {
      const agentId = user?.id || user?._id;
      if (!agentId) return;
      const delegacao = await api.getMinhaDelegacao(acidenteId, agentId, token);
      if (delegacao) {
        setMissionStatus(delegacao.status);
        if (delegacao.status === 'APROVADA') {
          startLocationTracking();
        }
      }
    } catch (err) {
      console.error('Delegation check error:', err);
    }
  };

  const loadAnnotations = async () => {
    try {
      const data = await api.getAnotacoes(acidenteId, token);
      setAnnotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Annotations load error:', err);
    }
  };

  const handleSolicitarMissao = async () => {
    setRequestingMission(true);
    try {
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

      await api.solicitarMissao({
        acidente_id: acidenteId,
        agente_id: user?.id || user?._id,
        agente_nome: user?.nome || user?.name || '',
        agente_telefone: user?.telefone || '',
        latitude_agente: lat,
        longitude_agente: lng
      }, token);

      setMissionStatus('PENDENTE');
      toast.success('Pedido Enviado', 'O seu pedido de missão foi enviado à base. Aguarde aprovação.');
    } catch (err) {
      const msg = err?.message || err?.error || 'Erro ao solicitar missão.';
      toast.error('Erro', msg);
    } finally {
      setRequestingMission(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      if (locationSubRef.current) return; // already tracking
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
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
      console.error('Location tracking error:', err);
    }
  };

  const checkArrival = () => {
    if (!userLocation || !accident) return;
    const dLat = (userLocation.latitude - accident.latitude) * 111320;
    const dLng = (userLocation.longitude - accident.longitude) * 111320 * Math.cos(accident.latitude * Math.PI / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist <= ARRIVAL_RADIUS_METERS && !arrived) {
      setArrived(true);
      api.updateAgentLocation(accidentId, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        status: 'CHEGOU'
      }, token).catch(() => {});

      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      toast.success('Chegou ao Local', 'Você chegou ao local do acidente.');
    }
  };

  const fetchRoute = async () => {
    if (!userLocation || !accident) return;
    try {
      const origin = `${userLocation.longitude},${userLocation.latitude}`;
      const dest = `${accident.longitude},${accident.latitude}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
        setRouteCoords(coords);
        setEta(Math.ceil(route.duration / 60));
        setDistance((route.distance / 1000).toFixed(1));
      }
    } catch (err) {
      const dLat = (userLocation.latitude - accident.latitude) * 111320;
      const dLng = (userLocation.longitude - accident.longitude) * 111320 * Math.cos(accident.latitude * Math.PI / 180);
      const distM = Math.sqrt(dLat * dLat + dLng * dLng);
      setDistance((distM / 1000).toFixed(1));
      setEta(Math.ceil(distM / 500));
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

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.updateAcidente(acidenteId, { status: newStatus }, token);
      setAccident(prev => ({ ...prev, status: newStatus }));
      toast.success('Sucesso', `Status atualizado para ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error('Erro', 'Não foi possível atualizar o status.');
    }
  };

  // Annotations
  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permissão', 'Permissão de câmera é necessária.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setAnnotationPhotos(prev => [...prev, {
          uri: asset.uri,
          base64: asset.base64
        }]);
      }
    } catch (err) {
      toast.error('Erro', 'Não foi possível capturar a foto.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permissão', 'Permissão de galeria é necessária.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newPhotos = result.assets.map(a => ({ uri: a.uri, base64: a.base64 }));
        setAnnotationPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (err) {
      toast.error('Erro', 'Não foi possível selecionar a foto.');
    }
  };

  const removePhoto = (idx) => {
    setAnnotationPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAnnotation = async () => {
    if (!newAnnotation.trim() && annotationPhotos.length === 0) {
      toast.warning('Atenção', 'Adicione um texto ou pelo menos uma foto.');
      return;
    }
    setSavingAnnotation(true);
    try {
      // Upload photos first
      const uploadedUrls = [];
      for (const photo of annotationPhotos) {
        if (photo.base64) {
          const resp = await api.uploadFotoAnotacao({ base64: photo.base64 }, token);
          if (resp?.url) uploadedUrls.push(resp.url);
        }
      }

      await api.createAnotacao({
        acidente_id: acidenteId,
        agente_id: user?.id || user?._id,
        agente_nome: user?.nome || user?.name || '',
        texto: newAnnotation.trim(),
        fotos: uploadedUrls
      }, token);

      toast.success('Sucesso', 'Anotação registada com sucesso.');
      setNewAnnotation('');
      setAnnotationPhotos([]);
      setShowAnnotationForm(false);
      loadAnnotations();
    } catch (err) {
      toast.error('Erro', err?.message || 'Erro ao salvar anotação.');
    } finally {
      setSavingAnnotation(false);
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

  // Map content (shared between inline and expanded)
  const renderMapContent = () => (
    <>
      <Marker
        coordinate={{ latitude: accident.latitude, longitude: accident.longitude }}
        title="Local do Acidente"
      >
        <View style={[styles.marker, { backgroundColor: getGravidadeColor(accident.gravidade) }]}>
          <Ionicons name="car" size={18} color={COLORS.white} />
        </View>
      </Marker>
      {routeCoords.length > 0 && (
        <Polyline coordinates={routeCoords} strokeColor={COLORS.blue} strokeWidth={4} />
      )}
    </>
  );

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
        {/* Inline Map */}
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
            {renderMapContent()}
          </MapView>

          {/* ETA overlay */}
          {eta != null && (
            <View style={styles.etaOverlay}>
              <Ionicons name="navigate" size={16} color={COLORS.blue} />
              <Text style={styles.etaText}>{eta} min</Text>
              <Text style={styles.etaDistText}>{distance} km</Text>
            </View>
          )}

          {/* Expand button */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setMapExpanded(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={18} color={COLORS.white} />
          </TouchableOpacity>

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

        {/* Status + tracking badges */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { borderColor: getStatusColor(accident.status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(accident.status) }]} />
            <Text style={[styles.statusLabel, { color: getStatusColor(accident.status) }]}>
              {accident.status?.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {missionStatus === 'APROVADA' && !arrived && (
              <View style={[styles.trackingBadge, { backgroundColor: 'rgba(37,99,235,0.15)' }]}>
                <Ionicons name="navigate" size={12} color={COLORS.blue} />
                <Text style={[styles.trackingText, { color: COLORS.blue }]}>Missão ativa</Text>
              </View>
            )}
            {missionStatus === 'PENDENTE' && (
              <View style={[styles.trackingBadge, { backgroundColor: 'rgba(234,179,8,0.15)' }]}>
                <Ionicons name="time" size={12} color="#EAB308" />
                <Text style={[styles.trackingText, { color: '#EAB308' }]}>Aguardando</Text>
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

        {/* Solicitar Missão — only for agents without active delegation */}
        {isAgent && !missionStatus && accident.status !== 'RESOLVIDO' && (
          <TouchableOpacity
            style={[styles.solicitarBtn, requestingMission && { opacity: 0.7 }]}
            onPress={handleSolicitarMissao}
            disabled={requestingMission}
            activeOpacity={0.8}
          >
            {requestingMission ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="hand-left" size={20} color={COLORS.white} />
                <Text style={styles.solicitarBtnText}>Solicitar Missão</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Pending mission info */}
        {missionStatus === 'PENDENTE' && (
          <View style={styles.pendingCard}>
            <Ionicons name="hourglass" size={24} color="#EAB308" />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.pendingTitle}>Pedido em análise</Text>
              <Text style={styles.pendingDesc}>A base está a analisar o seu pedido de missão. Será notificado quando for aprovado ou rejeitado.</Text>
            </View>
          </View>
        )}

        {/* Rejected mission info */}
        {missionStatus === 'REJEITADA' && (
          <View style={[styles.pendingCard, { borderColor: '#FCA5A5' }]}>
            <Ionicons name="close-circle" size={24} color={COLORS.red} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[styles.pendingTitle, { color: COLORS.red }]}>Pedido rejeitado</Text>
              <Text style={styles.pendingDesc}>O seu pedido de missão foi rejeitado pela base.</Text>
            </View>
          </View>
        )}

        {/* Quick status actions for delegated agent */}
        {isAgent && missionStatus === 'APROVADA' && (
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
          </View>
        )}

        {/* Accident info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Detalhes do Acidente</Text>
          {accident.descricao ? (
            <Text style={styles.infoDesc}>{accident.descricao}</Text>
          ) : null}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="car-outline" size={20} color={COLORS.blue} />
              <Text style={styles.infoValue}>{accident.numero_veiculos || 'N/D'}</Text>
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

        {/* Annotations section — agents only */}
        {isAgent && (
          <View style={styles.annotationCard}>
            <View style={styles.annotationHeader}>
              <Text style={styles.infoTitle}>Anotações ({annotations.length})</Text>
              <TouchableOpacity
                style={styles.addAnnotationBtn}
                onPress={() => setShowAnnotationForm(!showAnnotationForm)}
              >
                <Ionicons name={showAnnotationForm ? 'close' : 'add'} size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Annotation form */}
            {showAnnotationForm && (
              <View style={styles.annotationForm}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newAnnotation}
                  onChangeText={setNewAnnotation}
                  placeholder="Escreva a sua anotação..."
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Photo previews */}
                {annotationPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                    {annotationPhotos.map((photo, idx) => (
                      <View key={idx} style={styles.photoPreview}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(idx)}>
                          <Ionicons name="close-circle" size={20} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={styles.annotationActions}>
                  <TouchableOpacity style={styles.photoBtnSmall} onPress={pickPhoto}>
                    <Ionicons name="camera" size={20} color={COLORS.blue} />
                    <Text style={styles.photoBtnText}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtnSmall} onPress={pickFromGallery}>
                    <Ionicons name="images" size={20} color={COLORS.purple} />
                    <Text style={styles.photoBtnText}>Galeria</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveAnnotationBtn, savingAnnotation && { opacity: 0.7 }]}
                    onPress={handleSaveAnnotation}
                    disabled={savingAnnotation}
                  >
                    {savingAnnotation ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color={COLORS.white} />
                        <Text style={styles.saveAnnotationText}>Enviar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Existing annotations */}
            {annotations.length === 0 && !showAnnotationForm ? (
              <Text style={styles.noAnnotations}>Nenhuma anotação registada.</Text>
            ) : (
              annotations.map((a, idx) => (
                <View key={a._id || idx} style={styles.annotationItem}>
                  <View style={styles.annotationMeta}>
                    <Ionicons name="person-circle" size={16} color={COLORS.blue} />
                    <Text style={styles.annotationAuthor}>{a.agente_nome || 'Agente'}</Text>
                    <Text style={styles.annotationTime}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('pt-AO') : ''}
                    </Text>
                  </View>
                  {a.texto ? <Text style={styles.annotationText}>{a.texto}</Text> : null}
                  {a.fotos?.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {a.fotos.map((foto, fi) => (
                        <Image key={fi} source={{ uri: foto }} style={styles.annotationPhoto} />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} animationType="slide" statusBarTranslucent>
        <View style={styles.expandedMapContainer}>
          <MapView
            ref={expandedMapRef}
            style={styles.expandedMap}
            initialRegion={{
              latitude: accident.latitude,
              longitude: accident.longitude,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            showsUserLocation
          >
            {renderMapContent()}
          </MapView>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeExpandedBtn}
            onPress={() => setMapExpanded(false)}
          >
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* ETA on expanded */}
          {eta != null && (
            <View style={[styles.etaOverlay, { top: 60 }]}>
              <Ionicons name="navigate" size={16} color={COLORS.blue} />
              <Text style={styles.etaText}>{eta} min</Text>
              <Text style={styles.etaDistText}>{distance} km</Text>
            </View>
          )}

          {/* Nav button on expanded */}
          <TouchableOpacity style={[styles.navButton, { bottom: 40 }]} onPress={openInMaps} activeOpacity={0.8}>
            <Ionicons name="navigate-circle" size={20} color={COLORS.white} />
            <Text style={styles.navButtonText}>Abrir no Maps</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  expandButton: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  navButton: {
    position: 'absolute', bottom: SPACING.sm, right: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.blue, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    ...SHADOWS.medium,
  },
  navButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sm },
  arrivedBadge: {
    position: 'absolute', bottom: SPACING.sm, left: SPACING.sm,
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
  solicitarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.blue, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, marginBottom: SPACING.md,
    ...SHADOWS.medium, borderBottomWidth: 4, borderBottomColor: '#1D4ED8',
  },
  solicitarBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.md },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  pendingTitle: { fontSize: FONTS.sm, fontWeight: 'bold', color: '#92400E' },
  pendingDesc: { fontSize: FONTS.xs, color: '#78716C', marginTop: 2, lineHeight: 18 },
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
  // Annotations
  annotationCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.medium,
  },
  annotationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addAnnotationBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center',
  },
  annotationForm: { marginBottom: SPACING.md },
  input: {
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md, padding: SPACING.sm,
    fontSize: FONTS.sm, color: COLORS.black, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 80 },
  photoRow: { marginBottom: SPACING.sm },
  photoPreview: { marginRight: 8, position: 'relative' },
  photoThumb: { width: 70, height: 70, borderRadius: RADIUS.sm },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  annotationActions: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  photoBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  photoBtnText: { fontSize: FONTS.xs, color: COLORS.grayDark, fontWeight: '600' },
  saveAnnotationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.green, borderRadius: RADIUS.md,
    paddingVertical: 8, ...SHADOWS.small,
  },
  saveAnnotationText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sm },
  noAnnotations: { color: COLORS.gray, fontSize: FONTS.sm, textAlign: 'center', paddingVertical: SPACING.md },
  annotationItem: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  annotationMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  annotationAuthor: { fontSize: FONTS.xs, fontWeight: '600', color: COLORS.blue },
  annotationTime: { fontSize: 10, color: COLORS.gray, marginLeft: 'auto' },
  annotationText: { fontSize: FONTS.sm, color: COLORS.grayDark, lineHeight: 20 },
  annotationPhoto: { width: 100, height: 80, borderRadius: RADIUS.sm, marginRight: 6 },
  // Expanded map modal
  expandedMapContainer: { flex: 1, backgroundColor: COLORS.bgDark },
  expandedMap: { flex: 1 },
  closeExpandedBtn: {
    position: 'absolute', top: 50, left: SPACING.md,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.medium,
  },
});
