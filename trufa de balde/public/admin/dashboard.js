
const moeda = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const statusPedidos = [
    {
        campo: "pedidos_novos",
        nome: "Novos",
        cor: "#a05a2c"
    },
    {
        campo: "pedidos_preparando",
        nome: "Preparando",
        cor: "#e9a23b"
    },
    {
        campo: "pedidos_prontos",
        nome: "Prontos",
        cor: "#4488cc"
    },
    {
        campo: "pedidos_entregues",
        nome: "Entregues",
        cor: "#39865a"
    },
    {
        campo: "pedidos_cancelados",
        nome: "Cancelados",
        cor: "#b3261e"
    }
];

async function carregarDashboard() {
    const mensagem = document.getElementById("mensagem");

    try {
        const resposta = await fetch("/api/dashboard/resumo", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            window.location.href = "/admin/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar o dashboard.");
        }

        const dados = await resposta.json();
        const pedidos = dados.pedidos;

        // INDICADORES
        document.getElementById("faturamento").textContent =
            moeda(dados.faturamento);

        document.getElementById("total-pedidos").textContent =
            pedidos.total_pedidos;

        document.getElementById("pedidos-novos").textContent =
            pedidos.pedidos_novos;

        document.getElementById("pedidos-preparando").textContent =
            pedidos.pedidos_preparando;

        document.getElementById("pedidos-entregues").textContent =
            pedidos.pedidos_entregues;

        document.getElementById("produtos-disponiveis").textContent =
            dados.produtos_disponiveis;

        // DISTRIBUIÇÃO DE STATUS
        const barra = document.getElementById("barra-status");
        const legenda = document.getElementById("legenda-status");

        barra.replaceChildren();
        legenda.replaceChildren();

        const total = Number(pedidos.total_pedidos);

        statusPedidos.forEach((status) => {
            const quantidade = Number(pedidos[status.campo] || 0);
            const percentual = total > 0
                ? (quantidade / total) * 100
                : 0;

            if (quantidade > 0) {
                const segmento = document.createElement("div");
                segmento.className = "segmento";
                segmento.style.width = `${percentual}%`;
                segmento.style.backgroundColor = status.cor;
                segmento.title =
                    `${status.nome}: ${quantidade} (${percentual.toFixed(1)}%)`;

                barra.appendChild(segmento);
            }

            const itemLegenda = document.createElement("div");
            itemLegenda.className = "legenda-item";

            const bolinha = document.createElement("span");
            bolinha.className = "bolinha";
            bolinha.style.backgroundColor = status.cor;

            const texto = document.createElement("span");
            texto.textContent = `${status.nome}: ${quantidade}`;

            itemLegenda.append(bolinha, texto);
            legenda.appendChild(itemLegenda);
        });

        barra.setAttribute(
            "aria-label",
            statusPedidos.map(
                (s) => `${s.nome}: ${pedidos[s.campo] || 0}`
            ).join(", ")
        );

        // PRODUTOS MAIS VENDIDOS
        const tabela = document.getElementById("mais-vendidos");
        tabela.replaceChildren();

        if (!dados.mais_vendidos.length) {
            const linha = tabela.insertRow();
            const celula = linha.insertCell();
            celula.colSpan = 2;
            celula.textContent =
                "Ainda não existem vendas com pagamento confirmado.";
        } else {
            dados.mais_vendidos.forEach((produto) => {
                const linha = tabela.insertRow();

                linha.insertCell().textContent =
                    produto.nome_produto;

                linha.insertCell().textContent =
                    produto.quantidade_vendida;
            });
        }


// GRÁFICO DE VENDAS DOS ÚLTIMOS 7 DIAS

const grafico = document.getElementById("grafico-vendas");

if (grafico) {
    grafico.replaceChildren();

    const vendas = dados.vendas_diarias || [];

    const maiorVenda = Math.max(
        0,
        ...vendas.map((venda) => Number(venda.total))
    );

    vendas.forEach((venda) => {
        const coluna = document.createElement("div");
        coluna.className = "coluna-venda";

        // VALOR DA VENDA
        const valor = document.createElement("span");
        valor.className = "valor-venda";
        valor.textContent = moeda(venda.total);

        // BARRA DO GRÁFICO
        const barra = document.createElement("div");
        barra.className = "barra-venda";

        const altura = maiorVenda > 0
            ? (Number(venda.total) / maiorVenda) * 180
            : 0;

        barra.style.height = `${Math.max(altura, 3)}px`;

        // DATA
        const data = document.createElement("span");
        data.className = "data-venda";

        const partes = venda.dia.split("-");
        data.textContent = `${partes[2]}/${partes[1]}`;

        coluna.append(valor, barra, data);
        grafico.appendChild(coluna);
    });

    if (vendas.length === 0) {
        grafico.textContent = "Nenhum dado disponível.";
    }
}


        mensagem.textContent = "";

    } catch (erro) {
        mensagem.textContent = erro.message;
    }
}

// SAIR DO PAINEL
document.getElementById("btn-sair").addEventListener(
    "click",
    async () => {
        try {
            const resposta = await fetch("/api/admin/logout", {
                method: "POST",
                credentials: "same-origin"
            });

            if (!resposta.ok) {
                throw new Error("Não foi possível sair.");
            }

            window.location.href = "/admin/login.html";

        } catch (erro) {
            alert(erro.message);
        }
    }
);

carregarDashboard();
