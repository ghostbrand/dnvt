import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Bell, Search, RefreshCw, Loader2, Users, Clock, Send,
  ChevronLeft, ChevronRight, MessageSquare, CalendarDays
} from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function NotificacoesHistoricoPage() {
  const { user } = useAuth();
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notificacoes/historico`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistorico(data);
    } catch (err) {
      toast.error('Erro ao carregar histórico de notificações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistorico(); }, []);
  useEffect(() => { setPage(1); }, [searchTerm]);

  const filtered = historico.filter(n => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      n.titulo?.toLowerCase().includes(q) ||
      n.mensagem?.toLowerCase().includes(q) ||
      n.remetente?.toLowerCase().includes(q) ||
      n.destinatarios_nomes?.some(name => name.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-AO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem ver o histórico de notificações</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5" data-testid="notificacoes-historico-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Comunicação</Badge>
            </div>
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Histórico de Notificações</h1>
            <p className="text-slate-400 text-sm mt-0.5">Todas as notificações enviadas aos cidadãos</p>
          </div>
          <Button variant="outline" onClick={fetchHistorico} className="rounded-xl border-slate-200 hover:bg-slate-100 h-10">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50">
                <Send className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-indigo-600">{historico.length}</p>
                <p className="text-[11px] text-slate-400 font-medium">Envios</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-600">
                  {historico.reduce((sum, n) => sum + (n.destinatarios_count || 1), 0)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">Destinatários totais</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl hidden lg:block">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                <CalendarDays className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-600">
                  {historico.length > 0 ? timeAgo(historico[0]?.created_at) : '—'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">Último envio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10" />
          <Input
            placeholder="Pesquisar por título, mensagem ou destinatário..."
            className="pl-11 h-10 rounded-xl bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-sm text-slate-400 mt-2">Carregando histórico...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-14 h-14 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma notificação encontrada</p>
              <p className="text-slate-300 text-xs mt-1">
                {searchTerm ? 'Ajuste os termos de pesquisa' : 'As notificações enviadas aparecerão aqui'}
              </p>
            </div>
          ) : (
            paginated.map((notif, idx) => (
              <Card key={notif._id || idx} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{notif.titulo}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="bg-blue-50 text-blue-600 text-[10px] font-semibold gap-1">
                            <Users className="w-3 h-3" /> {notif.destinatarios_count || 1}
                          </Badge>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {timeAgo(notif.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-2 line-clamp-2">{notif.mensagem}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(notif.created_at)}
                        </div>
                        {notif.remetente && (
                          <div className="text-[10px] text-slate-400">
                            · por <span className="font-semibold text-slate-500">{notif.remetente}</span>
                          </div>
                        )}
                      </div>
                      {notif.destinatarios_nomes && notif.destinatarios_nomes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {notif.destinatarios_nomes.slice(0, 8).map((nome, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-medium">
                              {nome}
                            </span>
                          ))}
                          {notif.destinatarios_nomes.length > 8 && (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[10px]">
                              +{notif.destinatarios_nomes.length - 8} mais
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {filtered.length} notificação{filtered.length !== 1 ? 'ões' : ''} · Página {page} de {totalPages}
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
      </div>
    </Layout>
  );
}
