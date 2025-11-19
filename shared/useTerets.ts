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

// CategoryItem represents all categories (both Hubs and Terets) with metadata
export interface CategoryItem {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  text_color: string;
  topic_count: number;
  post_count: number;
  parent_category_id?: number;
  parent_category?: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  read_restricted: boolean;
  permission: number;
  // Indicates if this category is selectable (Teret) or not (Hub)
  isSelectable: boolean;
}

export interface TeretsState {
  terets: Teret[];
  allCategories: CategoryItem[]; // All categories (Hubs + Terets) for display
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function useTerets() {
  const [state, setState] = useState<TeretsState>({
    terets: [],
    allCategories: [],
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

      // Get categories WITH subcategories included
      const response = await discourseApi.getCategories(true);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load terets');
      }

      // DEBUG: Log raw API response structure
      const allCategories = response.data.category_list?.categories || [];
      console.log('🔍 [useTerets] API Response Debug:', {
        hasCategoryList: !!response.data.category_list,
        totalCategories: allCategories.length,
        sampleCategory: allCategories[0] ? {
          id: allCategories[0].id,
          name: allCategories[0].name,
          parent_category_id: allCategories[0].parent_category_id,
          hasParent: !!allCategories[0].parent_category_id,
          hasSubcategoryList: !!allCategories[0].subcategory_list,
          subcategoryListLength: allCategories[0].subcategory_list?.length || 0,
        } : null,
        allCategoryIds: allCategories.map((c: any) => c.id),
        allCategoryNames: allCategories.map((c: any) => c.name),
        categoriesWithParent: allCategories.filter((c: any) => c.parent_category_id).length,
        categoriesWithoutParent: allCategories.filter((c: any) => !c.parent_category_id).length,
        categoriesWithSubcategoryList: allCategories.filter((c: any) => c.subcategory_list && c.subcategory_list.length > 0).length,
      });

      // Handle two possible response structures:
      // 1. Flat list with parent_category_id (when include_subcategories=true)
      // 2. Nested subcategory_list within each category
      
      let flatCategories: any[] = [];
      
      // First, check if categories have subcategory_list (nested structure)
      const hasNestedStructure = allCategories.some((cat: any) => cat.subcategory_list && cat.subcategory_list.length > 0);
      
      if (hasNestedStructure) {
        console.log('🔍 [useTerets] Detected nested subcategory_list structure, flattening...');
        // Flatten nested structure: add parent categories and their subcategories
        allCategories.forEach((cat: any) => {
          // Add the parent category (Hub) - only if it doesn't have a parent itself
          if (!cat.parent_category_id) {
            flatCategories.push({
              ...cat,
              parent_category_id: undefined, // Parent categories don't have parent_category_id
            });
          }
          
          // Add subcategories (Terets) if they exist
          if (cat.subcategory_list && Array.isArray(cat.subcategory_list)) {
            cat.subcategory_list.forEach((subcat: any) => {
              flatCategories.push({
                ...subcat,
                parent_category_id: cat.id, // Set parent to the Hub ID
              });
            });
          }
        });
      } else {
        console.log('🔍 [useTerets] Using flat structure (subcategories have parent_category_id)');
        // Use flat structure (subcategories already have parent_category_id)
        flatCategories = allCategories;
      }

      // Filter for subcategories (terets) - categories with parent_category_id
      const subcategories = flatCategories.filter((cat: any) => cat.parent_category_id);
      console.log('🔍 [useTerets] Subcategories found:', {
        count: subcategories.length,
        subcategoryNames: subcategories.map((c: any) => c.name),
        subcategoryIds: subcategories.map((c: any) => c.id),
      });

      // Build allCategories with metadata (Hubs + Terets)
      const allCategoriesWithMetadata: CategoryItem[] = flatCategories.map((cat: any) => {
        const isSelectable = !!cat.parent_category_id; // Terets are selectable, Hubs are not
        const parentCategory = isSelectable
          ? flatCategories.find((parent: any) => parent.id === cat.parent_category_id)
          : null;

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
          } : undefined,
          read_restricted: cat.read_restricted || false,
          permission: cat.permission || 1,
          isSelectable,
        };
      });

      // Build Terets array (for backward compatibility)
      const terets = subcategories
        .sort((a: any, b: any) => b.topic_count - a.topic_count) // Sort by activity
        .map((cat: any) => {
          // Find parent category
          const parentCategory = flatCategories.find(
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

      console.log('🔍 [useTerets] Final result:', {
        teretsCount: terets.length,
        allCategoriesCount: allCategoriesWithMetadata.length,
        hubsCount: allCategoriesWithMetadata.filter(c => !c.isSelectable).length,
        teretCount: allCategoriesWithMetadata.filter(c => c.isSelectable).length,
      });

      setState(prev => ({
        ...prev,
        terets,
        allCategories: allCategoriesWithMetadata.sort((a, b) => {
          // Sort: Hubs first, then by activity
          if (a.isSelectable !== b.isSelectable) {
            return a.isSelectable ? 1 : -1;
          }
          return b.topic_count - a.topic_count;
        }),
        isLoading: false,
      }));

      logger.info('Terets loaded successfully', { 
        count: terets.length,
        allCategoriesCount: allCategoriesWithMetadata.length,
      });

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