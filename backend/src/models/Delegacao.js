const mongoose = require('mongoose');

const delegacaoSchema = new mongoose.Schema({
  acidente_id: { type: String, required: true },
  agente_id: { type: String, required: true },
  agente_nome: { type: String, default: '' },
  agente_telefone: { type: String, default: '' },
  delegado_por: { type: String, default: '' },
  delegado_por_nome: { type: String, default: '' },
  tipo: { type: String, enum: ['DELEGACAO_ADMIN', 'SOLICITACAO_AGENTE'], required: true },
  status: { type: String, enum: ['PENDENTE', 'APROVADA', 'REJEITADA', 'CONCLUIDA', 'CANCELADA'], default: 'PENDENTE' },
  motivo_rejeicao: { type: String, default: '' },
  latitude_agente: { type: Number, default: null },
  longitude_agente: { type: Number, default: null },
  distancia_km: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  aprovada_em: { type: Date, default: null },
  chegou_em: { type: Date, default: null }
}, { collection: 'delegacoes', timestamps: false });

delegacaoSchema.index({ acidente_id: 1, status: 1 });
delegacaoSchema.index({ agente_id: 1, status: 1 });

module.exports = mongoose.model('Delegacao', delegacaoSchema);
