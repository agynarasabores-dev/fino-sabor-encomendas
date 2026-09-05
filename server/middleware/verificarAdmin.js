// ============================================================
// Middleware: exige token válido de administrador
// (usado para proteger o painel — consultar e alterar encomendas)
// ============================================================
const jwt = require('jsonwebtoken');

function verificarAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Faça login no painel.' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

module.exports = verificarAdmin;
