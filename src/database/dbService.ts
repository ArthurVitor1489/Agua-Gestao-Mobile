import { getDatabase } from './sqlite';
import { CloudAdminService } from '../services/cloudAdminService';
import {
  User,
  Cliente,
  Produto,
  EstoqueGarrafao,
  Pedido,
  PedidoItem,
  Fiado,
  Despesa,
  MovimentacaoEstoque,
  DashboardData,
  RecompraOportunidade,
  StatusPedido,
  FormaPagamento,
} from './models';

// UUID helper
const generateId = () => 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

export interface AppConfig {
  id: string;
  nomeDistribuidora: string;
  telefone?: string;
  whatsapp?: string;
  chavePix?: string;
  cidade?: string;
  estado?: string;
  trialStartDate: string;
  isSubscribed: boolean;
  plano: string;
  createdAt: string;
}

// ----------------------------------------------------
// 0. SERVIÇO DE AUTENTICAÇÃO LOCAL (CADASTRO E LOGIN)
// ----------------------------------------------------
export const LocalAuthService = {
  cadastrar(payload: {
    nome: string;
    email: string;
    senha: string;
    nomeDistribuidora: string;
    whatsapp?: string;
    cidade?: string;
    estado?: string;
  }): User {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    // 0. Garantir criação e migração defensiva da tabela de usuários
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
    try { db.execSync('ALTER TABLE usuarios ADD COLUMN empresaNome TEXT;'); } catch {}
    try { db.execSync("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'ADMIN';"); } catch {}

    const emailNorm = payload.email.toLowerCase().trim();

    // 1. Verificar se já existe conta com esse e-mail
    const existing = db.getFirstSync<any>('SELECT id FROM usuarios WHERE email = ?', [emailNorm]);
    if (existing) {
      throw new Error('Já existe uma conta com este e-mail. Faça login ou utilize outro e-mail.');
    }

    // 2. Salvar configuração da distribuidora (ativa os 14 dias de teste)
    try {
      ConfigService.saveConfig({
        nomeDistribuidora: payload.nomeDistribuidora,
        whatsapp: payload.whatsapp || '',
        cidade: payload.cidade || '',
        estado: payload.estado || '',
      });
    } catch (e) {
      console.warn('Erro ao salvar configuração inicial:', e);
    }

    // 3. Inserir usuário no banco
    db.runSync(
      `INSERT INTO usuarios (id, nome, email, senha, role, empresaId, empresaNome, ativo, createdAt)
       VALUES (?, ?, ?, ?, 'ADMIN', 'local', ?, 1, ?)`,
      [id, payload.nome, emailNorm, payload.senha, payload.nomeDistribuidora, now]
    );

    // 4. Registrar no painel Super Admin (nuvem e cache local)
    try {
      CloudAdminService.registrarDistribuidora({
        nomeDistribuidora: payload.nomeDistribuidora,
        responsavel: payload.nome,
        email: emailNorm,
        whatsapp: payload.whatsapp,
        cidade: payload.cidade,
        estado: payload.estado,
      });
    } catch (e) {
      console.warn('Erro ao registrar distribuidora para admin:', e);
    }

    return {
      id,
      empresaId: 'local',
      nome: payload.nome,
      email: emailNorm,
      role: 'EMPRESA_ADMIN',
      ativo: true,
      empresa: {
        id: 'local',
        nome: payload.nomeDistribuidora,
        cidade: payload.cidade,
        estado: payload.estado,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      } as any,
      createdAt: now,
      updatedAt: now,
    };
  },

  login(email: string, pass: string): User | null {
    try {
      const db = getDatabase();
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
      const row = db.getFirstSync<any>(
        'SELECT * FROM usuarios WHERE email = ? AND senha = ? AND ativo = 1',
        [email.toLowerCase().trim(), pass]
      );
      if (!row) return null;

      const cfg = ConfigService.getConfig();
      const now = new Date().toISOString();

      return {
        id: row.id,
        empresaId: row.empresaId || 'local',
        nome: row.nome,
        email: row.email,
        role: (row.role as any) || 'EMPRESA_ADMIN',
        ativo: Boolean(row.ativo),
        empresa: {
          id: 'local',
          nome: cfg?.nomeDistribuidora || row.empresaNome || 'Minha Distribuidora',
          cidade: cfg?.cidade,
          estado: cfg?.estado,
          ativo: true,
          createdAt: now,
          updatedAt: now,
        } as any,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      };
    } catch (e) {
      console.warn('Erro ao consultar login:', e);
      return null;
    }
  },

  getUsuarioById(id: string): User | null {
    try {
      const db = getDatabase();
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
      const row = db.getFirstSync<any>('SELECT * FROM usuarios WHERE id = ? AND ativo = 1', [id]);
      if (!row) return null;

      const cfg = ConfigService.getConfig();
      const now = new Date().toISOString();

      return {
        id: row.id,
        empresaId: row.empresaId || 'local',
        nome: row.nome,
        email: row.email,
        role: (row.role as any) || 'EMPRESA_ADMIN',
        ativo: Boolean(row.ativo),
        empresa: {
          id: 'local',
          nome: cfg?.nomeDistribuidora || row.empresaNome || 'Minha Distribuidora',
          cidade: cfg?.cidade,
          estado: cfg?.estado,
          ativo: true,
          createdAt: now,
          updatedAt: now,
        } as any,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      };
    } catch (e) {
      console.warn('Erro ao obter usuario por ID:', e);
      return null;
    }
  },
};

