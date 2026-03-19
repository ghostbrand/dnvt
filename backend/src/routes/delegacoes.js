const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Delegacao = require('../models/Delegacao');

// List all delegations
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const delegacoes = await Delegacao.find().sort({ nome: 1 });
      return res.json(delegacoes);
    }
  } catch (error) {
    console.error('Erro ao listar delegações:', error);
  }
  res.json([]);
});

// Create delegation
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const delegacao = new Delegacao(req.body);
      await delegacao.save();
      return res.status(201).json(delegacao);
    }
  } catch (error) {
    console.error('Erro ao criar delegação:', error);
    if (error.code === 11000) {
      return res.status(400).json({ detail: 'Delegação com este nome já existe' });
    }
  }
  res.status(500).json({ detail: 'Erro ao criar delegação' });
});

// Update delegation
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const delegacao = await Delegacao.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (delegacao) return res.json(delegacao);
    }
  } catch (error) {
    console.error('Erro ao atualizar delegação:', error);
  }
  res.status(404).json({ detail: 'Delegação não encontrada' });
});

// Delete delegation
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const delegacao = await Delegacao.findByIdAndDelete(req.params.id);
      if (delegacao) return res.json({ message: 'Delegação deletada' });
    }
  } catch (error) {
    console.error('Erro ao deletar delegação:', error);
  }
  res.status(404).json({ detail: 'Delegação não encontrada' });
});

module.exports = router;
