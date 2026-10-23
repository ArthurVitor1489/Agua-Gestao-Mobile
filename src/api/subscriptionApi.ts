import { apiClient } from './client';

export interface SubscriptionStatus {
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  daysRemaining: number | null;
  daysUsed: number;
  trialTotalDays: number;
  plano: string;
  status: string;
  empresaNome?: string;
}

export const SubscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus> {
    const response = await apiClient.get('/subscription/status');
    return response.data;
  },

  async activate(plan: 'MENSAL' | 'ANUAL', purchaseToken?: string, orderId?: string): Promise<any> {
    const response = await apiClient.post('/subscription/activate', {
      plan,
      purchaseToken,
      orderId,
    });
    return response.data;
  },
};
