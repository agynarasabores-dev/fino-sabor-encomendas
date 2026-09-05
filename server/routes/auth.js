// ============================================================
// Autenticação simples do Painel Administrativo (só por password)
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST /api/auth/login  { senha }
router.post('/login', (req, res) => {
  const { senha } = req.body;

  if (!senha) {
    return res.status(400).json({ erro: 'Indique a password.' });
  }

  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ erro: 'Password incorrecta.' });
  }

  const token = jwt.sign(
    { admin: true },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token });
});

module.exports = router;
