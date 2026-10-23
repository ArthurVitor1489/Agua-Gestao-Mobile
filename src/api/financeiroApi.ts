import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { SyncQueue } from '../database/syncQueue';
import { Fiado, Despesa, FormaPagamento, CategoriaDespesa } from '../database/models';

export interface ResumoFinanceiro {
  totalRecebido: number;
  totalFiadosAbertos: number;
  totalDespesas: number;
  saldoLiquido: number;
  porForma: {
    forma: string;
    valor: number;
  }[];
}

export interface NovaDespesaPayload {
  categoria: CategoriaDespesa;
  descricao: string;
  valor: number;
  data?: string;
  formaPagamento?: FormaPagamento;
  status?: 'PAGA' | 'PENDENTE';
  observacoes?: string;
}

export const FinanceiroApi = {
  async getFiados(situacao?: string, search?: string): Promise<{ fiados: Fiado[]; totalEmAberto: number }> {
    try {
      const response = await apiClient.get('/financeiro/fiados', {
        params: { situacao, search },
      });
      const data = response.data;
      await LocalStorage.setFiados(data.fiados || []);
      return {
        fiados: data.fiados || [],
        totalEmAberto: data.resumo?.totalEmAberto || 0,
      };
    } catch (error) {
      console.warn('Erro ao obter fiados online, usando cache...', error);
      let fiados = await LocalStorage.getFiados();
      if (situacao) {
        fiados = fiados.filter((f) => f.situacao === situacao);
      }
      if (search) {
        const q = search.toLowerCase();
        fiados = fiados.filter((f) => f.cliente?.nome.toLowerCase().includes(q));
      }
      const totalEmAberto = fiados.filter((f) => f.saldo > 0).reduce((acc, f) => acc + f.saldo, 0);
      return { fiados, totalEmAberto };
    }
  },

  async pagarFiado(
    fiadoId: string,
    valorPago: number,
    formaPagamento: FormaPagamento = 'PIX',
    observacoes?: string
  ): Promise<void> {
    try {
      await apiClient.post(`/financeiro/fiados/${fiadoId}/pagar`, {
        valorPago,
        formaPagamento,
        observacoes,
      });
    } catch (error) {
      console.warn('Erro ao pagar fiado online, enfileirando...', error);
      await SyncQueue.addToQueue({
        endpoint: `/financeiro/fiados/${fiadoId}/pagar`,
        method: 'POST',
        payload: { valorPago, formaPagamento, observacoes },
        descricaoOperacao: `Quitação Parcial de Fiado (R$ ${valorPago.toFixed(2)})`,
      });
    }
  },

  async getDespesas(): Promise<{ despesas: Despesa[]; totalPagas: number }> {
    try {
      const response = await apiClient.get('/financeiro/despesas');
      const data = response.data;
      await LocalStorage.setDespesas(data.despesas || []);
      return {
        despesas: data.despesas || [],
        totalPagas: data.resumo?.totalPagas || 0,
      };
    } catch (error) {
      console.warn('Erro ao obter despesas online, usando cache...', error);
      const despesas = await LocalStorage.getDespesas();
      const totalPagas = despesas.filter((d) => d.status === 'PAGA').reduce((acc, d) => acc + d.valor, 0);
      return { despesas, totalPagas };
    }
  },

  async criarDespesa(payload: NovaDespesaPayload): Promise<Despesa> {
    try {
      const response = await apiClient.post('/financeiro/despesas', payload);
      return response.data;
    } catch (error) {
      console.warn('Erro ao criar despesa online, salvando offline...', error);
      const user = await LocalStorage.getUser();
      const localDespesa: Despesa = {
        id: `offline_desp_${Date.now()}`,
        empresaId: user?.empresaId || '',
        categoria: payload.categoria,
        descricao: payload.descricao,
        valor: payload.valor,
        data: payload.data || new Date().toISOString(),
        formaPagamento: payload.formaPagamento || 'PIX',
        status: payload.status || 'PAGA',
        observacoes: payload.observacoes || null,
        createdAt: new Date().toISOString(),
      };

      const current = await LocalStorage.getDespesas();
      await LocalStorage.setDespesas([localDespesa, ...current]);

      await SyncQueue.addToQueue({
        endpoint: '/financeiro/despesas',
        method: 'POST',
        payload,
        descricaoOperacao: `Despesa: ${payload.descricao} (R$ ${payload.valor.toFixed(2)})`,
      });

      return localDespesa;
    }
  },
};
