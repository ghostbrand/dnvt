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
  AlertTriangle,
  Skull,
  ShieldAlert
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
const COLORS_RICH = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DarkTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1B2A4A] text-white px-4 py-2.5 rounded-xl shadow-xl text-sm">
        <p className="font-semibold">{label}</p>
        <p className="text-blue-300">{payload[0].value} acidentes</p>
      </div>
    );
  }
  return null;
};

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
      setHourlyData(Array.isArray(hourly) ? hourly : (hourly?.dados || []));
      setWeeklyData(Array.isArray(weekly) ? weekly : (weekly?.dados || []));
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
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  const summaryCards = [
    { label: 'Total Geral', value: stats?.total_acidentes || 0, icon: BarChart3, color: 'text-[#1B2A4A]', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Este Mês', value: monthlyStats?.total_acidentes || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { label: 'Graves', value: monthlyStats?.acidentes_graves || 0, icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', iconColor: 'text-orange-600' },
    { label: 'Fatais', value: monthlyStats?.acidentes_fatais || 0, icon: Skull, color: 'text-red-600', bg: 'bg-red-50', iconColor: 'text-red-600' },
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="estatisticas-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Estatísticas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Análise detalhada de dados de acidentes</p>
          </div>
          <div className="flex gap-2 animate-slide-up stagger-1" style={{opacity: 0}}>
            <Button 
              variant="outline" 
              onClick={exportCSV} 
              data-testid="export-btn" 
              className="rounded-xl border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchData} 
              className="rounded-xl border-slate-200 hover:bg-slate-100 transition-all w-10 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold">Período</span>
              </div>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-40 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl card-interactive animate-slide-up" style={{ animationDelay: `${0.1 + idx * 0.05}s`, opacity: 0 }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className={`text-3xl font-extrabold tracking-tight ${card.color}`}>{card.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-3" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Acidentes por Hora</CardTitle>
              <p className="text-xs text-slate-400">Distribuição horária</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-72">
                {Array.isArray(hourlyData) && hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                      <Bar dataKey="acidentes" fill="url(#hourlyGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados disponíveis</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Distribution */}
          <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-4" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Acidentes por Dia da Semana</CardTitle>
              <p className="text-xs text-slate-400">Distribuição semanal</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-72">
                {Array.isArray(weeklyData) && weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                      <Bar dataKey="acidentes" fill="url(#weeklyGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados disponíveis</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By Severity */}
          <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-5" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Por Gravidade</CardTitle>
              <p className="text-xs text-slate-400">Distribuição por severidade</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-52">
                {gravidadeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gravidadeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {gravidadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1B2A4A', border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <AlertTriangle className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados</p>
                  </div>
                )}
              </div>
              {gravidadeData.length > 0 && (
                <div className="space-y-2 mt-2">
                  {gravidadeData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                        <span className="text-sm font-medium text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Cause */}
          <Card className="lg:col-span-2 border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-6" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Principais Causas</CardTitle>
              <p className="text-xs text-slate-400">Top causas de acidentes</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-64">
                {causaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={causaData} layout="vertical" barCategoryGap="20%">
                      <defs>
                        <linearGradient id="causaGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }} />
                      <Bar dataKey="value" fill="url(#causaGrad)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type Distribution */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-lg font-bold text-[#1B2A4A]">Por Tipo de Acidente</CardTitle>
            <p className="text-xs text-slate-400">Classificação por tipo</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-72">
              {tipoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tipoData} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="tipoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={80} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                    <Bar dataKey="value" fill="url(#tipoGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
