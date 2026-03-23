const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get current user (me)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ detail: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('-password');
    
    if (user) return res.json(user);
    res.status(404).json({ detail: 'Utilizador não encontrado' });
  } catch (error) {
    console.error('Erro ao buscar utilizador atual:', error);
    res.status(401).json({ detail: 'Token inválido' });
  }
});

// Update current user (me)
router.patch('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ detail: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dnvt_super_secret_key_2024_angola_traffic_system');
    const { password, nome, ...updateData } = req.body;
    
    // Map 'nome' to 'name' for database
    if (nome) {
      updateData.name = nome;
    }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(
      decoded.id || decoded.userId,
      updateData,
      { new: true }
    )
      .select('-password');
    
    if (user) return res.json(user);
    res.status(404).json({ detail: 'Utilizador não encontrado' });
  } catch (error) {
    console.error('Erro ao atualizar utilizador:', error);
    res.status(500).json({ detail: 'Erro ao atualizar utilizador' });
  }
});

// Search citizens
router.get('/cidadaos/buscar', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { q = '', pagina = 1, limite = 20, status } = req.query;
      const query = { role: 'CIDADAO' };
      
      if (q) {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ];
      }
      
      if (status && status !== 'todos') {
        query.status = status.toUpperCase();
      }
      
      const skip = (parseInt(pagina) - 1) * parseInt(limite);
      const users = await User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limite))
        .sort({ created_at: -1 });
      
      const total = await User.countDocuments(query);
      
      return res.json({
        users,
        total,
        pagina: parseInt(pagina),
        limite: parseInt(limite)
      });
    }
  } catch (error) {
    console.error('Erro ao buscar cidadãos:', error);
  }
  res.json({ users: [], total: 0, pagina: 1, limite: 20 });
});

// List all users
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find()
        .select('-password')
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
        .select('-password');
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
        .select('-password');
      
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

// Approve user (cidadao registration)
router.patch('/:id/aprovar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'ativo' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Erro ao aprovar utilizador:', error);
    res.status(500).json({ error: 'Erro ao aprovar utilizador' });
  }
});

// Suspend user
router.patch('/:id/suspender', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspenso' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Erro ao suspender utilizador:', error);
    res.status(500).json({ error: 'Erro ao suspender utilizador' });
  }
});

module.exports = router;
