const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Assistencia = require('../models/Assistencia');

// List all assistências
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (req.query.status) {
        query.status = req.query.status;
      }
      const assistencias = await Assistencia.find(query).sort({ created_at: -1 });
      return res.json(assistencias);
    }
  } catch (error) {
    console.error('Erro ao listar assistências:', error);
  }
  res.json([]);
});

// Create assistência
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const assistencia = new Assistencia(req.body);
      await assistencia.save();
      return res.status(201).json(assistencia);
    }
  } catch (error) {
    console.error('Erro ao criar assistência:', error);
  }
  res.status(500).json({ detail: 'Erro ao criar assistência' });
});

// Update assistência
router.patch('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const assistencia = await Assistencia.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (assistencia) return res.json(assistencia);
    }
  } catch (error) {
    console.error('Erro ao atualizar assistência:', error);
  }
  res.status(404).json({ detail: 'Assistência não encontrada' });
});

module.exports = router;
