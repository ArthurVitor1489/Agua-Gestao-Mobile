import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { SyncQueue } from '../database/syncQueue';
import { EstoqueGarrafao, Produto, MovimentacaoEstoque, StatusGarrafao } from '../database/models';

export interface CargaEnvasePayload {
  itens: {
    produtoId: string;
    quantidade: number;
  }[];
  motivo?: string;
  atualizarGarrafoes?: boolean;
}

export interface MovimentarGarrafaoPayload {
  origemId: string;
  statusDestino: StatusGarrafao;
  quantidade: number;
  motivo?: string;
  produtoId?: string;
  tipoMovimentacao?: string;
}

export const EstoqueApi = {
  async getGarrafoes(): Promise<EstoqueGarrafao[]> {
    try {
      const response = await apiClient.get('/estoque/garrafoes');
      const garrafoes: EstoqueGarrafao[] = response.data;
      await LocalStorage.setGarrafoes(garrafoes);
      return garrafoes;
    } catch (error) {
      console.warn('Erro ao obter garrafões online, usando cache...', error);
      return await LocalStorage.getGarrafoes();
    }
  },

  async getProdutos(): Promise<Produto[]> {
    try {
      const response = await apiClient.get('/produtos');
      const produtos: Produto[] = response.data;
      await LocalStorage.setProdutos(produtos);
      return produtos;
    } catch (error) {
      console.warn('Erro ao obter produtos online, usando cache...', error);
      return await LocalStorage.getProdutos();
    }
  },

  async lancarEnvaseFabrica(payload: CargaEnvasePayload): Promise<any> {
    try {
      const response = await apiClient.post('/estoque/envase-lote', payload);
      return response.data;
    } catch (error) {
      console.warn('Erro ao lançar envase online, enfileirando...', error);
      await SyncQueue.addToQueue({
        endpoint: '/estoque/envase-lote',
        method: 'POST',
        payload,
        descricaoOperacao: `Chegada de Carga da Fábrica (${payload.itens.length} itens)`,
      });
      return { success: true, offline: true };
    }
  },

  async movimentarGarrafoes(payload: MovimentarGarrafaoPayload): Promise<any> {
    try {
      const response = await apiClient.put('/estoque/garrafoes', payload);
      return response.data;
    } catch (error) {
      console.warn('Erro ao movimentar garrafões online, enfileirando...', error);
      await SyncQueue.addToQueue({
        endpoint: '/estoque/garrafoes',
        method: 'PUT',
        payload,
        descricaoOperacao: `Movimentação de Vasilhames: ${payload.quantidade} un para ${payload.statusDestino}`,
      });
      return { success: true, offline: true };
    }
  },

  async getMovimentacoes(): Promise<MovimentacaoEstoque[]> {
    try {
      const response = await apiClient.get('/estoque/movimentacoes');
      return response.data;
    } catch (error) {
      console.warn('Erro ao obter movimentações online', error);
      return [];
    }
  },
};
