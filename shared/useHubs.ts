import { useState, useEffect, useCallback } from 'react';
import { discourseApi, Hub } from './discourseApi';
import { onAuthEvent } from './auth-events';

export interface HubsState {
  hubs: Hub[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export function useHubs() {
  const [hubsState, setHubsState] = useState<HubsState>({
    hubs: [],
    isLoading: true,
    isRefreshing: false,
    error: null
  });

  const loadHubs = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setHubsState(prev => ({
          ...prev,
          isLoading: true,
          error: null
        }));
      } else {
        setHubsState(prev => ({
          ...prev,
          isRefreshing: true,
          error: null
        }));
      }

      const response = await discourseApi.getHubs();

      if (response.success && response.data) {
        setHubsState(prev => ({
          ...prev,
          hubs: response.data || [],
          isLoading: false,
          isRefreshing: false,
          error: null
        }));
      } else {
        setHubsState(prev => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: response.error || 'Failed to load hubs'
        }));
      }
    } catch (error) {
      console.error('Hubs loading error:', error);
      setHubsState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Network error'
      }));
    }
  }, []);

  const refreshHubs = useCallback(() => {
    loadHubs(false);
  }, [loadHubs]);

  useEffect(() => {
    loadHubs();
  }, [loadHubs]);

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        refreshHubs();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [refreshHubs]);

  const getHub = (id: number): Hub | undefined => {
    return hubsState.hubs.find(hub => hub.id === id);
  };

  const getHubBySlug = (slug: string): Hub | undefined => {
    return hubsState.hubs.find(hub => hub.slug === slug);
  };

  const getTopLevelHubs = (): Hub[] => {
    return hubsState.hubs.filter(hub => !hub.parentId);
  };

  const getSubHubs = (parentId: number): Hub[] => {
    return hubsState.hubs.filter(hub => hub.parentId === parentId);
  };

  const createHub = async (data: {
    name: string;
    color: string;
    textColor: string;
    description?: string;
    parentCategoryId?: number;
  }): Promise<{ success: boolean; error?: string; hub?: Hub }> => {
    try {
      // Note: Hub creation requires admin API access
      // For now, return error as this feature isn't fully implemented
      return {
        success: false,
        error: 'Hub creation requires admin privileges'
      };
    } catch (error) {
      console.error('Create hub error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  };

  const updateHub = (updatedHub: Hub) => {
    setHubsState(prev => ({
      ...prev,
      hubs: prev.hubs.map(hub =>
        hub.id === updatedHub.id ? updatedHub : hub
      )
    }));
  };

  const removeHub = (hubId: number) => {
    setHubsState(prev => ({
      ...prev,
      hubs: prev.hubs.filter(hub => hub.id !== hubId)
    }));
  };

  const clearError = () => {
    setHubsState(prev => ({ ...prev, error: null }));
  };

  // Helper function to get hub hierarchy
  const getHubHierarchy = (hubId: number): Hub[] => {
    const hierarchy: Hub[] = [];
    let currentHub = getHub(hubId);

    while (currentHub) {
      hierarchy.unshift(currentHub);
      currentHub = currentHub.parentId ? getHub(currentHub.parentId) : undefined;
    }

    return hierarchy;
  };

  // Helper function to get all descendant hubs
  const getDescendantHubs = (parentId: number): Hub[] => {
    const descendants: Hub[] = [];
    const directChildren = getSubHubs(parentId);

    for (const child of directChildren) {
      descendants.push(child);
      descendants.push(...getDescendantHubs(child.id));
    }

    return descendants;
  };

  return {
    ...hubsState,
    refreshHubs,
    getHub,
    getHubBySlug,
    getTopLevelHubs,
    getSubHubs,
    createHub,
    updateHub,
    removeHub,
    clearError,
    getHubHierarchy,
    getDescendantHubs
  };
}

// Hook for managing a single hub
export function useHub(hubId: number) {
  const [hub, setHub] = useState<Hub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hubId) {
      loadHub();
    }
  }, [hubId]);

  const loadHub = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await discourseApi.getHub(hubId);

      if (response.success && response.data) {
        setHub(response.data);
      } else {
        setError(response.error || 'Failed to load hub');
      }
    } catch (error) {
      console.error('Hub loading error:', error);
      setError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateHub = (updates: Partial<Hub>) => {
    setHub(prev => prev ? { ...prev, ...updates } : null);
  };

  return {
    hub,
    isLoading,
    error,
    loadHub,
    updateHub
  };
}

// Hook for hub subscription management
export function useHubSubscription() {
  const [subscriptions, setSubscriptions] = useState<Set<number>>(new Set());

  // Load subscriptions from storage on mount
  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // TODO: Load from AsyncStorage or API
      // For now, using empty set
      setSubscriptions(new Set());
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const isSubscribed = (hubId: number): boolean => {
    return subscriptions.has(hubId);
  };

  const subscribe = async (hubId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Call API to subscribe
      // For now, just update local state
      setSubscriptions(prev => new Set([...prev, hubId]));
      return { success: true };
    } catch (error) {
      console.error('Subscribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      };
    }
  };

  const unsubscribe = async (hubId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Call API to unsubscribe
      // For now, just update local state
      setSubscriptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(hubId);
        return newSet;
      });
      return { success: true };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      };
    }
  };

  const toggleSubscription = async (hubId: number): Promise<{ success: boolean; error?: string }> => {
    if (isSubscribed(hubId)) {
      return unsubscribe(hubId);
    } else {
      return subscribe(hubId);
    }
  };

  const getSubscribedHubs = (): number[] => {
    return Array.from(subscriptions);
  };

  return {
    subscriptions: Array.from(subscriptions),
    isSubscribed,
    subscribe,
    unsubscribe,
    toggleSubscription,
    getSubscribedHubs
  };
}

