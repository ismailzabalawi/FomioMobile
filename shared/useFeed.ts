import { useState, useEffect, useCallback, useRef } from 'react';
import { discourseApi } from './discourseApi';
import { onAuthEvent } from './auth-events';
import { topicSummaryToByte } from './adapters/topicSummaryToByte';
import { useAuth } from './auth-context';
import type { Byte as FeedByte } from '@/types/byte';

export type FeedItem = FeedByte;

export interface FeedState {
  bytes: FeedByte[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

export interface FeedFilters {
  hubId?: number;
  sortBy?: 'latest' | 'hot' | 'unread';
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export function useFeed(filters: FeedFilters = {}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [feedState, setFeedState] = useState<FeedState>({
    bytes: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    hasMore: true,
    currentPage: 0
  });

  const currentPageRef = useRef(0);
  // Use ref to store filters to prevent unnecessary callback recreations
  const filtersRef = useRef(filters);
  
  // Update ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Load feed data
  const loadFeed = useCallback(async (reset: boolean = false) => {
    // Wait for auth bootstrap to finish so we fetch with the correct API key
    if (isAuthLoading) {
      return;
    }
    
    // Get current filters from ref
    const currentFilters = filtersRef.current;
    
    try {
      if (reset) {
        currentPageRef.current = 0;
        setFeedState(prev => ({ ...prev, isLoading: true, error: null }));
      } else {
        setFeedState(prev => ({ ...prev, isRefreshing: true, error: null }));
      }

      const page = reset ? 0 : currentPageRef.current;

      console.log('🔍 useFeed: Loading feed', { 
        reset, 
        page, 
        hubId: currentFilters.hubId,
        isAuthenticated,
      });

      let queryParams = '';
      let topics: any[] = [];
      let categories: any[] = [];

      if (currentFilters.hubId) {
        // For category, use getCategoryTopics
        const categoryResponse = await discourseApi.getCategoryTopics(String(currentFilters.hubId), page > 0 ? `page=${page}` : '');
        
        if (__DEV__) {
          console.log('🔍 [CategoryFeed] API Response:', {
            hasData: !!categoryResponse.data,
            hasTopicList: !!categoryResponse.data?.topic_list,
            hasTopics: !!categoryResponse.data?.topic_list?.topics,
            topicsCount: categoryResponse.data?.topic_list?.topics?.length || 0,
            hasTopicListCategories: !!categoryResponse.data?.topic_list?.categories,
            topicListCategoriesCount: categoryResponse.data?.topic_list?.categories?.length || 0,
            hasRootCategories: !!categoryResponse.data?.categories,
            rootCategoriesCount: categoryResponse.data?.categories?.length || 0,
          });
        }
        
        if (!categoryResponse.success || !categoryResponse.data?.topic_list?.topics) {
          throw new Error(categoryResponse.error || 'Failed to load feed');
        }
        topics = categoryResponse.data.topic_list.topics;
        // Try to get categories from response first, then fetch separately if needed
        categories = categoryResponse.data.topic_list.categories || categoryResponse.data.categories || [];
        
        // If no categories in response, fetch them separately
        if (categories.length === 0) {
          try {
            const categoriesResponse = await discourseApi.getCategories(true); // includeSubcategories = true
            if (categoriesResponse.success && categoriesResponse.data?.category_list?.categories) {
              categories = categoriesResponse.data.category_list.categories;
              
              if (__DEV__) {
                console.log('🔍 [CategoryFeed] Fetched categories separately:', {
                  categoriesCount: categories.length,
                  hubsCount: categories.filter((c: any) => !c.parent_category_id).length,
                  teretsCount: categories.filter((c: any) => c.parent_category_id).length,
                });
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to fetch categories separately:', error);
          }
        }
        
        if (__DEV__) {
          console.log('🔍 [CategoryFeed] Categories source:', {
            fromTopicList: categoryResponse.data.topic_list.categories?.length || 0,
            fromRoot: categoryResponse.data.categories?.length || 0,
            fromSeparateCall: categories.length > (categoryResponse.data.topic_list.categories?.length || categoryResponse.data.categories?.length || 0),
            using: categories.length,
            sampleCategory: categories[0] ? {
              id: categories[0].id,
              name: categories[0].name,
              hasParent: !!categories[0].parent_category_id,
              parentId: categories[0].parent_category_id,
            } : null,
          });
        }
      } else {
        // For latest feed
        if (page > 0) {
          queryParams = `page=${page}`;
        }
        
        if (__DEV__) {
          console.log('🚀 [useFeed] Fetching latest feed:', {
            page,
            queryParams,
            filters: currentFilters,
            reset,
          });
        }
        
        const rawResponse = await discourseApi.getTopics(queryParams);
        
        if (__DEV__) {
          console.log('📊 [LatestFeed] API Response Analysis:', {
            success: rawResponse.success,
            hasData: !!rawResponse.data,
            hasTopicList: !!rawResponse.data?.topic_list,
            hasTopics: !!rawResponse.data?.topic_list?.topics,
            topicsCount: rawResponse.data?.topic_list?.topics?.length || 0,
            hasTopicListCategories: !!rawResponse.data?.topic_list?.categories,
            topicListCategoriesCount: rawResponse.data?.topic_list?.categories?.length || 0,
            hasRootCategories: !!rawResponse.data?.categories,
            rootCategoriesCount: rawResponse.data?.categories?.length || 0,
            topicListKeys: rawResponse.data?.topic_list ? Object.keys(rawResponse.data.topic_list) : [],
            firstTopicSample: rawResponse.data?.topic_list?.topics?.[0] ? {
              id: rawResponse.data.topic_list.topics[0].id,
              title: rawResponse.data.topic_list.topics[0].title?.substring(0, 50),
              category_id: rawResponse.data.topic_list.topics[0].category_id,
              hasCategory: !!rawResponse.data.topic_list.topics[0].category,
              categoryName: rawResponse.data.topic_list.topics[0].category?.name,
              categoryParentId: rawResponse.data.topic_list.topics[0].category?.parent_category_id,
            } : null,
            error: rawResponse.error,
            status: rawResponse.status,
          });
        }
        
        if (!rawResponse.success || !rawResponse.data?.topic_list?.topics) {
          throw new Error(rawResponse.error || 'Failed to load feed');
        }
        topics = rawResponse.data.topic_list.topics;
        
        if (__DEV__) {
          console.log('📋 [LatestFeed] Topics extracted:', {
            topicsCount: topics.length,
            topicsWithCategoryId: topics.filter((t: any) => t.category_id).length,
            topicsWithoutCategoryId: topics.filter((t: any) => !t.category_id).length,
            uniqueCategoryIds: [...new Set(topics.map((t: any) => t.category_id).filter(Boolean))],
            sampleTopicIds: topics.slice(0, 3).map((t: any) => ({
              id: t.id,
              category_id: t.category_id,
              hasCategory: !!t.category,
            })),
          });
        }
        
        // Try to get categories from response first, then fetch separately if needed
        categories = rawResponse.data.topic_list.categories || rawResponse.data.categories || [];
        
        if (__DEV__) {
          console.log('🏷️ [LatestFeed] Initial category extraction:', {
            fromTopicList: rawResponse.data.topic_list.categories?.length || 0,
            fromRoot: rawResponse.data.categories?.length || 0,
            totalFound: categories.length,
            willFetchSeparately: categories.length === 0,
          });
        }
        
        // If no categories in response, fetch them separately (Discourse /latest.json doesn't always include categories)
        if (categories.length === 0) {
          if (__DEV__) {
            console.log('🔄 [LatestFeed] No categories in response, fetching separately...');
          }
          try {
            const categoriesResponse = await discourseApi.getCategories(true); // includeSubcategories = true
            if (categoriesResponse.success && categoriesResponse.data?.category_list?.categories) {
              categories = categoriesResponse.data.category_list.categories;
              
              if (__DEV__) {
                console.log('✅ [LatestFeed] Categories fetched separately:', {
                  categoriesCount: categories.length,
                  hubsCount: categories.filter((c: any) => !c.parent_category_id).length,
                  teretsCount: categories.filter((c: any) => c.parent_category_id).length,
                  sampleCategories: categories.slice(0, 3).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    isHub: !c.parent_category_id,
                    isTeret: !!c.parent_category_id,
                    parentId: c.parent_category_id,
                  })),
                });
              }
            } else {
              console.warn('⚠️ [LatestFeed] Failed to fetch categories separately:', {
                success: categoriesResponse.success,
                error: categoriesResponse.error,
                hasData: !!categoriesResponse.data,
              });
            }
          } catch (error) {
            console.warn('⚠️ [LatestFeed] Exception fetching categories separately:', error);
          }
        }
        
        if (__DEV__) {
          console.log('🔍 [LatestFeed] Categories source:', {
            fromTopicList: rawResponse.data.topic_list.categories?.length || 0,
            fromRoot: rawResponse.data.categories?.length || 0,
            fromSeparateCall: categories.length > (rawResponse.data.topic_list.categories?.length || rawResponse.data.categories?.length || 0),
            using: categories.length,
            sampleCategory: categories[0] ? {
              id: categories[0].id,
              name: categories[0].name,
              hasParent: !!categories[0].parent_category_id,
              parentId: categories[0].parent_category_id,
            } : null,
          });
        }
      }

      // Build category map from categories array
      // Categories include both:
      // - Hubs: top-level categories (no parent_category_id)
      // - Terets: subcategories (have parent_category_id)
      const categoryMap = new Map();
      categories.forEach((cat: any) => {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          parent_category_id: cat.parent_category_id, // Important: distinguishes Hub vs Teret
        });
      });

      if (__DEV__) {
        console.log('🗺️ [useFeed] Category map built:', {
          categoriesCount: categories.length,
          categoryMapSize: categoryMap.size,
          hubsCount: categories.filter((c: any) => !c.parent_category_id).length,
          teretsCount: categories.filter((c: any) => c.parent_category_id).length,
          sampleCategories: Array.from(categoryMap.entries()).slice(0, 5).map(([id, cat]: [any, any]) => ({
            id,
            name: cat.name,
            color: cat.color,
            isHub: !cat.parent_category_id,
            isTeret: !!cat.parent_category_id,
            parentId: cat.parent_category_id,
          })),
          firstTopicCategoryId: topics[0]?.category_id,
          firstTopicHasCategory: !!categoryMap.get(topics[0]?.category_id),
          topicsWithCategories: topics.filter(t => categoryMap.has(t.category_id)).length,
          topicsWithoutCategories: topics.filter(t => !categoryMap.has(t.category_id)).length,
          missingCategoryIds: [...new Set(topics
            .filter(t => t.category_id && !categoryMap.has(t.category_id))
            .map(t => t.category_id))],
        });
      }

      // Enrich topics with category data before mapping
      // Also include parent hub if this is a teret (subcategory)
      if (__DEV__) {
        console.log('🔄 [useFeed] Enriching topics with category data...');
      }
      
      const enrichedTopics = topics.map((topic: any) => {
        // Safely get category - handle null/undefined category_id
        const category = (topic.category_id != null) 
          ? (categoryMap.get(topic.category_id) || null)
          : null;
        let parentHub = null;
        
        // If this is a teret (has parent_category_id), find the parent hub
        if (category?.parent_category_id) {
          parentHub = categoryMap.get(category.parent_category_id) || null;
          
          if (__DEV__ && !parentHub) {
            console.warn(`⚠️ [useFeed] Teret ${category.name} (ID: ${category.id}) has parent_category_id ${category.parent_category_id} but parent not found in category map`);
          }
        }
        
        return {
          ...topic,
          category,
          parentHub, // Add parent hub for terets
        };
      });

      if (__DEV__) {
        console.log('✨ [useFeed] Topics enriched:', {
          totalTopics: enrichedTopics.length,
          topicsWithCategory: enrichedTopics.filter(t => t.category).length,
          topicsWithoutCategory: enrichedTopics.filter(t => !t.category).length,
          topicsWithParentHub: enrichedTopics.filter(t => t.parentHub).length,
          topicsWithDirectHub: enrichedTopics.filter(t => t.category && !t.category.parent_category_id).length,
          topicsWithTeret: enrichedTopics.filter(t => t.category && t.category.parent_category_id).length,
          sampleEnriched: enrichedTopics.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title?.substring(0, 40),
            categoryId: t.category_id,
            hasCategory: !!t.category,
            categoryName: t.category?.name,
            categoryParentId: t.category?.parent_category_id,
            isHub: !t.category?.parent_category_id,
            isTeret: !!t.category?.parent_category_id,
            hasParentHub: !!t.parentHub,
            parentHubName: t.parentHub?.name,
            parentHubId: t.parentHub?.id,
          })),
        });
      }

