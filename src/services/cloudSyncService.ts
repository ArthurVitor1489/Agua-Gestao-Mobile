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
    const now = new Date().toISOString();
    const db = getDatabase();

    try {
      // ---------------------------------------------------------
      // 1. PUSH: Enviar dados locais para o Supabase
      // ---------------------------------------------------------
      this.notifyListeners('syncing', 'Enviando dados locais para a nuvem...');

      // 1.1 Configuração
      try {
        const configs = db.getAllSync<any>('SELECT * FROM configuracao');
        if (configs.length > 0) {
          const { error } = await supabase.from('configuracao').upsert(configs, { onConflict: 'id' });
          if (!error) totalPushed += configs.length;
        }
      } catch (err) {
        console.warn('Sync push configuracao:', err);
      }

      // 1.2 Produtos
      try {
        const produtos = db.getAllSync<any>('SELECT * FROM produtos');
        if (produtos.length > 0) {
          const { error } = await supabase.from('produtos').upsert(produtos, { onConflict: 'id' });
          if (!error) totalPushed += produtos.length;
        }
      } catch (err) {
        console.warn('Sync push produtos:', err);
      }

      // 1.3 Estoque Garrafões
      try {
        const garrafoes = db.getAllSync<any>('SELECT * FROM estoque_garrafoes');
        if (garrafoes.length > 0) {
          const { error } = await supabase.from('estoque_garrafoes').upsert(garrafoes, { onConflict: 'id' });
          if (!error) totalPushed += garrafoes.length;
        }
      } catch (err) {
        console.warn('Sync push estoque_garrafoes:', err);
      }

      // 1.4 Clientes
      try {
        const clientes = db.getAllSync<any>('SELECT * FROM clientes');
        if (clientes.length > 0) {
          const { error } = await supabase.from('clientes').upsert(clientes, { onConflict: 'id' });
          if (!error) totalPushed += clientes.length;
        }
      } catch (err) {
        console.warn('Sync push clientes:', err);
      }

      // 1.5 Pedidos
      try {
        const pedidos = db.getAllSync<any>('SELECT * FROM pedidos');
        if (pedidos.length > 0) {
          const { error } = await supabase.from('pedidos').upsert(pedidos, { onConflict: 'id' });
          if (!error) totalPushed += pedidos.length;
        }
      } catch (err) {
        console.warn('Sync push pedidos:', err);
      }

      // 1.6 Fiados
      try {
        const fiados = db.getAllSync<any>('SELECT * FROM fiados');
        if (fiados.length > 0) {
          const { error } = await supabase.from('fiados').upsert(fiados, { onConflict: 'id' });
          if (!error) totalPushed += fiados.length;
        }
      } catch (err) {
        console.warn('Sync push fiados:', err);
      }

      // 1.7 Despesas
      try {
        const despesas = db.getAllSync<any>('SELECT * FROM despesas');
        if (despesas.length > 0) {
          const { error } = await supabase.from('despesas').upsert(despesas, { onConflict: 'id' });
          if (!error) totalPushed += despesas.length;
        }
      } catch (err) {
        console.warn('Sync push despesas:', err);
      }

      // 1.8 Movimentações de Estoque
      try {
        const movs = db.getAllSync<any>('SELECT * FROM movimentacoes_estoque');
        if (movs.length > 0) {
          const { error } = await supabase.from('movimentacoes_estoque').upsert(movs, { onConflict: 'id' });
          if (!error) totalPushed += movs.length;
        }
      } catch (err) {
        console.warn('Sync push movimentacoes_estoque:', err);
      }

      // ---------------------------------------------------------
      // 2. PULL: Baixar dados atualizados da Nuvem para o SQLite
      // ---------------------------------------------------------
      this.notifyListeners('syncing', 'Recebendo dados da nuvem...');

      // 2.1 Produtos da Nuvem
      try {
        const { data: cloudProdutos, error: pErr } = await supabase.from('produtos').select('*');
        if (!pErr && cloudProdutos && cloudProdutos.length > 0) {
          for (const p of cloudProdutos) {
            db.runSync(
              `INSERT INTO produtos (id, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 nome = excluded.nome,
                 categoria = excluded.categoria,
                 precoVenda = excluded.precoVenda,
                 custo = excluded.custo,
                 estoqueAtual = excluded.estoqueAtual,
                 unidade = excluded.unidade,
                 ativo = excluded.ativo;`,
              [p.id, p.nome, p.categoria, p.precoVenda, p.custo ?? 0, p.estoqueAtual ?? 0, p.unidade ?? 'UN', p.ativo ?? 1, p.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull produtos:', err);
      }

      // 2.2 Clientes da Nuvem
      try {
        const { data: cloudClientes, error: cErr } = await supabase.from('clientes').select('*');
        if (!cErr && cloudClientes && cloudClientes.length > 0) {
          for (const c of cloudClientes) {
            db.runSync(
              `INSERT INTO clientes (id, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
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
                c.id, c.nome, c.cpfCnpj || null, c.telefone || null, c.whatsapp || null,
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
        const { data: cloudPedidos, error: pedErr } = await supabase.from('pedidos').select('*');
        if (!pedErr && cloudPedidos && cloudPedidos.length > 0) {
          for (const p of cloudPedidos) {
            db.runSync(
              `INSERT INTO pedidos (id, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
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
                p.id, p.numero, p.clienteId || null, p.clienteNome, p.clienteTelefone || null,
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
        const { data: cloudFiados, error: fErr } = await supabase.from('fiados').select('*');
        if (!fErr && cloudFiados && cloudFiados.length > 0) {
          for (const f of cloudFiados) {
            db.runSync(
              `INSERT INTO fiados (id, clienteId, clienteNome, pedidoId, pedidoNumero, valorOriginal, valorPago, saldo, situacao, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
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
                f.id, f.clienteId, f.clienteNome, f.pedidoId || null, f.pedidoNumero || null,
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
        const { data: cloudDespesas, error: dErr } = await supabase.from('despesas').select('*');
        if (!dErr && cloudDespesas && cloudDespesas.length > 0) {
          for (const d of cloudDespesas) {
            db.runSync(
              `INSERT INTO despesas (id, descricao, categoria, valor, data, formaPagamento, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 descricao = excluded.descricao,
                 categoria = excluded.categoria,
                 valor = excluded.valor,
                 data = excluded.data,
                 formaPagamento = excluded.formaPagamento;`,
              [d.id, d.descricao, d.categoria, d.valor, d.data, d.formaPagamento, d.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull despesas:', err);
      }

      // 2.6 Estoque Garrafões da Nuvem
      try {
        const { data: cloudGarrafoes, error: gErr } = await supabase.from('estoque_garrafoes').select('*');
        if (!gErr && cloudGarrafoes && cloudGarrafoes.length > 0) {
          for (const g of cloudGarrafoes) {
            db.runSync(
              `INSERT INTO estoque_garrafoes (id, anoFabricacao, anoValidade, quantidade, status, observacoes, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 anoFabricacao = excluded.anoFabricacao,
                 anoValidade = excluded.anoValidade,
                 quantidade = excluded.quantidade,
                 status = excluded.status,
                 observacoes = excluded.observacoes;`,
              [g.id, g.anoFabricacao, g.anoValidade, g.quantidade, g.status, g.observacoes || null, g.createdAt || now]
            );
            totalPulled++;
          }
        }
      } catch (err) {
        console.warn('Sync pull estoque_garrafoes:', err);
      }

      // Atualiza timestamp da sincronização
      SupabaseClientService.updateLastSyncTime(now);

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
      activeChannel = supabase
        .channel('agua-gestao-realtime-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pedidos' },
          (payload) => {
            console.log('[Realtime] Pedido recebido:', payload.eventType);
            const db = getDatabase();
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p: any = payload.new;
              if (p && p.id) {
                try {
                  db.runSync(
                    `INSERT INTO pedidos (id, numero, clienteId, clienteNome, clienteTelefone, clienteEndereco, data, valorTotal, desconto, acrescimo, status, formaPagamento, trocoPara, observacoes, itensJson, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
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
                      p.id, p.numero, p.clienteId || null, p.clienteNome, p.clienteTelefone || null,
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
          { event: '*', schema: 'public', table: 'produtos' },
          (payload) => {
            console.log('[Realtime] Produto recebido:', payload.eventType);
            const db = getDatabase();
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p: any = payload.new;
              if (p && p.id) {
                try {
                  db.runSync(
                    `INSERT INTO produtos (id, nome, categoria, precoVenda, custo, estoqueAtual, unidade, ativo, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
                       nome = excluded.nome,
                       categoria = excluded.categoria,
                       precoVenda = excluded.precoVenda,
                       custo = excluded.custo,
                       estoqueAtual = excluded.estoqueAtual,
                       unidade = excluded.unidade,
                       ativo = excluded.ativo;`,
                    [p.id, p.nome, p.categoria, p.precoVenda, p.custo ?? 0, p.estoqueAtual ?? 0, p.unidade ?? 'UN', p.ativo ?? 1, p.createdAt || new Date().toISOString()]
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
          { event: '*', schema: 'public', table: 'clientes' },
          (payload) => {
            console.log('[Realtime] Cliente recebido:', payload.eventType);
            const db = getDatabase();
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const c: any = payload.new;
              if (c && c.id) {
                try {
                  db.runSync(
                    `INSERT INTO clientes (id, nome, cpfCnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, pontoReferencia, latitude, longitude, ativo, precosEspeciaisJson, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
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
                      c.id, c.nome, c.cpfCnpj || null, c.telefone || null, c.whatsapp || null,
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
};
