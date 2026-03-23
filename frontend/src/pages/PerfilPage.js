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
    email: '',
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
        email: user.email || '',
        telefone: user.telefone || '',
        bilhete_identidade: user.bilhete_identidade || '',
        endereco: user.endereco || '',
        zonas_notificacao: user.zonas_notificacao || [],
        alertas_novos_acidentes: user.alertas_novos_acidentes !== false,
        alertas_sonoros: user.alertas_sonoros !== false,
        alertas_sms: user.alertas_sms === true
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Validação para números angolanos: +244 9XX XXX XXX
    const phoneRegex = /^\+?244\s?9[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSave = async () => {
    // Validações
    if (!formData.nome || formData.nome.trim().length < 3) {
      toast.error('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    if (formData.telefone && formData.telefone.trim() !== '' && !validatePhone(formData.telefone)) {
      toast.error('Telefone inválido. Use formato: +244 9XX XXX XXX');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API}/utilizadores/me`, {
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
        // Atualizar dados do usuário no contexto
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar perfil');
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="perfil-page">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1B2A4A] tracking-tight">Meu Perfil</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gerencie suas informações pessoais</p>
          </div>
          <Button 
            variant={editMode ? "destructive" : "outline"}
            onClick={() => setEditMode(!editMode)}
            className={`rounded-xl ${!editMode ? 'border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' : ''} transition-all`}
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
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-1" style={{opacity: 0}}>
          <div className="h-1.5 bg-gradient-to-r from-[#1B2A4A] via-blue-600 to-indigo-500" />
          <CardContent className="pt-6 px-6 pb-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 rounded-2xl shadow-lg">
                <AvatarFallback className="rounded-2xl text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}>
                  {getInitials(user.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-xl font-bold text-[#1B2A4A]">{user.nome}</h2>
                  {getTipoBadge(user.tipo)}
                </div>
                <p className="text-slate-400 text-sm">{user.email}</p>
                <p className="text-[11px] text-slate-300 mt-1 font-mono">{user.user_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-2" style={{opacity: 0}}>
          <CardHeader className="pt-5 px-6 pb-3">
            <CardTitle className="flex items-center gap-3 text-[#1B2A4A]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-blue-600" />
              </div>
              Informações Pessoais
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs ml-12">Seus dados pessoais e de contacto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      placeholder="Seu nome completo"
                      className="rounded-xl border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="seu@email.com"
                        className="pl-10 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        placeholder="+244 923 456 789"
                        className="pl-10 rounded-xl border-slate-200"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Formato: +244 9XX XXX XXX</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bi" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bilhete de Identidade</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          id="bi"
                          value={formData.bilhete_identidade}
                          onChange={(e) => setFormData({...formData, bilhete_identidade: e.target.value.toUpperCase()})}
                          placeholder="123456789LA123"
                          className="pl-10 font-mono rounded-xl border-slate-200"
                          maxLength={14}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => validateBI(formData.bilhete_identidade)}
                        className="rounded-xl border-slate-200"
                      >
                        Validar
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">Formato: 123456789LA123</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endereco" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        placeholder="Seu endereço"
                        className="pl-10 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="rounded-xl font-semibold"
                    style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2B4075 100%)' }}
                  >
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { icon: Mail, label: 'Email', value: user.email },
                  { icon: Phone, label: 'Telefone', value: user.telefone || 'Não informado' },
                  { icon: CreditCard, label: 'Bilhete de Identidade', value: user.bilhete_identidade || 'Não informado', mono: true },
                  { icon: MapPin, label: 'Endereço', value: user.endereco || 'Não informado' },
                  { icon: Shield, label: 'Tipo de Conta', value: user.tipo },
                  { icon: Calendar, label: 'Membro desde', value: new Date(user.created_at).toLocaleDateString('pt-AO') },
                ].map(({ icon: Icon, label, value, mono }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                      <p className={`text-sm font-medium text-slate-700 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl overflow-hidden animate-slide-up stagger-3" style={{opacity: 0}}>
          <CardHeader className="pt-5 px-6 pb-3">
            <CardTitle className="flex items-center gap-3 text-[#1B2A4A]">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-amber-600" />
              </div>
              Configurações de Alertas
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs ml-12">Defina como deseja receber notificações de acidentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="space-y-3">
              {[
                { key: 'alertas_novos_acidentes', title: 'Alertas de Novos Acidentes', desc: 'Receber notificação quando houver novos acidentes' },
                { key: 'alertas_sonoros', title: 'Alertas Sonoros', desc: 'Reproduzir som ao receber alerta crítico' },
                { key: 'alertas_sms', title: 'Alertas SMS', desc: 'Receber SMS para acidentes graves na sua zona' },
              ].map(({ key, title, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl hover:bg-slate-100/80 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-slate-700">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData[key]}
                    onChange={(e) => setFormData({...formData, [key]: e.target.checked})}
                    disabled={!editMode}
                    className="w-5 h-5 rounded-md accent-blue-600" 
                  />
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="font-bold text-sm text-[#1B2A4A] mb-2">Zonas Monitoradas</h4>
              <p className="text-xs text-slate-400 mb-3">Selecione as zonas para receber alertas {!editMode && '(ative edição para alterar)'}</p>
              {zonasMonitoradas.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {zonasMonitoradas.map(zona => (
                    <label key={zona.zona_id} className={`flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 ${editMode ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200' : 'opacity-75'} transition-all`}>
                      <input 
                        type="checkbox" 
                        className="rounded-md accent-blue-600" 
                        disabled={!editMode}
                        checked={formData.zonas_notificacao.includes(zona.zona_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, zonas_notificacao: [...formData.zonas_notificacao, zona.zona_id]});
                          } else {
                            setFormData({...formData, zonas_notificacao: formData.zonas_notificacao.filter(id => id !== zona.zona_id)});
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-slate-600">{zona.nome || `Zona ${zona.zona_id.slice(-6)}`}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-slate-300 text-sm">Nenhuma zona crítica cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-0 shadow-sm shadow-slate-200/50 rounded-2xl bg-slate-50/50 animate-slide-up stagger-4" style={{opacity: 0}}>
          <CardContent className="pt-5 pb-5 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">ID da Conta</p>
                <p className="font-mono text-xs text-slate-500 mt-0.5">{user.user_id}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Última atualização</p>
                <p className="text-xs text-slate-500 mt-0.5">{new Date(user.updated_at || user.created_at).toLocaleString('pt-AO')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
