import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { SyncQueue } from '../database/syncQueue';
import { Pedido, StatusPedido, FormaPagamento } from '../database/models';

export interface NovoPedidoPayload {
  clienteId: string;
  itens: {
    produtoId: string;
    quantidade: number;
    valorUnitario?: number;
    desconto?: number;
  }[];
  desconto?: number;
  acrescimo?: number;
  observacoes?: string;
  formaPagamento?: FormaPagamento | string;
  data?: string;
}

export interface PagamentoPayload {
  formaPagamento?: FormaPagamento;
  pagamentosMultiplos?: {
    forma: FormaPagamento;
    valor: number;
  }[];
  numeroBoleto?: string;
  quantidadeParcelas?: number;
  observacoes?: string;
}

export const PedidosApi = {
  async getPedidos(status?: StatusPedido, search?: string): Promise<Pedido[]> {
    try {
      const response = await apiClient.get('/pedidos', {
        params: { status, search },
      });
      const pedidos: Pedido[] = response.data;
      await LocalStorage.setPedidos(pedidos);
      return pedidos;
    } catch (error) {
      console.warn('Erro ao buscar pedidos online, recuperando cache offline...', error);
      let local = await LocalStorage.getPedidos();
      if (status) {
        local = local.filter((p) => p.status === status);
      }
      if (search) {
        const query = search.toLowerCase();
        local = local.filter(
          (p) =>
            p.numero.toString().includes(query) ||
            p.cliente?.nome.toLowerCase().includes(query) ||
            p.cliente?.telefone?.includes(query)
        );
      }
      return local;
    }
  },

  async criarPedido(payload: NovoPedidoPayload): Promise<Pedido> {
    try {
      const response = await apiClient.post('/pedidos', payload);
      const novoPedido: Pedido = response.data;
      await LocalStorage.saveLocalPedido(novoPedido);
      return novoPedido;
    } catch (error: any) {
      console.warn('Sem conexão: criando pedido em modo Offline...', error);

      // Gerar pedido local otimista
      const clientes = await LocalStorage.getClientes();
      const cliente = clientes.find((c) => c.id === payload.clienteId);
      const produtos = await LocalStorage.getProdutos();

      const subtotal = payload.itens.reduce((acc, item) => {
        const prod = produtos.find((p) => p.id === item.produtoId);
        const preco = item.valorUnitario !== undefined ? item.valorUnitario : prod?.precoVenda || 0;
        return acc + (preco * item.quantidade - (item.desconto || 0));
      }, 0);

      const total = subtotal - (payload.desconto || 0) + (payload.acrescimo || 0);
      const localId = `offline_ped_${Date.now()}`;
      const numeroTemp = Math.floor(1000 + Math.random() * 9000);

      const pedidoLocal: Pedido = {
        id: localId,
        empresaId: cliente?.empresaId || '',
        numero: numeroTemp,
        clienteId: payload.clienteId,
        cliente,
        data: payload.data || new Date().toISOString(),
        status: 'PENDENTE',
        formaPagamento: payload.formaPagamento || 'DINHEIRO',
        subtotal,
        desconto: payload.desconto || 0,
        acrescimo: payload.acrescimo || 0,
        total,
        observacoes: payload.observacoes || null,
        itens: payload.itens.map((i) => {
          const prod = produtos.find((p) => p.id === i.produtoId);
          return {
            produtoId: i.produtoId,
            produto: prod,
            quantidade: i.quantidade,
            valorUnitario: i.valorUnitario !== undefined ? i.valorUnitario : prod?.precoVenda || 0,
            desconto: i.desconto || 0,
            total: (i.valorUnitario || prod?.precoVenda || 0) * i.quantidade - (i.desconto || 0),
          };
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offlineCreated: true,
      };

      await LocalStorage.saveLocalPedido(pedidoLocal);

      // Enfileirar na fila de sincronização
      await SyncQueue.addToQueue({
        endpoint: '/pedidos',
        method: 'POST',
        payload,
        descricaoOperacao: `Novo Pedido #${numeroTemp} - ${cliente?.nome || 'Cliente'}`,
      });

      return pedidoLocal;
    }
  },

  async atualizarStatus(id: string, status: StatusPedido): Promise<void> {
    try {
      await apiClient.put(`/pedidos/${id}/status`, { status });
      await LocalStorage.updateLocalPedidoStatus(id, status);
    } catch (error) {
      console.warn('Erro ao atualizar status online, salvando na fila offline...', error);
      await LocalStorage.updateLocalPedidoStatus(id, status);
      await SyncQueue.addToQueue({
        endpoint: `/pedidos/${id}/status`,
        method: 'PUT',
        payload: { status },
        descricaoOperacao: `Atualização de Status para ${status} (Pedido: ${id})`,
      });
    }
  },

  async registrarPagamento(id: string, payload: PagamentoPayload): Promise<void> {
    try {
      await apiClient.post(`/pedidos/${id}/pagamento`, payload);
    } catch (error) {
      console.warn('Erro ao registrar pagamento online, enfileirando...', error);
      await SyncQueue.addToQueue({
        endpoint: `/pedidos/${id}/pagamento`,
        method: 'POST',
        payload,
        descricaoOperacao: `Registro de Pagamento (Pedido: ${id})`,
      });
    }
  },
};
