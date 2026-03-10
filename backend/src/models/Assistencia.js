const mongoose = require('mongoose');

const assistenciaSchema = new mongoose.Schema({
  assistencia_id: { type: String },
  acidente_id: { type: String },
  tipo: { type: String, default: 'AMBULANCIA' },
  status: { type: String, default: 'A_CAMINHO' },
  latitude_atual: { type: Number },
  longitude_atual: { type: Number },
  hora_inicio: { type: Date, default: null },
  hora_fim: { type: Date, default: null }
}, { collection: 'assistencias', timestamps: false, strict: false });

module.exports = mongoose.model('Assistencia', assistenciaSchema);
