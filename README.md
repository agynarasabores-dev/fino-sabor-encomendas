# Fino Sabor — Sistema Semi-Automático de Acompanhamento de Encomendas

Este pacote **adiciona** um painel administrativo simples ao site já existente
da Fino Sabor. **Nada do site foi reconstruído** — o carrinho, os produtos, a
calculadora, a galeria e o pagamento via M-Pesa/e-Mola continuam a funcionar
exactamente como antes. A única alteração no site foi:

1. Dois campos novos no carrinho ("Nome" e "Telefone") para identificar o cliente.
2. O botão **"Finalizar no WhatsApp"** agora também regista a encomenda no
   novo backend (para aparecer no painel) antes de abrir o WhatsApp — o
   comportamento do WhatsApp em si não mudou.

Se o servidor do painel estiver desligado, o cliente **continua a conseguir**
finalizar o pedido pelo WhatsApp normalmente; a encomenda simplesmente não
aparecerá no painel nesse caso.

---

## 📁 Estrutura do pacote

```
fino-sabor-encomendas/
├── public/                 → O SEU SITE (com a pequena alteração no carrinho)
│   ├── index.html
│   ├── css/style.css
│   └── js/script.js
│
├── admin/                  → O NOVO PAINEL ADMINISTRATIVO
│   ├── painel.html
│   ├── painel.css
│   └── painel.js
│
└── server/                 → O NOVO BACKEND (Node.js + Express + MySQL)
    ├── server.js
    ├── schema.sql          → script para criar a base de dados
    ├── .env.example
    ├── package.json
    ├── db/pool.js
    ├── routes/auth.js
    ├── routes/encomendas.js
    ├── middleware/verificarAdmin.js
    └── utils/mensagens.js
```

---

## 🚀 Como instalar (passo a passo)

### 1. Criar a base de dados MySQL

Com o MySQL já instalado localmente, execute:

```bash
mysql -u root -p < server/schema.sql
```

Isto cria a base de dados `fino_sabor` com 3 tabelas: `clientes`,
`encomendas` e `itens_encomenda`.

### 2. Configurar o backend

```bash
cd server
cp .env.example .env
```

Edite o ficheiro `.env` e preencha:
- `DB_PASSWORD` — a password do seu MySQL local
- `ADMIN_PASSWORD` — a password que a Fino Sabor vai usar para entrar no painel
- `JWT_SECRET` — qualquer frase secreta (só precisa de mudar uma vez)

### 3. Instalar dependências e iniciar o servidor

```bash
npm install
npm start
```

Se tudo correr bem, verá:
```
Servidor Fino Sabor a correr em http://localhost:3000
```

Deixe este terminal aberto — é ele que recebe as encomendas do site e
alimenta o painel.

### 4. Abrir o site

Abra `public/index.html` normalmente (como já fazia antes). Ao finalizar um
pedido no carrinho, ele é automaticamente enviado para o servidor além de
abrir o WhatsApp.

### 5. Abrir o painel administrativo

Abra `admin/painel.html` no navegador, introduza a `ADMIN_PASSWORD` que
definiu no `.env`, e pronto — o painel mostra todas as encomendas recebidas.

---

## 🖥️ Como usar o painel

1. A Fino Sabor entra no painel com a password.
2. Cada encomenda aparece num cartão com: número, cliente, telefone,
   produtos, quantidades, total, estado da encomenda e estado do pagamento.
3. Depois de confirmar manualmente o pagamento (M-Pesa/e-Mola), clica no
   botão de estado **"Paga"**.
4. O sistema prepara automaticamente a mensagem de WhatsApp correspondente
   (mostrada no cartão).
5. Clica em **"Enviar WhatsApp"** → abre o WhatsApp já com a mensagem e o
   número do cliente preenchidos. Basta clicar em enviar.
6. O mesmo processo se repete para os estados seguintes: **Em Preparação →
   Pronta → Concluída**.

---

## 🔎 Encontrar encomendas rápido quando o pagamento demora (novo)

Quando o M-Pesa/e-Mola só confirma horas depois, a SMS só traz um nome e um
valor — para não ter de percorrer a lista toda à procura, o painel agora
tem:

