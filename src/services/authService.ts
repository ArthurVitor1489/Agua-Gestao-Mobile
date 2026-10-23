import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { LocalStorage } from '../database/localStorage';

export const AuthService = {
  async isBiometricsSupported(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  },

  async authenticateWithBiometrics(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação Água Gestão',
        cancelLabel: 'Usar Senha',
        fallbackLabel: 'Digitar Senha',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (err) {
      console.warn('Falha na autenticação biométrica:', err);
      return false;
    }
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
