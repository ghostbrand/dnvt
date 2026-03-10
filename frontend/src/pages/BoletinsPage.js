import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { boletinsApi } from '../services/api';
import { 
  FileText, 
  Plus, 
  Download, 
  Upload,
  Eye,
  RefreshCw,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BoletinsPage() {
  const [boletins, setBoletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModo, setFilterModo] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchBoletins = async () => {
    setLoading(true);
    try {
      const data = await boletinsApi.list();
      setBoletins(data);
    } catch (error) {
      toast.error('Erro ao carregar boletins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoletins();
  }, []);

  const handleDownloadPdf = async (boletimId) => {
    setDownloadingId(boletimId);
    try {
      const token = localStorage.getItem('dnvt_token');
      const response = await fetch(`${API}/boletins/${boletimId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boletim_${boletimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredBoletins = boletins.filter(b => 
    filterModo === 'all' || b.modo_criacao === filterModo
  );

  const getModoBadge = (modo) => {
    if (modo === 'GERADO_SISTEMA') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sistema</Badge>;
    }
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Upload</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="boletins-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Boletins de Ocorrência</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestão de boletins de acidentes</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            <Link to="/boletins/novo">
              <Button 
                className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                data-testid="new-boletim-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Boletim
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={filterModo} onValueChange={setFilterModo}>
                <SelectTrigger className="w-48 rounded-xl border-slate-200" data-testid="filter-modo">
                  <SelectValue placeholder="Modo de criação" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="GERADO_SISTEMA">Gerado pelo Sistema</SelectItem>
                  <SelectItem value="UPLOAD_MANUAL">Upload Manual</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={fetchBoletins} data-testid="refresh-btn" className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-3" style={{opacity: 0}}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Processo</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acidente</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredBoletins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <FileText className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 font-medium">Nenhum boletim encontrado</p>
                      <p className="text-slate-300 text-xs mt-1">Os boletins aparecerão aqui</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBoletins.map((boletim) => (
                    <TableRow key={boletim.boletim_id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell className="font-mono text-sm font-semibold text-slate-700">
                        {boletim.numero_processo}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {boletim.acidente_id?.slice(-8)}
                      </TableCell>
                      <TableCell>{getModoBadge(boletim.modo_criacao)}</TableCell>
                      <TableCell className="text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(boletim.created_at).toLocaleDateString('pt-AO')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild className="rounded-lg hover:bg-blue-50 hover:text-blue-600">
                            <Link to={`/boletins/${boletim.boletim_id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownloadPdf(boletim.boletim_id)}
                            disabled={downloadingId === boletim.boletim_id}
                            data-testid={`download-${boletim.boletim_id}`}
                            className="rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            {downloadingId === boletim.boletim_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
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
