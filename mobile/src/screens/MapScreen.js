import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Linking,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');
const MIN_ZOOM_DELTA = 0.0007;
const MAX_ZOOM_DELTA = 0.9;
const ZOOM_IN_SCALE = 0.45;
const ZOOM_OUT_SCALE = 2.2;

export default function MapScreen({ navigation, route }) {
  const { token, user } = useAuth();
  const isCidadao = user?.role === 'cidadao' || user?.tipo === 'cidadao';
  const [accidents, setAccidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [googleApiKey, setGoogleApiKey] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [activeRouteSession, setActiveRouteSession] = useState(null);
  const [region, setRegion] = useState({
    latitude: -8.8383,
    longitude: 13.2344,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(340)).current;

  useEffect(() => {
    loadData();
    getUserLocation();
    fetchGoogleApiKey();
  }, []);

  useEffect(() => {
    if (userLocation) {
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  }, [userLocation]);

  useEffect(() => {
    const focusAccidentId = route?.params?.focusAccidentId;
    if (!focusAccidentId || accidents.length === 0 || !mapRef.current) return;

    const targetAccident = accidents.find(
      (accident) => (accident._id || accident.acidente_id) === focusAccidentId
    );

    if (!targetAccident) return;

    const nextRegion = {
      latitude: targetAccident.latitude,
      longitude: targetAccident.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };

    setSelectedAccident(targetAccident);
    setRegion(nextRegion);
    mapRef.current.animateToRegion(nextRegion, 450);
    navigation.setParams({ focusAccidentId: undefined });
  }, [route?.params?.focusAccidentId, accidents, navigation]);

  useEffect(() => {
    if (selectedAccident) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
      if (!activeRouteSession) {
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    }
  }, [selectedAccident, activeRouteSession]);

  const fetchGoogleApiKey = async () => {
    try {
      const response = await api.getGoogleMapsKey(token);
      if (response?.api_key) {
        setGoogleApiKey(response.api_key);
      }
    } catch (error) {
      console.error('Error fetching Google API key:', error);
    }
  };

  const loadData = async () => {
    try {
      const [accidentsData, zonesData] = await Promise.all([
        api.getAcidentesAtivos(token),
        api.getZonasCriticas()
      ]);
      if (isCidadao) {
        const userId = user?.id || user?._id;
        setAccidents(accidentsData.filter(a => a.created_by === userId || a.created_by === user?.email));
      } else {
        setAccidents(accidentsData);
      }
      setZones(zonesData);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const getMarkerColor = (gravidade) => {
    const colors = {
      FATAL: COLORS.red,
      GRAVE: COLORS.orange,
      MODERADO: '#F59E0B',
      LEVE: COLORS.green,
    };
    return colors[gravidade] || COLORS.gray;
  };

  const getZoneColor = (nivel) => {
    const colors = {
      CRITICO: 'rgba(220, 38, 38, 0.30)',
      ALTO: 'rgba(239, 68, 68, 0.24)',
      MEDIO: 'rgba(245, 158, 11, 0.24)',
      BAIXO: 'rgba(34, 197, 94, 0.18)',
    };
    return colors[nivel] || 'rgba(107, 114, 128, 0.2)';
  };

  const getZoneStrokeColor = (nivel) => {
    const colors = {
      CRITICO: '#991B1B',
      ALTO: '#DC2626',
      MEDIO: '#F59E0B',
      BAIXO: '#16A34A',
    };
    return colors[nivel] || COLORS.gray;
  };

  const activeCount = useMemo(
    () => accidents.filter(a => ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'].includes(a.status)).length,
    [accidents]
  );

  const canZoomIn = region.latitudeDelta > MIN_ZOOM_DELTA;
  const canZoomOut = region.latitudeDelta < MAX_ZOOM_DELTA;

  const focusMyLocation = () => {
    if (!mapRef.current || !userLocation) return;
    const nextRegion = {
      ...userLocation,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setRegion(nextRegion);
    mapRef.current.animateToRegion(nextRegion, 500);
  };

  const openRoute = async () => {
    const target = selectedAccident
      ? {
          latitude: selectedAccident.latitude,
          longitude: selectedAccident.longitude,
        }
      : userLocation;

    if (!target?.latitude || !target?.longitude || !userLocation) {
      focusMyLocation();
      return;
    }

    if (!googleApiKey) {
      console.error('Google Maps API key not configured');
      return;
    }

    try {
      const origin = `${userLocation.latitude},${userLocation.longitude}`;
      const destination = `${target.latitude},${target.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${googleApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        const coords = decodePolyline(points);
        setRouteCoordinates(coords);

        // Extract route information
        const leg = route.legs[0];
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration.value,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text,
            duration: step.duration.text,
          })),
        });

        // Fit map to show entire route
        if (mapRef.current && coords.length > 0) {
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  const zoomByFactor = (factor) => {
    if (!mapRef.current || !region) return;
    if (factor > 0 && !canZoomIn) return;
    if (factor < 0 && !canZoomOut) return;

    const zoomScale = factor > 0 ? ZOOM_IN_SCALE : ZOOM_OUT_SCALE;
    const nextRegion = {
      ...region,
      latitudeDelta: Math.min(MAX_ZOOM_DELTA, Math.max(MIN_ZOOM_DELTA, region.latitudeDelta * zoomScale)),
      longitudeDelta: Math.min(MAX_ZOOM_DELTA, Math.max(MIN_ZOOM_DELTA, region.longitudeDelta * zoomScale)),
    };
    setRegion(nextRegion);
    mapRef.current.animateToRegion(nextRegion, 250);
  };

  const handleTopBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Sidebar');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            mapType={mapType}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            showsTraffic={showTraffic}
          >
            {zones.map((zone, idx) => (
              <Circle
                key={zone.zona_id || zone._id || `zone-${idx}`}
                center={{
                  latitude: zone.latitude_centro,
                  longitude: zone.longitude_centro,
                }}
                radius={zone.raio_metros}
                fillColor={getZoneColor(zone.nivel_risco)}
                strokeColor={getZoneStrokeColor(zone.nivel_risco)}
                strokeWidth={2}
              />
            ))}

            {accidents.map((accident, idx) => (
              <Marker
                key={accident.acidente_id || accident._id || `acc-${idx}`}
                coordinate={{
                  latitude: accident.latitude,
                  longitude: accident.longitude,
                }}
                onPress={() => setSelectedAccident(accident)}
              >
                <View style={[styles.markerPin, { borderColor: getMarkerColor(accident.gravidade) }]}>
                  <View style={[styles.markerInner, { backgroundColor: getMarkerColor(accident.gravidade) }]}>
                    <Ionicons name="car-sport" size={18} color={COLORS.white} />
                  </View>
                </View>
              </Marker>
            ))}

            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={COLORS.blue}
                strokeWidth={4}
              />
            )}
          </MapView>

          <View style={styles.mapShadeTop} />
          <View style={styles.mapShadeBottom} />

          <View style={styles.topRouteBanner}>
            <TouchableOpacity onPress={handleTopBack} style={styles.topBannerBack}>
              <Ionicons name="arrow-back" size={26} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.topBannerContent}>
              <Text style={styles.topBannerTitle}>
                {isCidadao ? 'Reportar / Luanda' : 'Mapa / Acidentes / Luanda'}
              </Text>
              <Text style={styles.topBannerMeta}>
                {activeCount} ativo{activeCount !== 1 ? 's' : ''} • {zones.length} zona{zones.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={loadData} style={styles.topBannerAction}>
              <Ionicons name="refresh" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.sideControls}>
            <TouchableOpacity 
              style={[styles.sideButton, showTraffic && styles.sideButtonActive]} 
              onPress={() => setShowTraffic(!showTraffic)}
            >
              <Ionicons name="car" size={20} color={showTraffic ? '#FF7A00' : COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideButton} onPress={() => setMapType(prev => prev === 'standard' ? 'satellite' : 'standard')}>
              <Ionicons name="layers" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sideButton, !canZoomIn && styles.sideButtonDisabled]}
              onPress={() => zoomByFactor(1)}
              disabled={!canZoomIn}
            >
              <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sideButton, !canZoomOut && styles.sideButtonDisabled]}
              onPress={() => zoomByFactor(-1)}
              disabled={!canZoomOut}
            >
              <Ionicons name="remove" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sideButton, styles.sideButtonBlue]} onPress={focusMyLocation}>
              <Ionicons name="navigate" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.detailSheet,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {selectedAccident && (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeaderRow}>
                  <View style={[styles.gravityChip, { backgroundColor: getMarkerColor(selectedAccident.gravidade) }]}>
                    <Text style={styles.gravityChipText}>{selectedAccident.gravidade}</Text>
                  </View>
                  <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setSelectedAccident(null)}>
                    <Ionicons name="close" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sheetTitle}>
                  {selectedAccident.tipo_acidente?.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.sheetDescription} numberOfLines={3}>
                  {selectedAccident.descricao || 'Sem descrição adicional.'}
                </Text>

                <View style={styles.sheetStatsRow}>
                  <View style={styles.sheetStatCard}>
                    <Text style={styles.sheetStatValue}>{selectedAccident.numero_veiculos || '0'}</Text>
                    <Text style={styles.sheetStatLabel}>Veículos</Text>
                  </View>
                  <View style={styles.sheetStatCard}>
                    <Text style={styles.sheetStatValue}>{selectedAccident.numero_vitimas || '0'}</Text>
                    <Text style={styles.sheetStatLabel}>Vítimas</Text>
                  </View>
                  <View style={styles.sheetStatCard}>
                    <Text style={styles.sheetStatValue}>{selectedAccident.status?.replace(/_/g, ' ') || 'N/D'}</Text>
                    <Text style={styles.sheetStatLabel}>Estado</Text>
                  </View>
                </View>

                {routeInfo && (
                  <View style={styles.routeInfoCard}>
                    <View style={styles.routeInfoRow}>
                      <Ionicons name="car-outline" size={18} color={COLORS.blue} />
                      <Text style={styles.routeInfoText}>
                        <Text style={styles.routeInfoBold}>{routeInfo.distance}</Text> • {routeInfo.duration}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.clearRouteButton}
                      onPress={() => {
                        setRouteCoordinates([]);
                        setRouteInfo(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#64748B" />
                      <Text style={styles.clearRouteText}>Limpar rota</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.sheetActionsRow}>
                  <TouchableOpacity
                    style={styles.sheetPrimaryButton}
                    onPress={() => navigation.navigate('AccidentDetail', { accidentId: selectedAccident._id || selectedAccident.acidente_id })}
                  >
                    <Text style={styles.sheetPrimaryText}>Ver Detalhes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetSecondaryButton}
                    onPress={() => {
                      if (routeCoordinates.length > 0) {
                        setActiveRouteSession({
                          accident: selectedAccident,
                          route: routeCoordinates,
                          info: routeInfo,
                        });
                        setSelectedAccident(null);
                      } else {
                        openRoute();
                      }
                    }}
                  >
                    <Ionicons name={routeCoordinates.length > 0 ? "play" : "navigate"} size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>

          {activeRouteSession && (
            <View style={styles.activeRouteBar}>
              <View style={styles.activeRouteContent}>
                <View style={styles.activeRouteIcon}>
                  <Ionicons name="navigate" size={20} color={COLORS.white} />
                </View>
                <View style={styles.activeRouteInfo}>
                  <Text style={styles.activeRouteTitle}>Rota Ativa</Text>
                  <Text style={styles.activeRouteSubtitle}>
                    {activeRouteSession.info?.distance} • {activeRouteSession.info?.duration}
                  </Text>
                </View>
              </View>
              <View style={styles.activeRouteActions}>
                <TouchableOpacity 
                  style={styles.activeRouteButton}
                  onPress={() => setSelectedAccident(activeRouteSession.accident)}
                >
                  <Ionicons name="information-circle" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.activeRouteButton, styles.activeRouteEndButton]}
                  onPress={() => {
                    setActiveRouteSession(null);
                    setRouteCoordinates([]);
                    setRouteInfo(null);
                  }}
                >
                  <Ionicons name="close" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate('Sidebar')}>
              <Ionicons name="compass-outline" size={22} color="#E5E7EB" />
              <Text style={styles.bottomBarLabel}>Explorar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate('MyReports')}>
              <Ionicons name="document-text-outline" size={22} color="#E5E7EB" />
              <Text style={styles.bottomBarLabel}>Relatórios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.centerReportButton} onPress={() => navigation.navigate('ReportAccident')} activeOpacity={0.9}>
              <Ionicons name="add" size={34} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={openRoute}>
              <Ionicons name="navigate-circle-outline" size={24} color="#E5E7EB" />
              <Text style={styles.bottomBarLabel}>Rota</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#E5E7EB" />
              <Text style={styles.bottomBarLabel}>Atualizações</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!loading && !selectedAccident && (
        <View style={styles.reportPromptOverlay}>
          <View style={[styles.reportPromptCard, { alignSelf: 'center' }]}>
            <View style={styles.reportPromptHeader}>
              <View style={styles.reportPromptIconLarge}>
                <Ionicons name="alert-circle" size={28} color="#FF7A00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportPromptTitle}>Reportar Acidente</Text>
                <Text style={styles.reportPromptSubtitle}>Selecione Localização & Confirme</Text>
              </View>
            </View>

            <View style={styles.reportStepsContainer}>
              <View style={styles.reportStepItem}>
                <View style={styles.reportStepNumber}>
                  <Text style={styles.reportStepNumberText}>1</Text>
                </View>
                <Text style={styles.reportStepLabel}>Localizar</Text>
              </View>
              <View style={styles.reportStepDivider} />
              <View style={styles.reportStepItem}>
                <View style={styles.reportStepNumber}>
                  <Text style={styles.reportStepNumberText}>2</Text>
                </View>
                <Text style={styles.reportStepLabel}>Detalhar</Text>
              </View>
              <View style={styles.reportStepDivider} />
              <View style={styles.reportStepItem}>
                <View style={styles.reportStepNumber}>
                  <Text style={styles.reportStepNumberText}>3</Text>
                </View>
                <Text style={styles.reportStepLabel}>Enviar</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#05070B',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.white,
    opacity: 0.75,
  },
  map: {
    flex: 1,
  },
  mapShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  mapShadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  topRouteBanner: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    height: 78,
    borderRadius: 22,
    backgroundColor: '#0F5D3F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    ...SHADOWS.large,
  },
  topBannerBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBannerContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  topBannerTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '800',
  },
  topBannerMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 2,
  },
  topBannerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControls: {
    position: 'absolute',
    right: 16,
    top: height * 0.26,
    alignItems: 'center',
    gap: 12,
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  sideButtonDisabled: {
    opacity: 0.38,
  },
  sideButtonActive: {
    backgroundColor: 'rgba(255,122,0,0.15)',
    borderColor: '#FF7A00',
  },
  sideButtonBlue: {
    backgroundColor: 'rgba(37,99,235,0.92)',
  },
  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportPromptOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 112,
    pointerEvents: 'box-none',
  },
  reportPromptCard: {
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    padding: 18,
    zIndex: 125,
    elevation: 125,
    ...SHADOWS.large,
    pointerEvents: 'auto',
  },
  reportPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reportStepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(241,245,249,0.8)',
    borderRadius: 16,
    padding: 12,
  },
  reportStepItem: {
    alignItems: 'center',
    flex: 1,
  },
  reportStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0B72FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  reportStepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reportStepLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  reportStepDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  reportPromptIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,122,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportPromptTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  reportPromptSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  detailSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 102,
    backgroundColor: 'rgba(12,16,24,0.96)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 110,
    elevation: 110,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gravityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gravityChipText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  sheetDescription: {
    color: 'rgba(255,255,255,0.72)',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sheetStatCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  sheetStatValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheetStatLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  routeInfoCard: {
    marginTop: 14,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInfoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  routeInfoBold: {
    fontWeight: '800',
    color: COLORS.white,
  },
  clearRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearRouteText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sheetPrimaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0B72FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSecondaryButton: {
    width: 54,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRouteBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 110,
    backgroundColor: 'rgba(11,114,255,0.95)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 105,
    elevation: 105,
    ...SHADOWS.large,
  },
  activeRouteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeRouteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeRouteInfo: {
    flex: 1,
  },
  activeRouteTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  activeRouteSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  activeRouteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  activeRouteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRouteEndButton: {
    backgroundColor: 'rgba(239,68,68,0.3)',
  },
  bottomBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    height: 84,
    borderRadius: 28,
    backgroundColor: 'rgba(8,10,15,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 100,
    elevation: 100,
    ...SHADOWS.large,
  },
  bottomBarItem: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarLabel: {
    color: '#E5E7EB',
    fontSize: 11,
    marginTop: 4,
  },
  centerReportButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
    borderColor: '#111827',
    ...SHADOWS.large,
  },
});
