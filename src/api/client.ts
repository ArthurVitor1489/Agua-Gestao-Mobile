import axios, { AxiosResponse, AxiosError } from 'axios';
import { LocalStorage } from '../database/localStorage';
import { SyncQueue } from '../database/syncQueue';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// URL Segura HTTPS via Tunnel (imune a bloqueios de firewall do Windows e sem restrição de cleartext HTTP no Android)
export const DEFAULT_HTTPS_TUNNEL_URL = 'https://aguagestao-api.loca.lt/api';
export const DEFAULT_LAN_IP = '192.168.1.71';

export const getInitialBaseApiUrl = (): string => {
  const extra = Constants.expoConfig?.extra;
  if (extra?.apiUrl) {
    return extra.apiUrl;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:3000/api`;
    }
    return 'http://localhost:3000/api';
  }
  return DEFAULT_HTTPS_TUNNEL_URL;
};

export const API_BASE_URL = getInitialBaseApiUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Inicializar baseURL a partir do LocalStorage se configurado pelo usuário
LocalStorage.getServerUrl().then((savedUrl) => {
  if (savedUrl) {
    if (savedUrl.includes('192.168.1.65')) {
      savedUrl = savedUrl.replace('192.168.1.65', DEFAULT_LAN_IP);
      LocalStorage.setServerUrl(savedUrl);
    }
    apiClient.defaults.baseURL = savedUrl;
  }
});

export const updateApiBaseUrl = (newUrl: string): void => {
  const cleanUrl = newUrl.trim().replace(/\/$/, '');
  apiClient.defaults.baseURL = cleanUrl;
  LocalStorage.setServerUrl(cleanUrl);
};

export const testServerConnection = async (
  testUrl?: string
): Promise<{ success: boolean; latencyMs?: number; message?: string }> => {
  const targetUrl = (testUrl || apiClient.defaults.baseURL || API_BASE_URL).trim().replace(/\/$/, '');
  const start = Date.now();

  try {
    const res = await axios.get(`${targetUrl}/dashboard`, {
      timeout: 8000,
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
    });
    const latencyMs = Date.now() - start;
    return {
      success: true,
      latencyMs,
      message: `Conectado com sucesso (${latencyMs}ms)!`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    // Se respondeu 401, significa que o servidor está 100% online e a rota requer login!
    if (err.response?.status === 401) {
      return {
        success: true,
        latencyMs,
        message: `Servidor conectado e ativo (${latencyMs}ms)!`,
      };
    }

    const errorMsg =
      err.code === 'ECONNABORTED'
        ? 'Tempo limite esgotado (Timeout). Verifique se o backend está ligado.'
        : err.message === 'Network Error'
        ? `Falha de rede ao conectar em ${targetUrl}. Verifique a URL e a conexão.`
        : err.response?.data?.error || err.message || 'Erro ao conectar no servidor.';

    return {
      success: false,
      latencyMs,
      message: errorMsg,
    };
  }
};

let onUnauthorizedCallback: (() => void) | null = null;
export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

// 1. Interceptor de Requisição (Injeta JWT Bearer, Bypass Header e x-empresa-id)
apiClient.interceptors.request.use(
  async (config) => {
    try {
      config.headers['Bypass-Tunnel-Reminder'] = 'true';

      // Carregar URL personalizada mais recente
      const savedServerUrl = await LocalStorage.getServerUrl();
      if (savedServerUrl && config.baseURL !== savedServerUrl) {
        config.baseURL = savedServerUrl;
      }

      const token = await LocalStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Se for SUPER_ADMIN e tiver selecionado uma empresa específica
      const activeEmpresaId = await LocalStorage.getActiveEmpresaId();
      if (activeEmpresaId) {
        config.headers['x-empresa-id'] = activeEmpresaId;
      }
    } catch (e) {
      console.warn('Erro ao carregar token no interceptor:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Interceptor de Resposta (Tratamento de 401 e Erros de Rede)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('Sessão expirada ou não autorizada (401)');
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

// Processador da fila de sincronização offline
export const processOfflineSyncQueue = async (): Promise<{
  processados: number;
  falhas: number;
}> => {
  const queue = await SyncQueue.getQueue();
  const pendentes = queue.filter((i) => i.status === 'PENDENTE' || i.status === 'FALHA');

  let processados = 0;
  let falhas = 0;

  for (const item of pendentes) {
    try {
      await SyncQueue.updateItem(item.id, { status: 'PROCESSANDO' });

      await apiClient({
        url: item.endpoint,
        method: item.method,
        data: item.payload,
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
      });

      await SyncQueue.removeFromQueue(item.id);
      processados++;
    } catch (err: any) {
      falhas++;
      await SyncQueue.updateItem(item.id, {
        status: 'FALHA',
        retryCount: item.retryCount + 1,
        errorMessage: err?.response?.data?.error || err.message || 'Erro de conexão',
      });
    }
  }

  return { processados, falhas };
};
