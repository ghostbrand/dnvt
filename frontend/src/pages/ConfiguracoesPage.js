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
  AlertCircle
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
    ombala_sms_balance: null
  });
  
  const [testSms, setTestSms] = useState({
    phone: '',
    message: 'Teste do sistema DNVT'
  });
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await configuracoesApi.get();
        setConfig({
          google_maps_api_key: data.google_maps_api_key || '',
          ombala_token: data.ombala_token || '',
          ombala_sender_name: data.ombala_sender_name || '',
          ombala_sms_balance: data.ombala_sms_balance
        });
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.tipo === 'ADMIN') {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {};
      if (config.google_maps_api_key) updateData.google_maps_api_key = config.google_maps_api_key;
      if (config.ombala_token) updateData.ombala_token = config.ombala_token;
      if (config.ombala_sender_name) updateData.ombala_sender_name = config.ombala_sender_name;
      
      const result = await configuracoesApi.update(updateData);
      setConfig(prev => ({
        ...prev,
        ombala_sms_balance: result.ombala_sms_balance
      }));
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
      setConfig(prev => ({ ...prev, ombala_sms_balance: data.saldo }));
      toast.success('Saldo atualizado');
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

  if (user?.tipo !== 'ADMIN') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96" data-testid="configuracoes-page">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500">Apenas administradores podem acessar as configurações</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="configuracoes-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 text-sm">Gerencie as integrações do sistema</p>
        </div>

        {/* Google Maps API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Google Maps API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="google-api-key">API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="google-api-key"
                  type={showTokens ? 'text' : 'password'}
                  value={config.google_maps_api_key}
                  onChange={(e) => setConfig({ ...config, google_maps_api_key: e.target.value })}
                  placeholder="AIza..."
                  className="pr-10 font-mono text-sm"
                  data-testid="google-api-key-input"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Necessário para Geocoding API, Places API e Directions API
              </p>
            </div>
            
            {config.google_maps_api_key && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">API Key configurada</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ombala SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Ombala SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="ombala-token">Token de Autorização</Label>
                <Input
                  id="ombala-token"
                  type={showTokens ? 'text' : 'password'}
                  value={config.ombala_token}
                  onChange={(e) => setConfig({ ...config, ombala_token: e.target.value })}
                  placeholder="a9eb6ea6-5777-..."
                  className="font-mono text-sm"
                  data-testid="ombala-token-input"
                />
              </div>
              
              <div>
                <Label htmlFor="ombala-sender">Nome do Remetente</Label>
                <Input
                  id="ombala-sender"
                  type="text"
                  value={config.ombala_sender_name}
                  onChange={(e) => setConfig({ ...config, ombala_sender_name: e.target.value })}
                  placeholder="DNVT"
                  maxLength={11}
                  data-testid="ombala-sender-input"
                />
                <p className="text-xs text-slate-500 mt-1">Máximo 11 caracteres</p>
              </div>
            </div>
            
            {/* SMS Balance */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-500">Saldo de SMS</p>
                <p className="text-2xl font-bold font-mono">
                  {config.ombala_sms_balance !== null ? config.ombala_sms_balance : '—'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshSmsBalance}
                disabled={!config.ombala_token}
                data-testid="refresh-balance-btn"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Atualizar
              </Button>
            </div>
            
            <Separator />
            
            {/* Test SMS */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Testar Envio de SMS</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="test-phone">Número</Label>
                  <Input
                    id="test-phone"
                    type="tel"
                    value={testSms.phone}
                    onChange={(e) => setTestSms({ ...testSms, phone: e.target.value })}
                    placeholder="923456789"
                    data-testid="test-phone-input"
                  />
                </div>
                <div>
                  <Label htmlFor="test-message">Mensagem</Label>
                  <Input
                    id="test-message"
                    type="text"
                    value={testSms.message}
                    onChange={(e) => setTestSms({ ...testSms, message: e.target.value })}
                    placeholder="Mensagem de teste"
                    data-testid="test-message-input"
                  />
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleTestSms}
                disabled={sendingSms || !config.ombala_token || !config.ombala_sender_name}
                data-testid="send-test-sms-btn"
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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800"
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
