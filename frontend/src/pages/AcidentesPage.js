import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { acidentesApi, assistenciasApi, boletinsApi } from '../services/api';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin,
  Filter,
  Download,
  RefreshCw,
  Car,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  Ambulance,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function AcidentesPage() {
  const navigate = useNavigate();
  const [acidentes, setAcidentes] = useState([]);
  const [allAssistencias, setAllAssistencias] = useState([]);
  const [allBoletins, setAllBoletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGravidade, setFilterGravidade] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');
  const [filterExtra, setFilterExtra] = useState('ativos'); // ativos | all | com_boletim | sem_boletim
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const pollRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null); // { title, desc, color, action }

  const fetchAcidentes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [data, assistData, boletinsData] = await Promise.all([
        acidentesApi.list(),
        assistenciasApi.list().catch(() => []),
        boletinsApi.list().catch(() => [])
      ]);
      setAcidentes(data);
      setAllAssistencias(assistData);
      setAllBoletins(boletinsData);
      setLastRefresh(new Date());
    } catch (error) {
      if (!silent) toast.error('Erro ao carregar acidentes');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcidentes();
  }, [fetchAcidentes]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => fetchAcidentes(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchAcidentes]);

  const handleQuickStatus = async (id, newStatus) => {
    try {
      await acidentesApi.update(id, { status: newStatus });
      toast.success(`Status atualizado para ${newStatus.replace(/_/g, ' ')}`);
      fetchAcidentes(true);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const confirmAndRun = (title, desc, color, action) => {
    setConfirmAction({ title, desc, color, action });
  };
  const runConfirmedAction = async () => {
    if (confirmAction?.action) await confirmAction.action();
    setConfirmAction(null);
  };

  const getId = (a) => a._id || a.acidente_id;

  // Build cross-reference sets
  const acidentesComBoletim = new Set(allBoletins.map(b => b.acidente_id));

  // Stats
  const stats = {
    total: acidentes.length,
    ativos: acidentes.filter(a => ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'].includes(a.status)).length,
    hoje: acidentes.filter(a => {
      const d = new Date(a.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    graves: acidentes.filter(a => a.gravidade === 'GRAVE' || a.gravidade === 'FATAL').length,
    comBoletim: acidentes.filter(a => acidentesComBoletim.has(getId(a))).length,
    semBoletim: acidentes.filter(a => !acidentesComBoletim.has(getId(a))).length,
  };

  const handleDelete = async (id) => {
    try {
      await acidentesApi.delete(id);
      toast.success('Acidente removido');
      fetchAcidentes();
    } catch (error) {
      toast.error('Erro ao remover acidente');
    }
  };

  const filteredAcidentes = acidentes.filter(a => {
    // Text search
    const matchesSearch = !searchTerm || 
      a.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tipo_acidente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getId(a)?.toLowerCase().includes(searchTerm.toLowerCase());
    // Status filter
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    // Gravidade filter
    const matchesGravidade = filterGravidade === 'all' || a.gravidade === filterGravidade;
    // Origem filter
    const matchesOrigem = filterOrigem === 'all' || a.origem_registro === filterOrigem;
    // Extra filter (ativos / boletim)
    let matchesExtra = true;
    const aid = getId(a);
    if (filterExtra === 'ativos') matchesExtra = ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'].includes(a.status);
    else if (filterExtra === 'com_boletim') matchesExtra = acidentesComBoletim.has(aid);
    else if (filterExtra === 'sem_boletim') matchesExtra = !acidentesComBoletim.has(aid);
    
    return matchesSearch && matchesStatus && matchesGravidade && matchesOrigem && matchesExtra;
  });

  const getStatusBadge = (status) => {
    const styles = {
      REPORTADO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      VALIDADO: 'bg-blue-100 text-blue-800 border-blue-200',
      EM_ATENDIMENTO: 'bg-orange-100 text-orange-800 border-orange-200',
      ENCERRADO: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = {
      REPORTADO: 'Reportado',
      VALIDADO: 'Validado',
      EM_ATENDIMENTO: 'Em Atendimento',
      ENCERRADO: 'Encerrado'
    };
    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status] || status}
      </Badge>
    );
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

  // Floating pill menu items — Ativos first as priority
  const PILL_FILTERS = [
    { value: 'ativos', label: 'Ativos', count: stats.ativos },
    { value: 'all', label: 'Todos', count: stats.total },
    { value: 'sem_boletim', label: 'Sem Boletim', count: stats.semBoletim },
    { value: 'com_boletim', label: 'Com Boletim', count: stats.comBoletim },
  ];

  return (
    <Layout>
      {/* Sub-header filter bar — flush below main header */}
      <div className="sticky top-16 z-20 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-4 lg:mb-6">
        <div className="bg-gradient-to-r from-[#0f1c36] via-[#162848] to-[#1a3058] shadow-lg shadow-[#1B2A4A]/10">
          <div className="px-4 lg:px-6">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {PILL_FILTERS.map(f => {
                const active = filterExtra === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilterExtra(f.value)}
                    className={`relative flex items-center gap-2 px-4 lg:px-5 py-3.5 text-[12px] lg:text-[13px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 group ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
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

      <div className="space-y-6" data-testid="acidentes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Acidentes</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestão de registros de acidentes</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            <Link to="/acidentes/novo">
              <Button 
                className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                data-testid="new-accident-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Acidente
              </Button>
            </Link>
            <Button variant="outline" onClick={() => fetchAcidentes()} data-testid="refresh-btn" className="rounded-xl border-slate-200 hover:bg-slate-100 h-11 w-11 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up stagger-1" style={{opacity: 0}}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#1B2A4A]">{stats.total}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-orange-600">{stats.ativos}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ativos</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-600">{stats.hoje}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Hoje</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-red-600">{stats.graves}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Graves/Fatal</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input 
                  placeholder="Buscar por descrição, tipo ou ID..." 
                  className="pl-11 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-36 rounded-xl border-slate-200" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="REPORTADO">Reportado</SelectItem>
                  <SelectItem value="VALIDADO">Validado</SelectItem>
                  <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                  <SelectItem value="ENCERRADO">Encerrado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGravidade} onValueChange={setFilterGravidade}>
                <SelectTrigger className="w-full md:w-36 rounded-xl border-slate-200" data-testid="filter-gravidade">
                  <SelectValue placeholder="Gravidade" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="LEVE">Leve</SelectItem>
                  <SelectItem value="MODERADO">Moderado</SelectItem>
                  <SelectItem value="GRAVE">Grave</SelectItem>
                  <SelectItem value="FATAL">Fatal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                <SelectTrigger className="w-full md:w-36 rounded-xl border-slate-200" data-testid="filter-origem">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="WEB_POLICIA">Polícia</SelectItem>
                  <SelectItem value="MOBILE_CIDADAO">Cidadão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 animate-slide-up stagger-3" style={{opacity: 0}}>

            {/* Table */}
            <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gravidade</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vítimas</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                        </TableCell>
                      </TableRow>
                    ) : filteredAcidentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <Car className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                          <p className="text-slate-400 font-medium">Nenhum acidente encontrado</p>
                          <p className="text-slate-300 text-xs mt-1">Tente ajustar os filtros</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAcidentes.map((acidente) => (
                        <TableRow key={getId(acidente)} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/acidentes/${getId(acidente)}`)}>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {getId(acidente)?.slice(-8)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-slate-700">{acidente.tipo_acidente?.replace(/_/g, ' ')}</span>
                          </TableCell>
                          <TableCell>{getGravidadeBadge(acidente.gravidade)}</TableCell>
                          <TableCell>{getStatusBadge(acidente.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3" />
                              {acidente.latitude?.toFixed(4)}, {acidente.longitude?.toFixed(4)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-slate-700">{acidente.numero_vitimas}</TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(acidente.created_at).toLocaleDateString('pt-AO')}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-lg hover:bg-slate-100" data-testid={`action-menu-${getId(acidente)}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                                <DropdownMenuItem onClick={() => navigate(`/acidentes/${getId(acidente)}`)} className="rounded-lg">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          {/* Summary */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Mostrando {filteredAcidentes.length} de {acidentes.length} acidentes</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Atualizado {lastRefresh.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })} (auto 30s)
            </span>
          </div>
        </div>

        {/* Confirmation Dialog Overlay */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-[#1B2A4A] mb-2">{confirmAction.title}</h3>
              <p className="text-sm text-slate-500 mb-6">{confirmAction.desc}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmAction(null)}>
                  Cancelar
                </Button>
                <Button
                  className={`flex-1 rounded-xl font-semibold text-white ${
                    confirmAction.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                    confirmAction.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    confirmAction.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                    'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  onClick={runConfirmedAction}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
