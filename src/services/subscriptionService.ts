import { ConfigService } from '../database/dbService';

export interface LicenseStatus {
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  daysRemaining: number | null;
  daysUsed: number;
  plano: string;
  nomeDistribuidora: string;
}

export const SubscriptionService = {
  getLicenseStatus(): LicenseStatus {
    const config = ConfigService.getConfig();
    if (!config) {
      return {
        hasAccess: true,
        isSubscribed: false,
        isTrialActive: true,
        daysRemaining: 14,
        daysUsed: 0,
        plano: 'TRIAL_14_DIAS',
        nomeDistribuidora: 'Minha Distribuidora',
      };
    }

    if (config.isSubscribed) {
      return {
        hasAccess: true,
        isSubscribed: true,
        isTrialActive: false,
        daysRemaining: null,
        daysUsed: 0,
        plano: config.plano || 'MENSAL',
        nomeDistribuidora: config.nomeDistribuidora,
      };
    }

    const trialStart = new Date(config.trialStartDate).getTime();
    const now = Date.now();
    const daysUsed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 14 - daysUsed);
    const isTrialActive = daysRemaining > 0;

    return {
      hasAccess: isTrialActive,
      isSubscribed: false,
      isTrialActive,
      daysRemaining,
      daysUsed,
      plano: config.plano || 'TRIAL_14_DIAS',
      nomeDistribuidora: config.nomeDistribuidora,
    };
  },

  activatePlan(plano: 'MENSAL' | 'ANUAL'): boolean {
    return ConfigService.activateSubscription(plano);
  },
};
