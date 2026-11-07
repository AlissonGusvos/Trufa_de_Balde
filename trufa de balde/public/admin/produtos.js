
const formulario = document.getElementById("form-produto");
const listaProdutos = document.getElementById("lista-produtos");
const mensagem = document.getElementById("mensagem");

const tituloFormulario = document.getElementById("titulo-formulario");
const botaoSalvar = document.getElementById("btn-salvar");
const botaoCancelar = document.getElementById("btn-cancelar");

const campoNome = document.getElementById("nome");
const campoPreco = document.getElementById("preco");
const campoCategoria = document.getElementById("categoria");
const campoImagem = document.getElementById("imagem_url");
const campoArquivo = document.getElementById("imagem_arquivo");
const previewImagem = document.getElementById("preview-imagem");
const campoDescricao = document.getElementById("descricao");
const campoDisponivel = document.getElementById("disponivel");

let produtos = [];
let produtoEmEdicao = null;

function moeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function verificarLogin(resposta) {
    if (resposta.status === 401) {
        window.location.href = "/admin/login.html";
        return false;
    }

    return true;
}

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? "#b3261e" : "#217a40";
}

function criarCelula(linha, texto) {
    const celula = linha.insertCell();
    celula.textContent = String(texto);
    return celula;
}

// ========================================
// CARREGAR PRODUTOS
// ========================================

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos/admin", {
            credentials: "same-origin"
        });

        if (!verificarLogin(resposta)) return;

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os produtos.");
        }

        produtos = await resposta.json();

        listaProdutos.replaceChildren();

        if (produtos.length === 0) {
            const linha = listaProdutos.insertRow();
            const celula = linha.insertCell();
            celula.colSpan = 6;
            celula.textContent = "Nenhum produto cadastrado.";
            return;
        }

        produtos.forEach((produto) => {
            const linha = listaProdutos.insertRow();

            criarCelula(linha, produto.id);
            criarCelula(linha, produto.nome);
            criarCelula(linha, produto.categoria || "-");
            criarCelula(linha, moeda(produto.preco));

            const celulaStatus = criarCelula(
                linha,
                produto.disponivel ? "Disponível" : "Indisponível"
            );

            celulaStatus.className = produto.disponivel
                ? "disponivel"
                : "indisponivel";

            const celulaAcoes = linha.insertCell();
            const acoes = document.createElement("div");
            acoes.className = "acoes-tabela";

            const botaoEditar = document.createElement("button");
            botaoEditar.type = "button";
            botaoEditar.textContent = "Editar";

            botaoEditar.addEventListener("click", () => {
                iniciarEdicao(produto);
            });

            const botaoDisponibilidade = document.createElement("button");
            botaoDisponibilidade.type = "button";
            botaoDisponibilidade.className = "botao-secundario";
            botaoDisponibilidade.textContent = produto.disponivel
                ? "Desativar"
                : "Ativar";

            botaoDisponibilidade.addEventListener("click", async () => {
                await alterarDisponibilidade(
                    produto,
                    botaoDisponibilidade
                );
            });

            acoes.append(botaoEditar, botaoDisponibilidade);
            celulaAcoes.appendChild(acoes);
        });

    } catch (erro) {
        listaProdutos.replaceChildren();

        const linha = listaProdutos.insertRow();
        const celula = linha.insertCell();

        celula.colSpan = 6;
        celula.textContent = erro.message;
    }
}

// ========================================
// CADASTRAR OU EDITAR PRODUTO
// ========================================

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const dados = {
        nome: campoNome.value.trim(),
        preco: campoPreco.value,
        categoria: campoCategoria.value.trim(),
        imagem_url: campoImagem.value.trim(),
        descricao: campoDescricao.value.trim(),
        disponivel: campoDisponivel.value === "true"
    };

    const editando = produtoEmEdicao !== null;

    const endereco = editando
        ? `/api/produtos/${produtoEmEdicao}`
        : "/api/produtos";

    const metodo = editando ? "PUT" : "POST";

    botaoSalvar.disabled = true;
    mostrarMensagem("Salvando produto...");

    try {
        const imagemUrl = await enviarImagem();
        dados.imagem_url = imagemUrl;
        const resposta = await fetch(endereco, {
            method: metodo,
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!verificarLogin(resposta)) return;

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem || "Não foi possível salvar o produto."
            );
        }

        limparFormulario();

        mostrarMensagem(resultado.mensagem);

        await carregarProdutos();

    } catch (erro) {
        mostrarMensagem(erro.message, true);

    } finally {
        botaoSalvar.disabled = false;
    }
});

