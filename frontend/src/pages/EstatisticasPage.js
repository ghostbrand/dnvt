import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { estatisticasApi } from '../services/api';
import { 
  BarChart3, 
  Download, 
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#DC2626', '#D97706', '#059669', '#2563EB', '#7C3AED', '#EC4899'];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function EstatisticasPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resumo, hourly, weekly, monthly] = await Promise.all([
        estatisticasApi.resumo(),
        estatisticasApi.porHora(),
        estatisticasApi.porDiaSemana(),
        estatisticasApi.mensal(selectedYear, selectedMonth)
      ]);
      setStats(resumo);
      setHourlyData(hourly);
      setWeeklyData(weekly);
      setMonthlyStats(monthly);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const gravidadeData = stats ? [
    { name: 'Leve', value: stats.por_gravidade?.LEVE || 0 },
    { name: 'Moderado', value: stats.por_gravidade?.MODERADO || 0 },
    { name: 'Grave', value: stats.por_gravidade?.GRAVE || 0 },
    { name: 'Fatal', value: stats.por_gravidade?.FATAL || 0 },
  ].filter(d => d.value > 0) : [];

  const causaData = stats ? Object.entries(stats.por_causa || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  })).sort((a, b) => b.value - a.value).slice(0, 6) : [];

  const tipoData = stats ? Object.entries(stats.por_tipo || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  })).sort((a, b) => b.value - a.value) : [];

  const exportCSV = () => {
    const data = [
      ['Estatísticas Gerais'],
      ['Total de Acidentes', stats?.total_acidentes || 0],
      ['Acidentes Hoje', stats?.acidentes_hoje || 0],
      ['Acidentes Este Mês', stats?.acidentes_mes || 0],
      ['Acidentes Graves/Fatais', stats?.acidentes_graves || 0],
      [''],
      ['Por Gravidade'],
      ...gravidadeData.map(d => [d.name, d.value]),
      [''],
      ['Por Causa'],
      ...causaData.map(d => [d.name, d.value]),
    ];
    
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estatisticas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Relatório exportado');
  };

  if (loading && !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="estatisticas-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estatísticas</h1>
            <p className="text-slate-500 text-sm">Análise de dados de acidentes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} data-testid="export-btn">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-400" />
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total Geral</p>
              <p className="text-3xl font-bold font-mono">{stats?.total_acidentes || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Este Mês</p>
              <p className="text-3xl font-bold font-mono">{monthlyStats?.total_acidentes || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Graves</p>
              <p className="text-3xl font-bold font-mono text-orange-600">{monthlyStats?.acidentes_graves || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Fatais</p>
              <p className="text-3xl font-bold font-mono text-red-600">{monthlyStats?.acidentes_fatais || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Acidentes por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="acidentes" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Acidentes por Dia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="acidentes" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By Severity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Por Gravidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {gravidadeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gravidadeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
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
                    Sem dados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Cause */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Principais Causas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {causaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={causaData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#D97706" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Sem dados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Por Tipo de Acidente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {tipoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tipoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Sem dados
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