      // Map topics to bytes using simple summary adapter
      // No user resolution - adapter uses data directly from API response
      if (__DEV__) {
        console.log('🔄 [useFeed] Transforming topics to bytes...');
      }
      
      const newBytes: FeedByte[] = enrichedTopics
        .map((topic: any) => {
          try {
            const byte = topicSummaryToByte(topic);
            // Validate byte has required fields
            if (!byte || !byte.id || !byte.title) {
              console.warn(`⚠️ [useFeed] Invalid byte created for topic ${topic.id}: missing id or title`);
              return null;
            }
            return byte;
          } catch (error) {
            console.error(`❌ [useFeed] Failed to transform topic ${topic.id} to byte:`, error);
            // Return null instead of a fallback byte - we'll filter these out
            return null;
          }
        })
        .filter((byte): byte is FeedByte => byte !== null && byte !== undefined && !!byte.title);

      // Validate bytes have badge data
      if (__DEV__) {
        const bytesWithHubs = newBytes.filter(b => b.hub).length;
        const bytesWithTerets = newBytes.filter(b => b.teret).length;
        const bytesWithBoth = newBytes.filter(b => b.hub && b.teret).length;
        const bytesWithNeither = newBytes.filter(b => !b.hub && !b.teret).length;
        
        console.log('✅ [useFeed] Bytes created and validated:', {
          totalBytes: newBytes.length,
          bytesWithHubs,
          bytesWithTerets,
          bytesWithBoth,
          bytesWithNeither,
          bytesWithNeitherPercentage: newBytes.length > 0 ? ((bytesWithNeither / newBytes.length) * 100).toFixed(1) + '%' : '0%',
          sampleBytes: newBytes.slice(0, 5).map(b => ({
            id: b.id,
            title: b.title?.substring(0, 30),
            hasHub: !!b.hub,
            hubName: b.hub?.name,
            hubColor: b.hub?.color,
            hubId: b.hub?.id,
            hasTeret: !!b.teret,
            teretName: b.teret?.name,
            teretColor: b.teret?.color,
            teretId: b.teret?.id,
            badgeSummary: `${b.hub ? 'Hub:' + b.hub.name : ''} ${b.teret ? 'Teret:' + b.teret.name : ''}`.trim() || 'None',
          })),
        });
        
        if (bytesWithNeither > 0) {
          console.warn(`⚠️ [useFeed] ${bytesWithNeither} bytes have no badges (neither Hub nor Teret)`);
          const bytesWithoutBadges = newBytes.filter(b => !b.hub && !b.teret).slice(0, 3);
          bytesWithoutBadges.forEach(b => {
            console.warn(`  - Byte ${b.id}: "${b.title?.substring(0, 40)}" - no badges`);
          });
        }
      }

