import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { boletinsApi } from '../services/api';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Loader2, 
  Calendar,
  User,
  Car,
  MapPin,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BoletimDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [boletim, setBoletim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchBoletim = async () => {
      try {
        const data = await boletinsApi.get(id);
        setBoletim(data);
      } catch (error) {
        toast.error('Erro ao carregar boletim');
        navigate('/boletins');
      } finally {
        setLoading(false);
      }
    };
    fetchBoletim();
  }, [id, navigate]);

  const handleDownloadPdf = async () => {
    // Se foi upload manual, baixar o arquivo anexado
    if (boletim.modo_criacao === 'UPLOAD_MANUAL' && boletim.arquivo_url) {
      handleDownloadUploadedFile();
      return;
    }

    setDownloading(true);
    try {
      const token = localStorage.getItem('dnvt_token');
      const response = await fetch(`${API}/boletins/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Funcionalidade de geração de PDF não disponível no servidor. Entre em contato com o administrador.');
        } else {
          const errorText = await response.text();
          console.error('Erro ao gerar PDF:', errorText);
          toast.error(`Erro ao gerar PDF: ${errorText || 'Erro desconhecido'}`);
        }
        return;
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        toast.error('PDF gerado está vazio');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boletim_${boletim.numero_processo || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF descarregado com sucesso');
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast.error('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadUploadedFile = async () => {
    if (!boletim.arquivo_url) return;
    
    try {
      const a = document.createElement('a');
      a.href = boletim.arquivo_url;
      a.download = `boletim_${boletim.numero_processo || id}_anexo.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download iniciado');
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!boletim) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Boletim não encontrado</p>
        </div>
      </Layout>
    );
  }

  const getModoBadge = (modo) => {
    if (modo === 'GERADO_SISTEMA') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Gerado pelo Sistema</Badge>;
    }
    if (modo === 'UPLOAD_MANUAL') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Upload Manual</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{modo || 'Automático'}</Badge>;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="boletim-detalhes-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Boletim de Ocorrência</h1>
              <p className="text-slate-500 text-sm font-mono">{boletim.numero_processo || boletim.boletim_id || boletim._id}</p>
            </div>
          </div>
          {/* Só mostrar botão se não for upload manual */}
          {boletim.modo_criacao !== 'UPLOAD_MANUAL' && (
            <div className="flex gap-2">
              <Button onClick={handleDownloadPdf} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Gerar PDF
              </Button>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          {getModoBadge(boletim.modo_criacao || boletim.modo_preenchimento)}
          {boletim.acidente_id && (
            <Link to={`/acidentes/${boletim.acidente_id}`}>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer">
                <Eye className="w-3 h-3 mr-1" />
                Ver Acidente
              </Badge>
            </Link>
          )}
        </div>

        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações do Boletim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nº Processo</p>
                <p className="text-sm font-semibold text-slate-700 font-mono">{boletim.numero_processo || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Acidente</p>
                <p className="text-sm font-semibold text-slate-700 font-mono">{boletim.acidente_id ? boletim.acidente_id.slice(-8) : 'Avulso'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Modo de Criação</p>
                {getModoBadge(boletim.modo_criacao || boletim.modo_preenchimento)}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Data de Criação</p>
                <p className="text-sm font-semibold text-slate-700">
                  {boletim.created_at ? new Date(boletim.created_at).toLocaleString('pt-AO') : 'N/A'}
                </p>
              </div>
              {boletim.created_by && (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Registado por</p>
                  <p className="text-sm font-semibold text-blue-700">{boletim.created_by}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {boletim.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{boletim.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Vítimas */}
        {boletim.vitimas_info && boletim.vitimas_info.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Vítimas ({boletim.vitimas_info.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {boletim.vitimas_info.map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{v.nome || `Vítima ${idx + 1}`}</p>
                      {v.bi && <p className="text-xs text-slate-400">BI: {v.bi}</p>}
                      {v.telefone && <p className="text-xs text-slate-400">Tel: {v.telefone}</p>}
                    </div>
                    <Badge className={
                      v.estado === 'FATAL' ? 'bg-red-600 text-white' :
                      v.estado === 'FERIDO_GRAVE' ? 'bg-orange-500 text-white' :
                      v.estado === 'FERIDO_LEVE' ? 'bg-amber-500 text-white' :
                      'bg-green-600 text-white'
                    }>
                      {v.estado?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Veículos */}
        {boletim.veiculos_info && boletim.veiculos_info.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Veículos ({boletim.veiculos_info.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {boletim.veiculos_info.map((v, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{v.marca} {v.modelo}</p>
                      {v.matricula && <Badge variant="outline">{v.matricula}</Badge>}
                    </div>
                    {v.cor && <p className="text-xs text-slate-400 mt-1">Cor: {v.cor}</p>}
                    {v.condutor && <p className="text-xs text-slate-400">Condutor: {v.condutor}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Testemunhas */}
        {boletim.testemunhas && boletim.testemunhas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Testemunhas ({boletim.testemunhas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {boletim.testemunhas.map((t, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-sm">{t.nome || `Testemunha ${idx + 1}`}</p>
                    {t.bi && <p className="text-xs text-slate-400">BI: {t.bi}</p>}
                    {t.telefone && <p className="text-xs text-slate-400">Tel: {t.telefone}</p>}
                    {t.endereco && <p className="text-xs text-slate-400">Endereço: {t.endereco}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uploaded file */}
        {boletim.arquivo_url && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Documento Anexado</span>
                <a 
                  href={`${process.env.REACT_APP_BACKEND_URL}${boletim.arquivo_url}`}
                  download
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descarregar
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* PDF Preview */}
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                <object
                  data={`${process.env.REACT_APP_BACKEND_URL}${boletim.arquivo_url}`}
                  type="application/pdf"
                  className="w-full h-[600px]"
                  title="Preview do documento"
                >
                  <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-4">
                      Seu navegador não suporta visualização de PDF integrada.
                    </p>
                    <a 
                      href={`${process.env.REACT_APP_BACKEND_URL}${boletim.arquivo_url}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Abrir PDF em nova aba
                    </a>
                  </div>
                </object>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
