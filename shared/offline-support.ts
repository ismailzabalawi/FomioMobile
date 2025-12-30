/**
 * Offline Support & Network Resilience System
 * Comprehensive offline functionality with data caching and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { errorManager } from './error-handling';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  details: any;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  etag?: string;
}

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
  endpoint?: string;
  method?: string;
}

export interface SyncResult {
  success: boolean;
  actionsProcessed: number;
  errors: string[];
  timestamp: number;
}

// =============================================================================
// NETWORK STATUS MANAGER
// =============================================================================

class NetworkStatusManager {
  private listeners: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: null,
    type: null,
    details: null,
  };
  
  // Initialize network monitoring
  initialize() {
    // Note: In a real React Native app, you would use @react-native-netinfo
    // For this implementation, we'll simulate network status
    this.simulateNetworkMonitoring();
  }
  
  // Simulate network monitoring (replace with real implementation)
  private simulateNetworkMonitoring() {
    // Check network status periodically
    setInterval(() => {
      this.checkNetworkStatus();
    }, 5000);
    
    // Initial check
    this.checkNetworkStatus();
  }
  
  // Check current network status
  private async checkNetworkStatus() {
    try {
      // Simulate network check (replace with actual implementation)
      const isConnected = await this.testConnectivity();
      
      const newState: NetworkState = {
        isConnected,
        isInternetReachable: isConnected,
        type: isConnected ? 'wifi' : null,
        details: { strength: isConnected ? 'excellent' : 'none' },
      };
      
      // Only notify if state changed
      if (this.hasStateChanged(newState)) {
        this.currentState = newState;
        this.notifyListeners(newState);
        
        logger.info('Network state changed:', newState);
        
        // Trigger sync if connection restored
        if (isConnected) {
          offlineManager.syncWhenOnline();
        }
      }
    } catch (error) {
      logger.error('Error checking network status:', error);
    }
  }
  
  // Test connectivity by making a simple request
  private async testConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity test with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Check if network state has changed
  private hasStateChanged(newState: NetworkState): boolean {
    return (
      this.currentState.isConnected !== newState.isConnected ||
      this.currentState.isInternetReachable !== newState.isInternetReachable ||
      this.currentState.type !== newState.type
    );
  }
  
  // Add network state listener
  addListener(listener: (state: NetworkState) => void) {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.currentState);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  // Notify all listeners
  private notifyListeners(state: NetworkState) {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('Error in network listener:', error);
      }
    });
  }
  
  // Get current network state
  getState(): NetworkState {
    return { ...this.currentState };
  }
  
  // Check if currently online
  isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable !== false;
  }
}

// =============================================================================
// CACHE MANAGER
// =============================================================================

class CacheManager {
  private cachePrefix = 'fomio_cache_';
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  
  // Store data in cache
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttl || this.defaultTTL);
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
        version: '1.0',
      };
      
      await AsyncStorage.setItem(
        this.cachePrefix + key,
        JSON.stringify(cacheEntry)
      );
      
      logger.debug(`Cached data for key: ${key}`);
    } catch (error) {
      logger.error(`Error caching data for key ${key}:`, error);
    }
  }
  
  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.cachePrefix + key);
      if (!cached) return null;
      
      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheEntry.expiresAt) {
        await this.delete(key);
        return null;
      }
      
      logger.debug(`Retrieved cached data for key: ${key}`);
      return cacheEntry.data;
    } catch (error) {
      logger.error(`Error retrieving cached data for key ${key}:`, error);
      return null;
    }
  }
  
  // Delete cached data
  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.cachePrefix + key);
      logger.debug(`Deleted cached data for key: ${key}`);
    } catch (error) {
      logger.error(`Error deleting cached data for key ${key}:`, error);
    }
  }
  
  // Clear all cache
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      logger.info(`Cleared ${cacheKeys.length} cached items`);
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }
  
  // Get cache size and stats
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return { count: cacheKeys.length, totalSize };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}

// =============================================================================
// ACTION QUEUE MANAGER
// =============================================================================

class ActionQueueManager {
  private queueKey = 'fomio_action_queue';
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  
  // Initialize queue from storage
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.queueKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        logger.info(`Loaded ${this.queue.length} queued actions`);
      }
    } catch (error) {
      logger.error('Error loading action queue:', error);
    }
  }
  
  // Add action to queue
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.queue.push(queuedAction);
    await this.saveQueue();
    
    logger.info(`Queued action: ${queuedAction.type} (${queuedAction.id})`);
    
    // Try to process immediately if online
    if (networkStatusManager.isOnline()) {
      this.processQueue();
    }
    
    return queuedAction.id;
  }
  
  // Process queued actions
  async processQueue(): Promise<SyncResult> {
    if (this.isProcessing || !networkStatusManager.isOnline()) {
      return { success: false, actionsProcessed: 0, errors: ['Already processing or offline'], timestamp: Date.now() };
    }
    
    this.isProcessing = true;
    const errors: string[] = [];
    let actionsProcessed = 0;
    
    try {
      // Sort by priority and timestamp
      const sortedQueue = [...this.queue].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });
      
      for (const action of sortedQueue) {
        try {
          await this.processAction(action);
          this.removeFromQueue(action.id);
          actionsProcessed++;
          logger.info(`Processed action: ${action.type} (${action.id})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Action ${action.id}: ${errorMessage}`);
          
          // Increment retry count
          action.retryCount++;
          
          // Remove if max retries exceeded
          if (action.retryCount >= action.maxRetries) {
            this.removeFromQueue(action.id);
            logger.warn(`Action ${action.id} exceeded max retries, removing from queue`);
          }
        }
      }
      
      await this.saveQueue();
      
      return {
        success: errors.length === 0,
        actionsProcessed,
        errors,
        timestamp: Date.now(),
      };
    } finally {
      this.isProcessing = false;
    }
  }
  
  // Process individual action
  private async processAction(action: QueuedAction): Promise<void> {
    // Implement action processing based on type
    switch (action.type) {
      case 'like_byte':
        await this.processLikeAction(action);
        break;
      case 'create_byte':
        await this.processCreateByteAction(action);
        break;
      case 'update_profile':
        await this.processUpdateProfileAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  // Process like action
  private async processLikeAction(action: QueuedAction): Promise<void> {
    const { byteId, isLiked } = action.payload;
    
    // Simulate API call
    const response = await fetch(`/api/bytes/${byteId}/like`, {
      method: isLiked ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ${isLiked ? 'like' : 'unlike'} byte`);
    }
  }
  
  // Process create byte action
  private async processCreateByteAction(action: QueuedAction): Promise<void> {
    const response = await fetch('/api/bytes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create byte');
    }
  }
  
  // Process update profile action
  private async processUpdateProfileAction(action: QueuedAction): Promise<void> {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
  }
  
  // Remove action from queue
  private removeFromQueue(actionId: string): void {
    this.queue = this.queue.filter(action => action.id !== actionId);
  }
  
  // Save queue to storage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Error saving action queue:', error);
    }
  }
  
  // Get queue status
  getStatus(): { count: number; processing: boolean; actions: QueuedAction[] } {
    return {
      count: this.queue.length,
      processing: this.isProcessing,
      actions: [...this.queue],
    };
  }
  
  // Clear queue
  async clear(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    logger.info('Action queue cleared');
  }
}

// =============================================================================
// OFFLINE MANAGER
// =============================================================================

class OfflineManager {
  private cacheManager = new CacheManager();
  private actionQueueManager = new ActionQueueManager();
  private syncListeners: ((result: SyncResult) => void)[] = [];
  
  // Initialize offline manager
  async initialize(): Promise<void> {
    await this.actionQueueManager.initialize();
    networkStatusManager.initialize();
    
    // Listen for network changes
    networkStatusManager.addListener((state) => {
      if (state.isConnected) {
        this.syncWhenOnline();
      }
    });
    
    logger.info('Offline manager initialized');
  }
  
  // Cache data for offline access
  async cacheData<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, data, ttl);
  }
  
  // Get cached data
  async getCachedData<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get<T>(key);
  }
  
  // Queue action for later execution
  async queueAction(
    type: string,
    payload: any,
    options: {
      priority?: QueuedAction['priority'];
      maxRetries?: number;
      endpoint?: string;
      method?: string;
    } = {}
  ): Promise<string> {
    return await this.actionQueueManager.enqueue({
      type,
      payload,
      priority: options.priority || 'medium',
      maxRetries: options.maxRetries || 3,
      endpoint: options.endpoint,
      method: options.method,
    });
  }
  
  // Sync when online
  async syncWhenOnline(): Promise<SyncResult | null> {
    if (!networkStatusManager.isOnline()) {
      return null;
    }
    
    try {
      const result = await this.actionQueueManager.processQueue();
      this.notifySyncListeners(result);
      
      if (result.success) {
        logger.info(`Sync completed: ${result.actionsProcessed} actions processed`);
      } else {
        logger.warn(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        actionsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        timestamp: Date.now(),
      };
      
      this.notifySyncListeners(errorResult);
      logger.error('Sync failed:', error);
      
      return errorResult;
    }
  }
  
  // Add sync listener
  addSyncListener(listener: (result: SyncResult) => void) {
    this.syncListeners.push(listener);
    
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }
  
  // Notify sync listeners
  private notifySyncListeners(result: SyncResult) {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        logger.error('Error in sync listener:', error);
      }
    });
  }
  
  // Get offline status
  getStatus() {
    return {
      isOnline: networkStatusManager.isOnline(),
      networkState: networkStatusManager.getState(),
      queueStatus: this.actionQueueManager.getStatus(),
    };
  }
  
  // Clear all offline data
  async clearAll(): Promise<void> {
    await this.cacheManager.clear();
    await this.actionQueueManager.clear();
    logger.info('All offline data cleared');
  }

  // Get cache stats for UI display
  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    return await this.cacheManager.getStats();
  }
}

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

export const networkStatusManager = new NetworkStatusManager();
export const offlineManager = new OfflineManager();

// =============================================================================
// REACT HOOKS
// =============================================================================

// Hook for network status
export function useNetworkStatus() {
  const [networkState, setNetworkState] = React.useState<NetworkState>(
    networkStatusManager.getState()
  );
  
  React.useEffect(() => {
    const unsubscribe = networkStatusManager.addListener(setNetworkState);
    return unsubscribe;
  }, []);
  
  return {
    ...networkState,
    isOnline: networkState.isConnected && networkState.isInternetReachable !== false,
  };
}

/**
 * @deprecated Use TanStack Query hooks (useQuery, useInfiniteQuery) instead.
 * TanStack Query provides built-in caching, background refetching, and
 * offline support through PersistQueryClientProvider.
 * 
 * This hook is kept for backward compatibility but will be removed in a future version.
 * 
 * Migration guide:
 * - useFeed, useTopic, useComments, etc. now use TanStack Query internally
 * - For custom queries, use useQuery from @tanstack/react-query
 */
export function useOfflineData<T>(key: string, fetcher: () => Promise<T>, ttl?: number) {
  console.warn(
    'useOfflineData is deprecated. Use TanStack Query hooks instead. ' +
    'See shared/query-client.ts for query configuration.'
  );
  
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();
  
  React.useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get cached data first
        const cached = await offlineManager.getCachedData<T>(key);
        if (cached && mounted) {
          setData(cached);
          setLoading(false);
        }
        
        // If online, fetch fresh data
        if (isOnline) {
          const fresh = await fetcher();
          if (mounted) {
            setData(fresh);
            await offlineManager.cacheData(key, fresh, ttl);
          }
        } else if (!cached) {
          // No cached data and offline
          throw new Error('No cached data available and device is offline');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [key, isOnline, fetcher, ttl]);
  
  return { data, loading, error, isOnline };
}

// Hook for queued actions
export function useQueuedAction() {
  const { isOnline } = useNetworkStatus();
  
  const queueAction = React.useCallback(async (
    type: string,
    payload: any,
    options?: Parameters<typeof offlineManager.queueAction>[2]
  ) => {
    return await offlineManager.queueAction(type, payload, options);
  }, []);
  
  return { queueAction, isOnline };
}

// React import for hooks
import React from 'react';
