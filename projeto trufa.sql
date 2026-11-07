-- BANCO DE DADOS: TRUFA DE BALDE

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    pontos INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10,2) NOT NULL,
    categoria VARCHAR(100),
    imagem_url TEXT,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE
);


INSERT INTO produtos
(nome, descricao, preco, categoria, imagem_url, disponivel)
SELECT
    v.nome,
    v.descricao,
    v.preco,
    v.categoria,
    NULL,
    TRUE
FROM (
    VALUES
    -- TORTAS
    ('Torta de limão tamanho padrão', 'Base crocante, mousse de limão e creme branco com chantilly, leite condensado e toque de limão.', 26.90, 'Tortas'),
    ('Torta Bom Bueno — embalagem nova', 'Pré-lançamento na embalagem nova. Peso aproximado de 450 g.', 48.99, 'Tortas'),

    -- PIPOCAS GOURMET
    ('Pipoca gourmet premium Ovomaltine', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Alpino', 'Cada mordida, uma explosão de sabor. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Cookie Bueno', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Leite Ninho', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Maracujá', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Limão', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Ninho com Nutella', 'Uma explosão de sabor em cada mordida. 160 g.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Nesquik', 'Sabor da infância, uma explosão de sabor em cada mordida.', 21.99, 'Pipoca gourmet premium'),
    ('Pipoca gourmet premium Açaí com Leite Ninho', 'Peso aproximado de 160 g.', 22.00, 'Pipoca gourmet premium'),

    -- TRUFAS
    ('Trufa de mousse de maracujá', 'Tamanho padrão, com chocolate ao leite.', 7.80, 'Trufas'),
    ('Trufa de Ninho com ganache de Nutella', 'Chocolate ao leite, tamanho padrão. Embalagem azul.', 7.80, 'Trufas'),
    ('Trufa de Prestígio', 'Embalagem verde.', 7.80, 'Trufas'),
    ('Trufa de mousse de morango', 'Mousse de morango com chocolate ao leite. Embalagem vermelha.', 7.80, 'Trufas'),

    -- CHOCOLATERIA
    ('Espeto de morango banhado no chocolate ao leite', NULL, 35.00, 'Chocolateria'),
    ('Coxinha de Ninho com morango e Nutella', 'Coxinha de Ninho com morango e cobertura de Nutella.', 26.90, 'Chocolateria'),
    ('Morango trufado com Ninho', 'Tamanho padrão. Morango inteiro, Ninho consistente e camada de chocolate ao leite.', 26.90, 'Chocolateria'),
    ('Coxinha de brigadeiro gourmet com morango', 'Tamanho padrão. Peso aproximado de 230 a 270 g.', 26.90, 'Chocolateria'),
    ('Morango cravejado', 'Pasta de Ninho, morango, chocolate branco e caramelo crocante. Aproximadamente 260 g.', 28.90, 'Chocolateria'),

    -- BROWNIE
    ('Brownie fatia mousse de Nutella', NULL, 34.90, 'Brownie'),

    -- LANCHES GOURMET
    ('X-Salada com hambúrguer artesanal', 'Pão de 90 g, hambúrguer artesanal de 130 g, cheddar, Catupiry, mussarela, molho especial, alface e tomate.', 31.90, 'Lanches gourmet'),
    ('X-Bacon com hambúrguer artesanal', 'Hambúrguer de 140 g, pão de 100 g, mussarela, cheddar, Catupiry, molho especial, bacon, alface e tomate.', 49.90, 'Lanches gourmet'),
    ('X-Burguer com hambúrguer artesanal', 'Carne de 130 g, pão de 90 g, mussarela, cheddar, requeijão e molho especial.', 29.99, 'Lanches gourmet'),

    -- FESTIVAL DO POTE
    ('Bolo no pote de pistache com Ninho', 'Creme de pistache com Ninho e massa branca.', 21.90, 'Festival do Pote'),
    ('Bolo de pote premium Prestígio', 'Massa de chocolate, mousse de chocolate e coco.', 21.90, 'Festival do Pote'),
    ('Bolo no pote premium mousse de Nutella com Ninho', 'Massa de chocolate.', 21.90, 'Festival do Pote'),
    ('Bolo no pote premium mousse de maracujá com chocolate', 'Massa de chocolate.', 21.90, 'Festival do Pote'),

    -- BOLO NA PLACA
    ('Bolo na placa Ferrero Rocher', 'Peso aproximado de 700 g. Serve até 2 pessoas.', 53.90, 'Bolo na Placa'),
    ('Bolo fatia Kinder Bueno', NULL, 32.99, 'Bolo na Placa'),

    -- BOLOS
    ('Bolo bombom Prestígio', 'Bolo com chocolate e coco, textura macia e recheio cremoso. Embalagem transparente. Peso aproximado de 750 g.', 41.99, 'Bolos'),
    ('Bolo gelado de coco com creme Moça', 'Bolo gelado de beijinho com creme Moça, coco e recheio cremoso. Embalagem de alumínio. Peso aproximado de 380 a 400 g.', 29.99, 'Bolos'),
    ('Mini bolo de cenoura com brigadeiro gourmet', 'Tamanho padrão, coberto com brigadeiro gourmet.', 13.99, 'Bolos'),

    -- FONDUE
    ('Fondue de morango com chocolate 500 ml', 'Morango e chocolate ao leite derretido em copo bolha de 500 ml. Consumo imediato.', 43.40, 'Fondue Morango Com Chocolate'),

    -- MINI DOCES
    ('Mini torta Banoffee', 'Base de biscoito, doce de leite cremoso, canela, banana, nata e chantilly. Serve 1 pessoa.', 25.90, 'Mini Doces'),

    -- SALGADOS
    ('Coxinha gourmet de frango com Catupiry', 'Massa de batata, frango temperado e farinha panko para maior crocância. Peso aproximado de 280 a 300 g.', 26.99, 'Salgados gourmet'),

    -- DONUTS
    ('Donuts de brigadeiro', NULL, 14.99, 'Donuts'),
    ('Donuts de Nutella', 'Recheio de Nutella.', 14.99, 'Donuts'),
    ('Donuts de doce de leite', 'Recheio de doce de leite.', 14.99, 'Donuts'),
    ('Donuts de Blueberry', NULL, 14.99, 'Donuts'),
    ('Donuts bombom frutas vermelhas', 'Banhado em chocolate rosa.', 13.00, 'Donuts'),
    ('Donuts bombom de creme', 'Sabor creme, banhado em chocolate ao leite.', 13.00, 'Donuts'),

    -- MACARONS
    ('Macaron de pistache', 'Feito com farinha de amêndoas. Aproximadamente 16 g e 4 cm de diâmetro.', 7.99, 'Macarons'),
    ('Macaron de chocolate', NULL, 7.99, 'Macarons'),

    -- PAVÊ
    ('Pavê de Ouro Branco', 'Ouro Branco, biscoito de maisena, chocolate, Ninho, creme de Ninho e um toque especial Trufa de Balde.', 33.90, 'Pavê'),

    -- BEBIDAS
    ('Água mineral Minalba com gás 510 ml', 'Garrafa de 510 ml.', 7.50, 'Bebidas'),
    ('Água mineral Crystal sem gás 500 ml', 'Garrafa de 500 ml.', 7.50, 'Bebidas'),
    ('Refrigerante Fanta Laranja 350 ml', 'Lata de 350 ml.', 9.90, 'Bebidas'),
    ('Refrigerante Guaraná Antarctica 350 ml', 'Lata de 350 ml.', 9.00, 'Bebidas'),
    ('Suco natural de manga com maracujá 500 ml', NULL, 15.99, 'Bebidas'),

    -- PIRULITO TRUFADO
    ('Pirulito trufado', 'Biscoito banhado no chocolate, recheio de brigadeiro gourmet e confete.', 18.99, 'Pirulito trufado'),

    -- MINI COOKIE
    ('Mini Cookie com Nutella', NULL, 23.99, 'Mini cookie'),

    -- BOMBOM BROWNIE
    ('Bombom brownie de Nutella com Ninho', 'Bombom brownie com Nutella e Ninho, banhado no chocolate ao leite. Foto ilustrativa.', 23.99, 'Bombom brownie')
) AS v(nome, descricao, preco, categoria)
WHERE NOT EXISTS (
    SELECT 1
    FROM produtos p
    WHERE LOWER(TRIM(p.nome)) = LOWER(TRIM(v.nome))
);


-- 3. PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id),
    status VARCHAR(30) NOT NULL DEFAULT 'novo',
    tipo_entrega VARCHAR(30) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    pontos_creditados BOOLEAN NOT NULL DEFAULT FALSE,
    endereco_entrega TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 
CREATE TABLE IF NOT EXISTS itens_pedido (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id),
    produto_id BIGINT NOT NULL REFERENCES produtos(id),
    nome_produto VARCHAR(150) NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id),
    metodo VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    provedor VARCHAR(100),
    referencia_externa TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pago_em TIMESTAMP
);

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'clientes',
    'pedidos',
    'itens_pedido',
    'pagamentos'
)
ORDER BY table_name, ordinal_position;


SELECT id, status, total
FROM pedidos
ORDER BY id DESC;

SELECT categoria, COUNT(*) AS quantidade
FROM produtos
GROUP BY categoria
ORDER BY categoria;

ALTER TABLE pagamentos
ADD COLUMN IF NOT EXISTS local_pagamento VARCHAR(20);

SELECT
    pedido_id,
    metodo,
    local_pagamento,
    status
FROM pagamentos
ORDER BY id DESC
LIMIT 5;

SELECT
  pedido_id,
  metodo,
  local_pagamento,
  status
FROM pagamentos
ORDER BY id DESC
LIMIT 5;