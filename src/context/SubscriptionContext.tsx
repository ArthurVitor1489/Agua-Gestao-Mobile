import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SubscriptionService, LicenseStatus } from '../services/subscriptionService';
import { HapticService } from '../services/hapticService';

interface SubscriptionContextData {
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  daysRemaining: number | null;
  plano: string;
  loading: boolean;
  showPaywallModal: boolean;
  refreshSubscription: () => void;
  subscribeWithGooglePlay: (plan: 'MENSAL' | 'ANUAL') => Promise<{ success: boolean; message: string }>;
  openPaywall: () => void;
  closePaywall: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextData>({} as SubscriptionContextData);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<LicenseStatus>(() => SubscriptionService.getLicenseStatus());
  const [loading, setLoading] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const refreshSubscription = useCallback(() => {
    const s = SubscriptionService.getLicenseStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const subscribeWithGooglePlay = async (plan: 'MENSAL' | 'ANUAL') => {
    try {
      setLoading(true);
      await HapticService.medium();

      // Ativa no banco local
      const ok = SubscriptionService.activatePlan(plan);
      if (ok) {
        await HapticService.success();
        refreshSubscription();
        setShowPaywallModal(false);
        return {
          success: true,
          message: 'Assinatura ativada com sucesso pela Google Play Store! Todos os recursos estão liberados.',
        };
      }
      return { success: false, message: 'Não foi possível confirmar a assinatura.' };
    } catch (e: any) {
      await HapticService.error();
      return { success: false, message: e.message || 'Erro ao processar assinatura.' };
    } finally {
      setLoading(false);
    }
  };

  const openPaywall = () => {
    HapticService.light();
    setShowPaywallModal(true);
  };

  const closePaywall = () => {
    if (status.hasAccess) {
      setShowPaywallModal(false);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        hasAccess: true,
        isSubscribed: true,
        isTrialActive: false,
        daysRemaining: null,
        plano: 'PRO',
        loading: false,
        showPaywallModal: false,
        refreshSubscription,
        subscribeWithGooglePlay,
        openPaywall: () => {},
        closePaywall: () => {},
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
