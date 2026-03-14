import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { estatisticasApi, acidentesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  AlertTriangle, 
  Ambulance, 
  MapPin, 
  TrendingUp,
  Activity,
  Siren,
  ArrowRight,
  Clock,
  Zap,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
const GRADIENT_CARDS = [
  { bg: 'from-red-500 to-rose-600', iconBg: 'bg-white/20', shadow: 'shadow-red-500/20' },
  { bg: 'from-amber-500 to-orange-500', iconBg: 'bg-white/20', shadow: 'shadow-amber-500/20' },
  { bg: 'from-blue-500 to-indigo-600', iconBg: 'bg-white/20', shadow: 'shadow-blue-500/20' },
  { bg: 'from-emerald-500 to-teal-600', iconBg: 'bg-white/20', shadow: 'shadow-emerald-500/20' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAccidents, setRecentAccidents] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.nome || user?.name || 'Utilizador';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, accidents, hourly] = await Promise.all([
          estatisticasApi.resumo(),
          acidentesApi.list({ limit: 5 }),
          estatisticasApi.porHora()
        ]);
        setStats(statsData);
        const accList = Array.isArray(accidents) ? accidents : (accidents?.data || accidents?.acidentes || []);
        setRecentAccidents(accList);
        const hourlyArr = Array.isArray(hourly) ? hourly : (hourly?.dados || []);
        setHourlyData(hourlyArr);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const gravidadeData = stats ? [
    { name: 'Leve', value: stats.por_gravidade?.LEVE || 0 },
    { name: 'Moderado', value: stats.por_gravidade?.MODERADO || 0 },
    { name: 'Grave', value: stats.por_gravidade?.GRAVE || 0 },
    { name: 'Fatal', value: stats.por_gravidade?.FATAL || 0 },
  ].filter(d => d.value > 0) : [];

  const getStatusBadge = (status) => {
    const config = {
      REPORTADO: { label: 'Reportado', cls: 'bg-amber-100 text-amber-700' },
      VALIDADO: { label: 'Validado', cls: 'bg-blue-100 text-blue-700' },
      EM_ATENDIMENTO: { label: 'Em Atendimento', cls: 'bg-orange-100 text-orange-700' },
      RESOLVIDO: { label: 'Resolvido', cls: 'bg-emerald-100 text-emerald-700' },
      ENCERRADO: { label: 'Encerrado', cls: 'bg-slate-100 text-slate-600' }
    };
    const c = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>{c.label}</span>;
  };

  const getGravidadeBadge = (gravidade) => {
    const config = {
      FATAL: { cls: 'bg-red-500 text-white', dot: 'bg-red-300' },
      GRAVE: { cls: 'bg-orange-500 text-white', dot: 'bg-orange-300' },
      MODERADO: { cls: 'bg-amber-500 text-white', dot: 'bg-amber-300' },
      LEVE: { cls: 'bg-emerald-500 text-white', dot: 'bg-emerald-300' },
    };
    const c = config[gravidade] || { cls: 'bg-slate-500 text-white', dot: 'bg-slate-300' };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {gravidade}
      </span>
    );
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Acidentes Ativos', value: stats?.acidentes_ativos || 0, icon: AlertTriangle, sub: 'Necessitam atenção', subIcon: Activity },
    { label: 'Acidentes Hoje', value: stats?.acidentes_hoje || 0, icon: Car, sub: 'Últimas 24 horas', subIcon: Clock },
    { label: 'Assistências Ativas', value: stats?.assistencias_ativas || 0, icon: Ambulance, sub: 'Em deslocamento', subIcon: Siren },
    { label: 'Zonas Alto Risco', value: stats?.zonas_criticas_alto_risco || 0, icon: MapPin, sub: 'Identificadas', subIcon: Zap },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1B2A4A] text-white px-4 py-2.5 rounded-xl shadow-xl text-sm">
          <p className="font-semibold">{label}h</p>
          <p className="text-blue-300">{payload[0].value} acidentes</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-slide-up">
            <p className="text-sm font-medium text-slate-400 mb-1">{greeting},</p>
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">{displayName.split(' ')[0]} 👋</h1>
            <p className="text-slate-400 text-sm mt-0.5">Aqui está o resumo de hoje</p>
          </div>
          <Link to="/acidentes/novo" className="animate-slide-up stagger-2" style={{opacity: 0}}>
            <Button 
              className="h-11 px-6 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #DC2626 0%, #E11D48 100%)' }}
              data-testid="new-accident-btn"
            >
              <Siren className="w-4 h-4 mr-2" />
              Registrar Acidente
            </Button>
          </Link>
        </div>

        {/* Stats Cards - Gradient */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            const SubIcon = card.subIcon;
            const gradient = GRADIENT_CARDS[idx];
            return (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient.bg} p-5 text-white card-interactive shadow-lg ${gradient.shadow} animate-slide-up`}
                style={{ animationDelay: `${0.05 + idx * 0.07}s`, opacity: 0 }}
              >
                {/* Decorative circle */}
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white/5" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/80">{card.label}</p>
                    <div className={`w-10 h-10 rounded-xl ${gradient.iconBg} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-4xl font-extrabold tracking-tight">{card.value}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-white/60 text-xs font-medium">
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Distribution */}
          <Card className="lg:col-span-2 border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-4" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-[#1B2A4A]">Acidentes por Hora</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Distribuição nas últimas 24h</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold">
                  <Activity className="w-3.5 h-3.5" />
                  Hoje
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div style={{ width: '100%', height: 260, minHeight: 260 }}>
                {Array.isArray(hourlyData) && hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={hourlyData} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                      <Bar dataKey="acidentes" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados disponíveis</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-5" style={{opacity: 0}}>
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Por Gravidade</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Distribuição por severidade</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div style={{ width: '100%', height: 200, minHeight: 200 }}>
                {gravidadeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={gravidadeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {gravidadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1B2A4A', 
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '13px'
                        }}
                      />
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
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                        <span className="text-sm font-medium text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Accidents */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-6" style={{opacity: 0}}>
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-6">
            <div>
              <CardTitle className="text-lg font-bold text-[#1B2A4A]">Acidentes Recentes</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Últimos registros no sistema</p>
            </div>
            <Link to="/acidentes">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-semibold text-xs">
                Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {recentAccidents.length > 0 ? (
              <div className="space-y-2.5">
                {recentAccidents.map((acidente, idx) => (
                  <Link 
                    key={acidente.acidente_id || acidente._id || idx} 
                    to={`/acidentes/${acidente.acidente_id || acidente._id}`}
                    className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-50/80 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 transition-all duration-200"
                  >
                    {/* Severity indicator */}
                    <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                      acidente.gravidade === 'FATAL' || acidente.gravidade === 'GRAVE' ? 'bg-red-500' :
                      acidente.gravidade === 'MODERADO' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800 truncate">
                          {acidente.tipo_acidente?.replace(/_/g, ' ') || 'Acidente'}
                        </span>
                        {getStatusBadge(acidente.status)}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{acidente.descricao || acidente.endereco || 'Sem descrição'}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {acidente.endereco || `${acidente.latitude?.toFixed(4)}, ${acidente.longitude?.toFixed(4)}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(acidente.created_at).toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="hidden sm:inline-flex">{getGravidadeBadge(acidente.gravidade)}</span>
                      <Eye className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Car className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum acidente registrado</p>
                <p className="text-xs text-slate-300 mt-1">Os registros aparecerão aqui</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Geral', value: stats?.total_acidentes || 0, color: 'text-[#1B2A4A]' },
            { label: 'Este Mês', value: stats?.acidentes_mes || 0, color: 'text-blue-600' },
            { label: 'Graves/Fatais', value: stats?.acidentes_graves || 0, color: 'text-red-600' },
            { label: Object.entries(stats?.por_causa || {}).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || 'Causa Principal', value: Object.entries(stats?.por_causa || {}).sort((a, b) => b[1] - a[1])[0]?.[1] || 0, color: 'text-amber-600' },
          ].map((item, idx) => (
            <Card key={idx} className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl overflow-hidden hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${0.3 + idx * 0.05}s`, opacity: 0 }}>
              <CardContent className="p-5 text-center">
                <p className={`text-3xl font-extrabold tracking-tight ${item.color}`}>{item.value}</p>
                <p className="text-xs font-medium text-slate-400 mt-1 truncate">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
