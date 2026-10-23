import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Empresa } from '../database/models';
import { AuthApi, RegisterPayload } from '../api/authApi';
import { LocalStorage } from '../database/localStorage';
import { AuthService } from '../services/authService';
import { setOnUnauthorizedCallback } from '../api/client';
import { HapticService } from '../services/hapticService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  activeEmpresaId: string | null;
  empresas: Empresa[];
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithBiometrics: () => Promise<boolean>;
  logout: () => Promise<void>;
  switchEmpresa: (empresaId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeEmpresaId, setActiveEmpresaIdState] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    // Configurar callback para 401 automático
    setOnUnauthorizedCallback(() => {
      logout();
    });

    initSession();
  }, []);

  const initSession = async () => {
    try {
      setIsLoading(true);
      const storedToken = await LocalStorage.getToken();
      const storedUser = await LocalStorage.getUser();
      const storedActiveEmpresa = await LocalStorage.getActiveEmpresaId();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setActiveEmpresaIdState(storedActiveEmpresa || storedUser.empresaId || null);

        if (storedUser.role === 'SUPER_ADMIN') {
          loadEmpresas();
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão inicial:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const list = await AuthApi.getEmpresas();
      setEmpresas(list);
      await LocalStorage.setEmpresasList(list);
    } catch (e) {
      const cached = await LocalStorage.getEmpresasList();
      setEmpresas(cached);
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await AuthApi.register(payload);
      if (res.sucesso && res.user) {
        setUser(res.user);
        if (res.token) setToken(res.token);
        const empId = res.user.empresaId || null;
        setActiveEmpresaIdState(empId);
        await HapticService.success();
        return { success: true };
      }
      await HapticService.error();
      return { success: false, error: res.error || 'Falha ao registrar distribuidora.' };
    } catch (err: any) {
      await HapticService.error();
      const msg = err.response?.data?.error || err.message || 'Erro ao realizar cadastro.';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await AuthApi.login(email, pass);
      if (res.sucesso && res.user) {
        setUser(res.user);
        if (res.token) setToken(res.token);
        const empId = res.user.empresaId || null;
        setActiveEmpresaIdState(empId);

        if (res.user.role === 'SUPER_ADMIN') {
          loadEmpresas();
        }

        await HapticService.success();
        return { success: true };
      }
      await HapticService.error();
      return { success: false, error: res.error || 'Credenciais inválidas' };
    } catch (err: any) {
      await HapticService.error();
      const msg = err.response?.data?.error || err.message || 'Falha ao autenticar';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    const supported = await AuthService.isBiometricsSupported();
    if (!supported) return false;

    const storedToken = await LocalStorage.getToken();
    const storedUser = await LocalStorage.getUser();

    if (!storedToken || !storedUser) return false;

    const authenticated = await AuthService.authenticateWithBiometrics();
    if (authenticated) {
      setUser(storedUser);
      setToken(storedToken);
      const activeEmp = await LocalStorage.getActiveEmpresaId();
      setActiveEmpresaIdState(activeEmp || storedUser.empresaId || null);
      if (storedUser.role === 'SUPER_ADMIN') {
        loadEmpresas();
      }
      await HapticService.success();
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch {}
    setUser(null);
    setToken(null);
    setActiveEmpresaIdState(null);
    setEmpresas([]);
    await HapticService.medium();
  };

  const switchEmpresa = async (empresaId: string) => {
    try {
      await AuthApi.switchEmpresa(empresaId);
      setActiveEmpresaIdState(empresaId);
      await HapticService.light();
    } catch (e) {
      console.warn('Erro ao alternar empresa:', e);
      setActiveEmpresaIdState(empresaId);
      await LocalStorage.setActiveEmpresaId(empresaId);
    }
  };

  const refreshUserData = async () => {
    try {
      const me = await AuthApi.getMe();
      setUser(me);
      await LocalStorage.setUser(me);
    } catch {}
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSuperAdmin,
        activeEmpresaId,
        empresas,
        register,
        login,
        loginWithBiometrics,
        logout,
        switchEmpresa,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
