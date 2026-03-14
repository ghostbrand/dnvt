import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, FONTS, RADIUS } from '../config';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
  const { token, user } = useAuth();
  const isCidadao = user?.role === 'cidadao' || user?.tipo === 'cidadao';
  const [accidents, setAccidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState(null);
  
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    loadData();
    getUserLocation();
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedAccident ? 0 : 300,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [selectedAccident]);

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
      'FATAL': COLORS.red,
      'GRAVE': COLORS.orange,
      'MODERADO': COLORS.yellow,
      'LEVE': COLORS.green,
    };
    return colors[gravidade] || COLORS.gray;
  };

  const getZoneColor = (nivel) => {
    const colors = {
      'ALTO': 'rgba(229, 57, 53, 0.3)',
      'MEDIO': 'rgba(255, 152, 0, 0.3)',
      'BAIXO': 'rgba(76, 175, 80, 0.3)',
    };
    return colors[nivel] || 'rgba(107, 114, 128, 0.3)';
  };

  // Default to Luanda if no location
  const initialRegion = userLocation || {
    latitude: -8.8383,
    longitude: 13.2344,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isCidadao ? 'Meus Acidentes' : 'Mapa de Acidentes'}</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Critical Zones */}
          {zones.map(zone => (
            <Circle
              key={zone.zona_id}
              center={{
                latitude: zone.latitude_centro,
                longitude: zone.longitude_centro,
              }}
              radius={zone.raio_metros}
              fillColor={getZoneColor(zone.nivel_risco)}
              strokeColor={zone.nivel_risco === 'ALTO' ? COLORS.red : COLORS.orange}
              strokeWidth={2}
            />
          ))}

          {/* Accident Markers */}
          {accidents.map(accident => (
            <Marker
              key={accident.acidente_id}
              coordinate={{
                latitude: accident.latitude,
                longitude: accident.longitude,
              }}
              onPress={() => setSelectedAccident(accident)}
            >
              <View style={[styles.marker, { backgroundColor: getMarkerColor(accident.gravidade) }]}>
                <Ionicons name="car" size={18} color={COLORS.white} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.legendText}>Fatal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
            <Text style={styles.legendText}>Grave</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.yellow }]} />
            <Text style={styles.legendText}>Moderado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>Leve</Text>
          </View>
        </View>
      </View>

      {/* Selected Accident Detail */}
      <Animated.View 
        style={[
          styles.detailCard,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {selectedAccident && (
          <>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedAccident(null)}
            >
              <Ionicons name="close" size={18} color={COLORS.gray} />
            </TouchableOpacity>
            
            <View style={[
              styles.gravityBadge, 
              { backgroundColor: getMarkerColor(selectedAccident.gravidade) }
            ]}>
              <Text style={styles.gravityText}>{selectedAccident.gravidade}</Text>
            </View>
            
            <Text style={styles.detailType}>
              {selectedAccident.tipo_acidente?.replace(/_/g, ' ')}
            </Text>
            
            <Text style={styles.detailDesc} numberOfLines={3}>
              {selectedAccident.descricao}
            </Text>
            
            <View style={styles.detailStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{selectedAccident.numero_veiculos}</Text>
                <Text style={styles.detailStatLabel}>Veículos</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{selectedAccident.numero_vitimas}</Text>
                <Text style={styles.detailStatLabel}>Vítimas</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{selectedAccident.status}</Text>
                <Text style={styles.detailStatLabel}>Status</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
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
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.gray,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  legend: {
    position: 'absolute',
    top: 110,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  legendTitle: {
    fontSize: FONTS.xs,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    color: COLORS.gray,
  },
  legendItems: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONTS.xs,
    color: COLORS.grayDark,
  },
  detailCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gravityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  gravityText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sm,
  },
  detailType: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  detailDesc: {
    fontSize: FONTS.md,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.purple,
  },
  detailStatLabel: {
    fontSize: FONTS.xs,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
});
