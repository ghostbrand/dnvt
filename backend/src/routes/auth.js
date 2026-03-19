const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const User = require('../models/User');

// Login
router.post('/login', login);

// Get current user
router.get('/me', getMe);

// Register
router.post('/register', register);

// Password recovery - Step 1: Send code via email
router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email é obrigatório' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: 'Utilizador não encontrado' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_code = code;
    user.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Código de Recuperação de Senha - DNVT',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Olá ${user.name},</p>
        <p>Seu código de recuperação é: <strong>${code}</strong></p>
        <p>Este código expira em 15 minutos.</p>
        <p>Se você não solicitou esta recuperação, ignore este email.</p>
      `,
    });

    res.json({ message: 'Código enviado para o email' });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    res.status(500).json({ detail: 'Erro ao enviar código de recuperação' });
  }
});

// Password recovery - Step 2: Verify code and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, nova_senha } = req.body;
    if (!email || !code || !nova_senha) {
      return res.status(400).json({ detail: 'Email, código e nova senha são obrigatórios' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: 'Utilizador não encontrado' });

    if (!user.reset_code || user.reset_code !== code) {
      return res.status(400).json({ detail: 'Código inválido' });
    }

    if (user.reset_code_expires < new Date()) {
      return res.status(400).json({ detail: 'Código expirado' });
    }

    const bcrypt = require('bcryptjs');
    user.password = await bcrypt.hash(nova_senha, 10);
    user.reset_code = undefined;
    user.reset_code_expires = undefined;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ detail: 'Erro ao resetar senha' });
  }
});

module.exports = router;
