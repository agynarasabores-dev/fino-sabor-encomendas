// ============================================================
// PAINEL FINO SABOR — lógica do painel administrativo
// ============================================================

// >>> Ajuste este endereço para o do seu servidor quando publicar online <<<
const API_URL = 'http://localhost:3000/api';

const ESTADOS = [
  { valor: 'aguardando_pagamento', label: 'Aguardando Pagamento', icon: 'fa-clock' },
  { valor: 'paga', label: 'Paga', icon: 'fa-money-bill-wave' },
  { valor: 'em_preparacao', label: 'Em Preparação', icon: 'fa-kitchen-set' },
  { valor: 'pronta', label: 'Pronta', icon: 'fa-box-open' },
  { valor: 'concluida', label: 'Concluída', icon: 'fa-circle-check' }
];

let filtroActual = '';
let termoBusca = '';
let encomendasCache = [];

// ---------------------- Auth / Sessão ----------------------

function getToken() {
  return localStorage.getItem('fs_admin_token');
}

function setToken(token) {
  localStorage.setItem('fs_admin_token', token);
}

function limparSessao() {
  localStorage.removeItem('fs_admin_token');
}

function mostrarPainel() {
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('tela-painel').classList.remove('hidden');
  renderizarFiltros();
  carregarEncomendas();
  ligarNotificacoesTempoReal();
  mostrarGuiaSePrimeiraVez();
}

function mostrarLogin() {
  document.getElementById('tela-painel').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
  desligarNotificacoesTempoReal();
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const senha = document.getElementById('input-senha').value;
  const erroEl = document.getElementById('erro-login');
  erroEl.classList.add('hidden');

  try {
    const resp = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    });
    const dados = await resp.json();

    if (!resp.ok) {
      erroEl.textContent = dados.erro || 'Password incorrecta.';
      erroEl.classList.remove('hidden');
      return;
    }

    setToken(dados.token);
    mostrarPainel();
  } catch (err) {
    erroEl.textContent = 'Não foi possível ligar ao servidor. Verifique se o backend está a correr.';
    erroEl.classList.remove('hidden');
  }
});

document.getElementById('btn-sair').addEventListener('click', () => {
  limparSessao();
  mostrarLogin();
});

document.getElementById('btn-actualizar').addEventListener('click', () => carregarEncomendas());

// ---------------------- Busca rápida ----------------------

const inputBusca = document.getElementById('input-busca');
const btnLimparBusca = document.getElementById('btn-limpar-busca');

inputBusca.addEventListener('input', () => {
  termoBusca = inputBusca.value;
  btnLimparBusca.classList.toggle('hidden', termoBusca.trim() === '');
  renderizarListaFiltrada();
});

btnLimparBusca.addEventListener('click', () => {
  termoBusca = '';
  inputBusca.value = '';
  btnLimparBusca.classList.add('hidden');
  renderizarListaFiltrada();
  inputBusca.focus();
});

// ---------------------- Guia rápido (primeira vez) ----------------------

function mostrarGuiaSePrimeiraVez() {
  const jaViu = localStorage.getItem('fs_guia_visto');
  const guia = document.getElementById('guia-rapido');
  if (!jaViu) guia.classList.remove('hidden');
}

document.getElementById('btn-fechar-guia').addEventListener('click', () => {
  document.getElementById('guia-rapido').classList.add('hidden');
  localStorage.setItem('fs_guia_visto', 'sim');
});

// ---------------------- Carregar / Renderizar Encomendas ----------------------

async function chamadaAutenticada(url, opcoes = {}) {
  const resp = await fetch(url, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(opcoes.headers || {})
    }
  });

  if (resp.status === 401) {
    limparSessao();
    mostrarLogin();
    throw new Error('Sessão expirada.');
  }

  return resp;
}

function renderizarFiltros() {
  const container = document.getElementById('filtros-estado');
  const opcoes = [{ valor: '', label: 'Todas', icon: 'fa-list' }, ...ESTADOS];

  container.innerHTML = opcoes.map(op => `
    <button data-estado="${op.valor}" role="tab" aria-selected="${filtroActual === op.valor}"
      class="filtro-btn px-3.5 py-2.5 rounded-xl text-xs font-bold border transition whitespace-nowrap ${filtroActual === op.valor ? 'bg-magenta text-white border-magenta' : 'bg-white text-gray-500 border-gray-200 hover:border-magenta'}">
      <i class="fa-solid ${op.icon} mr-1" aria-hidden="true"></i> ${op.label}
    </button>
  `).join('');

  container.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroActual = btn.dataset.estado;
      renderizarFiltros();
      carregarEncomendas();
    });
  });
}

