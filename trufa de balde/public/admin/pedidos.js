
const listaPedidos = document.getElementById("lista-pedidos");

const modalPedido = document.getElementById("modal-pedido");
const tituloDetalhes = document.getElementById("titulo-detalhes");
const conteudoDetalhes = document.getElementById("conteudo-detalhes");
const botaoFecharModal = document.getElementById("fechar-modal");
const botaoSair = document.getElementById("btn-sair");

const statusDisponiveis = [
    { valor: "novo", texto: "Novo" },
    { valor: "preparando", texto: "Preparando" },
    { valor: "pronto", texto: "Pronto" },
    { valor: "entregue", texto: "Entregue" },
    { valor: "cancelado", texto: "Cancelado" }
];

const moeda = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const formatarData = (data) =>
    new Date(data).toLocaleString("pt-BR");

// ========================================
// 1. CARREGAR PEDIDOS
// ========================================

async function carregarPedidos() {
    try {
        const resposta = await fetch("/api/pedidos", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            window.location.href = "/admin/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os pedidos.");
        }

        const pedidos = await resposta.json();

        listaPedidos.replaceChildren();

        if (pedidos.length === 0) {
            const linha = listaPedidos.insertRow();
            const celula = linha.insertCell();

            celula.colSpan = 7;
            celula.textContent = "Nenhum pedido encontrado.";
            return;
        }

        pedidos.forEach((pedido) => {
            const linha = listaPedidos.insertRow();

            // ID DO PEDIDO
            linha.insertCell().textContent = `#${pedido.id}`;

            // CLIENTE
            linha.insertCell().textContent =
                pedido.cliente || "Não informado";

            // TELEFONE
            linha.insertCell().textContent =
                pedido.telefone || "Não informado";

            // TOTAL
            linha.insertCell().textContent =
                moeda(pedido.total);

            // STATUS
            const celulaStatus = linha.insertCell();

            const seletor = document.createElement("select");

            statusDisponiveis.forEach((opcao) => {
                const elemento = document.createElement("option");

                elemento.value = opcao.valor;
                elemento.textContent = opcao.texto;

                seletor.appendChild(elemento);
            });

            seletor.value = pedido.status;
            celulaStatus.appendChild(seletor);

            // DATA
            linha.insertCell().textContent =
                formatarData(pedido.criado_em);

            // AÇÕES
            const celulaAcao = linha.insertCell();

            const acoes = document.createElement("div");
            acoes.className = "acoes-pedido";

            // BOTÃO SALVAR
            const botaoSalvar = document.createElement("button");
            botaoSalvar.type = "button";
            botaoSalvar.className = "botao-painel";
            botaoSalvar.textContent = "Salvar";

            botaoSalvar.addEventListener("click", async () => {
                await atualizarStatus(
                    pedido.id,
                    seletor.value,
                    botaoSalvar
                );
            });

            // BOTÃO VER DETALHES
            const botaoDetalhes = document.createElement("button");
            botaoDetalhes.type = "button";
            botaoDetalhes.className =
                "botao-painel botao-detalhes";
            botaoDetalhes.textContent = "Ver detalhes";

            botaoDetalhes.addEventListener("click", async () => {
                await visualizarDetalhes(pedido.id);
            });

            acoes.append(botaoSalvar, botaoDetalhes);
            celulaAcao.appendChild(acoes);
        });

    } catch (erro) {
        listaPedidos.replaceChildren();

        const linha = listaPedidos.insertRow();
        const celula = linha.insertCell();

        celula.colSpan = 7;
        celula.textContent = erro.message;
    }
}

// ========================================
// 2. ATUALIZAR STATUS
// ========================================

async function atualizarStatus(id, status, botao) {
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const resposta = await fetch(
            `/api/pedidos/${id}/status`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

        if (resposta.status === 401) {
            window.location.href = "/admin/login.html";
            return;
        }

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem || "Erro ao atualizar pedido."
            );
        }

        alert(`Pedido #${id} atualizado para: ${status}`);

        await carregarPedidos();

    } catch (erro) {
        alert(erro.message);

        botao.disabled = false;
        botao.textContent = "Salvar";
    }
}

// ========================================
// 3. VISUALIZAR DETALHES DO PEDIDO
// ========================================

async function visualizarDetalhes(id) {
    tituloDetalhes.textContent = `Pedido #${id}`;
    conteudoDetalhes.textContent = "Carregando informações...";

    if (!modalPedido.open) {
        modalPedido.showModal();
    }

    try {
        const resposta = await fetch(
            `/api/pedidos/${id}/detalhes`,
            {
                credentials: "same-origin"
            }
        );

        if (resposta.status === 401) {
            window.location.href = "/admin/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os detalhes.");
        }

        const dados = await resposta.json();

        if (!modalPedido.open) return;

        renderizarDetalhes(dados);

    } catch (erro) {
        conteudoDetalhes.textContent = erro.message;
    }
}

// ========================================
// 4. MOSTRAR INFORMAÇÕES NO MODAL
// ========================================

