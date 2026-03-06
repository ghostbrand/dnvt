import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        toast.error('Sessão inválida');
        navigate('/login');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        await googleLogin(sessionId);
        toast.success('Login com Google realizado!');
        navigate('/dashboard');
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error(error.message || 'Erro ao autenticar com Google');
        navigate('/login');
      }
    };

    processAuth();
  }, [googleLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-slate-900 mx-auto mb-4" />
        <p className="text-slate-600">Autenticando...</p>
      </div>
    </div>
  );
}
