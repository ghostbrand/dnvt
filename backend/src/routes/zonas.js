const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ZonaCritica = require('../models/ZonaCritica');

// List all critical zones
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zonas = await ZonaCritica.find()
        .sort({ nivel_risco: 1 })
        .populate('monitores', 'name email role telefone');
      return res.json(zonas);
    }
  } catch (error) {
    console.error('Erro ao listar zonas:', error);
  }
  res.json([]);
});

// Create critical zone
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = new ZonaCritica(req.body);
      await zona.save();
      return res.status(201).json(zona);
    }
  } catch (error) {
    console.error('Erro ao criar zona:', error);
    if (error.code === 11000) {
      return res.status(400).json({ detail: 'Zona com este nome já existe' });
    }
  }
  res.status(500).json({ detail: 'Erro ao criar zona' });
});

// Update critical zone
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = await ZonaCritica.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate('monitores', 'name email role telefone');
      
      if (zona) return res.json(zona);
    }
  } catch (error) {
    console.error('Erro ao atualizar zona:', error);
  }
  res.status(404).json({ detail: 'Zona não encontrada' });
});

// Delete critical zone
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = await ZonaCritica.findByIdAndDelete(req.params.id);
      if (zona) return res.json({ message: 'Zona deletada' });
    }
  } catch (error) {
    console.error('Erro ao deletar zona:', error);
  }
  res.status(404).json({ detail: 'Zona não encontrada' });
});

module.exports = router;
