
const form = document.getElementById("form-checkout");

const resumo = document.getElementById("resumo-pedido");
const mensagem = document.getElementById("mensagem");

const tipoEntrega = document.getElementById("tipo-entrega");
const campoEndereco = document.getElementById("campo-endereco");
const endereco = document.getElementById("endereco");
const campoEmail = document.getElementById("email");

const pagamentoOnline = document.getElementById("pagamento-online");
const pagamentoPresencial = document.getElementById("pagamento-presencial");
const opcaoVisita = document.getElementById("opcao-visita");

const botao = form.querySelector('button[type="submit"]');

const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

// CARRINHO

function obterCarrinho() {
  try {
    const dados = JSON.parse(
      localStorage.getItem("trufa_carrinho") || "[]"
    );

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

// RESUMO DO PEDIDO

function mostrarResumo() {
  const itens = obterCarrinho();

  if (itens.length === 0) {
    resumo.textContent =
      "Seu carrinho está vazio. Volte ao cardápio para escolher seus doces.";

    botao.disabled = true;
    return;
  }

  resumo.replaceChildren();

  itens.forEach((item) => {
    const linha = document.createElement("p");

    linha.textContent =
      `${item.nome} — ${item.quantidade} unidade(s)`;

    resumo.appendChild(linha);
  });

  const aviso = document.createElement("p");

  aviso.textContent =
    "O preço final será calculado e validado pelo servidor.";

  resumo.appendChild(aviso);
}

// ATUALIZAR TIPO DE ENTREGA

function atualizarEntrega() {
  const entregaSelecionada =
    tipoEntrega.value === "entrega";

  campoEndereco.hidden = !entregaSelecionada;
  endereco.required = entregaSelecionada;

  atualizarPagamento();
}

// ATUALIZAR OPÇÕES DE PAGAMENTO

function atualizarPagamento() {
  const tipoSelecionado = document.querySelector(
    'input[name="tipoPagamento"]:checked'
  )?.value;

  const online = tipoSelecionado === "online";

  pagamentoOnline.hidden = !online;
  pagamentoPresencial.hidden = online;

  const radiosOnline = document.querySelectorAll(
    'input[name="metodoOnline"]'
  );

  const radiosPresenciais = document.querySelectorAll(
    'input[name="localPagamento"]'
  );

  radiosOnline.forEach((radio) => {
    radio.disabled = !online;
  });

  radiosPresenciais.forEach((radio) => {
    radio.disabled = online;
  });

  // Pagamento durante a visita só para entrega

  const permiteVisita = tipoEntrega.value === "entrega";

  opcaoVisita.hidden = !permiteVisita;

  const radioVisita = document.querySelector(
    'input[name="localPagamento"][value="visita"]'
  );

  const radioLoja = document.querySelector(
    'input[name="localPagamento"][value="loja"]'
  );

  radioVisita.disabled = online || !permiteVisita;

  if (!permiteVisita && radioVisita.checked) {
    radioVisita.checked = false;
  }

  if (!online) {
    const selecionado = document.querySelector(
      'input[name="localPagamento"]:checked'
    );

    if (!selecionado) {
      if (permiteVisita) {
        radioVisita.checked = true;
      } else {
        radioLoja.checked = true;
      }
    }
  }
}

// EVENTOS

tipoEntrega.addEventListener(
  "change",
  atualizarEntrega
);

document.querySelectorAll(
  'input[name="tipoPagamento"]'
).forEach((radio) => {
  radio.addEventListener(
    "change",
    atualizarPagamento
  );
});

// FINALIZAR PEDIDO

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const itens = obterCarrinho();

  if (itens.length === 0) {
    mensagem.textContent =
      "Adicione produtos antes de continuar.";
    return;
  }

  const tipoPagamento = document.querySelector(
    'input[name="tipoPagamento"]:checked'
  )?.value;

  const metodoOnline = document.querySelector(
    'input[name="metodoOnline"]:checked'
  )?.value;

  const localPagamento = document.querySelector(
    'input[name="localPagamento"]:checked'
  )?.value;

  let metodoPagamento;
  let localPagamentoFinal = null;

  if (tipoPagamento === "online") {
    metodoPagamento = metodoOnline;
  } else {
    metodoPagamento = "presencial";
    localPagamentoFinal = localPagamento;
  }

  const dados = {
    nome: form.elements["nome"].value.trim(),
    telefone: form.elements["telefone"].value.trim(),
    email: campoEmail.value.trim(),

    tipoEntrega: tipoEntrega.value,

    endereco: tipoEntrega.value === "entrega"
      ? endereco.value.trim()
      : null,

    tipoPagamento,
    metodoPagamento,
    localPagamento: localPagamentoFinal,

    itens: itens.map((item) => ({
      produtoId: item.id,
      quantidade: item.quantidade
    }))
  };

  // VALIDAÇÕES

  if (!dados.nome || !dados.telefone || !dados.email) {
    mensagem.textContent =
      "Preencha todos os dados pessoais.";
    return;
  }

  if (
    dados.tipoEntrega === "entrega" &&
    !dados.endereco
  ) {
    mensagem.textContent =
      "Informe o endereço de entrega.";
    return;
  }

  if (
    tipoPagamento === "presencial" &&
    !localPagamentoFinal
  ) {
    mensagem.textContent =
      "Escolha onde deseja realizar o pagamento.";
    return;
  }

  if (
    localPagamentoFinal === "visita" &&
    dados.tipoEntrega !== "entrega"
  ) {
    mensagem.textContent =
      "Pagamento durante a visita exige entrega.";
    return;
  }

  botao.disabled = true;
  mensagem.textContent = "Registrando seu pedido...";

  try {
    const resposta = await fetch("/api/pedidos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem || "Erro ao registrar pedido."
      );
    }

    const pedidoId = resultado.pedido?.id;

    mensagem.textContent =
      `Pedido #${pedidoId} registrado! ` +
      "Pagamento pendente de confirmação.";

    localStorage.removeItem("trufa_carrinho");

    resumo.replaceChildren();

    botao.disabled = true;

  } catch (erro) {
    mensagem.textContent = erro.message;
    botao.disabled = false;
  }
});

// INICIALIZAÇÃO

atualizarEntrega();
mostrarResumo();
