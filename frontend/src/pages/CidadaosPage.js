import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { utilizadoresApi } from '../services/api';
import {
  Search, RefreshCw, UserCheck, UserX, Phone, CreditCard, Key,
  AlertCircle, CheckCircle, Loader2, MoreHorizontal, Copy,
  Users, Clock, ShieldCheck, ShieldOff, Eye, Calendar,
  ChevronLeft, ChevronRight, Send, MessageSquare
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '../components/ui/tooltip';

const ITEMS_PER_PAGE = 10;

const SUB_MENUS = [
  { key: 'pendentes', label: 'Pendentes', icon: Clock, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'ativos', label: 'Ativos', icon: ShieldCheck, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { key: 'suspensos', label: 'Suspensos', icon: ShieldOff, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'todos', label: 'Todos', icon: Users, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
];

export default function CidadaosPage() {
  const { user } = useAuth();
  const [cidadaos, setCidadaos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState('pendentes');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCidadao, setSelectedCidadao] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [page, setPage] = useState(1);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, name }
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Notification state
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargets, setNotifTargets] = useState([]); // array of user IDs
  const [notifTargetNames, setNotifTargetNames] = useState({}); // id -> name map for display
  const [sendingNotif, setSendingNotif] = useState(false);
  // Server-side citizen search for notification dialog
  const [notifSearch, setNotifSearch] = useState('');
  const [notifSearchResults, setNotifSearchResults] = useState([]);
  const [notifSearchTotal, setNotifSearchTotal] = useState(0);
  const [notifSearchPage, setNotifSearchPage] = useState(1);
  const [notifSearchPages, setNotifSearchPages] = useState(0);
  const [notifSearchLoading, setNotifSearchLoading] = useState(false);
  const [notifSendAll, setNotifSendAll] = useState(false);
  const searchTimerRef = useRef(null);

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  // Server-side citizen search for notification dialog
  const searchCidadaosForNotif = async (query, pagina = 1) => {
    setNotifSearchLoading(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      const params = new URLSearchParams({ q: query, pagina, limite: 20, status: 'ativo' });
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/utilizadores/cidadaos/buscar?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifSearchResults(data.cidadaos || []);
      setNotifSearchTotal(data.total || 0);
      setNotifSearchPage(data.pagina || 1);
      setNotifSearchPages(data.total_paginas || 0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setNotifSearchLoading(false);
    }
  };

  const handleNotifSearchChange = (value) => {
    setNotifSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      searchCidadaosForNotif(value, 1);
    }, 350);
  };

  const openNotifDialog = () => {
    setNotifDialogOpen(true);
    setNotifTargets([]);
    setNotifTargetNames({});
    setNotifSearch('');
    setNotifSendAll(false);
    searchCidadaosForNotif('', 1);
  };

  useEffect(() => { fetchCidadaos(); }, []);

  const fetchCidadaos = async () => {
    setLoading(true);
    try {
      const all = await utilizadoresApi.list();
      setCidadaos(all.filter(u => u.role === 'cidadao'));
    } catch (err) {
      toast.error('Erro ao carregar cidadãos');
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation dialog before action
  const requestConfirm = (type, id, name) => {
    setConfirmAction({ type, id, name });
    setConfirmOpen(true);
  };

  const confirmMessages = {
    aprovar: { title: 'Aprovar Cidadão', desc: 'Tem certeza que deseja aprovar este cidadão? Ele terá acesso completo à aplicação.', color: 'bg-emerald-600 hover:bg-emerald-700', icon: 'check' },
    reativar: { title: 'Reativar Cidadão', desc: 'Tem certeza que deseja reativar este cidadão? A sua conta será desbloqueada.', color: 'bg-emerald-600 hover:bg-emerald-700', icon: 'check' },
    suspender: { title: 'Suspender Cidadão', desc: 'Tem certeza que deseja suspender este cidadão? Ele perderá acesso à aplicação.', color: 'bg-red-600 hover:bg-red-700', icon: 'alert' },
    resetSenha: { title: 'Redefinir Senha', desc: 'Será gerada uma nova senha e enviada por SMS ao cidadão.', color: 'bg-amber-600 hover:bg-amber-700', icon: 'key' },
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      const { type, id } = confirmAction;
      if (type === 'aprovar' || type === 'reativar') {
        const result = await utilizadoresApi.aprovar(id);
        const msgs = ['Cidadão aprovado com sucesso!'];
        if (result.email_enviado) msgs.push('Email de aprovação enviado');
        if (result.sms_enviado) msgs.push('SMS de aprovação enviado');
        toast.success(msgs.join(' · '));
      } else if (type === 'suspender') {
        await utilizadoresApi.suspender(id);
        toast.success('Cidadão suspenso com sucesso');
      } else if (type === 'resetSenha') {
        const result = await utilizadoresApi.resetSenha(id);
        setResetResult(result);
        setResetDialogOpen(true);
      }
      fetchCidadaos();
      setDetailOpen(false);
    } catch (err) {
      toast.error(`Erro ao ${confirmAction.type === 'suspender' ? 'suspender' : confirmAction.type === 'resetSenha' ? 'redefinir senha' : 'aprovar'} cidadão`);
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return toast.error('Título e mensagem são obrigatórios');
    if (!notifSendAll && notifTargets.length === 0) return toast.error('Selecione pelo menos um cidadão');
    setSendingNotif(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      let destinatarios = notifTargets;
      // If "send to all" is checked, fetch all active citizen IDs from server
      if (notifSendAll) {
        const allRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/utilizadores/cidadaos/buscar?status=ativo&limite=50&pagina=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allData = await allRes.json();
        // Get total, then fetch all pages
        const totalPages = allData.total_paginas;
        let allIds = allData.cidadaos.map(c => c._id);
        for (let p = 2; p <= totalPages; p++) {
          const pRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/utilizadores/cidadaos/buscar?status=ativo&limite=50&pagina=${p}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const pData = await pRes.json();
          allIds = [...allIds, ...pData.cidadaos.map(c => c._id)];
        }
        destinatarios = allIds;
      }
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notificacoes/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ destinatarios, titulo: notifTitle, mensagem: notifMessage })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Notificação enviada para ${data.enviadas} cidadão(s)${data.push_enviados ? ` · ${data.push_enviados} push enviado(s)` : ''}`);
        setNotifDialogOpen(false);
        setNotifTitle('');
        setNotifMessage('');
        setNotifTargets([]);
        setNotifTargetNames({});
        setNotifSendAll(false);
      } else {
        toast.error(data.error || 'Erro ao enviar notificação');
      }
    } catch (err) {
      toast.error('Erro ao enviar notificação');
    } finally {
      setSendingNotif(false);
    }
  };

  const toggleNotifTarget = (id, name) => {
    setNotifSendAll(false);
    setNotifTargets(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
    if (name) setNotifTargetNames(prev => ({ ...prev, [id]: name }));
  };

  const selectAllOnPage = () => {
    const ids = notifSearchResults.map(c => c._id);
    const names = {};
    notifSearchResults.forEach(c => { names[c._id] = c.name; });
    setNotifTargets(prev => [...new Set([...prev, ...ids])]);
    setNotifTargetNames(prev => ({ ...prev, ...names }));
  };

  const clearAllTargets = () => {
    setNotifTargets([]);
    setNotifTargetNames({});
    setNotifSendAll(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      ativo: { bg: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
      pendente: { bg: 'bg-amber-100 text-amber-700', icon: Clock },
      suspenso: { bg: 'bg-red-100 text-red-700', icon: ShieldOff },
    };
    const s = styles[status] || styles.pendente;
    const Icon = s.icon;
    return (
      <Badge className={`text-[10px] font-semibold gap-1 ${s.bg}`}>
        <Icon className="w-3 h-3" /> {status}
      </Badge>
    );
  };

  const filteredCidadaos = cidadaos.filter(c => {
    const matchSearch = !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone?.includes(searchTerm) ||
      c.bilhete_identidade?.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeMenu === 'todos') return matchSearch;
    if (activeMenu === 'pendentes') return matchSearch && c.status === 'pendente';
    if (activeMenu === 'ativos') return matchSearch && c.status === 'ativo';
    if (activeMenu === 'suspensos') return matchSearch && c.status === 'suspenso';
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCidadaos.length / ITEMS_PER_PAGE));
  const paginatedCidadaos = filteredCidadaos.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [searchTerm, activeMenu]);

  const counts = {
    pendentes: cidadaos.filter(c => c.status === 'pendente').length,
    ativos: cidadaos.filter(c => c.status === 'ativo').length,
    suspensos: cidadaos.filter(c => c.status === 'suspenso').length,
    todos: cidadaos.length,
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem gerir cidadãos</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TooltipProvider>
        <div className="flex gap-0" data-testid="cidadaos-page">
          {/* ===== Main content area ===== */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Subsistema</Badge>
                </div>
                <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Gestão de Cidadãos</h1>
                <p className="text-slate-400 text-sm mt-0.5">Aprovação, monitoramento e gestão de contas registadas via app mobile</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openNotifDialog} className="rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 h-10">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Notificar
                </Button>
                <Button variant="outline" onClick={fetchCidadaos} className="rounded-xl border-slate-200 hover:bg-slate-100 h-10">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: counts.todos, icon: Users, color: '#1B2A4A' },
                { label: 'Pendentes', value: counts.pendentes, icon: Clock, color: '#d97706' },
                { label: 'Ativos', value: counts.ativos, icon: ShieldCheck, color: '#059669' },
                { label: 'Suspensos', value: counts.suspensos, icon: ShieldOff, color: '#dc2626' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10" />
              <Input
                placeholder="Buscar por nome, email, telefone ou BI..."
                className="pl-11 h-10 rounded-xl bg-white border-slate-200 shadow-sm focus:bg-white focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Pending quick-actions */}
            {activeMenu === 'pendentes' && counts.pendentes > 0 && (
              <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/50">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-200/50 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    Aguardando Aprovação
                    <Badge className="bg-amber-200 text-amber-800 text-[10px] ml-1">{counts.pendentes}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  <p className="text-xs text-amber-700/60 mb-3">
                    Cidadãos que se registaram via app mobile e aguardam validação.
                  </p>
                  <div className="space-y-2">
                    {filteredCidadaos.filter(c => c.status === 'pendente').slice(0, 5).map(c => (
                      <div key={c._id} className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                            <p className="text-[11px] text-slate-400">{c.email} · {c.telefone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedCidadao(c); setDetailOpen(true); }} className="rounded-lg text-xs">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                          </Button>
                          <Button size="sm" onClick={() => requestConfirm('aprovar', c._id, c.name)} className="rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aprovar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main table */}
            <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidadão</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">BI</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Registo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedCidadaos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Users className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                          <p className="text-slate-400 font-medium">Nenhum cidadão encontrado</p>
                          <p className="text-slate-300 text-xs mt-1">
                            {activeMenu === 'pendentes' ? 'Sem aprovações pendentes' : 'Ajuste os filtros de pesquisa'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCidadaos.map((c) => (
                        <TableRow key={c._id} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-emerald-500 to-teal-600">
                                {c.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                                <p className="text-[11px] text-slate-400">{c.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="w-3 h-3" />{c.telefone || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                              <CreditCard className="w-3 h-3" />{c.bilhete_identidade || '—'}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(c.status || 'pendente')}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Calendar className="w-3 h-3" />{formatDate(c.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-lg hover:bg-slate-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-48">
                                <DropdownMenuItem onClick={() => { setSelectedCidadao(c); setDetailOpen(true); }} className="rounded-lg">
                                  <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                                </DropdownMenuItem>
                                {c.status === 'pendente' && (
                                  <DropdownMenuItem onClick={() => requestConfirm('aprovar', c._id, c.name)} className="text-emerald-600 rounded-lg">
                                    <UserCheck className="w-4 h-4 mr-2" /> Aprovar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => requestConfirm('resetSenha', c._id, c.name)} className="rounded-lg">
                                  <Key className="w-4 h-4 mr-2" /> Redefinir Senha
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {c.status !== 'suspenso' ? (
                                  <DropdownMenuItem onClick={() => requestConfirm('suspender', c._id, c.name)} className="text-red-600 rounded-lg">
                                    <UserX className="w-4 h-4 mr-2" /> Suspender
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => requestConfirm('reativar', c._id, c.name)} className="text-emerald-600 rounded-lg">
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
                      {filteredCidadaos.length} cidadão{filteredCidadaos.length !== 1 ? 's' : ''} · Página {page} de {totalPages}
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

          {/* ===== Right mini sidebar — sub-navigation ===== */}
          <div className="hidden lg:flex flex-col w-14 ml-4 flex-shrink-0 sticky top-20 self-start">
            <div className="flex flex-col items-center gap-1.5 py-3 px-1 bg-white rounded-2xl shadow-md border border-slate-100">
              {SUB_MENUS.map(({ key, label, icon: Icon, color, bg, border: borderColor }) => {
                const isActive = activeMenu === key;
                const count = counts[key];
                return (
                  <Tooltip key={key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveMenu(key)}
                        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                        style={isActive ? {
                          backgroundColor: bg,
                          border: `1.5px solid ${borderColor}`,
                          color: color,
                        } : {
                          color: '#94a3b8',
                        }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
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
                    onClick={fetchCidadaos}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs font-semibold">Atualizar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Detail dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1B2A4A]">Detalhes do Cidadão</DialogTitle>
                <DialogDescription>Informações completas do registo</DialogDescription>
              </DialogHeader>
              {selectedCidadao && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-emerald-500 to-teal-600">
                      {selectedCidadao.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800">{selectedCidadao.name}</p>
                      <p className="text-sm text-slate-400">{selectedCidadao.email}</p>
                      {getStatusBadge(selectedCidadao.status || 'pendente')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Telefone</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedCidadao.telefone || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Bilhete de Identidade</p>
                      <p className="text-sm font-mono font-semibold text-slate-700">{selectedCidadao.bilhete_identidade || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Endereço</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedCidadao.endereco || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Registado em</p>
                      <p className="text-sm font-semibold text-slate-700">{formatDate(selectedCidadao.createdAt)}</p>
                    </div>
                    {selectedCidadao.aprovado_em && (
                      <div className="p-3 bg-emerald-50 rounded-xl col-span-2">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Aprovado em</p>
                        <p className="text-sm font-semibold text-emerald-700">{formatDate(selectedCidadao.aprovado_em)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {selectedCidadao.status === 'pendente' && (
                      <Button onClick={() => requestConfirm('aprovar', selectedCidadao._id, selectedCidadao.name)}
                        className="flex-1 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Cidadão
                      </Button>
                    )}
                    {selectedCidadao.status !== 'suspenso' && (
                      <Button variant="outline" onClick={() => requestConfirm('suspender', selectedCidadao._id, selectedCidadao.name)}
                        className="rounded-xl font-semibold text-red-600 border-red-200 hover:bg-red-50">
                        <UserX className="w-4 h-4 mr-2" /> Suspender
                      </Button>
                    )}
                    {selectedCidadao.status === 'suspenso' && (
                      <Button onClick={() => requestConfirm('reativar', selectedCidadao._id, selectedCidadao.name)}
                        className="flex-1 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700">
                        <UserCheck className="w-4 h-4 mr-2" /> Reativar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Confirmation dialog for actions */}
          <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmOpen(false); setConfirmAction(null); } }}>
            <DialogContent className="rounded-2xl max-w-sm">
              {confirmAction && confirmMessages[confirmAction.type] && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-[#1B2A4A] flex items-center gap-2">
                      {confirmAction.type === 'suspender' && <AlertCircle className="w-5 h-5 text-red-500" />}
                      {(confirmAction.type === 'aprovar' || confirmAction.type === 'reativar') && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {confirmAction.type === 'resetSenha' && <Key className="w-5 h-5 text-amber-500" />}
                      {confirmMessages[confirmAction.type].title}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                      {confirmMessages[confirmAction.type].desc}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {confirmAction.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{confirmAction.name || 'Cidadão'}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{confirmMessages[confirmAction.type].title}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmAction(null); }}
                      disabled={confirmLoading} className="rounded-xl text-sm">
                      Cancelar
                    </Button>
                    <Button onClick={executeConfirmedAction} disabled={confirmLoading}
                      className={`rounded-xl text-sm font-semibold px-6 text-white ${confirmMessages[confirmAction.type].color}`}>
                      {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Confirmar
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Notification dialog — server-side search + pagination */}
          <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
            <DialogContent className="rounded-2xl max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1B2A4A] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Enviar Notificação
                </DialogTitle>
                <DialogDescription>Pesquise e selecione cidadãos ou envie para todos os ativos.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</label>
                  <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Ex: Atualização do sistema" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensagem</label>
                  <textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="Escreva a mensagem..." rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {/* Send to all toggle */}
                <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                  <input type="checkbox" checked={notifSendAll} onChange={e => { setNotifSendAll(e.target.checked); if (e.target.checked) setNotifTargets([]); }}
                    className="rounded border-blue-300 text-blue-600 w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">Enviar para todos os cidadãos ativos</p>
                    <p className="text-[11px] text-blue-500">{notifSearchTotal.toLocaleString()} cidadão(s) ativo(s) no total</p>
                  </div>
                  <Users className="w-5 h-5 text-blue-400" />
                </label>

                {/* Individual selection */}
                {!notifSendAll && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pesquisar Cidadãos {notifTargets.length > 0 && `(${notifTargets.length} selecionado${notifTargets.length !== 1 ? 's' : ''})`}
                      </label>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={selectAllOnPage} className="text-[10px] text-blue-600 h-6 px-2">
                          Sel. página
                        </Button>
                        {notifTargets.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearAllTargets} className="text-[10px] text-red-500 h-6 px-2">
                            Limpar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        value={notifSearch}
                        onChange={e => handleNotifSearchChange(e.target.value)}
                        placeholder="Pesquisar por nome, email, telefone..."
                        className="pl-10 h-9 rounded-xl text-sm"
                      />
                      {notifSearchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />}
                    </div>

                    {/* Selected targets chips */}
                    {notifTargets.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {notifTargets.slice(0, 20).map(id => (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                            {notifTargetNames[id] || id.slice(-6)}
                            <button onClick={() => toggleNotifTarget(id)} className="hover:text-red-500 ml-0.5">&times;</button>
                          </span>
                        ))}
                        {notifTargets.length > 20 && (
                          <span className="text-[10px] text-slate-400 self-center">+{notifTargets.length - 20} mais</span>
                        )}
                      </div>
                    )}

                    {/* Results list */}
                    <div className="max-h-44 overflow-y-auto border border-slate-100 rounded-xl">
                      {notifSearchResults.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notifSearchResults.map(c => (
                            <label key={c._id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
                              <input type="checkbox" checked={notifTargets.includes(c._id)} onChange={() => toggleNotifTarget(c._id, c.name)}
                                className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{c.telefone}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          {notifSearchLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
                          ) : (
                            <>
                              <Users className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                              <p className="text-xs text-slate-400">{notifSearch ? 'Nenhum resultado encontrado' : 'Pesquise para encontrar cidadãos'}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {notifSearchPages > 1 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] text-slate-400">{notifSearchTotal.toLocaleString()} resultado(s) · Página {notifSearchPage}/{notifSearchPages}</p>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" disabled={notifSearchPage <= 1}
                            onClick={() => searchCidadaosForNotif(notifSearch, notifSearchPage - 1)}
                            className="h-7 w-7 p-0 rounded-lg">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" disabled={notifSearchPage >= notifSearchPages}
                            onClick={() => searchCidadaosForNotif(notifSearch, notifSearchPage + 1)}
                            className="h-7 w-7 p-0 rounded-lg">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={handleSendNotification}
                  disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim() || (!notifSendAll && notifTargets.length === 0)}
                  className="w-full rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                  {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {notifSendAll
                    ? `Enviar para todos (${notifSearchTotal.toLocaleString()})`
                    : `Enviar para ${notifTargets.length} cidadão${notifTargets.length !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset password dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#1B2A4A]">Senha Redefinida</DialogTitle>
                <DialogDescription>A nova senha foi enviada por SMS ao cidadão.</DialogDescription>
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
