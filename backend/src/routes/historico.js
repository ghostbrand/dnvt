const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// List all history logs
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const limit = parseInt(req.query.limit) || 200;
      const logs = await mongoose.connection.db
        .collection('historico')
        .find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      return res.json(logs);
    }
  } catch (error) {
    console.error('Erro ao listar histórico:', error);
  }
  res.json([]);
});

// Create history log
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const log = {
        ...req.body,
        timestamp: new Date()
      };
      await mongoose.connection.db.collection('historico').insertOne(log);
      return res.status(201).json(log);
    }
  } catch (error) {
    console.error('Erro ao criar log:', error);
  }
  res.status(500).json({ error: 'Erro ao criar log' });
});

module.exports = router;
