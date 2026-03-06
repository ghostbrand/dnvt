import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Shield,
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
  Bell
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mapa', href: '/mapa', icon: Map },
  { name: 'Acidentes', href: '/acidentes', icon: Car },
  { name: 'Boletins', href: '/boletins', icon: FileText },
  { name: 'Zonas Críticas', href: '/zonas-criticas', icon: AlertTriangle },
  { name: 'Assistências', href: '/assistencias', icon: Ambulance },
  { name: 'Estatísticas', href: '/estatisticas', icon: BarChart3 },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  useEffect(() => {
    // Fetch active accidents count for notifications
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/acidentes/ativos`);
        if (res.ok) {
          const data = await res.json();
          setActiveAlertsCount(data.length);
        }
      } catch (err) {
        console.error('Error fetching alerts:', err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-white" />
              <span className="text-xl font-bold text-white tracking-tight">DNVT</span>
            </Link>
            <button 
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 bg-blue-600">
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {getInitials(user?.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
                <p className="text-xs text-slate-400 truncate">{user?.tipo}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b shadow-sm">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
            data-testid="sidebar-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button 
              className="relative p-2 rounded-full hover:bg-slate-100"
              data-testid="notifications-btn"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
                </span>
              )}
            </button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="user-dropdown">
                  <Avatar className="w-8 h-8 bg-slate-900">
                    <AvatarFallback className="bg-slate-900 text-white text-xs">
                      {getInitials(user?.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium">{user?.nome?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer" data-testid="logout-btn">
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
  );
}
