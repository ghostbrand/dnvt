import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { boletinsApi, acidentesApi } from '../services/api';
import { 
  FileText, 
  ArrowLeft, 
  Loader2,
  Plus,
  Trash2,
  Save,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export default function NovoBoletimPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAcidenteId = searchParams.get('acidente_id') || '';
  const [loading, setLoading] = useState(false);
  const [acidentes, setAcidentes] = useState([]);
  const [loadingAcidentes, setLoadingAcidentes] = useState(true);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  
  const [formData, setFormData] = useState({
    acidente_id: preselectedAcidenteId,
    numero_processo: '',
    observacoes: '',
    vitimas_info: [],
    veiculos_info: [],
    testemunhas: []
  });

  useEffect(() => {
    const fetchAcidentes = async () => {
      try {
        const data = await acidentesApi.list({ limit: 100 });
        setAcidentes(data);
      } catch (error) {
        toast.error('Erro ao carregar acidentes');
      } finally {
        setLoadingAcidentes(false);
      }
    };
    fetchAcidentes();
  }, []);

  const addVitima = () => {
    setFormData({
      ...formData,
      vitimas_info: [...formData.vitimas_info, { nome: '', bi: '', estado: 'FERIDO_LEVE', telefone: '' }]
    });
  };

  const removeVitima = (index) => {
    const updated = formData.vitimas_info.filter((_, i) => i !== index);
    setFormData({ ...formData, vitimas_info: updated });
  };

  const updateVitima = (index, field, value) => {
    const updated = [...formData.vitimas_info];
    updated[index][field] = value;
    setFormData({ ...formData, vitimas_info: updated });
  };

  const addVeiculo = () => {
    setFormData({
      ...formData,
      veiculos_info: [...formData.veiculos_info, { marca: '', modelo: '', matricula: '', cor: '', condutor: '' }]
    });
  };

  const removeVeiculo = (index) => {
    const updated = formData.veiculos_info.filter((_, i) => i !== index);
    setFormData({ ...formData, veiculos_info: updated });
  };

  const updateVeiculo = (index, field, value) => {
    const updated = [...formData.veiculos_info];
    updated[index][field] = value;
    setFormData({ ...formData, veiculos_info: updated });
  };

  const addTestemunha = () => {
    setFormData({
      ...formData,
      testemunhas: [...formData.testemunhas, { nome: '', bi: '', telefone: '', endereco: '' }]
    });
  };

  const removeTestemunha = (index) => {
    const updated = formData.testemunhas.filter((_, i) => i !== index);
    setFormData({ ...formData, testemunhas: updated });
  };

  const updateTestemunha = (index, field, value) => {
    const updated = [...formData.testemunhas];
    updated[index][field] = value;
    setFormData({ ...formData, testemunhas: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const payload = { ...formData, modo_criacao: uploadMode ? 'UPLOAD_MANUAL' : 'GERADO_SISTEMA' };
      if (!payload.acidente_id) delete payload.acidente_id;
      const boletim = await boletinsApi.create(payload);
      
      if (uploadMode && uploadFile) {
        await boletinsApi.upload(boletim.boletim_id, uploadFile);
      }
      
      toast.success('Boletim criado com sucesso');
      navigate('/boletins');
    } catch (error) {
      toast.error('Erro ao criar boletim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="novo-boletim-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Novo Boletim de Ocorrência</h1>
            <p className="text-slate-500 text-sm">Preencha os dados do boletim</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-4">
          <Button
            variant={!uploadMode ? "default" : "outline"}
            onClick={() => setUploadMode(false)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar no Sistema
          </Button>
          <Button
            variant={uploadMode ? "default" : "outline"}
            onClick={() => setUploadMode(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Manual
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Accident Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Acidente Associado</CardTitle>
              <CardDescription>Selecione o acidente ou deixe em branco para um boletim avulso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Acidente (opcional)</Label>
                <Select 
                  value={formData.acidente_id || 'none'} 
                  onValueChange={(v) => setFormData({ ...formData, acidente_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger data-testid="select-acidente">
                    <SelectValue placeholder={loadingAcidentes ? "Carregando..." : "Selecione um acidente"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem acidente associado (boletim avulso)</SelectItem>
                    {acidentes.map(a => (
                      <SelectItem key={a.acidente_id} value={a.acidente_id}>
                        {a.tipo_acidente?.replace(/_/g, ' ')} - {a.gravidade} - {new Date(a.created_at).toLocaleDateString('pt-AO')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Número do Processo (opcional)</Label>
                <Input
                  value={formData.numero_processo}
                  onChange={(e) => setFormData({ ...formData, numero_processo: e.target.value })}
                  placeholder="DNVT-20260306-XXXXXX"
                  data-testid="numero-processo-input"
                />
                <p className="text-xs text-slate-500 mt-1">Deixe em branco para gerar automaticamente</p>
              </div>
            </CardContent>
          </Card>

          {uploadMode ? (
            /* Upload Mode */
            <Card>
              <CardHeader>
                <CardTitle>Upload do Documento</CardTitle>
                <CardDescription>Envie o boletim digitalizado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files?.[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-sm text-slate-600">
                      {uploadFile ? uploadFile.name : 'Clique para selecionar arquivo'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">PDF, JPG ou PNG</p>
                  </label>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Form Mode */
            <>
              {/* Victims */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Vítimas</CardTitle>
                      <CardDescription>Informações das pessoas envolvidas</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addVitima}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.vitimas_info.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma vítima adicionada</p>
                  ) : (
                    formData.vitimas_info.map((vitima, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Vítima {idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeVitima(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Nome completo"
                            value={vitima.nome}
                            onChange={(e) => updateVitima(idx, 'nome', e.target.value)}
                          />
                          <Input
                            placeholder="Nº BI"
                            value={vitima.bi}
                            onChange={(e) => updateVitima(idx, 'bi', e.target.value)}
                          />
                          <Select 
                            value={vitima.estado} 
                            onValueChange={(v) => updateVitima(idx, 'estado', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ILESO">Ileso</SelectItem>
                              <SelectItem value="FERIDO_LEVE">Ferido Leve</SelectItem>
                              <SelectItem value="FERIDO_GRAVE">Ferido Grave</SelectItem>
                              <SelectItem value="FATAL">Fatal</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Telefone"
                            value={vitima.telefone}
                            onChange={(e) => updateVitima(idx, 'telefone', e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Vehicles */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Veículos</CardTitle>
                      <CardDescription>Informações dos veículos envolvidos</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addVeiculo}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.veiculos_info.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhum veículo adicionado</p>
                  ) : (
                    formData.veiculos_info.map((veiculo, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Veículo {idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeVeiculo(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Marca"
                            value={veiculo.marca}
                            onChange={(e) => updateVeiculo(idx, 'marca', e.target.value)}
                          />
                          <Input
                            placeholder="Modelo"
                            value={veiculo.modelo}
                            onChange={(e) => updateVeiculo(idx, 'modelo', e.target.value)}
                          />
                          <Input
                            placeholder="Matrícula"
                            value={veiculo.matricula}
                            onChange={(e) => updateVeiculo(idx, 'matricula', e.target.value)}
                          />
                          <Input
                            placeholder="Cor"
                            value={veiculo.cor}
                            onChange={(e) => updateVeiculo(idx, 'cor', e.target.value)}
                          />
                          <Input
                            placeholder="Nome do Condutor"
                            value={veiculo.condutor}
                            onChange={(e) => updateVeiculo(idx, 'condutor', e.target.value)}
                            className="col-span-2"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Witnesses */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Testemunhas</CardTitle>
                      <CardDescription>Informações das testemunhas</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addTestemunha}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.testemunhas.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma testemunha adicionada</p>
                  ) : (
                    formData.testemunhas.map((testemunha, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Testemunha {idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeTestemunha(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Nome completo"
                            value={testemunha.nome}
                            onChange={(e) => updateTestemunha(idx, 'nome', e.target.value)}
                          />
                          <Input
                            placeholder="Nº BI"
                            value={testemunha.bi}
                            onChange={(e) => updateTestemunha(idx, 'bi', e.target.value)}
                          />
                          <Input
                            placeholder="Telefone"
                            value={testemunha.telefone}
                            onChange={(e) => updateTestemunha(idx, 'telefone', e.target.value)}
                          />
                          <Input
                            placeholder="Endereço"
                            value={testemunha.endereco}
                            onChange={(e) => updateTestemunha(idx, 'endereco', e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={4}
                data-testid="observacoes-input"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-slate-900 hover:bg-slate-800"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Criar Boletim
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
