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
  Navigation,
  Clock,
  Route,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

// Default center (Luanda, Angola)
const DEFAULT_CENTER = { lat: -8.8368, lng: 13.2343 };

export default function MapaPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  
  const [acidentes, setAcidentes] = useState([]);
  const [assistencias, setAssistencias] = useState([]);
  const [agentesACaminho, setAgentesACaminho] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [selectedAssist, setSelectedAssist] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
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
    // Handle Google Maps auth failure (invalid API key)
    window.gm_authFailure = () => {
      console.error('Google Maps authentication failed');
      toast.error('API Key do Google Maps invÃ¡lida ou sem permissÃµes. Verifique nas ConfiguraÃ§Ãµes.');
    };

    window.__onGoogleMapsLoaded = () => setMapLoaded(true);
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,places,geometry&callback=__onGoogleMapsLoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      toast.error('Erro ao carregar Google Maps. Verifique a API Key nas configuraÃ§Ãµes.');
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
      mapTypeControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP,
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      }
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#2563EB',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });
  }, [mapLoaded]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [acidentesData, assistenciasData, agentesData, zonasData] = await Promise.all([
        acidentesApi.listAtivos(),
        assistenciasApi.list({ status: 'A_CAMINHO' }),
        acidentesApi.listTodosAgentesACaminho(),
        zonasApi.list()
      ]);
      setAcidentes(acidentesData);
      setAssistencias(assistenciasData);
      setAgentesACaminho(Array.isArray(agentesData) ? agentesData : []);
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

  // Calculate route between two points using Directions API
  const calculateRoute = useCallback((origin, destination, assist) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
      },
      (result, status) => {
        if (status === 'OK' && result.routes.length > 0) {
          directionsRendererRef.current?.setDirections(result);
          
          const route = result.routes[0];
          const leg = route.legs[0];
          setRouteInfo({
            distance: leg.distance.text,
            duration: leg.duration.text,
            start_address: leg.start_address,
            end_address: leg.end_address,
            steps: leg.steps.map(s => ({
              instruction: s.instructions,
              distance: s.distance.text,
              duration: s.duration.text
            })),
            alternatives: result.routes.length - 1,
            assist
          });
        } else {
          toast.error('NÃ£o foi possÃ­vel calcular a rota');
          setRouteInfo(null);
        }
      }
    );
  }, []);

  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current.setMap(mapInstanceRef.current);
    }
    setRouteInfo(null);
    setSelectedAssist(null);
  }, []);

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
          setSelectedAssist(null);
          clearRoute();
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

        marker.addListener('click', () => {
          setSelectedAssist(assist);
          setSelectedAccident(null);
          // Find the linked accident and calculate route
          const acidente = acidentes.find(a => a.acidente_id === assist.acidente_id);
          if (acidente) {
            calculateRoute(
              { lat: assist.latitude_atual, lng: assist.longitude_atual },
              { lat: acidente.latitude, lng: acidente.longitude },
              assist
            );
          }
        });

        markersRef.current.push(marker);
      });

      agentesACaminho.forEach(agente => {
        if (!agente.latitude || !agente.longitude) return;

        const isArrived = agente.status === 'CHEGOU';
        const marker = new window.google.maps.Marker({
          position: { lat: agente.latitude, lng: agente.longitude },
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: isArrived ? '#22C55E' : '#2563EB',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            rotation: 0
          },
          title: `${agente.agente_nome || 'Agente'} - ${isArrived ? 'No Local' : 'A Caminho'}`,
          zIndex: 12
        });

        marker.addListener('click', () => {
          const acidente = acidentes.find(a => (a._id || a.acidente_id) === agente.acidente_id);
          if (acidente) {
            setSelectedAccident(acidente);
            setSelectedAssist(null);
            clearRoute();
          }
        });

        markersRef.current.push(marker);
      });
    }

    // Add zone overlays â€” polygon delimitations or circles
    if (showZones) {
      zonas.forEach(zona => {
        const color = zona.nivel_risco === 'ALTO' ? '#DC2626' : zona.nivel_risco === 'MEDIO' ? '#D97706' : '#16A34A';
        if (zona.delimitacoes && zona.delimitacoes.length >= 3) {
          const polygon = new window.google.maps.Polygon({
            map: mapInstanceRef.current,
            paths: zona.delimitacoes,
            fillColor: color, fillOpacity: 0.2,
            strokeColor: color, strokeWeight: 2
          });
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding:4px"><strong>${zona.nome || 'Zona'}</strong><br/><span style="font-size:11px;color:#64748b">Risco: ${zona.nivel_risco} Â· ${zona.total_acidentes || 0} acidentes</span></div>`
          });
          polygon.addListener('click', (e) => {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(mapInstanceRef.current);
          });
          markersRef.current.push(polygon);
        } else {
          const circle = new window.google.maps.Circle({
            map: mapInstanceRef.current,
            center: { lat: zona.latitude_centro, lng: zona.longitude_centro },
            radius: zona.raio_metros || 500,
            fillColor: color, fillOpacity: 0.2,
            strokeColor: color, strokeWeight: 2
          });
          markersRef.current.push(circle);
        }
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

  }, [acidentes, assistencias, agentesACaminho, zonas, showAccidents, showAssistances, showZones, showHeatmap, filterStatus, filterGravidade, mapLoaded, clearRoute, calculateRoute]);

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
            <h2 className="text-xl font-bold text-slate-700 mb-2">API Key NÃ£o Configurada</h2>
            <p className="text-slate-500 mb-4">Configure a API Key do Google Maps nas configuraÃ§Ãµes</p>
            <Button asChild>
              <a href="/configuracoes">Ir para ConfiguraÃ§Ãµes</a>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 min-h-0" data-testid="mapa-page">
        {/* Map */}
        <div className="flex-1 relative min-h-[300px] lg:min-h-0">
          {/* Controls overlay */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 glass-panel p-2 sm:p-3 space-y-2 sm:space-y-3 max-w-[calc(100%-1rem)] sm:max-w-none">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-sm" data-testid="filter-status">
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
                <SelectTrigger className="w-full sm:w-40 h-9 text-sm" data-testid="filter-gravidade">
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
            
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button 
                size="sm" 
                variant={showAccidents ? "default" : "outline"}
                onClick={() => setShowAccidents(!showAccidents)}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Acidentes</span>
                <span className="sm:hidden">Acid.</span>
              </Button>
              <Button 
                size="sm" 
                variant={showAssistances ? "default" : "outline"}
                onClick={() => setShowAssistances(!showAssistances)}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                <Ambulance className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">AssistÃªncias</span>
                <span className="sm:hidden">Assist.</span>
              </Button>
              <Button 
                size="sm" 
                variant={showZones ? "default" : "outline"}
                onClick={() => setShowZones(!showZones)}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                <Layers className="w-3 h-3 mr-1" />
                Zonas
              </Button>
              <Button 
                size="sm" 
                variant={showHeatmap ? "default" : "outline"}
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                <Flame className="w-3 h-3 mr-1" />
                Heat
              </Button>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={fetchData}
              className="h-7 sm:h-8 text-xs w-7 sm:w-auto p-0 sm:px-3"
              data-testid="refresh-map-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Route info overlay */}
          {routeInfo && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 glass-panel p-3 sm:p-4 w-56 sm:w-72 max-h-64 sm:max-h-80 overflow-y-auto space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-blue-600" />
                  Rota da AssistÃªncia
                </p>
                <button onClick={clearRoute} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-blue-50 rounded-xl text-center">
                  <p className="text-lg font-extrabold text-blue-700">{routeInfo.distance}</p>
                  <p className="text-[10px] text-blue-500 font-medium">DistÃ¢ncia</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl text-center">
                  <p className="text-lg font-extrabold text-amber-700">{routeInfo.duration}</p>
                  <p className="text-[10px] text-amber-500 font-medium">Tempo Estimado</p>
                </div>
              </div>
              {routeInfo.alternatives > 0 && (
                <p className="text-[10px] text-slate-400 text-center">{routeInfo.alternatives} rota(s) alternativa(s) disponÃ­vel(is)</p>
              )}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DireÃ§Ãµes</p>
                {routeInfo.steps.slice(0, 8).map((step, i) => (
                  <div key={i} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-600" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                      <p className="text-[10px] text-slate-400">{step.distance} Â· {step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 glass-panel p-2 sm:p-3 hidden sm:block">
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
            style={{ minHeight: '300px' }}
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </div>

        {/* Sidebar - Accident details, assistance route, or list */}
        <div className="lg:w-80 flex-shrink-0 max-h-[40vh] lg:max-h-none overflow-y-auto">
          {selectedAssist && routeInfo ? (
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ambulance className="w-5 h-5 text-blue-600" />
                    AssistÃªncia
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={clearRoute}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${
                    selectedAssist.tipo === 'AMBULANCIA' ? 'bg-blue-600' :
                    selectedAssist.tipo === 'POLICIA' ? 'bg-slate-700' : 'bg-red-600'
                  }`}>{selectedAssist.tipo}</Badge>
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                    {selectedAssist.status?.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-center">
                    <Navigation className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-extrabold text-blue-700">{routeInfo.distance}</p>
                    <p className="text-[10px] text-blue-500 font-medium">DistÃ¢ncia</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-center">
                    <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-extrabold text-amber-700">{routeInfo.duration}</p>
                    <p className="text-[10px] text-amber-500 font-medium">Tempo Estimado</p>
                  </div>
                </div>

                {routeInfo.alternatives > 0 && (
                  <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500">
                      <Route className="w-3.5 h-3.5 inline mr-1" />
                      {routeInfo.alternatives} rota(s) alternativa(s)
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">DireÃ§Ãµes</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {routeInfo.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                          <p className="text-[10px] text-slate-400 mt-0.5">{step.distance} Â· {step.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedAccident ? (
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
                  <p className="text-sm font-medium text-slate-500">DescriÃ§Ã£o</p>
                  <p className="text-sm">{selectedAccident.descricao}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">VÃ­timas</p>
                    <p className="text-sm font-mono">{selectedAccident.numero_vitimas}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">VeÃ­culos</p>
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
                    <a href={`/acidentes/${selectedAccident.acidente_id || selectedAccident._id}`}>
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


