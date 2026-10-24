import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CloudSyncService } from './src/services/cloudSyncService';

const MainApp: React.FC = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    // Inicia sincronização inteligente automática em segundo plano
    const cleanup = CloudSyncService.iniciarMonitoramentoAutomatico();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NetworkProvider>
            <SubscriptionProvider>
              <MainApp />
            </SubscriptionProvider>
          </NetworkProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
