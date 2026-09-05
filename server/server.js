// ============================================================
// FINO SABOR — Servidor do Painel de Acompanhamento de Encomendas
// Node.js + Express + MySQL
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const encomendasRoutes = require('./routes/encomendas');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/encomendas', encomendasRoutes);

// Verificação rápida de que o servidor está de pé
app.get('/api/status', (req, res) => {
  res.json({ ok: true, servico: 'Fino Sabor - Painel de Encomendas' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Fino Sabor a correr em http://localhost:${PORT}`);
});