function renderizarDetalhes(dados) {
    const { pedido, itens, pagamento } = dados;

    conteudoDetalhes.replaceChildren();

    // INFORMAÇÕES DO CLIENTE
    const grupoCliente = criarGrupo("👤 Cliente");

    adicionarInformacao(
        grupoCliente,
        "Nome",
        pedido.cliente || "Não informado"
    );

    adicionarInformacao(
        grupoCliente,
        "Telefone",
        pedido.telefone || "Não informado"
    );

    adicionarInformacao(
        grupoCliente,
        "E-mail",
        pedido.email || "Não informado"
    );

    // INFORMAÇÕES DA ENTREGA
    const grupoEntrega = criarGrupo("📦 Entrega");

    adicionarInformacao(
        grupoEntrega,
        "Tipo",
        pedido.tipo_entrega === "entrega"
            ? "Entrega"
            : "Retirada"
    );

    if (pedido.tipo_entrega === "entrega") {
        adicionarInformacao(
            grupoEntrega,
            "Endereço",
            pedido.endereco_entrega || "Não informado"
        );
    }

    adicionarInformacao(
        grupoEntrega,
        "Data do pedido",
        formatarData(pedido.criado_em)
    );

    adicionarInformacao(
        grupoEntrega,
        "Status",
        pedido.status
    );

    // PRODUTOS COMPRADOS
    const grupoProdutos = criarGrupo("🍫 Produtos comprados");

    const tabela = document.createElement("table");
    tabela.className = "tabela-itens";

    const cabecalho = document.createElement("thead");
    const linhaCabecalho = document.createElement("tr");

    ["Produto", "Qtd.", "Preço", "Subtotal"].forEach((texto) => {
        const th = document.createElement("th");
        th.textContent = texto;
        linhaCabecalho.appendChild(th);
    });

    cabecalho.appendChild(linhaCabecalho);

    const corpo = document.createElement("tbody");

    itens.forEach((item) => {
        const linha = document.createElement("tr");

        [
            item.nome_produto,
            item.quantidade,
            moeda(item.preco_unitario),
            moeda(item.subtotal)
        ].forEach((valor) => {
            const celula = document.createElement("td");
            celula.textContent = valor;
            linha.appendChild(celula);
        });

        corpo.appendChild(linha);
    });

    tabela.append(cabecalho, corpo);
    grupoProdutos.appendChild(tabela);

    // TOTAL DO PEDIDO
    const total = document.createElement("p");
    total.className = "total-detalhes";
    total.textContent = `Total: ${moeda(pedido.total)}`;

    grupoProdutos.appendChild(total);


// PAGAMENTO
const grupoPagamento = criarGrupo("💳 Pagamento");

const nomesMetodos = {
  pix: "PIX",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  presencial: "Pagamento presencial"
};

const nomesLocais = {
  visita: "Durante a visita / entrega",
  loja: "Na loja"
};

adicionarInformacao(
  grupoPagamento,
  "Método",
  nomesMetodos[pagamento?.metodo] ||
    pagamento?.metodo ||
    "Não informado"
);

if (pagamento?.metodo === "presencial") {
  adicionarInformacao(
    grupoPagamento,
    "Local do pagamento",
    nomesLocais[pagamento.local_pagamento] ||
      "Não informado"
  );
}

adicionarInformacao(
  grupoPagamento,
  "Situação",
  pagamento?.status || "Não informado"
);

// Permitir confirmação apenas para pagamentos presenciais pendentes
if (
  pagamento?.metodo === "presencial" &&
  pagamento?.status === "pendente"
) {
  const botaoConfirmar = document.createElement("button");

  botaoConfirmar.type = "button";
  botaoConfirmar.className = "botao-painel";
  botaoConfirmar.textContent = "✓ Confirmar pagamento recebido";
  botaoConfirmar.style.marginTop = "12px";

  botaoConfirmar.addEventListener("click", async () => {
    await confirmarPagamentoPresencial(
      pedido.id,
      botaoConfirmar
    );
  });

  grupoPagamento.appendChild(botaoConfirmar);
}


    conteudoDetalhes.append(
        grupoCliente,
        grupoEntrega,
        grupoProdutos,
        grupoPagamento
    );
}

// ========================================
// 5. FUNÇÕES AUXILIARES
// ========================================

function criarGrupo(titulo) {
    const grupo = document.createElement("section");
    grupo.className = "detalhe-grupo";

    const cabecalho = document.createElement("h3");
    cabecalho.textContent = titulo;

    grupo.appendChild(cabecalho);

    return grupo;
}

function adicionarInformacao(grupo, titulo, valor) {
    const paragrafo = document.createElement("p");

    const destaque = document.createElement("strong");
    destaque.textContent = `${titulo}: `;

    const texto = document.createTextNode(String(valor));

    paragrafo.append(destaque, texto);
    grupo.appendChild(paragrafo);
}

// ========================================
// 6. FECHAR MODAL
// ========================================

if (botaoFecharModal && modalPedido) {
    botaoFecharModal.addEventListener("click", () => {
        modalPedido.close();
    });
}

// ========================================
// 7. SAIR DO PAINEL
// ========================================

botaoSair.addEventListener("click", async () => {
    try {
        const resposta = await fetch("/api/admin/logout", {
            method: "POST",
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível encerrar a sessão.");
        }

        window.location.href = "/admin/login.html";

    } catch (erro) {
        alert(erro.message);
    }
});

// INICIAR


// ========================================
// CONFIRMAR PAGAMENTO PRESENCIAL
// ========================================

async function confirmarPagamentoPresencial(id, botao) {
  const confirmou = window.confirm(
    `Você realmente recebeu o pagamento do pedido #${id}?`
  );

  if (!confirmou) return;

  botao.disabled = true;
  botao.textContent = "Confirmando...";

  try {
    const resposta = await fetch(
      `/api/pedidos/${id}/confirmar-pagamento`,
      {
        method: "PATCH",
        credentials: "same-origin"
      }
    );

    if (resposta.status === 401) {
      window.location.href = "/admin/login.html";
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        "Não foi possível confirmar o pagamento."
      );
    }

    alert("Pagamento confirmado com sucesso!");

    await visualizarDetalhes(id);
    await carregarPedidos();

  } catch (erro) {
    alert(erro.message);
    botao.disabled = false;
    botao.textContent = "✓ Confirmar pagamento recebido";
  }
}


carregarPedidos();
