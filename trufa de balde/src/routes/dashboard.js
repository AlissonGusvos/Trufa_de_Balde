
const express = require("express");
const router = express.Router();
const pool = require("../db/database");

// INDICADORES GERAIS DO DASHBOARD
router.get("/resumo", async (req, res) => {
    try {
        // QUANTIDADE DE PEDIDOS POR STATUS
        const resultadoPedidos = await pool.query(`
            SELECT
                COUNT(*)::integer AS total_pedidos,
                COUNT(*) FILTER (
                    WHERE status = 'novo'
                )::integer AS pedidos_novos,
                COUNT(*) FILTER (
                    WHERE status = 'preparando'
                )::integer AS pedidos_preparando,
                COUNT(*) FILTER (
                    WHERE status = 'pronto'
                )::integer AS pedidos_prontos,
                COUNT(*) FILTER (
                    WHERE status = 'entregue'
                )::integer AS pedidos_entregues,
                COUNT(*) FILTER (
                    WHERE status = 'cancelado'
                )::integer AS pedidos_cancelados
            FROM pedidos
        `);

        // FATURAMENTO COM PAGAMENTO CONFIRMADO
        const resultadoFaturamento = await pool.query(`
            SELECT
                COALESCE(SUM(p.total), 0) AS faturamento
            FROM pedidos p
            WHERE p.status <> 'cancelado'
              AND EXISTS (
                  SELECT 1
                  FROM pagamentos pg
                  WHERE pg.pedido_id = p.id
                    AND pg.status = 'pago'
              )
        `);

        // PRODUTOS DISPONÍVEIS
        const resultadoProdutos = await pool.query(`
            SELECT
                COUNT(*)::integer AS produtos_disponiveis
            FROM produtos
            WHERE disponivel = TRUE
        `);

        // PRODUTOS MAIS VENDIDOS
        const resultadoMaisVendidos = await pool.query(`
            SELECT
                i.nome_produto,
                SUM(i.quantidade)::integer AS quantidade_vendida
            FROM itens_pedido i
            INNER JOIN pedidos p
                ON p.id = i.pedido_id
            WHERE p.status <> 'cancelado'
              AND EXISTS (
                  SELECT 1
                  FROM pagamentos pg
                  WHERE pg.pedido_id = p.id
                    AND pg.status = 'pago'
              )
            GROUP BY i.nome_produto
            ORDER BY quantidade_vendida DESC
            LIMIT 5
        `);

        // VENDAS DOS ÚLTIMOS 7 DIAS
        const resultadoVendasDiarias = await pool.query(`
            SELECT
                TO_CHAR(d.dia, 'YYYY-MM-DD') AS dia,
                COALESCE(SUM(p.total), 0) AS total
            FROM generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(dia)
            LEFT JOIN pedidos p
                ON p.criado_em::date = d.dia::date
                AND p.status <> 'cancelado'
                AND EXISTS (
                    SELECT 1
                    FROM pagamentos pg
                    WHERE pg.pedido_id = p.id
                      AND pg.status = 'pago'
                )
            GROUP BY d.dia
            ORDER BY d.dia
        `);

        // ENVIAR DADOS AO FRONTEND
        return res.json({
            pedidos: resultadoPedidos.rows[0],

            faturamento:
                resultadoFaturamento.rows[0].faturamento,

            produtos_disponiveis:
                resultadoProdutos.rows[0].produtos_disponiveis,

            mais_vendidos:
                resultadoMaisVendidos.rows,

            vendas_diarias:
                resultadoVendasDiarias.rows
        });

    } catch (erro) {
        console.error("Erro no dashboard:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível carregar o dashboard."
        });
    }
});

module.exports = router;
