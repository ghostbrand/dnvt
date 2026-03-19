const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Boletim = require('../models/Boletim');

// List all boletins
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletins = await Boletim.find()
        .populate('acidente_id')
        .sort({ created_at: -1 });
      return res.json(boletins);
    }
  } catch (error) {
    console.error('Erro ao listar boletins:', error);
  }
  res.json([]);
});

// Get boletim by ID
router.get('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findById(req.params.id).populate('acidente_id');
      if (boletim) return res.json(boletim);
    }
  } catch (error) {
    console.error('Erro ao buscar boletim:', error);
  }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

// Create boletim
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = new Boletim(req.body);
      await boletim.save();
      return res.status(201).json(boletim);
    }
  } catch (error) {
    console.error('Erro ao criar boletim:', error);
  }
  res.status(500).json({ detail: 'Erro ao criar boletim' });
});

// Update boletim
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate('acidente_id');
      if (boletim) return res.json(boletim);
    }
  } catch (error) {
    console.error('Erro ao atualizar boletim:', error);
  }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

module.exports = router;
