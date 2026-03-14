import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { utilizadoresApi, notificacoesApi } from '../services/api';
import { toast } from 'sonner';
import {
  Bell, Search, Send, Users, Loader2, X, CheckCircle2,
  Radio, Shield
} from 'lucide-react';

export default function NotificacoesAgentePage() {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectedNames, setSelectedNames] = useState({});
  const [sendAll, setSendAll] = useState(false);

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const all = await utilizadoresApi.list();
        setAgents(all.filter(u => u.role === 'agente' && u.status !== 'suspenso'));
      } catch (_) {
        toast.error('Erro ao carregar agentes');
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const toggleSelect = (id, name) => {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(s => s !== id));
      setSelectedNames(prev => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      setSelected(prev => [...prev, id]);
      setSelectedNames(prev => ({ ...prev, [id]: name }));
    }
  };

  const filteredAgents = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.name || a.nome || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    if (!sendAll && selected.length === 0) {
      toast.error('Selecione pelo menos um agente');
      return;
    }
    setSending(true);
    try {
      const destinatarios = sendAll ? agents.map(a => a._id) : selected;
      await notificacoesApi.enviar({ destinatarios, titulo, mensagem });
      toast.success(`Notificação enviada para ${destinatarios.length} agente(s)`);
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
            <Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem enviar notificações</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5" data-testid="notificacoes-agente-page">
        {/* Header */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Agente</Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Notificações ao Agente</h1>
          <p className="text-slate-400 text-sm mt-0.5">Enviar alertas e notificações urgentes aos agentes de trânsito</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left — Compose */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-slate-800">Compor Alerta</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Título</label>
                  <Input
                    placeholder="Ex: Urgência — Acidente na EN100"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Mensagem</label>
                  <textarea
                    rows={4}
                    placeholder="Descreva o alerta ou instrução para os agentes..."
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>

                {/* Send to all toggle */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendAll}
                    onChange={e => setSendAll(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-amber-700">Enviar a todos os agentes</span>
                    <p className="text-[10px] text-amber-400">Todos os agentes ativos receberão este alerta</p>
                  </div>
                </label>

                {/* Selected badges */}
                {!sendAll && selected.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{selected.length} selecionado{selected.length > 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.map(id => (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-medium">
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
                  className="w-full rounded-xl h-11 font-semibold text-white bg-amber-600 hover:bg-amber-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {sending ? 'Enviando...' : 'Enviar Alerta'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right — Agent picker */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-800">Selecionar Agentes</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold">{agents.length} agentes</Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    placeholder="Pesquisar agente..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200"
                  />
                </div>

                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-400" />
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Nenhum agente encontrado</p>
                    </div>
                  ) : (
                    filteredAgents.map(a => {
                      const isSelected = selected.includes(a._id);
                      const name = a.name || a.nome || a.email;
                      return (
                        <div
                          key={a._id}
                          onClick={() => toggleSelect(a._id, name)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${
                            isSelected ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isSelected ? <CheckCircle2 className="w-4 h-4" /> : name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{a.email}</p>
                          </div>
                          {isSelected && <Badge className="bg-amber-100 text-amber-600 text-[9px]">Selecionado</Badge>}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
