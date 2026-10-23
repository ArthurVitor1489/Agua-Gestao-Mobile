import { apiClient } from './client';
import { LocalStorage } from '../database/localStorage';
import { User, Empresa } from '../database/models';

export interface LoginResponse {
  sucesso: boolean;
  token?: string;
  user: User;
  error?: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  nomeDistribuidora: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
}

export const AuthApi = {
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/register', payload);
    const data = response.data;
    if (data.token) {
      await LocalStorage.setToken(data.token);
      await LocalStorage.setUser(data.user);
      if (data.user.empresaId) {
        await LocalStorage.setActiveEmpresaId(data.user.empresaId);
      }
    }
    return {
      sucesso: true,
      token: data.token,
      user: data.user,
    };
  },

  async login(email: string, senha: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', {
      email: email.trim().toLowerCase(),
      senha,
    });

    const data: LoginResponse = response.data;
    if (data.sucesso && data.token) {
      await LocalStorage.setToken(data.token);
      await LocalStorage.setUser(data.user);
      if (data.user.empresaId) {
        await LocalStorage.setActiveEmpresaId(data.user.empresaId);
      }
    }
    return data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {}
    await LocalStorage.clearSession();
  },

  async getEmpresas(): Promise<Empresa[]> {
    const response = await apiClient.get('/admin/empresas');
    return response.data;
  },

  async switchEmpresa(empresaId: string): Promise<void> {
    await apiClient.post('/auth/switch-empresa', { empresaId });
    await LocalStorage.setActiveEmpresaId(empresaId);
  },
};
