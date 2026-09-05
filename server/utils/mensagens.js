// ============================================================
// Modelos de mensagem de WhatsApp por estado da encomenda
// ============================================================

function gerarMensagem(estado, { nome, numero }) {
  switch (estado) {
    case 'aguardando_pagamento':
      return `Olá, ${nome}! Recebemos a sua encomenda #${numero}. Assim que o pagamento for confirmado, começaremos a preparação. Obrigado por escolher a Fino Sabor!`;

    case 'paga':
      return `Olá, ${nome}! A sua encomenda #${numero} teve o pagamento confirmado e está agora em preparação. Obrigado por escolher a Fino Sabor!`;

    case 'em_preparacao':
      return `Olá, ${nome}! A sua encomenda #${numero} está em preparação. Em breve estará pronta.`;

    case 'pronta':
      return `Olá, ${nome}! A sua encomenda #${numero} está pronta. Pode proceder ao levantamento conforme combinado. Obrigado!`;

    case 'concluida':
      return `Olá, ${nome}! A encomenda #${numero} foi concluída com sucesso. Obrigado pela preferência!`;

    default:
      return `Olá, ${nome}! Aqui está uma actualização sobre a sua encomenda #${numero}.`;
  }
}

module.exports = { gerarMensagem };
