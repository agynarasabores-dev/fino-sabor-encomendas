// ============================================================
// FINO SABOR — Servidor do Painel de Acompanhamento de Encomendas
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const encomendasRoutes = require('./routes/encomendas');

const app = express();

app.use(cors());
app.use(express.json());

// Servir o painel administrativo
app.use(
  '/admin',
  express.static(path.join(__dirname, '..', 'admin'))
);

// Servir o site público
app.use(
  '/',
  express.static(path.join(__dirname, '..', 'public'))
);

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/encomendas', encomendasRoutes);

// Verificação de que o servidor está funcionando
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    servico: 'Fino Sabor - Painel de Encomendas'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor Fino Sabor a correr na porta ${PORT}`);
});