async function carregarEncomendas() {
  try {
    const url = filtroActual
      ? `${API_URL}/encomendas?estado=${filtroActual}`
      : `${API_URL}/encomendas`;
    const resp = await chamadaAutenticada(url);
    const dados = await resp.json();

    if (!resp.ok) {
      alert(dados.erro || 'Erro ao carregar encomendas.');
      return;
    }

    encomendasCache = dados;
    renderizarResumo(dados);
    renderizarListaFiltrada();
  } catch (err) {
    console.error(err);
  }
}

// Centraliza a lógica de "o que mostrar agora": aplica a busca por
// nome/telefone/número, e ordena as pendentes das mais antigas para as mais
// recentes (para não se perder nenhuma quando o pagamento demora a chegar).
function obterListaVisivel() {
  let lista = filtroActual
    ? encomendasCache.filter(e => e.estado_encomenda === filtroActual)
    : encomendasCache.slice();

  const termo = termoBusca.trim().toLowerCase();
  if (termo) {
    lista = lista.filter(e =>
      e.numero.toLowerCase().includes(termo) ||
      e.cliente_nome.toLowerCase().includes(termo) ||
      e.cliente_telefone.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
    );
  }

  if (filtroActual === 'aguardando_pagamento') {
    lista = lista.slice().sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  }

  return lista;
}

function renderizarListaFiltrada() {
  renderizarLista(obterListaVisivel());
}

function renderizarResumo(lista) {
  const container = document.getElementById('resumo-cards');
  const contagens = { aguardando_pagamento: 0, paga: 0, em_preparacao: 0, pronta: 0, concluida: 0 };
  lista.forEach(e => { if (contagens[e.estado_encomenda] !== undefined) contagens[e.estado_encomenda]++; });

  container.innerHTML = ESTADOS.map(est => `
    <div class="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
      <div class="text-xl font-extrabold text-magenta">${contagens[est.valor]}</div>
      <div class="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mt-1">${est.label}</div>
    </div>
  `).join('');
}

function formatarMoeda(valor) {
  return `${Number(valor).toLocaleString('pt-MZ')} MZN`;
}

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Tempo decorrido em português, para ser fácil bater com a hora da SMS do
// M-Pesa/e-Mola sem ter de fazer contas de cabeça.
function tempoDecorrido(iso) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
}

// Uma encomenda "aguardando pagamento" há mais de 2h merece destaque, para
// não ficar esquecida no meio de pedidos mais recentes.
function estaPendenteHaMuitoTempo(enc) {
  if (enc.estado_encomenda !== 'aguardando_pagamento') return false;
  const horas = (Date.now() - new Date(enc.criado_em).getTime()) / 3600000;
  return horas >= 2;
}

function labelEstado(valor) {
  const est = ESTADOS.find(e => e.valor === valor);
  return est ? est.label : valor;
}

