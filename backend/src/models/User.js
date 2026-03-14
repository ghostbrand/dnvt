const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'policia', 'cidadao'],
    default: 'policia'
  },
  telefone: {
    type: String,
    default: ''
  },
  bilhete_identidade: {
    type: String,
    default: ''
  },
  endereco: {
    type: String,
    default: ''
  },
  nivel_acesso: {
    type: String,
    enum: ['total', 'avancado', 'basico', 'leitura'],
    default: 'basico'
  },
  privilegios: {
    gestao_acidentes: { type: Boolean, default: false },
    gestao_boletins: { type: Boolean, default: false },
    gestao_zonas: { type: Boolean, default: false },
    gestao_assistencias: { type: Boolean, default: false },
    gestao_utilizadores: { type: Boolean, default: false },
    ver_estatisticas: { type: Boolean, default: true },
    configuracoes: { type: Boolean, default: false },
    exportar_dados: { type: Boolean, default: false }
  },
  push_token: { type: String, default: '' },
  provincia: { type: String, default: '' },
  alertas_novos_acidentes: { type: Boolean, default: true },
  alertas_sonoros: { type: Boolean, default: true },
  alertas_sms: { type: Boolean, default: false },
  zonas_notificacao: [{ type: String }],
  status: {
    type: String,
    enum: ['ativo', 'pendente', 'suspenso', 'inativo'],
    default: 'ativo'
  },
  aprovado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  aprovado_em: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
