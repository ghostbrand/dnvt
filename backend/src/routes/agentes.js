const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get all agents heading to accidents
router.get('/a-caminho', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    
    const col = mongoose.connection.db.collection('agent_tracking');
    const agents = await col.find({ status: 'a_caminho' }).toArray();
    res.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    res.json([]);
  }
});

module.exports = router;