- **Campo de busca** no topo — escreve o nome do cliente (como aparece na
  SMS), o telefone, ou o número da encomenda (#FS0008), e só essa encomenda
  fica visível na hora.
- **"Há quanto tempo"** em cada encomenda (ex: "há 3h") em vez de só a
  data/hora exacta — mais fácil de bater com a hora da SMS. A data completa
  continua disponível ao passar o dedo/rato por cima.
- **Aviso automático** nas encomendas em "Aguardando Pagamento" há mais de
  2 horas — ganham uma borda amarela e o aviso "Aguardando pagamento há
  muito tempo — não esquecer", para não passarem despercebidas.
- Dentro do filtro **"Aguardando Pagamento"**, as encomendas mais antigas
  aparecem primeiro (em vez das mais recentes), para serem tratadas por
  ordem de chegada.

---

## ⚡ WhatsApp mais automático (novo)

Antes eram precisos 2 toques: mudar o estado e depois clicar em "Enviar
WhatsApp". Agora basta **um toque**:

- Ao tocar num botão de estado (ex: "Paga"), o WhatsApp **abre-se sozinho**
  já com a mensagem certa preenchida para o cliente certo.
- A Fino Sabor só precisa de tocar em **"Enviar"** dentro do próprio
  WhatsApp — esse último passo não pode ser automatizado sem a API paga do
  WhatsApp Business (fora do âmbito deste sistema, como combinado).
- Se quiser desligar esta abertura automática (por exemplo, para rever a
  mensagem com calma antes), há um interruptor em
  **Notificações 🔔 → "Abrir WhatsApp automaticamente ao mudar estado"**.
  O botão "Reenviar por WhatsApp" em cada encomenda continua sempre
  disponível, ligado ou desligado o automático.

---

## 📱 Uso no telemóvel & Acessibilidade (novo)

O painel foi ajustado para a Fino Sabor conseguir usar confortavelmente a
partir do telemóvel, sem se perder:

- **Totalmente responsivo** — em ecrãs pequenos, os filtros deslizam
  horizontalmente, os cartões de encomenda ocupam a largura toda, e os
  botões são grandes o suficiente para tocar com o dedo sem erros.
- **Guia rápido na primeira utilização** — ao entrar pela primeira vez,
  aparece uma caixa a explicar em 3 passos simples como usar o painel
  (pode ser fechada e não volta a aparecer).
- **Central de Notificações** — o sino 🔔 no topo abre uma lista com o
  histórico de encomendas novas recebidas. Cada notificação pode ser
  **eliminada individualmente** (ícone do lixo) ou todas de uma vez
  ("Limpar todas"). Um número vermelho no sino mostra quantas ainda não
  foram vistas.
- **Acessibilidade** — navegação por teclado (Tab/Enter/Esc), contornos de
  foco visíveis, textos alternativos para leitores de ecrã, e anúncios
  automáticos (ex: "Estado da encomenda FS0007 alterado para Paga") para
  quem usa leitor de ecrã.

---

## 🔔 Notificações em Tempo Real (novo)

Para que a Fino Sabor não precise de estar sempre a actualizar a página à
mão, o painel agora avisa automaticamente quando chega uma encomenda nova:

- **Som** — um pequeno "bip" toca no computador/telemóvel onde o painel
  está aberto.
- **Aviso dentro da página** — um pequeno cartão aparece a dizer o número
  da encomenda, o cliente e o total.
- **Notificação do sistema** — se activada, aparece mesmo que o painel
  esteja noutra aba ou minimizado (como uma notificação normal do
  Windows/telemóvel).
- **Título da aba a piscar** — "🔔 Nova Encomenda!" até se voltar a essa aba.

**Como activar:** no painel, clica no ícone do sino 🔔 no canto superior
direito. Na primeira vez, o navegador vai pedir permissão para mostrar
notificações — aceita para receberes o aviso mesmo fora da aba. Clicar de
novo no sino liga/desliga o som.

A bolinha ao lado do sino mostra o estado da ligação: verde = "Ao vivo"
(a receber avisos em tempo real), vermelho = "A religar…" (perdeu a
ligação ao servidor, tenta reconectar sozinho).

> Isto não usa nenhuma API paga nem WhatsApp automático — é apenas o
> navegador do painel a "ouvir" o servidor (tecnologia chamada
> Server-Sent Events), por isso continua 100% dentro do plano original:
> simples, leve e sem custos.

---

## ⚠️ Importante

- Este sistema é **semi-automático de propósito**: não liga automaticamente
  ao M-Pesa nem ao WhatsApp Business API — é a Fino Sabor quem confirma o
  pagamento e envia a mensagem, com um clique em vez de escrever tudo à mão.
- Ao publicar o site e o backend online (fora do computador local), lembre-se
  de actualizar:
  - `API_URL_ENCOMENDAS` dentro de `public/index.html`
  - `API_URL` dentro de `admin/painel.js`
  
  para o endereço público do servidor (em vez de `http://localhost:3000`).
- Mude a `ADMIN_PASSWORD` e o `JWT_SECRET` para valores fortes antes de usar
  em produção.
