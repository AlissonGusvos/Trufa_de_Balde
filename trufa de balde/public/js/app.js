
const containerProdutos = document.getElementById("produtos");
const containerCarrinho = document.getElementById("itens-carrinho");
const totalCarrinho = document.getElementById("total-carrinho");
const botaoFinalizar = document.getElementById("finalizar-pedido");

const campoBusca = document.getElementById("buscar-produto");
const containerFiltros = document.getElementById("filtros-categorias");

let todosProdutos = [];
let categoriaSelecionada = "Todos";
let carrinho = [];

// ========================================
// NOTIFICAÇÃO DE PRODUTO ADICIONADO
// ========================================

let temporizadorNotificacao;

function mostrarNotificacao(nomeProduto) {
  let notificacao = document.getElementById(
    "notificacao-carrinho"
  );

  if (!notificacao) {
    notificacao = document.createElement("div");
    notificacao.id = "notificacao-carrinho";
    notificacao.className = "notificacao-carrinho";
    notificacao.setAttribute("role", "status");
    notificacao.setAttribute("aria-live", "polite");

    document.body.appendChild(notificacao);
  }

  // Montar conteúdo de forma segura
  const icone = document.createElement("span");
  icone.className = "notificacao-icone";
  icone.textContent = "✓";

  const informacoes = document.createElement("div");

  const titulo = document.createElement("strong");
  titulo.textContent = "Produto adicionado ao carrinho!";

  const descricao = document.createElement("p");
  descricao.textContent = nomeProduto;

  informacoes.append(titulo, descricao);
  notificacao.replaceChildren(icone, informacoes);

  // Reiniciar animação caso o cliente adicione
  // vários produtos rapidamente
  clearTimeout(temporizadorNotificacao);

  notificacao.classList.remove("mostrar");

  void notificacao.offsetWidth;

  notificacao.classList.add("mostrar");

  temporizadorNotificacao = setTimeout(() => {
    notificacao.classList.remove("mostrar");
  }, 3000);
}

// ========================================
// RECUPERAR CARRINHO SALVO
// ========================================

try {
  const salvo = JSON.parse(
    localStorage.getItem("trufa_carrinho") || "[]"
  );

  if (Array.isArray(salvo)) {
    carrinho = salvo;
  }
} catch {
  carrinho = [];
}

// FORMATAR PREÇOS
const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

// NORMALIZAR TEXTO PARA A PESQUISA
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ========================================
// CARREGAR PRODUTOS DO BANCO DE DADOS
// ========================================

async function carregarProdutos() {
  try {
    const resposta = await fetch("/api/produtos");

    if (!resposta.ok) {
      throw new Error("Falha ao carregar produtos");
    }

    const produtos = await resposta.json();

    if (!Array.isArray(produtos)) {
      throw new Error("Formato de produtos inválido");
    }

    todosProdutos = produtos;

    criarFiltrosCategorias();
    filtrarProdutos();

  } catch (erro) {
    console.error(erro);

    containerProdutos.textContent =
      "Não foi possível carregar o cardápio.";
  }
}

// ========================================
// CRIAR BOTÕES DE CATEGORIAS
// ========================================

