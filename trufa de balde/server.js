
require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const pool = require("./src/db/database");
const pedidosRoutes = require("./src/routes/pedidos");
const produtosRoutes = require("./src/routes/produtos");

const app = express();
const PORT = process.env.PORT || 3000;

const dashboardRoutes = require("./src/routes/dashboard");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão do administrador
app.use(session({
  name: "trufa_admin",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 2
  }
}));

// Verifica se o administrador está autenticado
function protegerAdmin(req, res, next) {
  if (req.session?.admin === true) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({
      mensagem: "Acesso não autorizado."
    });
  }

  return res.redirect("/admin/login.html");
}

// Login do administrador
app.post("/api/admin/login", async (req, res) => {
  const senha = req.body.senha;

  if (typeof senha !== "string" || !process.env.ADMIN_PASSWORD_HASH) {
    return res.status(400).json({
      mensagem: "Dados de login inválidos."
    });
  }

  const senhaCorreta = await bcrypt.compare(
    senha,
    process.env.ADMIN_PASSWORD_HASH
  );

  if (!senhaCorreta) {
    return res.status(401).json({
      mensagem: "Senha incorreta."
    });
  }

  req.session.regenerate((erro) => {
    if (erro) {
      return res.status(500).json({
        mensagem: "Erro ao iniciar sessão."
      });
    }

    req.session.admin = true;

    req.session.save((erro) => {
      if (erro) {
        return res.status(500).json({
          mensagem: "Erro ao salvar sessão."
        });
      }

      res.json({ mensagem: "Login realizado com sucesso!" });
    });
  });
});

// Logout
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      return res.status(500).json({
        mensagem: "Erro ao sair."
      });
    }

    res.clearCookie("trufa_admin");
    res.json({ mensagem: "Sessão encerrada." });
  });
});

// Arquivos públicos do site, exceto /admin
const arquivosPublicos = express.static(
  path.join(__dirname, "public")
);

app.use((req, res, next) => {
  if (req.path === "/admin" || req.path.startsWith("/admin/")) {
    return next();
  }

  arquivosPublicos(req, res, next);
});

// Rotas de status
app.get("/api/status", (req, res) => {
  res.json({
    sistema: "Trufa de Balde",
    status: "online"
  });
});

app.get("/api/db-status", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT current_database() AS banco"
    );

    res.json({
      conectado: true,
      banco: resultado.rows[0].banco
    });
} catch (erro) {
  console.error("ERRO POSTGRESQL:", erro.message);

  res.status(500).json({
    conectado: false,
    mensagem: "Erro ao conectar ao banco."
  });
}
});

// Produtos públicos
app.use("/api/produtos", produtosRoutes);

// Dashboard acessível somente ao administrador
app.use("/api/dashboard", protegerAdmin, dashboardRoutes);

// POST de pedidos continua público para o checkout.
// GET de pedidos fica protegido.
app.use("/api/pedidos", (req, res, next) => {
  if (req.method === "POST" && req.path === "/") {
    return next();
  }

  protegerAdmin(req, res, next);
}, pedidosRoutes);

// Página de login acessível sem autenticação
app.get("/admin/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "login.html"));
});

// Demais arquivos administrativos protegidos
app.use(
  "/admin",
  protegerAdmin,
  express.static(path.join(__dirname, "public", "admin"))
);

app.listen(PORT, () => {
  console.log(`Trufa de Balde rodando em http://localhost:${PORT}`);
});
