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
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      empresaId TEXT,
      empresaNome TEXT,
      ativo INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Tabela de Produtos
  db.execSync(`
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
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
      produtoId TEXT,
      produtoNome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT,
      data TEXT NOT NULL
    );
  `);

  // Seed Inicial Automático
  seedInitialData(db);

  // Migrações seguras de colunas caso o banco já existisse no aparelho
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
