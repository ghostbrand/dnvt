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
import { acidentesApi, assistenciasApi, boletinsApi, configuracoesApi, utilizadoresApi, delegacoesApi, anotacoesApi } from '../services/api';
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
  Image as ImageIcon
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

  // Delegation state
  const [agentesAtivos, setAgentesAtivos] = useState([]);
  const [delegationModal, setDelegationModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [delegating, setDelegating] = useState(false);
  const [delegacoes, setDelegacoes] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);

  // Annotations
  const [anotacoes, setAnotacoes] = useState([]);

  // Boletim modal
  const [boletimModal, setBoletimModal] = useState(false);
  const [creatingBoletim, setCreatingBoletim] = useState(false);
  const [boletimForm, setBoletimForm] = useState({
    numero_processo: '',
    observacoes: '',
    vitimas_info: [],
    veiculos_info: [],
    testemunhas: []
  });

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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&callback=${cb}`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, [mapApiKey]);

  // Render map when acidente and API ready
  useEffect(() => {
    if (!mapReady || !acidente || !mapContainerRef.current || mapInstanceRef.current) return;
    const pos = { lat: acidente.latitude, lng: acidente.longitude };
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: pos, zoom: 16, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      zoomControl: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    mapInstanceRef.current = map;
    const color = { FATAL: '#DC2626', GRAVE: '#EA580C', MODERADO: '#D97706', LEVE: '#16A34A' }[acidente.gravidade] || '#D97706';
    new window.google.maps.Marker({
      position: pos, map,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 3 },
      title: acidente.tipo_acidente
    });
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

  // Load delegations, annotations, pending requests, and active agents
  useEffect(() => {
    if (!acidente) return;
    const acidenteId = acidente._id || acidente.acidente_id || id;
    const loadExtra = async () => {
      try {
        const [deleg, pedidos, anots, agAtivos] = await Promise.all([
          delegacoesApi.list({ acidente_id: acidenteId }).catch(() => []),
          delegacoesApi.pedidosPendentes().catch(() => []),
          anotacoesApi.list(acidenteId).catch(() => []),
          delegacoesApi.agentesAtivos().catch(() => [])
        ]);
        setDelegacoes(deleg);
        setPedidosPendentes(pedidos.filter(p => p.acidente_id === acidenteId));
        setAnotacoes(anots);
        setAgentesAtivos(agAtivos);
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
      const marker = new window.google.maps.Marker({
        position: { lat: ag.latitude, lng: ag.longitude },
        map,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: isArrived ? '#22C55E' : '#2563EB',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: 0
        },
        title: `${ag.agente_nome || 'Agente'} — ${isArrived ? 'No Local' : 'A Caminho'}`,
        zIndex: 10
      });

      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px"><strong>${ag.agente_nome || 'Agente'}</strong><br/><span style="color:${isArrived ? '#16A34A' : '#2563EB'};font-size:12px">${isArrived ? '✅ Chegou ao local' : '🚗 A caminho'}</span><br/><span style="color:#64748b;font-size:11px">Atualizado: ${new Date(ag.updated_at).toLocaleTimeString('pt-AO')}</span></div>`
      });
      marker.addListener('click', () => info.open(map, marker));

      agentMarkersRef.current.push(marker);
    });
  }, [agentesACaminho, mapReady]);

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
      toast.success('Acidente removido');
      navigate('/acidentes');
    } catch (error) {
      toast.error('Erro ao remover');
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
      toast.success('Assistência enviada');
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
      toast.error('Erro ao criar assistência');
    }
  };

  const handleCreateBoletim = () => {
    setBoletimForm({ numero_processo: '', observacoes: '', vitimas_info: [], veiculos_info: [], testemunhas: [] });
    setBoletimModal(true);
  };

  const handleSubmitBoletim = async () => {
    setCreatingBoletim(true);
    try {
      const payload = { ...boletimForm, acidente_id: id, modo_criacao: 'GERADO_SISTEMA' };
      await boletinsApi.create(payload);
      toast.success('Boletim criado com sucesso');
      setBoletimModal(false);
      const boletinsData = await boletinsApi.list({ acidente_id: id }).catch(() => []);
      setBoletins(boletinsData);
    } catch (err) {
      toast.error('Erro ao criar boletim');
    } finally {
      setCreatingBoletim(false);
    }
  };

  const addVitima = () => setBoletimForm(f => ({ ...f, vitimas_info: [...f.vitimas_info, { nome: '', bi: '', estado: 'FERIDO_LEVE', telefone: '' }] }));
  const removeVitima = (i) => setBoletimForm(f => ({ ...f, vitimas_info: f.vitimas_info.filter((_, idx) => idx !== i) }));
  const updateVitima = (i, field, val) => setBoletimForm(f => { const v = [...f.vitimas_info]; v[i][field] = val; return { ...f, vitimas_info: v }; });
  const addVeiculo = () => setBoletimForm(f => ({ ...f, veiculos_info: [...f.veiculos_info, { marca: '', modelo: '', matricula: '', cor: '', condutor: '' }] }));
  const removeVeiculo = (i) => setBoletimForm(f => ({ ...f, veiculos_info: f.veiculos_info.filter((_, idx) => idx !== i) }));
  const updateVeiculo = (i, field, val) => setBoletimForm(f => { const v = [...f.veiculos_info]; v[i][field] = val; return { ...f, veiculos_info: v }; });
  const addTestemunha = () => setBoletimForm(f => ({ ...f, testemunhas: [...f.testemunhas, { nome: '', bi: '', telefone: '', endereco: '' }] }));
  const removeTestemunha = (i) => setBoletimForm(f => ({ ...f, testemunhas: f.testemunhas.filter((_, idx) => idx !== i) }));
  const updateTestemunha = (i, field, val) => setBoletimForm(f => { const v = [...f.testemunhas]; v[i][field] = val; return { ...f, testemunhas: v }; });

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
          <p className="text-slate-500">Acidente não encontrado</p>
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

  const canEdit = user?.tipo === 'ADMIN' || user?.tipo === 'POLICIA';

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
              <p className="text-slate-500 text-sm font-mono">{acidente.acidente_id || acidente._id}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Cancelar' : 'Editar'}
              </Button>
              <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </DialogTrigger>
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
            </div>
          )}
        </div>

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

        {/* Quick Action Buttons */}
        {canEdit && !editMode && (
          <div className="flex flex-wrap items-center gap-2">
            {acidente.status === 'REPORTADO' && (
              <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => handleQuickStatus('VALIDADO')}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Validar
              </Button>
            )}
            {['REPORTADO', 'VALIDADO'].includes(acidente.status) && (
              <Button size="sm" className="rounded-xl bg-orange-500 hover:bg-orange-600" onClick={() => handleQuickStatus('EM_ATENDIMENTO')}>
                <Activity className="w-4 h-4 mr-1" />
                Em Atendimento
              </Button>
            )}
            {acidente.status === 'EM_ATENDIMENTO' && (
              <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700" onClick={() => handleQuickStatus('ENCERRADO')}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Encerrar
              </Button>
            )}
          </div>
        )}

        {/* Pending Agent Mission Requests — TOP PRIORITY */}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Informações do Acidente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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

              <Card className={mapExpanded ? 'col-span-full' : ''}>
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
                <CardContent className="space-y-4">
                  {/* Expandable Map */}
                  <div className={`relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 transition-all duration-300 ${mapExpanded ? 'h-[500px]' : 'h-56'}`}>
                    <div ref={mapContainerRef} className="w-full h-full" />
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
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Coordenadas</p>
                      <p className="font-mono text-sm text-slate-600">{acidente.latitude?.toFixed(6)}, {acidente.longitude?.toFixed(6)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs" asChild>
                      <a 
                        href={`https://www.google.com/maps?q=${acidente.latitude},${acidente.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Abrir no Maps
                      </a>
                    </Button>
                  </div>
                  {acidente.endereco && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Endereço</p>
                      <p className="text-sm text-slate-600">{acidente.endereco}</p>
                    </div>
                  )}

                  {/* Agents en route panel */}
                  {agentesACaminho.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Navigation2 className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Agentes a Caminho</p>
                          <p className="text-[10px] text-slate-400">Posições em tempo real • atualiza a cada 5s</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                          <span className="text-[10px] text-green-600 font-semibold">LIVE</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {agentesACaminho.map((ag, idx) => {
                          const isArrived = ag.status === 'CHEGOU';
                          return (
                            <div
                              key={ag.agente_id || idx}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isArrived
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                isArrived ? 'bg-green-500' : 'bg-blue-500'
                              }`}>
                                {ag.agente_nome?.charAt(0)?.toUpperCase() || 'A'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {ag.agente_nome || 'Agente'}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                                  {ag.agente_telefone && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="w-2.5 h-2.5" />
                                      {ag.agente_telefone}
                                    </span>
                                  )}
                                  <span className="font-mono">
                                    {ag.latitude?.toFixed(4)}, {ag.longitude?.toFixed(4)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <Badge variant="outline" className={
                                  isArrived
                                    ? 'bg-green-100 text-green-700 border-green-300 text-[10px]'
                                    : 'bg-blue-100 text-blue-700 border-blue-300 text-[10px] animate-pulse'
                                }>
                                  {isArrived ? '✅ No Local' : '🚗 A Caminho'}
                                </Badge>
                                <p className="text-[9px] text-slate-400 mt-1">
                                  {ag.updated_at ? new Date(ag.updated_at).toLocaleTimeString('pt-AO') : '—'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Histórico / Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Registro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Criado em</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(acidente.created_at).toLocaleString('pt-AO')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Última edição</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(acidente.updated_at).toLocaleString('pt-AO')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Origem do registo</p>
                    <Badge variant="outline">{acidente.origem_registro?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Registado por</p>
                    <p className="text-sm font-semibold text-blue-700">{acidente.created_by || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">Última edição por</p>
                    <p className="text-sm font-semibold text-amber-700">{acidente.updated_by || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boletins de Ocorrência */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Boletins de Ocorrência ({boletins.length})
                  </CardTitle>
                  <CardDescription>Documentos oficiais do acidente</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={handleCreateBoletim}>
                    <Plus className="w-4 h-4 mr-1" />
                    Novo Boletim
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {boletins.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Nenhum boletim elaborado para este acidente</p>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={handleCreateBoletim}>
                        <Plus className="w-4 h-4 mr-1" />
                        Criar Boletim
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boletins.map(b => {
                      const modo = b.modo_criacao || b.modo_preenchimento || 'GERADO_SISTEMA';
                      const modoLabel = {
                        'GERADO_SISTEMA': 'Gerado no Sistema',
                        'UPLOAD_MANUAL': 'Upload Manual',
                        'MOBILE_AGENTE': 'Agente Mobile',
                        'AUTOMATICO': 'Automático',
                      }[modo] || modo.replace(/_/g, ' ');
                      const modoClass = modo === 'UPLOAD_MANUAL'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : modo === 'MOBILE_AGENTE'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';
                      return (
                        <Link
                          key={b._id || b.boletim_id}
                          to={`/boletins/${b.boletim_id || b._id}`}
                          className="block p-4 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <p className="font-semibold text-sm text-slate-700 group-hover:text-blue-700">
                                {b.numero_processo || `BOL-${(b.boletim_id || b._id)?.slice(-6)}`}
                              </p>
                            </div>
                            <Badge variant="outline" className={modoClass}>
                              {modoLabel}
                            </Badge>
                          </div>
                          {b.observacoes && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 ml-6">{b.observacoes}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 ml-6">
                            <span className="text-[11px] text-slate-400">
                              {b.created_at ? new Date(b.created_at).toLocaleString('pt-AO') : '—'}
                            </span>
                            {b.created_by && (
                              <span className="text-[11px] text-slate-400">por {b.created_by}</span>
                            )}
                            {b.vitimas_info?.length > 0 && (
                              <span className="text-[11px] text-slate-400">{b.vitimas_info.length} vítima(s)</span>
                            )}
                            {b.veiculos_info?.length > 0 && (
                              <span className="text-[11px] text-slate-400">{b.veiculos_info.length} veículo(s)</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mission Delegation Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Delegação de Missão ({delegacoes.length})
                  </CardTitle>
                  <CardDescription>Delegar agentes para este acidente</CardDescription>
                </div>
                {canEdit && acidente.status !== 'ENCERRADO' && (
                  <Dialog open={delegationModal} onOpenChange={setDelegationModal}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl">
                        <Send className="w-4 h-4 mr-1" />
                        Delegar Missão
                      </Button>
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
              </CardHeader>
              <CardContent>
                {delegacoes.length === 0 ? (
                  <div className="text-center py-6">
                    <Send className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Nenhuma delegação para este acidente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {delegacoes.map(d => {
                      const statusColors = {
                        PENDENTE: 'bg-amber-100 text-amber-700',
                        APROVADA: 'bg-green-100 text-green-700',
                        REJEITADA: 'bg-red-100 text-red-700',
                        CONCLUIDA: 'bg-blue-100 text-blue-700',
                        CANCELADA: 'bg-slate-100 text-slate-600'
                      };
                      return (
                        <div key={d._id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            d.status === 'APROVADA' ? 'bg-green-500' : d.status === 'PENDENTE' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}>
                            {d.agente_nome?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{d.agente_nome || 'Agente'}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>{d.tipo === 'DELEGACAO_ADMIN' ? 'Delegado pelo admin' : 'Solicitado pelo agente'}</span>
                              {d.distancia_km != null && <span className="text-blue-600 font-semibold">{d.distancia_km} km</span>}
                            </div>
                          </div>
                          <Badge className={statusColors[d.status] || 'bg-slate-100 text-slate-600'}>
                            {d.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

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

      {/* Boletim Creation Modal */}
      <Dialog open={boletimModal} onOpenChange={setBoletimModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Novo Boletim de Ocorrência
            </DialogTitle>
            <DialogDescription>
              Acidente: {acidente?.tipo_acidente?.replace(/_/g, ' ')} — {acidente?.gravidade}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Número do Processo */}
            <div>
              <Label>Número do Processo (opcional)</Label>
              <Input
                placeholder="DNVT-20260306-XXXXXX"
                value={boletimForm.numero_processo}
                onChange={(e) => setBoletimForm(f => ({ ...f, numero_processo: e.target.value }))}
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400 mt-1">Deixe em branco para gerar automaticamente</p>
            </div>

            {/* Vítimas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Vítimas ({boletimForm.vitimas_info.length})</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={addVitima}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {boletimForm.vitimas_info.length === 0 && (
                <p className="text-xs text-slate-400 italic">Nenhuma vítima adicionada</p>
              )}
              {boletimForm.vitimas_info.map((v, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border mb-2 relative">
                  <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeVitima(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Input placeholder="Nome" value={v.nome} onChange={(e) => updateVitima(i, 'nome', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="BI / Nº Identidade" value={v.bi} onChange={(e) => updateVitima(i, 'bi', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Telefone" value={v.telefone} onChange={(e) => updateVitima(i, 'telefone', e.target.value)} className="text-xs h-8" />
                  <Select value={v.estado} onValueChange={(val) => updateVitima(i, 'estado', val)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FERIDO_LEVE">Ferido Leve</SelectItem>
                      <SelectItem value="FERIDO_GRAVE">Ferido Grave</SelectItem>
                      <SelectItem value="FATAL">Fatal</SelectItem>
                      <SelectItem value="ILESO">Ileso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Separator />

            {/* Veículos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Veículos ({boletimForm.veiculos_info.length})</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={addVeiculo}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {boletimForm.veiculos_info.length === 0 && (
                <p className="text-xs text-slate-400 italic">Nenhum veículo adicionado</p>
              )}
              {boletimForm.veiculos_info.map((v, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border mb-2 relative">
                  <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeVeiculo(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Input placeholder="Marca" value={v.marca} onChange={(e) => updateVeiculo(i, 'marca', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Modelo" value={v.modelo} onChange={(e) => updateVeiculo(i, 'modelo', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Matrícula" value={v.matricula} onChange={(e) => updateVeiculo(i, 'matricula', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Cor" value={v.cor} onChange={(e) => updateVeiculo(i, 'cor', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Condutor" value={v.condutor} onChange={(e) => updateVeiculo(i, 'condutor', e.target.value)} className="text-xs h-8 col-span-2" />
                </div>
              ))}
            </div>

            <Separator />

            {/* Testemunhas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Testemunhas ({boletimForm.testemunhas.length})</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={addTestemunha}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {boletimForm.testemunhas.length === 0 && (
                <p className="text-xs text-slate-400 italic">Nenhuma testemunha adicionada</p>
              )}
              {boletimForm.testemunhas.map((t, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border mb-2 relative">
                  <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeTestemunha(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Input placeholder="Nome" value={t.nome} onChange={(e) => updateTestemunha(i, 'nome', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="BI / Nº Identidade" value={t.bi} onChange={(e) => updateTestemunha(i, 'bi', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Telefone" value={t.telefone} onChange={(e) => updateTestemunha(i, 'telefone', e.target.value)} className="text-xs h-8" />
                  <Input placeholder="Endereço" value={t.endereco} onChange={(e) => updateTestemunha(i, 'endereco', e.target.value)} className="text-xs h-8" />
                </div>
              ))}
            </div>

            <Separator />

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={boletimForm.observacoes}
                onChange={(e) => setBoletimForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBoletimModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmitBoletim} disabled={creatingBoletim}>
              {creatingBoletim && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <FileText className="w-4 h-4 mr-1" />
              Criar Boletim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
