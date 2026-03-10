const mongoose = require('mongoose');

const boletimSchema = new mongoose.Schema({
  boletim_id: { type: String },
  acidente_id: { type: String },
  numero_processo: { type: String },
  modo_criacao: { type: String, default: 'GERADO_SISTEMA' },
  observacoes: { type: String, default: '' },
  vitimas_info: [{ type: mongoose.Schema.Types.Mixed }],
  veiculos_info: [{ type: mongoose.Schema.Types.Mixed }],
  testemunhas: [{ type: mongoose.Schema.Types.Mixed }],
  arquivo_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String, default: '' }
}, { collection: 'boletins', timestamps: false });

module.exports = mongoose.model('Boletim', boletimSchema);