function renderizarLista(lista) {
  const container = document.getElementById('lista-encomendas');
  const vazio = document.getElementById('estado-vazio');
  const vazioTexto = document.getElementById('estado-vazio-texto');

  if (!lista || lista.length === 0) {
    container.innerHTML = '';
    vazioTexto.textContent = termoBusca.trim()
      ? `Nenhuma encomenda encontrada para "${termoBusca.trim()}".`
      : 'Nenhuma encomenda encontrada.';
    vazio.classList.remove('hidden');
    return;
  }
  vazio.classList.add('hidden');

  container.innerHTML = lista.map(enc => {
    const itensHtml = enc.itens.map(item => `
      <div class="flex justify-between text-xs text-gray-600 py-1 border-b border-dashed border-gray-100 last:border-0">
        <span>${item.quantidade}x ${item.produto_nome}${item.detalhes ? ` <span class="text-gray-400">(${item.detalhes})</span>` : ''}</span>
        <span class="font-semibold">${formatarMoeda(item.preco_unitario * item.quantidade)}</span>
      </div>
    `).join('');

    const botoesEstado = ESTADOS.map(est => `
      <button class="btn-estado ${enc.estado_encomenda === est.valor ? 'actual' : ''}"
        aria-pressed="${enc.estado_encomenda === est.valor}"
        onclick="mudarEstado(${enc.id}, '${est.valor}')">
        <i class="fa-solid ${est.icon}" aria-hidden="true"></i> ${est.label}
      </button>
    `).join('');

    return `
      <article class="card-encomenda bg-white rounded-2xl border ${estaPendenteHaMuitoTempo(enc) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'} shadow-sm p-4 sm:p-5" id="card-encomenda-${enc.id}" aria-label="Encomenda número ${enc.numero}">
        ${estaPendenteHaMuitoTempo(enc) ? `
        <div class="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-[11px] font-bold mb-3">
          <i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> Aguardando pagamento há muito tempo — não esquecer
        </div>` : ''}
        <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-extrabold text-gray-800">#${enc.numero}</span>
              <span class="badge badge-${enc.estado_encomenda}">${labelEstado(enc.estado_encomenda)}</span>
              <span class="badge badge-${enc.estado_pagamento}">${enc.estado_pagamento === 'confirmado' ? 'Pagamento Confirmado' : 'Pagamento Pendente'}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1" title="${formatarData(enc.criado_em)}">${tempoDecorrido(enc.criado_em)}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-400">Total</div>
            <div class="text-lg font-extrabold text-magenta">${formatarMoeda(enc.total)}</div>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-3 mb-3">
          <div class="bg-gray-50 rounded-xl p-3">
            <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Cliente</div>
            <div class="text-sm font-semibold text-gray-800">${enc.cliente_nome}</div>
            <div class="text-xs text-gray-500"><i class="fa-brands fa-whatsapp mr-1 text-green-600" aria-hidden="true"></i>${enc.cliente_telefone}</div>
            <div class="text-xs text-gray-500 mt-1">${enc.forma_entrega === 'delivery' ? '🛵 Delivery' : '🏪 Retirada no Local'}</div>
          </div>
          <div class="bg-gray-50 rounded-xl p-3">
            <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Produtos</div>
            ${itensHtml}
          </div>
        </div>

        ${enc.observacoes ? `<div class="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-3"><i class="fa-solid fa-note-sticky mr-1" aria-hidden="true"></i>${enc.observacoes}</div>` : ''}

        <div class="mb-3">
          <div class="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Alterar Estado</div>
          <div class="flex flex-wrap gap-1.5">${botoesEstado}</div>
        </div>

        <div class="bg-magenta-light/60 border border-magenta-soft rounded-xl p-3 space-y-2" id="msg-box-${enc.id}">
          <div class="text-[10px] uppercase font-bold text-magenta">Mensagem Preparada para o Cliente</div>
          <p class="text-xs text-gray-700" id="msg-texto-${enc.id}">${gerarMensagemLocal(enc.estado_encomenda, enc.cliente_nome, enc.numero)}</p>
          <p class="text-[10px] text-gray-400"><i class="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>O WhatsApp abre-se sozinho ao tocares num botão de estado acima. Usa este botão só se precisares de reenviar.</p>
          <button onclick="enviarWhatsApp(${enc.id})" class="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold py-3 px-4 rounded-lg flex items-center gap-2 uppercase tracking-wide w-full sm:w-auto justify-center">
            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Reenviar por WhatsApp
          </button>
        </div>
      </article>
    `;
  }).join('');
}