// ========================================
// INICIAR EDIÇÃO
// ========================================

function iniciarEdicao(produto) {
    produtoEmEdicao = produto.id;

    campoNome.value = produto.nome || "";
    campoPreco.value = produto.preco;
    campoCategoria.value = produto.categoria || "";
    campoImagem.value = produto.imagem_url || "";
    campoArquivo.value = "";
    atualizarPreview(campoImagem.value);
    campoDescricao.value = produto.descricao || "";
    campoDisponivel.value = String(produto.disponivel);

    tituloFormulario.textContent = `Editar produto #${produto.id}`;
    botaoSalvar.textContent = "Salvar alterações";
    botaoCancelar.hidden = false;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    campoNome.focus();
}

// ========================================
// CANCELAR EDIÇÃO
// ========================================

function limparFormulario() {
    formulario.reset();

    campoImagem.value = "";
    campoArquivo.value = "";
    atualizarPreview("");

    produtoEmEdicao = null;

    tituloFormulario.textContent = "Cadastrar produto";
    botaoSalvar.textContent = "Cadastrar produto";
    botaoCancelar.hidden = true;
}

botaoCancelar.addEventListener("click", () => {
    limparFormulario();
    mostrarMensagem("");
});

// ========================================
// ATIVAR OU DESATIVAR
// ========================================

async function alterarDisponibilidade(produto, botao) {
    const novaDisponibilidade = !produto.disponivel;

    const acao = novaDisponibilidade ? "ativar" : "desativar";

    if (!confirm(`Deseja ${acao} "${produto.nome}"?`)) {
        return;
    }

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `/api/produtos/${produto.id}/disponibilidade`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    disponivel: novaDisponibilidade
                })
            }
        );

        if (!verificarLogin(resposta)) return;

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem ||
                "Não foi possível alterar a disponibilidade."
            );
        }

        mostrarMensagem(resultado.mensagem);
        await carregarProdutos();

    } catch (erro) {
        mostrarMensagem(erro.message, true);
        botao.disabled = false;
    }
}


// ========================================
// PRÉ-VISUALIZAÇÃO DA IMAGEM
// ========================================

function atualizarPreview(url) {
    if (url) {
        previewImagem.src = url;
        previewImagem.hidden = false;
    } else {
        previewImagem.removeAttribute("src");
        previewImagem.hidden = true;
    }
}

campoArquivo.addEventListener("change", () => {
    const arquivo = campoArquivo.files[0];

    if (!arquivo) {
        atualizarPreview(campoImagem.value);
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
        mostrarMensagem("Escolha uma imagem JPG, PNG ou WebP.", true);
        campoArquivo.value = "";
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        mostrarMensagem("A imagem deve ter no máximo 5 MB.", true);
        campoArquivo.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
        atualizarPreview(leitor.result);
    };

    leitor.readAsDataURL(arquivo);
});

// ========================================
// ENVIAR IMAGEM AO SERVIDOR
// ========================================

async function enviarImagem() {
    const arquivo = campoArquivo.files[0];

    if (!arquivo) {
        return campoImagem.value;
    }

    const dados = new FormData();
    dados.append("imagem", arquivo);

    const resposta = await fetch("/api/produtos/upload", {
        method: "POST",
        credentials: "same-origin",
        body: dados
    });

    if (!verificarLogin(resposta)) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            resultado.mensagem || "Não foi possível enviar a imagem."
        );
    }

    return resultado.imagem_url;
}


// INICIAR
carregarProdutos();
