import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pedido,
  Cliente,
  Produto,
  EstoqueGarrafao,
  Fiado,
  Despesa,
  DashboardData,
  Empresa,
  User,
} from './models';

const KEYS = {
  AUTH_TOKEN: '@agua_gestao:token',
  AUTH_USER: '@agua_gestao:user',
  ACTIVE_EMPRESA_ID: '@agua_gestao:active_empresa_id',
  EMPRESAS_LIST: '@agua_gestao:empresas_list',
  PEDIDOS: '@agua_gestao:pedidos',
  CLIENTES: '@agua_gestao:clientes',
  PRODUTOS: '@agua_gestao:produtos',
  GARRAFOES: '@agua_gestao:garrafoes',
  FIADOS: '@agua_gestao:fiados',
  DESPESAS: '@agua_gestao:despesas',
  DASHBOARD: '@agua_gestao:dashboard',
  SYNC_QUEUE: '@agua_gestao:sync_queue',
  PRINTER_CONFIG: '@agua_gestao:printer_config',
  THEME_MODE: '@agua_gestao:theme_mode',
  SERVER_URL: '@agua_gestao:server_url',
};

export const LocalStorage = {
  // --- Autenticação & Sessão ---
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  },
  async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
  },
  async getUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setActiveEmpresaId(empresaId: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVE_EMPRESA_ID, empresaId);
  },
  async getActiveEmpresaId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.ACTIVE_EMPRESA_ID);
  },
  async setEmpresasList(empresas: Empresa[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.EMPRESAS_LIST, JSON.stringify(empresas));
  },
  async getEmpresasList(): Promise<Empresa[]> {
    const raw = await AsyncStorage.getItem(KEYS.EMPRESAS_LIST);
    return raw ? JSON.parse(raw) : [];
  },
  async clearSession(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.AUTH_TOKEN,
      KEYS.AUTH_USER,
      KEYS.ACTIVE_EMPRESA_ID,
    ]);
  },

  // --- Pedidos & PDV ---
  async setPedidos(pedidos: Pedido[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.PEDIDOS, JSON.stringify(pedidos));
  },
  async getPedidos(): Promise<Pedido[]> {
    const raw = await AsyncStorage.getItem(KEYS.PEDIDOS);
    return raw ? JSON.parse(raw) : [];
  },
  async saveLocalPedido(pedido: Pedido): Promise<void> {
    const current = await this.getPedidos();
    const updated = [pedido, ...current.filter((p) => p.id !== pedido.id)];
    await this.setPedidos(updated);

    // Ajuste otimista de estoque local
    for (const item of pedido.itens) {
      if (item.produto?.categoria === 'AGUA_20L') {
        await this.adjustLocalGarrafoesStock(item.quantidade);
      }
    }
  },
  async updateLocalPedidoStatus(id: string, novoStatus: any): Promise<void> {
    const current = await this.getPedidos();
    const updated = current.map((p) => (p.id === id ? { ...p, status: novoStatus } : p));
    await this.setPedidos(updated);
  },

  // --- Clientes ---
  async setClientes(clientes: Cliente[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(clientes));
  },
  async getClientes(): Promise<Cliente[]> {
    const raw = await AsyncStorage.getItem(KEYS.CLIENTES);
    return raw ? JSON.parse(raw) : [];
  },
  async saveLocalCliente(cliente: Cliente): Promise<void> {
    const current = await this.getClientes();
    const updated = [cliente, ...current.filter((c) => c.id !== cliente.id)];
    await this.setClientes(updated);
  },

  // --- Produtos ---
  async setProdutos(produtos: Produto[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.PRODUTOS, JSON.stringify(produtos));
  },
  async getProdutos(): Promise<Produto[]> {
    const raw = await AsyncStorage.getItem(KEYS.PRODUTOS);
    return raw ? JSON.parse(raw) : [];
  },

  // --- Estoque de Garrafões ---
  async setGarrafoes(garrafoes: EstoqueGarrafao[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.GARRAFOES, JSON.stringify(garrafoes));
  },
  async getGarrafoes(): Promise<EstoqueGarrafao[]> {
    const raw = await AsyncStorage.getItem(KEYS.GARRAFOES);
    return raw ? JSON.parse(raw) : [];
  },
  async adjustLocalGarrafoesStock(quantidadeAgua: number): Promise<void> {
    const list = await this.getGarrafoes();
    const anoAtual = new Date().getFullYear();

    // 1. Debitar cheios
    let restanteCheios = quantidadeAgua;
    for (const g of list) {
      if (g.status === 'CHEIO' && g.quantidade > 0 && restanteCheios > 0) {
        const debitar = Math.min(g.quantidade, restanteCheios);
        g.quantidade -= debitar;
        restanteCheios -= debitar;
      }
    }

    // 2. Creditar vazios
    let loteVazio = list.find((g) => g.status === 'VAZIO');
    if (loteVazio) {
      loteVazio.quantidade += quantidadeAgua;
    } else {
      list.push({
        id: `local-vazio-${Date.now()}`,
        empresaId: '',
        anoFabricacao: anoAtual,
        anoValidade: anoAtual + 3,
        quantidade: quantidadeAgua,
        status: 'VAZIO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await this.setGarrafoes(list);
  },

  // --- Fiados ---
  async setFiados(fiados: Fiado[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.FIADOS, JSON.stringify(fiados));
  },
  async getFiados(): Promise<Fiado[]> {
    const raw = await AsyncStorage.getItem(KEYS.FIADOS);
    return raw ? JSON.parse(raw) : [];
  },

  // --- Despesas ---
  async setDespesas(despesas: Despesa[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.DESPESAS, JSON.stringify(despesas));
  },
  async getDespesas(): Promise<Despesa[]> {
    const raw = await AsyncStorage.getItem(KEYS.DESPESAS);
    return raw ? JSON.parse(raw) : [];
  },

  // --- Dashboard ---
  async setDashboard(data: DashboardData): Promise<void> {
    await AsyncStorage.setItem(KEYS.DASHBOARD, JSON.stringify(data));
  },
  async getDashboard(): Promise<DashboardData | null> {
    const raw = await AsyncStorage.getItem(KEYS.DASHBOARD);
    return raw ? JSON.parse(raw) : null;
  },

  // --- Configuração da Impressora ---
  async setPrinterConfig(config: {
    paperWidth: 58 | 80;
    autoPrint: boolean;
    macAddress?: string;
    printerName?: string;
  }): Promise<void> {
    await AsyncStorage.setItem(KEYS.PRINTER_CONFIG, JSON.stringify(config));
  },
  async getPrinterConfig(): Promise<{
    paperWidth: 58 | 80;
    autoPrint: boolean;
    macAddress?: string;
    printerName?: string;
  }> {
    const raw = await AsyncStorage.getItem(KEYS.PRINTER_CONFIG);
    return raw
      ? JSON.parse(raw)
      : { paperWidth: 58, autoPrint: false, printerName: 'Mini Térmica Bluetooth' };
  },

  // --- Tema ---
  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    await AsyncStorage.setItem(KEYS.THEME_MODE, mode);
  },
  async getThemeMode(): Promise<'light' | 'dark' | 'system'> {
    const mode = await AsyncStorage.getItem(KEYS.THEME_MODE);
    return (mode as any) || 'system';
  },

  // --- Configuração de Servidor / IP da API ---
  async setServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url.trim().replace(/\/$/, ''));
  },
  async getServerUrl(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.SERVER_URL);
  },
};
