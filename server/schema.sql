-- ============================================================
-- FINO SABOR — Base de Dados do Painel de Acompanhamento
-- Sistema semi-automático de encomendas (MySQL)
-- ============================================================
-- Como usar:
--   mysql -u root -p < schema.sql
-- (ou correr este ficheiro dentro do MySQL Workbench / phpMyAdmin)
-- ============================================================

CREATE DATABASE IF NOT EXISTS fino_sabor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fino_sabor;

-- --------------------------------------------------------------
-- Tabela: clientes  (Dados básicos do cliente)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clientes_telefone (telefone)
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- Tabela: encomendas  (Encomenda + Estado da encomenda + Estado do pagamento)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encomendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  forma_entrega ENUM('retirada', 'delivery') NOT NULL DEFAULT 'retirada',
  taxa_entrega DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT NULL,
  estado_encomenda ENUM(
    'aguardando_pagamento',
    'paga',
    'em_preparacao',
    'pronta',
    'concluida'
  ) NOT NULL DEFAULT 'aguardando_pagamento',
  estado_pagamento ENUM('pendente', 'confirmado') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_encomendas_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- Tabela: itens_encomenda  (Produtos da encomenda)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens_encomenda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  encomenda_id INT NOT NULL,
  produto_nome VARCHAR(200) NOT NULL,
  detalhes VARCHAR(255) NULL,
  preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantidade INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_itens_encomenda
    FOREIGN KEY (encomenda_id) REFERENCES encomendas(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Índices úteis para o painel (listar por estado / mais recentes primeiro)
CREATE INDEX idx_encomendas_estado ON encomendas (estado_encomenda);
CREATE INDEX idx_encomendas_criado_em ON encomendas (criado_em);
