import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Empresa } from '../database/models';
import { LocalAuthService, ConfigService } from '../database/dbService';
import { LocalStorage } from '../database/localStorage';
import { AuthService } from '../services/authService';
import { HapticService } from '../services/hapticService';

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  nomeDistribuidora: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
}

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
    initSession();
  }, []);

  const initSession = async () => {
    try {
      setIsLoading(true);
      const storedToken = await LocalStorage.getToken();
      const storedUser = await LocalStorage.getUser();

      if (storedToken && storedUser) {
        // Validar se o usuário ainda existe no banco
        const userDb = LocalAuthService.getUsuarioById(storedUser.id);
        if (userDb) {
          setToken(storedToken);
          setUser(userDb);
          setActiveEmpresaIdState('local');
        } else {
          await LocalStorage.clearSession();
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão inicial:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const novoUser = LocalAuthService.cadastrar({
        nome: payload.nome,
        email: payload.email,
        senha: payload.senha,
        nomeDistribuidora: payload.nomeDistribuidora,
        whatsapp: payload.whatsapp,
        cidade: payload.cidade,
        estado: payload.estado,
      });

      setUser(novoUser);
      setToken('local-session-token');
      await LocalStorage.setUser(novoUser);
      await LocalStorage.setToken('local-session-token');
      await HapticService.success();
      return { success: true };
    } catch (err: any) {
      await HapticService.error();
      return { success: false, error: err.message || 'Falha ao cadastrar distribuidora.' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const userFound = LocalAuthService.login(email, pass);
      if (userFound) {
        setUser(userFound);
        setToken('local-session-token');
        await LocalStorage.setUser(userFound);
        await LocalStorage.setToken('local-session-token');
        await HapticService.success();
        return { success: true };
      }
      await HapticService.error();
      return { success: false, error: 'E-mail ou senha incorretos.' };
    } catch (err: any) {
      await HapticService.error();
      return { success: false, error: err.message || 'Falha ao autenticar.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    try {
      const supported = await AuthService.isBiometricsSupported();
      if (!supported) return false;

      const storedUser = await LocalStorage.getUser();
      if (!storedUser) return false;

      const authenticated = await AuthService.authenticateWithBiometrics();
      if (authenticated) {
        const userDb = LocalAuthService.getUsuarioById(storedUser.id) || storedUser;
        setUser(userDb);
        setToken('local-session-token');
        await HapticService.success();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await LocalStorage.clearSession();
      setUser(null);
      setToken(null);
      await HapticService.medium();
    } catch (e) {
      console.warn('Erro ao deslogar:', e);
    }
  };

  const switchEmpresa = async (empresaId: string) => {
    setActiveEmpresaIdState(empresaId);
    await HapticService.light();
  };

  const refreshUserData = async () => {
    if (user?.id) {
      const userDb = LocalAuthService.getUsuarioById(user.id);
      if (userDb) setUser(userDb);
    }
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
