// ============================================================
// Rotas de Encomendas
//  - POST   /api/encomendas          -> criada pelo SITE (pública)
//  - GET    /api/encomendas          -> listar (painel, protegida)
//  - GET    /api/encomendas/:id      -> detalhe (painel, protegida)
//  - PATCH  /api/encomendas/:id/estado -> mudar estado (painel, protegida)
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const verificarAdmin = require('../middleware/verificarAdmin');
const { gerarMensagem } = require('../utils/mensagens');
const { registarCliente, removerCliente, enviarEvento } = require('../utils/eventos');

const router = express.Router();

const ESTADOS_VALIDOS = [
  'aguardando_pagamento',
  'paga',
  'em_preparacao',
  'pronta',
  'concluida'
];

// Estados a partir dos quais consideramos o pagamento confirmado
const ESTADOS_PAGAMENTO_CONFIRMADO = ['paga', 'em_preparacao', 'pronta', 'concluida'];

function gerarNumeroEncomenda(id) {
  return `FS${String(id).padStart(4, '0')}`;
}

async function buscarEncomendaCompleta(connection, encomendaId) {
  const [[encomenda]] = await connection.query(
    `SELECT e.id, e.numero, e.forma_entrega, e.taxa_entrega, e.subtotal, e.total,
            e.observacoes, e.estado_encomenda, e.estado_pagamento,
            e.criado_em, e.atualizado_em,
            c.nome AS cliente_nome, c.telefone AS cliente_telefone
     FROM encomendas e
     JOIN clientes c ON c.id = e.cliente_id
     WHERE e.id = ?`,
    [encomendaId]
  );

  if (!encomenda) return null;

  const [itens] = await connection.query(
    `SELECT produto_nome, detalhes, preco_unitario, quantidade
     FROM itens_encomenda WHERE encomenda_id = ?`,
    [encomendaId]
  );

  return { ...encomenda, itens };
}

// --------------------------------------------------------------
// POST /api/encomendas  — criada automaticamente pelo site quando
// o cliente clica em "Finalizar no WhatsApp"
// --------------------------------------------------------------
router.post('/', async (req, res) => {
  const { nome, telefone, formaEntrega, taxaEntrega, subtotal, total, observacoes, itens } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone do cliente são obrigatórios.' });
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'A encomenda não tem produtos.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Cliente: reaproveita se já existir o mesmo telefone, senão cria
    const [clientesExistentes] = await connection.query(
      'SELECT id FROM clientes WHERE telefone = ?',
      [telefone]
    );

    let clienteId;
    if (clientesExistentes.length > 0) {
      clienteId = clientesExistentes[0].id;
      await connection.query('UPDATE clientes SET nome = ? WHERE id = ?', [nome, clienteId]);
    } else {
      const [resultCliente] = await connection.query(
        'INSERT INTO clientes (nome, telefone) VALUES (?, ?)',
        [nome, telefone]
      );
      clienteId = resultCliente.insertId;
    }

    // Encomenda (numero definido depois do insert, com base no id)
    const [resultEncomenda] = await connection.query(
      `INSERT INTO encomendas
        (numero, cliente_id, forma_entrega, taxa_entrega, subtotal, total, observacoes)
       VALUES ('', ?, ?, ?, ?, ?, ?)`,
      [clienteId, formaEntrega === 'delivery' ? 'delivery' : 'retirada',
       taxaEntrega || 0, subtotal || 0, total || 0, observacoes || null]
    );

    const encomendaId = resultEncomenda.insertId;
    const numero = gerarNumeroEncomenda(encomendaId);

    await connection.query('UPDATE encomendas SET numero = ? WHERE id = ?', [numero, encomendaId]);

    // Itens da encomenda
    for (const item of itens) {
      await connection.query(
        `INSERT INTO itens_encomenda (encomenda_id, produto_nome, detalhes, preco_unitario, quantidade)
         VALUES (?, ?, ?, ?, ?)`,
        [encomendaId, item.nome, item.detalhes || null, item.preco || 0, item.qtd || 1]
      );
    }

    await connection.commit();

    // Avisa o painel em tempo real (se estiver aberto) que chegou uma encomenda nova
    enviarEvento('nova_encomenda', {
      id: encomendaId,
      numero,
      cliente_nome: nome,
      cliente_telefone: telefone,
      total: total || 0
    });

    res.status(201).json({
      mensagem: 'Encomenda registada com sucesso.',
      numero,
      id: encomendaId
    });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao criar encomenda:', err);
    res.status(500).json({ erro: 'Erro interno ao registar a encomenda.' });
  } finally {
    connection.release();
  }
});

