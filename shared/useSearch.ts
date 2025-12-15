/**
 * useSearch Hook - Search with TanStack Query
 * 
 * Uses useQuery for search results with caching.
 * Debounce is handled at the UI layer via the query string.
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi, SearchResult } from './discourseApi';
import { queryKeys } from './query-client';

export interface SearchState {
  results: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  query: string;
  hasSearched: boolean;
}

export interface SearchFilters {
  type?: 'topic' | 'category' | 'user' | 'all';
  order?: 'relevance' | 'latest' | 'views' | 'likes' | 'created' | 'updated';
  limit?: number;
  period?: 'all' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
}

/**
 * Fetch search results from API
 */
async function fetchSearchResults(
  query: string,
  filters: SearchFilters
): Promise<SearchResult> {
  const response = await discourseApi.search(query.trim(), filters);

  if (!response.success) {
    const errorMessage =
      response.error ||
      (response.errors && response.errors.length > 0
        ? response.errors.join(', ')
        : 'Search failed');
    throw new Error(errorMessage);
  }

  return response.data as SearchResult;
}

/**
 * useSearch hook with TanStack Query
 * 
 * Provides search results with caching. Maintains backward compatible interface.
 */
export function useSearch() {
  const queryClient = useQueryClient();
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchQueryKey = queryKeys.search(currentQuery, currentFilters);

  const {
    data: results,
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: searchQueryKey,
    queryFn: () => fetchSearchResults(currentQuery, currentFilters),
    enabled: currentQuery.trim().length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes - search results are stable
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false, // Don't refetch on mount for search
  });

  // Search function - updates the query state
  const search = useCallback(
    async (
      query: string,
      filters: SearchFilters = {}
    ): Promise<{ success: boolean; error?: string }> => {
      if (!query.trim()) {
        setCurrentQuery('');
        setCurrentFilters({});
        setHasSearched(false);
        return { success: true };
      }

      setCurrentQuery(query.trim());
      setCurrentFilters(filters);
      setHasSearched(true);

      // The query will be executed automatically by React Query
      // due to the state change above
      return { success: true };
    },
    []
  );

  // Debounced search
  const searchWithDebounce = useCallback(
    (query: string, filters: SearchFilters = {}, delay: number = 500) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        search(query, filters);
      }, delay);
    },
    [search]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setCurrentQuery('');
    setCurrentFilters({});
    setHasSearched(false);
  }, []);

  const clearError = useCallback(() => {
    // Error is managed by React Query, this is kept for compatibility
  }, []);

  // Helper functions
  const getBytes = useCallback(() => results?.bytes || [], [results]);
  const getComments = useCallback(() => results?.comments || [], [results]);
  const getUsers = useCallback(() => results?.users || [], [results]);
  const getHubs = useCallback(() => results?.hubs || [], [results]);
  const getTotalResults = useCallback(() => results?.totalResults || 0, [results]);
  const hasResults = useCallback(() => getTotalResults() > 0, [getTotalResults]);
  const isEmpty = useCallback(
    () => hasSearched && !hasResults() && !isFetching,
    [hasSearched, hasResults, isFetching]
  );

  const retry = useCallback(() => {
    if (currentQuery) {
      refetch();
    }
  }, [currentQuery, refetch]);

  // Compute states for backward compatibility
  const isSearching = isQueryLoading || isFetching;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    results: results ?? null,
    isSearching,
    error: errorMessage,
    query: currentQuery,
    hasSearched,
    search,
    searchWithDebounce,
    clearSearch,
    clearError,
    getBytes,
    getComments,
    getUsers,
    getHubs,
    getTotalResults,
    hasResults,
    isEmpty,
    retry,
    isLoading: isSearching,
    hasError: !!error,
    quickSearch: search,
    advancedSearch: search,
  };
}

// Hook for search suggestions/autocomplete (unchanged - mock implementation)
export function useSearchSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = async (query: string): Promise<string[]> => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return [];
    }

    try {
      setIsLoading(true);

      // TODO: Implement actual suggestions API
      const mockSuggestions = [
        `${query} tutorial`,
        `${query} guide`,
        `${query} tips`,
        `${query} best practices`,
        `${query} examples`,
      ].filter((suggestion) =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      );

      setSuggestions(mockSuggestions);
      return mockSuggestions;
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions,
    isLoading,
    getSuggestions,
    clearSuggestions,
  };
}

// Hook for search history (unchanged - local state)
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  const loadHistory = async () => {
    try {
      // TODO: Load from AsyncStorage
      setHistory([]);
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const addToHistory = async (query: string) => {
    if (!query.trim()) return;

    try {
      const trimmedQuery = query.trim();

      setHistory((prev) => {
        const filtered = prev.filter((item) => item !== trimmedQuery);
        const newHistory = [trimmedQuery, ...filtered];
        return newHistory.slice(0, 20);
      });

      // TODO: Save to AsyncStorage
    } catch (error) {
      console.error('Failed to add to search history:', error);
    }
  };

  const removeFromHistory = async (query: string) => {
    try {
      setHistory((prev) => prev.filter((item) => item !== query));
      // TODO: Save to AsyncStorage
    } catch (error) {
      console.error('Failed to remove from search history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      // TODO: Clear from AsyncStorage
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const getRecentSearches = (limit: number = 10): string[] => {
    return history.slice(0, limit);
  };

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentSearches,
  };
}
