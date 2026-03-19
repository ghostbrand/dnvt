const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// List all notifications
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const notificacoes = await mongoose.connection.db
        .collection('notificacoes')
        .find()
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();
      return res.json(notificacoes);
    }
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
  }
  res.json([]);
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db
        .collection('notificacoes')
        .updateOne(
          { _id: new mongoose.Types.ObjectId(req.params.id) },
          { $set: { read: true, read_at: new Date() } }
        );
      return res.json({ message: 'Notificação marcada como lida' });
    }
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
  }
  res.status(500).json({ error: 'Erro ao marcar notificação' });
});

module.exports = router;
