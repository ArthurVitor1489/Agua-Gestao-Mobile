import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { SyncQueue } from '../database/syncQueue';
import { Cliente, RecompraOportunidade } from '../database/models';

export interface NovoClientePayload {
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pontoReferencia?: string;
  observacoes?: string;
  latitude?: number;
  longitude?: number;
  precosEspeciais?: {
    produtoId: string;
    preco: number;
  }[];
}

export const ClientesApi = {
  async getClientes(search?: string): Promise<Cliente[]> {
    try {
      const response = await apiClient.get('/clientes', {
        params: { search },
      });
      const clientes: Cliente[] = response.data;
      await LocalStorage.setClientes(clientes);
      return clientes;
    } catch (error) {
      console.warn('Erro ao obter clientes online, buscando do cache...', error);
      let list = await LocalStorage.getClientes();
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            c.telefone?.includes(q) ||
            c.whatsapp?.includes(q) ||
            c.logradouro?.toLowerCase().includes(q)
        );
      }
      return list;
    }
  },

  async criarCliente(payload: NovoClientePayload): Promise<Cliente> {
    try {
      const response = await apiClient.post('/clientes', payload);
      const novoCliente: Cliente = response.data;
      await LocalStorage.saveLocalCliente(novoCliente);
      return novoCliente;
    } catch (error) {
      console.warn('Erro ao criar cliente online, criando localmente...', error);
      const user = await LocalStorage.getUser();
      const localCliente: Cliente = {
        id: `offline_cli_${Date.now()}`,
        empresaId: user?.empresaId || '',
        nome: payload.nome,
        cpfCnpj: payload.cpfCnpj || null,
        telefone: payload.telefone || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        cep: payload.cep || null,
        logradouro: payload.logradouro || null,
        numero: payload.numero || null,
        complemento: payload.complemento || null,
        bairro: payload.bairro || null,
        cidade: payload.cidade || null,
        estado: payload.estado || 'PB',
        pontoReferencia: payload.pontoReferencia || null,
        observacoes: payload.observacoes || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        ativo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await LocalStorage.saveLocalCliente(localCliente);

      await SyncQueue.addToQueue({
        endpoint: '/clientes',
        method: 'POST',
        payload,
        descricaoOperacao: `Novo Cliente: ${payload.nome}`,
      });

      return localCliente;
    }
  },

  async getRecompraOportunidades(): Promise<RecompraOportunidade[]> {
    try {
      const response = await apiClient.get('/clientes/recompra');
      return response.data?.clientes || [];
    } catch (error) {
      console.warn('Falha na rota online de recompra, calculando algoritmo localmente...', error);
      return this.calcularRecompraLocalmente();
    }
  },

  // Algoritmo local de recompra offline idêntico ao SaaS
  async calcularRecompraLocalmente(): Promise<RecompraOportunidade[]> {
    const clientes = await LocalStorage.getClientes();
    const pedidos = await LocalStorage.getPedidos();
    const agora = new Date().getTime();

    const oportunidades: RecompraOportunidade[] = [];

    for (const c of clientes) {
      const pedidosDoCliente = pedidos
        .filter((p) => p.clienteId === c.id && p.status !== 'CANCELADO')
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      if (pedidosDoCliente.length === 0) continue;

      const ultimoPedido = pedidosDoCliente[0];
      const dataUltimoPedido = new Date(ultimoPedido.data).getTime();
      const diffDias = Math.floor((agora - dataUltimoPedido) / (1000 * 60 * 60 * 24));

      let intervaloMedioDias = 15;
      if (pedidosDoCliente.length >= 2) {
        let soma = 0;
        for (let i = 0; i < pedidosDoCliente.length - 1; i++) {
          const p1 = new Date(pedidosDoCliente[i].data).getTime();
          const p2 = new Date(pedidosDoCliente[i + 1].data).getTime();
          soma += Math.max(1, Math.floor((p1 - p2) / (1000 * 60 * 60 * 24)));
        }
        intervaloMedioDias = Math.round(soma / (pedidosDoCliente.length - 1));
      }

      const diasAtraso = diffDias - intervaloMedioDias;

      if (diffDias >= 10 && (diffDias >= intervaloMedioDias || pedidosDoCliente.length === 1)) {
        oportunidades.push({
          clienteId: c.id,
          nome: c.nome,
          telefone: c.telefone,
          whatsapp: c.whatsapp,
          bairro: c.bairro,
          cidade: c.cidade,
          logradouro: c.logradouro,
          numero: c.numero,
          totalPedidos: pedidosDoCliente.length,
          ultimoPedidoData: ultimoPedido.data,
          diasSemComprar: diffDias,
          intervaloMedioDias,
          diasAtraso: Math.max(0, diasAtraso),
          urgencia: diasAtraso >= 7 ? 'ALTA' : diasAtraso >= 3 ? 'MEDIA' : 'NORMAL',
        });
      }
    }

    oportunidades.sort((a, b) => b.diasSemComprar - a.diasSemComprar);
    return oportunidades;
  },
};
