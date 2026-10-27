import { LocalStorage } from '../database/localStorage';

export const AuthService = {
  async isBiometricsSupported(): Promise<boolean> {
    return false;
  },

  async authenticateWithBiometrics(): Promise<boolean> {
    return false;
  },

  async checkStoredSession(): Promise<{ hasToken: boolean; user: any | null }> {
    const token = await LocalStorage.getToken();
    const user = await LocalStorage.getUser();
    return {
      hasToken: !!token,
      user,
    };
  },
};
