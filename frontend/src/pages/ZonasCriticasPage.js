import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { zonasApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  MapPin, 
  RefreshCw,
  CheckCircle,
  Target,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

export default function ZonasCriticasPage() {
  const { user } = useAuth();
  const [zonas, setZonas] = useState([]);
  const [zonasCalculadas, setZonasCalculadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchZonas = async () => {
    setLoading(true);
    try {
      const data = await zonasApi.list();
      setZonas(data);
    } catch (error) {
      toast.error('Erro ao carregar zonas');
    } finally {
      setLoading(false);
    }
  };

  const calcularZonas = async () => {
    setCalculating(true);
    try {
      const data = await zonasApi.calcular();
      setZonasCalculadas(data);
      toast.success(`${data.length} zonas críticas identificadas`);
    } catch (error) {
      toast.error('Erro ao calcular zonas');
    } finally {
      setCalculating(false);
    }
  };

  const validarZona = async (zonaId) => {
    try {
      await zonasApi.validar(zonaId);
      toast.success('Zona validada com sucesso');
      fetchZonas();
    } catch (error) {
      toast.error('Erro ao validar zona');
    }
  };

  useEffect(() => {
    fetchZonas();
  }, []);

  const getRiskBadge = (nivel) => {
    const styles = {
      ALTO: 'bg-red-600 text-white',
      MEDIO: 'bg-amber-500 text-white',
      BAIXO: 'bg-green-600 text-white'
    };
    return <Badge className={styles[nivel]}>{nivel}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="zonas-criticas-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Zonas Críticas</h1>
            <p className="text-slate-500 text-sm">Identificação e análise de áreas de risco</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={calcularZonas}
              disabled={calculating}
              data-testid="calculate-zones-btn"
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Calcular Zonas
            </Button>
            <Button variant="outline" onClick={fetchZonas}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Calculated Zones Preview */}
        {zonasCalculadas.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Zonas Identificadas Automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zonasCalculadas.map((zona, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">
                        {zona.latitude_centro.toFixed(4)}, {zona.longitude_centro.toFixed(4)}
                      </span>
                      {getRiskBadge(zona.nivel_risco)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>{zona.total_acidentes}</strong> acidentes ({zona.acidentes_graves} graves)</p>
                      <p className="text-slate-500">Causa: {zona.causa_mais_frequente?.replace(/_/g, ' ') || 'N/A'}</p>
                      {zona.recomendacao_melhoria && (
                        <p className="text-amber-700 flex items-start gap-1 mt-2">
                          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {zona.recomendacao_melhoria}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validated Zones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Zonas Validadas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : zonas.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma zona crítica registrada</p>
                <p className="text-sm">Use "Calcular Zonas" para identificar áreas de risco</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zonas.map((zona) => (
                  <Card key={zona.zona_id} className={`
                    ${zona.nivel_risco === 'ALTO' ? 'border-l-4 border-l-red-500' : ''}
                    ${zona.nivel_risco === 'MEDIO' ? 'border-l-4 border-l-amber-500' : ''}
                    ${zona.nivel_risco === 'BAIXO' ? 'border-l-4 border-l-green-500' : ''}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{zona.nome || 'Zona sem nome'}</span>
                        </div>
                        {getRiskBadge(zona.nivel_risco)}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Coordenadas</span>
                          <span className="font-mono text-xs">
                            {zona.latitude_centro.toFixed(4)}, {zona.longitude_centro.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Raio</span>
                          <span>{zona.raio_metros}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Acidentes</span>
                          <span className="font-bold">{zona.total_acidentes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Graves</span>
                          <span className="text-red-600 font-bold">{zona.acidentes_graves}</span>
                        </div>
                        {zona.causa_mais_frequente && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Causa Principal</span>
                            <span className="text-xs">{zona.causa_mais_frequente.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {zona.recomendacao_melhoria && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          <Lightbulb className="w-3 h-3 inline mr-1" />
                          {zona.recomendacao_melhoria}
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs ${zona.validado ? 'text-green-600' : 'text-slate-400'}`}>
                          {zona.validado ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Validado
                            </span>
                          ) : 'Pendente validação'}
                        </span>
                        
                        {!zona.validado && user?.tipo === 'ADMIN' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => validarZona(zona.zona_id)}
                          >
                            Validar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