// ----------------------------------------------------
// 1. SERVIÇO DE CONFIGURAÇÃO & ASSINATURA (PLAY STORE)
// ----------------------------------------------------
export const ConfigService = {
  getConfig(): AppConfig | null {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<any>('SELECT * FROM configuracao LIMIT 1');
      if (!row) return null;
      return {
        ...row,
        isSubscribed: Boolean(row.isSubscribed),
      };
    } catch (e) {
      console.warn('Erro ao carregar configuracao:', e);
      return null;
    }
  },

  saveConfig(data: {
    nomeDistribuidora: string;
    telefone?: string;
    whatsapp?: string;
    chavePix?: string;
    cidade?: string;
    estado?: string;
  }): AppConfig {
    const db = getDatabase();

    // Garantir criação e migração defensiva da tabela configuracao
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
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN trialStartDate TEXT;'); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN isSubscribed INTEGER DEFAULT 0;'); } catch {}
    try { db.execSync("ALTER TABLE configuracao ADD COLUMN plano TEXT DEFAULT 'TRIAL_14_DIAS';"); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN chavePix TEXT;'); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN cidade TEXT;'); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN estado TEXT;'); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN whatsapp TEXT;'); } catch {}
    try { db.execSync('ALTER TABLE configuracao ADD COLUMN telefone TEXT;'); } catch {}

    const existing = this.getConfig();
    const now = new Date().toISOString();

    if (existing) {
      db.runSync(
        `UPDATE configuracao SET nomeDistribuidora = ?, telefone = ?, whatsapp = ?, chavePix = ?, cidade = ?, estado = ? WHERE id = ?`,
        [
          data.nomeDistribuidora,
          data.telefone || '',
          data.whatsapp || '',
          data.chavePix || '',
          data.cidade || '',
          data.estado || '',
          existing.id,
        ]
      );
      return this.getConfig()!;
    } else {
      const newId = generateId();
      db.runSync(
        `INSERT INTO configuracao (id, nomeDistribuidora, telefone, whatsapp, chavePix, cidade, estado, trialStartDate, isSubscribed, plano, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'TRIAL_14_DIAS', ?)`,
        [
          newId,
          data.nomeDistribuidora,
          data.telefone || '',
          data.whatsapp || '',
          data.chavePix || '',
          data.cidade || '',
          data.estado || '',
          now,
          now,
        ]
      );
      return this.getConfig()!;
    }
  },

  activateSubscription(plano: 'MENSAL' | 'ANUAL'): boolean {
    try {
      const db = getDatabase();
      db.runSync(`UPDATE configuracao SET isSubscribed = 1, plano = ?`, [plano]);
      return true;
    } catch {
      return false;
    }
  },
};

// ----------------------------------------------------
// 2. SERVIÇO DE PRODUTOS
// ----------------------------------------------------
export const ProdutosService = {
  getProdutos(): Produto[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome ASC');
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      nome: r.nome,
      categoria: r.categoria,
      unidade: r.unidade || 'UN',
      precoVenda: r.precoVenda,
      ativo: Boolean(r.ativo),
      estoque: {
        id: 'est-' + r.id,
        produtoId: r.id,
        quantidadeAtual: r.estoqueAtual,
        quantidadeMinima: 10,
        updatedAt: r.createdAt,
      },
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    }));
  },

  salvarProduto(p: Partial<Produto> & { nome: string; precoVenda: number }): Produto {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = p.id || generateId();

    if (p.id) {
      db.runSync(
        `UPDATE produtos SET nome = ?, categoria = ?, precoVenda = ?, estoqueAtual = ? WHERE id = ?`,
        [p.nome, p.categoria || 'OUTROS', p.precoVenda, p.estoque?.quantidadeAtual || 0, p.id]
      );
    } else {
      db.runSync(
        `INSERT INTO produtos (id, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'UN', 1, ?)`,
        [id, p.nome, p.categoria || 'OUTROS', p.precoVenda, 0, p.estoque?.quantidadeAtual || 0, now]
      );
    }
    return this.getProdutos().find((x) => x.id === id)!;
  },

  excluirProduto(id: string): void {
    const db = getDatabase();
    db.runSync('UPDATE produtos SET ativo = 0 WHERE id = ?', [id]);
  },
};

