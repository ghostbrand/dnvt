import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { historicoApi } from '../services/api';
import {
  History, RefreshCw, AlertCircle, User, Car, FileText,
  Ambulance, MapPin, Settings, Shield, Loader2, Clock
} from 'lucide-react';

export default function HistoricoPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('all');

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  useEffect(() => { fetchLogs(); }, [filterTipo]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterTipo !== 'all') params.tipo = filterTipo;
      params.limit = 200;
      const data = await historicoApi.list(params);
      setLogs(data);
    } catch (err) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      utilizador: <User className="w-3.5 h-3.5" />,
      acidente: <Car className="w-3.5 h-3.5" />,
      boletim: <FileText className="w-3.5 h-3.5" />,
      assistencia: <Ambulance className="w-3.5 h-3.5" />,
      zona: <MapPin className="w-3.5 h-3.5" />,
      configuracao: <Settings className="w-3.5 h-3.5" />,
      auth: <Shield className="w-3.5 h-3.5" />,
      sistema: <Settings className="w-3.5 h-3.5" />
    };
    return icons[tipo] || <History className="w-3.5 h-3.5" />;
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      utilizador: 'bg-purple-100 text-purple-700',
      acidente: 'bg-red-100 text-red-700',
      boletim: 'bg-blue-100 text-blue-700',
      assistencia: 'bg-amber-100 text-amber-700',
      zona: 'bg-emerald-100 text-emerald-700',
      configuracao: 'bg-slate-100 text-slate-700',
      auth: 'bg-indigo-100 text-indigo-700',
      sistema: 'bg-cyan-100 text-cyan-700'
    };
    return <Badge className={`text-[10px] ${styles[tipo] || 'bg-slate-100 text-slate-600'}`}>{tipo}</Badge>;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96" data-testid="historico-page">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem ver o histórico</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="historico-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Histórico</h1>
            <p className="text-slate-400 text-sm mt-0.5">Registo de todas as operações do sistema</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl animate-slide-up stagger-1" style={{opacity: 0}}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-48 rounded-xl border-slate-200">
                  <SelectValue placeholder="Tipo de operação" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas as operações</SelectItem>
                  <SelectItem value="utilizador">Utilizadores</SelectItem>
                  <SelectItem value="acidente">Acidentes</SelectItem>
                  <SelectItem value="boletim">Boletins</SelectItem>
                  <SelectItem value="assistencia">Assistências</SelectItem>
                  <SelectItem value="zona">Zonas Críticas</SelectItem>
                  <SelectItem value="configuracao">Configurações</SelectItem>
                  <SelectItem value="auth">Autenticação</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchLogs} className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <span className="text-xs text-slate-400 ml-auto">{logs.length} registos</span>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider w-12"></TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operação</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilizador</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <History className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 font-medium">Nenhum registo encontrado</p>
                      <p className="text-slate-300 text-xs mt-1">As operações do sistema aparecerão aqui</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
                    <TableRow key={log._id || idx} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          {getTipoIcon(log.tipo)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{log.acao?.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{log.descricao}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTipoBadge(log.tipo)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{log.user_name || 'Sistema'}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
                          <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {getRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
