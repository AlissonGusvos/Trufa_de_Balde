
const formLogin = document.getElementById("form-login");
const mensagemLogin = document.getElementById("mensagem-login");

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const senha = document.getElementById("senha").value;
  const botao = formLogin.querySelector("button");

  botao.disabled = true;
  mensagemLogin.textContent = "Verificando senha...";

  try {
    const resposta = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ senha })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.mensagem || "Erro no login.");
    }

    window.location.href = "/admin/pedidos.html";
  } catch (erro) {
    mensagemLogin.textContent = erro.message;
  } finally {
    botao.disabled = false;
  }
});
