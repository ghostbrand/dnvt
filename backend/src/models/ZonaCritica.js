const mongoose = require('mongoose');

const zonaCriticaSchema = new mongoose.Schema({
  zona_id: { type: String },
  latitude_centro: { type: Number, required: true },
  longitude_centro: { type: Number, required: true },
  raio_metros: { type: Number, default: 500 },
  nome: { type: String, required: true },
  total_acidentes: { type: Number, default: 0 },
  acidentes_graves: { type: Number, default: 0 },
  causa_mais_frequente: { type: String, default: null },
  nivel_risco: { type: String, default: 'MEDIO' },
  recomendacao_melhoria: { type: String, default: null },
  delimitacoes: [{ lat: Number, lng: Number }],
  tipo_zona: { type: String, enum: ['critica', 'vigilancia', 'segura'], default: 'critica' },
  validado: { type: Boolean, default: false },
  monitores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  created_at: { type: Date, default: Date.now }
}, { collection: 'zonas_criticas', timestamps: false });

module.exports = mongoose.model('ZonaCritica', zonaCriticaSchema);
