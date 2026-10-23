import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueueItem } from './models';

const QUEUE_KEY = '@agua_gestao:sync_queue';

export const SyncQueue = {
  async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<SyncQueueItem> {
    const queue = await this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDENTE',
    };
    queue.push(newItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newItem;
  },

  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((i) => i.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  async updateItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex((i) => i.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  },

  async clearCompleted(): Promise<void> {
    const queue = await this.getQueue();
    const pending = queue.filter((i) => i.status !== 'PROCESSANDO');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
  },

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter((i) => i.status === 'PENDENTE' || i.status === 'FALHA').length;
  },
};
