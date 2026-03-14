import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { assistenciasApi, acidentesApi, utilizadoresApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Ambulance, 
  Shield,
  Flame,
  MapPin, 
  RefreshCw,
  Clock,
  CheckCircle,
  Plus,
  Navigation,
  Filter,
  Calendar,
  Search,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

export default function AssistenciasPage() {
  const { user } = useAuth();
  const [assistencias, setAssistencias] = useState([]);
  const [acidentes, setAcidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssist, setNewAssist] = useState({ acidente_id: '', tipo: 'AMBULANCIA', agente_id: '' });
  const [agentes, setAgentes] = useState([]);
  const [agenteSearch, setAgenteSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assistData, acidentesData, usersData] = await Promise.all([
        assistenciasApi.list(),
        acidentesApi.listAtivos(),
        utilizadoresApi.list().catch(() => [])
      ]);
      setAssistencias(assistData);
      setAcidentes(acidentesData);
      setAgentes(usersData.filter(u => ['policia', 'admin'].includes(u.role) && u.status === 'ativo'));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const createAssistencia = async () => {
    if (!newAssist.acidente_id) {
      toast.error('Selecione um acidente');
      return;
    }
    
    try {
      const payload = { ...newAssist };
      if (payload.agente_id) {
        const ag = agentes.find(a => a._id === payload.agente_id);
        if (ag) payload.agente_nome = ag.name;
      }
      await assistenciasApi.create(payload);
      toast.success('Assistência criada');
      setDialogOpen(false);
      setNewAssist({ acidente_id: '', tipo: 'AMBULANCIA', agente_id: '' });
      setAgenteSearch('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar assistência');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await assistenciasApi.update(id, { status });
      toast.success('Status atualizado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'AMBULANCIA': return <Ambulance className="w-5 h-5 text-blue-600" />;
      case 'POLICIA': return <Shield className="w-5 h-5 text-slate-700" />;
      case 'BOMBEIRO': return <Flame className="w-5 h-5 text-red-600" />;
      default: return <Ambulance className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      A_CAMINHO: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse',
      NO_LOCAL: 'bg-blue-100 text-blue-800 border-blue-200',
      FINALIZADO: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = {
      A_CAMINHO: 'A Caminho',
      NO_LOCAL: 'No Local',
      FINALIZADO: 'Finalizado'
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  // Apply filters
  const filtered = assistencias.filter(a => {
    if (filterTipo !== 'all' && a.tipo !== filterTipo) return false;
    if (dateFrom) {
      const d = new Date(a.hora_inicio || a.created_at);
      if (d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = new Date(a.hora_inicio || a.created_at);
      const end = new Date(dateTo); end.setDate(end.getDate() + 1);
      if (d >= end) return false;
    }
    return true;
  });
  const ativas = filtered.filter(a => a.status !== 'FINALIZADO');
  const finalizadas = filtered.filter(a => a.status === 'FINALIZADO');

  // Stats for sidebar
  const countByTipo = {
    AMBULANCIA: assistencias.filter(a => a.tipo === 'AMBULANCIA').length,
    POLICIA: assistencias.filter(a => a.tipo === 'POLICIA').length,
    BOMBEIRO: assistencias.filter(a => a.tipo === 'BOMBEIRO').length,
  };

  const SIDEBAR_ITEMS = [
    { value: 'all', label: 'Todas', icon: Navigation, count: assistencias.length, color: 'text-slate-600', bg: 'bg-slate-100' },
    { value: 'AMBULANCIA', label: 'Ambulância', icon: Ambulance, count: countByTipo.AMBULANCIA, color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'POLICIA', label: 'Polícia', icon: Shield, count: countByTipo.POLICIA, color: 'text-slate-700', bg: 'bg-slate-100' },
    { value: 'BOMBEIRO', label: 'Bombeiros', icon: Flame, count: countByTipo.BOMBEIRO, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <Layout>
      {/* Sub-header filter bar — flush below main header */}
      <div className="sticky top-16 z-20 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-4 lg:mb-6">
        <div className="bg-gradient-to-r from-[#0f1c36] via-[#162848] to-[#1a3058] shadow-lg shadow-[#1B2A4A]/10">
          <div className="px-4 lg:px-6">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {SIDEBAR_ITEMS.map(f => {
                const active = filterTipo === f.value;
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilterTipo(f.value)}
                    className={`relative flex items-center gap-2 px-4 lg:px-5 py-3.5 text-[12px] lg:text-[13px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 group ${
                      active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${active ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{f.label}</span>
                    <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                      active ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-400 group-hover:bg-white/12 group-hover:text-slate-300'
                    }`}>
                      {f.count}
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

      <div className="space-y-6" data-testid="assistencias-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Assistências</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestão de equipas de socorro</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                  data-testid="new-assist-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Assistência
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[#1B2A4A]">Criar Nova Assistência</DialogTitle>
                  <DialogDescription>Envie uma equipa de socorro para um acidente</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acidente</Label>
                    <Select 
                      value={newAssist.acidente_id} 
                      onValueChange={(v) => setNewAssist({ ...newAssist, acidente_id: v })}
                    >
                      <SelectTrigger data-testid="select-acidente" className="rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecione um acidente" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {acidentes.map(a => (
                          <SelectItem key={a.acidente_id} value={a.acidente_id}>
                            {a.tipo_acidente?.replace(/_/g, ' ')} - {a.gravidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Assistência</Label>
                    <Select 
                      value={newAssist.tipo} 
                      onValueChange={(v) => setNewAssist({ ...newAssist, tipo: v })}
                    >
                      <SelectTrigger data-testid="select-tipo" className="rounded-xl border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="AMBULANCIA">Ambulância</SelectItem>
                        <SelectItem value="POLICIA">Polícia</SelectItem>
                        <SelectItem value="BOMBEIRO">Bombeiros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agente Responsável (opcional)</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                      <Input
                        placeholder="Pesquisar agente por nome..."
                        value={agenteSearch}
                        onChange={e => setAgenteSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        !newAssist.agente_id ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}>
                        <input type="radio" name="agente" checked={!newAssist.agente_id} onChange={() => setNewAssist({...newAssist, agente_id: ''})} className="accent-blue-600" />
                        <span className="text-xs font-medium text-slate-500">Sem agente atribuído</span>
                      </label>
                      {agentes
                        .filter(a => !agenteSearch || a.name?.toLowerCase().includes(agenteSearch.toLowerCase()))
                        .slice(0, 10)
                        .map(ag => (
                          <label key={ag._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            newAssist.agente_id === ag._id ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                          }`}>
                            <input type="radio" name="agente" checked={newAssist.agente_id === ag._id} onChange={() => setNewAssist({...newAssist, agente_id: ag._id})} className="accent-blue-600" />
                            <User className="w-3 h-3 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-slate-700 block truncate">{ag.name}</span>
                              <span className="text-[10px] text-slate-400">{ag.role === 'admin' ? 'Admin' : 'Polícia'}</span>
                            </div>
                          </label>
                        ))
                      }
                    </div>
                  </div>
                  <Button 
                    onClick={createAssistencia} 
                    className="w-full h-11 rounded-xl font-semibold" 
                    style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                    data-testid="confirm-assist-btn"
                  >
                    Enviar Assistência
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={fetchData} className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center gap-3 animate-slide-up stagger-2" style={{opacity: 0}}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Label className="text-xs font-semibold text-slate-500">De</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-slate-500">Até</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9 w-40" />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-red-500 rounded-xl" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Limpar
            </Button>
          )}
        </div>

        {/* Active Assistances */}
        <div className="animate-slide-up stagger-3" style={{opacity: 0}}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#1B2A4A]">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-amber-600" />
            </div>
            Assistências Ativas
            <span className="text-sm font-normal text-slate-400 ml-1">({ativas.length})</span>
          </h2>
          
          {ativas.length === 0 ? (
            <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl">
              <CardContent className="py-12 text-center text-slate-300">
                <Ambulance className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma assistência ativa</p>
                <p className="text-xs text-slate-300 mt-1">As equipas de socorro aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ativas.map((assist, idx) => (
                <Card key={assist.assistencia_id} className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden card-interactive animate-slide-up" style={{ animationDelay: `${0.1 + idx * 0.05}s`, opacity: 0 }}>
                  <div className={`h-1 ${assist.status === 'A_CAMINHO' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          assist.tipo === 'AMBULANCIA' ? 'bg-blue-100' : 
                          assist.tipo === 'POLICIA' ? 'bg-slate-100' : 'bg-red-100'
                        }`}>
                          {getTipoIcon(assist.tipo)}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-slate-800">{assist.tipo}</span>
                          <p className="text-[11px] text-slate-400">ID: {assist.assistencia_id?.slice(-6)}</p>
                        </div>
                      </div>
                      {getStatusBadge(assist.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {assist.agente_nome && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{assist.agente_nome}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {assist.latitude_atual?.toFixed(4)}, {assist.longitude_atual?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">Início: {new Date(assist.hora_inicio).toLocaleTimeString('pt-AO')}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      {assist.status === 'A_CAMINHO' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold text-xs"
                          onClick={() => updateStatus(assist.assistencia_id, 'NO_LOCAL')}
                        >
                          Chegou no Local
                        </Button>
                      )}
                      {assist.status === 'NO_LOCAL' && (
                        <Button 
                          size="sm" 
                          className="flex-1 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => updateStatus(assist.assistencia_id, 'FINALIZADO')}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Assistances */}
        {finalizadas.length > 0 && (
          <div className="animate-slide-up stagger-4" style={{opacity: 0}}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#1B2A4A]">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              Finalizadas
              <span className="text-sm font-normal text-slate-400 ml-1">({finalizadas.length})</span>
            </h2>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {finalizadas.slice(0, 12).map((assist, idx) => (
                <Card key={assist.assistencia_id} className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${0.2 + idx * 0.04}s`, opacity: 0 }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          assist.tipo === 'AMBULANCIA' ? 'bg-blue-50' : 
                          assist.tipo === 'POLICIA' ? 'bg-slate-50' : 'bg-red-50'
                        }`}>
                          {getTipoIcon(assist.tipo)}
                        </div>
                        <span className="text-sm font-medium text-slate-600">{assist.tipo}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {assist.hora_fim ? new Date(assist.hora_fim).toLocaleTimeString('pt-AO') : '--'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
