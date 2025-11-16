import { useState, useCallback, useEffect } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface Teret {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  text_color: string;
  topic_count: number;
  post_count: number;
  parent_category_id: number;
  parent_category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  read_restricted: boolean;
  permission: number;
}

export interface TeretsState {
  terets: Teret[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function useTerets() {
  const [state, setState] = useState<TeretsState>({
    terets: [],
    isLoading: false,
    hasError: false,
  });

  const loadTerets = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
      }));

      // Get categories (which include subcategories/terets)
      const response = await discourseApi.getCategories();
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load terets');
      }

      // Filter for subcategories (terets) - categories with parent_category_id
      const terets = response.data.category_list.categories
        .filter((cat: any) => cat.parent_category_id) // Only subcategories
        .sort((a: any, b: any) => b.topic_count - a.topic_count) // Sort by activity
        .map((cat: any) => {
          // Find parent category
          const parentCategory = response.data.category_list.categories.find(
            (parent: any) => parent.id === cat.parent_category_id
          );

          return {
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            slug: cat.slug,
            color: cat.color || '#000000',
            text_color: cat.text_color || '#ffffff',
            topic_count: cat.topic_count || 0,
            post_count: cat.post_count || 0,
            parent_category_id: cat.parent_category_id,
            parent_category: parentCategory ? {
              id: parentCategory.id,
              name: parentCategory.name,
              color: parentCategory.color || '#000000',
              slug: parentCategory.slug,
            } : {
              id: cat.parent_category_id,
              name: 'Unknown Hub',
              color: '#000000',
              slug: 'unknown',
            },
            read_restricted: cat.read_restricted || false,
            permission: cat.permission || 1,
          };
        });

      setState(prev => ({
        ...prev,
        terets,
        isLoading: false,
      }));

      logger.info('Terets loaded successfully', { count: terets.length });

    } catch (error) {
      logger.error('Failed to load terets', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load terets',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    if (state.hasError) {
      loadTerets();
    }
  }, [state.hasError, loadTerets]);

  // Load terets on mount
  useEffect(() => {
    loadTerets();
  }, [loadTerets]);

  const refreshTerets = useCallback(() => {
    loadTerets();
  }, [loadTerets]);

  return {
    ...state,
    loadTerets,
    retry,
    refreshTerets,
  };
} 