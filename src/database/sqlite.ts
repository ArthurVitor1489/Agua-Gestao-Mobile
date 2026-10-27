import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('aguagestao_standalone.db');
  }
  if (!isInitialized) {
    initDatabase(dbInstance);
    isInitialized = true;
  }
  return dbInstance;
};

export const initDatabase = (db: SQLite.SQLiteDatabase) => {
  // 1. Tabela de Configuração da Distribuidora e Assinatura
  db.execSync(`
    CREATE TABLE IF NOT EXISTS configuracao (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      nomeDistribuidora TEXT NOT NULL,
      telefone TEXT,
      whatsapp TEXT,
      chavePix TEXT,
      cidade TEXT,
      estado TEXT,
      trialStartDate TEXT NOT NULL,
      isSubscribed INTEGER DEFAULT 0,
      plano TEXT DEFAULT 'TRIAL_14_DIAS',
      createdAt TEXT NOT NULL
    );
  `);

  // Tabela de Usuários (Autenticação Local)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      empresaNome TEXT,
      ativo INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Tabela de Produtos
  db.execSync(`
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      precoVenda REAL NOT NULL,
      custo REAL DEFAULT 0,
      estoqueAtual INTEGER DEFAULT 0,
      unidade TEXT DEFAULT 'UN',
      ativo INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );
  `);

  // 3. Tabela de Estoque de Garrafões e Vasilhames (Regra ANP 3 Anos)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS estoque_garrafoes (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      anoFabricacao INTEGER NOT NULL,
      anoValidade INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      status TEXT NOT NULL,
      observacoes TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // 4. Tabela de Clientes e Recompra
  db.execSync(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
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
      latitude REAL,
      longitude REAL,
      ativo INTEGER DEFAULT 1,
      precosEspeciaisJson TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // 5. Tabela de Pedidos
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      numero INTEGER NOT NULL,
      clienteId TEXT,
      clienteNome TEXT NOT NULL,
      clienteTelefone TEXT,
      clienteEndereco TEXT,
      data TEXT NOT NULL,
      valorTotal REAL NOT NULL,
      desconto REAL DEFAULT 0,
      acrescimo REAL DEFAULT 0,
      status TEXT NOT NULL,
      formaPagamento TEXT NOT NULL,
      trocoPara REAL,
      observacoes TEXT,
      itensJson TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 6. Tabela de Fiados (Caderneta Digital)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS fiados (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      clienteId TEXT NOT NULL,
      clienteNome TEXT NOT NULL,
      pedidoId TEXT,
      pedidoNumero INTEGER,
      valorOriginal REAL NOT NULL,
      valorPago REAL DEFAULT 0,
      saldo REAL NOT NULL,
      situacao TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 7. Tabela de Despesas Operacionais
  db.execSync(`
    CREATE TABLE IF NOT EXISTS despesas (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      formaPagamento TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 8. Tabela de Movimentações de Estoque (Auditoria)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      produtoId TEXT,
      produtoNome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT,
      data TEXT NOT NULL
    );
  `);

  // 9. Tabela de Quitações / Histórico de Recebimentos de Fiados
  db.execSync(`
    CREATE TABLE IF NOT EXISTS quitacoes_fiado (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      fiadoId TEXT NOT NULL,
      pedidoId TEXT,
      clienteId TEXT,
      clienteNome TEXT,
      valor REAL NOT NULL,
      formaPagamento TEXT NOT NULL,
      data TEXT NOT NULL,
      observacoes TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // 10. Tabela de Bloco de Notas e Lembretes Operacionais
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      empresaId TEXT,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'texto',
      cor TEXT DEFAULT '#FEF3C7',
      fixado INTEGER DEFAULT 0,
      concluido INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Seed Inicial Automático
  seedInitialData(db);

  // Migrações seguras de colunas caso o banco já existisse no aparelho
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS notas (
        id TEXT PRIMARY KEY,
        empresaId TEXT,
        titulo TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'texto',
        cor TEXT DEFAULT '#FEF3C7',
        fixado INTEGER DEFAULT 0,
        concluido INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  } catch {}
  try { db.execSync('ALTER TABLE usuarios ADD COLUMN empresaNome TEXT;'); } catch {}
  try { db.execSync("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'ADMIN';"); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN trialStartDate TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN isSubscribed INTEGER DEFAULT 0;'); } catch {}
  try { db.execSync("ALTER TABLE configuracao ADD COLUMN plano TEXT DEFAULT 'TRIAL_14_DIAS';"); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN chavePix TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN cidade TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN estado TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN whatsapp TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN telefone TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE clientes ADD COLUMN precosEspeciaisJson TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE movimentacoes_estoque ADD COLUMN produtoNome TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE movimentacoes_estoque ADD COLUMN motivo TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE pedidos ADD COLUMN pagamentosJson TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE admin_cloud_config ADD COLUMN lastSyncAt TEXT;'); } catch {}

  // Migrações seguras de empresaId (Isolamento Estrito Multi-tenant)
  try { db.execSync('ALTER TABLE configuracao ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE produtos ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE estoque_garrafoes ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE clientes ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE pedidos ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE fiados ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE quitacoes_fiado ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE despesas ADD COLUMN empresaId TEXT;'); } catch {}
  try { db.execSync('ALTER TABLE movimentacoes_estoque ADD COLUMN empresaId TEXT;'); } catch {}

  // Garantir empresaId único para este tenant local e backfill defensivo
  try {
    let currentEmpresaId: string | null = null;
    const cfg = db.getFirstSync<any>('SELECT empresaId FROM configuracao LIMIT 1');
    if (cfg?.empresaId && cfg.empresaId !== 'local') {
      currentEmpresaId = cfg.empresaId;
    } else {
      currentEmpresaId = 'emp-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36);
      try {
        db.runSync('UPDATE configuracao SET empresaId = ?', [currentEmpresaId]);
      } catch {}
      try {
        db.runSync('UPDATE usuarios SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      } catch {}
    }

    if (currentEmpresaId) {
      db.runSync('UPDATE produtos SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE estoque_garrafoes SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE clientes SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE pedidos SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE fiados SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE quitacoes_fiado SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE despesas SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
      db.runSync('UPDATE movimentacoes_estoque SET empresaId = ? WHERE empresaId IS NULL OR empresaId = "local"', [currentEmpresaId]);
    }
  } catch (e) {
    console.warn('Erro ao configurar empresaId multi-tenant:', e);
  }

  // Migração segura para registrar quitações anteriores caso o usuário já tivesse quitado fiados no app
  try {
    const fiadosPagosSemHistorico = db.getAllSync<any>(`
      SELECT f.id, f.clienteId, f.clienteNome, f.pedidoId, f.valorPago, f.updatedAt, f.createdAt
      FROM fiados f
      WHERE f.valorPago > 0
        AND f.id NOT IN (SELECT fiadoId FROM quitacoes_fiado)
    `);
    for (const f of fiadosPagosSemHistorico) {
      db.runSync(
        `INSERT INTO quitacoes_fiado (id, fiadoId, pedidoId, clienteId, clienteNome, valor, formaPagamento, data, observacoes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'DINHEIRO', ?, 'Quitação anterior migrada', ?)`,
        ['mig-' + f.id, f.id, f.pedidoId, f.clienteId, f.clienteNome, f.valorPago, f.updatedAt || f.createdAt, f.updatedAt || f.createdAt]
      );
    }
  } catch (e) {
    console.warn('Erro ao migrar histórico de fiados:', e);
  }

  // Auto-cura de fiados: vincula pedidos marcados como FIADO à tabela fiados se ainda não existirem
  try {
    const pedidosFiado = db.getAllSync<any>(`
      SELECT id, numero, clienteId, clienteNome, valorTotal, data, createdAt, formaPagamento
      FROM pedidos
      WHERE (formaPagamento = 'FIADO' OR formaPagamento LIKE '%FIADO%')
        AND status != 'CANCELADO'
        AND id NOT IN (SELECT pedidoId FROM fiados WHERE pedidoId IS NOT NULL)
    `);

    for (const ped of pedidosFiado) {
      const fid = 'fiado-rec-' + ped.id;
      const dataCriacao = ped.data || ped.createdAt || new Date().toISOString();
      db.runSync(
        `INSERT INTO fiados (id, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ABERTO', ?, ?)`,
        [fid, ped.clienteId || 'balcao', ped.clienteNome || 'Cliente', ped.id, ped.numero, ped.valorTotal, ped.valorTotal, dataCriacao, dataCriacao]
      );
    }
  } catch (e) {
    console.warn('Erro ao auto-curar fiados legados:', e);
  }
};

const seedInitialData = (db: SQLite.SQLiteDatabase) => {
  // Verificar se já tem produtos
  const prodCount = db.getFirstSync<{ count: number }>('SELECT count(*) as count FROM produtos');
  if (!prodCount || prodCount.count === 0) {
    const now = new Date().toISOString();

    // Produtos Padrão de Água Mineral (Apenas Galão 20L e Vasilhame inicial com estoque ZERO)
    const produtos = [
      { id: 'prod-galao-20l', nome: 'Água Mineral 20L', categoria: 'AGUA_20L', preco: 14.0, custo: 6.0, estoque: 0 },
      { id: 'prod-vasilhame-20l', nome: 'Vasilhame Galão 20L (Vazio)', categoria: 'GARRAFAO_NOVO', preco: 35.0, custo: 25.0, estoque: 0 },
    ];

    for (const p of produtos) {
      db.runSync(
        'INSERT INTO produtos (id, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.nome, p.categoria, p.preco, p.custo, 0, 'UN', 1, now]
      );
    }
  }
};
