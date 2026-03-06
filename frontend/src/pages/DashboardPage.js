import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { estatisticasApi, acidentesApi } from '../services/api';
import { 
  Car, 
  AlertTriangle, 
  Ambulance, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Siren,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#DC2626', '#D97706', '#059669', '#2563EB'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentAccidents, setRecentAccidents] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, accidents, hourly] = await Promise.all([
          estatisticasApi.resumo(),
          acidentesApi.list({ limit: 5 }),
          estatisticasApi.porHora()
        ]);
        setStats(statsData);
        setRecentAccidents(accidents);
        setHourlyData(hourly);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const gravidadeData = stats ? [
    { name: 'Leve', value: stats.por_gravidade?.LEVE || 0 },
    { name: 'Moderado', value: stats.por_gravidade?.MODERADO || 0 },
    { name: 'Grave', value: stats.por_gravidade?.GRAVE || 0 },
    { name: 'Fatal', value: stats.por_gravidade?.FATAL || 0 },
  ].filter(d => d.value > 0) : [];

  const getStatusBadge = (status) => {
    const styles = {
      REPORTADO: 'status-badge status-reportado',
      VALIDADO: 'status-badge status-validado',
      EM_ATENDIMENTO: 'status-badge status-em-atendimento',
      ENCERRADO: 'status-badge status-encerrado'
    };
    const labels = {
      REPORTADO: 'Reportado',
      VALIDADO: 'Validado',
      EM_ATENDIMENTO: 'Em Atendimento',
      ENCERRADO: 'Encerrado'
    };
    return <span className={styles[status] || 'status-badge'}>{labels[status] || status}</span>;
  };

  const getSeverityClass = (gravidade) => {
    const classes = {
      LEVE: 'severity-leve',
      MODERADO: 'severity-moderado',
      GRAVE: 'severity-grave',
      FATAL: 'severity-fatal'
    };
    return classes[gravidade] || '';
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm">Visão geral do sistema de acidentes</p>
          </div>
          <Link to="/acidentes/novo">
            <Button className="bg-red-600 hover:bg-red-700" data-testid="new-accident-btn">
              <Siren className="w-4 h-4 mr-2" />
              Registrar Acidente
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Acidentes Ativos</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.acidentes_ativos || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <Activity className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-slate-500">Necessitam atenção</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Acidentes Hoje</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.acidentes_hoje || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Car className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-amber-500 mr-1" />
                <span className="text-slate-500">Últimas 24 horas</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Assistências Ativas</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.assistencias_ativas || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Ambulance className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <Siren className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-slate-500">Em deslocamento</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Zonas Alto Risco</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.zonas_criticas_alto_risco || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <AlertTriangle className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-slate-500">Identificadas</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Acidentes por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 256, minHeight: 256 }}>
                {hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={256} minHeight={256}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="acidentes" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Sem dados disponíveis
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Por Gravidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 256, minHeight: 256 }}>
                {gravidadeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={256} minHeight={256}>
                    <PieChart>
                      <Pie
                        data={gravidadeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {gravidadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Sem dados disponíveis
                  </div>
                )}
              </div>
              {gravidadeData.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {gravidadeData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx] }} />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Accidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Acidentes Recentes</CardTitle>
            <Link to="/acidentes">
              <Button variant="ghost" size="sm" className="text-blue-600">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentAccidents.length > 0 ? (
              <div className="space-y-3">
                {recentAccidents.map((acidente) => (
                  <Link 
                    key={acidente.acidente_id} 
                    to={`/acidentes/${acidente.acidente_id}`}
                    className={`block p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors ${getSeverityClass(acidente.gravidade)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{acidente.tipo_acidente?.replace(/_/g, ' ')}</span>
                          {getStatusBadge(acidente.status)}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-1">{acidente.descricao}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {acidente.latitude.toFixed(4)}, {acidente.longitude.toFixed(4)}
                          </span>
                          <span>{new Date(acidente.created_at).toLocaleString('pt-AO')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          acidente.gravidade === 'FATAL' ? 'bg-red-100 text-red-700' :
                          acidente.gravidade === 'GRAVE' ? 'bg-orange-100 text-orange-700' :
                          acidente.gravidade === 'MODERADO' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {acidente.gravidade}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum acidente registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.total_acidentes || 0}</p>
              <p className="text-sm text-slate-500">Total de Acidentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.acidentes_mes || 0}</p>
              <p className="text-sm text-slate-500">Este Mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600 font-mono">{stats?.acidentes_graves || 0}</p>
              <p className="text-sm text-slate-500">Graves/Fatais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {Object.entries(stats?.por_causa || {}).sort((a, b) => b[1] - a[1])[0]?.[1] || 0}
              </p>
              <p className="text-sm text-slate-500 truncate">
                {Object.entries(stats?.por_causa || {}).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
