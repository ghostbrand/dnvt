import { useState, useEffect } from 'react';
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
import { acidentesApi } from '../services/api';
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
  Car
} from 'lucide-react';
import { toast } from 'sonner';

export default function AcidentesPage() {
  const navigate = useNavigate();
  const [acidentes, setAcidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGravidade, setFilterGravidade] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');

  const fetchAcidentes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterGravidade !== 'all') params.gravidade = filterGravidade;
      if (filterOrigem !== 'all') params.origem = filterOrigem;
      
      const data = await acidentesApi.list(params);
      setAcidentes(data);
    } catch (error) {
      toast.error('Erro ao carregar acidentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcidentes();
  }, [filterStatus, filterGravidade, filterOrigem]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este acidente?')) return;
    
    try {
      await acidentesApi.delete(id);
      toast.success('Acidente removido');
      fetchAcidentes();
    } catch (error) {
      toast.error('Erro ao remover acidente');
    }
  };

  const filteredAcidentes = acidentes.filter(a => 
    a.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tipo_acidente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.acidente_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <Layout>
      <div className="space-y-6" data-testid="acidentes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Acidentes</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestão de registros de acidentes</p>
          </div>
          <Link to="/acidentes/novo" className="animate-slide-up stagger-1" style={{opacity: 0}}>
            <Button 
              className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
              data-testid="new-accident-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Acidente
            </Button>
          </Link>
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
                <SelectTrigger className="w-full md:w-40 rounded-xl border-slate-200" data-testid="filter-status">
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
                <SelectTrigger className="w-full md:w-40 rounded-xl border-slate-200" data-testid="filter-gravidade">
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
                <SelectTrigger className="w-full md:w-40 rounded-xl border-slate-200" data-testid="filter-origem">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="WEB_POLICIA">Polícia</SelectItem>
                  <SelectItem value="MOBILE_CIDADAO">Cidadão</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={fetchAcidentes} data-testid="refresh-btn" className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
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
                    <TableRow key={acidente.acidente_id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-500">
                        {acidente.acidente_id?.slice(-8)}
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg hover:bg-slate-100" data-testid={`action-menu-${acidente.acidente_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                            <DropdownMenuItem onClick={() => navigate(`/acidentes/${acidente.acidente_id}`)} className="rounded-lg">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/acidentes/${acidente.acidente_id}/editar`)} className="rounded-lg">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 rounded-lg"
                              onClick={() => handleDelete(acidente.acidente_id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
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
        <div className="flex items-center justify-between text-xs text-slate-400 animate-slide-up stagger-4" style={{opacity: 0}}>
          <span className="font-medium">Mostrando {filteredAcidentes.length} de {acidentes.length} acidentes</span>
        </div>
      </div>
    </Layout>
  );
}
