const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'dnvt_super_secret_key_2024_angola_traffic_system';

const getUserIdFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, getJwtSecret());
  return decoded.id || decoded.userId || null;
};

// List notifications for logged user
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.json([]);
      const notificacoes = await mongoose.connection.db
        .collection('notificacoes')
        .find({ destinatario_id: userId })
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();
      return res.json(notificacoes.map((item) => ({
        ...item,
        lida: item.lida ?? item.read ?? false,
        lida_em: item.lida_em || item.read_at || null
      })));
    }
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
  }
  res.json([]);
});

router.get('/historico', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const all = await mongoose.connection.db
        .collection('notificacoes')
        .find({})
        .sort({ created_at: -1 })
        .limit(500)
        .toArray();
      const seen = new Map();
      const grouped = [];
      for (const item of all) {
        const createdAt = item.created_at ? new Date(item.created_at) : new Date();
        const key = `${item.titulo || ''}__${Math.floor(createdAt.getTime() / 2000)}`;
        if (!seen.has(key)) {
          const normalized = {
            ...item,
            destinatarios_count: 1,
            destinatarios_nomes: item.destinatarios_nomes || []
          };
          seen.set(key, normalized);
          grouped.push(normalized);
        } else {
          seen.get(key).destinatarios_count += 1;
        }
      }
      return res.json(grouped);
    }
  } catch (error) {
    console.error('Erro ao listar histórico de notificações:', error);
  }
  res.json([]);
});

router.post('/enviar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }
    const { destinatarios, titulo, mensagem } = req.body;
    if (!Array.isArray(destinatarios) || destinatarios.length === 0 || !titulo || !mensagem) {
      return res.status(400).json({ error: 'destinatarios, titulo e mensagem são obrigatórios' });
    }
    let remetenteNome = 'Sistema';
    try {
      const userId = getUserIdFromRequest(req);
      if (userId) {
        const sender = await User.findById(userId).select('name nome');
        if (sender) remetenteNome = sender.nome || sender.name || remetenteNome;
      }
    } catch (_) {}

    const recipients = await User.find({ _id: { $in: destinatarios } }).select('nome name email');
    const recipientNames = recipients.map((item) => item.nome || item.name || item.email || 'Utilizador');
    const docs = destinatarios.map((destinatarioId) => ({
      destinatario_id: destinatarioId,
      titulo,
      mensagem,
      remetente: remetenteNome,
      destinatarios_nomes: recipientNames,
      lida: false,
      created_at: new Date()
    }));
    await mongoose.connection.db.collection('notificacoes').insertMany(docs);
    return res.json({ success: true, enviadas: destinatarios.length });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
});

// Mark notification as read
router.patch('/:id/lida', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db
        .collection('notificacoes')
        .updateOne(
          { _id: new mongoose.Types.ObjectId(req.params.id) },
          { $set: { read: true, read_at: new Date(), lida: true, lida_em: new Date() } }
        );
      return res.json({ message: 'Notificação marcada como lida', success: true });
    }
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
  }
  res.status(500).json({ error: 'Erro ao marcar notificação' });
});

router.patch('/marcar-todas-lidas', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    await mongoose.connection.db.collection('notificacoes').updateMany(
      { destinatario_id: userId, $or: [{ lida: false }, { lida: { $exists: false } }, { read: false }] },
      { $set: { read: true, read_at: new Date(), lida: true, lida_em: new Date() } }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

module.exports = router;
