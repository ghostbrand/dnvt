import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Edit, 
  Save,
  Loader2,
  Calendar,
  CreditCard,
  MapPin,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PerfilPage() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zonasMonitoradas, setZonasMonitoradas] = useState([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    bilhete_identidade: '',
    endereco: '',
    zonas_notificacao: [],
    alertas_novos_acidentes: true,
    alertas_sonoros: true,
    alertas_sms: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        telefone: user.telefone || '',
        bilhete_identidade: user.bilhete_identidade || '',
        endereco: user.endereco || '',
        zonas_notificacao: user.zonas_notificacao || []
      });
    }
    fetchZonasMonitoradas();
  }, [user]);

  const fetchZonasMonitoradas = async () => {
    try {
      const response = await fetch(`${API}/zonas-criticas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const zonas = await response.json();
        setZonasMonitoradas(zonas.filter(z => z.nivel_risco === 'ALTO'));
      }
    } catch (error) {
      console.error('Error fetching zonas:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/usuarios/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Perfil atualizado com sucesso');
        setEditMode(false);
        // Refresh page to get updated user data
        window.location.reload();
      } else {
        throw new Error('Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const validateBI = async (bi) => {
    // Validação básica do formato do BI angolano
    // Formato: 123456789LA123
    const biRegex = /^[0-9]{9}[A-Z]{2}[0-9]{3}$/;
    if (!biRegex.test(bi)) {
      toast.error('Formato de BI inválido. Use: 123456789LA123');
      return false;
    }
    
    // Aqui poderia integrar com API de validação de BI se disponível
    toast.success('Formato de BI válido');
    return true;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      ADMIN: 'bg-purple-600 text-white',
      POLICIA: 'bg-blue-600 text-white',
      CIDADAO: 'bg-green-600 text-white'
    };
    return <Badge className={styles[tipo] || 'bg-slate-600'}>{tipo}</Badge>;
  };

  if (!user) {
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
      <div className="max-w-3xl mx-auto space-y-6" data-testid="perfil-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
            <p className="text-slate-500 text-sm">Gerencie suas informações pessoais</p>
          </div>
          <Button 
            variant={editMode ? "destructive" : "outline"}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Cancelar' : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Editar Perfil
              </>
            )}
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 bg-slate-900">
                <AvatarFallback className="bg-slate-900 text-white text-xl">
                  {getInitials(user.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold">{user.nome}</h2>
                  {getTipoBadge(user.tipo)}
                </div>
                <p className="text-slate-500">{user.email}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{user.user_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Seus dados pessoais e de contacto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              /* Edit Form */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        placeholder="+244 923 456 789"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bi">Bilhete de Identidade</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="bi"
                          value={formData.bilhete_identidade}
                          onChange={(e) => setFormData({...formData, bilhete_identidade: e.target.value.toUpperCase()})}
                          placeholder="123456789LA123"
                          className="pl-10 font-mono"
                          maxLength={14}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => validateBI(formData.bilhete_identidade)}
                      >
                        Validar
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Formato: 123456789LA123</p>
                  </div>
                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        placeholder="Seu endereço"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Telefone</p>
                    <p className="font-medium">{user.telefone || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Bilhete de Identidade</p>
                    <p className="font-medium font-mono">{user.bilhete_identidade || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Endereço</p>
                    <p className="font-medium">{user.endereco || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Tipo de Conta</p>
                    <p className="font-medium">{user.tipo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Membro desde</p>
                    <p className="font-medium">{new Date(user.created_at).toLocaleDateString('pt-AO')}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Configurações de Alertas
            </CardTitle>
            <CardDescription>Defina como deseja receber notificações de acidentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Alertas de Novos Acidentes</p>
                  <p className="text-sm text-slate-500">Receber notificação quando houver novos acidentes</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Alertas Sonoros</p>
                  <p className="text-sm text-slate-500">Reproduzir som ao receber alerta crítico</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Alertas SMS</p>
                  <p className="text-sm text-slate-500">Receber SMS para acidentes graves na sua zona</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded" />
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="font-medium mb-3">Zonas Monitoradas</h4>
              <p className="text-sm text-slate-500 mb-3">Selecione as zonas para receber alertas</p>
              {zonasMonitoradas.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {zonasMonitoradas.map(zona => (
                    <label key={zona.zona_id} className="flex items-center gap-2 p-2 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{zona.nome || `Zona ${zona.zona_id.slice(-6)}`}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Nenhuma zona crítica cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="bg-slate-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">ID da Conta</p>
                <p className="font-mono text-sm">{user.user_id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Última atualização</p>
                <p className="text-sm">{new Date(user.updated_at || user.created_at).toLocaleString('pt-AO')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