// --------------------------------------------------------------
// GET /api/encomendas/eventos — canal de notificações em tempo real
// (o painel liga-se aqui e fica "à escuta" de novas encomendas)
//
// Nota: o EventSource do navegador não permite cabeçalhos personalizados,
// por isso o token vem como ?token=... em vez de "Authorization".
// --------------------------------------------------------------
router.get('/eventos', (req, res) => {
  const { token } = req.query;

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente no painel.' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  registarCliente(res);
  res.write('event: ligado\ndata: {}\n\n');

  // Mantém a ligação viva (evita que proxies/navegadores a fechem por inactividade)
  const manterVivo = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(manterVivo);
    removerCliente(res);
  });
});

// --------------------------------------------------------------
// GET /api/encomendas — lista para o painel (protegida)
// Filtro opcional: /api/encomendas?estado=paga
// --------------------------------------------------------------
router.get('/', verificarAdmin, async (req, res) => {
  const { estado } = req.query;

  try {
    let query = `
      SELECT e.id, e.numero, e.forma_entrega, e.taxa_entrega, e.subtotal, e.total,
             e.estado_encomenda, e.estado_pagamento, e.criado_em, e.atualizado_em,
             c.nome AS cliente_nome, c.telefone AS cliente_telefone
      FROM encomendas e
      JOIN clientes c ON c.id = e.cliente_id
    `;
    const params = [];

    if (estado && ESTADOS_VALIDOS.includes(estado)) {
      query += ' WHERE e.estado_encomenda = ?';
      params.push(estado);
    }

    query += ' ORDER BY e.criado_em DESC';

    const [encomendas] = await pool.query(query, params);

    if (encomendas.length === 0) {
      return res.json([]);
    }

    const ids = encomendas.map(e => e.id);
    const [itens] = await pool.query(
      `SELECT encomenda_id, produto_nome, detalhes, preco_unitario, quantidade
       FROM itens_encomenda WHERE encomenda_id IN (?)`,
      [ids]
    );

    const itensPorEncomenda = {};
    itens.forEach(item => {
      if (!itensPorEncomenda[item.encomenda_id]) itensPorEncomenda[item.encomenda_id] = [];
      itensPorEncomenda[item.encomenda_id].push(item);
    });

    const resultado = encomendas.map(e => ({
      ...e,
      itens: itensPorEncomenda[e.id] || []
    }));

    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar encomendas:', err);
    res.status(500).json({ erro: 'Erro interno ao listar encomendas.' });
  }
});

// --------------------------------------------------------------
// GET /api/encomendas/:id — detalhe de uma encomenda (protegida)
// --------------------------------------------------------------
router.get('/:id', verificarAdmin, async (req, res) => {
  try {
    const encomenda = await buscarEncomendaCompleta(pool, req.params.id);
    if (!encomenda) return res.status(404).json({ erro: 'Encomenda não encontrada.' });
    res.json(encomenda);
  } catch (err) {
    console.error('Erro ao buscar encomenda:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar encomenda.' });
  }
});

// --------------------------------------------------------------
// PATCH /api/encomendas/:id/estado — o admin muda o estado
// (protegida) — devolve também a mensagem de WhatsApp já pronta
// --------------------------------------------------------------
router.patch('/:id/estado', verificarAdmin, async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ erro: 'Estado inválido.' });
  }

  const connection = await pool.getConnection();
  try {
    const estadoPagamento = ESTADOS_PAGAMENTO_CONFIRMADO.includes(estado) ? 'confirmado' : 'pendente';

    const [resultado] = await connection.query(
      'UPDATE encomendas SET estado_encomenda = ?, estado_pagamento = ? WHERE id = ?',
      [estado, estadoPagamento, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Encomenda não encontrada.' });
    }

    const encomenda = await buscarEncomendaCompleta(connection, id);
    const mensagemWhatsapp = gerarMensagem(estado, {
      nome: encomenda.cliente_nome,
      numero: encomenda.numero
    });

    res.json({
      mensagem: 'Estado actualizado com sucesso.',
      encomenda,
      mensagemWhatsapp,
      telefoneCliente: encomenda.cliente_telefone
    });
  } catch (err) {
    console.error('Erro ao actualizar estado:', err);
    res.status(500).json({ erro: 'Erro interno ao actualizar o estado.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
