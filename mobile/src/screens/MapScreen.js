import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Marker, Circle, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { acidentesApi, zonasApi, assistenciasApi } from '../services/api';

const LUANDA = { latitude: -8.8368, longitude: 13.2343 };

export default function MapScreen() {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [acidentes, setAcidentes] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [assistencias, setAssistencias] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState(null);

  useEffect(() => {
    initializeMap();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
      }
    } catch (error) {
      console.error('Location error:', error);
    }
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [acidentesData, zonasData, assistData] = await Promise.all([
        acidentesApi.listAtivos(),
        zonasApi.list(),
        assistenciasApi.list()
      ]);
      setAcidentes(acidentesData);
      setZonas(zonasData.filter(z => z.nivel_risco === 'ALTO'));
      setAssistencias(assistData.filter(a => a.status !== 'FINALIZADO'));
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (gravidade) => {
    switch (gravidade) {
      case 'FATAL': return '#DC2626';
      case 'GRAVE': return '#EA580C';
      case 'MODERADO': return '#D97706';
      default: return '#16A34A';
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userLocation?.latitude || LUANDA.latitude,
          longitude: userLocation?.longitude || LUANDA.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Accident Markers */}
        {acidentes.map((acidente) => (
          <Marker
            key={acidente.acidente_id}
            coordinate={{
              latitude: acidente.latitude,
              longitude: acidente.longitude
            }}
            pinColor={getMarkerColor(acidente.gravidade)}
            onPress={() => setSelectedAccident(acidente)}
          />
        ))}

        {/* Critical Zones */}
        {zonas.map((zona) => (
          <Circle
            key={zona.zona_id}
            center={{
              latitude: zona.latitude_centro,
              longitude: zona.longitude_centro
            }}
            radius={zona.raio_metros}
            fillColor="rgba(220, 38, 38, 0.2)"
            strokeColor="#DC2626"
            strokeWidth={2}
          />
        ))}

        {/* Assistance Markers */}
        {assistencias.map((assist) => (
          assist.latitude_atual && assist.longitude_atual && (
            <Marker
              key={assist.assistencia_id}
              coordinate={{
                latitude: assist.latitude_atual,
                longitude: assist.longitude_atual
              }}
              pinColor="#2563EB"
            >
              <View style={styles.assistMarker}>
                <Text style={styles.assistIcon}>
                  {assist.tipo === 'AMBULANCIA' ? '🚑' : 
                   assist.tipo === 'BOMBEIRO' ? '🚒' : '🚔'}
                </Text>
              </View>
            </Marker>
          )
        ))}
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
          <Text>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.controlButton, showHeatmap && styles.controlButtonActive]} 
          onPress={() => setShowHeatmap(!showHeatmap)}
        >
          <Text>🔥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={fetchData}>
          <Text>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>Fatal</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
          <Text style={styles.legendText}>Grave</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
          <Text style={styles.legendText}>Moderado</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
          <Text style={styles.legendText}>Leve</Text>
        </View>
      </View>

      {/* Selected Accident Info */}
      {selectedAccident && (
        <View style={styles.accidentInfo}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedAccident(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.accidentTitle}>
            {selectedAccident.tipo_acidente?.replace(/_/g, ' ')}
          </Text>
          <Text style={[styles.accidentBadge, {
            backgroundColor: getMarkerColor(selectedAccident.gravidade)
          }]}>
            {selectedAccident.gravidade}
          </Text>
          <Text style={styles.accidentDesc} numberOfLines={2}>
            {selectedAccident.descricao}
          </Text>
          <Text style={styles.accidentTime}>
            {new Date(selectedAccident.created_at).toLocaleString('pt-AO')}
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          🚗 {acidentes.length} acidentes ativos • ⚠️ {zonas.length} zonas críticas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9'
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B'
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  controlButtonActive: {
    backgroundColor: '#FEE2E2'
  },
  legend: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  legendTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 12
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  legendText: {
    fontSize: 11,
    color: '#64748B'
  },
  stats: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  statsText: {
    color: '#fff',
    fontSize: 12
  },
  accidentInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#64748B',
    fontSize: 16
  },
  accidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8
  },
  accidentBadge: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8
  },
  accidentDesc: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 8
  },
  accidentTime: {
    color: '#94A3B8',
    fontSize: 11
  },
  assistMarker: {
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2563EB'
  },
  assistIcon: {
    fontSize: 16
  }
});
