import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapPin, BarChart3, Shield, Siren, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import logoDnvt from '../img/Logo_DTSER.png';
import logoGov from '../img/logo-g.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MapPin, title: 'Geolocalização', desc: 'Rastreamento em tempo real' },
    { icon: BarChart3, title: 'Estatísticas', desc: 'Análise automática de dados' },
    { icon: Shield, title: 'Zonas Críticas', desc: 'Identificação inteligente' },
    { icon: Siren, title: 'Assistência', desc: 'Coordenação de resposta' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #132040 40%, #1a2d52 70%, #1e3a6e 100%)'
      }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-10">
          {/* Top logos — gov logo first */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <img src={logoGov} alt="Governo de Angola" className="h-14 object-contain" />
              <div className="w-px h-10 bg-white/15" />
              <div className="flex items-center gap-3">
                <img src={logoDnvt} alt="DNVT" className="w-12 h-12 object-contain drop-shadow-lg" />
                <div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">DNVT</h1>
                  <p className="text-blue-300/60 text-xs font-medium tracking-wider uppercase">Segurança Rodoviária</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="animate-slide-up">
              <p className="text-blue-400 text-sm font-semibold tracking-wider uppercase mb-4">Sistema Nacional de Trânsito</p>
              <h2 className="text-5xl font-extrabold text-white mb-4 leading-[1.1]">
                Monitoramento<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Inteligente</span> de<br />
                Acidentes
              </h2>
              <p className="text-blue-200/50 text-lg max-w-md leading-relaxed">
                Plataforma integrada para gestão e prevenção de acidentes rodoviários em Angola.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 mt-10 max-w-md">
              {features.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={feat.title}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-300 group animate-slide-up"
                    style={{ animationDelay: `${0.1 + i * 0.08}s`, opacity: 0 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-none">{feat.title}</p>
                      <p className="text-blue-300/40 text-[11px] mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <p className="text-blue-400/30 text-xs">© 2026 Polícia Nacional — República de Angola</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-[hsl(220,20%,97%)] relative">
        {/* Mobile header with logos */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <img src={logoGov} alt="Governo de Angola" className="h-10 object-contain" />
          <div className="w-px h-8 bg-slate-200" />
          <img src={logoDnvt} alt="DNVT" className="w-10 h-10 object-contain" />
          <div>
            <span className="text-xl font-extrabold text-[#1B2A4A] block leading-none">DNVT</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Segurança Rodoviária</span>
          </div>
        </div>

        <div className="w-full max-w-[420px] animate-scale-in">
          {/* Welcome header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-[#1B2A4A]">Acesso ao Sistema</h2>
            <p className="text-slate-400 text-sm mt-1">Insira as suas credenciais para continuar</p>
          </div>

          {/* Form Card — Login only */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-11 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    data-testid="login-email-input"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-11 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    data-testid="login-password-input"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Entrar
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-300 mt-5">
              Acesso exclusivo para operadores autorizados
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <p className="text-slate-300 text-xs">© 2026 República de Angola</p>
          </div>
        </div>
      </div>
    </div>
  );
}
