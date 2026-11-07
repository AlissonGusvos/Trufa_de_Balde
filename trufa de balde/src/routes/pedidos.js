
const express = require("express");
const router = express.Router();
const pool = require("../db/database");

// ========================================
// 1. REGISTRAR NOVO PEDIDO
// ========================================

router.post("/", async (req, res) => {
  const {
    nome,
    telefone,
    email,
    tipoEntrega,
    endereco,
    itens,
    tipoPagamento,
    metodoPagamento,
    localPagamento
  } = req.body || {};

  // Validar dados do cliente e do pedido
  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof telefone !== "string" ||
    !telefone.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    !["retirada", "entrega"].includes(tipoEntrega) ||
    !Array.isArray(itens) ||
    itens.length === 0
  ) {
    return res.status(400).json({
      mensagem: "Preencha nome, telefone, e-mail, entrega e produtos."
    });
  }

  if (
    tipoEntrega === "entrega" &&
    (typeof endereco !== "string" || !endereco.trim())
  ) {
    return res.status(400).json({
      mensagem: "Informe o endereço de entrega."
    });
  }

  // Validar a forma de pagamento
  if (!["online", "presencial"].includes(tipoPagamento)) {
    return res.status(400).json({
      mensagem: "Selecione uma forma de pagamento válida."
    });
  }

  let metodoFinal;
  let localFinal = null;

  if (tipoPagamento === "online") {
    if (!["pix", "credito", "debito"].includes(metodoPagamento)) {
      return res.status(400).json({
        mensagem: "Selecione PIX, crédito ou débito."
      });
    }

    if (localPagamento != null) {
      return res.status(400).json({
        mensagem: "Pagamento online não deve ter local presencial."
      });
    }

    metodoFinal = metodoPagamento;
  } else {
    if (
      metodoPagamento !== "presencial" ||
      !["visita", "loja"].includes(localPagamento)
    ) {
      return res.status(400).json({
        mensagem: "Escolha onde deseja realizar o pagamento presencial."
      });
    }

    if (localPagamento === "visita" && tipoEntrega !== "entrega") {
      return res.status(400).json({
        mensagem: "Pagamento durante a visita exige entrega."
      });
    }

    metodoFinal = "presencial";
    localFinal = localPagamento;
  }

  // Consolidar produtos repetidos
  const quantidades = new Map();

  for (const item of itens) {
    const produtoId = Number(item?.produtoId);
    const quantidade = Number(item?.quantidade);

    if (
      !Number.isSafeInteger(produtoId) ||
      produtoId <= 0 ||
      !Number.isSafeInteger(quantidade) ||
      quantidade <= 0
    ) {
      return res.status(400).json({
        mensagem: "Produto ou quantidade inválida."
      });
    }

    const quantidadeTotal =
      (quantidades.get(produtoId) || 0) + quantidade;

    if (!Number.isSafeInteger(quantidadeTotal)) {
      return res.status(400).json({
        mensagem: "Quantidade inválida."
      });
    }

    quantidades.set(produtoId, quantidadeTotal);
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Localizar cliente pelo e-mail
    const clienteExistente = await client.query(
      `SELECT id
       FROM clientes
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    let clienteId;

    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].id;

      await client.query(
        `UPDATE clientes
         SET nome = $1, telefone = $2
         WHERE id = $3`,
        [nome.trim(), telefone.trim(), clienteId]
      );
    } else {
      // Cadastro de checkout sem login de cliente
      const novoCliente = await client.query(
        `INSERT INTO clientes
         (nome, email, senha_hash, telefone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          nome.trim(),
          email.trim().toLowerCase(),
          "sem-senha-checkout",
          telefone.trim()
        ]
      );

      clienteId = novoCliente.rows[0].id;
    }

    // Buscar preços reais no banco
    const ids = [...quantidades.keys()];

    const resultadoProdutos = await client.query(
      `SELECT id, nome, preco
       FROM produtos
       WHERE id = ANY($1::bigint[])
         AND disponivel = TRUE
       ORDER BY id
       FOR SHARE`,
      [ids]
    );

    if (resultadoProdutos.rows.length !== ids.length) {
      throw new Error("Um ou mais produtos não estão disponíveis.");
    }

    let totalCentavos = 0;

    const produtos = resultadoProdutos.rows.map((produto) => {
      const precoCentavos = Math.round(Number(produto.preco) * 100);
      const quantidade = quantidades.get(Number(produto.id));

      totalCentavos += precoCentavos * quantidade;

      return {
        ...produto,
        quantidade,
        precoCentavos
      };
    });

    if (
      !Number.isSafeInteger(totalCentavos) ||
      totalCentavos <= 0
    ) {
      throw new Error("Total do pedido inválido.");
    }

    const total = (totalCentavos / 100).toFixed(2);

    // Criar pedido
    const resultadoPedido = await client.query(
      `INSERT INTO pedidos
       (cliente_id, status, tipo_entrega, total, endereco_entrega)
       VALUES ($1, 'novo', $2, $3, $4)
       RETURNING id, status, tipo_entrega, total, criado_em`,
      [
        clienteId,
        tipoEntrega,
        total,
        tipoEntrega === "entrega" ? endereco.trim() : null
      ]
    );

    const pedido = resultadoPedido.rows[0];

    // Registrar itens do pedido
    for (const produto of produtos) {
      await client.query(
        `INSERT INTO itens_pedido
         (pedido_id, produto_id, nome_produto, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          pedido.id,
          produto.id,
          produto.nome,
          produto.quantidade,
          (produto.precoCentavos / 100).toFixed(2)
        ]
      );
    }

    // Registrar a forma de pagamento escolhida
    const resultadoPagamento = await client.query(
      `INSERT INTO pagamentos
       (pedido_id, metodo, status, local_pagamento)
       VALUES ($1, $2, 'pendente', $3)
       RETURNING metodo, status, local_pagamento`,
      [
        pedido.id,
        metodoFinal,
        localFinal
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      mensagem: "Pedido registrado com sucesso!",
      pedido,
      pagamento: resultadoPagamento.rows[0]
    });

  } catch (erro) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Erro ao registrar pedido:", erro);

    return res.status(500).json({
      mensagem:
        erro.message === "Um ou mais produtos não estão disponíveis." ||
        erro.message === "Total do pedido inválido."
          ? erro.message
          : "Não foi possível registrar o pedido. Confira o terminal."
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

// ========================================
// 2. LISTAR PEDIDOS
// ========================================

router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.id,
        p.status,
        p.tipo_entrega,
        p.total,
        p.criado_em,
        p.endereco_entrega,
        c.nome AS cliente,
        c.telefone,
        c.email
      FROM pedidos p
      LEFT JOIN clientes c
        ON c.id = p.cliente_id
      ORDER BY p.criado_em DESC, p.id DESC
    `);

    return res.json(resultado.rows);

  } catch (erro) {
    console.error("Erro ao buscar pedidos:", erro);

    return res.status(500).json({
      mensagem: "Erro ao buscar pedidos."
    });
  }
});

