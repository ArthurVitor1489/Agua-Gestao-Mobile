import { getDatabase } from './sqlite';
import { CloudAdminService } from '../services/cloudAdminService';
import { CloudSyncService } from '../services/cloudSyncService';
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
  GanhosMes,
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
      CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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
      CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
    return this.getProdutos().find((x) => x.id === id)!;
  },

  excluirProduto(id: string): void {
    const db = getDatabase();
    db.runSync('UPDATE produtos SET ativo = 0 WHERE id = ?', [id]);
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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
    const lista: MovimentacaoEstoque[] = [];

    // 1. Obter todas as movimentações manuais e de fábrica (Cargas, Avarias, Ajustes)
    try {
      const rows = db.getAllSync<any>(
        "SELECT * FROM movimentacoes_estoque WHERE tipo != 'SAIDA' OR motivo NOT LIKE 'Venda - Pedido%' ORDER BY data DESC LIMIT 200"
      );
      for (const r of rows) {
        lista.push({
          id: r.id,
          empresaId: 'local',
          tipo: r.tipo,
          quantidade: r.quantidade,
          produtoId: r.produtoId,
          produto: r.produtoNome ? ({ nome: r.produtoNome } as any) : null,
          motivo: r.motivo,
          data: r.data,
        });
      }
    } catch (e) {
      console.warn('Erro ao ler movimentacoes_estoque:', e);
    }

    // 2. Obter saídas de todos os pedidos reais faturados e lançados no app
    try {
      const pedidos = db.getAllSync<any>(
        "SELECT id, numero, clienteNome, data, itensJson, status FROM pedidos WHERE status != 'CANCELADO' ORDER BY numero DESC, data DESC LIMIT 200"
      );

      for (const ped of pedidos) {
        const itens: PedidoItem[] = JSON.parse(ped.itensJson || '[]');
        for (const it of itens) {
          const prodNome = it.produto?.nome || 'Galão de Água 20L';
          lista.push({
            id: `mov-ped-${ped.id}-${it.produtoId || it.id || Math.random()}`,
            empresaId: 'local',
            tipo: 'SAIDA',
            quantidade: it.quantidade,
            produtoId: it.produtoId,
            produto: { nome: prodNome } as any,
            motivo: `Venda - Pedido #${ped.numero} (${ped.clienteNome || 'Cliente'})`,
            pedidoId: ped.id,
            data: ped.data,
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar vendas de pedidos para o extrato:', e);
    }

    // 3. Ordenar todas as entradas e saídas pela data mais recente primeiro
    lista.sort((a, b) => {
      const timeA = new Date(a.data).getTime() || 0;
      const timeB = new Date(b.data).getTime() || 0;
      return timeB - timeA;
    });

    return lista;
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
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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

    // 1. Determinar o produto alvo
    let targetProdutoId = params.produtoId;
    if (!targetProdutoId || targetProdutoId === 'prod-galao-20l') {
      const topProd = db.getFirstSync<any>(
        'SELECT id, nome FROM produtos WHERE estoqueAtual > 0 AND ativo = 1 ORDER BY estoqueAtual DESC LIMIT 1'
      ) || db.getFirstSync<any>('SELECT id, nome FROM produtos WHERE ativo = 1 LIMIT 1');
      if (topProd) {
        targetProdutoId = topProd.id;
      }
    }

    // 2. Subtrair do estoque do produto (perda da água/cheio)
    if (targetProdutoId) {
      db.runSync('UPDATE produtos SET estoqueAtual = MAX(0, estoqueAtual - ?) WHERE id = ?', [
        params.quantidade,
        targetProdutoId,
      ]);
    }

    // 3. Subtrair dos garrafões CHEIOS
    const existingCheio = db.getFirstSync<any>(
      "SELECT id, quantidade FROM estoque_garrafoes WHERE status = 'CHEIO' ORDER BY quantidade DESC LIMIT 1"
    );
    if (existingCheio) {
      db.runSync('UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE id = ?', [
        params.quantidade,
        existingCheio.id,
      ]);
    }

    // 4. Adicionar aos AVARIADOS (DANIFICADO)
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

    // 5. Registrar histórico no extrato de movimentação de estoque
    const prodRow = targetProdutoId
      ? db.getFirstSync<any>('SELECT nome FROM produtos WHERE id = ?', [targetProdutoId])
      : null;
    const nomeProd = prodRow?.nome || params.tipoVasilhame || 'Galão de Água 20L';

    const motivoAudit = `Avaria (${params.localAvaria}): -${params.quantidade} Cheio (${nomeProd})${
      params.observacao ? ` - ${params.observacao}` : ''
    }`;

    db.runSync(
      `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
       VALUES (?, ?, ?, 'SAIDA', ?, ?, ?)`,
      [generateId(), targetProdutoId || null, nomeProd, params.quantidade, motivoAudit, now]
    );
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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

    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
    return this.getClientes().find((x) => x.id === id)!;
  },

  excluirCliente(id: string): void {
    const db = getDatabase();
    db.runSync('UPDATE clientes SET ativo = 0 WHERE id = ?', [id]);
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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

  criarDadoTesteRecompra(): void {
    const db = getDatabase();
    const clienteId = 'cli-teste-recompra';
    const now = new Date();
    const dataAntiga = new Date();
    dataAntiga.setDate(now.getDate() - 18); // 18 dias atrás

    // 1. Criar ou atualizar cliente de teste
    db.runSync(
      `INSERT INTO clientes (id, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, whatsapp = excluded.whatsapp, telefone = excluded.telefone;`,
      [
        clienteId,
        'Dona Maria (Teste Recompra)',
        '000.000.000-00',
        '83999999999',
        '83999999999',
        'Rua das Palmeiras',
        '250',
        'Centro',
        'João Pessoa',
        'PB',
        'Em frente ao mercado',
        null,
        null,
        dataAntiga.toISOString(),
      ]
    );

    // 2. Criar pedido com data de 18 dias atrás
    const pedId = 'ped-teste-recompra';
    db.runSync(
      `INSERT INTO pedidos (id, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, itensJson, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ENTREGUE', 'PIX', ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data;`,
      [
        pedId,
        9999,
        clienteId,
        'Dona Maria (Teste Recompra)',
        '83999999999',
        'Rua das Palmeiras, 250 - Centro',
        dataAntiga.toISOString(),
        28.0,
        JSON.stringify([{ produtoId: 'prod-galao-20l', nome: 'Água Mineral 20L', quantidade: 2, valorUnitario: 14.0, subtotal: 28.0 }]),
        dataAntiga.toISOString(),
      ]
    );
  },

  removerDadoTesteRecompra(): void {
    const db = getDatabase();
    db.runSync("DELETE FROM pedidos WHERE id = 'ped-teste-recompra'");
    db.runSync("DELETE FROM clientes WHERE id = 'cli-teste-recompra'");
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
      const pagamentos = r.pagamentosJson ? JSON.parse(r.pagamentosJson) : undefined;
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
        pagamentos,
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
    pagamentosMultiplos?: { forma: string; valor: number }[];
    trocoPara?: number;
    data?: string;
  }): Pedido {
    const db = getDatabase();
    const now = payload.data || new Date().toISOString();
    const id = generateId();

    try {
      db.execSync('ALTER TABLE pedidos ADD COLUMN pagamentosJson TEXT;');
    } catch {}

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

      // Debita Cheios em estoque_garrafoes
      db.runSync(
        'UPDATE estoque_garrafoes SET quantidade = MAX(0, quantidade - ?) WHERE status = ?',
        [it.quantidade, 'CHEIO']
      );

      // Registrar histórico no extrato de movimentação de estoque
      db.runSync(
        `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
         VALUES (?, ?, ?, 'SAIDA', ?, ?, ?)`,
        [generateId(), it.produtoId, prod?.nome || 'Água Mineral', it.quantidade, `Venda - Pedido #${numero}`, now]
      );
    }

    const desc = payload.desconto || 0;
    const acres = payload.acrescimo || 0;
    const valorFinal = Math.max(0, total - desc + acres);
    
    // Suporte a Pagamento Múltiplo
    const pagamentosMultiplos = payload.pagamentosMultiplos || [];
    let formaPag = (payload.formaPagamento || 'DINHEIRO') as string;

    if (pagamentosMultiplos.length > 1) {
      formaPag = pagamentosMultiplos
        .map((p) => `${p.forma} (R$ ${p.valor.toFixed(2)})`)
        .join(' + ');
    } else if (pagamentosMultiplos.length === 1) {
      formaPag = pagamentosMultiplos[0].forma;
    }

    // 4. Inserir Pedido
    db.runSync(
      `INSERT INTO pedidos (id, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, pagamentosJson, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(pagamentosMultiplos),
        now,
      ]
    );

    // 5. Se teve FIADO (integral ou parcial em pagamento múltiplo), lançar na Caderneta Digital
    if (pagamentosMultiplos.length > 0) {
      const parteFiado = pagamentosMultiplos.find((p) => p.forma.toUpperCase().includes('FIADO'));
      if (parteFiado && parteFiado.valor > 0) {
        db.runSync(
          `INSERT INTO fiados (id, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ABERTO', ?, ?)`,
          [generateId(), payload.clienteId || 'balcao', clienteNome, id, numero, parteFiado.valor, parteFiado.valor, now, now]
        );
      }
    } else if (formaPag === 'FIADO' || formaPag.toUpperCase().includes('FIADO')) {
      db.runSync(
        `INSERT INTO fiados (id, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ABERTO', ?, ?)`,
        [generateId(), payload.clienteId || 'balcao', clienteNome, id, numero, valorFinal, valorFinal, now, now]
      );
    }

    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
    return this.getPedidos().find((p) => p.id === id)!;
  },

  atualizarStatus(id: string, status: StatusPedido): void {
    const db = getDatabase();
    db.runSync('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
  },

  cancelarPedido(id: string): void {
    const db = getDatabase();
    const ped = db.getFirstSync<any>('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (!ped) return;

    // Estornar itens ao estoque
    const itens: PedidoItem[] = JSON.parse(ped.itensJson || '[]');
    const now = new Date().toISOString();
    for (const it of itens) {
      db.runSync('UPDATE produtos SET estoqueAtual = estoqueAtual + ? WHERE id = ?', [it.quantidade, it.produtoId]);
      db.runSync(
        'UPDATE estoque_garrafoes SET quantidade = quantidade + ? WHERE status = ?',
        [it.quantidade, 'CHEIO']
      );
      db.runSync(
        `INSERT INTO movimentacoes_estoque (id, produtoId, produtoNome, tipo, quantidade, motivo, data)
         VALUES (?, ?, ?, 'ENTRADA', ?, ?, ?)`,
        [generateId(), it.produtoId, it.produto?.nome || 'Água Mineral', it.quantidade, `Estorno Cancelamento Pedido #${ped.numero}`, now]
      );
    }

    // Cancelar fiado correspondente se houver
    db.runSync('UPDATE fiados SET situacao = ? WHERE pedidoId = ?', ['CANCELADO', id]);

    // Marcar como cancelado
    db.runSync('UPDATE pedidos SET status = ? WHERE id = ?', ['CANCELADO', id]);
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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
    CloudSyncService.agendarSincronizacaoEmSegundoPlano();
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

    CloudSyncService.agendarSincronizacaoEmSegundoPlano();

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

  getGanhosPorMes(limiteMeses: number = 6): GanhosMes[] {
    const db = getDatabase();
    const mesesMap: Record<
      string,
      {
        faturamento: number;
        recebido: number;
        emAberto: number;
        despesas: number;
        totalPedidos: number;
        totalGaloes: number;
      }
    > = {};

    // 1. Gerar lista cronológica dos últimos X meses (garante que meses sem vendas também apareçam)
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth();

    const nomesMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const nomesMesesCurtos = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    for (let i = limiteMeses - 1; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const chave = `${yyyy}-${mm}`;
      mesesMap[chave] = {
        faturamento: 0,
        recebido: 0,
        emAberto: 0,
        despesas: 0,
        totalPedidos: 0,
        totalGaloes: 0,
      };
    }

    // 2. Totalizar Vendas e Galões por mês
    try {
      // Carregar mapa de fiados para saber o saldo REAL em aberto
      const fiadosRows = db.getAllSync<any>(
        'SELECT pedidoId, saldo, situacao, valorPago FROM fiados WHERE pedidoId IS NOT NULL'
      );
      const fiadosPorPedido: Record<string, { saldo: number; situacao: string; valorPago: number }> = {};
      for (const f of fiadosRows) {
        fiadosPorPedido[f.pedidoId] = {
          saldo: f.saldo || 0,
          situacao: f.situacao || 'ABERTO',
          valorPago: f.valorPago || 0,
        };
      }

      const pedidosRows = db.getAllSync<any>(
        "SELECT id, numero, data, valorTotal, formaPagamento, itensJson FROM pedidos WHERE status != 'CANCELADO'"
      );

      for (const p of pedidosRows) {
        if (!p.data) continue;
        const chave = p.data.substring(0, 7); // "YYYY-MM"
        if (!mesesMap[chave]) {
          mesesMap[chave] = { faturamento: 0, recebido: 0, emAberto: 0, despesas: 0, totalPedidos: 0, totalGaloes: 0 };
        }
        mesesMap[chave].faturamento += p.valorTotal || 0;
        
        let pendente = 0;
        let pago = 0;

        if (fiadosPorPedido[p.id]) {
          pendente = fiadosPorPedido[p.id].saldo;
          pago = Math.max(0, (p.valorTotal || 0) - pendente);
        } else {
          const isFiado = p.formaPagamento === 'FIADO' || String(p.formaPagamento).toUpperCase().includes('FIADO');
          if (isFiado) {
            pendente = p.valorTotal || 0;
            pago = 0;
          } else {
            pendente = 0;
            pago = p.valorTotal || 0;
          }
        }

        mesesMap[chave].emAberto += pendente;
        mesesMap[chave].recebido += pago;

        mesesMap[chave].totalPedidos += 1;

        try {
          const itens = JSON.parse(p.itensJson || '[]');
          for (const it of itens) {
            mesesMap[chave].totalGaloes += it.quantidade || 0;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Erro ao totalizar vendas mensais:', e);
    }

    // 3. Totalizar Despesas por mês
    try {
      const despesasRows = db.getAllSync<any>('SELECT data, valor FROM despesas');
      for (const d of despesasRows) {
        if (!d.data) continue;
        const chave = d.data.substring(0, 7);
        if (!mesesMap[chave]) {
          mesesMap[chave] = { faturamento: 0, recebido: 0, emAberto: 0, despesas: 0, totalPedidos: 0, totalGaloes: 0 };
        }
        mesesMap[chave].despesas += d.valor || 0;
      }
    } catch (e) {
      console.warn('Erro ao totalizar despesas mensais:', e);
    }

    // 4. Montar array ordenado (mais recente primeiro)
    const chavesOrdenadas = Object.keys(mesesMap).sort().reverse();
    const mesAtualChave = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;

    return chavesOrdenadas.slice(0, limiteMeses).map((chave) => {
      const dados = mesesMap[chave];
      const [yStr, mStr] = chave.split('-');
      const y = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;

      const lucroLiquido = dados.faturamento - dados.despesas;
      const ticketMedio = dados.totalPedidos > 0 ? dados.faturamento / dados.totalPedidos : 0;

      return {
        mesAno: chave,
        rotuloMes: `${nomesMeses[mIdx]} / ${y}`,
        rotuloCurto: `${nomesMesesCurtos[mIdx]}/${String(y).slice(-2)}`,
        faturamento: dados.faturamento,
        recebido: dados.recebido,
        emAberto: dados.emAberto,
        despesas: dados.despesas,
        lucroLiquido,
        totalPedidos: dados.totalPedidos,
        totalGaloes: dados.totalGaloes,
        ticketMedio,
        isMesAtual: chave === mesAtualChave,
      };
    });
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

    // Carregar mapa de fiados para saber o saldo REAL em aberto
    const fiadosRows = db.getAllSync<any>(
      'SELECT pedidoId, saldo, situacao FROM fiados WHERE pedidoId IS NOT NULL'
    );
    const fiadosPorPedido: Record<string, { saldo: number; situacao: string }> = {};
    for (const f of fiadosRows) {
      fiadosPorPedido[f.pedidoId] = {
        saldo: f.saldo || 0,
        situacao: f.situacao || 'ABERTO',
      };
    }

    // 1. Pedidos do período
    const pedidos = db.getAllSync<any>(
      'SELECT id, valorTotal, status, formaPagamento FROM pedidos WHERE data >= ?',
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

        let pendente = 0;
        let pago = 0;

        if (fiadosPorPedido[p.id]) {
          pendente = fiadosPorPedido[p.id].saldo;
          pago = Math.max(0, p.valorTotal - pendente);
        } else {
          const isFiado = p.formaPagamento === 'FIADO' || String(p.formaPagamento).toUpperCase().includes('FIADO');
          if (isFiado) {
            pendente = p.valorTotal;
            pago = 0;
          } else {
            pendente = 0;
            pago = p.valorTotal;
          }
        }

        emAberto += pendente;
        recebido += pago;

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

    const prodCheiosRow = db.getFirstSync<{ total: number }>(
      'SELECT SUM(estoqueAtual) as total FROM produtos WHERE ativo = 1'
    );
    if (prodCheiosRow && typeof prodCheiosRow.total === 'number') {
      garrafoesCheios = prodCheiosRow.total;
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
