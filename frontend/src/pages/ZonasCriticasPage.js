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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Zonas Críticas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Identificação e análise de áreas de risco</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            <Button 
              variant="outline" 
              onClick={calcularZonas}
              disabled={calculating}
              data-testid="calculate-zones-btn"
              className="rounded-xl border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all"
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Calcular Zonas
            </Button>
            <Button variant="outline" onClick={fetchZonas} className="rounded-xl border-slate-200 hover:bg-slate-100 w-10 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Calculated Zones Preview */}
        {zonasCalculadas.length > 0 && (
          <Card className="border-0 shadow-md shadow-amber-200/30 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/50 animate-slide-up stagger-2" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-200/50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                </div>
                Zonas Identificadas Automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zonasCalculadas.map((zona, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-slate-500">
                        {zona.latitude_centro.toFixed(4)}, {zona.longitude_centro.toFixed(4)}
                      </span>
                      {getRiskBadge(zona.nivel_risco)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-700"><strong>{zona.total_acidentes}</strong> acidentes ({zona.acidentes_graves} graves)</p>
                      <p className="text-slate-400 text-xs">Causa: {zona.causa_mais_frequente?.replace(/_/g, ' ') || 'N/A'}</p>
                      {zona.recomendacao_melhoria && (
                        <p className="text-amber-700 flex items-start gap-1 mt-2 text-xs">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
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
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-3" style={{opacity: 0}}>
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-lg font-bold text-[#1B2A4A]">Zonas Validadas</CardTitle>
            <p className="text-xs text-slate-400">Áreas de risco confirmadas</p>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : zonas.length === 0 ? (
              <div className="text-center py-12 text-slate-300">
                <AlertTriangle className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-400">Nenhuma zona crítica registrada</p>
                <p className="text-xs text-slate-300 mt-1">Use "Calcular Zonas" para identificar áreas de risco</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zonas.map((zona, idx) => (
                  <div 
                    key={zona.zona_id} 
                    className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden card-interactive animate-slide-up"
                    style={{ animationDelay: `${0.15 + idx * 0.05}s`, opacity: 0 }}
                  >
                    <div className={`h-1.5 ${
                      zona.nivel_risco === 'ALTO' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                      zona.nivel_risco === 'MEDIO' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                      'bg-gradient-to-r from-emerald-400 to-teal-500'
                    }`} />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            zona.nivel_risco === 'ALTO' ? 'bg-red-100' :
                            zona.nivel_risco === 'MEDIO' ? 'bg-amber-100' : 'bg-emerald-100'
                          }`}>
                            <MapPin className={`w-4 h-4 ${
                              zona.nivel_risco === 'ALTO' ? 'text-red-600' :
                              zona.nivel_risco === 'MEDIO' ? 'text-amber-600' : 'text-emerald-600'
                            }`} />
                          </div>
                          <span className="font-semibold text-sm text-slate-800">{zona.nome || 'Zona sem nome'}</span>
                        </div>
                        {getRiskBadge(zona.nivel_risco)}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Coordenadas</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {zona.latitude_centro.toFixed(4)}, {zona.longitude_centro.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Raio</span>
                          <span className="text-xs font-medium text-slate-600">{zona.raio_metros}m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Total Acidentes</span>
                          <span className="text-sm font-bold text-slate-800">{zona.total_acidentes}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs">Graves</span>
                          <span className="text-sm font-bold text-red-600">{zona.acidentes_graves}</span>
                        </div>
                        {zona.causa_mais_frequente && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">Causa Principal</span>
                            <span className="text-[11px] font-medium text-slate-600">{zona.causa_mais_frequente.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {zona.recomendacao_melhoria && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {zona.recomendacao_melhoria}
                        </div>
                      )}
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-xs font-medium ${zona.validado ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {zona.validado ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validado
                            </span>
                          ) : 'Pendente validação'}
                        </span>
                        
                        {!zona.validado && (user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="rounded-xl text-xs font-semibold border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => validarZona(zona.zona_id)}
                          >
                            Validar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
