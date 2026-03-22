import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { acidentesApi, assistenciasApi, boletinsApi, configuracoesApi, utilizadoresApi, delegacoesApi, anotacoesApi, zonasApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  User,
  Car,
  AlertTriangle,
  Ambulance,
  Edit,
  Trash2,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  Shield,
  Flame,
  Search,
  Navigation2,
  Eye,
  Maximize2,
  Minimize2,
  Phone,
  Radio,
  Activity,
  Send,
  UserCheck,
  XCircle,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  MoreVertical,
  Ban,
  History,
  Bell,
  Info,
  Layers,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

const GRAVIDADES = ['LEVE', 'MODERADO', 'GRAVE', 'FATAL'];
const STATUS = ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO', 'ENCERRADO'];

export default function AcidenteDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [acidente, setAcidente] = useState(null);
  const [assistencias, setAssistencias] = useState([]);
  const [boletins, setBoletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [assistDialog, setAssistDialog] = useState(false);
  const [newAssist, setNewAssist] = useState({ tipo: 'AMBULANCIA', agente_id: '' });
  const [agentes, setAgentes] = useState([]);
  const [agenteSearch, setAgenteSearch] = useState('');
  const [agentesACaminho, setAgentesACaminho] = useState([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  const agentMarkersRef = useRef([]);
  const [allUsers, setAllUsers] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [alertarCidadao, setAlertarCidadao] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [historicoModal, setHistoricoModal] = useState(false);
  const [boletinsModal, setBoletinsModal] = useState(false);
  const [delegacaoModal2, setDelegacaoModal2] = useState(false);
  const [novoBoletimModal, setNovoBoletimModal] = useState(false);
  const [boletimForm, setBoletimForm] = useState({
    numero_processo: '',
    observacoes: '',
    vitimas_info: [],
    veiculos_info: [],
    testemunhas: []
  });
  const [savingBoletim, setSavingBoletim] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [editingBoletim, setEditingBoletim] = useState(null);
  const [deleteBoletimDialog, setDeleteBoletimDialog] = useState(false);
  const [boletimToDelete, setBoletimToDelete] = useState(null);

  // Delegation state
  const [agentesAtivos, setAgentesAtivos] = useState([]);
  const [delegationModal, setDelegationModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [delegating, setDelegating] = useState(false);
  const [delegacoes, setDelegacoes] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);

  // Annotations
  const [anotacoes, setAnotacoes] = useState([]);
  
  // Zones
  const [zonas, setZonas] = useState([]);
  const zonasRef = useRef([]);

  const [editForm, setEditForm] = useState({
    status: '',
    gravidade: '',
    descricao: '',
    confirmado_oficialmente: false
  });

  // Embedded map
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapApiKey, setMapApiKey] = useState(null);
  const [mapReady, setMapReady] = useState(!!window.google?.maps?.Map);

  // Fetch Google Maps API key
  useEffect(() => {
    configuracoesApi.getGoogleMapsKey().then(d => setMapApiKey(d.api_key)).catch(() => {});
  }, []);

  // Load Google Maps script if needed
  useEffect(() => {
    if (!mapApiKey) return;
    if (window.google?.maps?.Map) { setMapReady(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      const check = setInterval(() => { if (window.google?.maps?.Map) { setMapReady(true); clearInterval(check); } }, 200);
      const t = setTimeout(() => clearInterval(check), 15000);
      return () => { clearInterval(check); clearTimeout(t); };
    }
    const cb = '__onGMapsDetail_' + Date.now();
    window[cb] = () => { setMapReady(true); delete window[cb]; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&loading=async&callback=${cb}&libraries=marker`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, [mapApiKey]);

  // Render map when acidente and API ready
  useEffect(() => {
    if (!mapReady || !acidente || !mapContainerRef.current || mapInstanceRef.current) return;
    const pos = { lat: acidente.latitude, lng: acidente.longitude };
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: pos, 
      zoom: 16, 
      mapTypeId: 'terrain',
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: window.google.maps.ControlPosition.TOP_RIGHT,
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        mapTypeIds: ['roadmap', 'satellite', 'terrain', 'hybrid']
      },
      streetViewControl: false, 
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    mapInstanceRef.current = map;
    const color = { FATAL: '#DC2626', GRAVE: '#EA580C', MODERADO: '#D97706', LEVE: '#16A34A' }[acidente.gravidade] || '#D97706';
    
    const markerDiv = document.createElement('div');
    markerDiv.style.width = '28px';
    markerDiv.style.height = '28px';
    markerDiv.style.borderRadius = '50%';
    markerDiv.style.backgroundColor = color;
    markerDiv.style.border = '3px solid #fff';
    markerDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    markerDiv.title = acidente.tipo_acidente;
    
    if (window.google.maps.marker?.AdvancedMarkerElement) {
      new window.google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map,
        content: markerDiv,
        title: acidente.tipo_acidente
      });
    } else {
      new window.google.maps.Marker({
        position: pos, map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 3 },
        title: acidente.tipo_acidente
      });
    }
  }, [mapReady, acidente]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acidenteData, assistData, boletinsData, usersData] = await Promise.all([
          acidentesApi.get(id),
          assistenciasApi.list({ acidente_id: id }),
          boletinsApi.list({ acidente_id: id }).catch(() => []),
          utilizadoresApi.list().catch(() => [])
        ]);
        setAcidente(acidenteData);
        setAssistencias(assistData);
        setBoletins(boletinsData);
        setAllUsers(usersData);
        setAgentes(usersData.filter(u => ['policia', 'admin'].includes(u.role) && u.status === 'ativo'));
        setEditForm({
          status: acidenteData.status,
          gravidade: acidenteData.gravidade,
          descricao: acidenteData.descricao,
          confirmado_oficialmente: acidenteData.confirmado_oficialmente
        });
      } catch (error) {
        toast.error('Erro ao carregar acidente');
        navigate('/acidentes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // Load delegations, annotations, pending requests, active agents, and zones
  useEffect(() => {
    if (!acidente) return;
    const acidenteId = acidente._id || acidente.acidente_id || id;
    const loadExtra = async () => {
      try {
        const [deleg, pedidos, anots, agAtivos, zonasData] = await Promise.all([
          delegacoesApi.list({ acidente_id: acidenteId }).catch(() => []),
          delegacoesApi.pedidosPendentes().catch(() => []),
          anotacoesApi.list(acidenteId).catch(() => []),
          delegacoesApi.agentesAtivos().catch(() => []),
          zonasApi.list().catch(() => [])
        ]);
        setDelegacoes(deleg);
        setPedidosPendentes(pedidos.filter(p => p.acidente_id === acidenteId));
        setAnotacoes(anots);
        setAgentesAtivos(agAtivos);
        setZonas(zonasData);
      } catch (_) {}
    };
    loadExtra();
  }, [acidente]);

  // Poll for agents en route every 5 seconds
  useEffect(() => {
    if (!id) return;
    let active = true;
    const poll = async () => {
      try {
        const agents = await acidentesApi.getAgentesACaminho(id);
        if (active) setAgentesACaminho(agents || []);
      } catch (_) {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [id]);

  // Update agent markers on the Google Map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;

    // Clear old agent markers
    agentMarkersRef.current.forEach(m => m.setMap(null));
    agentMarkersRef.current = [];

    agentesACaminho.forEach(ag => {
      if (!ag.latitude || !ag.longitude) return;
      const isArrived = ag.status === 'CHEGOU';
      const agentColor = isArrived ? '#22C55E' : '#2563EB';
      
      const agentMarkerDiv = document.createElement('div');
      agentMarkerDiv.style.width = '24px';
      agentMarkerDiv.style.height = '24px';
      agentMarkerDiv.style.borderRadius = '50%';
      agentMarkerDiv.style.backgroundColor = agentColor;
      agentMarkerDiv.style.border = '2px solid #fff';
      agentMarkerDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      agentMarkerDiv.style.cursor = 'pointer';
      agentMarkerDiv.title = `${ag.agente_nome || 'Agente'} — ${isArrived ? 'No Local' : 'A Caminho'}`;
      
      let marker;
      if (window.google.maps.marker?.AdvancedMarkerElement) {
        marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: ag.latitude, lng: ag.longitude },
          map,
          content: agentMarkerDiv,
          title: `${ag.agente_nome || 'Agente'} — ${isArrived ? 'No Local' : 'A Caminho'}`
        });
      } else {
        marker = new window.google.maps.Marker({
          position: { lat: ag.latitude, lng: ag.longitude },
          map,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: agentColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            rotation: 0
          },
          title: `${ag.agente_nome || 'Agente'} — ${isArrived ? 'No Local' : 'A Caminho'}`,
          zIndex: 10
        });
      }

      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px"><strong>${ag.agente_nome || 'Agente'}</strong><br/><span style="color:${isArrived ? '#16A34A' : '#2563EB'};font-size:12px">${isArrived ? '✅ Chegou ao local' : '🚗 A caminho'}</span><br/><span style="color:#64748b;font-size:11px">Atualizado: ${new Date(ag.updated_at).toLocaleTimeString('pt-AO')}</span></div>`
      });
      
      if (window.google.maps.marker?.AdvancedMarkerElement && marker.content) {
        marker.content.addEventListener('click', () => info.open(map, marker));
      } else {
        marker.addListener('click', () => info.open(map, marker));
      }

      agentMarkersRef.current.push(marker);
    });
  }, [agentesACaminho, mapReady]);

  // Render zones on map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google?.maps || zonas.length === 0) return;
    const map = mapInstanceRef.current;

    // Clear old zone polygons
    zonasRef.current.forEach(z => z.setMap(null));
    zonasRef.current = [];

    zonas.forEach(zona => {
      const color = zona.nivel_risco === 'ALTO' ? '#DC2626' : zona.nivel_risco === 'MEDIO' ? '#D97706' : '#16A34A';
      if (zona.delimitacoes && zona.delimitacoes.length >= 3) {
        const polygon = new window.google.maps.Polygon({
          map,
          paths: zona.delimitacoes,
          fillColor: color,
          fillOpacity: 0.2,
          strokeColor: color,
          strokeWeight: 2
        });
        
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding:4px"><strong>${zona.nome || 'Zona'}</strong><br/><span style="font-size:11px;color:#64748b">Risco: ${zona.nivel_risco} · ${zona.total_acidentes || 0} acidentes</span></div>`
        });
        
        polygon.addListener('click', (e) => {
          infoWindow.setPosition(e.latLng);
          infoWindow.open(map);
        });
        
        zonasRef.current.push(polygon);
      }
    });
  }, [zonas, mapReady]);

  const handleQuickStatus = async (newStatus) => {
    try {
      const updated = await acidentesApi.update(id, { status: newStatus });
      setAcidente(updated);
      setEditForm(prev => ({ ...prev, status: newStatus }));
      toast.success(`Status atualizado para ${newStatus.replace(/_/g, ' ')}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await acidentesApi.update(id, editForm);
      setAcidente(updated);
      setEditMode(false);
      toast.success('Acidente atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await acidentesApi.delete(id);
      setDeleteDialog(false);
      toast.success('Acidente removido com sucesso');
      setTimeout(() => navigate('/acidentes'), 500);
    } catch (error) {
      console.error('Erro ao deletar acidente:', error);
      toast.error(error.message || 'Erro ao remover acidente');
    }
  };

  const handleCancelarAcidente = async () => {
    if (!cancelMotivo || cancelMotivo.trim().length < 10) {
      toast.error('Motivo deve ter pelo menos 10 caracteres');
      return;
    }
    try {
      const updated = await acidentesApi.update(id, { 
        status: 'CANCELADO',
        motivo_cancelamento: cancelMotivo,
        alertar_cidadao: alertarCidadao
      });
      setAcidente(updated);
      setCancelDialog(false);
      setCancelMotivo('');
      setAlertarCidadao(true);
      toast.success('Acidente cancelado' + (alertarCidadao ? ' e cidadão notificado' : ''));
    } catch (error) {
      toast.error('Erro ao cancelar acidente');
    }
  };

  const confirmAndExecute = (action) => {
    setConfirmAction(action);
    setConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.fn();
      setConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const handleCreateAssistencia = async () => {
    try {
      const payload = { acidente_id: id, ...newAssist };
      if (payload.agente_id) {
        const ag = agentes.find(a => a._id === payload.agente_id);
        if (ag) payload.agente_nome = ag.name;
      }
      await assistenciasApi.create(payload);
      toast.success('AssistÃªncia enviada');
      setAssistDialog(false);
      setNewAssist({ tipo: 'AMBULANCIA', agente_id: '' });
      setAgenteSearch('');
      // Refresh assistencias
      const assistData = await assistenciasApi.list({ acidente_id: id });
      setAssistencias(assistData);
      // Refresh acidente status
      const acidenteData = await acidentesApi.get(id);
      setAcidente(acidenteData);
    } catch (error) {
      toast.error('Erro ao criar assistÃªncia');
    }
  };

  const handleCreateBoletim = () => {
    setEditingBoletim(null);
    setUploadMode(false);
    setUploadFile(null);
    setBoletimForm({
      numero_processo: '',
      observacoes: '',
      vitimas_info: [],
      veiculos_info: [],
      testemunhas: []
    });
    setNovoBoletimModal(true);
    setBoletinsModal(false);
  };

  const handleEditBoletim = (boletim) => {
    setEditingBoletim(boletim);
    // Se for upload manual, manter modo upload para permitir trocar arquivo
    setUploadMode(boletim.modo_criacao === 'UPLOAD_MANUAL');
    setUploadFile(null);
    setBoletimForm({
      numero_processo: boletim.numero_processo || '',
      observacoes: boletim.observacoes || '',
      vitimas_info: boletim.vitimas_info || [],
      veiculos_info: boletim.veiculos_info || [],
      testemunhas: boletim.testemunhas || []
    });
    setNovoBoletimModal(true);
    setBoletinsModal(false);
  };

  const handleDeleteBoletim = async () => {
    if (!boletimToDelete) return;
    try {
      await boletinsApi.delete(boletimToDelete._id || boletimToDelete.boletim_id);
      toast.success('Boletim deletado com sucesso');
      setDeleteBoletimDialog(false);
      setBoletimToDelete(null);
      const boletinsData = await boletinsApi.list({ acidente_id: id });
      setBoletins(boletinsData);
    } catch (error) {
      toast.error('Erro ao deletar boletim');
    }
  };

  const handleSubmitBoletim = async () => {
    setSavingBoletim(true);
    try {
      const payload = { 
        ...boletimForm, 
        acidente_id: id,
        modo_criacao: uploadMode ? 'UPLOAD_MANUAL' : 'GERADO_SISTEMA' 
      };
      
      let boletim;
      if (editingBoletim) {
        await boletinsApi.update(editingBoletim._id || editingBoletim.boletim_id, payload);
        toast.success('Boletim atualizado com sucesso');
        
        // Se estiver editando e tiver novo arquivo, fazer upload
        if (uploadMode && uploadFile) {
          await boletinsApi.upload(editingBoletim._id || editingBoletim.boletim_id, uploadFile);
          toast.success('Arquivo atualizado com sucesso');
        }
      } else {
        boletim = await boletinsApi.create(payload);
        toast.success('Boletim criado com sucesso');
        
        if (uploadMode && uploadFile && boletim) {
          await boletinsApi.upload(boletim._id || boletim.boletim_id, uploadFile);
        }
      }
      
      setNovoBoletimModal(false);
      setEditingBoletim(null);
      setUploadFile(null);
      const boletinsData = await boletinsApi.list({ acidente_id: id });
      setBoletins(boletinsData);
    } catch (error) {
      toast.error(editingBoletim ? 'Erro ao atualizar boletim' : 'Erro ao criar boletim');
    } finally {
      setSavingBoletim(false);
    }
  };

  const addVitimaBoletim = () => {
    setBoletimForm(prev => ({
      ...prev,
      vitimas_info: [...prev.vitimas_info, { id: Date.now() + Math.random(), nome: '', bi: '', estado: 'ILESO', telefone: '', endereco: '' }]
    }));
  };

  const removeVitimaBoletim = (index) => {
    setBoletimForm(prev => ({
      ...prev,
      vitimas_info: prev.vitimas_info.filter((_, i) => i !== index)
    }));
  };

  const updateVitimaBoletim = (index, field, value) => {
    setBoletimForm(prev => {
      const updated = [...prev.vitimas_info];
      updated[index][field] = value;
      return { ...prev, vitimas_info: updated };
    });
  };

  const addVeiculoBoletim = () => {
    setBoletimForm(prev => ({
      ...prev,
      veiculos_info: [...prev.veiculos_info, { id: Date.now() + Math.random(), matricula: '', marca: '', modelo: '', cor: '', proprietario: '' }]
    }));
  };

  const removeVeiculoBoletim = (index) => {
    setBoletimForm(prev => ({
      ...prev,
      veiculos_info: prev.veiculos_info.filter((_, i) => i !== index)
    }));
  };

  const updateVeiculoBoletim = (index, field, value) => {
    setBoletimForm(prev => {
      const updated = [...prev.veiculos_info];
      updated[index][field] = value;
      return { ...prev, veiculos_info: updated };
    });
  };

  const addTestemunhaBoletim = () => {
    setBoletimForm(prev => ({
      ...prev,
      testemunhas: [...prev.testemunhas, { id: Date.now() + Math.random(), nome: '', telefone: '', endereco: '' }]
    }));
  };

  const removeTestemunhaBoletim = (index) => {
    setBoletimForm(prev => ({
      ...prev,
      testemunhas: prev.testemunhas.filter((_, i) => i !== index)
    }));
  };

  const updateTestemunhaBoletim = (index, field, value) => {
    setBoletimForm(prev => {
      const updated = [...prev.testemunhas];
      updated[index][field] = value;
      return { ...prev, testemunhas: updated };
    });
  };

  // Distance calculation helper (Haversine)
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const dLat = (lat2 - lat1) * 111.32;
    const dLng = (lng2 - lng1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
    return Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
  };

  const handleDelegarMissao = async (agent) => {
    if (!acidente) return;
    setDelegating(true);
    try {
      const acidenteId = acidente._id || acidente.acidente_id || id;
      const dist = calcDistance(agent.latitude, agent.longitude, acidente.latitude, acidente.longitude);
      await delegacoesApi.create({
        acidente_id: acidenteId,
        agente_id: agent._id,
        agente_nome: agent.name || agent.nome || '',
        agente_telefone: agent.telefone || '',
        delegado_por: user?.id || user?._id || '',
        delegado_por_nome: user?.nome || user?.name || '',
        distancia_km: dist,
        latitude_agente: agent.latitude,
        longitude_agente: agent.longitude
      });
      toast.success(`Missão delegada a ${agent.name || 'agente'}`);
      setDelegationModal(false);
      setSelectedAgent(null);
      // Refresh delegations
      const deleg = await delegacoesApi.list({ acidente_id: acidenteId });
      setDelegacoes(deleg);
    } catch (err) {
      toast.error(err.message || 'Erro ao delegar missão');
    } finally {
      setDelegating(false);
    }
  };

  const handleDelegarMultiplos = async () => {
    if (!acidente || selectedAgents.length === 0) return;
    setDelegating(true);
    try {
      const acidenteId = acidente._id || acidente.acidente_id || id;
      const promises = selectedAgents.map(agentId => {
        const agent = agentesAtivos.find(a => a._id === agentId);
        if (!agent) return null;
        const dist = calcDistance(agent.latitude, agent.longitude, acidente.latitude, acidente.longitude);
        return delegacoesApi.create({
          acidente_id: acidenteId,
          agente_id: agent._id,
          agente_nome: agent.name || agent.nome || '',
          agente_telefone: agent.telefone || '',
          delegado_por: user?.id || user?._id || '',
          delegado_por_nome: user?.nome || user?.name || '',
          distancia_km: dist,
          latitude_agente: agent.latitude,
          longitude_agente: agent.longitude
        });
      }).filter(Boolean);
      
      await Promise.all(promises);
      toast.success(`Missão delegada a ${selectedAgents.length} agente(s)`);
      setDelegacaoModal2(false);
      setSelectedAgents([]);
      const deleg = await delegacoesApi.list({ acidente_id: acidenteId });
      setDelegacoes(deleg);
    } catch (err) {
      toast.error('Erro ao delegar missões');
    } finally {
      setDelegating(false);
    }
  };

  const handleDesdelegarMissao = async (delegacaoId) => {
    try {
      await delegacoesApi.delete(delegacaoId);
      toast.success('Delegação removida com sucesso');
      const acidenteId = acidente._id || acidente.acidente_id || id;
      const deleg = await delegacoesApi.list({ acidente_id: acidenteId });
      setDelegacoes(deleg);
    } catch (err) {
      toast.error('Erro ao remover delegação');
    }
  };

  const handleAprovarPedido = async (pedido) => {
    try {
      await delegacoesApi.aprovar(pedido._id, {
        delegado_por: user?.id || user?._id || '',
        delegado_por_nome: user?.nome || user?.name || ''
      });
      toast.success(`Pedido de ${pedido.agente_nome || 'agente'} aprovado`);
      const acidenteId = acidente._id || acidente.acidente_id || id;
      const [deleg, pedidos] = await Promise.all([
        delegacoesApi.list({ acidente_id: acidenteId }),
        delegacoesApi.pedidosPendentes()
      ]);
      setDelegacoes(deleg);
      setPedidosPendentes(pedidos.filter(p => p.acidente_id === acidenteId));
    } catch (err) {
      toast.error('Erro ao aprovar pedido');
    }
  };

  const handleRejeitarPedido = async (pedido) => {
    try {
      await delegacoesApi.rejeitar(pedido._id, { motivo: 'Rejeitado pelo administrador' });
      toast.success('Pedido rejeitado');
      const acidenteId = acidente._id || acidente.acidente_id || id;
      const pedidos = await delegacoesApi.pedidosPendentes();
      setPedidosPendentes(pedidos.filter(p => p.acidente_id === acidenteId));
    } catch (err) {
      toast.error('Erro ao rejeitar pedido');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!acidente) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Acidente nÃ£o encontrado</p>
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      REPORTADO: 'bg-yellow-100 text-yellow-800',
      VALIDADO: 'bg-blue-100 text-blue-800',
      EM_ATENDIMENTO: 'bg-orange-100 text-orange-800',
      ENCERRADO: 'bg-green-100 text-green-800'
    };
    return <Badge className={styles[status]}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getGravidadeBadge = (gravidade) => {
    const styles = {
      FATAL: 'bg-red-600 text-white',
      GRAVE: 'bg-orange-500 text-white',
      MODERADO: 'bg-amber-500 text-white',
      LEVE: 'bg-green-600 text-white'
    };
    return <Badge className={styles[gravidade]}>{gravidade}</Badge>;
  };

  const getOrigemLabel = (origem) => {
    const map = {
      MOBILE_CIDADAO: 'Mobile Cidadão',
      MOBILE_AGENTE: 'Mobile Agente',
      WEB_ADMIN: 'Painel Admin',
      WEB_POLICIA: 'Painel Polícia',
      SISTEMA: 'Sistema',
    };
    return map[origem] || origem?.replace(/_/g, ' ') || 'N/A';
  };

  const getUserDisplayName = (value) => {
    if (!value) return 'N/A';
    const normalized = String(value);
    const byId = allUsers.find(u => String(u._id) === normalized || String(u.id) === normalized);
    if (byId) return byId.nome || byId.name || byId.email || normalized;
    return normalized;
  };

  const canEdit = user?.tipo?.toUpperCase() === 'ADMIN' || user?.tipo?.toUpperCase() === 'POLICIA';
  const canCreateBoletim = canEdit;
  const canCreateBoletimNow = acidente?.status === 'EM_ATENDIMENTO' || agentesACaminho.some(a => a.status === 'CHEGOU');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="acidente-detalhes-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Detalhes do Acidente</h1>
              <p className="text-slate-500 text-sm">{acidente.tipo_acidente?.replace(/_/g, ' ')} - {acidente.localizacao || 'Localização não especificada'}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {canEdit && (
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Cancelar' : 'Editar'}
              </Button>
            )}
          </div>
        </div>


        {/* Dialog de Confirmação de Remoção */}
        {canEdit && (
          <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Remoção</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita. Deseja realmente remover este acidente?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDelete}>Remover</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Status & Gravidade */}
        <div className="flex items-center gap-4">
          {getGravidadeBadge(acidente.gravidade)}
          {getStatusBadge(acidente.status)}
          {acidente.confirmado_oficialmente && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Confirmado Oficialmente
            </Badge>
          )}
        </div>

        {/* Pending Agent Mission Requests - TOP PRIORITY */}
        {pedidosPendentes.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 animate-pulse-slow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                Pedidos de Missão ({pedidosPendentes.length})
              </CardTitle>
              <CardDescription className="text-amber-600">Agentes que solicitaram delegação para este acidente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pedidosPendentes.map(pedido => {
                const dist = pedido.distancia_km;
                return (
                  <div key={pedido._id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                      {pedido.agente_nome?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{pedido.agente_nome || 'Agente'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {pedido.agente_telefone && (
                          <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{pedido.agente_telefone}</span>
                        )}
                        {dist != null && <span className="font-semibold text-blue-600">{dist} km</span>}
                        <span>{pedido.created_at ? new Date(pedido.created_at).toLocaleTimeString('pt-AO') : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 h-8" onClick={() => handleAprovarPedido(pedido)}>
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 h-8" onClick={() => handleRejeitarPedido(pedido)}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {editMode ? (
          /* Edit Form */
          <Card>
            <CardHeader>
              <CardTitle>Editar Acidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gravidade</Label>
                  <Select value={editForm.gravidade} onValueChange={(v) => setEditForm({...editForm, gravidade: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVIDADES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({...editForm, descricao: e.target.value})}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.confirmado_oficialmente}
                  onChange={(e) => setEditForm({...editForm, confirmado_oficialmente: e.target.checked})}
                  className="rounded"
                />
                <Label>Confirmado Oficialmente</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* View Mode */
          <>
            {/* Main Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Informações do Acidente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Tipo</p>
                      <p className="font-medium">{acidente.tipo_acidente?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Causa Principal</p>
                      <p className="font-medium">{acidente.causa_principal?.replace(/_/g, ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Nº Vítimas</p>
                      <p className="font-mono text-xl font-bold">{acidente.numero_vitimas}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Nº Veículos</p>
                      <p className="font-mono text-xl font-bold">{acidente.numero_veiculos}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Descrição</p>
                    <p className="text-sm">{acidente.descricao}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localização & Agentes em Tempo Real
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {agentesACaminho.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
                        <Navigation2 className="w-3 h-3 mr-1" />
                        {agentesACaminho.filter(a => a.status === 'A_CAMINHO').length} a caminho
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 w-8 p-0"
                      onClick={() => setMapExpanded(!mapExpanded)}
                      title={mapExpanded ? 'Minimizar mapa' : 'Ampliar mapa'}
                    >
                      {mapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 relative">
                  {/* Expandable Map */}
                  <div 
                    ref={mapContainerRef}
                    className={`rounded-lg overflow-hidden transition-all duration-300 ${
                      mapExpanded ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-20rem)]'
                    }`}
                  />
                  {/* Legend overlay */}
                  {agentesACaminho.length > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 text-[10px] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                        <span className="text-slate-500 font-medium">Acidente</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-blue-600" />
                        <span className="text-slate-500 font-medium">Agente a caminho</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-green-600" />
                        <span className="text-slate-500 font-medium">Agente no local</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Modal de Delegação mantido - Card removido */}
            {canEdit && acidente.status !== 'ENCERRADO' && (
              <Dialog open={delegationModal} onOpenChange={setDelegationModal}>
                <DialogTrigger asChild>
                  <div style={{display: 'none'}} />
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Delegar Missão</DialogTitle>
                    <DialogDescription>Selecione um agente para delegar a missão deste acidente</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder="Pesquisar agente..."
                      value={agenteSearch}
                      onChange={(e) => setAgenteSearch(e.target.value)}
                      className="rounded-xl"
                    />
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {agentesAtivos
                        .filter(a => !agenteSearch || (a.name || '').toLowerCase().includes(agenteSearch.toLowerCase()) || (a.email || '').toLowerCase().includes(agenteSearch.toLowerCase()))
                        .sort((a, b) => {
                          const distA = calcDistance(a.latitude, a.longitude, acidente?.latitude, acidente?.longitude) ?? 9999;
                          const distB = calcDistance(b.latitude, b.longitude, acidente?.latitude, acidente?.longitude) ?? 9999;
                          return distA - distB;
                        })
                        .map(agent => {
                          const dist = calcDistance(agent.latitude, agent.longitude, acidente?.latitude, acidente?.longitude);
                          const hasActive = delegacoes.some(d => d.agente_id === agent._id && ['PENDENTE', 'APROVADA'].includes(d.status));
                          return (
                            <div
                              key={agent._id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                hasActive ? 'bg-green-50 border-green-200 opacity-60' : 
                                selectedAgent?._id === agent._id ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-slate-50 border-slate-200 hover:border-blue-300 cursor-pointer'
                              }`}
                              onClick={() => !hasActive && setSelectedAgent(agent)}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                                agent.latitude ? 'bg-green-500' : 'bg-slate-400'
                              }`}>
                                {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{agent.name}</p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  {agent.telefone && <span><Phone className="w-2.5 h-2.5 inline mr-0.5" />{agent.telefone}</span>}
                                  <span>{agent.role}</span>
                                  {agent.provincia && <span>{agent.provincia}</span>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {hasActive ? (
                                  <Badge className="bg-green-100 text-green-700 text-[10px]">Já delegado</Badge>
                                ) : dist != null ? (
                                  <div>
                                    <p className="text-lg font-bold text-blue-600">{dist}</p>
                                    <p className="text-[10px] text-slate-400">km</p>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-slate-400">Sem GPS</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDelegationModal(false); setSelectedAgent(null); }}>
                      Cancelar
                    </Button>
                    <Button
                      disabled={!selectedAgent || delegating}
                      onClick={() => selectedAgent && handleDelegarMissao(selectedAgent)}
                    >
                      {delegating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <Send className="w-4 h-4 mr-1" />
                      Delegar a {selectedAgent?.name || '...'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Agent Annotations */}
            {anotacoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Anotações de Agentes ({anotacoes.length})
                  </CardTitle>
                  <CardDescription>Notas e fotos registadas por agentes no local</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {anotacoes.map((a, idx) => (
                    <div key={a._id || idx} className="p-3 rounded-xl border bg-slate-50 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {a.agente_nome?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{a.agente_nome || 'Agente'}</span>
                        <span className="text-[11px] text-slate-400 ml-auto">
                          {a.created_at ? new Date(a.created_at).toLocaleString('pt-AO') : ''}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.tipo === 'TEXTO_FOTO' ? 'Texto + Foto' : a.tipo === 'FOTO' ? 'Foto' : 'Texto'}
                        </Badge>
                      </div>
                      {a.texto && <p className="text-sm text-slate-600 pl-9">{a.texto}</p>}
                      {a.fotos?.length > 0 && (
                        <div className="flex gap-2 pl-9 flex-wrap">
                          {a.fotos.map((foto, fi) => (
                            <a key={fi} href={foto} target="_blank" rel="noopener noreferrer">
                              <img src={foto} alt={`Foto ${fi + 1}`} className="w-20 h-16 object-cover rounded-lg border hover:ring-2 ring-blue-300 transition-all" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - Menu Circular */}
      {!editMode && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Overlay quando menu está aberto */}
          {fabOpen && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10" 
              onClick={() => setFabOpen(false)}
            />
          )}
          
          {/* Botões de Ação Empilhados Verticalmente */}
          <div className="relative">
            {/* Cadastrar Boletim */}
            {canCreateBoletim && canCreateBoletimNow && (
              <button
                onClick={() => { 
                  confirmAndExecute({ 
                    title: 'Cadastrar Boletim', 
                    message: 'Será redirecionado para o formulário de cadastro de boletim.',
                    fn: () => { handleCreateBoletim(); setFabOpen(false); }
                  }); 
                }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[420px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-purple-600 hover:bg-purple-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '50ms' : '0ms' }}
                title="Cadastrar Boletim"
              >
                <FileText className="w-5 h-5" />
              </button>
            )}
            
            {/* Validar */}
            {acidente.status === 'REPORTADO' && (
              <button
                onClick={() => { 
                  confirmAndExecute({ 
                    title: 'Validar Acidente', 
                    message: 'Confirma que deseja validar este acidente?',
                    fn: () => { handleQuickStatus('VALIDADO'); setFabOpen(false); }
                  }); 
                }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[350px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '100ms' : '0ms' }}
                title="Validar Acidente"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
            
            {/* Em Atendimento */}
            {['REPORTADO', 'VALIDADO'].includes(acidente.status) && (
              <button
                onClick={() => { 
                  confirmAndExecute({ 
                    title: 'Colocar em Atendimento', 
                    message: 'Confirma que este acidente está sendo atendido?',
                    fn: () => { handleQuickStatus('EM_ATENDIMENTO'); setFabOpen(false); }
                  }); 
                }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[280px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-orange-600 hover:bg-orange-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '150ms' : '0ms' }}
                title="Em Atendimento"
              >
                <Activity className="w-5 h-5" />
              </button>
            )}
            
            {/* Resolver */}
            {acidente.status === 'EM_ATENDIMENTO' && (
              <button
                onClick={() => { 
                  confirmAndExecute({ 
                    title: 'Resolver Acidente', 
                    message: 'Confirma que este acidente foi resolvido?',
                    fn: () => { handleQuickStatus('ENCERRADO'); setFabOpen(false); }
                  }); 
                }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[210px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-green-600 hover:bg-green-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '200ms' : '0ms' }}
                title="Resolver Acidente"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
            
            {/* Cancelar */}
            {acidente.status !== 'ENCERRADO' && acidente.status !== 'CANCELADO' && (
              <button
                onClick={() => { setCancelDialog(true); setFabOpen(false); }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[140px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-yellow-600 hover:bg-yellow-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '250ms' : '0ms' }}
                title="Cancelar Acidente"
              >
                <Ban className="w-5 h-5" />
              </button>
            )}
            
            {/* Remover */}
            {canEdit && (
              <button
                onClick={() => { setDeleteDialog(true); setFabOpen(false); }}
                className={`absolute transition-all duration-300 ease-out ${
                  fabOpen 
                    ? 'bottom-[70px] right-0 opacity-100 scale-100' 
                    : 'bottom-0 right-0 opacity-0 scale-0 pointer-events-none'
                } bg-red-600 hover:bg-red-700 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl`}
                style={{ transitionDelay: fabOpen ? '300ms' : '0ms' }}
                title="Remover Acidente"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            {/* Botão Principal */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className={`relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                fabOpen ? 'rotate-45 scale-110' : 'rotate-0 scale-100'
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <Ban className="w-5 h-5" />
              Cancelar Acidente
            </DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="motivo"
                placeholder="Descreva o motivo do cancelamento (mínimo 10 caracteres)..."
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                {cancelMotivo.length}/10 caracteres mínimos
              </p>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="alertar"
                checked={alertarCidadao}
                onChange={(e) => setAlertarCidadao(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Label htmlFor="alertar" className="flex items-center gap-2 cursor-pointer text-sm">
                <Bell className="w-4 h-4 text-blue-600" />
                Notificar o cidadão que reportou este acidente
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Voltar
            </Button>
            <Button 
              onClick={handleCancelarAcidente}
              disabled={!cancelMotivo || cancelMotivo.trim().length < 10}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancelar Acidente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Genérica */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title || 'Confirmar Ação'}</DialogTitle>
            <DialogDescription>
              {confirmAction?.message || 'Deseja realmente executar esta ação?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={executeConfirmedAction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Flutuante Inferior - Só Ícones */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex gap-3 bg-white rounded-full shadow-2xl p-3 border border-slate-200">
          <button
            onClick={() => setHistoricoModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-110 shadow-lg"
            title="Ver Histórico"
          >
            <History className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setBoletinsModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 hover:scale-110 shadow-lg relative"
            title="Boletins de Ocorrência"
          >
            <FileText className="w-5 h-5" />
            {boletins.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {boletins.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setDelegacaoModal2(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:scale-110 shadow-lg"
            title="Delegação de Missão"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal de Histórico */}
      <Dialog open={historicoModal} onOpenChange={setHistoricoModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico do Acidente
            </DialogTitle>
            <DialogDescription>
              Timeline completa de eventos e alterações
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Informações de Registro */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-xl border border-blue-100 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Informações de Registro
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Criado em</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {acidente.created_at ? new Date(acidente.created_at).toLocaleString('pt-AO') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Última edição</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {acidente.updated_at ? new Date(acidente.updated_at).toLocaleString('pt-AO') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Origem do registo</p>
                  <Badge variant="outline" className="mt-1">{getOrigemLabel(acidente.origem_registro)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Registado por</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {getUserDisplayName(acidente.created_by_nome || acidente.created_by_name || acidente.created_by)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium">Última edição por</p>
                  <p className="text-sm font-semibold text-amber-700">
                    {getUserDisplayName(acidente.updated_by_nome || acidente.updated_by_name || acidente.updated_by) || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              Timeline de Eventos
            </h3>

            {/* Criação */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
              </div>
              <div className="flex-1 pb-6">
                <p className="font-semibold text-slate-900">Acidente Reportado</p>
                <p className="text-sm text-slate-500">
                  {acidente.created_at ? new Date(acidente.created_at).toLocaleString('pt-AO') : 'N/A'}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Por: {getUserDisplayName(acidente.reportado_por_nome || acidente.reportado_por_name || acidente.reportado_por || acidente.created_by_nome || acidente.created_by_name || acidente.created_by)}
                </p>
              </div>
            </div>

            {/* Validação */}
            {acidente.validado_por && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <p className="font-semibold text-slate-900">Acidente Validado</p>
                  <p className="text-sm text-slate-500">
                    {acidente.validado_em ? new Date(acidente.validado_em).toLocaleString('pt-AO') : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Por: {getUserDisplayName(acidente.validado_por)}
                  </p>
                </div>
              </div>
            )}

            {/* Atendimento */}
            {acidente.atendido_por && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <p className="font-semibold text-slate-900">Em Atendimento</p>
                  <p className="text-sm text-slate-500">
                    {acidente.atendido_em ? new Date(acidente.atendido_em).toLocaleString('pt-AO') : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Por: {getUserDisplayName(acidente.atendido_por)}
                  </p>
                </div>
              </div>
            )}

            {/* Resolução */}
            {acidente.resolvido_por && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Acidente Resolvido</p>
                  <p className="text-sm text-slate-500">
                    {acidente.resolvido_em ? new Date(acidente.resolvido_em).toLocaleString('pt-AO') : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Por: {getUserDisplayName(acidente.resolvido_por)}
                  </p>
                </div>
              </div>
            )}

            {/* Status Atual */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Status Atual</p>
                <Badge className="mt-2">{acidente.status?.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoricoModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Boletins */}
      <Dialog open={boletinsModal} onOpenChange={setBoletinsModal}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Boletins de Ocorrência ({boletins.length})
            </DialogTitle>
            <DialogDescription>
              Documentos oficiais relacionados a este acidente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {boletins.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum boletim cadastrado ainda</p>
                {canCreateBoletim && (
                  <Button 
                    size="sm" 
                    onClick={() => { handleCreateBoletim(); setBoletinsModal(false); }}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeiro Boletim
                  </Button>
                )}
              </div>
            ) : (
              boletins.map(b => {
                const modo = b.modo_cadastro || 'WEB_ADMIN';
                const bgColor = modo === 'WEB_ADMIN'
                  ? 'bg-blue-50 border-blue-200'
                  : modo === 'MOBILE_AGENTE'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-purple-50 border-purple-200';
                return (
                  <div
                    key={b._id || b.boletim_id}
                    className={`p-4 rounded-xl border ${bgColor} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/boletins/${b.boletim_id || b._id}`)}>
                        <p className="font-semibold text-slate-900">Boletim #{(b.boletim_id || b._id)?.slice(-6)}</p>
                        <p className="text-xs text-slate-500">
                          {b.created_at ? new Date(b.created_at).toLocaleString('pt-AO') : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{modo.replace(/_/g, ' ')}</Badge>
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleEditBoletim(b); }}
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); setBoletimToDelete(b); setDeleteBoletimDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 cursor-pointer" onClick={() => navigate(`/boletins/${b.boletim_id || b._id}`)}>{b.observacoes || b.descricao || 'Sem descrição'}</p>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            {canCreateBoletim && (
              <Button 
                onClick={() => { handleCreateBoletim(); setBoletinsModal(false); }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Boletim
              </Button>
            )}
            <Button variant="outline" onClick={() => setBoletinsModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Delegação */}
      <Dialog open={delegacaoModal2} onOpenChange={setDelegacaoModal2}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-600" />
              Delegação de Missão
            </DialogTitle>
            <DialogDescription>
              Agentes próximos e delegações ativas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Agentes Próximos */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Navigation2 className="w-4 h-4 text-blue-600" />
                Agentes Próximos
              </h3>
              {agentesAtivos.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Nenhum agente ativo próximo</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {agentesAtivos
                      .map(agent => {
                        const dist = calcDistance(agent.latitude, agent.longitude, acidente?.latitude, acidente?.longitude);
                        const hasActive = delegacoes.some(d => d.agente_id === agent._id && ['PENDENTE', 'APROVADA'].includes(d.status));
                        const isSelected = selectedAgents.includes(agent._id);
                        return (
                          <div
                            key={agent._id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              hasActive ? 'bg-green-50 border-green-200' : 
                              isSelected ? 'bg-blue-50 border-blue-300' :
                              'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {!hasActive && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAgents([...selectedAgents, agent._id]);
                                  } else {
                                    setSelectedAgents(selectedAgents.filter(id => id !== agent._id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300"
                              />
                            )}
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                              {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{agent.name}</p>
                              <p className="text-xs text-slate-500">{dist != null && !isNaN(dist) ? dist.toFixed(2) : '0.00'} km de distância</p>
                            </div>
                            {hasActive && (
                              <Badge className="bg-green-600">Delegado</Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {selectedAgents.length > 0 && (
                    <Button
                      onClick={handleDelegarMultiplos}
                      disabled={delegating}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {delegating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <Send className="w-4 h-4 mr-2" />
                      Delegar a {selectedAgents.length} Agente(s)
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Delegações Ativas */}
            {delegacoes.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Delegações Ativas
                </h3>
                <div className="space-y-2">
                  {delegacoes.map(d => (
                    <div key={d._id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        d.status === 'APROVADA' ? 'bg-green-500' : d.status === 'PENDENTE' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}>
                        {d.agente_nome?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{d.agente_nome}</p>
                        <p className="text-xs text-slate-500">
                          {d.created_at ? new Date(d.created_at).toLocaleString('pt-AO') : 'N/A'}
                        </p>
                      </div>
                      <Badge className={
                        d.status === 'APROVADA' ? 'bg-green-100 text-green-700' :
                        d.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }>
                        {d.status}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDesdelegarMissao(d._id)}
                          title="Remover delegação"
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDelegacaoModal2(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Boletim */}
      <Dialog open={novoBoletimModal} onOpenChange={setNovoBoletimModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              {editingBoletim ? 'Editar Boletim de Ocorrência' : 'Novo Boletim de Ocorrência'}
            </DialogTitle>
            <DialogDescription>
              {editingBoletim ? 'Atualize os dados do boletim' : `Preencha os dados do boletim para o acidente`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Mode Selection - Only for new boletim */}
            {!editingBoletim && (
              <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                <Button
                  type="button"
                  variant={!uploadMode ? "default" : "outline"}
                  onClick={() => setUploadMode(false)}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Preencher Formulário
                </Button>
                <Button
                  type="button"
                  variant={uploadMode ? "default" : "outline"}
                  onClick={() => setUploadMode(true)}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload de PDF
                </Button>
              </div>
            )}

            {/* Número do Processo */}
            <div>
              <Label>Número do Processo (opcional)</Label>
              <Input
                value={boletimForm.numero_processo}
                onChange={(e) => setBoletimForm({ ...boletimForm, numero_processo: e.target.value })}
                placeholder="DNVT-20260320-XXXXXX"
              />
              <p className="text-xs text-slate-500 mt-1">Deixe em branco para gerar automaticamente</p>
            </div>

            {uploadMode ? (
              /* Upload Mode */
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload do Documento</CardTitle>
                  <CardDescription>
                    {editingBoletim 
                      ? 'Envie um novo arquivo para substituir o documento atual' 
                      : 'Envie o boletim digitalizado em PDF'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0])}
                      className="hidden"
                      id="boletim-file-upload"
                    />
                    <label htmlFor="boletim-file-upload" className="cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-sm text-slate-600">
                        {uploadFile ? uploadFile.name : editingBoletim ? 'Clique para selecionar novo arquivo PDF' : 'Clique para selecionar arquivo PDF'}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">Apenas arquivos PDF</p>
                    </label>
                  </div>
                  {editingBoletim && editingBoletim.arquivo_url && !uploadFile && (
                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Arquivo atual mantido. Selecione um novo arquivo para substituir.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Form Mode */
              <>

            {/* Vítimas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Vítimas</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addVitimaBoletim}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {boletimForm.vitimas_info.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhuma vítima adicionada</p>
                ) : (
                  boletimForm.vitimas_info.map((vitima, idx) => (
                    <div key={vitima.id || idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Vítima {idx + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVitimaBoletim(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome completo"
                          value={vitima.nome}
                          onChange={(e) => updateVitimaBoletim(idx, 'nome', e.target.value)}
                        />
                        <Input
                          placeholder="Nº BI"
                          value={vitima.bi}
                          onChange={(e) => updateVitimaBoletim(idx, 'bi', e.target.value)}
                        />
                        <Select 
                          value={vitima.estado} 
                          onValueChange={(v) => updateVitimaBoletim(idx, 'estado', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ILESO">Ileso</SelectItem>
                            <SelectItem value="FERIDO_LEVE">Ferido Leve</SelectItem>
                            <SelectItem value="FERIDO_GRAVE">Ferido Grave</SelectItem>
                            <SelectItem value="FATAL">Fatal</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Telefone"
                          value={vitima.telefone}
                          onChange={(e) => updateVitimaBoletim(idx, 'telefone', e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Veículos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Veículos</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addVeiculoBoletim}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {boletimForm.veiculos_info.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum veículo adicionado</p>
                ) : (
                  boletimForm.veiculos_info.map((veiculo, idx) => (
                    <div key={veiculo.id || idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Veículo {idx + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVeiculoBoletim(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Marca"
                          value={veiculo.marca}
                          onChange={(e) => updateVeiculoBoletim(idx, 'marca', e.target.value)}
                        />
                        <Input
                          placeholder="Modelo"
                          value={veiculo.modelo}
                          onChange={(e) => updateVeiculoBoletim(idx, 'modelo', e.target.value)}
                        />
                        <Input
                          placeholder="Matrícula"
                          value={veiculo.matricula}
                          onChange={(e) => updateVeiculoBoletim(idx, 'matricula', e.target.value)}
                        />
                        <Input
                          placeholder="Cor"
                          value={veiculo.cor}
                          onChange={(e) => updateVeiculoBoletim(idx, 'cor', e.target.value)}
                        />
                        <Input
                          placeholder="Proprietário"
                          value={veiculo.proprietario}
                          onChange={(e) => updateVeiculoBoletim(idx, 'proprietario', e.target.value)}
                          className="col-span-2"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Testemunhas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Testemunhas</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addTestemunhaBoletim}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {boletimForm.testemunhas.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhuma testemunha adicionada</p>
                ) : (
                  boletimForm.testemunhas.map((testemunha, idx) => (
                    <div key={testemunha.id || idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Testemunha {idx + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTestemunhaBoletim(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome completo"
                          value={testemunha.nome}
                          onChange={(e) => updateTestemunhaBoletim(idx, 'nome', e.target.value)}
                        />
                        <Input
                          placeholder="Telefone"
                          value={testemunha.telefone}
                          onChange={(e) => updateTestemunhaBoletim(idx, 'telefone', e.target.value)}
                        />
                        <Input
                          placeholder="Endereço"
                          value={testemunha.endereco}
                          onChange={(e) => updateTestemunhaBoletim(idx, 'endereco', e.target.value)}
                          className="col-span-2"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={boletimForm.observacoes}
                onChange={(e) => setBoletimForm({ ...boletimForm, observacoes: e.target.value })}
                placeholder="Observações adicionais sobre o acidente..."
                rows={4}
              />
            </div>
            </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoBoletimModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmitBoletim} disabled={savingBoletim} className="bg-purple-600 hover:bg-purple-700">
              {savingBoletim && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Save className="w-4 h-4 mr-2" />
              {editingBoletim ? 'Atualizar Boletim' : 'Salvar Boletim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Deleção de Boletim */}
      <Dialog open={deleteBoletimDialog} onOpenChange={setDeleteBoletimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoção de Boletim</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja realmente remover este boletim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBoletimDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteBoletim}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}

