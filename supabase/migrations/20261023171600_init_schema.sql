-- ==============================================================================
-- ÁGUA GESTÃO PRO - SCHEMA SUPABASE COMPLETO
-- Migration inicial: 20261023171600_init_schema.sql
-- ==============================================================================

-- 1. Tabela de Configuração da Distribuidora
CREATE TABLE IF NOT EXISTS public.configuracao (
  id TEXT PRIMARY KEY,
  nomeDistribuidora TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  chavePix TEXT,
  cidade TEXT,
  estado TEXT,
  trialStartDate TEXT,
  isSubscribed INTEGER DEFAULT 0,
  plano TEXT DEFAULT 'TRIAL_14_DIAS',
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precoVenda NUMERIC(10, 2) NOT NULL,
  custo NUMERIC(10, 2) DEFAULT 0,
  estoqueAtual INTEGER DEFAULT 0,
  unidade TEXT DEFAULT 'UN',
  ativo INTEGER DEFAULT 1,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Estoque de Garrafões (Regra ANP)
CREATE TABLE IF NOT EXISTS public.estoque_garrafoes (
  id TEXT PRIMARY KEY,
  anoFabricacao INTEGER NOT NULL,
  anoValidade INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  status TEXT NOT NULL,
  observacoes TEXT,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpfCnpj TEXT,
  telefone TEXT,
  whatsapp TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pontoReferencia TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ativo INTEGER DEFAULT 1,
  precosEspeciaisJson TEXT,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL,
  clienteId TEXT,
  clienteNome TEXT NOT NULL,
  clienteTelefone TEXT,
  clienteEndereco TEXT,
  data TEXT NOT NULL,
  valorTotal NUMERIC(10, 2) NOT NULL,
  desconto NUMERIC(10, 2) DEFAULT 0,
  acrescimo NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL,
  formaPagamento TEXT NOT NULL,
  trocoPara NUMERIC(10, 2),
  observacoes TEXT,
  itensJson TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Fiados (Caderneta Digital)
CREATE TABLE IF NOT EXISTS public.fiados (
  id TEXT PRIMARY KEY,
  clienteId TEXT NOT NULL,
  clienteNome TEXT NOT NULL,
  pedidoId TEXT,
  pedidoNumero INTEGER,
  valorOriginal NUMERIC(10, 2) NOT NULL,
  valorPago NUMERIC(10, 2) DEFAULT 0,
  saldo NUMERIC(10, 2) NOT NULL,
  situacao TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Despesas Operacionais
CREATE TABLE IF NOT EXISTS public.despesas (
  id TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  data TEXT NOT NULL,
  formaPagamento TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Movimentações de Estoque (Auditoria)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id TEXT PRIMARY KEY,
  produtoId TEXT,
  produtoNome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  data TEXT NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.configuracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_garrafoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Anon configuracao" ON public.configuracao;
CREATE POLICY "Acesso Anon configuracao" ON public.configuracao FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon produtos" ON public.produtos;
CREATE POLICY "Acesso Anon produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon estoque_garrafoes" ON public.estoque_garrafoes;
CREATE POLICY "Acesso Anon estoque_garrafoes" ON public.estoque_garrafoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon clientes" ON public.clientes;
CREATE POLICY "Acesso Anon clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon pedidos" ON public.pedidos;
CREATE POLICY "Acesso Anon pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon fiados" ON public.fiados;
CREATE POLICY "Acesso Anon fiados" ON public.fiados FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon despesas" ON public.despesas;
CREATE POLICY "Acesso Anon despesas" ON public.despesas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Anon movimentacoes_estoque" ON public.movimentacoes_estoque;
CREATE POLICY "Acesso Anon movimentacoes_estoque" ON public.movimentacoes_estoque FOR ALL USING (true) WITH CHECK (true);
