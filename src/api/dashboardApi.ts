import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { DashboardData } from '../database/models';

export const DashboardApi = {
  async getDashboard(periodo: 'hoje' | '7dias' | 'mes' | 'ano' = 'hoje'): Promise<DashboardData> {
    try {
      const response = await apiClient.get('/dashboard', {
        params: { periodo },
      });
      const data: DashboardData = response.data;
      await LocalStorage.setDashboard(data);
      return data;
    } catch (error) {
      console.warn('Falha ao obter dashboard online, buscando cache local...', error);
      const cached = await LocalStorage.getDashboard();
      if (cached) return cached;

      // Retorno padrão vazio caso não tenha cache
      return {
        periodo,
        faturamento: 0,
        recebido: 0,
        emAberto: 0,
        despesas: 0,
        resultado: 0,
        pedidosRealizados: 0,
        pedidosPendentes: 0,
        garrafoesCheios: 0,
        garrafoesVazios: 0,
        garrafoesDanificados: 0,
        garrafoesVencidos: 0,
        recebimentoPorForma: [],
        pedidosPorStatus: [],
      };
    }
  },
};
