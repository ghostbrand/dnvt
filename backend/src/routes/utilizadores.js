const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// List all users
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find()
        .select('-password')
        .populate('delegacao', 'nome')
        .populate('zonas_monitoradas', 'nome')
        .sort({ created_at: -1 });
      return res.json(users);
    }
  } catch (error) {
    console.error('Erro ao listar utilizadores:', error);
  }
  res.json([]);
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.params.id)
        .select('-password')
        .populate('delegacao', 'nome')
        .populate('zonas_monitoradas', 'nome');
      if (user) return res.json(user);
    }
  } catch (error) {
    console.error('Erro ao buscar utilizador:', error);
  }
  res.status(404).json({ detail: 'Utilizador não encontrado' });
});

// Create user
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { password, ...userData } = req.body;
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      
      await user.save();
      
      const userResponse = user.toObject();
      delete userResponse.password;
      
      return res.status(201).json(userResponse);
    }
  } catch (error) {
    console.error('Erro ao criar utilizador:', error);
    if (error.code === 11000) {
      return res.status(400).json({ detail: 'Email já existe' });
    }
  }
  res.status(500).json({ detail: 'Erro ao criar utilizador' });
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { password, ...updateData } = req.body;
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      )
        .select('-password')
        .populate('delegacao', 'nome')
        .populate('zonas_monitoradas', 'nome');
      
      if (user) return res.json(user);
    }
  } catch (error) {
    console.error('Erro ao atualizar utilizador:', error);
  }
  res.status(404).json({ detail: 'Utilizador não encontrado' });
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndDelete(req.params.id);
      if (user) return res.json({ message: 'Utilizador deletado' });
    }
  } catch (error) {
    console.error('Erro ao deletar utilizador:', error);
  }
  res.status(404).json({ detail: 'Utilizador não encontrado' });
});

// Update push token
router.patch('/:id/push-token', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { push_token } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { push_token },
        { new: true }
      ).select('-password');
      
      if (user) return res.json(user);
    }
  } catch (error) {
    console.error('Erro ao atualizar push token:', error);
  }
  res.status(404).json({ detail: 'Utilizador não encontrado' });
});

module.exports = router;
