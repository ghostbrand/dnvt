const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get Google Maps API key
router.get('/google-maps-key', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const config = await mongoose.connection.db.collection('configuracoes').findOne();
      if (config?.google_maps_api_key) {
        return res.json({ api_key: config.google_maps_api_key });
      }
    }
  } catch (error) {
    console.error('Erro ao buscar chave do Google Maps:', error);
  }
  res.json({ api_key: process.env.GOOGLE_MAPS_KEY || null });
});

// Get all configurations
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const config = await mongoose.connection.db.collection('configuracoes').findOne();
      if (config) return res.json(config);
    }
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
  }
  res.json({ google_maps_api_key: null, sms_enabled: false });
});

// Update configurations
router.patch('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.collection('configuracoes').updateOne(
        {},
        { $set: req.body },
        { upsert: true }
      );
      const config = await mongoose.connection.db.collection('configuracoes').findOne();
      return res.json(config);
    }
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
  }
  res.status(500).json({ error: 'Erro ao atualizar configurações' });
});

module.exports = router;
