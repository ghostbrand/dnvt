import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { acidentesApi, assistenciasApi, boletinsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  User,
  Car,
  AlertTriangle,
  Ambulance,
  Edit,
  Trash2,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  Shield,
  Flame
} from 'lucide-react';
import { toast } from 'sonner';

const GRAVIDADES = ['LEVE', 'MODERADO', 'GRAVE', 'FATAL'];
const STATUS = ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO', 'ENCERRADO'];

export default function AcidenteDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [acidente, setAcidente] = useState(null);
  const [assistencias, setAssistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [assistDialog, setAssistDialog] = useState(false);
  const [newAssist, setNewAssist] = useState({ tipo: 'AMBULANCIA' });

  const [editForm, setEditForm] = useState({
    status: '',
    gravidade: '',
    descricao: '',
    confirmado_oficialmente: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acidenteData, assistData] = await Promise.all([
          acidentesApi.get(id),
          assistenciasApi.list({ acidente_id: id })
        ]);
        setAcidente(acidenteData);
        setAssistencias(assistData);
        setEditForm({
          status: acidenteData.status,
          gravidade: acidenteData.gravidade,
          descricao: acidenteData.descricao,
          confirmado_oficialmente: acidenteData.confirmado_oficialmente
        });
      } catch (error) {
        toast.error('Erro ao carregar acidente');
        navigate('/acidentes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await acidentesApi.update(id, editForm);
      setAcidente(updated);
      setEditMode(false);
      toast.success('Acidente atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await acidentesApi.delete(id);
      toast.success('Acidente removido');
      navigate('/acidentes');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const handleCreateAssistencia = async () => {
    try {
      await assistenciasApi.create({ acidente_id: id, ...newAssist });
      toast.success('Assistência enviada');
      setAssistDialog(false);
      // Refresh assistencias
      const assistData = await assistenciasApi.list({ acidente_id: id });
      setAssistencias(assistData);
      // Refresh acidente status
      const acidenteData = await acidentesApi.get(id);
      setAcidente(acidenteData);
    } catch (error) {
      toast.error('Erro ao criar assistência');
    }
  };

  const handleCreateBoletim = async () => {
    try {
      const boletim = await boletinsApi.create({ acidente_id: id });
      toast.success('Boletim criado');
      navigate(`/boletins/${boletim.boletim_id}`);
    } catch (error) {
      toast.error('Erro ao criar boletim');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!acidente) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Acidente não encontrado</p>
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      REPORTADO: 'bg-yellow-100 text-yellow-800',
      VALIDADO: 'bg-blue-100 text-blue-800',
      EM_ATENDIMENTO: 'bg-orange-100 text-orange-800',
      ENCERRADO: 'bg-green-100 text-green-800'
    };
    return <Badge className={styles[status]}>{status?.replace(/_/g, ' ')}</Badge>;
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

  const canEdit = user?.tipo === 'ADMIN' || user?.tipo === 'POLICIA';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="acidente-detalhes-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Detalhes do Acidente</h1>
              <p className="text-slate-500 text-sm font-mono">{acidente.acidente_id}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Cancelar' : 'Editar'}
              </Button>
              <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Remoção</DialogTitle>
                    <DialogDescription>
                      Esta ação não pode ser desfeita. Deseja realmente remover este acidente?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete}>Remover</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Status & Gravidade */}
        <div className="flex items-center gap-4">
          {getGravidadeBadge(acidente.gravidade)}
          {getStatusBadge(acidente.status)}
          {acidente.confirmado_oficialmente && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Confirmado Oficialmente
            </Badge>
          )}
        </div>

        {editMode ? (
          /* Edit Form */
          <Card>
            <CardHeader>
              <CardTitle>Editar Acidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gravidade</Label>
                  <Select value={editForm.gravidade} onValueChange={(v) => setEditForm({...editForm, gravidade: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVIDADES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({...editForm, descricao: e.target.value})}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.confirmado_oficialmente}
                  onChange={(e) => setEditForm({...editForm, confirmado_oficialmente: e.target.checked})}
                  className="rounded"
                />
                <Label>Confirmado Oficialmente</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* View Mode */
          <>
            {/* Main Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Informações do Acidente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Tipo</p>
                      <p className="font-medium">{acidente.tipo_acidente?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Causa Principal</p>
                      <p className="font-medium">{acidente.causa_principal?.replace(/_/g, ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Nº Vítimas</p>
                      <p className="font-mono text-xl font-bold">{acidente.numero_vitimas}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Nº Veículos</p>
                      <p className="font-mono text-xl font-bold">{acidente.numero_veiculos}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Descrição</p>
                    <p className="text-sm">{acidente.descricao}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Coordenadas</p>
                    <p className="font-mono">{acidente.latitude.toFixed(6)}, {acidente.longitude.toFixed(6)}</p>
                  </div>
                  {acidente.endereco && (
                    <div>
                      <p className="text-sm text-slate-500">Endereço</p>
                      <p className="text-sm">{acidente.endereco}</p>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" asChild>
                    <a 
                      href={`https://www.google.com/maps?q=${acidente.latitude},${acidente.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Ver no Google Maps
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Histórico / Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Registro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Criado em</p>
                    <p className="font-medium">{new Date(acidente.created_at).toLocaleString('pt-AO')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Atualizado em</p>
                    <p className="font-medium">{new Date(acidente.updated_at).toLocaleString('pt-AO')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Registrado por</p>
                    <p className="font-mono text-sm">{acidente.created_by || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Origem</p>
                    <Badge variant="outline">{acidente.origem_registro?.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assistências */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ambulance className="w-5 h-5" />
                    Assistências
                  </CardTitle>
                  <CardDescription>Equipas de socorro enviadas</CardDescription>
                </div>
                {canEdit && (
                  <Dialog open={assistDialog} onOpenChange={setAssistDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Enviar Assistência
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enviar Assistência</DialogTitle>
                        <DialogDescription>Selecione o tipo de assistência a enviar</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label>Tipo de Assistência</Label>
                        <Select value={newAssist.tipo} onValueChange={(v) => setNewAssist({...newAssist, tipo: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AMBULANCIA">Ambulância</SelectItem>
                            <SelectItem value="POLICIA">Polícia</SelectItem>
                            <SelectItem value="BOMBEIRO">Bombeiros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAssistDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateAssistencia}>Enviar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {assistencias.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Nenhuma assistência enviada</p>
                ) : (
                  <div className="space-y-3">
                    {assistencias.map(assist => (
                      <div key={assist.assistencia_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {assist.tipo === 'AMBULANCIA' && <Ambulance className="w-5 h-5 text-blue-600" />}
                          {assist.tipo === 'POLICIA' && <Shield className="w-5 h-5 text-slate-700" />}
                          {assist.tipo === 'BOMBEIRO' && <Flame className="w-5 h-5 text-red-600" />}
                          <div>
                            <p className="font-medium">{assist.tipo}</p>
                            <p className="text-xs text-slate-500">
                              Início: {new Date(assist.hora_inicio).toLocaleTimeString('pt-AO')}
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          assist.status === 'A_CAMINHO' ? 'bg-amber-500 animate-pulse' :
                          assist.status === 'NO_LOCAL' ? 'bg-blue-500' : 'bg-green-500'
                        }>
                          {assist.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {canEdit && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1" onClick={handleCreateBoletim}>
                      <FileText className="w-4 h-4 mr-2" />
                      Gerar Boletim de Ocorrência
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link to="/mapa">
                        <MapPin className="w-4 h-4 mr-2" />
                        Ver no Mapa
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
