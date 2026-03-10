const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user_name: {
    type: String,
    default: 'Sistema'
  },
  acao: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['utilizador', 'acidente', 'boletim', 'assistencia', 'zona', 'configuracao', 'auth', 'sistema'],
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  entidade_id: {
    type: String,
    default: null
  },
  dados_anteriores: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  dados_novos: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ip: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ tipo: 1, createdAt: -1 });
auditLogSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
