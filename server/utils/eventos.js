// ============================================================
// Canal de eventos em tempo real (Server-Sent Events)
// Usado para avisar o painel assim que chega uma encomenda nova,
// sem precisar de recarregar a página nem de WebSockets/bibliotecas extra.
// ============================================================

let clientesConectados = [];

function registarCliente(res) {
  clientesConectados.push(res);
}

function removerCliente(res) {
  clientesConectados = clientesConectados.filter(c => c !== res);
}

function enviarEvento(nomeEvento, dados) {
  const payload = `event: ${nomeEvento}\ndata: ${JSON.stringify(dados)}\n\n`;
  clientesConectados.forEach(res => {
    try {
      res.write(payload);
    } catch (err) {
      // conexão morta — será limpa no próximo 'close'
    }
  });
}

module.exports = { registarCliente, removerCliente, enviarEvento };
