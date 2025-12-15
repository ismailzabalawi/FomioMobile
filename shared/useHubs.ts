/**
 * useHubs Hook - Hubs data fetching with TanStack Query
 * 
 * Uses useQuery for hubs data with caching and long stale time
 * since hubs rarely change.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi, Hub } from './discourseApi';
import { onAuthEvent } from './auth-events';
import { queryKeys } from './query-client';

export interface HubsState {
  hubs: Hub[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

/**
 * Fetch hubs from API
 */
async function fetchHubs(): Promise<Hub[]> {
  const response = await discourseApi.getHubs();

  if (!response.success) {
    throw new Error(response.error || 'Failed to load hubs');
  }

  return response.data || [];
}

/**
 * useHubs hook with TanStack Query
 * 
 * Provides hubs data with caching. Hubs rarely change so we use
 * a long stale time.
 */
export function useHubs() {
  const queryClient = useQueryClient();
  const hubsQueryKey = queryKeys.hubs();

  const {
    data: hubs = [],
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: hubsQueryKey,
    queryFn: fetchHubs,
    staleTime: 10 * 60 * 1000, // 10 minutes - hubs rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
  });

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        queryClient.invalidateQueries({ queryKey: hubsQueryKey });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [queryClient, hubsQueryKey]);

  // Refresh hubs
  const refreshHubs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: hubsQueryKey });
  }, [queryClient, hubsQueryKey]);

  // Helper functions
  const getHub = useCallback(
    (id: number): Hub | undefined => {
      return hubs.find((hub) => hub.id === id);
    },
    [hubs]
  );

  const getHubBySlug = useCallback(
    (slug: string): Hub | undefined => {
      return hubs.find((hub) => hub.slug === slug);
    },
    [hubs]
  );

  const getTopLevelHubs = useCallback((): Hub[] => {
    return hubs.filter((hub) => !hub.parentId);
  }, [hubs]);

  const getSubHubs = useCallback(
    (parentId: number): Hub[] => {
      return hubs.filter((hub) => hub.parentId === parentId);
    },
    [hubs]
  );

  const createHub = async (data: {
    name: string;
    color: string;
    textColor: string;
    description?: string;
    parentCategoryId?: number;
  }): Promise<{ success: boolean; error?: string; hub?: Hub }> => {
    // Hub creation requires admin API access
    return {
      success: false,
      error: 'Hub creation requires admin privileges',
    };
  };

  const updateHub = useCallback(
    (updatedHub: Hub) => {
      queryClient.setQueryData<Hub[]>(hubsQueryKey, (old) =>
        old?.map((hub) => (hub.id === updatedHub.id ? updatedHub : hub)) ?? []
      );
    },
    [queryClient, hubsQueryKey]
  );

  const removeHub = useCallback(
    (hubId: number) => {
      queryClient.setQueryData<Hub[]>(hubsQueryKey, (old) =>
        old?.filter((hub) => hub.id !== hubId) ?? []
      );
    },
    [queryClient, hubsQueryKey]
  );

  const clearError = useCallback(() => {
    // Error is managed by React Query
  }, []);

  // Hub hierarchy helpers
  const getHubHierarchy = useCallback(
    (hubId: number): Hub[] => {
      const hierarchy: Hub[] = [];
      let currentHub = getHub(hubId);

      while (currentHub) {
        hierarchy.unshift(currentHub);
        currentHub = currentHub.parentId ? getHub(currentHub.parentId) : undefined;
      }

      return hierarchy;
    },
    [getHub]
  );

  const getDescendantHubs = useCallback(
    (parentId: number): Hub[] => {
      const descendants: Hub[] = [];
      const directChildren = getSubHubs(parentId);

      for (const child of directChildren) {
        descendants.push(child);
        descendants.push(...getDescendantHubs(child.id));
      }

      return descendants;
    },
    [getSubHubs]
  );

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && hubs.length === 0;
  const isRefreshing = isFetching && hubs.length > 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    hubs,
    isLoading,
    isRefreshing,
    error: errorMessage,
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
    getDescendantHubs,
  };
}

/**
 * Fetch single hub from API
 */
async function fetchHub(hubId: number): Promise<Hub> {
  const response = await discourseApi.getHub(hubId);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load hub');
  }

  return response.data;
}

/**
 * useHub hook - single hub with TanStack Query
 */
export function useHub(hubId: number) {
  const queryClient = useQueryClient();
  const hubQueryKey = queryKeys.hub(hubId);

  const {
    data: hub,
    isLoading: isQueryLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: hubQueryKey,
    queryFn: () => fetchHub(hubId),
    enabled: hubId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const loadHub = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateHub = useCallback(
    (updates: Partial<Hub>) => {
      queryClient.setQueryData<Hub>(hubQueryKey, (old) =>
        old ? { ...old, ...updates } : undefined
      );
    },
    [queryClient, hubQueryKey]
  );

  const isLoading = isQueryLoading && !hub;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    hub: hub ?? null,
    isLoading,
    error: errorMessage,
    loadHub,
    updateHub,
  };
}

// Hook for hub subscription management (unchanged - local state)
export function useHubSubscription() {
  const [subscriptions, setSubscriptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // TODO: Load from AsyncStorage or API
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
      setSubscriptions((prev) => new Set([...prev, hubId]));
      return { success: true };
    } catch (error) {
      console.error('Subscribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      };
    }
  };

  const unsubscribe = async (hubId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Call API to unsubscribe
      setSubscriptions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(hubId);
        return newSet;
      });
      return { success: true };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      };
    }
  };

  const toggleSubscription = async (
    hubId: number
  ): Promise<{ success: boolean; error?: string }> => {
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
    getSubscribedHubs,
  };
}
