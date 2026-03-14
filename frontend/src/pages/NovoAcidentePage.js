import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { acidentesApi, configuracoesApi } from '../services/api';
import { 
  MapPin, 
  ArrowLeft, 
  Loader2,
  Car,
  Users,
  AlertTriangle,
  Navigation,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

const TIPOS_ACIDENTE = [
  { value: 'COLISAO_FRONTAL', label: 'Colisão Frontal' },
  { value: 'COLISAO_TRASEIRA', label: 'Colisão Traseira' },
  { value: 'COLISAO_LATERAL', label: 'Colisão Lateral' },
  { value: 'CAPOTAMENTO', label: 'Capotamento' },
  { value: 'ATROPELAMENTO', label: 'Atropelamento' },
  { value: 'CHOQUE_OBSTACULO', label: 'Choque com Obstáculo' },
  { value: 'QUEDA_VEICULO', label: 'Queda de Veículo' },
  { value: 'OUTRO', label: 'Outro' },
];

const CAUSAS = [
  { value: 'EXCESSO_VELOCIDADE', label: 'Excesso de Velocidade' },
  { value: 'ALCOOL', label: 'Álcool' },
  { value: 'DISTRACAO', label: 'Distração' },
  { value: 'FALHA_MECANICA', label: 'Falha Mecânica' },
  { value: 'MAU_TEMPO', label: 'Mau Tempo' },
  { value: 'VIA_DANIFICADA', label: 'Via Danificada' },
  { value: 'ULTRAPASSAGEM_INDEVIDA', label: 'Ultrapassagem Indevida' },
  { value: 'DESRESPEITO_SINALIZACAO', label: 'Desrespeito à Sinalização' },
  { value: 'FADIGA', label: 'Fadiga' },
  { value: 'OUTRA', label: 'Outra' },
];

const GRAVIDADES = [
  { value: 'LEVE', label: 'Leve' },
  { value: 'MODERADO', label: 'Moderado' },
  { value: 'GRAVE', label: 'Grave' },
  { value: 'FATAL', label: 'Fatal' },
];

const DEFAULT_CENTER = { lat: -8.8368, lng: 13.2343 };

export default function NovoAcidentePage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    latitude: DEFAULT_CENTER.lat,
    longitude: DEFAULT_CENTER.lng,
    endereco: '',
    descricao: '',
    tipo_acidente: 'OUTRO',
    gravidade: 'MODERADO',
    causa_principal: '',
    numero_vitimas: 0,
    numero_veiculos: 1,
  });

  // Fetch API Key
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

  // Load Google Maps
  useEffect(() => {
    if (!apiKey) return;
    
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: formData.latitude, lng: formData.longitude },
      zoom: 14,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    });

    markerRef.current = new window.google.maps.Marker({
      position: { lat: formData.latitude, lng: formData.longitude },
      map: mapInstanceRef.current,
      draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#DC2626',
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    });

    mapInstanceRef.current.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      markerRef.current.setPosition({ lat, lng });
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    });

    markerRef.current.addListener('dragend', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    });
  }, [mapLoaded]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!window.google?.maps) return;
    
    const geocoder = new window.google.maps.Geocoder();
    try {
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results[0]) {
        setFormData(prev => ({ ...prev, endereco: result.results[0].formatted_address }));
      }
    } catch (error) {
      console.error('Geocode error:', error);
    }
  }, []);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
          
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            markerRef.current.setPosition({ lat, lng });
          }
          
          reverseGeocode(lat, lng);
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
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    } else {
      toast.error('Geolocalização não suportada neste navegador');
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descricao.trim()) {
      toast.error('Por favor, adicione uma descrição');
      return;
    }
    
    setLoading(true);
    try {
      await acidentesApi.create(formData);
      toast.success('Acidente registrado com sucesso');
      navigate('/acidentes');
    } catch (error) {
      toast.error('Erro ao registrar acidente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="novo-acidente-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Registrar Acidente</h1>
            <p className="text-slate-500 text-sm">Preencha os dados do acidente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localização
              </CardTitle>
              <CardDescription>Clique no mapa ou arraste o marcador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  data-testid="get-location-btn"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  Usar Minha Localização
                </Button>
              </div>
              
              {apiKey ? (
                <div 
                  ref={mapRef} 
                  className="w-full h-64 rounded-lg border"
                  style={{ minHeight: '250px' }}
                />
              ) : (
                <div className="w-full h-64 rounded-lg border bg-slate-100 flex items-center justify-center">
                  <p className="text-slate-500">API Key não configurada</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="font-mono"
                    data-testid="latitude-input"
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="font-mono"
                    data-testid="longitude-input"
                  />
                </div>
              </div>
              
              <div>
                <Label>Endereço</Label>
                <Input 
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço do local"
                  data-testid="endereco-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Detalhes do Acidente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Acidente</Label>
                  <Select 
                    value={formData.tipo_acidente} 
                    onValueChange={(v) => setFormData({ ...formData, tipo_acidente: v })}
                  >
                    <SelectTrigger data-testid="tipo-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ACIDENTE.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Gravidade</Label>
                  <Select 
                    value={formData.gravidade} 
                    onValueChange={(v) => setFormData({ ...formData, gravidade: v })}
                  >
                    <SelectTrigger data-testid="gravidade-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVIDADES.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Causa Principal</Label>
                  <Select 
                    value={formData.causa_principal} 
                    onValueChange={(v) => setFormData({ ...formData, causa_principal: v })}
                  >
                    <SelectTrigger data-testid="causa-select">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAUSAS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea 
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o acidente..."
                  rows={4}
                  required
                  data-testid="descricao-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Casualties Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Envolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número de Vítimas</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={formData.numero_vitimas}
                    onChange={(e) => setFormData({ ...formData, numero_vitimas: parseInt(e.target.value) || 0 })}
                    data-testid="vitimas-input"
                  />
                </div>
                <div>
                  <Label>Número de Veículos</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={formData.numero_veiculos}
                    onChange={(e) => setFormData({ ...formData, numero_veiculos: parseInt(e.target.value) || 1 })}
                    data-testid="veiculos-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-slate-900 hover:bg-slate-800"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Registrar Acidente
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
