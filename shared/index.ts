export { useAuth } from './useAuth';
export { useCreateByte } from './useCreateByte';
export { useFeed } from './useFeed';
export { useSearch } from './useSearch';
export { useCategories } from './useCategories';
export { useTerets } from './useTerets';
export { useRecentTopics } from './useRecentTopics';
export { logger, logError, withLogging } from './logger';

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
  type LoginResponse
} from './discourseApi';

export { 
  useDiscourseUser,
  type UseDiscourseUserReturn 
} from './useDiscourseUser';

