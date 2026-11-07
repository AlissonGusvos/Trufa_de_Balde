
const express = require("express");
const router = express.Router();
const pool = require("../db/database");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// ========================================
// PROTEGER ROTAS ADMINISTRATIVAS
// ========================================

function protegerAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }

    return res.status(401).json({
        mensagem: "Acesso não autorizado."
    });
}

// ========================================
// VALIDAR DADOS DO PRODUTO
// ========================================

function validarProduto(dados) {
    const {
        nome,
        descricao,
        preco,
        categoria,
        imagem_url,
        disponivel
    } = dados || {};

    const precoNumero = Number(preco);

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.trim().length > 150
    ) {
        return { erro: "Informe um nome válido de até 150 caracteres." };
    }

    if (
        !Number.isFinite(precoNumero) ||
        precoNumero < 0 ||
        Math.round(precoNumero * 100) !== precoNumero * 100
    ) {
        return { erro: "Informe um preço válido com até duas casas decimais." };
    }

    if (
        categoria != null &&
        (typeof categoria !== "string" || categoria.length > 100)
    ) {
        return { erro: "Categoria inválida." };
    }

    if (
        descricao != null &&
        typeof descricao !== "string"
    ) {
        return { erro: "Descrição inválida." };
    }

    if (
        imagem_url != null &&
        typeof imagem_url !== "string"
    ) {
        return { erro: "Imagem inválida." };
    }

    if (
        disponivel !== undefined &&
        typeof disponivel !== "boolean"
    ) {
        return { erro: "Disponibilidade inválida." };
    }

    return {
        produto: {
            nome: nome.trim(),
            descricao: descricao?.trim() || null,
            preco: precoNumero.toFixed(2),
            categoria: categoria?.trim() || null,
            imagem_url: imagem_url?.trim() || null,
            disponivel: disponivel ?? true
        }
    };
}

// ========================================
// 1. CARDÁPIO PÚBLICO
// ========================================

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                descricao,
                preco,
                categoria,
                imagem_url
            FROM produtos
            WHERE disponivel = TRUE
            ORDER BY id DESC
        `);

        return res.json(resultado.rows);

    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível carregar o cardápio."
        });
    }
});

// ========================================
// 2. LISTAR TODOS OS PRODUTOS (ADMIN)
// ========================================

router.get("/admin", protegerAdmin, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                descricao,
                preco,
                categoria,
                imagem_url,
                disponivel
            FROM produtos
            ORDER BY id DESC
        `);

        return res.json(resultado.rows);

    } catch (erro) {
        console.error("Erro ao listar produtos:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível listar os produtos."
        });
    }
});

// ========================================
// 3. CADASTRAR PRODUTO (ADMIN)
// ========================================

router.post("/", protegerAdmin, async (req, res) => {
    const validacao = validarProduto(req.body);

    if (validacao.erro) {
        return res.status(400).json({
            mensagem: validacao.erro
        });
    }

    const produto = validacao.produto;

    try {
        const resultado = await pool.query(
            `INSERT INTO produtos
             (nome, descricao, preco, categoria, imagem_url, disponivel)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                produto.nome,
                produto.descricao,
                produto.preco,
                produto.categoria,
                produto.imagem_url,
                produto.disponivel
            ]
        );

        return res.status(201).json({
            mensagem: "Produto cadastrado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao cadastrar produto:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível cadastrar o produto."
        });
    }
});


// ========================================
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS
// ========================================

const pastaUploads = path.join(
    __dirname,
    "../../public/uploads"
);

fs.mkdirSync(pastaUploads, { recursive: true });

const armazenamento = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, pastaUploads);
    },

    filename: (req, file, callback) => {
        const extensoes = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        };

        const extensao = extensoes[file.mimetype];

        const nomeArquivo =
            crypto.randomUUID() + extensao;

        callback(null, nomeArquivo);
    }
});

const upload = multer({
    storage: armazenamento,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {
        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(
                new Error(
                    "Envie uma imagem JPG, PNG ou WebP."
                )
            );
        }

        callback(null, true);
    }
});

// ========================================
// ROTA ADMINISTRATIVA PARA ENVIAR IMAGENS
// ========================================

router.post(
    "/upload",
    protegerAdmin,
    (req, res) => {
        upload.single("imagem")(req, res, (erro) => {
            if (erro) {
                return res.status(400).json({
                    mensagem:
                        erro.code === "LIMIT_FILE_SIZE"
                            ? "A imagem deve ter no máximo 5 MB."
                            : erro.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    mensagem: "Selecione uma imagem."
                });
            }

            return res.status(201).json({
                mensagem: "Imagem enviada com sucesso!",
                imagem_url: `/uploads/${req.file.filename}`
            });
        });
    }
);


// ========================================
// 4. EDITAR PRODUTO (ADMIN)
// ========================================

router.put("/:id", protegerAdmin, async (req, res) => {
    const produtoId = Number(req.params.id);

    if (!Number.isSafeInteger(produtoId) || produtoId <= 0) {
        return res.status(400).json({
            mensagem: "ID do produto inválido."
        });
    }

    const validacao = validarProduto(req.body);

    if (validacao.erro) {
        return res.status(400).json({
            mensagem: validacao.erro
        });
    }

    const produto = validacao.produto;

    try {
        const resultado = await pool.query(
            `UPDATE produtos
             SET
                nome = $1,
                descricao = $2,
                preco = $3,
                categoria = $4,
                imagem_url = $5,
                disponivel = $6
             WHERE id = $7
             RETURNING *`,
            [
                produto.nome,
                produto.descricao,
                produto.preco,
                produto.categoria,
                produto.imagem_url,
                produto.disponivel,
                produtoId
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        return res.json({
            mensagem: "Produto atualizado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao editar produto:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível editar o produto."
        });
    }
});

// ========================================
// 5. ATIVAR OU DESATIVAR PRODUTO (ADMIN)
// ========================================

router.patch("/:id/disponibilidade", protegerAdmin, async (req, res) => {
    const produtoId = Number(req.params.id);
    const { disponivel } = req.body || {};

    if (!Number.isSafeInteger(produtoId) || produtoId <= 0) {
        return res.status(400).json({
            mensagem: "ID do produto inválido."
        });
    }

    if (typeof disponivel !== "boolean") {
        return res.status(400).json({
            mensagem: "Informe uma disponibilidade válida."
        });
    }

    try {
        const resultado = await pool.query(
            `UPDATE produtos
             SET disponivel = $1
             WHERE id = $2
             RETURNING id, nome, disponivel`,
            [disponivel, produtoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        return res.json({
            mensagem: "Disponibilidade atualizada!",
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao alterar disponibilidade:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível alterar a disponibilidade."
        });
    }
});

module.exports = router;
