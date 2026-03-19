const mongoose = require('mongoose');

const configuracaoSchema = new mongoose.Schema({
  google_maps_api_key: {
    type: String,
    default: ''
  },
  email_notifications: {
    type: Boolean,
    default: true
  },
  sms_notifications: {
    type: Boolean,
    default: false
  },
  auto_assign_agents: {
    type: Boolean,
    default: true
  },
  max_distance_km: {
    type: Number,
    default: 50
  },
  emergency_contacts: [{
    name: String,
    phone: String,
    role: String
  }],
  maintenance_mode: {
    type: Boolean,
    default: false
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

configuracaoSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Configuracao', configuracaoSchema);
