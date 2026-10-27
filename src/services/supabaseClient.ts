import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDatabase } from '../database/sqlite';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  lastSyncAt: string | null;
  isConfigured: boolean;
}

const DEFAULT_SUPABASE_URL = 'https://owphqcljfztrduhmbmrh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_6gPw8vyAn_AIWrf7y_Ga5A_wYU2xyPs';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export const SupabaseClientService = {
  /**
   * Garante que a tabela de configuração da nuvem exista
   */
  ensureTable(): void {
    const db = getDatabase();
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS admin_cloud_config (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          apiKey TEXT NOT NULL,
          lastSyncAt TEXT
        );
      `);
      try {
        db.execSync('ALTER TABLE admin_cloud_config ADD COLUMN lastSyncAt TEXT;');
      } catch {}
    } catch (e) {
      console.warn('Erro ao criar tabela admin_cloud_config:', e);
    }
  },

  /**
   * Obtém as configurações salvas do Supabase
   */
  getConfig(): SupabaseConfig {
    this.ensureTable();
    const db = getDatabase();
    try {
      const row = db.getFirstSync<any>('SELECT * FROM admin_cloud_config WHERE id = ?', ['supabase_config']);
      if (row && row.url && row.apiKey) {
        return {
          url: row.url.trim(),
          anonKey: row.apiKey.trim(),
          lastSyncAt: row.lastSyncAt || null,
          isConfigured: row.url.trim().length > 10 && row.apiKey.trim().length > 15,
        };
      }
    } catch (e) {
      console.warn('Erro ao ler admin_cloud_config:', e);
    }

    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_KEY,
      lastSyncAt: null,
      isConfigured: true,
    };
  },

  /**
   * Salva as configurações de conexão do Supabase
   */
  saveConfig(url: string, anonKey: string): void {
    this.ensureTable();
    const db = getDatabase();
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();

    db.runSync(
      `INSERT INTO admin_cloud_config (id, url, apiKey)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET url = excluded.url, apiKey = excluded.apiKey;`,
      ['supabase_config', cleanUrl, cleanKey]
    );

    // Invalida cache do cliente
    cachedClient = null;
    cachedConfigKey = '';
  },

  /**
   * Atualiza a data e hora da última sincronização com sucesso
   */
  updateLastSyncTime(timestamp?: string): void {
    this.ensureTable();
    const db = getDatabase();
    const time = timestamp || new Date().toISOString();
    try {
      db.runSync(`
        INSERT INTO admin_cloud_config (id, url, apiKey, lastSyncAt)
        VALUES ('supabase_config', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET lastSyncAt = excluded.lastSyncAt;
      `, [DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, time]);
    } catch (e) {
      console.warn('Erro ao atualizar lastSyncAt:', e);
    }
  },

  /**
   * Obtém a instância do cliente Supabase inicializada
   */
  getClient(): SupabaseClient | null {
    const config = this.getConfig();
    if (!config.isConfigured) return null;

    const key = `${config.url}::${config.anonKey}`;
    if (cachedClient && cachedConfigKey === key) {
      return cachedClient;
    }

    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      cachedConfigKey = key;
      return cachedClient;
    } catch (e) {
      console.error('Erro ao instanciar SupabaseClient:', e);
      return null;
    }
  },

  /**
   * Testa a conexão com o Supabase (faz uma consulta leve de ping)
   */
  async testConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = (customUrl || this.getConfig().url).trim().replace(/\/+$/, '');
      const key = (customKey || this.getConfig().anonKey).trim();

      if (!url || !key) {
        return { success: false, message: 'URL e Chave Anon são obrigatórias.' };
      }

      if (!url.startsWith('https://')) {
        return { success: false, message: 'A URL do Supabase deve começar com https://' };
      }

      const tempClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      // Tenta consultar a tabela de produtos ou configuração com limite 1
      const { error } = await tempClient.from('produtos').select('id').limit(1);

      if (error) {
        // Se der erro de tabela inexistente, a conexão foi aceita pelo Supabase, mas falta rodar o SQL
        if (
          error.code === '42P01' ||
          error.message?.includes('relation "public.produtos" does not exist') ||
          error.message?.includes('Could not find the table')
        ) {
          return {
            success: true,
            message: 'Conectado com sucesso ao Supabase! Porém as tabelas ainda não foram criadas. Clique em "Copiar Script SQL" e execute-o no SQL Editor do Supabase.',
          };
        }
        return {
          success: false,
          message: `Erro do Supabase: ${error.message} (Código: ${error.code || 'Desconhecido'})`,
        };
      }

      return {
        success: true,
        message: 'Conexão com o Supabase estabelecida com sucesso!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Falha ao conectar. Verifique a internet e as credenciais.',
      };
    }
  },

  /**
   * Script SQL DDL completo para rodar no Supabase SQL Editor
   */
  getSupabaseSqlSchema(): string {
    return `-- ==============================================================================
-- ÁGUA GESTÃO PRO - SCHEMA SUPABASE COMPLETO & UNIFICADO (MULTI-TENANT)
-- Copie este script inteiro e cole no SQL Editor do seu painel Supabase
-- ==============================================================================

-- 1. Tabela de Configuração da Distribuidora
CREATE TABLE IF NOT EXISTS public.configuracao (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "nomeDistribuidora" TEXT,
  "telefone" TEXT,
  "whatsapp" TEXT,
  "chavePix" TEXT,
  "cidade" TEXT,
  "estado" TEXT,
  "trialStartDate" TEXT,
  "isSubscribed" INTEGER DEFAULT 0,
  "plano" TEXT DEFAULT 'TRIAL_14_DIAS',
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "nome" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "precoVenda" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "custo" NUMERIC(10, 2) DEFAULT 0,
  "estoqueAtual" INTEGER DEFAULT 0,
  "unidade" TEXT DEFAULT 'UN',
  "ativo" INTEGER DEFAULT 1,
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Estoque de Garrafões (Regra ANP)
CREATE TABLE IF NOT EXISTS public.estoque_garrafoes (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "anoFabricacao" INTEGER NOT NULL DEFAULT 2024,
  "anoValidade" INTEGER NOT NULL DEFAULT 2027,
  "quantidade" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'CHEIO',
  "observacoes" TEXT,
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "nome" TEXT NOT NULL,
  "cpfCnpj" TEXT,
  "telefone" TEXT,
  "whatsapp" TEXT,
  "logradouro" TEXT,
  "numero" TEXT,
  "bairro" TEXT,
  "cidade" TEXT,
  "estado" TEXT,
  "pontoReferencia" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "ativo" INTEGER DEFAULT 1,
  "precosEspeciaisJson" TEXT,
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "numero" INTEGER NOT NULL DEFAULT 1,
  "clienteId" TEXT,
  "clienteNome" TEXT NOT NULL,
  "clienteTelefone" TEXT,
  "clienteEndereco" TEXT,
  "data" TEXT NOT NULL,
  "valorTotal" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "desconto" NUMERIC(10, 2) DEFAULT 0,
  "acrescimo" NUMERIC(10, 2) DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "formaPagamento" TEXT NOT NULL DEFAULT 'PIX',
  "trocoPara" NUMERIC(10, 2),
  "observacoes" TEXT,
  "itensJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Fiados (Caderneta Digital)
CREATE TABLE IF NOT EXISTS public.fiados (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "clienteId" TEXT NOT NULL,
  "clienteNome" TEXT NOT NULL,
  "pedidoId" TEXT,
  "pedidoNumero" INTEGER,
  "valorOriginal" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "valorPago" NUMERIC(10, 2) DEFAULT 0,
  "saldo" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "situacao" TEXT NOT NULL DEFAULT 'ABERTO',
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Despesas Operacionais
CREATE TABLE IF NOT EXISTS public.despesas (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "descricao" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "valor" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "data" TEXT NOT NULL,
  "formaPagamento" TEXT NOT NULL DEFAULT 'DINHEIRO',
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Movimentações de Estoque (Auditoria)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "produtoId" TEXT,
  "produtoNome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 0,
  "motivo" TEXT,
  "data" TEXT NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabela de Quitações de Fiados (Recebimentos)
CREATE TABLE IF NOT EXISTS public.quitacoes_fiado (
  id TEXT PRIMARY KEY,
  "empresaId" TEXT,
  "fiadoId" TEXT NOT NULL,
  "pedidoId" TEXT,
  "clienteId" TEXT,
  "clienteNome" TEXT,
  "valor" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "formaPagamento" TEXT NOT NULL DEFAULT 'PIX',
  "data" TEXT NOT NULL,
  "observacoes" TEXT,
  "createdAt" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices de Alta Performance por Empresa (Multi-tenant)
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON public.pedidos("empresaId");
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes("empresaId");
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos("empresaId");
CREATE INDEX IF NOT EXISTS idx_fiados_empresa ON public.fiados("empresaId");
CREATE INDEX IF NOT EXISTS idx_quitacoes_empresa ON public.quitacoes_fiado("empresaId");

-- Políticas de Acesso RLS
ALTER TABLE public.configuracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_garrafoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quitacoes_fiado ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Acesso Anon quitacoes_fiado" ON public.quitacoes_fiado;
CREATE POLICY "Acesso Anon quitacoes_fiado" ON public.quitacoes_fiado FOR ALL USING (true) WITH CHECK (true);
`;
  },
};
