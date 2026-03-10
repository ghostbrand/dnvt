const mongoose = require('mongoose');

const acidenteSchema = new mongoose.Schema({
  acidente_id: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  endereco: { type: String, default: null },
  descricao: { type: String, default: '' },
  gravidade: { type: String, enum: ['GRAVE', 'MODERADO', 'LEVE'], default: 'MODERADO' },
  tipo_acidente: { type: String, default: 'OUTRO' },
  causa_principal: { type: String, default: '' },
  numero_vitimas: { type: Number, default: 0 },
  numero_veiculos: { type: Number, default: 0 },
  status: { type: String, enum: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO', 'RESOLVIDO'], default: 'REPORTADO' },
  origem_registro: { type: String, default: 'WEB_POLICIA' },
  confirmado_oficialmente: { type: Boolean, default: false },
  fotos: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: String, default: '' },
  updated_by: { type: String, default: '' }
}, { collection: 'acidentes', timestamps: false });

module.exports = mongoose.model('Acidente', acidenteSchema);