function criarFiltrosCategorias() {
  if (!containerFiltros) return;

  const categorias = [
    ...new Set(
      todosProdutos.map(
        (produto) => produto.categoria || "Delícias"
      )
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  containerFiltros.replaceChildren();

  const todasCategorias = ["Todos", ...categorias];

  todasCategorias.forEach((categoria) => {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "filtro";
    botao.textContent = categoria;
    botao.dataset.categoria = categoria;

    if (categoria === categoriaSelecionada) {
      botao.classList.add("ativo");
      botao.setAttribute("aria-pressed", "true");
    } else {
      botao.setAttribute("aria-pressed", "false");
    }

    botao.addEventListener("click", () => {
      categoriaSelecionada = categoria;

      containerFiltros
        .querySelectorAll(".filtro")
        .forEach((outroBotao) => {
          const ativo =
            outroBotao.dataset.categoria === categoria;

          outroBotao.classList.toggle("ativo", ativo);
          outroBotao.setAttribute(
            "aria-pressed",
            String(ativo)
          );
        });

      filtrarProdutos();
    });

    containerFiltros.appendChild(botao);
  });
}

// ========================================
// FILTRAR PRODUTOS POR NOME E CATEGORIA
// ========================================

function filtrarProdutos() {
  const pesquisa = normalizarTexto(
    campoBusca ? campoBusca.value : ""
  );

  const produtosFiltrados = todosProdutos.filter((produto) => {
    const categoria = produto.categoria || "Delícias";

    const correspondeCategoria =
      categoriaSelecionada === "Todos" ||
      categoria === categoriaSelecionada;

    const textoProduto = normalizarTexto(
      `${produto.nome} ${produto.descricao || ""} ${categoria}`
    );

    const correspondeBusca =
      textoProduto.includes(pesquisa);

    return correspondeCategoria && correspondeBusca;
  });

  renderizarProdutos(produtosFiltrados);
}

// ========================================
// EXIBIR PRODUTOS NA TELA
// ========================================

function renderizarProdutos(produtos) {
  containerProdutos.replaceChildren();

  if (todosProdutos.length === 0) {
    containerProdutos.textContent =
      "Nosso cardápio está sendo preparado.";
    return;
  }

  if (produtos.length === 0) {
    const mensagem = document.createElement("p");

    mensagem.textContent =
      "Nenhum produto encontrado. Tente outra pesquisa ou categoria.";

    containerProdutos.appendChild(mensagem);
    return;
  }

  produtos.forEach((produto) => {
    const card = document.createElement("article");
    card.className = "produto-card";

    // IMAGEM DO PRODUTO
    const imagem = document.createElement("img");
    imagem.className = "produto-imagem";
    imagem.alt = `Foto de ${produto.nome}`;
    imagem.loading = "lazy";

    const imagemPadrao = "/images/sem-foto.svg";

    imagem.src = produto.imagem_url || imagemPadrao;

    imagem.addEventListener("error", () => {
      if (!imagem.src.endsWith(imagemPadrao)) {
        imagem.src = imagemPadrao;
      }
    });

    const categoria = document.createElement("p");
    categoria.className = "produto-categoria";
    categoria.textContent = produto.categoria || "Delícias";

    const nome = document.createElement("h3");
    nome.textContent = produto.nome;

    const descricao = document.createElement("p");
    descricao.textContent = produto.descricao || "";

    const preco = document.createElement("p");
    preco.className = "produto-preco";
    preco.textContent = moeda(produto.preco);

    const botao = document.createElement("button");
    botao.className = "botao";
    botao.textContent = "Adicionar ao carrinho";

    botao.addEventListener("click", () => {
      adicionarAoCarrinho(produto);
    });

    card.append(
      imagem,
      categoria,
      nome,
      descricao,
      preco,
      botao
    );

    containerProdutos.appendChild(card);
  });
}

// ========================================
// PESQUISA EM TEMPO REAL
// ========================================

if (campoBusca) {
  campoBusca.addEventListener("input", filtrarProdutos);
}

// ========================================
// ADICIONAR PRODUTO AO CARRINHO
// ========================================

function adicionarAoCarrinho(produto) {
  const item = carrinho.find(
    (item) => item.id === produto.id
  );

  if (item) {
    item.quantidade++;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      quantidade: 1
    });
  }

  renderizarCarrinho();

  // EXIBIR CONFIRMAÇÃO
  mostrarNotificacao(produto.nome);
}

// ========================================
// ALTERAR QUANTIDADE
// ========================================

function alterarQuantidade(id, variacao) {
  const item = carrinho.find((item) => item.id === id);

  if (!item) return;

  item.quantidade += variacao;

  if (item.quantidade <= 0) {
    const indice = carrinho.findIndex(
      (item) => item.id === id
    );

    carrinho.splice(indice, 1);
  }

  renderizarCarrinho();
}

// ========================================
// EXIBIR CARRINHO
// ========================================

function renderizarCarrinho() {
  containerCarrinho.replaceChildren();

  if (carrinho.length === 0) {
    containerCarrinho.textContent =
      "Seu carrinho está vazio.";
  }

  carrinho.forEach((item) => {
    const linha = document.createElement("article");
    linha.className = "item-carrinho";

    const informacoes = document.createElement("div");

    const nome = document.createElement("strong");
    nome.textContent = item.nome;

    const subtotal = document.createElement("p");
    subtotal.textContent =
      `${item.quantidade} × ${moeda(item.preco)} = ` +
      moeda(item.preco * item.quantidade);

    informacoes.append(nome, subtotal);

    const controles = document.createElement("div");
    controles.className = "controles-quantidade";

    const diminuir = document.createElement("button");
    diminuir.type = "button";
    diminuir.textContent = "−";

    diminuir.setAttribute(
      "aria-label",
      `Diminuir ${item.nome}`
    );

    diminuir.addEventListener("click", () => {
      alterarQuantidade(item.id, -1);
    });

    const quantidade = document.createElement("span");
    quantidade.textContent = item.quantidade;

    const aumentar = document.createElement("button");
    aumentar.type = "button";
    aumentar.textContent = "+";

    aumentar.setAttribute(
      "aria-label",
      `Aumentar ${item.nome}`
    );

    aumentar.addEventListener("click", () => {
      alterarQuantidade(item.id, 1);
    });

    controles.append(
      diminuir,
      quantidade,
      aumentar
    );

    linha.append(
      informacoes,
      controles
    );

    containerCarrinho.appendChild(linha);
  });

  const total = carrinho.reduce(
    (soma, item) =>
      soma + item.preco * item.quantidade,
    0
  );

  totalCarrinho.textContent = moeda(total);

  botaoFinalizar.disabled =
    carrinho.length === 0;

  localStorage.setItem(
    "trufa_carrinho",
    JSON.stringify(carrinho)
  );
}

// ========================================
// FINALIZAR PEDIDO
// ========================================

botaoFinalizar.addEventListener("click", () => {
  if (carrinho.length === 0) {
    alert("Adicione pelo menos um produto ao carrinho.");
    return;
  }

  window.location.href = "/checkout.html";
});

// ========================================
// INICIAR SISTEMA
// ========================================

carregarProdutos();
renderizarCarrinho();
