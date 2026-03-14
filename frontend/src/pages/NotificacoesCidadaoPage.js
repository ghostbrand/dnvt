import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { notificacoesApi } from '../services/api';
import { toast } from 'sonner';
import {
  Bell, Search, Send, Users, Loader2, X, CheckCircle2,
  MessageSquare, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function NotificacoesCidadaoPage() {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [selectedNames, setSelectedNames] = useState({});
  const [sendAll, setSendAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const searchTimerRef = useRef(null);

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  const searchCidadaos = async (query, pagina = 1) => {
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      const params = new URLSearchParams({ q: query, pagina, limite: ITEMS_PER_PAGE, status: 'ativo' });
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/utilizadores/cidadaos/buscar?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSearchResults(data.cidadaos || []);
      setTotalResults(data.total || 0);
      setPage(data.pagina || 1);
      setTotalPages(data.total_paginas || 0);
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => { searchCidadaos('', 1); }, []);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      searchCidadaos(value, 1);
    }, 350);
  };

  const toggleSelect = (id, name) => {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(s => s !== id));
      setSelectedNames(prev => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      setSelected(prev => [...prev, id]);
      setSelectedNames(prev => ({ ...prev, [id]: name }));
    }
  };

  const handleSend = async () => {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    if (!sendAll && selected.length === 0) {
      toast.error('Selecione pelo menos um destinatário');
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      let destinatarios = selected;
      if (sendAll) {
        let allIds = [];
        let p = 1;
        let pages = 1;
        while (p <= pages) {
          const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/utilizadores/cidadaos/buscar?status=ativo&limite=50&pagina=${p}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          allIds = [...allIds, ...(data.cidadaos || []).map(c => c._id)];
          pages = data.total_paginas || 1;
          p++;
        }
        destinatarios = allIds;
      }

      await notificacoesApi.enviar({ destinatarios, titulo, mensagem });
      toast.success(`Notificação enviada para ${destinatarios.length} cidadão(s)`);
      setTitulo('');
      setMensagem('');
      setSelected([]);
      setSelectedNames({});
      setSendAll(false);
    } catch (err) {
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem enviar notificações</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5" data-testid="notificacoes-cidadao-page">
        {/* Header */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Cidadão</Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Notificações ao Cidadão</h1>
          <p className="text-slate-400 text-sm mt-0.5">Enviar notificações push para cidadãos registados na app</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left — Compose */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">Compor Notificação</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Título</label>
                  <Input
                    placeholder="Ex: Atualização de trânsito"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Mensagem</label>
                  <textarea
                    rows={4}
                    placeholder="Escreva a mensagem da notificação..."
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>

                {/* Send to all toggle */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendAll}
                    onChange={e => setSendAll(e.target.checked)}
                    className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-blue-700">Enviar a todos os cidadãos</span>
                    <p className="text-[10px] text-blue-400">Todos os cidadãos ativos receberão esta notificação</p>
                  </div>
                </label>

                {/* Selected badges */}
                {!sendAll && selected.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{selected.length} selecionado{selected.length > 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.map(id => (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[11px] font-medium">
                          {selectedNames[id] || id}
                          <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => toggleSelect(id, selectedNames[id])} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={sending || (!sendAll && selected.length === 0) || !titulo.trim() || !mensagem.trim()}
                  className="w-full rounded-xl h-11 font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {sending ? 'Enviando...' : 'Enviar Notificação'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right — Recipient picker */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-800">Selecionar Destinatários</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold">{totalResults} cidadãos</Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    placeholder="Pesquisar por nome ou email..."
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200"
                  />
                </div>

                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-400" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Nenhum cidadão encontrado</p>
                    </div>
                  ) : (
                    searchResults.map(c => {
                      const isSelected = selected.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => toggleSelect(c._id, c.name || c.nome)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isSelected ? <CheckCircle2 className="w-4 h-4" /> : (c.name || c.nome || '?')[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{c.name || c.nome}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                          </div>
                          {isSelected && <Badge className="bg-blue-100 text-blue-600 text-[9px]">Selecionado</Badge>}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">Página {page} de {totalPages}</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => searchCidadaos(search, page - 1)} className="h-7 w-7 p-0 rounded-lg">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => searchCidadaos(search, page + 1)} className="h-7 w-7 p-0 rounded-lg">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
