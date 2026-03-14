import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { zonasApi, utilizadoresApi, configuracoesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  MapPin, 
  RefreshCw,
  CheckCircle,
  Target,
  TrendingUp,
  Lightbulb,
  Users,
  UserPlus,
  X,
  Search,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Radio,
  Navigation,
  Hexagon,
  Map,
  Eye,
  Circle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';

const EMPTY_ZONA_FORM = {
  nome: '',
  latitude_centro: '',
  longitude_centro: '',
  raio_metros: '500',
  nivel_risco: 'MEDIO',
  tipo_zona: 'critica',
  recomendacao_melhoria: ''
};

const ZONA_TYPES = [
  { value: 'all', label: 'Todas', color: 'bg-slate-100 text-slate-700' },
  { value: 'critica', label: 'Críticas', color: 'bg-red-100 text-red-700' },
  { value: 'vigilancia', label: 'Vigilância', color: 'bg-amber-100 text-amber-700' },
  { value: 'segura', label: 'Seguras', color: 'bg-emerald-100 text-emerald-700' },
];

export default function ZonasCriticasPage() {
  const { user } = useAuth();
  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';
  const [zonas, setZonas] = useState([]);
  const [zonasCalculadas, setZonasCalculadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  
  // Zone create/edit dialog
  const [zonaDialogOpen, setZonaDialogOpen] = useState(false);
  const [zonaForm, setZonaForm] = useState(EMPTY_ZONA_FORM);
  const [editingZona, setEditingZona] = useState(null);
  const [savingZona, setSavingZona] = useState(false);
  
  // Category filter
  const [filterTipo, setFilterTipo] = useState('all');

  // Map for drawing
  const mapContainerRef = useRef(null);
  const mapDialogRef = useRef(null);
  const mapDialogInitialized = useRef(false);
  const zonaFormRef = useRef(EMPTY_ZONA_FORM);
  const drawingPolygonRef = useRef([]);
  const drawnPolygonOverlay = useRef(null);
  const drawnMarkersOverlay = useRef([]);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState('polygon'); // 'polygon' | 'circle'
  const drawingModeRef = useRef('polygon');
  const circleOverlayRef = useRef(null);
  const circleCenterMarkerRef = useRef(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [apiKey, setApiKey] = useState(null);

  // Map viewer dialog
  const [mapViewerOpen, setMapViewerOpen] = useState(false);
  const mapViewerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(!!window.google?.maps);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingZona, setDeletingZona] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Monitores dialog
  const [monitoresDialogOpen, setMonitoresDialogOpen] = useState(false);
  const [selectedZona, setSelectedZona] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [agentesSearch, setAgentesSearch] = useState('');
  const [savingMonitores, setSavingMonitores] = useState(false);
  const [selectedMonitores, setSelectedMonitores] = useState([]);

  const fetchZonas = async () => {
    setLoading(true);
    try {
      const data = await zonasApi.list();
      setZonas(data);
    } catch (error) {
      toast.error('Erro ao carregar zonas');
    } finally {
      setLoading(false);
    }
  };

  const calcularZonas = async () => {
    setCalculating(true);
    try {
      const data = await zonasApi.calcular();
      setZonasCalculadas(data);
      toast.success(`${data.length} zonas críticas identificadas`);
    } catch (error) {
      toast.error('Erro ao calcular zonas');
    } finally {
      setCalculating(false);
    }
  };

  const validarZona = async (zonaId) => {
    try {
      await zonasApi.validar(zonaId);
      toast.success('Zona validada com sucesso');
      fetchZonas();
    } catch (error) {
      toast.error('Erro ao validar zona');
    }
  };

  // Fetch Google Maps API key
  useEffect(() => {
    configuracoesApi.getGoogleMapsKey().then(d => setApiKey(d.api_key)).catch(() => {});
  }, []);

  // Load Google Maps script if not already loaded
  useEffect(() => {
    if (!apiKey) return;
    // Already fully loaded
    if (window.google?.maps?.Map) {
      setMapLoaded(true);
      return;
    }
    // Script tag already in DOM (e.g. from MapaPage) — just poll for readiness
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { setMapLoaded(true); clearInterval(check); }
      }, 200);
      const timeout = setTimeout(() => clearInterval(check), 15000);
      return () => { clearInterval(check); clearTimeout(timeout); };
    }
    // Load fresh script
    const cbName = '__onGMapsZonas_' + Date.now();
    window[cbName] = () => { setMapLoaded(true); delete window[cbName]; };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,places,geometry&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [apiKey]);

  // Get current location for zone dialog
  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setZonaForm(p => ({
            ...p,
            latitude_centro: String(pos.coords.latitude),
            longitude_centro: String(pos.coords.longitude)
          }));
          setGettingLocation(false);
          toast.success('Localização obtida com sucesso');
        },
        (error) => {
          const msgs = {
            1: 'Permissão de localização negada. Permita o acesso nas definições do navegador.',
            2: 'Localização indisponível. Verifique se o GPS está ligado.',
            3: 'Tempo esgotado ao obter localização. Tente novamente.',
          };
          toast.error(msgs[error.code] || 'Erro ao obter localização');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      toast.error('Geolocalização não suportada neste navegador');
      setGettingLocation(false);
    }
  };

  // Zone type colors for map polygons
  const ZONA_COLORS = { critica: '#E53935', vigilancia: '#FF9800', segura: '#4CAF50' };

  // Clear drawn overlays from map
  const clearDrawnOverlays = useCallback(() => {
    if (drawnPolygonOverlay.current) {
      drawnPolygonOverlay.current.setMap(null);
      drawnPolygonOverlay.current = null;
    }
    drawnMarkersOverlay.current.forEach(m => m.setMap(null));
    drawnMarkersOverlay.current = [];
  }, []);

  // Render the drawn polygon + vertex markers on the map
  const renderDrawnPolygon = useCallback((points, map) => {
    clearDrawnOverlays();
    if (!map || !window.google?.maps || points.length === 0) return;

    // Vertex markers
    points.forEach((pt, i) => {
      const marker = new window.google.maps.Marker({
        position: pt,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: i === 0 ? '#059669' : '#1B2A4A',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: i === 0 ? 'Início' : `Ponto ${i + 1}`,
        zIndex: 10,
      });
      drawnMarkersOverlay.current.push(marker);
    });

    // Polygon or polyline
    if (points.length >= 3) {
      drawnPolygonOverlay.current = new window.google.maps.Polygon({
        paths: points,
        fillColor: '#1B2A4A',
        fillOpacity: 0.25,
        strokeColor: '#1B2A4A',
        strokeWeight: 2,
        map,
      });
    } else if (points.length >= 2) {
      drawnPolygonOverlay.current = new window.google.maps.Polyline({
        path: points,
        strokeColor: '#1B2A4A',
        strokeWeight: 2,
        map,
      });
    }
  }, [clearDrawnOverlays]);

  // Start drawing mode
  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setDrawingPoints([]);
    drawingPolygonRef.current = [];
    clearDrawnOverlays();
  }, [clearDrawnOverlays]);

  // Finish drawing — close polygon and compute center
  const finishDrawing = useCallback(() => {
    setIsDrawing(false);
    const pts = drawingPolygonRef.current;
    if (pts.length >= 3 && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      pts.forEach(p => bounds.extend(p));
      const ct = bounds.getCenter();
      setZonaForm(p => ({ ...p, latitude_centro: String(ct.lat()), longitude_centro: String(ct.lng()) }));
      renderDrawnPolygon(pts, mapDialogRef.current);
    }
  }, [renderDrawnPolygon]);

  // Undo last drawn point
  const undoLastPoint = useCallback(() => {
    setDrawingPoints(prev => {
      const updated = prev.slice(0, -1);
      drawingPolygonRef.current = updated;
      renderDrawnPolygon(updated, mapDialogRef.current);
      return updated;
    });
  }, [renderDrawnPolygon]);

  // Clear entire drawing
  const clearDrawing = useCallback(() => {
    setDrawingPoints([]);
    drawingPolygonRef.current = [];
    clearDrawnOverlays();
    if (circleOverlayRef.current) { circleOverlayRef.current.setMap(null); circleOverlayRef.current = null; }
    if (circleCenterMarkerRef.current) { circleCenterMarkerRef.current.setMap(null); circleCenterMarkerRef.current = null; }
    setIsDrawing(false);
  }, [clearDrawnOverlays]);

  // Keep refs in sync so the map click handler can read latest values
  useEffect(() => { zonaFormRef.current = zonaForm; }, [zonaForm]);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);

  // Render or update circle overlay on map
  const renderCircleOverlay = useCallback((center, radius, map) => {
    if (!map || !window.google?.maps) return;
    // Remove old circle
    if (circleOverlayRef.current) circleOverlayRef.current.setMap(null);
    if (circleCenterMarkerRef.current) circleCenterMarkerRef.current.setMap(null);
    circleOverlayRef.current = new window.google.maps.Circle({
      center, radius: radius || 500,
      fillColor: '#1B2A4A', fillOpacity: 0.15,
      strokeColor: '#1B2A4A', strokeWeight: 2,
      editable: true, draggable: false, map
    });
    circleCenterMarkerRef.current = new window.google.maps.Marker({
      position: center, map,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#1B2A4A', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
    });
    // When user edits circle radius by dragging, update form
    circleOverlayRef.current.addListener('radius_changed', () => {
      const r = Math.round(circleOverlayRef.current.getRadius());
      setZonaForm(p => ({ ...p, raio_metros: String(r) }));
    });
    circleOverlayRef.current.addListener('center_changed', () => {
      const c = circleOverlayRef.current.getCenter();
      setZonaForm(p => ({ ...p, latitude_centro: String(c.lat()), longitude_centro: String(c.lng()) }));
      if (circleCenterMarkerRef.current) circleCenterMarkerRef.current.setPosition(c);
    });
  }, []);

  // Init map when dialog opens — only once per open
  useEffect(() => {
    if (!zonaDialogOpen || !mapLoaded || !apiKey) {
      if (!zonaDialogOpen) mapDialogInitialized.current = false;
      return;
    }
    // Wait a tick for the DOM container to render
    const timer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container || !window.google?.maps || mapDialogInitialized.current) return;
      mapDialogInitialized.current = true;

      const form = zonaFormRef.current;
      const center = {
        lat: parseFloat(form.latitude_centro) || -8.8368,
        lng: parseFloat(form.longitude_centro) || 13.2343
      };
      const map = new window.google.maps.Map(container, {
        center, zoom: 14, mapTypeControl: false, streetViewControl: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
      });
      mapDialogRef.current = map;

      // Show existing zones
      const bounds = new window.google.maps.LatLngBounds();
      let hasExisting = false;
      zonas.forEach(z => {
        const tipo = z.tipo_zona || 'critica';
        const color = ZONA_COLORS[tipo] || '#888';
        if (z.delimitacoes && z.delimitacoes.length >= 3) {
          new window.google.maps.Polygon({
            paths: z.delimitacoes,
            fillColor: color, fillOpacity: 0.15, strokeColor: color, strokeWeight: 1.5,
            clickable: false, map
          });
          z.delimitacoes.forEach(p => bounds.extend(p));
          hasExisting = true;
        } else if (z.latitude_centro && z.longitude_centro) {
          new window.google.maps.Circle({
            center: { lat: z.latitude_centro, lng: z.longitude_centro },
            radius: z.raio_metros || 500,
            fillColor: color, fillOpacity: 0.1, strokeColor: color, strokeWeight: 1,
            clickable: false, map
          });
          bounds.extend({ lat: z.latitude_centro, lng: z.longitude_centro });
          hasExisting = true;
        }
      });
      if (hasExisting && !form.latitude_centro) {
        map.fitBounds(bounds, 40);
      }

      // Click handler — mode-aware via ref
      map.addListener('click', (e) => {
        const lat = e.latLng.lat(), lng = e.latLng.lng();
        if (drawingModeRef.current === 'circle') {
          // Circle mode: click sets center, radius from form
          const radius = parseInt(zonaFormRef.current.raio_metros) || 500;
          setZonaForm(p => ({ ...p, latitude_centro: String(lat), longitude_centro: String(lng) }));
          renderCircleOverlay({ lat, lng }, radius, map);
        } else {
          // Polygon mode: add point
          const pt = { lat, lng };
          setDrawingPoints(prev => {
            const updated = [...prev, pt];
            drawingPolygonRef.current = updated;
            renderDrawnPolygon(updated, map);
            return updated;
          });
          setZonaForm(p => ({ ...p, latitude_centro: String(lat), longitude_centro: String(lng) }));
        }
      });

      // If editing, render existing polygon or circle
      if (drawingPolygonRef.current.length >= 3) {
        renderDrawnPolygon(drawingPolygonRef.current, map);
      } else if (form.latitude_centro && form.longitude_centro && drawingModeRef.current === 'circle') {
        renderCircleOverlay(
          { lat: parseFloat(form.latitude_centro), lng: parseFloat(form.longitude_centro) },
          parseInt(form.raio_metros) || 500, map
        );
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [zonaDialogOpen, mapLoaded, apiKey, zonas, renderDrawnPolygon]);

  // Init full map viewer — all zones with colored polygons
  const initMapViewer = useCallback((container) => {
    if (!container || !window.google?.maps || !apiKey) return;
    const map = new window.google.maps.Map(container, {
      center: { lat: -8.8368, lng: 13.2343 }, zoom: 12,
      mapTypeControl: true, streetViewControl: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    mapViewerRef.current = map;

    const bounds = new window.google.maps.LatLngBounds();
    let hasZones = false;

    zonas.forEach(z => {
      const tipo = z.tipo_zona || 'critica';
      const color = ZONA_COLORS[tipo] || '#888';
      const label = `${z.nome}\n${tipo.charAt(0).toUpperCase() + tipo.slice(1)} — ${z.nivel_risco}`;

      if (z.delimitacoes && z.delimitacoes.length >= 3) {
        const polygon = new window.google.maps.Polygon({
          paths: z.delimitacoes,
          fillColor: color, fillOpacity: 0.25, strokeColor: color, strokeWeight: 2.5,
          map
        });
        const polyBounds = new window.google.maps.LatLngBounds();
        z.delimitacoes.forEach(p => { bounds.extend(p); polyBounds.extend(p); });
        hasZones = true;

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="font-family:Inter,sans-serif;padding:4px;">
            <strong style="color:${color};font-size:14px;">${z.nome}</strong><br/>
            <span style="font-size:12px;color:#64748b;">Tipo: ${tipo} · Risco: ${z.nivel_risco}</span><br/>
            ${z.recomendacao_melhoria ? `<span style="font-size:11px;color:#94a3b8;">${z.recomendacao_melhoria}</span>` : ''}
          </div>`,
          position: polyBounds.getCenter()
        });
        polygon.addListener('click', () => infoWindow.open(map));
      } else if (z.latitude_centro && z.longitude_centro) {
        const center = { lat: z.latitude_centro, lng: z.longitude_centro };
        new window.google.maps.Circle({
          center, radius: z.raio_metros || 500,
          fillColor: color, fillOpacity: 0.2, strokeColor: color, strokeWeight: 2,
          map
        });
        const marker = new window.google.maps.Marker({
          position: center, map,
          title: z.nome,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2
          }
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="font-family:Inter,sans-serif;padding:4px;">
            <strong style="color:${color};font-size:14px;">${z.nome}</strong><br/>
            <span style="font-size:12px;color:#64748b;">Tipo: ${tipo} · Risco: ${z.nivel_risco} · Raio: ${z.raio_metros || 500}m</span>
          </div>`
        });
        marker.addListener('click', () => infoWindow.open(map, marker));
        bounds.extend(center);
        hasZones = true;
      }
    });

    if (hasZones) map.fitBounds(bounds, 50);
  }, [apiKey, zonas]);

  // Filtered zones
  const filteredZonas = filterTipo === 'all'
    ? zonas
    : zonas.filter(z => (z.tipo_zona || 'critica') === filterTipo);

  // === Zone CRUD ===
  const openCreateDialog = () => {
    setEditingZona(null);
    setZonaForm(EMPTY_ZONA_FORM);
    setDrawingPoints([]);
    drawingPolygonRef.current = [];
    clearDrawnOverlays();
    setIsDrawing(false);
    setZonaDialogOpen(true);
  };

  const openEditDialog = (zona) => {
    setEditingZona(zona);
    setZonaForm({
      nome: zona.nome || '',
      latitude_centro: String(zona.latitude_centro),
      longitude_centro: String(zona.longitude_centro),
      raio_metros: String(zona.raio_metros),
      nivel_risco: zona.nivel_risco || 'MEDIO',
      tipo_zona: zona.tipo_zona || 'critica',
      recomendacao_melhoria: zona.recomendacao_melhoria || ''
    });
    const pts = zona.delimitacoes || [];
    setDrawingPoints(pts);
    drawingPolygonRef.current = pts;
    clearDrawnOverlays();
    setIsDrawing(false);
    setZonaDialogOpen(true);
  };

  const handleSaveZona = async () => {
    if (!zonaForm.nome.trim()) return toast.error('Nome é obrigatório');
    if (!zonaForm.latitude_centro || !zonaForm.longitude_centro) return toast.error('Coordenadas são obrigatórias');
    
    const payload = {
      nome: zonaForm.nome.trim(),
      latitude_centro: parseFloat(zonaForm.latitude_centro),
      longitude_centro: parseFloat(zonaForm.longitude_centro),
      raio_metros: parseInt(zonaForm.raio_metros) || 500,
      nivel_risco: zonaForm.nivel_risco,
      tipo_zona: zonaForm.tipo_zona || 'critica',
      recomendacao_melhoria: zonaForm.recomendacao_melhoria.trim() || null,
      delimitacoes: drawingPoints.length > 2 ? drawingPoints : undefined
    };

    if (isNaN(payload.latitude_centro) || isNaN(payload.longitude_centro)) {
      return toast.error('Coordenadas inválidas');
    }

    setSavingZona(true);
    try {
      if (editingZona) {
        await zonasApi.update(editingZona._id, payload);
        toast.success(`Zona "${payload.nome}" atualizada`);
      } else {
        await zonasApi.create(payload);
        toast.success(`Zona "${payload.nome}" criada`);
      }
      setZonaDialogOpen(false);
      fetchZonas();
    } catch (error) {
      toast.error(editingZona ? 'Erro ao atualizar zona' : 'Erro ao criar zona');
    } finally {
      setSavingZona(false);
    }
  };

  const confirmDelete = (zona) => {
    setDeletingZona(zona);
    setDeleteDialogOpen(true);
  };

  const handleDeleteZona = async () => {
    if (!deletingZona) return;
    setDeleting(true);
    try {
      await zonasApi.delete(deletingZona._id);
      toast.success(`Zona "${deletingZona.nome}" eliminada`);
      setDeleteDialogOpen(false);
      setDeletingZona(null);
      fetchZonas();
    } catch (error) {
      toast.error('Erro ao eliminar zona');
    } finally {
      setDeleting(false);
    }
  };

  // === Monitores ===
  const fetchAgentes = async () => {
    try {
      const data = await utilizadoresApi.list();
      setAgentes(data.filter(u => u.role !== 'cidadao' && u.status === 'ativo'));
    } catch (error) {
      console.error('Error fetching agentes:', error);
    }
  };

  const openMonitoresDialog = (zona) => {
    setSelectedZona(zona);
    setSelectedMonitores((zona.monitores || []).map(m => typeof m === 'object' ? m._id : m));
    setAgentesSearch('');
    setMonitoresDialogOpen(true);
  };

  const toggleMonitor = (agentId) => {
    setSelectedMonitores(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  const saveMonitores = async () => {
    if (!selectedZona) return;
    setSavingMonitores(true);
    try {
      await zonasApi.updateMonitores(selectedZona._id, selectedMonitores);
      toast.success(`Monitores da zona "${selectedZona.nome}" atualizados`);
      setMonitoresDialogOpen(false);
      fetchZonas();
    } catch (error) {
      toast.error('Erro ao atualizar monitores');
    } finally {
      setSavingMonitores(false);
    }
  };

  useEffect(() => {
    fetchZonas();
    fetchAgentes();
  }, []);

  const getRiskBadge = (nivel) => {
    const styles = {
      ALTO: 'bg-red-600 text-white',
      MEDIO: 'bg-amber-500 text-white',
      BAIXO: 'bg-green-600 text-white'
    };
    return <Badge className={styles[nivel]}>{nivel}</Badge>;
  };

  // Stats
  const totalMonitores = new Set(zonas.flatMap(z => (z.monitores || []).map(m => m._id || m))).size;
  const zonasAlto = zonas.filter(z => z.nivel_risco === 'ALTO').length;

  return (
    <Layout>
      {/* Sub-header filter bar — flush below main header */}
      <div className="sticky top-16 z-20 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-4 lg:mb-6">
        <div className="bg-gradient-to-r from-[#0f1c36] via-[#162848] to-[#1a3058] shadow-lg shadow-[#1B2A4A]/10">
          <div className="px-4 lg:px-6">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {ZONA_TYPES.map(t => {
                const count = t.value === 'all' ? zonas.length : zonas.filter(z => (z.tipo_zona || 'critica') === t.value).length;
                const active = filterTipo === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setFilterTipo(t.value)}
                    className={`relative flex items-center gap-2 px-4 lg:px-5 py-3.5 text-[12px] lg:text-[13px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 group ${
                      active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                      active ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-400 group-hover:bg-white/12 group-hover:text-slate-300'
                    }`}>
                      {count}
                    </span>
                    <span className={`absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full transition-all duration-300 ${
                      active ? 'bg-blue-400' : 'bg-transparent group-hover:bg-white/10'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6" data-testid="zonas-criticas-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Zonas Monitoradas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestão de zonas críticas e monitores de alerta</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            {isAdmin && (
              <Button 
                onClick={openCreateDialog}
                className="rounded-xl text-sm font-semibold h-10 px-4"
                style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Zona
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setMapViewerOpen(true)}
              className="rounded-xl border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
            >
              <Map className="w-4 h-4 mr-2" />
              Ver no Mapa
            </Button>
            <Button 
              variant="outline" 
              onClick={calcularZonas}
              disabled={calculating}
              data-testid="calculate-zones-btn"
              className="rounded-xl border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all"
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Calcular Zonas
            </Button>
            <Button variant="outline" onClick={fetchZonas} className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up stagger-2" style={{opacity: 0}}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#1B2A4A]">{zonas.length}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Zonas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-red-600">{zonasAlto}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Risco Alto</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-600">{totalMonitores}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Monitores</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-600">{zonas.filter(z => (z.monitores || []).length > 0).length}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Com Monitores</p>
            </div>
          </div>
        </div>

        {/* Calculated Zones Preview */}
        {zonasCalculadas.length > 0 && (
          <Card className="border-0 shadow-md shadow-amber-200/30 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/50 animate-slide-up stagger-2" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-200/50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                </div>
                Zonas Identificadas Automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zonasCalculadas.map((zona, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-slate-500">
                        {zona.latitude_centro.toFixed(4)}, {zona.longitude_centro.toFixed(4)}
                      </span>
                      {getRiskBadge(zona.nivel_risco)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-700"><strong>{zona.total_acidentes}</strong> acidentes ({zona.acidentes_graves} graves)</p>
                      <p className="text-slate-400 text-xs">Causa: {zona.causa_mais_frequente?.replace(/_/g, ' ') || 'N/A'}</p>
                      {zona.recomendacao_melhoria && (
                        <p className="text-amber-700 flex items-start gap-1 mt-2 text-xs">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {zona.recomendacao_melhoria}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zones list */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-lg font-bold text-[#1B2A4A]">Zonas Registadas</CardTitle>
            <p className="text-xs text-slate-400">Gerir zonas, atribuir monitores e definir níveis de risco</p>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : filteredZonas.length === 0 ? (
              <div className="text-center py-12 text-slate-300">
                <MapPin className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-400">{filterTipo === 'all' ? 'Nenhuma zona monitorada registada' : 'Nenhuma zona nesta categoria'}</p>
                <p className="text-xs text-slate-300 mt-1">Clique em "Nova Zona" para adicionar uma zona de monitoramento</p>
                {isAdmin && (
                  <Button onClick={openCreateDialog} className="mt-4 rounded-xl text-sm" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                    <Plus className="w-4 h-4 mr-2" /> Criar Primeira Zona
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredZonas.map((zona, idx) => (
                  <div 
                    key={zona._id || zona.zona_id} 
                    className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden card-interactive animate-slide-up"
                    style={{ animationDelay: `${0.15 + idx * 0.05}s`, opacity: 0 }}
                  >
                    <div className={`h-1.5 ${
                      zona.nivel_risco === 'ALTO' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                      zona.nivel_risco === 'MEDIO' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                      'bg-gradient-to-r from-emerald-400 to-teal-500'
                    }`} />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            zona.nivel_risco === 'ALTO' ? 'bg-red-100' :
                            zona.nivel_risco === 'MEDIO' ? 'bg-amber-100' : 'bg-emerald-100'
                          }`}>
                            <MapPin className={`w-4 h-4 ${
                              zona.nivel_risco === 'ALTO' ? 'text-red-600' :
                              zona.nivel_risco === 'MEDIO' ? 'text-amber-600' : 'text-emerald-600'
                            }`} />
                          </div>
                          <span className="font-semibold text-sm text-slate-800 truncate">{zona.nome || 'Zona sem nome'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getRiskBadge(zona.nivel_risco)}
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 ml-1">
                              <button onClick={() => openEditDialog(zona)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => confirmDelete(zona)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Coordenadas</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {zona.latitude_centro?.toFixed(4)}, {zona.longitude_centro?.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Raio</span>
                          <span className="text-xs font-medium text-slate-600">{zona.raio_metros}m</span>
                        </div>
                        {zona.total_acidentes > 0 && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs">Total Acidentes</span>
                              <span className="text-sm font-bold text-slate-800">{zona.total_acidentes}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs">Graves</span>
                              <span className="text-sm font-bold text-red-600">{zona.acidentes_graves}</span>
                            </div>
                          </>
                        )}
                        {zona.causa_mais_frequente && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">Causa Principal</span>
                            <span className="text-[11px] font-medium text-slate-600">{zona.causa_mais_frequente.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {zona.recomendacao_melhoria && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {zona.recomendacao_melhoria}
                        </div>
                      )}
                      
                      {/* Monitores section */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" /> Monitores
                          </span>
                          {isAdmin && (
                            <button
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                              onClick={() => openMonitoresDialog(zona)}
                            >
                              <UserPlus className="w-3 h-3" /> Gerir
                            </button>
                          )}
                        </div>
                        {(zona.monitores || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {zona.monitores.map(m => (
                              <span key={m._id || m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium">
                                {m.name || 'Agente'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-300 italic">Sem monitores atribuídos</p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs font-medium ${zona.validado ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {zona.validado ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validado
                            </span>
                          ) : 'Pendente validação'}
                        </span>
                        
                        {!zona.validado && isAdmin && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="rounded-xl text-xs font-semibold border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => validarZona(zona._id || zona.zona_id)}
                          >
                            Validar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* === Create/Edit Zone Dialog === */}
        <Dialog open={zonaDialogOpen} onOpenChange={setZonaDialogOpen}>
          <DialogContent className="rounded-2xl max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#1B2A4A] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {editingZona ? 'Editar Zona' : 'Nova Zona Monitorada'}
              </DialogTitle>
              <DialogDescription>
                {editingZona ? 'Atualize os dados da zona monitorada.' : 'Desenhe a zona no mapa ou preencha as coordenadas manualmente.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nome da Zona *</Label>
                <Input
                  placeholder="Ex: Rotatória do Kilamba"
                  value={zonaForm.nome}
                  onChange={e => setZonaForm(p => ({ ...p, nome: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              {/* Map Drawing Area */}
              {apiKey && mapLoaded ? (
                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Desenhar Zona no Mapa</Label>
                  {/* Drawing mode selector */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => { setDrawingMode('polygon'); clearDrawing(); if(circleOverlayRef.current){circleOverlayRef.current.setMap(null);} if(circleCenterMarkerRef.current){circleCenterMarkerRef.current.setMap(null);} }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        drawingMode === 'polygon'
                          ? 'bg-[#1B2A4A] text-white shadow-md'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Hexagon className="w-3.5 h-3.5" />
                      Polígono
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDrawingMode('circle'); clearDrawing(); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        drawingMode === 'circle'
                          ? 'bg-[#1B2A4A] text-white shadow-md'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      Raio
                    </button>
                    <span className="text-[10px] text-slate-400 ml-2">
                      {drawingMode === 'polygon'
                        ? 'Clique no mapa para adicionar pontos. Mín. 3 pontos.'
                        : 'Clique no mapa para definir o centro. Arraste a borda para ajustar o raio.'}
                    </span>
                  </div>
                  {/* Drawing controls — polygon mode */}
                  {drawingMode === 'polygon' && (
                    <div className="flex items-center gap-2 mb-2">
                      {drawingPoints.length > 0 && (
                        <Button type="button" size="sm" variant="outline" onClick={undoLastPoint} className="rounded-lg text-xs h-7 px-2">
                          Desfazer
                        </Button>
                      )}
                      {drawingPoints.length >= 3 && (
                        <Button type="button" size="sm" onClick={finishDrawing} className="rounded-lg text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Fechar Polígono
                        </Button>
                      )}
                      {drawingPoints.length > 0 && (
                        <Button type="button" size="sm" variant="outline" onClick={clearDrawing} className="rounded-lg text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50">
                          <X className="w-3 h-3 mr-1" />
                          Limpar
                        </Button>
                      )}
                      {drawingPoints.length > 0 && (
                        <span className="text-[10px] text-slate-400 ml-auto">{drawingPoints.length} ponto{drawingPoints.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                  <div
                    ref={mapContainerRef}
                    className="w-full h-64 rounded-xl border border-slate-200 overflow-hidden"
                  />
                  {drawingMode === 'polygon' && drawingPoints.length > 0 && drawingPoints.length < 3 && (
                    <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Adicione mais {3 - drawingPoints.length} ponto{3 - drawingPoints.length !== 1 ? 's' : ''} para formar um polígono
                    </p>
                  )}
                  {drawingMode === 'polygon' && drawingPoints.length >= 3 && (
                    <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {drawingPoints.length} pontos de delimitação capturados
                    </p>
                  )}
                  {drawingMode === 'circle' && zonaForm.latitude_centro && (
                    <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Centro definido · Raio: {zonaForm.raio_metros}m (arraste a borda para ajustar)
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">Mapa indisponível — preencha as coordenadas manualmente ou use a localização.</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Coordenadas *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-2"
                  >
                    {gettingLocation ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Navigation className="w-3 h-3 mr-1" />}
                    Usar Minha Localização
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Latitude: -8.8368"
                    value={zonaForm.latitude_centro}
                    onChange={e => setZonaForm(p => ({ ...p, latitude_centro: e.target.value }))}
                    className="rounded-xl border-slate-200 text-sm"
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Longitude: 13.2343"
                    value={zonaForm.longitude_centro}
                    onChange={e => setZonaForm(p => ({ ...p, longitude_centro: e.target.value }))}
                    className="rounded-xl border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Raio (metros)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={zonaForm.raio_metros}
                    onChange={e => setZonaForm(p => ({ ...p, raio_metros: e.target.value }))}
                    className="rounded-xl border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nível de Risco</Label>
                  <Select value={zonaForm.nivel_risco} onValueChange={v => setZonaForm(p => ({ ...p, nivel_risco: v }))}>
                    <SelectTrigger className="rounded-xl border-slate-200 text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALTO">Alto</SelectItem>
                      <SelectItem value="MEDIO">Médio</SelectItem>
                      <SelectItem value="BAIXO">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tipo de Zona</Label>
                  <Select value={zonaForm.tipo_zona} onValueChange={v => setZonaForm(p => ({ ...p, tipo_zona: v }))}>
                    <SelectTrigger className="rounded-xl border-slate-200 text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="vigilancia">Vigilância</SelectItem>
                      <SelectItem value="segura">Segura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Recomendação / Observação</Label>
                <Input
                  placeholder="Ex: Instalar semáforo, lombas de redução..."
                  value={zonaForm.recomendacao_melhoria}
                  onChange={e => setZonaForm(p => ({ ...p, recomendacao_melhoria: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setZonaDialogOpen(false)} className="rounded-xl text-sm">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveZona}
                  disabled={savingZona}
                  className="rounded-xl text-sm font-semibold px-6"
                  style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                >
                  {savingZona ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {editingZona ? 'Atualizar' : 'Criar Zona'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* === Delete Confirmation Dialog === */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Eliminar Zona
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja eliminar a zona <strong>"{deletingZona?.nome}"</strong>? Esta ação não pode ser desfeita. Os monitores atribuídos também serão removidos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl text-sm">
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteZona}
                disabled={deleting}
                className="rounded-xl text-sm font-semibold px-6 bg-red-600 hover:bg-red-700"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* === Monitores Dialog === */}
        <Dialog open={monitoresDialogOpen} onOpenChange={setMonitoresDialogOpen}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#1B2A4A] flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Gerir Monitores
              </DialogTitle>
              <DialogDescription>
                {selectedZona?.nome} — selecione os agentes que receberão alertas de acidentes nesta zona.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input
                  placeholder="Pesquisar agente..."
                  value={agentesSearch}
                  onChange={e => setAgentesSearch(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 text-sm"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {agentes
                  .filter(a => a.name?.toLowerCase().includes(agentesSearch.toLowerCase()) || a.email?.toLowerCase().includes(agentesSearch.toLowerCase()))
                  .map(agente => {
                    const isSelected = selectedMonitores.includes(agente._id);
                    return (
                      <button
                        key={agente._id}
                        onClick={() => toggleMonitor(agente._id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {agente.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{agente.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{agente.email} · {agente.role}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                {agentes.filter(a => a.name?.toLowerCase().includes(agentesSearch.toLowerCase()) || a.email?.toLowerCase().includes(agentesSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">Nenhum agente encontrado</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {selectedMonitores.length} agente{selectedMonitores.length !== 1 ? 's' : ''} selecionado{selectedMonitores.length !== 1 ? 's' : ''}
                </p>
                <Button
                  onClick={saveMonitores}
                  disabled={savingMonitores}
                  className="h-10 px-6 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                >
                  {savingMonitores ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      {/* Map Viewer Dialog — Ver no Mapa */}
      <Dialog open={mapViewerOpen} onOpenChange={setMapViewerOpen}>
        <DialogContent className="rounded-2xl max-w-5xl w-[95vw]" style={{ maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1B2A4A] flex items-center gap-2">
              <Map className="w-5 h-5" /> Mapa de Zonas
            </DialogTitle>
            <DialogDescription>Visualização de todas as zonas com as suas delimitações coloridas por tipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E53935' }}></span> Crítica</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FF9800' }}></span> Vigilância</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4CAF50' }}></span> Segura</span>
              <span className="text-slate-400 ml-auto">{zonas.length} zona{zonas.length !== 1 ? 's' : ''} total</span>
            </div>
            {apiKey && mapLoaded ? (
              <div ref={initMapViewer} style={{ width: '100%', height: '60vh', borderRadius: 12 }} />
            ) : (
              <div className="flex items-center justify-center h-60 bg-slate-50 rounded-xl">
                <p className="text-slate-400 text-sm">{apiKey ? 'A carregar Google Maps...' : 'Chave do Google Maps não configurada'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
