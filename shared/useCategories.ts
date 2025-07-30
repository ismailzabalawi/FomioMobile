import { useState, useCallback, useEffect } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

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

export function useCategories() {
  const [state, setState] = useState<CategoryState>({
    categories: [],
    isLoading: false,
    hasError: false,
  });

  const loadCategories = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
      }));

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

      setState(prev => ({
        ...prev,
        categories,
        isLoading: false,
      }));

      logger.info('Categories loaded successfully', { count: categories.length });

    } catch (error) {
      logger.error('Failed to load categories', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load categories',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    if (state.hasError) {
      loadCategories();
    }
  }, [state.hasError, loadCategories]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    ...state,
    loadCategories,
    retry,
  };
} 