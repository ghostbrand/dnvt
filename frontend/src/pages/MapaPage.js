import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { acidentesApi, assistenciasApi, zonasApi, configuracoesApi } from '../services/api';
import { 
  MapPin, 
  AlertTriangle, 
  Ambulance, 
  Flame,
  Shield,
  Loader2,
  Layers,
  RefreshCw,
  Search,
  X,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';

// Default center (Luanda, Angola)
const DEFAULT_CENTER = { lat: -8.8368, lng: 13.2343 };

export default function MapaPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);
  
  const [acidentes, setAcidentes] = useState([]);
  const [assistencias, setAssistencias] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  
  // Filters
  const [showAccidents, setShowAccidents] = useState(true);
  const [showAssistances, setShowAssistances] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGravidade, setFilterGravidade] = useState('all');

  // Fetch Google Maps API Key
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const data = await configuracoesApi.getGoogleMapsKey();
        setApiKey(data.api_key);
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };
    fetchApiKey();
  }, []);

  // Load Google Maps Script
  useEffect(() => {
    if (!apiKey) return;
    
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      toast.error('Erro ao carregar Google Maps. Verifique a API Key nas configurações.');
    };
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true
    });
  }, [mapLoaded]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [acidentesData, assistenciasData, zonasData] = await Promise.all([
        acidentesApi.listAtivos(),
        assistenciasApi.list({ status: 'A_CAMINHO' }),
        zonasApi.list()
      ]);
      setAcidentes(acidentesData);
      setAssistencias(assistenciasData);
      setZonas(zonasData);
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Filter accidents
    let filteredAccidents = acidentes;
    if (filterStatus !== 'all') {
      filteredAccidents = filteredAccidents.filter(a => a.status === filterStatus);
    }
    if (filterGravidade !== 'all') {
      filteredAccidents = filteredAccidents.filter(a => a.gravidade === filterGravidade);
    }

    // Add accident markers
    if (showAccidents) {
      filteredAccidents.forEach(acidente => {
        const markerColor = {
          FATAL: '#DC2626',
          GRAVE: '#EA580C',
          MODERADO: '#D97706',
          LEVE: '#16A34A'
        }[acidente.gravidade] || '#D97706';

        const marker = new window.google.maps.Marker({
          position: { lat: acidente.latitude, lng: acidente.longitude },
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 2
          },
          title: `${acidente.tipo_acidente} - ${acidente.gravidade}`
        });

        marker.addListener('click', () => {
          setSelectedAccident(acidente);
        });

        markersRef.current.push(marker);
      });
    }

    // Add assistance markers
    if (showAssistances) {
      assistencias.forEach(assist => {
        if (!assist.latitude_atual || !assist.longitude_atual) return;
        
        const iconColor = {
          AMBULANCIA: '#2563EB',
          POLICIA: '#0F172A',
          BOMBEIRO: '#DC2626'
        }[assist.tipo] || '#2563EB';

        const marker = new window.google.maps.Marker({
          position: { lat: assist.latitude_atual, lng: assist.longitude_atual },
          map: mapInstanceRef.current,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            scale: 1.5,
            fillColor: iconColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 1,
            anchor: new window.google.maps.Point(12, 22)
          },
          title: `${assist.tipo} - ${assist.status}`
        });

        markersRef.current.push(marker);
      });
    }

    // Add zone circles
    if (showZones) {
      zonas.forEach(zona => {
        const circle = new window.google.maps.Circle({
          map: mapInstanceRef.current,
          center: { lat: zona.latitude_centro, lng: zona.longitude_centro },
          radius: zona.raio_metros,
          fillColor: zona.nivel_risco === 'ALTO' ? '#DC2626' : zona.nivel_risco === 'MEDIO' ? '#D97706' : '#16A34A',
          fillOpacity: 0.2,
          strokeColor: zona.nivel_risco === 'ALTO' ? '#DC2626' : zona.nivel_risco === 'MEDIO' ? '#D97706' : '#16A34A',
          strokeWeight: 2
        });
        markersRef.current.push(circle);
      });
    }

    // Heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
    
    if (showHeatmap && filteredAccidents.length > 0) {
      const heatmapData = filteredAccidents.map(a => ({
        location: new window.google.maps.LatLng(a.latitude, a.longitude),
        weight: a.gravidade === 'FATAL' ? 10 : a.gravidade === 'GRAVE' ? 7 : a.gravidade === 'MODERADO' ? 4 : 1
      }));

      heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstanceRef.current,
        radius: 50
      });
    }

  }, [acidentes, assistencias, zonas, showAccidents, showAssistances, showZones, showHeatmap, filterStatus, filterGravidade, mapLoaded]);

  const centerOnAccident = (acidente) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: acidente.latitude, lng: acidente.longitude });
      mapInstanceRef.current.setZoom(16);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      REPORTADO: 'Reportado',
      VALIDADO: 'Validado',
      EM_ATENDIMENTO: 'Em Atendimento',
      ENCERRADO: 'Encerrado'
    };
    return labels[status] || status;
  };

  if (!apiKey) {
    return (
      <Layout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-slate-100 rounded-lg" data-testid="mapa-page">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">API Key Não Configurada</h2>
            <p className="text-slate-500 mb-4">Configure a API Key do Google Maps nas configurações</p>
            <Button asChild>
              <a href="/configuracoes">Ir para Configurações</a>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4" data-testid="mapa-page">
        {/* Map */}
        <div className="flex-1 relative">
          {/* Controls overlay */}
          <div className="absolute top-4 left-4 z-10 glass-panel p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-9 text-sm" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="REPORTADO">Reportado</SelectItem>
                  <SelectItem value="VALIDADO">Validado</SelectItem>
                  <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterGravidade} onValueChange={setFilterGravidade}>
                <SelectTrigger className="w-40 h-9 text-sm" data-testid="filter-gravidade">
                  <SelectValue placeholder="Gravidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Gravidades</SelectItem>
                  <SelectItem value="LEVE">Leve</SelectItem>
                  <SelectItem value="MODERADO">Moderado</SelectItem>
                  <SelectItem value="GRAVE">Grave</SelectItem>
                  <SelectItem value="FATAL">Fatal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant={showAccidents ? "default" : "outline"}
                onClick={() => setShowAccidents(!showAccidents)}
                className="h-8 text-xs"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Acidentes
              </Button>
              <Button 
                size="sm" 
                variant={showAssistances ? "default" : "outline"}
                onClick={() => setShowAssistances(!showAssistances)}
                className="h-8 text-xs"
              >
                <Ambulance className="w-3 h-3 mr-1" />
                Assistências
              </Button>
              <Button 
                size="sm" 
                variant={showZones ? "default" : "outline"}
                onClick={() => setShowZones(!showZones)}
                className="h-8 text-xs"
              >
                <Layers className="w-3 h-3 mr-1" />
                Zonas
              </Button>
              <Button 
                size="sm" 
                variant={showHeatmap ? "default" : "outline"}
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="h-8 text-xs"
              >
                <Flame className="w-3 h-3 mr-1" />
                Heatmap
              </Button>
            </div>
          </div>

          {/* Refresh button */}
          <Button 
            size="sm" 
            variant="outline"
            className="absolute top-4 right-4 z-10 glass-panel"
            onClick={fetchData}
            data-testid="refresh-map-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 glass-panel p-3">
            <p className="text-xs font-medium mb-2">Legenda</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                <span>Fatal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Grave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Moderado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600" />
                <span>Leve</span>
              </div>
            </div>
          </div>

          {/* Map container */}
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-lg"
            style={{ minHeight: '500px' }}
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </div>

        {/* Sidebar - Accident details or list */}
        <div className="lg:w-80 flex-shrink-0">
          {selectedAccident ? (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Detalhes do Acidente</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAccident(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge className={`
                    ${selectedAccident.gravidade === 'FATAL' ? 'bg-red-600' : ''}
                    ${selectedAccident.gravidade === 'GRAVE' ? 'bg-orange-500' : ''}
                    ${selectedAccident.gravidade === 'MODERADO' ? 'bg-amber-500' : ''}
                    ${selectedAccident.gravidade === 'LEVE' ? 'bg-green-600' : ''}
                  `}>
                    {selectedAccident.gravidade}
                  </Badge>
                  <Badge variant="outline" className="ml-2">
                    {getStatusLabel(selectedAccident.status)}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-500">Tipo</p>
                  <p className="text-sm">{selectedAccident.tipo_acidente?.replace(/_/g, ' ')}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-500">Descrição</p>
                  <p className="text-sm">{selectedAccident.descricao}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Vítimas</p>
                    <p className="text-sm font-mono">{selectedAccident.numero_vitimas}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Veículos</p>
                    <p className="text-sm font-mono">{selectedAccident.numero_veiculos}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-500">Coordenadas</p>
                  <p className="text-sm font-mono">
                    {selectedAccident.latitude.toFixed(6)}, {selectedAccident.longitude.toFixed(6)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-500">Data/Hora</p>
                  <p className="text-sm">{new Date(selectedAccident.created_at).toLocaleString('pt-AO')}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => centerOnAccident(selectedAccident)}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Centralizar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <a href={`/acidentes/${selectedAccident.acidente_id}`}>
                      Ver Detalhes
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Acidentes Ativos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {acidentes.length > 0 ? (
                    <div className="divide-y">
                      {acidentes.map((acidente) => (
                        <button
                          key={acidente.acidente_id}
                          className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
                          onClick={() => {
                            setSelectedAccident(acidente);
                            centerOnAccident(acidente);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{acidente.tipo_acidente?.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{acidente.descricao}</p>
                            </div>
                            <Badge className={`text-xs
                              ${acidente.gravidade === 'FATAL' ? 'bg-red-600' : ''}
                              ${acidente.gravidade === 'GRAVE' ? 'bg-orange-500' : ''}
                              ${acidente.gravidade === 'MODERADO' ? 'bg-amber-500' : ''}
                              ${acidente.gravidade === 'LEVE' ? 'bg-green-600' : ''}
                            `}>
                              {acidente.gravidade}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum acidente ativo</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
