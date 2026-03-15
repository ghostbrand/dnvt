import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { Loader2 } from 'lucide-react';
import { useNotifications } from './hooks/useWebSocket';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import MapaPage from './pages/MapaPage';
import AcidentesPage from './pages/AcidentesPage';
import NovoAcidentePage from './pages/NovoAcidentePage';
import AcidenteDetalhesPage from './pages/AcidenteDetalhesPage';
import BoletinsPage from './pages/BoletinsPage';
import NovoBoletimPage from './pages/NovoBoletimPage';
import BoletimDetalhesPage from './pages/BoletimDetalhesPage';
import ZonasCriticasPage from './pages/ZonasCriticasPage';
import AssistenciasPage from './pages/AssistenciasPage';
import EstatisticasPage from './pages/EstatisticasPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import PerfilPage from './pages/PerfilPage';
import UtilizadoresPage from './pages/UtilizadoresPage';
import HistoricoPage from './pages/HistoricoPage';
import CidadaosPage from './pages/CidadaosPage';
import NotificacoesHistoricoPage from './pages/NotificacoesHistoricoPage';
import NotificacoesCidadaoPage from './pages/NotificacoesCidadaoPage';
import NotificacoesAgentePage from './pages/NotificacoesAgentePage';

// Notifications wrapper component
function NotificationsProvider({ children }) {
  useNotifications();
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <NotificationsProvider>{children}</NotificationsProvider>;
}

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id (OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      
      <Route path="/mapa" element={
        <ProtectedRoute><MapaPage /></ProtectedRoute>
      } />
      
      <Route path="/acidentes" element={
        <ProtectedRoute><AcidentesPage /></ProtectedRoute>
      } />
      
      <Route path="/acidentes/novo" element={
        <ProtectedRoute><NovoAcidentePage /></ProtectedRoute>
      } />
      
      <Route path="/acidentes/:id" element={
        <ProtectedRoute><AcidenteDetalhesPage /></ProtectedRoute>
      } />
      
      <Route path="/boletins" element={
        <ProtectedRoute><BoletinsPage /></ProtectedRoute>
      } />
      
      <Route path="/boletins/novo" element={
        <ProtectedRoute><NovoBoletimPage /></ProtectedRoute>
      } />
      
      <Route path="/boletins/:id" element={
        <ProtectedRoute><BoletimDetalhesPage /></ProtectedRoute>
      } />
      
      <Route path="/zonas-criticas" element={
        <ProtectedRoute><ZonasCriticasPage /></ProtectedRoute>
      } />
      
      <Route path="/assistencias" element={
        <ProtectedRoute><AssistenciasPage /></ProtectedRoute>
      } />
      
      <Route path="/estatisticas" element={
        <ProtectedRoute><EstatisticasPage /></ProtectedRoute>
      } />
      
      <Route path="/configuracoes" element={
        <ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>
      } />
      
      <Route path="/perfil" element={
        <ProtectedRoute><PerfilPage /></ProtectedRoute>
      } />
      
      <Route path="/utilizadores" element={
        <ProtectedRoute><UtilizadoresPage /></ProtectedRoute>
      } />
      
      <Route path="/historico" element={
        <ProtectedRoute><HistoricoPage /></ProtectedRoute>
      } />
      
      <Route path="/cidadaos" element={
        <ProtectedRoute><CidadaosPage /></ProtectedRoute>
      } />
      
      <Route path="/notificacoes-historico" element={
        <ProtectedRoute><NotificacoesHistoricoPage /></ProtectedRoute>
      } />
      
      <Route path="/notificacoes/cidadao" element={
        <ProtectedRoute><NotificacoesCidadaoPage /></ProtectedRoute>
      } />
      
      <Route path="/notificacoes/agente" element={
        <ProtectedRoute><NotificacoesAgentePage /></ProtectedRoute>
      } />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          richColors
          expand={false}
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              borderRadius: '16px',
              padding: '14px 18px',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(8px)',
            },
            classNames: {
              success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              error: 'bg-red-50 text-red-800 border-red-200',
              warning: 'bg-amber-50 text-amber-800 border-amber-200',
              info: 'bg-blue-50 text-blue-800 border-blue-200',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