      console.log('🔍 useFeed: Response received', {
        success: true,
        bytesCount: newBytes.length,
      });

      if (newBytes.length > 0) {
        currentPageRef.current = page + 1;
        
        setFeedState(prev => ({
          ...prev,
          bytes: reset ? newBytes : [...prev.bytes, ...newBytes],
          isLoading: false,
          isRefreshing: false,
          hasMore: newBytes.length === 20, // If we got a full page, there might be more
          currentPage: currentPageRef.current,
          error: null
        }));
        
        console.log('✅ useFeed: Successfully loaded', newBytes.length, 'bytes');
      } else {
        // Don't throw error - just log and set empty state
        // Only set error if we have no bytes at all (first load)
        console.warn('⚠️ [useFeed] No bytes returned from feed');
        setFeedState(prev => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          hasMore: false,
          error: prev.bytes.length === 0 ? 'No posts available' : null // Only set error if we have no bytes at all
        }));
      }
    } catch (error) {
      console.error('❌ useFeed: Exception caught', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load feed';
      setFeedState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage
      }));
    }
  }, [isAuthLoading, isAuthenticated]);

  // Refresh feed - stable callback that doesn't depend on loadFeed
  const refresh = useCallback(async () => {
    const currentFilters = filtersRef.current;
    if (isAuthLoading) return;
    
    try {
      currentPageRef.current = 0;
      setFeedState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call loadFeed logic inline to avoid dependency issues
      // This is essentially the same as loadFeed(true) but without the callback dependency
      await loadFeed(true);
    } catch (error) {
      console.error('❌ [useFeed] Refresh failed:', error);
    }
  }, [isAuthLoading, loadFeed]);

  // Load initial feed
  // Remove loadFeed from dependencies to prevent infinite loops
  // Use filtersRef to get current filters without depending on filters object
  useEffect(() => {
    if (!isAuthLoading) {
      loadFeed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hubId, filters.sortBy, isAuthLoading, isAuthenticated]);

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        refresh();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (!feedState.isLoading && !feedState.isRefreshing && feedState.hasMore) {
      await loadFeed(false);
    }
  }, [loadFeed, feedState.isLoading, feedState.isRefreshing, feedState.hasMore]);

  // Retry on error
  const retry = useCallback(async () => {
    await loadFeed(true);
  }, [loadFeed]);

  return {
    // Feed data
    items: feedState.bytes,
    
    // Loading states
    isLoading: feedState.isLoading,
    isRefreshing: feedState.isRefreshing,
    hasMore: feedState.hasMore,
    
    // Error handling
    hasError: !!feedState.error,
    errorMessage: feedState.error,
    
    // Actions
    refresh,
    loadMore,
    retry,
    
    // Filters
    currentFilters: filters
  };
}
