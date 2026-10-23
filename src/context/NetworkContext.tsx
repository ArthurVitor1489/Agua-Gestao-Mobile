import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncQueue } from '../database/syncQueue';
import { processOfflineSyncQueue } from '../api/client';
import { HapticService } from '../services/hapticService';

interface NetworkContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<{ processados: number; falhas: number }>;
  refreshPendingCount: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({} as any);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    refreshPendingCount();

    // Verificação periódica de conectividade e contagem de fila
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const refreshPendingCount = async () => {
    try {
      const count = await SyncQueue.getPendingCount();
      setPendingSyncCount(count);
    } catch {}
  };

  const syncNow = async (): Promise<{ processados: number; falhas: number }> => {
    if (isSyncing) return { processados: 0, falhas: 0 };
    try {
      setIsSyncing(true);
      await HapticService.light();
      const result = await processOfflineSyncQueue();
      await refreshPendingCount();
      if (result.processados > 0) {
        await HapticService.success();
      }
      return result;
    } catch (err) {
      console.warn('Erro ao sincronizar fila offline:', err);
      return { processados: 0, falhas: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        isSyncing,
        syncNow,
        refreshPendingCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
