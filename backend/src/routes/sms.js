const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Send SMS via Ombala API
router.post('/enviar', async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    if (!phone_number || !message) {
      return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios' });
    }
    
    // Get Ombala config
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }
    
    const token = config.ombala_token;
    const senderName = config.ombala_sender_name || 'DNVT';
    
    if (!token) {
      return res.json({ success: false, error: 'Token Ombala não configurado. Configure nas Configurações.' });
    }
    
    // Call Ombala SMS API (docs: developer.useombala.ao)
    try {
      const axios = require('axios');
      const smsRes = await axios.post('https://api.useombala.ao/v1/messages', 
        { message, from: senderName, to: phone_number },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      );
      
      return res.json({ success: true, data: smsRes.data });
    } catch (smsErr) {
      const errMsg = smsErr.response?.data?.message || smsErr.response?.data?.error || smsErr.message;
      console.error('Ombala SMS error:', smsErr.response?.status, errMsg);
      return res.json({ success: false, error: `Erro da API Ombala: ${errMsg}` });
    }
  } catch (err) {
    console.error('SMS send error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// Get SMS balance
router.get('/saldo', async (req, res) => {
  try {
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }
    
    const token = config.ombala_token;
    if (!token) {
      return res.json({ saldo: null, error: 'Token Ombala não configurado' });
    }
    
    try {
      const axios = require('axios');
      const balanceRes = await axios.get('https://api.useombala.ao/v1/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json({ saldo: balanceRes.data.balance || 0 });
    } catch (balanceErr) {
      console.error('Ombala balance error:', balanceErr.message);
      return res.json({ saldo: null, error: 'Erro ao consultar saldo' });
    }
  } catch (err) {
    console.error('SMS balance error:', err.message);
    res.json({ saldo: null, error: err.message });
  }
});

module.exports = router;
