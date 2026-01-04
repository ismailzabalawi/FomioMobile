export { useAuth } from './auth-context';
export { onAuthEvent, emitAuthEvent, type AuthEvent } from './auth-events';
export { storeIntent, attachIntentReplay, type Intent, type IntentType, type IntentHandlers } from './intent-replay';
export { requireAuth } from './requireAuth';
export { useCreateByte } from './useCreateByte';
export { useFeed } from './useFeed';
export { useSearch } from './useSearch';
export { mapSearchResultToItems, type SearchResultItem, type SearchResultItemType } from './search';
export { useCategories } from './useCategories';
export { useTerets } from './useTerets';
export { useRecentTopics } from './useRecentTopics';
export { useTopic } from './useTopic';
export { useComments, useCommentDraft } from './useComments';
export { useHubs, useHub, useHubSubscription } from './useHubs';
export { useNotifications } from './useNotifications';
export { logger, logError, withLogging } from './logger';

// TanStack Query exports
export {
  queryClient,
  queryKeys,
  invalidateQueriesByPrefix,
  prefetchQuery,
  prefetchInfiniteQuery,
  setQueryData,
  getQueryData,
} from './query-client';

// Mutation hooks
export * from './mutations';

// Design System exports
export * from './design-system';

// Performance Optimization exports
export * from './performance-monitor';
export { 
  memoryOptimizer,
  useMemoryOptimization,
  useTrackedTimeout,
  useTrackedInterval,
  useEffectWithCleanup,
} from './memory-optimizer';
export * from './lazy-loading';

// Error Handling & UX exports
export * from './error-handling';
export * from './offline-support';
export * from './form-validation';

// Discourse integration exports
export { 
  discourseApi, 
  DiscourseApiService,
  type DiscourseConfig,
  type DiscourseUser,
  type UserSettings,
  type DiscourseApiResponse,
  type LoginResponse,
  type AppUser,
  type Hub,
  type Byte,
  type Comment,
  type SearchResult
} from './discourseApi';

export { 
  useDiscourseUser,
  type UseDiscourseUserReturn 
} from './useDiscourseUser';
