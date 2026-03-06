import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { assistenciasApi, acidentesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Ambulance, 
  Shield,
  Flame,
  MapPin, 
  RefreshCw,
  Clock,
  CheckCircle,
  Plus,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';

export default function AssistenciasPage() {
  const { user } = useAuth();
  const [assistencias, setAssistencias] = useState([]);
  const [acidentes, setAcidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssist, setNewAssist] = useState({ acidente_id: '', tipo: 'AMBULANCIA' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assistData, acidentesData] = await Promise.all([
        assistenciasApi.list(),
        acidentesApi.listAtivos()
      ]);
      setAssistencias(assistData);
      setAcidentes(acidentesData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const createAssistencia = async () => {
    if (!newAssist.acidente_id) {
      toast.error('Selecione um acidente');
      return;
    }
    
    try {
      await assistenciasApi.create(newAssist);
      toast.success('Assistência criada');
      setDialogOpen(false);
      setNewAssist({ acidente_id: '', tipo: 'AMBULANCIA' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar assistência');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await assistenciasApi.update(id, { status });
      toast.success('Status atualizado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'AMBULANCIA': return <Ambulance className="w-5 h-5 text-blue-600" />;
      case 'POLICIA': return <Shield className="w-5 h-5 text-slate-700" />;
      case 'BOMBEIRO': return <Flame className="w-5 h-5 text-red-600" />;
      default: return <Ambulance className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      A_CAMINHO: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse',
      NO_LOCAL: 'bg-blue-100 text-blue-800 border-blue-200',
      FINALIZADO: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = {
      A_CAMINHO: 'A Caminho',
      NO_LOCAL: 'No Local',
      FINALIZADO: 'Finalizado'
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  const ativas = assistencias.filter(a => a.status !== 'FINALIZADO');
  const finalizadas = assistencias.filter(a => a.status === 'FINALIZADO');

  return (
    <Layout>
      <div className="space-y-6" data-testid="assistencias-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assistências</h1>
            <p className="text-slate-500 text-sm">Gestão de equipas de socorro</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-assist-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Assistência
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Assistência</DialogTitle>
                  <DialogDescription>Envie uma equipa de socorro para um acidente</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Acidente</Label>
                    <Select 
                      value={newAssist.acidente_id} 
                      onValueChange={(v) => setNewAssist({ ...newAssist, acidente_id: v })}
                    >
                      <SelectTrigger data-testid="select-acidente">
                        <SelectValue placeholder="Selecione um acidente" />
                      </SelectTrigger>
                      <SelectContent>
                        {acidentes.map(a => (
                          <SelectItem key={a.acidente_id} value={a.acidente_id}>
                            {a.tipo_acidente?.replace(/_/g, ' ')} - {a.gravidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Assistência</Label>
                    <Select 
                      value={newAssist.tipo} 
                      onValueChange={(v) => setNewAssist({ ...newAssist, tipo: v })}
                    >
                      <SelectTrigger data-testid="select-tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AMBULANCIA">Ambulância</SelectItem>
                        <SelectItem value="POLICIA">Polícia</SelectItem>
                        <SelectItem value="BOMBEIRO">Bombeiros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createAssistencia} className="w-full" data-testid="confirm-assist-btn">
                    Enviar Assistência
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Active Assistances */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-500" />
            Assistências Ativas ({ativas.length})
          </h2>
          
          {ativas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <Ambulance className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma assistência ativa</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ativas.map((assist) => (
                <Card key={assist.assistencia_id} className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(assist.tipo)}
                        <span className="font-medium">{assist.tipo}</span>
                      </div>
                      {getStatusBadge(assist.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="font-mono text-xs">
                          {assist.latitude_atual?.toFixed(4)}, {assist.longitude_atual?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>Início: {new Date(assist.hora_inicio).toLocaleTimeString('pt-AO')}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      {assist.status === 'A_CAMINHO' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => updateStatus(assist.assistencia_id, 'NO_LOCAL')}
                        >
                          Chegou no Local
                        </Button>
                      )}
                      {assist.status === 'NO_LOCAL' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600"
                          onClick={() => updateStatus(assist.assistencia_id, 'FINALIZADO')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Assistances */}
        {finalizadas.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Finalizadas Hoje ({finalizadas.length})
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {finalizadas.slice(0, 8).map((assist) => (
                <Card key={assist.assistencia_id} className="bg-slate-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(assist.tipo)}
                        <span className="text-sm">{assist.tipo}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(assist.hora_fim).toLocaleTimeString('pt-AO')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
