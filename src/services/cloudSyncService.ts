import { AppState, AppStateStatus } from 'react-native';
import { getDatabase } from '../database/sqlite';
import { SupabaseClientService } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  message: string;
  timestamp: string;
}

let activeChannel: RealtimeChannel | null = null;
let isSyncing = false;
let debounceTimer: any = null;
let periodicInterval: any = null;
let appStateSubscription: any = null;
let isAutoMonitoringStarted = false;
let syncListeners: ((status: 'syncing' | 'idle' | 'success' | 'error', message?: string) => void)[] = [];

/**
 * Obtém o empresaId isolado deste aparelho para garantir que distribuidoras diferentes
 * NUNCA misturem ou acessem dados de outras empresas no banco central da nuvem.
 */
const getTenantEmpresaId = (db: any): string => {
  try {
    const row = db.getFirstSync('SELECT empresaId FROM configuracao LIMIT 1');
    if (row?.empresaId && row.empresaId !== 'local') return row.empresaId;
    const user = db.getFirstSync(
      'SELECT empresaId FROM usuarios WHERE empresaId IS NOT NULL AND empresaId != "local" LIMIT 1'
    );
    if (user?.empresaId) return user.empresaId;
  } catch {}
  return 'emp-padrao';
};

export const CloudSyncService = {
  /**
   * Adiciona um ouvinte para o status da sincronização
   */
  subscribeStatus(listener: (status: 'syncing' | 'idle' | 'success' | 'error', message?: string) => void) {
    syncListeners.push(listener);
    return () => {
      syncListeners = syncListeners.filter((l) => l !== listener);
    };
  },

  notifyListeners(status: 'syncing' | 'idle' | 'success' | 'error', message?: string) {
    syncListeners.forEach((fn) => {
      try {
        fn(status, message);
      } catch (e) {
        console.warn('Erro ao notificar listener de sincronização:', e);
      }
    });
  },

  isCurrentlySyncing(): boolean {
    return isSyncing;
  },

  /**
   * Agenda uma sincronização em segundo plano após um pequeno atraso (debounce).
   * Chamado automaticamente após criar pedidos, clientes, produtos, despesas, etc.
   */
  agendarSincronizacaoEmSegundoPlano(delayMs: number = 2500): void {
    const config = SupabaseClientService.getConfig();
    if (!config.isConfigured) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      this.sincronizarTudoSilencioso();
    }, delayMs);
  },

  /**
   * Sincronização silenciosa em segundo plano (não gera alerts invasivos na UI)
   */
  async sincronizarTudoSilencioso(): Promise<SyncResult> {
    if (isSyncing) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        message: 'Sincronização já em execução.',
        timestamp: new Date().toISOString(),
      };
    }
    return this.sincronizarTudo();
  },

  /**
   * Inicia o monitoramento inteligente de segundo plano:
   * 1. Sincroniza ao abrir o app / retornar do WhatsApp ou segundo plano
   * 2. Sincroniza a cada 3 minutos periodicamente
   * 3. Conecta aos canais Realtime do Supabase
   */
  iniciarMonitoramentoAutomatico(): () => void {
    if (isAutoMonitoringStarted) {
      return () => this.pararMonitoramentoAutomatico();
    }

    isAutoMonitoringStarted = true;

    // 1. Iniciar Realtime se configurado
    this.iniciarRealtime();

    // 2. Sincronização inicial rápida
    this.agendarSincronizacaoEmSegundoPlano(1500);

    // 3. Monitor de estado do aplicativo (quando usuário volta pro app)
    appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[CloudSync] App retornou ao primeiro plano. Sincronizando com a nuvem...');
        this.agendarSincronizacaoEmSegundoPlano(1000);
      }
    });

    // 4. Timer periódico a cada 3 minutos (180.000 ms)
    periodicInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        console.log('[CloudSync] Sincronização periódica automática...');
        this.sincronizarTudoSilencioso();
      }
    }, 180000);

    return () => this.pararMonitoramentoAutomatico();
  },

  /**
   * Encerra o monitoramento de segundo plano
   */
  pararMonitoramentoAutomatico(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (periodicInterval) {
      clearInterval(periodicInterval);
      periodicInterval = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    this.pararRealtime();
    isAutoMonitoringStarted = false;
  },

  /**
   * Sincronização completa bidirecional (Push local -> Cloud, Pull Cloud -> Local)
   */
  async sincronizarTudo(): Promise<SyncResult> {
    if (isSyncing) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        message: 'Uma sincronização já está em andamento.',
        timestamp: new Date().toISOString(),
      };
    }

    const supabase = SupabaseClientService.getClient();
    if (!supabase) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        message: 'Banco Supabase não configurado. Adicione a URL e a Chave Anon nas configurações.',
        timestamp: new Date().toISOString(),
      };
    }

    isSyncing = true;
    this.notifyListeners('syncing', 'Iniciando sincronização...');

    let totalPushed = 0;
    let totalPulled = 0;
    const syncErrors: string[] = [];
    const now = new Date().toISOString();
    const db = getDatabase();
    const tenantEmpresaId = getTenantEmpresaId(db);

    try {
      // ---------------------------------------------------------
      // 1. PUSH: Enviar dados locais para o Supabase (filtrados por empresaId)
      // ---------------------------------------------------------
      this.notifyListeners('syncing', 'Enviando dados locais para a nuvem...');

      // 1.1 Configuração + Credenciais de Acesso na Nuvem
      try {
        const configs = db
          .getAllSync<any>("SELECT * FROM configuracao WHERE id NOT LIKE 'auth_user_%'")
          .map((c) => ({
            ...c,
            empresaId: c.empresaId || tenantEmpresaId,
          }));

        // Também sincroniza o usuário ativo em configuracao (id = auth_user_<email>) para permitir login após reinstalar o app
        try {
          const users = db.getAllSync<any>('SELECT * FROM usuarios WHERE ativo = 1');
          const mainCfg = configs[0];
          for (const u of users) {
            if (u.email) {
              const emailNorm = String(u.email).toLowerCase().trim();
              configs.push({
                id: `auth_user_${emailNorm}`,
                empresaId: u.empresaId && u.empresaId !== 'local' ? u.empresaId : tenantEmpresaId,
                nomeDistribuidora: mainCfg?.nomeDistribuidora || u.empresaNome || 'Minha Distribuidora',
                telefone: JSON.stringify({
                  id: u.id,
                  nome: u.nome,
                  email: emailNorm,
                  senha: u.senha,
                  role: u.role || 'ADMIN',
                  empresaId: u.empresaId && u.empresaId !== 'local' ? u.empresaId : tenantEmpresaId,
                  empresaNome: mainCfg?.nomeDistribuidora || u.empresaNome || 'Minha Distribuidora',
                }),
                whatsapp: mainCfg?.whatsapp || '',
                chavePix: '',
                cidade: mainCfg?.cidade || '',
                estado: mainCfg?.estado || 'PB',
                trialStartDate: mainCfg?.trialStartDate || now,
                isSubscribed: mainCfg?.isSubscribed ?? 0,
                plano: 'AUTH_USER',
                createdAt: u.createdAt || now,
              });
            }
          }
        } catch {}

        if (configs.length > 0) {
          const { error } = await supabase.from('configuracao').upsert(configs, { onConflict: 'id' });
          if (!error) totalPushed += configs.length;
          else syncErrors.push(`configuracao: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`configuracao: ${err?.message || err}`);
        console.warn('Sync push configuracao:', err);
      }

      // 1.2 Produtos (Garante IDs exclusivos por empresa para evitar colisão entre distribuidoras)
      try {
        for (const legacyId of ['prod-galao-20l', 'prod-vasilhame-20l']) {
          const scopedId = `${tenantEmpresaId}_${legacyId}`;
          const hasLegacy = db.getFirstSync<any>('SELECT id FROM produtos WHERE id = ?', [legacyId]);
          const hasScoped = db.getFirstSync<any>('SELECT id FROM produtos WHERE id = ?', [scopedId]);
          if (hasLegacy && !hasScoped) {
            db.runSync('UPDATE produtos SET id = ?, empresaId = ? WHERE id = ?', [scopedId, tenantEmpresaId, legacyId]);
          } else if (hasLegacy && hasScoped) {
            db.runSync('DELETE FROM produtos WHERE id = ?', [legacyId]);
          }
        }

        const produtos = db.getAllSync<any>('SELECT * FROM produtos').map((p) => ({
          ...p,
          empresaId: p.empresaId || tenantEmpresaId,
        }));
        if (produtos.length > 0) {
          const { error } = await supabase.from('produtos').upsert(produtos, { onConflict: 'id' });
          if (!error) totalPushed += produtos.length;
          else syncErrors.push(`produtos: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`produtos: ${err?.message || err}`);
        console.warn('Sync push produtos:', err);
      }

      // 1.3 Estoque Garrafões
      try {
        const garrafoes = db.getAllSync<any>('SELECT * FROM estoque_garrafoes').map((g) => ({
          ...g,
          empresaId: g.empresaId || tenantEmpresaId,
        }));
        if (garrafoes.length > 0) {
          const { error } = await supabase.from('estoque_garrafoes').upsert(garrafoes, { onConflict: 'id' });
          if (!error) totalPushed += garrafoes.length;
          else syncErrors.push(`estoque_garrafoes: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`estoque_garrafoes: ${err?.message || err}`);
        console.warn('Sync push estoque_garrafoes:', err);
      }

      // 1.4 Clientes
      try {
        const clientes = db.getAllSync<any>('SELECT * FROM clientes').map((c) => ({
          ...c,
          empresaId: c.empresaId || tenantEmpresaId,
        }));
        if (clientes.length > 0) {
          const { error } = await supabase.from('clientes').upsert(clientes, { onConflict: 'id' });
          if (!error) totalPushed += clientes.length;
          else syncErrors.push(`clientes: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`clientes: ${err?.message || err}`);
        console.warn('Sync push clientes:', err);
      }

      // 1.5 Pedidos (Remove colunas exclusivas do SQLite local como pagamentosJson para compatibilidade com o schema do Supabase)
      try {
        const pedidos = db.getAllSync<any>('SELECT * FROM pedidos').map((p) => {
          const { pagamentosJson, ...rest } = p;
          return {
            ...rest,
            empresaId: p.empresaId || tenantEmpresaId,
          };
        });
        if (pedidos.length > 0) {
          const { error } = await supabase.from('pedidos').upsert(pedidos, { onConflict: 'id' });
          if (!error) totalPushed += pedidos.length;
          else syncErrors.push(`pedidos: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`pedidos: ${err?.message || err}`);
        console.warn('Sync push pedidos:', err);
      }

      // 1.6 Fiados
      try {
        const fiados = db.getAllSync<any>('SELECT * FROM fiados').map((f) => ({
          ...f,
          empresaId: f.empresaId || tenantEmpresaId,
        }));
        if (fiados.length > 0) {
          const { error } = await supabase.from('fiados').upsert(fiados, { onConflict: 'id' });
          if (!error) totalPushed += fiados.length;
          else syncErrors.push(`fiados: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`fiados: ${err?.message || err}`);
        console.warn('Sync push fiados:', err);
      }

      // 1.7 Despesas
      try {
        const despesas = db.getAllSync<any>('SELECT * FROM despesas').map((d) => ({
          ...d,
          empresaId: d.empresaId || tenantEmpresaId,
        }));
        if (despesas.length > 0) {
          const { error } = await supabase.from('despesas').upsert(despesas, { onConflict: 'id' });
          if (!error) totalPushed += despesas.length;
          else syncErrors.push(`despesas: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`despesas: ${err?.message || err}`);
        console.warn('Sync push despesas:', err);
      }

      // 1.8 Movimentações de Estoque
      try {
        const movs = db.getAllSync<any>('SELECT * FROM movimentacoes_estoque').map((m) => ({
          ...m,
          empresaId: m.empresaId || tenantEmpresaId,
        }));
        if (movs.length > 0) {
          const { error } = await supabase.from('movimentacoes_estoque').upsert(movs, { onConflict: 'id' });
          if (!error) totalPushed += movs.length;
          else syncErrors.push(`movimentacoes_estoque: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`movimentacoes_estoque: ${err?.message || err}`);
        console.warn('Sync push movimentacoes_estoque:', err);
      }

      // 1.9 Quitações de Fiados
      try {
        const quitacoes = db.getAllSync<any>('SELECT * FROM quitacoes_fiado').map((q) => ({
          ...q,
          empresaId: q.empresaId || tenantEmpresaId,
        }));
        if (quitacoes.length > 0) {
          const { error } = await supabase.from('quitacoes_fiado').upsert(quitacoes, { onConflict: 'id' });
          if (!error) totalPushed += quitacoes.length;
          else syncErrors.push(`quitacoes_fiado: ${error.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`quitacoes_fiado: ${err?.message || err}`);
        console.warn('Sync push quitacoes_fiado:', err);
      }

      // ---------------------------------------------------------
      // 2. PULL: Baixar dados atualizados da Nuvem para o SQLite
      // ISOLAMENTO ESTREITO: Baixa ESTRITAMENTE os dados desta empresa
      // ---------------------------------------------------------
      this.notifyListeners('syncing', 'Recebendo dados da nuvem...');

      // 2.1 Produtos da Nuvem
      try {
        const { data: cloudProdutos, error: pErr } = await supabase
          .from('produtos')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!pErr && cloudProdutos && cloudProdutos.length > 0) {
          for (const p of cloudProdutos) {
            db.runSync(
              `INSERT INTO produtos (id, empresaId, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 nome = excluded.nome,
                 categoria = excluded.categoria,
                 precoVenda = excluded.precoVenda,
                 custo = excluded.custo,
                 estoqueAtual = excluded.estoqueAtual,
                 unidade = excluded.unidade,
                 ativo = excluded.ativo;`,
              [p.id, p.empresaId || tenantEmpresaId, p.nome, p.categoria, p.precoVenda, p.custo ?? 0, p.estoqueAtual ?? 0, p.unidade ?? 'UN', p.ativo ?? 1, p.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull produtos:', err);
      }

      // 2.2 Clientes da Nuvem
      try {
        const { data: cloudClientes, error: cErr } = await supabase
          .from('clientes')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!cErr && cloudClientes && cloudClientes.length > 0) {
          for (const c of cloudClientes) {
            db.runSync(
              `INSERT INTO clientes (id, empresaId, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 nome = excluded.nome,
                 cpfCnpj = excluded.cpfCnpj,
                 telefone = excluded.telefone,
                 whatsapp = excluded.whatsapp,
                 logradouro = excluded.logradouro,
                 numero = excluded.numero,
                 bairro = excluded.bairro,
                 cidade = excluded.cidade,
                 estado = excluded.estado,
                 pontoReferencia = excluded.pontoReferencia,
                 latitude = excluded.latitude,
                 longitude = excluded.longitude,
                 ativo = excluded.ativo,
                 precosEspeciaisJson = excluded.precosEspeciaisJson;`,
              [
                c.id, c.empresaId || tenantEmpresaId, c.nome, c.cpfCnpj || null, c.telefone || null, c.whatsapp || null,
                c.logradouro || null, c.numero || null, c.bairro || null, c.cidade || null, c.estado || null,
                c.pontoReferencia || null, c.latitude ?? null, c.longitude ?? null, c.ativo ?? 1,
                c.precosEspeciaisJson || null, c.createdAt || now
              ]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull clientes:', err);
      }

      // 2.3 Pedidos da Nuvem
      try {
        const { data: cloudPedidos, error: pedErr } = await supabase
          .from('pedidos')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!pedErr && cloudPedidos && cloudPedidos.length > 0) {
          for (const p of cloudPedidos) {
            db.runSync(
              `INSERT INTO pedidos (id, empresaId, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 numero = excluded.numero,
                 clienteId = excluded.clienteId,
                 clienteNome = excluded.clienteNome,
                 clienteTelefone = excluded.clienteTelefone,
                 clienteEndereco = excluded.clienteEndereco,
                 data = excluded.data,
                 valorTotal = excluded.valorTotal,
                 desconto = excluded.desconto,
                 acrescimo = excluded.acrescimo,
                 status = excluded.status,
                 formaPagamento = excluded.formaPagamento,
                 trocoPara = excluded.trocoPara,
                 observacoes = excluded.observacoes,
                 itensJson = excluded.itensJson;`,
              [
                p.id, p.empresaId || tenantEmpresaId, p.numero, p.clienteId || null, p.clienteNome, p.clienteTelefone || null,
                p.clienteEndereco || null, p.data, p.valorTotal, p.desconto ?? 0, p.acrescimo ?? 0,
                p.status, p.formaPagamento, p.trocoPara ?? null, p.observacoes || null,
                p.itensJson || '[]', p.createdAt || now
              ]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull pedidos:', err);
      }

      // 2.4 Fiados da Nuvem
      try {
        const { data: cloudFiados, error: fErr } = await supabase
          .from('fiados')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!fErr && cloudFiados && cloudFiados.length > 0) {
          for (const f of cloudFiados) {
            db.runSync(
              `INSERT INTO fiados (id, empresaId, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 clienteId = excluded.clienteId,
                 clienteNome = excluded.clienteNome,
                 pedidoId = excluded.pedidoId,
                 pedidoNumero = excluded.pedidoNumero,
                 valorOriginal = excluded.valorOriginal,
                 valorPago = excluded.valorPago,
                 saldo = excluded.saldo,
                 situacao = excluded.situacao,
                 updatedAt = excluded.updatedAt;`,
              [
                f.id, f.empresaId || tenantEmpresaId, f.clienteId, f.clienteNome, f.pedidoId || null, f.pedidoNumero || null,
                f.valorOriginal, f.valorPago ?? 0, f.saldo, f.situacao, f.createdAt || now, f.updatedAt || now
              ]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull fiados:', err);
      }

      // 2.5 Despesas da Nuvem
      try {
        const { data: cloudDespesas, error: dErr } = await supabase
          .from('despesas')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!dErr && cloudDespesas && cloudDespesas.length > 0) {
          for (const d of cloudDespesas) {
            db.runSync(
              `INSERT INTO despesas (id, empresaId, descricao, categoria, valor, data, formaPagamento, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 descricao = excluded.descricao,
                 categoria = excluded.categoria,
                 valor = excluded.valor,
                 data = excluded.data,
                 formaPagamento = excluded.formaPagamento;`,
              [d.id, d.empresaId || tenantEmpresaId, d.descricao, d.categoria, d.valor, d.data, d.formaPagamento, d.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull despesas:', err);
      }

      // 2.6 Estoque Garrafões da Nuvem
      try {
        const { data: cloudGarrafoes, error: gErr } = await supabase
          .from('estoque_garrafoes')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!gErr && cloudGarrafoes && cloudGarrafoes.length > 0) {
          for (const g of cloudGarrafoes) {
            db.runSync(
              `INSERT INTO estoque_garrafoes (id, empresaId, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 anoFabricacao = excluded.anoFabricacao,
                 anoValidade = excluded.anoValidade,
                 quantidade = excluded.quantidade,
                 status = excluded.status,
                 observacoes = excluded.observacoes;`,
              [g.id, g.empresaId || tenantEmpresaId, g.anoFabricacao, g.anoValidade, g.quantidade, g.status, g.observacoes || null, g.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull estoque_garrafoes:', err);
      }

      // 2.7 Quitações de Fiados da Nuvem
      try {
        const { data: cloudQuitacoes, error: qErr } = await supabase
          .from('quitacoes_fiado')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!qErr && cloudQuitacoes && cloudQuitacoes.length > 0) {
          for (const q of cloudQuitacoes) {
            db.runSync(
              `INSERT INTO quitacoes_fiado (id, empresaId, fiadoId, pedidoId, clienteId, clienteNome, valor, formaPagamento, data, observacoes, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 valor = excluded.valor,
                 formaPagamento = excluded.formaPagamento,
                 data = excluded.data,
                 observacoes = excluded.observacoes;`,
              [q.id, q.empresaId || tenantEmpresaId, q.fiadoId, q.pedidoId || null, q.clienteId || 'balcao', q.clienteNome || 'Cliente', q.valor, q.formaPagamento, q.data, q.observacoes || null, q.createdAt || q.data || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull quitacoes_fiado:', err);
      }

      // 2.8 Movimentações de Estoque da Nuvem
      try {
        const { data: cloudMovs, error: mErr } = await supabase
          .from('movimentacoes_estoque')
          .select('*')
          .eq('empresaId', tenantEmpresaId);

        if (!mErr && cloudMovs && cloudMovs.length > 0) {
          for (const m of cloudMovs) {
            db.runSync(
              `INSERT INTO movimentacoes_estoque (id, empresaId, produtoId, produtoNome, tipo, quantidade, motivo, data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 empresaId = excluded.empresaId,
                 produtoId = excluded.produtoId,
                 produtoNome = excluded.produtoNome,
                 tipo = excluded.tipo,
                 quantidade = excluded.quantidade,
                 motivo = excluded.motivo,
                 data = excluded.data;`,
              [m.id, m.empresaId || tenantEmpresaId, m.produtoId || null, m.produtoNome || 'Água Mineral', m.tipo || 'AJUSTE', m.quantidade ?? 0, m.motivo || null, m.data || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull movimentacoes_estoque:', err);
      }

      // Atualiza timestamp da sincronização
      SupabaseClientService.updateLastSyncTime(now);

      if (syncErrors.length > 0 && totalPushed === 0) {
        const errorDetail = syncErrors[0];
        const msg = `Aviso: As tabelas do Supabase precisam ser atualizadas com o script SQL.\nMotivo: ${errorDetail}`;
        this.notifyListeners('error', msg);
        return {
          success: false,
          pushed: 0,
          pulled: totalPulled,
          message: msg,
          timestamp: now,
        };
      }

      const msg = `Sincronização concluída! (${totalPushed} enviados, ${totalPulled} recebidos)`;
      this.notifyListeners('success', msg);

      // Inicia Realtime se ainda não estiver ativo
      this.iniciarRealtime();

      return {
        success: true,
        pushed: totalPushed,
        pulled: totalPulled,
        message: msg,
        timestamp: now,
      };
    } catch (err: any) {
      console.warn('[CloudSync] Aviso durante sincronização:', err?.message || err);
      const errMsg = err?.message || 'Falha ao sincronizar com a nuvem.';
      this.notifyListeners('error', errMsg);
      return {
        success: false,
        pushed: totalPushed,
        pulled: totalPulled,
        message: errMsg,
        timestamp: now,
      };
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Conecta aos canais Realtime do Supabase para receber alterações instantâneas de pedidos, produtos e clientes
   */
  iniciarRealtime(): void {
    const supabase = SupabaseClientService.getClient();
    if (!supabase || activeChannel) return;

    try {
      const db = getDatabase();
      const tenantId = getTenantEmpresaId(db);

      activeChannel = supabase
        .channel(`agua-gestao-tenant-${tenantId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pedidos', filter: `empresaId=eq.${tenantId}` },
          (payload) => {
            console.log('[Realtime] Pedido recebido:', payload.eventType);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p: any = payload.new;
              if (p && p.id) {
                try {
                  db.runSync(
                    `INSERT INTO pedidos (id, empresaId, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
                       empresaId = excluded.empresaId,
                       numero = excluded.numero,
                       clienteId = excluded.clienteId,
                       clienteNome = excluded.clienteNome,
                       clienteTelefone = excluded.clienteTelefone,
                       clienteEndereco = excluded.clienteEndereco,
                       data = excluded.data,
                       valorTotal = excluded.valorTotal,
                       desconto = excluded.desconto,
                       acrescimo = excluded.acrescimo,
                       status = excluded.status,
                       formaPagamento = excluded.formaPagamento,
                       trocoPara = excluded.trocoPara,
                       observacoes = excluded.observacoes,
                       itensJson = excluded.itensJson;`,
                    [
                      p.id, p.empresaId || tenantId, p.numero, p.clienteId || null, p.clienteNome, p.clienteTelefone || null,
                      p.clienteEndereco || null, p.data, p.valorTotal, p.desconto ?? 0, p.acrescimo ?? 0,
                      p.status, p.formaPagamento, p.trocoPara ?? null, p.observacoes || null,
                      p.itensJson || '[]', p.createdAt || new Date().toISOString()
                    ]
                  );
                } catch (e) {
                  console.warn('Realtime pedido insert error:', e);
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'produtos', filter: `empresaId=eq.${tenantId}` },
          (payload) => {
            console.log('[Realtime] Produto recebido:', payload.eventType);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p: any = payload.new;
              if (p && p.id) {
                try {
                  db.runSync(
                    `INSERT INTO produtos (id, empresaId, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
                       empresaId = excluded.empresaId,
                       nome = excluded.nome,
                       categoria = excluded.categoria,
                       precoVenda = excluded.precoVenda,
                       custo = excluded.custo,
                       estoqueAtual = excluded.estoqueAtual,
                       unidade = excluded.unidade,
                       ativo = excluded.ativo;`,
                    [p.id, p.empresaId || tenantId, p.nome, p.categoria, p.precoVenda, p.custo ?? 0, p.estoqueAtual ?? 0, p.unidade ?? 'UN', p.ativo ?? 1, p.createdAt || new Date().toISOString()]
                  );
                } catch (e) {
                  console.warn('Realtime produto update error:', e);
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes', filter: `empresaId=eq.${tenantId}` },
          (payload) => {
            console.log('[Realtime] Cliente recebido:', payload.eventType);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const c: any = payload.new;
              if (c && c.id) {
                try {
                  db.runSync(
                    `INSERT INTO clientes (id, empresaId, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
                       empresaId = excluded.empresaId,
                       nome = excluded.nome,
                       cpfCnpj = excluded.cpfCnpj,
                       telefone = excluded.telefone,
                       whatsapp = excluded.whatsapp,
                       logradouro = excluded.logradouro,
                       numero = excluded.numero,
                       bairro = excluded.bairro,
                       cidade = excluded.cidade,
                       estado = excluded.estado,
                       pontoReferencia = excluded.pontoReferencia,
                       latitude = excluded.latitude,
                       longitude = excluded.longitude,
                       ativo = excluded.ativo,
                       precosEspeciaisJson = excluded.precosEspeciaisJson;`,
                    [
                      c.id, c.empresaId || tenantId, c.nome, c.cpfCnpj || null, c.telefone || null, c.whatsapp || null,
                      c.logradouro || null, c.numero || null, c.bairro || null, c.cidade || null, c.estado || null,
                      c.pontoReferencia || null, c.latitude ?? null, c.longitude ?? null, c.ativo ?? 1,
                      c.precosEspeciaisJson || null, c.createdAt || new Date().toISOString()
                    ]
                  );
                } catch (e) {
                  console.warn('Realtime cliente update error:', e);
                }
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Erro ao iniciar canal Realtime:', e);
    }
  },

  /**
   * Finaliza o canal Realtime (ex: ao deslogar ou fechar app)
   */
  pararRealtime(): void {
    if (activeChannel) {
      try {
        const supabase = SupabaseClientService.getClient();
        if (supabase) {
          supabase.removeChannel(activeChannel);
        }
      } catch (e) {
        console.warn('Erro ao remover canal Realtime:', e);
      }
      activeChannel = null;
    }
  },

  /**
   * Exclui todos os registros da empresa no Supabase (Conformidade LGPD & Google Play)
   */
  async excluirDadosNuvemEmpresa(empresaId?: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getClient();
      if (!supabase) return;
      const db = getDatabase();
      const targetEmpresaId = empresaId || getTenantEmpresaId(db);
      if (!targetEmpresaId || targetEmpresaId === 'local') return;

      const tabelas = [
        'quitacoes_fiado',
        'fiados',
        'pedidos',
        'movimentacoes_estoque',
        'estoque_garrafoes',
        'despesas',
        'clientes',
        'produtos',
        'configuracao',
      ];

      for (const tabela of tabelas) {
        try {
          await supabase.from(tabela).delete().eq('empresaId', targetEmpresaId);
        } catch (e) {
          console.warn(`Erro ao limpar tabela ${tabela} na nuvem:`, e);
        }
      }
    } catch (e) {
      console.warn('Erro ao excluir dados na nuvem:', e);
    }
  },

  /**
   * Salva as credenciais de login da conta no Supabase (dentro de public.configuracao com id = auth_user_<email>)
   * para permitir login e restauração completa mesmo após desinstalar o app ou trocar de celular.
   */
  async salvarContaNaNuvem(user: {
    id: string;
    nome: string;
    email: string;
    senha: string;
    empresaId: string;
    empresaNome: string;
    whatsapp?: string;
    cidade?: string;
    estado?: string;
  }): Promise<void> {
    try {
      const supabase = SupabaseClientService.getClient();
      if (!supabase) return;
      const emailNorm = user.email.toLowerCase().trim();
      const now = new Date().toISOString();

      const authRow = {
        id: `auth_user_${emailNorm}`,
        empresaId: user.empresaId,
        nomeDistribuidora: user.empresaNome || 'Minha Distribuidora',
        telefone: JSON.stringify({
          id: user.id,
          nome: user.nome,
          email: emailNorm,
          senha: user.senha,
          role: 'ADMIN',
          empresaId: user.empresaId,
          empresaNome: user.empresaNome || 'Minha Distribuidora',
        }),
        whatsapp: user.whatsapp || '',
        chavePix: '',
        cidade: user.cidade || '',
        estado: user.estado || 'PB',
        trialStartDate: now,
        isSubscribed: 0,
        plano: 'AUTH_USER',
        createdAt: now,
      };

      await supabase.from('configuracao').upsert([authRow], { onConflict: 'id' });
    } catch (e) {
      console.warn('Erro ao salvar conta na nuvem:', e);
    }
  },

  /**
   * Busca se já existe uma distribuidora na nuvem para este e-mail, WhatsApp ou nome
   */
  async buscarEmpresaExistenteNaNuvem(params: {
    email: string;
    whatsapp?: string;
    nomeDistribuidora?: string;
  }): Promise<{ empresaId: string; configRow?: any } | null> {
    try {
      const supabase = SupabaseClientService.getClient();
      if (!supabase) return null;
      const emailNorm = params.email.toLowerCase().trim();

      // 1. Verificar se já existe auth_user_<email>
      const { data: authRow } = await supabase
        .from('configuracao')
        .select('*')
        .eq('id', `auth_user_${emailNorm}`)
        .maybeSingle();

      if (authRow?.empresaId) {
        return { empresaId: authRow.empresaId, configRow: authRow };
      }

      // 2. Verificar se já existe distribuidora pelo WhatsApp ou Nome
      const { data: configs } = await supabase
        .from('configuracao')
        .select('*')
        .neq('plano', 'AUTH_USER')
        .order('createdAt', { ascending: false });

      if (configs && configs.length > 0) {
        const cleanPhone = (params.whatsapp || '').replace(/\D/g, '');
        const cleanName = (params.nomeDistribuidora || '').toLowerCase().trim();

        const match = configs.find((c: any) => {
          if (c.id?.startsWith('auth_user_')) return false;
          const cPhone = String(c.whatsapp || '').replace(/\D/g, '');
          const cName = String(c.nomeDistribuidora || '').toLowerCase().trim();
          if (cleanPhone && cleanPhone.length >= 8 && cPhone === cleanPhone && cPhone !== '11999999999') {
            return true;
          }
          if (cleanName && cName === cleanName && cName !== 'água & gás modelo') {
            return true;
          }
          return false;
        });

        if (match?.empresaId) {
          return { empresaId: match.empresaId, configRow: match };
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar empresa existente na nuvem:', e);
    }
    return null;
  },

  /**
   * Autentica o usuário consultando o Supabase quando o banco local foi limpo ou o app foi reinstalado,
   * e restaura automaticamente todos os dados da distribuidora.
   */
  async autenticarContaNaNuvem(
    email: string,
    pass: string
  ): Promise<{
    success: boolean;
    wrongPassword?: boolean;
    user?: any;
  }> {
    try {
      const supabase = SupabaseClientService.getClient();
      if (!supabase) return { success: false };

      const emailNorm = email.toLowerCase().trim();
      const db = getDatabase();
      const now = new Date().toISOString();

      // 1. Buscar registro de autenticação direto (auth_user_<email>)
      const { data: authRow } = await supabase
        .from('configuracao')
        .select('*')
        .eq('id', `auth_user_${emailNorm}`)
        .maybeSingle();

      let targetEmpresaId: string | null = null;
      let userData: any = null;
      let distConfig: any = null;

      if (authRow) {
        try {
          const parsed = JSON.parse(authRow.telefone || '{}');
          if (parsed.senha && parsed.senha !== pass) {
            return { success: false, wrongPassword: true };
          }
          targetEmpresaId = authRow.empresaId || parsed.empresaId;
          userData = {
            id: parsed.id || 'usr-' + Date.now().toString(36),
            nome: parsed.nome || authRow.nomeDistribuidora || 'Administrador',
            email: emailNorm,
            senha: pass,
            empresaId: targetEmpresaId,
            empresaNome: parsed.empresaNome || authRow.nomeDistribuidora || 'Minha Distribuidora',
          };
        } catch {}
      }

      // 2. Recuperação automática para contas criadas antes do vínculo auth_user_ (ex: Arthur distribuidora)
      if (!targetEmpresaId) {
        const { data: allConfigs } = await supabase
          .from('configuracao')
          .select('*')
          .order('createdAt', { ascending: false });

        const distRows = (allConfigs || []).filter(
          (c: any) => !String(c.id || '').startsWith('auth_user_') && c.plano !== 'AUTH_USER'
        );
        const authRows = (allConfigs || []).filter(
          (c: any) => String(c.id || '').startsWith('auth_user_') || c.plano === 'AUTH_USER'
        );

        const emailPrefix = emailNorm.split('@')[0].replace(/[^a-z0-9]/g, '');

        const matchedDist = distRows.find((c: any) => {
          const distNameNorm = String(c.nomeDistribuidora || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          // Se o e-mail contém o nome da distribuidora (ex: arthur -> arthurdistribuidora)
          if (emailPrefix.length >= 4 && (distNameNorm.includes(emailPrefix) || emailPrefix.includes(distNameNorm))) {
            // Verifica se essa empresa ainda não está vinculada a outro e-mail diferente
            const boundOther = authRows.find(
              (a: any) => a.empresaId === c.empresaId && a.id !== `auth_user_${emailNorm}`
            );
            return !boundOther;
          }
          return false;
        });

        if (matchedDist?.empresaId) {
          targetEmpresaId = matchedDist.empresaId;
          distConfig = matchedDist;
          userData = {
            id: 'usr-' + Math.random().toString(36).slice(2, 9),
            nome: matchedDist.nomeDistribuidora.split(' ')[0] || 'Administrador',
            email: emailNorm,
            senha: pass,
            empresaId: targetEmpresaId,
            empresaNome: matchedDist.nomeDistribuidora,
          };

          // Salva o vínculo auth_user_<email> na nuvem para os próximos logins
          await this.salvarContaNaNuvem({
            ...userData,
            whatsapp: matchedDist.whatsapp,
            cidade: matchedDist.cidade,
            estado: matchedDist.estado,
          });
        }
      }

      if (!targetEmpresaId || !userData) {
        return { success: false };
      }

      // 3. Buscar dados da distribuidora se ainda não carregados
      if (!distConfig) {
        const { data: cfgRows } = await supabase
          .from('configuracao')
          .select('*')
          .eq('empresaId', targetEmpresaId);
        distConfig = (cfgRows || []).find(
          (c: any) => !String(c.id || '').startsWith('auth_user_') && c.plano !== 'AUTH_USER'
        );
      }

      // 4. Restaurar configuração local e usuário local no SQLite
      db.runSync('DELETE FROM configuracao;');
      db.runSync(
        `INSERT INTO configuracao (id, empresaId, nomeDistribuidora, telefone, whatsapp, chavePix, cidade, estado, trialStartDate, isSubscribed, plano, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          distConfig?.id || 'cfg-' + targetEmpresaId,
          targetEmpresaId,
          distConfig?.nomeDistribuidora || userData.empresaNome || 'Minha Distribuidora',
          distConfig?.telefone || '',
          distConfig?.whatsapp || '',
          distConfig?.chavePix || '',
          distConfig?.cidade || '',
          distConfig?.estado || 'PB',
          distConfig?.trialStartDate || now,
          distConfig?.isSubscribed ?? 0,
          distConfig?.plano || 'TRIAL_14_DIAS',
          distConfig?.createdAt || now,
        ]
      );

      db.runSync(
        `INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, empresaId, empresaNome, ativo, createdAt)
         VALUES (?, ?, ?, ?, 'ADMIN', ?, ?, 1, ?)`,
        [
          userData.id,
          userData.nome,
          emailNorm,
          pass,
          targetEmpresaId,
          distConfig?.nomeDistribuidora || userData.empresaNome,
          now,
        ]
      );

      // 5. Baixar todos os dados da distribuidora da nuvem antes de qualquer push
      await this.pullEmpresaDaNuvem(targetEmpresaId);

      return {
        success: true,
        user: {
          id: userData.id,
          empresaId: targetEmpresaId,
          nome: userData.nome,
          email: emailNorm,
          role: 'EMPRESA_ADMIN',
          ativo: true,
          empresa: {
            id: targetEmpresaId,
            nome: distConfig?.nomeDistribuidora || userData.empresaNome,
            cidade: distConfig?.cidade,
            estado: distConfig?.estado,
            ativo: true,
            createdAt: now,
            updatedAt: now,
          },
          createdAt: now,
          updatedAt: now,
        },
      };
    } catch (e) {
      console.warn('Erro ao autenticar conta na nuvem:', e);
      return { success: false };
    }
  },

  /**
   * Limpa dados temporários de outro tenant local e baixa todos os registros da empresa no Supabase
   */
  async pullEmpresaDaNuvem(empresaId: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getClient();
      if (!supabase || !empresaId) return;
      const db = getDatabase();
      const now = new Date().toISOString();

      // Remove produtos padrão vazios ou registros de outra empresa local
      const tabelasLocais = [
        'produtos',
        'clientes',
        'pedidos',
        'fiados',
        'despesas',
        'estoque_garrafoes',
        'movimentacoes_estoque',
        'quitacoes_fiado',
      ];
      for (const tab of tabelasLocais) {
        try {
          db.runSync(`DELETE FROM ${tab} WHERE empresaId IS NULL OR empresaId != ?`, [empresaId]);
        } catch {}
      }

      // 1. Produtos
      const { data: cloudProdutos } = await supabase.from('produtos').select('*').eq('empresaId', empresaId);
      if (cloudProdutos) {
        for (const p of cloudProdutos) {
          db.runSync(
            `INSERT OR REPLACE INTO produtos (id, empresaId, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, empresaId, p.nome, p.categoria, p.precoVenda, p.custo ?? 0, p.estoqueAtual ?? 0, p.unidade ?? 'UN', p.ativo ?? 1, p.createdAt || now]
          );
        }
      }

      // 2. Clientes
      const { data: cloudClientes } = await supabase.from('clientes').select('*').eq('empresaId', empresaId);
      if (cloudClientes) {
        for (const c of cloudClientes) {
          db.runSync(
            `INSERT OR REPLACE INTO clientes (id, empresaId, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id, empresaId, c.nome, c.cpfCnpj || null, c.telefone || null, c.whatsapp || null,
              c.logradouro || null, c.numero || null, c.bairro || null, c.cidade || null, c.estado || null,
              c.pontoReferencia || null, c.latitude ?? null, c.longitude ?? null, c.ativo ?? 1,
              c.precosEspeciaisJson || null, c.createdAt || now,
            ]
          );
        }
      }

      // 3. Pedidos
      const { data: cloudPedidos } = await supabase.from('pedidos').select('*').eq('empresaId', empresaId);
      if (cloudPedidos) {
        for (const p of cloudPedidos) {
          db.runSync(
            `INSERT OR REPLACE INTO pedidos (id, empresaId, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id, empresaId, p.numero, p.clienteId || null, p.clienteNome, p.clienteTelefone || null,
              p.clienteEndereco || null, p.data, p.valorTotal, p.desconto ?? 0, p.acrescimo ?? 0,
              p.status, p.formaPagamento, p.trocoPara ?? null, p.observacoes || null,
              p.itensJson || '[]', p.createdAt || now,
            ]
          );
        }
      }

      // 4. Fiados
      const { data: cloudFiados } = await supabase.from('fiados').select('*').eq('empresaId', empresaId);
      if (cloudFiados) {
        for (const f of cloudFiados) {
          db.runSync(
            `INSERT OR REPLACE INTO fiados (id, empresaId, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              f.id, empresaId, f.clienteId, f.clienteNome, f.pedidoId || null, f.pedidoNumero || null,
              f.valorOriginal, f.valorPago ?? 0, f.saldo, f.situacao, f.createdAt || now, f.updatedAt || now,
            ]
          );
        }
      }

      // 5. Despesas
      const { data: cloudDespesas } = await supabase.from('despesas').select('*').eq('empresaId', empresaId);
      if (cloudDespesas) {
        for (const d of cloudDespesas) {
          db.runSync(
            `INSERT OR REPLACE INTO despesas (id, empresaId, descricao, categoria, valor, data, formaPagamento, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.id, empresaId, d.descricao, d.categoria, d.valor, d.data, d.formaPagamento, d.createdAt || now]
          );
        }
      }

      // 6. Estoque Garrafões
      const { data: cloudGarrafoes } = await supabase.from('estoque_garrafoes').select('*').eq('empresaId', empresaId);
      if (cloudGarrafoes) {
        for (const g of cloudGarrafoes) {
          db.runSync(
            `INSERT OR REPLACE INTO estoque_garrafoes (id, empresaId, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [g.id, empresaId, g.anoFabricacao, g.anoValidade, g.quantidade, g.status, g.observacoes || null, g.createdAt || now]
          );
        }
      }

      // 7. Quitações de Fiados
      const { data: cloudQuitacoes } = await supabase.from('quitacoes_fiado').select('*').eq('empresaId', empresaId);
      if (cloudQuitacoes) {
        for (const q of cloudQuitacoes) {
          db.runSync(
            `INSERT OR REPLACE INTO quitacoes_fiado (id, empresaId, fiadoId, pedidoId, clienteId, clienteNome, valor, formaPagamento, data, observacoes, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [q.id, empresaId, q.fiadoId, q.pedidoId || null, q.clienteId || 'balcao', q.clienteNome || 'Cliente', q.valor, q.formaPagamento, q.data, q.observacoes || null, q.createdAt || q.data || now]
          );
        }
      }

      // 8. Movimentações de Estoque
      const { data: cloudMovs } = await supabase.from('movimentacoes_estoque').select('*').eq('empresaId', empresaId);
      if (cloudMovs) {
        for (const m of cloudMovs) {
          db.runSync(
            `INSERT OR REPLACE INTO movimentacoes_estoque (id, empresaId, produtoId, produtoNome, tipo, quantidade, motivo, data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [m.id, empresaId, m.produtoId || null, m.produtoNome || 'Água Mineral', m.tipo || 'AJUSTE', m.quantidade ?? 0, m.motivo || null, m.data || now]
          );
        }
      }

      SupabaseClientService.updateLastSyncTime(now);
      this.iniciarRealtime();
    } catch (e) {
      console.warn('Erro ao puxar dados da empresa da nuvem:', e);
    }
  },
};
