const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Configuracao = require('../models/Configuracao');

const getGoogleMapsApiKey = () => process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_KEY || '';

// Get Google Maps API key
router.get('/google-maps-key', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let config = await Configuracao.findOne({});
      
      if (config?.google_maps_api_key) {
        return res.json({ api_key: config.google_maps_api_key });
      }
    }
  } catch (error) {
    console.error('Erro ao buscar chave do Google Maps:', error);
  }
  res.json({ api_key: getGoogleMapsApiKey() || null });
});

// Get configurations
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let config = await Configuracao.findOne({});
      
      if (!config) {
        config = await Configuracao.create({
          google_maps_api_key: getGoogleMapsApiKey(),
          email_notifications: true,
          sms_notifications: false,
          auto_assign_agents: true,
          max_distance_km: 50
        });
      }

      if (!config.google_maps_api_key && getGoogleMapsApiKey()) {
        config.google_maps_api_key = getGoogleMapsApiKey();
        await config.save();
      }
      
      return res.json(config);
    }
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
  }
  res.json({
    google_maps_api_key: getGoogleMapsApiKey(),
    email_notifications: true,
    sms_notifications: false,
    auto_assign_agents: true,
    max_distance_km: 50
  });
});

// Update configurations
router.patch('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let config = await Configuracao.findOne({});
      
      if (!config) {
        config = await Configuracao.create(req.body);
      } else {
        config = await Configuracao.findOneAndUpdate(
          {},
          { $set: req.body },
          { new: true, runValidators: true }
        );
      }
      
      return res.json(config);
    }
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar configurações',
      detail: error.message 
    });
  }
  res.status(500).json({ error: 'Database não conectado' });
});

module.exports = router;