// ========================================
// 3. ATUALIZAR STATUS DO PEDIDO
// ========================================

router.patch("/:id/status", async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { status } = req.body || {};

  const statusPermitidos = [
    "novo",
    "preparando",
    "pronto",
    "entregue",
    "cancelado"
  ];

  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({
      mensagem: "ID do pedido inválido."
    });
  }

  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({
      mensagem: "Status inválido."
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE pedidos
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [status, pedidoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Pedido não encontrado."
      });
    }

    return res.json({
      mensagem: "Status atualizado com sucesso!",
      pedido: resultado.rows[0]
    });

  } catch (erro) {
    console.error("Erro ao atualizar status:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível atualizar o status do pedido."
    });
  }
});

// ========================================
// 4. CONSULTAR DETALHES DE UM PEDIDO
// ========================================

router.get("/:id/detalhes", async (req, res) => {
  const pedidoId = Number(req.params.id);

  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({
      mensagem: "ID do pedido inválido."
    });
  }

  try {
    // Buscar informações gerais do pedido
    const resultadoPedido = await pool.query(
      `SELECT
        p.id,
        p.status,
        p.tipo_entrega,
        p.endereco_entrega,
        p.total,
        p.criado_em,
        c.nome AS cliente,
        c.telefone,
        c.email
       FROM pedidos p
       LEFT JOIN clientes c
         ON c.id = p.cliente_id
       WHERE p.id = $1`,
      [pedidoId]
    );

    if (resultadoPedido.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Pedido não encontrado."
      });
    }

    // Buscar os produtos comprados
    const resultadoItens = await pool.query(
      `SELECT
        id,
        nome_produto,
        quantidade,
        preco_unitario,
        quantidade * preco_unitario AS subtotal
       FROM itens_pedido
       WHERE pedido_id = $1
       ORDER BY id`,
      [pedidoId]
    );

    // Buscar informações do pagamento
    const resultadoPagamento = await pool.query(
      `SELECT
        metodo,
        status,
        local_pagamento
       FROM pagamentos
       WHERE pedido_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [pedidoId]
    );

    return res.json({
      pedido: resultadoPedido.rows[0],
      itens: resultadoItens.rows,
      pagamento: resultadoPagamento.rows[0] || null
    });

  } catch (erro) {
    console.error("Erro ao consultar detalhes:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível consultar os detalhes do pedido."
    });
  }
});


// ========================================
// CONFIRMAR PAGAMENTO PRESENCIAL
// ========================================

router.patch("/:id/confirmar-pagamento", async (req, res) => {
  // Exigir sessão administrativa
  if (!req.session?.admin) {
    return res.status(401).json({
      mensagem: "Acesso não autorizado."
    });
  }

  const pedidoId = Number(req.params.id);

  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({
      mensagem: "ID do pedido inválido."
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE pagamentos
       SET status = 'confirmado'
       WHERE id = (
         SELECT id
         FROM pagamentos
         WHERE pedido_id = $1
         ORDER BY id DESC
         LIMIT 1
       )
       AND metodo = 'presencial'
       AND status = 'pendente'
       RETURNING id, pedido_id, metodo, status`,
      [pedidoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(409).json({
        mensagem:
          "Não existe pagamento presencial pendente para este pedido."
      });
    }

    return res.json({
      mensagem: "Pagamento presencial confirmado!",
      pagamento: resultado.rows[0]
    });

  } catch (erro) {
    console.error("Erro ao confirmar pagamento:", erro);

    return res.status(500).json({
      mensagem: "Erro ao confirmar pagamento."
    });
  }
});


// Exportar todas as rotas
module.exports = router;
