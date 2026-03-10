import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { utilizadoresApi } from '../services/api';
import {
  Plus, Search, RefreshCw, Users, Shield, UserCheck, UserX,
  Phone, Mail, CreditCard, Key, AlertCircle, CheckCircle,
  Loader2, MoreHorizontal, Copy, Eye, EyeOff, MapPin,
  ChevronLeft, ChevronRight, Clock, ShieldCheck, ShieldOff
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ITEMS_PER_PAGE = 10;

const SIDE_MENUS = [
  { key: 'all', label: 'Todos', icon: Users, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'admin', label: 'Admins', icon: Shield, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'policia', label: 'Polícias', icon: ShieldCheck, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'ativo', label: 'Ativos', icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { key: 'pendente', label: 'Pendentes', icon: Clock, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'suspenso', label: 'Suspensos', icon: ShieldOff, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

export default function UtilizadoresPage() {
  const { user, token } = useAuth();
  const [utilizadores, setUtilizadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [showSenha, setShowSenha] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [page, setPage] = useState(1);
  const [zonasDisponiveis, setZonasDisponiveis] = useState([]);

  const [formData, setFormData] = useState({
    name: '', email: '', telefone: '', bilhete_identidade: '',
    endereco: '', role: 'policia', nivel_acesso: 'basico',
    privilegios: {
      gestao_acidentes: true, gestao_boletins: true, gestao_zonas: false,
      gestao_assistencias: true, gestao_utilizadores: false, ver_estatisticas: true,
      configuracoes: false, exportar_dados: true
    },
    alertas_novos_acidentes: true,
    alertas_sonoros: true,
    alertas_sms: false,
    zonas_notificacao: []
  });

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  useEffect(() => { fetchUtilizadores(); fetchZonas(); }, []);

  const fetchUtilizadores = async () => {
    setLoading(true);
    try {
      const data = await utilizadoresApi.list();
      setUtilizadores(data);
    } catch (err) {
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchZonas = async () => {
    try {
      const res = await fetch(`${API}/zonas-criticas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const zonas = await res.json();
        setZonasDisponiveis(zonas.filter(z => z.nivel_risco === 'ALTO'));
      }
    } catch (err) { /* silent */ }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.telefone) {
      toast.error('Nome, email e telefone são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const result = await utilizadoresApi.create(formData);
      setSenhaGerada(result.senha_gerada);
      toast.success(`Utilizador ${result.name} criado com sucesso!`);
      fetchUtilizadores();
    } catch (err) {
      toast.error(err.message || 'Erro ao criar utilizador');
    } finally {
      setSaving(false);
    }
  };

  const handleAprovar = async (id) => {
    try {
      await utilizadoresApi.aprovar(id);
      toast.success('Utilizador aprovado! SMS de notificação enviado.');
      fetchUtilizadores();
    } catch (err) {
      toast.error('Erro ao aprovar utilizador');
    }
  };

  const handleResetSenha = async (id) => {
    try {
      const result = await utilizadoresApi.resetSenha(id);
      setResetResult(result);
      setResetDialogOpen(true);
      toast.success('Senha redefinida! SMS enviado ao utilizador.');
    } catch (err) {
      toast.error('Erro ao redefinir senha');
    }
  };

  const handleSuspender = async (id) => {
    try {
      await utilizadoresApi.suspender(id);
      toast.success('Utilizador suspenso');
      fetchUtilizadores();
    } catch (err) {
      toast.error('Erro ao suspender utilizador');
    }
  };

  const closeAndReset = () => {
    setDialogOpen(false);
    setSenhaGerada(null);
    setShowSenha(false);
    setFormData({
      name: '', email: '', telefone: '', bilhete_identidade: '',
      endereco: '', role: 'policia', nivel_acesso: 'basico',
      privilegios: {
        gestao_acidentes: true, gestao_boletins: true, gestao_zonas: false,
        gestao_assistencias: true, gestao_utilizadores: false, ver_estatisticas: true,
        configuracoes: false, exportar_dados: true
      },
      alertas_novos_acidentes: true,
      alertas_sonoros: true,
      alertas_sms: false,
      zonas_notificacao: []
    });
  };

  const handleRoleChange = (role) => {
    const presets = {
      admin: { nivel_acesso: 'total', privilegios: { gestao_acidentes: true, gestao_boletins: true, gestao_zonas: true, gestao_assistencias: true, gestao_utilizadores: true, ver_estatisticas: true, configuracoes: true, exportar_dados: true } },
      policia: { nivel_acesso: 'basico', privilegios: { gestao_acidentes: true, gestao_boletins: true, gestao_zonas: false, gestao_assistencias: true, gestao_utilizadores: false, ver_estatisticas: true, configuracoes: false, exportar_dados: true } },
      cidadao: { nivel_acesso: 'leitura', privilegios: { gestao_acidentes: false, gestao_boletins: false, gestao_zonas: false, gestao_assistencias: false, gestao_utilizadores: false, ver_estatisticas: false, configuracoes: false, exportar_dados: false } }
    };
    const preset = presets[role] || presets.policia;
    const alertDefaults = role === 'cidadao'
      ? { alertas_novos_acidentes: false, alertas_sonoros: false, alertas_sms: false }
      : { alertas_novos_acidentes: true, alertas_sonoros: true, alertas_sms: false };
    setFormData({ ...formData, role, ...preset, ...alertDefaults });
  };

  // Exclude cidadão from main listing — they have their own page
  const nonCidadaos = utilizadores.filter(u => u.role !== 'cidadao');

  const filteredUsers = nonCidadaos.filter(u => {
    const matchSearch = !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.bilhete_identidade?.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilter === 'all') return matchSearch;
    if (activeFilter === 'admin') return matchSearch && u.role === 'admin';
    if (activeFilter === 'policia') return matchSearch && u.role === 'policia';
    if (activeFilter === 'ativo') return matchSearch && u.status === 'ativo';
    if (activeFilter === 'pendente') return matchSearch && u.status === 'pendente';
    if (activeFilter === 'suspenso') return matchSearch && u.status === 'suspenso';
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchTerm, activeFilter]);

  const pendentes = nonCidadaos.filter(u => u.status === 'pendente');

  const counts = {
    all: nonCidadaos.length,
    admin: nonCidadaos.filter(u => u.role === 'admin').length,
    policia: nonCidadaos.filter(u => u.role === 'policia').length,
    ativo: nonCidadaos.filter(u => u.status === 'ativo').length,
    pendente: nonCidadaos.filter(u => u.status === 'pendente').length,
    suspenso: nonCidadaos.filter(u => u.status === 'suspenso').length,
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      policia: 'bg-blue-100 text-blue-700 border-blue-200',
      cidadao: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    const labels = { admin: 'Admin', policia: 'Polícia', cidadao: 'Cidadão' };
    return <Badge variant="outline" className={`text-[10px] font-bold uppercase ${styles[role] || ''}`}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      ativo: 'bg-emerald-100 text-emerald-700',
      pendente: 'bg-amber-100 text-amber-700',
      suspenso: 'bg-red-100 text-red-700',
      inativo: 'bg-slate-100 text-slate-500'
    };
    return <Badge className={`text-[10px] ${styles[status] || ''}`}>{status}</Badge>;
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96" data-testid="utilizadores-page">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem gerir utilizadores</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TooltipProvider>
        <div className="flex gap-0" data-testid="utilizadores-page">
          {/* ===== Main content ===== */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up">
              <div>
                <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Utilizadores</h1>
                <p className="text-slate-400 text-sm mt-0.5">Gestão de contas e permissões do sistema</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeAndReset(); else setDialogOpen(true); }}>
                <DialogTrigger asChild>
                  <Button
                    className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Utilizador
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  {senhaGerada ? (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#1B2A4A]">Utilizador Criado!</DialogTitle>
                        <DialogDescription>Guarde a senha gerada. Ela será enviada por email ao utilizador.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm font-bold text-emerald-700">Senha Gerada Automaticamente</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white rounded-lg px-3 py-2 text-sm font-mono border border-emerald-200">
                              {showSenha ? senhaGerada : '••••••••••'}
                            </code>
                            <Button variant="outline" size="sm" onClick={() => setShowSenha(!showSenha)} className="rounded-lg">
                              {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(senhaGerada); toast.success('Senha copiada!'); }} className="rounded-lg">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-emerald-600 mt-2">Esta senha será enviada ao email institucional do utilizador.</p>
                        </div>
                        <Button onClick={closeAndReset} className="w-full rounded-xl" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                          Fechar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#1B2A4A]">Cadastrar Novo Utilizador</DialogTitle>
                        <DialogDescription>A senha será gerada automaticamente e enviada por email.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Completo *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nome completo" className="rounded-xl border-slate-200" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email *</Label>
                            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.ao" className="rounded-xl border-slate-200" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone *</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <Input value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="923 456 789" className="pl-10 rounded-xl border-slate-200" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bilhete de Identidade</Label>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <Input value={formData.bilhete_identidade} onChange={(e) => setFormData({...formData, bilhete_identidade: e.target.value.toUpperCase()})} placeholder="123456789LA123" className="pl-10 font-mono rounded-xl border-slate-200" maxLength={14} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço</Label>
                          <Input value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} placeholder="Endereço completo" className="rounded-xl border-slate-200" />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Utilizador</Label>
                            <Select value={formData.role} onValueChange={handleRoleChange}>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="policia">Polícia</SelectItem>
                                <SelectItem value="cidadao">Cidadão</SelectItem>
                              </SelectContent>
                            </Select>
                            {formData.role === 'cidadao' && (
                              <p className="text-[10px] text-amber-600 font-medium">O cidadão ficará pendente até aprovação e só terá acesso mobile.</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível de Acesso</Label>
                            <Select value={formData.nivel_acesso} onValueChange={(v) => setFormData({...formData, nivel_acesso: v})}>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="total">Total</SelectItem>
                                <SelectItem value="avancado">Avançado</SelectItem>
                                <SelectItem value="basico">Básico</SelectItem>
                                <SelectItem value="leitura">Somente Leitura</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Notification Preferences */}
                        <div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Configurações de Alertas</Label>
                          <div className="space-y-2">
                            {[
                              { key: 'alertas_novos_acidentes', label: 'Alertas de Novos Acidentes', desc: 'Notificação quando houver novos acidentes' },
                              { key: 'alertas_sonoros', label: 'Alertas Sonoros', desc: 'Som ao receber alerta crítico' },
                              { key: 'alertas_sms', label: 'Alertas SMS', desc: 'SMS para acidentes graves na zona' },
                            ].map(({ key, label, desc }) => (
                              <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                                  <p className="text-[10px] text-slate-400">{desc}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={formData[key]}
                                  onChange={(e) => setFormData({...formData, [key]: e.target.checked})}
                                  className="w-4 h-4 rounded accent-blue-600"
                                />
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Zonas Monitoradas */}
                        {zonasDisponiveis.length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Zonas Monitoradas</Label>
                            <p className="text-[10px] text-slate-400 mb-2">Selecione as zonas para receber alertas</p>
                            <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                              {zonasDisponiveis.map(zona => (
                                <label key={zona.zona_id || zona._id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200">
                                  <input
                                    type="checkbox"
                                    className="rounded accent-blue-600"
                                    checked={formData.zonas_notificacao.includes(zona.zona_id || zona._id)}
                                    onChange={(e) => {
                                      const id = zona.zona_id || zona._id;
                                      if (e.target.checked) {
                                        setFormData({...formData, zonas_notificacao: [...formData.zonas_notificacao, id]});
                                      } else {
                                        setFormData({...formData, zonas_notificacao: formData.zonas_notificacao.filter(z => z !== id)});
                                      }
                                    }}
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-red-400" />
                                    <span className="text-xs font-medium text-slate-600">{zona.nome || `Zona ${(zona.zona_id || zona._id).slice(-6)}`}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Privileges */}
                        <div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Privilégios de Acesso</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'gestao_acidentes', label: 'Gestão de Acidentes' },
                              { key: 'gestao_boletins', label: 'Gestão de Boletins' },
                              { key: 'gestao_zonas', label: 'Zonas Críticas' },
                              { key: 'gestao_assistencias', label: 'Assistências' },
                              { key: 'gestao_utilizadores', label: 'Gerir Utilizadores' },
                              { key: 'ver_estatisticas', label: 'Ver Estatísticas' },
                              { key: 'configuracoes', label: 'Configurações' },
                              { key: 'exportar_dados', label: 'Exportar Dados' },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={formData.privilegios[key]}
                                  onChange={(e) => setFormData({...formData, privilegios: {...formData.privilegios, [key]: e.target.checked}})}
                                  className="rounded accent-blue-600"
                                />
                                <span className="text-xs font-medium text-slate-600">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={handleCreateUser}
                          disabled={saving}
                          className="w-full h-11 rounded-xl font-semibold"
                          style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          Cadastrar Utilizador
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Pending approvals */}
            {pendentes.length > 0 && (
              <Card className="border-0 shadow-md shadow-amber-200/30 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/50">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-200/50 flex items-center justify-center">
                      <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    Aprovações Pendentes
                    <Badge className="bg-amber-200 text-amber-800 text-[10px] ml-1">{pendentes.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  <div className="space-y-2">
                    {pendentes.slice(0, 5).map(u => (
                      <div key={u._id} className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                            {u.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email} · {u.telefone}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAprovar(u._id)} className="rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aprovar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10" />
              <Input
                placeholder="Buscar por nome, email ou BI..."
                className="pl-11 h-10 rounded-xl bg-white border-slate-200 shadow-sm focus:bg-white focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Users Table */}
            <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilizador</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nível</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Users className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                          <p className="text-slate-400 font-medium">Nenhum utilizador encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => (
                        <TableRow key={u._id} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                                {u.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-700">{u.name}</p>
                                <p className="text-[11px] text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.telefone || '—'}</div>
                              <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{u.bilhete_identidade || '—'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-slate-500 capitalize">{u.nivel_acesso || 'basico'}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(u.status || 'ativo')}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-lg hover:bg-slate-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-48">
                                {u.status === 'pendente' && (
                                  <DropdownMenuItem onClick={() => handleAprovar(u._id)} className="text-emerald-600 rounded-lg">
                                    <UserCheck className="w-4 h-4 mr-2" /> Aprovar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleResetSenha(u._id)} className="rounded-lg">
                                  <Key className="w-4 h-4 mr-2" /> Redefinir Senha
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {u.status !== 'suspenso' ? (
                                  <DropdownMenuItem onClick={() => handleSuspender(u._id)} className="text-red-600 rounded-lg">
                                    <UserX className="w-4 h-4 mr-2" /> Suspender
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleAprovar(u._id)} className="text-emerald-600 rounded-lg">
                                    <UserCheck className="w-4 h-4 mr-2" /> Reativar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      {filteredUsers.length} utilizador{filteredUsers.length !== 1 ? 'es' : ''} · Página {page} de {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg h-8 w-8 p-0">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (page <= 3) pageNum = i + 1;
                        else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = page - 2 + i;
                        return (
                          <Button key={pageNum} variant={pageNum === page ? 'default' : 'outline'} size="sm"
                            onClick={() => setPage(pageNum)}
                            className={`rounded-lg h-8 w-8 p-0 text-xs ${pageNum === page ? 'bg-[#1B2A4A] text-white' : ''}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg h-8 w-8 p-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===== Right mini sidebar ===== */}
          <div className="flex flex-col w-14 ml-4 flex-shrink-0 sticky top-20 self-start">
            <div className="flex flex-col items-center gap-1.5 py-3 px-1 bg-white rounded-2xl shadow-md border border-slate-100">
              {SIDE_MENUS.map(({ key, label, icon: Icon, color, bg, border: borderColor }) => {
                const isActive = activeFilter === key;
                const count = counts[key];
                return (
                  <Tooltip key={key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveFilter(key)}
                        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                        style={isActive ? {
                          backgroundColor: bg,
                          border: `1.5px solid ${borderColor}`,
                          color: color,
                        } : { color: '#94a3b8' }}
                      >
                        <Icon style={{ width: 18, height: 18 }} />
                        {count > 0 && (
                          <span
                            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs font-semibold">
                      {label} ({count})
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              <div className="w-6 h-px bg-slate-200 my-1 rounded" />

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={fetchUtilizadores}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs font-semibold">Atualizar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Reset password dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#1B2A4A]">Senha Redefinida</DialogTitle>
                <DialogDescription>A nova senha foi enviada por SMS ao utilizador.</DialogDescription>
              </DialogHeader>
              {resetResult && (
                <div className="space-y-3 py-2">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Telefone</p>
                    <p className="text-sm font-mono font-semibold">{resetResult.telefone}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Nova Senha</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold">{resetResult.nova_senha}</code>
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(resetResult.nova_senha); toast.success('Copiada!'); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => setResetDialogOpen(false)} className="w-full rounded-xl" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                    Fechar
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </Layout>
  );
}
