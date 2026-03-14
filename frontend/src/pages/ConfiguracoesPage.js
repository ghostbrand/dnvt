import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { configuracoesApi, smsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Key, 
  MapPin, 
  MessageSquare, 
  Save, 
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  
  const [config, setConfig] = useState({
    google_maps_api_key: '',
    ombala_token: '',
    ombala_sender_name: '',
    ombala_sms_balance: null,
    email_host: '',
    email_port: '587',
    email_user: '',
    email_password: '',
    email_from_name: 'DNVT - Sistema de Gestão'
  });
  
  const [testSms, setTestSms] = useState({
    phone: '',
    message: 'Teste do sistema DNVT'
  });
  const [sendingSms, setSendingSms] = useState(false);

  const [testEmail, setTestEmail] = useState({
    to: '',
    subject: 'Teste DNVT — Email Institucional',
    body: 'Este é um email de teste do sistema DNVT.'
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await configuracoesApi.get();
        setConfig(prev => ({
          ...prev,
          google_maps_api_key: data.google_maps_api_key || '',
          ombala_token: data.ombala_token || '',
          ombala_sender_name: data.ombala_sender_name || '',
          ombala_sms_balance: data.ombala_sms_balance ?? null,
          email_host: data.email_host || '',
          email_port: data.email_port || '587',
          email_user: data.email_user || '',
          email_password: data.email_password || '',
          email_from_name: data.email_from_name || 'DNVT - Sistema de Gestão'
        }));
      } catch (error) {
        console.error('Error fetching config:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };
    
    const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';
    if (isAdmin) {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        google_maps_api_key: config.google_maps_api_key,
        ombala_token: config.ombala_token,
        ombala_sender_name: config.ombala_sender_name,
        email_host: config.email_host,
        email_port: config.email_port,
        email_user: config.email_user,
        email_password: config.email_password,
        email_from_name: config.email_from_name
      };
      
      await configuracoesApi.update(updateData);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const refreshSmsBalance = async () => {
    try {
      const data = await smsApi.saldo();
      if (data.error) {
        toast.error(data.error);
        setConfig(prev => ({ ...prev, ombala_sms_balance: null }));
      } else {
        setConfig(prev => ({ ...prev, ombala_sms_balance: data.saldo }));
        toast.success('Saldo atualizado');
      }
    } catch (error) {
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleTestSms = async () => {
    if (!testSms.phone) {
      toast.error('Digite o número de telefone');
      return;
    }
    
    setSendingSms(true);
    try {
      const result = await smsApi.enviar(testSms.phone, testSms.message);
      if (result.success) {
        toast.success('SMS enviado com sucesso');
      } else {
        toast.error(result.error || 'Erro ao enviar SMS');
      }
    } catch (error) {
      toast.error('Erro ao enviar SMS');
    } finally {
      setSendingSms(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.to) {
      toast.error('Digite o email de destino');
      return;
    }
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/email/testar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to: testEmail.to, subject: testEmail.subject, body: testEmail.body })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Email de teste enviado com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao enviar email de teste');
      }
    } catch (error) {
      toast.error('Erro ao enviar email de teste');
    } finally {
      setSendingEmail(false);
    }
  };

  const isAdmin = user?.tipo?.toUpperCase() === 'ADMIN' || user?.role?.toLowerCase() === 'admin';
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96" data-testid="configuracoes-page">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Apenas administradores podem acessar as configurações</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="configuracoes-page">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Configurações</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie as integrações do sistema</p>
        </div>

        {/* Google Maps API */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-1" style={{opacity: 0}}>
          <CardHeader className="pt-5 px-6 pb-3">
            <CardTitle className="flex items-center gap-3 text-[#1B2A4A]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <MapPin className="w-4.5 h-4.5 text-blue-600" />
              </div>
              Google Maps API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="google-api-key" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">API Key</Label>
              <div className="relative">
                <Input
                  id="google-api-key"
                  type={showTokens ? 'text' : 'password'}
                  value={config.google_maps_api_key}
                  onChange={(e) => setConfig({ ...config, google_maps_api_key: e.target.value })}
                  placeholder="AIza..."
                  className="pr-10 font-mono text-sm rounded-xl border-slate-200"
                  data-testid="google-api-key-input"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Necessário para Geocoding API, Places API e Directions API
              </p>
            </div>
            
            {config.google_maps_api_key && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">API Key configurada</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ombala SMS */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardHeader className="pt-5 px-6 pb-3">
            <CardTitle className="flex items-center gap-3 text-[#1B2A4A]">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              Ombala SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ombala-token" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Token de Autorização</Label>
                <Input
                  id="ombala-token"
                  type={showTokens ? 'text' : 'password'}
                  value={config.ombala_token}
                  onChange={(e) => setConfig({ ...config, ombala_token: e.target.value })}
                  placeholder="a9eb6ea6-5777-..."
                  className="font-mono text-sm rounded-xl border-slate-200"
                  data-testid="ombala-token-input"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="ombala-sender" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome do Remetente</Label>
                <Input
                  id="ombala-sender"
                  type="text"
                  value={config.ombala_sender_name}
                  onChange={(e) => setConfig({ ...config, ombala_sender_name: e.target.value })}
                  placeholder="DNVT"
                  maxLength={11}
                  className="rounded-xl border-slate-200"
                  data-testid="ombala-sender-input"
                />
                <p className="text-[11px] text-slate-400">Máximo 11 caracteres</p>
              </div>
            </div>
            
            {/* SMS Balance */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo de SMS</p>
                <p className="text-2xl font-extrabold text-[#1B2A4A] mt-1">
                  {config.ombala_sms_balance !== null ? config.ombala_sms_balance : '—'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshSmsBalance}
                disabled={!config.ombala_token}
                data-testid="refresh-balance-btn"
                className="rounded-xl border-slate-200"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Atualizar
              </Button>
            </div>
            
            <Separator />
            
            {/* Test SMS */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#1B2A4A]">Testar Envio de SMS</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="test-phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</Label>
                  <Input
                    id="test-phone"
                    type="tel"
                    value={testSms.phone}
                    onChange={(e) => setTestSms({ ...testSms, phone: e.target.value })}
                    placeholder="923456789"
                    className="rounded-xl border-slate-200"
                    data-testid="test-phone-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="test-message" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensagem</Label>
                  <Input
                    id="test-message"
                    type="text"
                    value={testSms.message}
                    onChange={(e) => setTestSms({ ...testSms, message: e.target.value })}
                    placeholder="Mensagem de teste"
                    className="rounded-xl border-slate-200"
                    data-testid="test-message-input"
                  />
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleTestSms}
                disabled={sendingSms || !config.ombala_token || !config.ombala_sender_name}
                data-testid="send-test-sms-btn"
                className="rounded-xl border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
              >
                {sendingSms ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Enviar SMS de Teste
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Institucional */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-3" style={{opacity: 0}}>
          <CardHeader className="pt-5 px-6 pb-3">
            <CardTitle className="flex items-center gap-3 text-[#1B2A4A]">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              Email Institucional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <p className="text-[11px] text-slate-400 -mt-1">
              Configuração do email que envia senhas automáticas aos novos utilizadores cadastrados.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Servidor SMTP</Label>
                <Input
                  value={config.email_host}
                  onChange={(e) => setConfig({ ...config, email_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Porta</Label>
                <Input
                  value={config.email_port}
                  onChange={(e) => setConfig({ ...config, email_port: e.target.value })}
                  placeholder="587"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email (Utilizador)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    value={config.email_user}
                    onChange={(e) => setConfig({ ...config, email_user: e.target.value })}
                    placeholder="noreply@dnvt.gov.ao"
                    className="pl-10 rounded-xl border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Senha do Email</Label>
                <Input
                  type={showTokens ? 'text' : 'password'}
                  value={config.email_password}
                  onChange={(e) => setConfig({ ...config, email_password: e.target.value })}
                  placeholder="••••••••"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome do Remetente</Label>
              <Input
                value={config.email_from_name}
                onChange={(e) => setConfig({ ...config, email_from_name: e.target.value })}
                placeholder="DNVT - Sistema de Gestão"
                className="rounded-xl border-slate-200 text-sm"
              />
            </div>
            
            {config.email_host && config.email_user && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">Email institucional configurado</span>
              </div>
            )}

            <Separator />

            {/* Test Email */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#1B2A4A]">Testar Envio de Email</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email de Destino</Label>
                  <Input
                    type="email"
                    value={testEmail.to}
                    onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                    placeholder="teste@email.com"
                    className="rounded-xl border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assunto</Label>
                  <Input
                    type="text"
                    value={testEmail.subject}
                    onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                    placeholder="Assunto do email"
                    className="rounded-xl border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensagem</Label>
                <Input
                  type="text"
                  value={testEmail.body}
                  onChange={(e) => setTestEmail({ ...testEmail, body: e.target.value })}
                  placeholder="Corpo do email de teste"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={sendingEmail || !config.email_host || !config.email_user || !config.email_password}
                className="rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Email de Teste
              </Button>
              {(!config.email_host || !config.email_user || !config.email_password) && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Preencha e salve as configurações SMTP primeiro
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end animate-slide-up stagger-4" style={{opacity: 0}}>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-8 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
            data-testid="save-config-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </Layout>
  );
}
