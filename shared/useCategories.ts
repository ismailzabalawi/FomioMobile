/**
 * useCategories Hook - Categories data fetching with TanStack Query
 * 
 * Uses useQuery for categories data with caching and long stale time
 * since categories rarely change.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { logger } from './logger';
import { queryKeys } from './query-client';

export interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  text_color: string;
  topic_count: number;
  post_count: number;
  read_restricted: boolean;
  permission: number;
  topic_list: {
    topics: Array<{
      id: number;
      title: string;
      posts_count: number;
      reply_count: number;
      created_at: string;
      last_posted_at: string;
      bumped: boolean;
      bumped_at: string;
      excerpt: string;
      visible: boolean;
      closed: boolean;
      archived: boolean;
      bookmarked: boolean;
      liked: boolean;
      tags: string[];
      like_count: number;
      views: number;
      category_id: number;
      posters: Array<{
        extras: string;
        description: string;
        user: {
          id: number;
          username: string;
          name: string;
          avatar_template: string;
        };
      }>;
    }>;
  };
}

export interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Fetch and transform categories from API
 */
async function fetchCategories(): Promise<Category[]> {
  const response = await discourseApi.getCategories();

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load categories');
  }

  const categories = response.data.category_list.categories
    .filter((cat: any) => !cat.parent_category_id) // Only show parent categories (hubs)
    .sort((a: any, b: any) => b.topic_count - a.topic_count) // Sort by topic count
    .map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || '',
      slug: cat.slug,
      color: cat.color || '#000000',
      text_color: cat.text_color || '#ffffff',
      topic_count: cat.topic_count || 0,
      post_count: cat.post_count || 0,
      read_restricted: cat.read_restricted || false,
      permission: cat.permission || 1,
      topic_list: cat.topic_list || { topics: [] },
    }));

  logger.info('Categories loaded successfully', { count: categories.length });

  return categories;
}

/**
 * useCategories hook with TanStack Query
 * 
 * Provides categories data with caching. Categories rarely change so we use
 * a long stale time.
 */
export function useCategories() {
  const queryClient = useQueryClient();
  const categoriesQueryKey = queryKeys.categories();

  const {
    data: categories = [],
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
  });

  // Load/refresh categories
  const loadCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
  }, [queryClient, categoriesQueryKey]);

  // Retry on error
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && categories.length === 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    categories,
    isLoading,
    hasError: !!error,
    errorMessage,
    loadCategories,
    retry,
  };
}
