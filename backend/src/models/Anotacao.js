const mongoose = require('mongoose');

const anotacaoSchema = new mongoose.Schema({
  acidente_id: { type: String, required: true },
  agente_id: { type: String, required: true },
  agente_nome: { type: String, default: '' },
  tipo: { type: String, enum: ['TEXTO', 'FOTO', 'TEXTO_FOTO'], default: 'TEXTO' },
  texto: { type: String, default: '' },
  fotos: [{ type: String }],
  created_at: { type: Date, default: Date.now }
}, { collection: 'anotacoes', timestamps: false });

anotacaoSchema.index({ acidente_id: 1, created_at: -1 });

module.exports = mongoose.model('Anotacao', anotacaoSchema);