// ----------------------------------------------------
// 3. SERVIÇO DE ESTOQUE E VASILHAMES (OPERAÇÃO REAL)
// ----------------------------------------------------
export const EstoqueService = {
  zerarTodoEstoque(): void {
    const db = getDatabase();
    db.runSync('UPDATE produtos SET estoqueAtual = 0');
    db.runSync('DELETE FROM estoque_garrafoes');
    db.runSync('DELETE FROM movimentacoes_estoque');
  },

  getGarrafoes(): EstoqueGarrafao[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM estoque_garrafoes ORDER BY status ASC');
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      anoFabricacao: r.anoFabricacao || 2024,
      anoValidade: r.anoValidade || 2027,
      quantidade: r.quantidade,
      status: r.status,
      observacoes: r.observacoes,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    }));
  },

  getResumoVasilhames() {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT status, SUM(quantidade) as total FROM estoque_garrafoes GROUP BY status');
    let cheios = 0;
    let vazios = 0;
    let avarias = 0;

    for (const r of rows) {
      if (r.status === 'CHEIO') {
        cheios += r.total || 0;
      } else if (r.status === 'VAZIO' || r.status === 'DISPONIVEL') {
        vazios += r.total || 0;
      } else if (r.status === 'DANIFICADO' || r.status === 'QUEBRADO' || r.status === 'VENCIDO') {
        avarias += r.total || 0;
      }
    }

    return {
      cheios,
      vazios,
      avarias,
      totalGeral: cheios + vazios + avarias,
    };
  },

  getMovimentacoes(): MovimentacaoEstoque[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM movimentacoes_estoque ORDER BY data DESC LIMIT 200');
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      tipo: r.tipo,
      quantidade: r.quantidade,
      produtoId: r.produtoId,
      produto: r.produtoNome ? ({ nome: r.produtoNome } as any) : null,
      motivo: r.motivo,
      data: r.data,
    }));
  },

  // 1. CHEGADA DE CARGA DA FÁBRICA (Troca de vazios por cheios ou entrada direta)
  registrarCargaFabrica(params: {
    produtoId: string;
    qtdCheiosRecebidos: number;
    qtdVaziosDevolvidos: number;
    observacao?: string;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. Atualizar estoque do produto (adiciona cheios)
    if (params.qtdCheiosRecebidos > 0) {
      db.runSync('UPDATE produtos SET estoqueAtual = estoqueAtual + ? WHERE id = ?', [
        params.qtdCheiosRecebidos,
        params.produtoId,
      ]);

      // Atualizar saldo de garrafões CHEIOS
      const existingCheio = db.getFirstSync<any>(
        "SELECT id FROM estoque_garrafoes WHERE status = 'CHEIO' ORDER BY quantidade DESC LIMIT 1"
      );
      if (existingCheio) {
        db.runSync('UPDATE estoque_garrafoes SET quantidade = quantidade + ? WHERE id = ?', [
          params.qtdCheiosRecebidos,
          existingCheio.id,
        ]);
      } else {
        db.runSync(
          `INSERT INTO estoque_garrafoes (id, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
           VALUES (?, 2024, 2027, ?, 'CHEIO', 'Carga de fábrica', ?)`,
          [generateId(), params.qtdCheiosRecebidos, now]
        );
      }
    }

    // 2. Subtrair vazios devolvidos à fábrica
    if (params.qtdVaziosDevolvidos > 0) {
      const existingVazio = db.getFirstSync<any>(
        "SELECT id, quantidade FROM estoque_garrafoes WHERE status = 'VAZIO' ORDER BY quantidade DESC LIMIT 1"
      );
      if (existingVazio) {
        db.runSync('UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE id = ?', [
          params.qtdVaziosDevolvidos,
          existingVazio.id,
        ]);
      }
    }

    // 3. Registrar auditoria
    const prod = db.getFirstSync<any>('SELECT nome FROM produtos WHERE id = ?', [params.produtoId]);
    const prodNome = prod?.nome || 'Galão de Água 20L';
    const vaziosInfo = params.qtdVaziosDevolvidos && params.qtdVaziosDevolvidos > 0
      ? `, -${params.qtdVaziosDevolvidos} Vazios devolvidos`
      : '';
    const motivoTexto = `Carga de Fábrica: +${params.qtdCheiosRecebidos} Cheios recebidos${vaziosInfo}${
      params.observacao ? ` (${params.observacao})` : ''
    }`;

    db.runSync(
      `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
       VALUES (?, ?, ?, 'ENTRADA', ?, ?, ?)`,
      [generateId(), params.produtoId, prodNome, params.qtdCheiosRecebidos, motivoTexto, now]
    );
  },

  // Mantido para compatibilidade com chamadas legadas
  adicionarCargaEnvase(produtoId: string, quantidade: number, anoFabricacao?: number): void {
    this.registrarCargaFabrica({
      produtoId,
      qtdCheiosRecebidos: quantidade,
      qtdVaziosDevolvidos: quantidade, // Troca padrão 1 por 1
      observacao: 'Carga de Fábrica (Padrão)',
    });
  },

  // 2. REGISTRO DE AVARIAS E QUEBRAS (Transporte da fábrica, translado no CD, etc.)
  registrarAvaria(params: {
    tipoVasilhame: string; // Ex: 'Galão 20L' ou 'Botijão P13'
    situacaoOrigem: 'CHEIO' | 'VAZIO';
    quantidade: number;
    localAvaria: string; // Ex: 'Transporte da Fábrica', 'Translado no Centro de Distribuição (CD)'
    observacao?: string;
    produtoId?: string;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. Subtrair da situação de origem
    const origemRow = db.getFirstSync<any>(
      'SELECT id, quantidade FROM estoque_garrafoes WHERE status = ? ORDER BY quantidade DESC LIMIT 1',
      [params.situacaoOrigem]
    );

    if (origemRow) {
      db.runSync('UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE id = ?', [
        params.quantidade,
        origemRow.id,
      ]);
    }

    // 2. Se estava CHEIO, também perdeu o conteúdo (água/gás), debita do estoque de produtos
    if (params.situacaoOrigem === 'CHEIO') {
      const prodId = params.produtoId || 'prod-galao-20l';
      db.runSync('UPDATE produtos SET estoqueAtual = MAX(0, estoqueAtual - ?) WHERE id = ?', [
        params.quantidade,
        prodId,
      ]);
    }

    // 3. Adicionar aos AVARIADOS
    const destRow = db.getFirstSync<any>(
      "SELECT id FROM estoque_garrafoes WHERE status = 'DANIFICADO' LIMIT 1"
    );

    if (destRow) {
      db.runSync('UPDATE estoque_garrafoes SET quantidade = quantidade + ? WHERE id = ?', [
        params.quantidade,
        destRow.id,
      ]);
    } else {
      db.runSync(
        `INSERT INTO estoque_garrafoes (id, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
         VALUES (?, 2024, 2027, ?, 'DANIFICADO', 'Avaria registrada', ?)`,
        [generateId(), params.quantidade, now]
      );
    }

    // 4. Registrar auditoria detalhada
    const motivoAudit = `Avaria (${params.localAvaria}): ${params.quantidade}x ${params.tipoVasilhame} (${params.situacaoOrigem === 'CHEIO' ? 'Estava Cheio' : 'Estava Vazio'})${
      params.observacao ? ` - ${params.observacao}` : ''
    }`;

    db.runSync(
      `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
       VALUES (?, null, ?, 'AJUSTE', ?, ?, ?)`,
      [generateId(), params.tipoVasilhame, params.quantidade, motivoAudit, now]
    );
  },

  // Mantido para compatibilidade com chamadas antigas
  movimentarGarrafa(params: {
    anoFabricacao?: number;
    statusOrigem: string;
    statusDestino: string;
    quantidade: number;
    motivo?: string;
  }): void {
    const isAvaria = params.statusDestino === 'DANIFICADO' || params.statusDestino === 'QUEBRADO';
    if (isAvaria) {
      this.registrarAvaria({
        tipoVasilhame: 'Galão 20L',
        situacaoOrigem: params.statusOrigem === 'CHEIO' ? 'CHEIO' : 'VAZIO',
        quantidade: params.quantidade,
        localAvaria: params.motivo || 'Translado no Centro de Distribuição (CD)',
        observacao: params.motivo,
      });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    db.runSync(
      'UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE status = ?',
      [params.quantidade, params.statusOrigem]
    );

    const dest = db.getFirstSync<any>('SELECT id FROM estoque_garrafoes WHERE status = ?', [params.statusDestino]);
    if (dest) {
      db.runSync('UPDATE estoque_garrafoes SET quantidade = quantidade + ? WHERE id = ?', [params.quantidade, dest.id]);
    } else {
      db.runSync(
        `INSERT INTO estoque_garrafoes (id, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
         VALUES (?, 2024, 2027, ?, ?, ?, ?)`,
        [generateId(), params.quantidade, params.statusDestino, params.motivo || '', now]
      );
    }

    db.runSync(
      `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
       VALUES (?, null, ?, 'AJUSTE', ?, ?, ?)`,
      [generateId(), `Vasilhames (${params.statusOrigem} -> ${params.statusDestino})`, params.quantidade, params.motivo || 'Movimentação', now]
    );
  },
};

// ----------------------------------------------------
// 4. SERVIÇO DE CLIENTES & RECOMPRA INTELIGENTE
// ----------------------------------------------------
export const ClientesService = {
  getClientes(search?: string): Cliente[] {
    const db = getDatabase();
    let query = 'SELECT * FROM clientes WHERE ativo = 1';
    let params: any[] = [];

    if (search && search.trim()) {
      query += ' AND (nome LIKE ? OR telefone LIKE ? OR whatsapp LIKE ? OR bairro LIKE ?)';
      const s = `%${search.trim()}%`;
      params = [s, s, s, s];
    }
    query += ' ORDER BY nome ASC';

    const rows = db.getAllSync<any>(query, params);
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      nome: r.nome,
      cpfCnpj: r.cpfCnpj,
      telefone: r.telefone,
      whatsapp: r.whatsapp,
      logradouro: r.logradouro,
      numero: r.numero,
      bairro: r.bairro,
      cidade: r.cidade,
      estado: r.estado,
      pontoReferencia: r.pontoReferencia,
      latitude: r.latitude,
      longitude: r.longitude,
      ativo: Boolean(r.ativo),
      precosEspeciais: r.precosEspeciaisJson ? JSON.parse(r.precosEspeciaisJson) : [],
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    }));
  },

  salvarCliente(c: Partial<Cliente> & { nome: string }): Cliente {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = c.id || generateId();
    const precosJson = JSON.stringify(c.precosEspeciais || []);

    if (c.id) {
      db.runSync(
        `UPDATE clientes SET nome = ?, telefone = ?, whatsapp = ?, logradouro = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, pontoReferencia = ?, latitude = ?, longitude = ?, precosEspeciaisJson = ? WHERE id = ?`,
        [
          c.nome,
          c.telefone || '',
          c.whatsapp || '',
          c.logradouro || '',
          c.numero || '',
          c.bairro || '',
          c.cidade || '',
          c.estado || '',
          c.pontoReferencia || '',
          c.latitude || null,
          c.longitude || null,
          precosJson,
          c.id,
        ]
      );
    } else {
      db.runSync(
        `INSERT INTO clientes (id, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          id,
          c.nome,
          c.cpfCnpj || '',
          c.telefone || '',
          c.whatsapp || '',
          c.logradouro || '',
          c.numero || '',
          c.bairro || '',
          c.cidade || '',
          c.estado || '',
          c.pontoReferencia || '',
          c.latitude || null,
          c.longitude || null,
          precosJson,
          now,
        ]
      );
    }

    return this.getClientes().find((x) => x.id === id)!;
  },

  excluirCliente(id: string): void {
    const db = getDatabase();
    db.runSync('UPDATE clientes SET ativo = 0 WHERE id = ?', [id]);
  },

  getRecompraOportunidades(): RecompraOportunidade[] {
    const db = getDatabase();
    const clientes = this.getClientes();
    const oportunidades: RecompraOportunidade[] = [];
    const now = new Date();

    for (const c of clientes) {
      // Buscar pedidos do cliente
      const pedidos = db.getAllSync<any>(
        'SELECT data FROM pedidos WHERE clienteId = ? AND status != ? ORDER BY data DESC LIMIT 10',
        [c.id, 'CANCELADO']
      );

      if (pedidos.length === 0) continue;

      const ultimoPedidoData = new Date(pedidos[0].data);
      const diasSemComprar = Math.floor((now.getTime() - ultimoPedidoData.getTime()) / (1000 * 60 * 60 * 24));

      // Calcular média de dias entre compras
      let mediaDias = 15; // padrão 15 dias
      if (pedidos.length >= 2) {
        const primeiro = new Date(pedidos[pedidos.length - 1].data).getTime();
        const ultimo = ultimoPedidoData.getTime();
        const intervaloTotal = (ultimo - primeiro) / (1000 * 60 * 60 * 24);
        mediaDias = Math.max(5, Math.round(intervaloTotal / (pedidos.length - 1)));
      }

      const diasAtraso = diasSemComprar - mediaDias;

      if (diasAtraso >= 0) {
        let urgencia: 'ALTA' | 'MEDIA' | 'NORMAL' = 'NORMAL';
        if (diasAtraso >= 7) urgencia = 'ALTA';
        else if (diasAtraso >= 3) urgencia = 'MEDIA';

        oportunidades.push({
          clienteId: c.id,
          nome: c.nome,
          telefone: c.telefone || '',
          whatsapp: c.whatsapp || c.telefone || '',
          bairro: c.bairro || '',
          cidade: c.cidade || '',
          logradouro: c.logradouro || '',
          numero: c.numero || '',
          totalPedidos: pedidos.length,
          ultimoPedidoData: ultimoPedidoData.toISOString(),
          diasSemComprar,
          intervaloMedioDias: mediaDias,
          diasAtraso,
          urgencia,
        });
      }
    }

    return oportunidades.sort((a, b) => b.diasAtraso - a.diasAtraso);
  },
};

// ----------------------------------------------------
// 5. SERVIÇO DE PEDIDOS & PDV
// ----------------------------------------------------
export const PedidosService = {
  getPedidos(status?: StatusPedido, search?: string): Pedido[] {
    const db = getDatabase();
    let query = 'SELECT * FROM pedidos WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      query += ' AND (clienteNome LIKE ? OR numero LIKE ? OR clienteTelefone LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY numero DESC, data DESC';
    const rows = db.getAllSync<any>(query, params);

    return rows.map((r) => {
      const itens: PedidoItem[] = JSON.parse(r.itensJson || '[]');
      return {
        id: r.id,
        empresaId: 'local',
        numero: r.numero,
        clienteId: r.clienteId,
        cliente: {
          id: r.clienteId,
          empresaId: 'local',
          nome: r.clienteNome,
          telefone: r.clienteTelefone,
          whatsapp: r.clienteTelefone,
          logradouro: r.clienteEndereco,
          ativo: true,
          createdAt: r.createdAt,
          updatedAt: r.createdAt,
        },
        data: r.data,
        subtotal: (r.valorTotal || 0) + (r.desconto || 0) - (r.acrescimo || 0),
        total: r.valorTotal || 0,
        valorTotal: r.valorTotal,
        desconto: r.desconto,
        acrescimo: r.acrescimo,
        status: r.status as StatusPedido,
        formaPagamento: r.formaPagamento as FormaPagamento,
        trocoPara: r.trocoPara,
        observacoes: r.observacoes,
        itens,
        createdAt: r.createdAt,
        updatedAt: r.createdAt,
      };
    });
  },

  criarPedido(payload: {
    clienteId?: string;
    clienteNome?: string;
    clienteTelefone?: string;
    clienteEndereco?: string;
    itens: { produtoId: string; quantidade: number; valorUnitario?: number }[];
    desconto?: number;
    acrescimo?: number;
    observacoes?: string;
    formaPagamento?: FormaPagamento | string;
    trocoPara?: number;
    data?: string;
  }): Pedido {
    const db = getDatabase();
    const now = payload.data || new Date().toISOString();
    const id = generateId();

    // 1. Obter próximo número sequencial de pedido
    const maxRow = db.getFirstSync<{ maxNum: number }>('SELECT MAX(numero) as maxNum FROM pedidos');
    const numero = (maxRow?.maxNum || 0) + 1;

    // 2. Dados do Cliente
    let clienteNome = payload.clienteNome || 'Cliente Balcão';
    let clienteTelefone = payload.clienteTelefone || '';
    let clienteEndereco = payload.clienteEndereco || '';

    if (payload.clienteId) {
      const c = db.getFirstSync<any>('SELECT * FROM clientes WHERE id = ?', [payload.clienteId]);
      if (c) {
        clienteNome = c.nome;
        clienteTelefone = c.whatsapp || c.telefone || '';
        clienteEndereco = [c.logradouro, c.numero, c.bairro].filter(Boolean).join(', ');
      }
    }

    // 3. Montar itens e calcular total
    let total = 0;
    const itensProcessados: PedidoItem[] = [];

    for (const it of payload.itens) {
      const prod = db.getFirstSync<any>('SELECT * FROM produtos WHERE id = ?', [it.produtoId]);
      const precoUnit = it.valorUnitario !== undefined ? it.valorUnitario : prod?.precoVenda || 0;
      const sub = precoUnit * it.quantidade;
      total += sub;

      itensProcessados.push({
        id: generateId(),
        pedidoId: id,
        produtoId: it.produtoId,
        produto: prod
          ? {
              id: prod.id,
              empresaId: 'local',
              nome: prod.nome,
              categoria: prod.categoria,
              unidade: prod.unidade,
              precoVenda: prod.precoVenda,
              ativo: true,
              createdAt: prod.createdAt,
              updatedAt: prod.createdAt,
            }
          : undefined,
        quantidade: it.quantidade,
        valorUnitario: precoUnit,
        total: sub,
      });

      // Baixa no estoque do produto
      db.runSync('UPDATE produtos SET estoqueAtual = MAX(0, estoqueAtual - ?) WHERE id = ?', [
        it.quantidade,
        it.produtoId,
      ]);

      // Se for água 20L, faz a troca padrão ANP: debita Cheios e credita Vazios
      if (prod && (prod.categoria === 'AGUA_20L' || prod.nome.includes('20L'))) {
        db.runSync(
          'UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE status = ?',
          [it.quantidade, 'CHEIO']
        );
        db.runSync(
          'UPDATE estoque_garrafoes SET quantidade = quantidade + ? WHERE status = ?',
          [it.quantidade, 'VAZIO']
        );
      }
    }

    const desc = payload.desconto || 0;
    const acres = payload.acrescimo || 0;
    const valorFinal = Math.max(0, total - desc + acres);
    const formaPag = (payload.formaPagamento || 'DINHEIRO') as FormaPagamento;

    // 4. Inserir Pedido
    db.runSync(
      `INSERT INTO pedidos (id, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?, ?)`,
      [
        id,
        numero,
        payload.clienteId || null,
        clienteNome,
        clienteTelefone,
        clienteEndereco,
        now,
        valorFinal,
        desc,
        acres,
        formaPag,
        payload.trocoPara || null,
        payload.observacoes || '',
        JSON.stringify(itensProcessados),
        now,
      ]
    );

    // 5. Se foi FIADO, lançar automaticamente na Caderneta Digital
    if (formaPag === 'FIADO') {
      db.runSync(
        `INSERT INTO fiados (id, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ABERTO', ?, ?)`,
        [generateId(), payload.clienteId || 'balcao', clienteNome, id, numero, valorFinal, valorFinal, now, now]
      );
    }

    return this.getPedidos().find((p) => p.id === id)!;
  },

  atualizarStatus(id: string, status: StatusPedido): void {
    const db = getDatabase();
    db.runSync('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
  },

  cancelarPedido(id: string): void {
    const db = getDatabase();
    const ped = db.getFirstSync<any>('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (!ped) return;

    // Estornar itens ao estoque
    const itens: PedidoItem[] = JSON.parse(ped.itensJson || '[]');
    for (const it of itens) {
      db.runSync('UPDATE produtos SET estoqueAtual = estoqueAtual + ? WHERE id = ?', [it.quantidade, it.produtoId]);
    }

    // Cancelar fiado correspondente se houver
    db.runSync('UPDATE fiados SET situacao = ? WHERE pedidoId = ?', ['CANCELADO', id]);

    // Marcar como cancelado
    db.runSync('UPDATE pedidos SET status = ? WHERE id = ?', ['CANCELADO', id]);
  },
};

// ----------------------------------------------------
// 6. SERVIÇO FINANCEIRO & CADERNETA DE FIADOS
// ----------------------------------------------------
export const FinanceiroService = {
  getFiados(): Fiado[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>("SELECT * FROM fiados WHERE situacao != 'QUITADO' ORDER BY createdAt DESC");
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      clienteId: r.clienteId,
      cliente: {
        id: r.clienteId,
        empresaId: 'local',
        nome: r.clienteNome,
        ativo: true,
        createdAt: r.createdAt,
        updatedAt: r.createdAt,
      },
      pedidoId: r.pedidoId,
      pedido: {
        id: r.pedidoId,
        numero: r.pedidoNumero,
      } as any,
      valorOriginal: r.valorOriginal,
      valorPago: r.valorPago,
      saldo: r.saldo,
      situacao: r.situacao,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  quitarFiado(fiadoId: string, valorPago: number): void {
    const db = getDatabase();
    const f = db.getFirstSync<any>('SELECT * FROM fiados WHERE id = ?', [fiadoId]);
    if (!f) return;

    const novoPago = f.valorPago + valorPago;
    const novoSaldo = Math.max(0, f.valorOriginal - novoPago);
    const novaSituacao = novoSaldo === 0 ? 'QUITADO' : 'PARCIAL';
    const now = new Date().toISOString();

    db.runSync(
      'UPDATE fiados SET valorPago = ?, saldo = ?, situacao = ?, updatedAt = ? WHERE id = ?',
      [novoPago, novoSaldo, novaSituacao, now, fiadoId]
    );
  },

  getDespesas(): Despesa[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM despesas ORDER BY data DESC');
    return rows.map((r) => ({
      id: r.id,
      empresaId: 'local',
      descricao: r.descricao,
      categoria: r.categoria as any,
      valor: r.valor,
      data: r.data,
      formaPagamento: r.formaPagamento as any,
      status: 'PAGA' as const,
      createdAt: r.createdAt,
    }));
  },

  criarDespesa(d: { descricao: string; categoria: string; valor: number; formaPagamento: string }): Despesa {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    db.runSync(
      `INSERT INTO despesas (id, descricao, categoria, valor, data, formaPagamento, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, d.descricao, d.categoria, d.valor, now, d.formaPagamento, now]
    );

    return {
      id,
      empresaId: 'local',
      descricao: d.descricao,
      categoria: d.categoria as any,
      valor: d.valor,
      data: now,
      formaPagamento: d.formaPagamento as any,
      status: 'PAGA',
      createdAt: now,
    };
  },
};

// ----------------------------------------------------
// 7. SERVIÇO DE DASHBOARD EM TEMPO REAL
// ----------------------------------------------------
export const DashboardService = {
  getDashboard(periodo: 'hoje' | '7dias' | 'mes' | 'ano' = 'hoje'): DashboardData {
    const db = getDatabase();
    const now = new Date();
    let dataCorte = new Date();

    if (periodo === 'hoje') {
      dataCorte.setHours(0, 0, 0, 0);
    } else if (periodo === '7dias') {
      dataCorte.setDate(now.getDate() - 7);
      dataCorte.setHours(0, 0, 0, 0);
    } else if (periodo === 'ano') {
      dataCorte = new Date(now.getFullYear(), 0, 1);
    } else {
      // mes
      dataCorte = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dataCorteIso = dataCorte.toISOString();

    // 1. Pedidos do período
    const pedidos = db.getAllSync<any>(
      'SELECT valorTotal, status, formaPagamento FROM pedidos WHERE data >= ?',
      [dataCorteIso]
    );

    let faturamento = 0;
    let recebido = 0;
    let emAberto = 0;
    let pedidosRealizados = 0;
    let pedidosPendentes = 0;
    const formasMap: Record<string, { total: number; count: number }> = {};
    const statusMap: Record<string, number> = {};

    for (const p of pedidos) {
      if (p.status !== 'CANCELADO') {
        faturamento += p.valorTotal;
        pedidosRealizados++;

        if (p.formaPagamento === 'FIADO') {
          emAberto += p.valorTotal;
        } else {
          recebido += p.valorTotal;
        }

        // Formas
        if (!formasMap[p.formaPagamento]) {
          formasMap[p.formaPagamento] = { total: 0, count: 0 };
        }
        formasMap[p.formaPagamento].total += p.valorTotal;
        formasMap[p.formaPagamento].count++;
      }

      if (p.status === 'PENDENTE' || p.status === 'EM_ANDAMENTO') {
        pedidosPendentes++;
      }

      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    }

    // 2. Despesas do período
    const despesasRows = db.getAllSync<any>(
      'SELECT valor FROM despesas WHERE data >= ?',
      [dataCorteIso]
    );
    const totalDespesas = despesasRows.reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const resultado = recebido - totalDespesas;

    // 3. Garrafões
    const garrafoes = db.getAllSync<any>('SELECT status, quantidade FROM estoque_garrafoes');
    let garrafoesCheios = 0;
    let garrafoesVazios = 0;
    let garrafoesDanificados = 0;
    let garrafoesVencidos = 0;
    const anoAtual = now.getFullYear();

    for (const g of garrafoes) {
      if (g.status === 'CHEIO') garrafoesCheios += g.quantidade;
      else if (g.status === 'VAZIO') garrafoesVazios += g.quantidade;
      else if (g.status === 'DANIFICADO') garrafoesDanificados += g.quantidade;
      else if (g.status === 'VENCIDO') garrafoesVencidos += g.quantidade;
    }

    return {
      periodo,
      faturamento,
      recebido,
      emAberto,
      despesas: totalDespesas,
      resultado,
      pedidosRealizados,
      pedidosPendentes,
      garrafoesCheios,
      garrafoesVazios,
      garrafoesDanificados,
      garrafoesVencidos,
      recebimentoPorForma: Object.entries(formasMap).map(([forma, data]) => ({
        forma: forma as FormaPagamento,
        valor: data.total,
        quantidade: data.count,
      })),
      pedidosPorStatus: Object.entries(statusMap).map(([status, count]) => ({
        status: status as StatusPedido,
        quantidade: count,
        valorTotal: 0,
      })),
    };
  },
};