// Réplica local dos modelos de mensagem (para pré-visualização instantânea).
// A mensagem final enviada é sempre confirmada pelo servidor ao mudar de estado.
function gerarMensagemLocal(estado, nome, numero) {
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

// Guarda a última mensagem/telefone confirmados pelo servidor, por encomenda
const mensagensProntas = {};

// Preferência: abrir o WhatsApp sozinho assim que o estado muda (activo por omissão)
let envioAutomaticoWhatsApp = localStorage.getItem('fs_auto_whatsapp') !== 'nao';

async function mudarEstado(id, novoEstado) {
  // Abre já uma janela em branco (ainda dentro do "clique" do utilizador) para o
  // navegador não bloquear o popup — só preenchemos o endereço depois de saber
  // a mensagem certa. Só faz sentido para estados que avisam o cliente.
  const deveAbrirWhatsApp = envioAutomaticoWhatsApp && novoEstado !== 'aguardando_pagamento';
  const janelaWhatsApp = deveAbrirWhatsApp ? window.open('', '_blank') : null;

  try {
    const resp = await chamadaAutenticada(`${API_URL}/encomendas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: novoEstado })
    });
    const dados = await resp.json();

    if (!resp.ok) {
      if (janelaWhatsApp) janelaWhatsApp.close();
      alert(dados.erro || 'Erro ao actualizar estado.');
      return;
    }

    mensagensProntas[id] = { mensagem: dados.mensagemWhatsapp, telefone: dados.telefoneCliente };

    const idx = encomendasCache.findIndex(e => e.id === id);
    if (idx !== -1) {
      encomendasCache[idx].estado_encomenda = dados.encomenda.estado_encomenda;
      encomendasCache[idx].estado_pagamento = dados.encomenda.estado_pagamento;
    }
    renderizarResumo(encomendasCache);
    renderizarListaFiltrada();
    anunciar(`Estado da encomenda ${dados.encomenda.numero} alterado para ${labelEstado(novoEstado)}.`);

    if (janelaWhatsApp) {
      const telefone = dados.telefoneCliente.replace(/\D/g, '');
      janelaWhatsApp.location.href = `https://wa.me/${telefone}?text=${encodeURIComponent(dados.mensagemWhatsapp)}`;
    }
  } catch (err) {
    if (janelaWhatsApp) janelaWhatsApp.close();
    console.error(err);
  }
}

function enviarWhatsApp(id) {
  const enc = encomendasCache.find(e => e.id === id);
  if (!enc) return;

  const pronto = mensagensProntas[id];
  const mensagem = pronto ? pronto.mensagem : gerarMensagemLocal(enc.estado_encomenda, enc.cliente_nome, enc.numero);
  const telefone = (pronto ? pronto.telefone : enc.cliente_telefone).replace(/\D/g, '');

  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
}

// ---------------------- Acessibilidade: anúncios para leitores de ecrã ----------------------

function anunciar(texto) {
  const regiao = document.getElementById('regiao-anuncios');
  regiao.textContent = '';
  setTimeout(() => { regiao.textContent = texto; }, 50);
}

// ============================================================
// Notificações em Tempo Real (Server-Sent Events)
// ============================================================

let fonteEventos = null;
let notificacoesSonorasActivas = localStorage.getItem('fs_som_activo') !== 'nao';
const tituloOriginal = document.title;
let intervaloTitulo = null;

// Histórico de notificações (persiste ao recarregar a página)
function carregarNotificacoesGuardadas() {
  try {
    return JSON.parse(localStorage.getItem('fs_notificacoes') || '[]');
  } catch {
    return [];
  }
}
let notificacoes = carregarNotificacoesGuardadas();

function guardarNotificacoes() {
  localStorage.setItem('fs_notificacoes', JSON.stringify(notificacoes.slice(0, 30)));
}

function ligarNotificacoesTempoReal() {
  if (fonteEventos) return;

  fonteEventos = new EventSource(`${API_URL}/encomendas/eventos?token=${encodeURIComponent(getToken())}`);

  fonteEventos.addEventListener('ligado', () => actualizarIndicadorLigacao('ok'));

  fonteEventos.addEventListener('nova_encomenda', (evento) => {
    const dados = JSON.parse(evento.data);
    tratarNovaEncomenda(dados);
  });

  fonteEventos.onerror = () => actualizarIndicadorLigacao('erro');

  renderizarNotificacoes();
  actualizarBadge();
}

function desligarNotificacoesTempoReal() {
  if (fonteEventos) {
    fonteEventos.close();
    fonteEventos = null;
  }
  actualizarIndicadorLigacao('off');
  pararPiscarTitulo();
}

function actualizarIndicadorLigacao(estado) {
  const ponto = document.getElementById('ponto-ligacao');
  if (!ponto) return;
  ponto.classList.remove('ponto-ok', 'ponto-erro');
  if (estado === 'ok') ponto.classList.add('ponto-ok');
  else if (estado === 'erro') ponto.classList.add('ponto-erro');
}

function tratarNovaEncomenda(dados) {
  tocarSom();
  mostrarToast(dados);
  mostrarNotificacaoSistema(dados);
  piscarTitulo();
  anunciar(`Nova encomenda recebida: número ${dados.numero}, de ${dados.cliente_nome}, no valor de ${formatarMoeda(dados.total)}.`);

  notificacoes.unshift({
    id: dados.id,
    numero: dados.numero,
    cliente_nome: dados.cliente_nome,
    total: dados.total,
    quando: new Date().toISOString(),
    lida: false
  });
  guardarNotificacoes();
  renderizarNotificacoes();
  actualizarBadge();

  carregarEncomendas();

  setTimeout(() => {
    const card = document.getElementById(`card-encomenda-${dados.id}`);
    if (card) {
      card.classList.add('card-nova-encomenda');
      setTimeout(() => card.classList.remove('card-nova-encomenda'), 3500);
    }
  }, 400);
}

function tocarSom() {
  if (!notificacoesSonorasActivas) return;
  try {
    const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClasse();
    [880, 1320].forEach((frequencia, i) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.frequency.value = frequencia;
      osc.type = 'sine';
      ganho.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch (err) {
    console.warn('Não foi possível tocar o som de notificação:', err);
  }
}

function mostrarToast(dados) {
  const toast = document.getElementById('toast-nova-encomenda');
  toast.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
      <i class="fa-solid fa-bell"></i>
    </div>
    <div class="flex-1">
      <div class="text-sm font-extrabold text-gray-800">Nova encomenda recebida!</div>
      <div class="text-xs text-gray-500 mt-0.5">#${dados.numero} — ${dados.cliente_nome} · ${formatarMoeda(dados.total)}</div>
    </div>
    <button aria-label="Fechar aviso" class="text-gray-300 hover:text-gray-500 text-xs w-7 h-7 flex items-center justify-center flex-shrink-0" onclick="event.stopPropagation(); esconderToast();"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
  `;
  toast.onclick = () => {
    esconderToast();
    const card = document.getElementById(`card-encomenda-${dados.id}`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  toast.classList.remove('hidden');

  clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(esconderToast, 6000);
}

function esconderToast() {
  document.getElementById('toast-nova-encomenda').classList.add('hidden');
}

function mostrarNotificacaoSistema(dados) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notificacao = new Notification('Fino Sabor — Nova Encomenda', {
    body: `#${dados.numero} — ${dados.cliente_nome} · ${formatarMoeda(dados.total)}`,
    icon: '../public/imagens/logo.jpeg',
    tag: `encomenda-${dados.id}`
  });

  notificacao.onclick = () => {
    window.focus();
    notificacao.close();
    const card = document.getElementById(`card-encomenda-${dados.id}`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}

function piscarTitulo() {
  if (intervaloTitulo) return;
  let visivel = true;
  intervaloTitulo = setInterval(() => {
    document.title = visivel ? '🔔 Nova Encomenda!' : tituloOriginal;
    visivel = !visivel;
  }, 1200);

  const pararAoFocar = () => {
    if (!document.hidden) {
      pararPiscarTitulo();
      window.removeEventListener('visibilitychange', pararAoFocar);
    }
  };
  document.addEventListener('visibilitychange', pararAoFocar);
}

function pararPiscarTitulo() {
  if (intervaloTitulo) {
    clearInterval(intervaloTitulo);
    intervaloTitulo = null;
    document.title = tituloOriginal;
  }
}

// ---------------------- Central de Notificações (dropdown) ----------------------

function actualizarBadge() {
  const badge = document.getElementById('badge-notificacoes');
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  if (naoLidas > 0) {
    badge.textContent = naoLidas > 9 ? '9+' : naoLidas;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderizarNotificacoes() {
  const lista = document.getElementById('lista-notificacoes');
  const vazio = document.getElementById('notificacoes-vazio');

  if (notificacoes.length === 0) {
    lista.innerHTML = '';
    vazio.classList.remove('hidden');
    return;
  }
  vazio.classList.add('hidden');

  lista.innerHTML = notificacoes.map(n => `
    <div class="item-notificacao ${n.lida ? '' : 'nao-lida'}">
      <div class="w-8 h-8 rounded-full bg-magenta-light text-magenta flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <i class="fa-solid fa-basket-shopping text-xs"></i>
      </div>
      <button class="flex-1 text-left" onclick="abrirEncomendaDaNotificacao(${n.id})">
        <div class="text-xs font-bold text-gray-800">#${n.numero} — ${n.cliente_nome}</div>
        <div class="text-[11px] text-gray-500">${formatarMoeda(n.total)} · ${formatarData(n.quando)}</div>
      </button>
      <button class="btn-eliminar-notificacao" aria-label="Eliminar esta notificação" onclick="eliminarNotificacao(${n.id})">
        <i class="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
      </button>
    </div>
  `).join('');
}

function eliminarNotificacao(id) {
  notificacoes = notificacoes.filter(n => n.id !== id);
  guardarNotificacoes();
  renderizarNotificacoes();
  actualizarBadge();
}

document.getElementById('btn-limpar-notificacoes').addEventListener('click', () => {
  notificacoes = [];
  guardarNotificacoes();
  renderizarNotificacoes();
  actualizarBadge();
});

function abrirEncomendaDaNotificacao(id) {
  notificacoes = notificacoes.map(n => n.id === id ? { ...n, lida: true } : n);
  guardarNotificacoes();
  renderizarNotificacoes();
  actualizarBadge();
  fecharNotificacoes();

  const card = document.getElementById(`card-encomenda-${id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('card-nova-encomenda');
    setTimeout(() => card.classList.remove('card-nova-encomenda'), 2500);
  }
}

// Abrir / fechar o dropdown de notificações
const btnNotificacoes = document.getElementById('btn-notificacoes');
const painelNotificacoes = document.getElementById('painel-notificacoes');

function abrirNotificacoes() {
  painelNotificacoes.classList.remove('hidden');
  btnNotificacoes.setAttribute('aria-expanded', 'true');
  // Marca tudo como lido ao abrir
  notificacoes = notificacoes.map(n => ({ ...n, lida: true }));
  guardarNotificacoes();
  actualizarBadge();
  renderizarNotificacoes();
  document.addEventListener('click', fecharAoClicarFora);
  document.addEventListener('keydown', fecharComEscape);
}

function fecharNotificacoes() {
  painelNotificacoes.classList.add('hidden');
  btnNotificacoes.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', fecharAoClicarFora);
  document.removeEventListener('keydown', fecharComEscape);
}

function fecharAoClicarFora(e) {
  if (!painelNotificacoes.contains(e.target) && !btnNotificacoes.contains(e.target)) {
    fecharNotificacoes();
  }
}

function fecharComEscape(e) {
  if (e.key === 'Escape') {
    fecharNotificacoes();
    btnNotificacoes.focus();
  }
}

btnNotificacoes.addEventListener('click', () => {
  const aberto = btnNotificacoes.getAttribute('aria-expanded') === 'true';
  aberto ? fecharNotificacoes() : abrirNotificacoes();
});

document.getElementById('btn-fechar-notificacoes').addEventListener('click', fecharNotificacoes);

// Interruptor de som
const btnSom = document.getElementById('btn-som');
btnSom.setAttribute('aria-checked', String(notificacoesSonorasActivas));
btnSom.addEventListener('click', () => {
  notificacoesSonorasActivas = !notificacoesSonorasActivas;
  localStorage.setItem('fs_som_activo', notificacoesSonorasActivas ? 'sim' : 'nao');
  btnSom.setAttribute('aria-checked', String(notificacoesSonorasActivas));
  if (notificacoesSonorasActivas) tocarSom();
});

// Activar notificações do sistema (permissão do navegador)
const btnPermitirSistema = document.getElementById('btn-permitir-sistema');

function actualizarBotaoPermissao() {
  if (!('Notification' in window)) {
    btnPermitirSistema.textContent = 'Não suportado';
    btnPermitirSistema.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    btnPermitirSistema.textContent = 'Activo ✓';
    btnPermitirSistema.classList.add('opacity-60');
  } else {
    btnPermitirSistema.textContent = 'Activar';
    btnPermitirSistema.classList.remove('opacity-60');
  }
}

btnPermitirSistema.addEventListener('click', async () => {
  if (!('Notification' in window)) return;
  await Notification.requestPermission();
  actualizarBotaoPermissao();
});

// Interruptor: abrir WhatsApp automaticamente ao mudar estado
const btnAutoWhatsApp = document.getElementById('btn-auto-whatsapp');
btnAutoWhatsApp.setAttribute('aria-checked', String(envioAutomaticoWhatsApp));
btnAutoWhatsApp.addEventListener('click', () => {
  envioAutomaticoWhatsApp = !envioAutomaticoWhatsApp;
  localStorage.setItem('fs_auto_whatsapp', envioAutomaticoWhatsApp ? 'sim' : 'nao');
  btnAutoWhatsApp.setAttribute('aria-checked', String(envioAutomaticoWhatsApp));
});

// ---------------------- Arranque ----------------------

actualizarBotaoPermissao();

if (getToken()) {
  mostrarPainel();
} else {
  mostrarLogin();
}
