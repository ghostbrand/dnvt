import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  LayoutDashboard,
  Map,
  Car,
  FileText,
  AlertTriangle,
  Ambulance,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Users,
  History,
  Shield,
  UserCheck
} from 'lucide-react';
import logoDnvt from '../img/Logo_DTSER.png';
import logoGov from '../img/logo-g.png';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mapa', href: '/mapa', icon: Map },
  { name: 'Acidentes', href: '/acidentes', icon: Car },
  { name: 'Boletins', href: '/boletins', icon: FileText },
  { name: 'Zonas Críticas', href: '/zonas-criticas', icon: AlertTriangle },
  { name: 'Assistências', href: '/assistencias', icon: Ambulance },
  { name: 'Estatísticas', href: '/estatisticas', icon: BarChart3 },
];

const adminNavigation = [
  { name: 'Utilizadores', href: '/utilizadores', icon: Users },
  { name: 'Cidadãos', href: '/cidadaos', icon: UserCheck },
  { name: 'Histórico', href: '/historico', icon: History },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

const SIDEBAR_EXPANDED_W = 260;
const SIDEBAR_COLLAPSED_W = 72;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const expanded = !collapsed || hovered;

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/acidentes/ativos`);
        if (res.ok) {
          const data = await res.json();
          setActiveAlertsCount(data.length);
        }
      } catch (err) {
        // silent
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.nome || user?.name || 'Utilizador';
  const displayRole = user?.tipo || user?.role || '';
  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';

  // Main content always uses collapsed width; sidebar overlays on hover
  const contentMargin = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;
  const sidebarWidth = expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

  const NavItem = useCallback(({ item, badge }) => {
    const isActive = location.pathname === item.href ||
      (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
        className={cn(
          "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
          expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center",
          isActive
            ? "text-white shadow-md"
            : "text-slate-400 hover:text-white hover:bg-white/10"
        )}
        style={isActive ? {
          background: 'linear-gradient(135deg, hsl(220 70% 50%) 0%, hsl(220 75% 60%) 100%)',
          boxShadow: '0 4px 15px hsl(220 70% 50% / 0.3)'
        } : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
          isActive ? "bg-white/20" : "bg-white/5"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        {expanded && (
          <span className="text-[13px] truncate">{item.name}</span>
        )}
        {expanded && badge}
      </Link>
    );

    if (!expanded) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-semibold">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linkContent;
  }, [expanded, location.pathname]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[hsl(220,20%,97%)]">
        {/* Mobile sidebar backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full transform transition-all duration-300 ease-out lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            collapsed && hovered && "shadow-2xl shadow-black/30"
          )}
          style={{
            width: `${mobileOpen ? SIDEBAR_EXPANDED_W : sidebarWidth}px`,
            background: 'linear-gradient(180deg, #0a1628 0%, #122042 50%, #162a52 100%)'
          }}
          onMouseEnter={() => collapsed && window.innerWidth >= 1024 && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="flex flex-col h-full">
            {/* Logo Section — logo-g.png first */}
            <div className={cn("border-b border-white/8 transition-all duration-300", expanded ? "px-4 pt-4 pb-3" : "px-2 pt-4 pb-3")}>
              {/* Government logo row */}
              {expanded ? (
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.04] mb-3">
                  <img src={logoGov} alt="Governo de Angola" className="w-9 h-9 object-contain flex-shrink-0" />
                  <p className="text-[11px] font-bold text-white/70 leading-tight truncate">Governo de Angola</p>
                </div>
              ) : (
                <div className="flex justify-center mb-3">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <img src={logoGov} alt="Governo de Angola" className="w-10 h-10 object-contain" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Governo de Angola</TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* DNVT logo row */}
              <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
                <Link to="/dashboard" className={cn("flex items-center group", expanded ? "gap-3" : "")}>
                  <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center group-hover:bg-white/15 transition-all duration-200 flex-shrink-0">
                    <img src={logoDnvt} alt="DNVT" className="w-full h-full object-contain" />
                  </div>
                  {expanded && (
                    <div>
                      <span className="text-base font-extrabold text-white tracking-tight block leading-none">DNVT</span>
                      <span className="text-[9px] text-blue-300/60 font-semibold tracking-[0.12em] uppercase">Segurança Rodoviária</span>
                    </div>
                  )}
                </Link>
                {expanded && (
                  <button
                    className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className={cn("flex-1 py-4 overflow-y-auto space-y-5", expanded ? "px-3" : "px-2")}>
              {/* Main nav */}
              <div>
                {expanded && (
                  <p className="px-3 mb-2 text-[10px] font-bold text-blue-400/40 uppercase tracking-[0.15em]">Menu Principal</p>
                )}
                <div className="space-y-0.5">
                  {navigation.map((item) => (
                    <NavItem
                      key={item.name}
                      item={item}
                      badge={item.name === 'Acidentes' && activeAlertsCount > 0 ? (
                        <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse-slow">
                          {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
                        </span>
                      ) : null}
                    />
                  ))}
                </div>
              </div>

              {/* Admin section */}
              {isAdmin && (
                <div>
                  {expanded ? (
                    <p className="px-3 mb-2 text-[10px] font-bold text-amber-400/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Administração
                    </p>
                  ) : (
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-px bg-amber-400/20 rounded" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {adminNavigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Collapse toggle — desktop only */}
            <div className="hidden lg:flex px-3 pb-1 justify-end">
              <button
                onClick={() => { setCollapsed(!collapsed); setHovered(false); }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* User section */}
            <div className={cn("border-t border-white/8", expanded ? "p-3" : "p-2")}>
              {expanded ? (
                <Link to="/perfil" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex-shrink-0">
                    {getInitials(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                    <p className="text-[10px] text-blue-300/50 truncate capitalize">{displayRole}</p>
                  </div>
                  <LogOut
                    className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
                  />
                </Link>
              ) : (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to="/perfil" className="flex justify-center p-2 rounded-xl hover:bg-white/5 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
                        {getInitials(displayName)}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{displayName}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="transition-all duration-300 lg:ml-[var(--sidebar-w)]" style={{ '--sidebar-w': `${contentMargin}px` }}>
          {/* Top header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(true)}
                data-testid="sidebar-toggle"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>

              {/* Page breadcrumb */}
              <div className="hidden sm:flex items-center">
                {(() => {
                  const allNav = [...navigation, ...adminNavigation, { name: 'Perfil', href: '/perfil', icon: User }];
                  const current = allNav.find(n =>
                    location.pathname === n.href ||
                    (n.href !== '/dashboard' && location.pathname.startsWith(n.href))
                  );
                  if (!current) return null;
                  const Icon = current.icon;
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">{current.name}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                data-testid="notifications-btn"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {activeAlertsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100" data-testid="user-dropdown">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#2B4075] flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(displayName)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-slate-700 leading-none">{displayName?.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{displayRole}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-slate-200/60">
                  <DropdownMenuLabel className="text-xs text-slate-400 font-medium">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="flex items-center gap-2 cursor-pointer rounded-lg">
                      <User className="w-4 h-4" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/configuracoes" className="flex items-center gap-2 cursor-pointer rounded-lg">
                      <Settings className="w-4 h-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer rounded-lg" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
