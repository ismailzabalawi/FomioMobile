import { useState, useCallback, useRef } from 'react';
import { discourseApi, SearchResult } from './discourseApi';

export interface SearchState {
  results: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  query: string;
  hasSearched: boolean;
}

export interface SearchFilters {
  hubId?: number;
  order?: 'relevance' | 'latest' | 'views' | 'likes';
  limit?: number;
}

export function useSearch() {
  const [searchState, setSearchState] = useState<SearchState>({
    results: null,
    isSearching: false,
    error: null,
    query: '',
    hasSearched: false
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (
    query: string,
    filters: SearchFilters = {}
  ): Promise<{ success: boolean; error?: string }> => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        results: null,
        query: '',
        hasSearched: false,
        error: null
      }));
      return { success: true };
    }

    try {
      setSearchState(prev => ({
        ...prev,
        isSearching: true,
        error: null,
        query: query.trim()
      }));

      const response = await discourseApi.search(query.trim(), filters);

      if (response.success && response.data) {
        // response.data is now properly typed as SearchResult
        setSearchState(prev => ({
          ...prev,
          results: response.data as SearchResult,
          isSearching: false,
          hasSearched: true,
          error: null
        }));

        return { success: true };
      } else {
        // Extract detailed error information from backend
        const errorMessage = response.error || 
          (response.errors && response.errors.length > 0 
            ? response.errors.join(', ') 
            : 'Search failed');
        
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          hasSearched: true,
          error: errorMessage
        }));

        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        hasSearched: true,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const searchWithDebounce = useCallback(
    (query: string, filters: SearchFilters = {}, delay: number = 500) => {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        search(query, filters);
      }, delay);
    },
    []
  );

  const clearSearch = () => {
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setSearchState({
      results: null,
      isSearching: false,
      error: null,
      query: '',
      hasSearched: false
    });
  };

  const clearError = () => {
    setSearchState(prev => ({ ...prev, error: null }));
  };

  // Helper functions for accessing search results
  const getBytes = () => {
    return searchState.results?.bytes || [];
  };

  const getComments = () => {
    return searchState.results?.comments || [];
  };

  const getUsers = () => {
    return searchState.results?.users || [];
  };

  const getHubs = () => {
    return searchState.results?.hubs || [];
  };

  const getTotalResults = () => {
    return searchState.results?.totalResults || 0;
  };

  const hasResults = () => {
    return getTotalResults() > 0;
  };

  const isEmpty = () => {
    return searchState.hasSearched && !hasResults() && !searchState.isSearching;
  };

  const retry = () => {
    if (searchState.query) {
      search(searchState.query);
    }
  };

  return {
    ...searchState,
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
    isLoading: searchState.isSearching,
    hasError: !!searchState.error,
    error: searchState.error, // Expose error message for UI display
    quickSearch: search,
    advancedSearch: search,
    searchType: 'all',
    filters: {}
  };
}

// Hook for search suggestions/autocomplete
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
      // For now, return mock suggestions
      const mockSuggestions = [
        `${query} tutorial`,
        `${query} guide`,
        `${query} tips`,
        `${query} best practices`,
        `${query} examples`
      ].filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()));

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
    clearSuggestions
  };
}

// Hook for search history
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load history from storage on mount
  // useEffect(() => {
  //   loadHistory();
  // }, []);

  const loadHistory = async () => {
    try {
      // TODO: Load from AsyncStorage
      // For now, using empty array
      setHistory([]);
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const addToHistory = async (query: string) => {
    if (!query.trim()) return;

    try {
      const trimmedQuery = query.trim();
      
      setHistory(prev => {
        // Remove if already exists
        const filtered = prev.filter(item => item !== trimmedQuery);
        // Add to beginning
        const newHistory = [trimmedQuery, ...filtered];
        // Keep only last 20 items
        return newHistory.slice(0, 20);
      });

      // TODO: Save to AsyncStorage
    } catch (error) {
      console.error('Failed to add to search history:', error);
    }
  };

  const removeFromHistory = async (query: string) => {
    try {
      setHistory(prev => prev.filter(item => item !== query));
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
    getRecentSearches
  };
}

