# Fomio Caching Guide

## Overview

Fomio uses **TanStack Query (React Query)** as the primary caching and data fetching solution. This guide outlines the rules, patterns, and best practices for working with the caching system.

## Core Principles

### 1. Use TanStack Query for All Data Fetching
- ✅ **DO**: Use `useQuery` or `useInfiniteQuery` for all read operations
- ✅ **DO**: Use `useMutation` for all write operations (create, update, delete)
- ❌ **DON'T**: Use manual `useState` + `useEffect` for data fetching
- ❌ **DON'T**: Use the deprecated `useOfflineData` hook

### 2. Query Key Consistency
Always use the `queryKeys` factory from `shared/query-client.ts`:

```typescript
import { queryKeys } from '@/shared/query-client';

// ✅ Good - Type-safe and consistent
const { data } = useQuery({
  queryKey: queryKeys.topic(topicId),
  queryFn: () => fetchTopic(topicId),
});

// ❌ Bad - Manual keys can cause cache misses
const { data } = useQuery({
  queryKey: ['topic', topicId], // Inconsistent with factory
  queryFn: () => fetchTopic(topicId),
});
```

### 3. Stale Time Configuration

**Default Stale Times:**
- **Feed data**: 1 minute (frequently changing)
- **Topic/Byte details**: 1 minute (may have new comments)
- **Comments**: 10 seconds (very dynamic)
- **Hubs/Categories**: 5 minutes (rarely change)
- **Notifications**: 10 seconds (real-time updates)
- **User activity**: 1 minute (moderate updates)
- **Search results**: 1 minute (stable after search)

**When to Override:**
- Override `staleTime` in query options for data that changes more/less frequently
- Use longer stale times for static reference data (e.g., categories)
- Use shorter stale times for real-time data (e.g., notifications)

```typescript
// Example: Override stale time for a specific query
useQuery({
  queryKey: queryKeys.topic(topicId),
  queryFn: () => fetchTopic(topicId),
  staleTime: 5 * 60 * 1000, // 5 minutes for this specific query
});
```

### 4. Garbage Collection Time (gcTime)

**Default**: 30 minutes (data kept in cache even when unused)

**Rules:**
- Keep default for most queries
- Increase for expensive-to-fetch data (e.g., user profiles)
- Decrease for memory-sensitive scenarios

### 5. Refetch Behavior

**Default Configuration:**
- `refetchOnMount: 'always'` - Always refetch when component mounts (shows cached data first)
- `refetchOnWindowFocus: false` - Don't refetch on app focus (mobile-specific)
- `refetchOnReconnect: true` - Refetch when network reconnects

**When to Override:**
- Set `refetchOnMount: false` for expensive queries that don't need fresh data
- Set `refetchOnWindowFocus: true` if you want fresh data when app regains focus

### 6. Mutations and Cache Invalidation

**Always invalidate related queries after mutations:**

```typescript
// ✅ Good - Invalidates related queries
const mutation = useMutation({
  mutationFn: createByte,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    queryClient.invalidateQueries({ queryKey: ['userActivity'] });
  },
});
```

**Use Optimistic Updates for Better UX:**

```typescript
// ✅ Good - Optimistic update with rollback
const likeMutation = useMutation({
  mutationFn: likeByte,
  onMutate: async (byteId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.topic(byteId) });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKeys.topic(byteId));
    
    // Optimistically update
    queryClient.setQueryData(queryKeys.topic(byteId), (old) => ({
      ...old,
      likeCount: old.likeCount + 1,
      isLiked: true,
    }));
    
    return { previous };
  },
  onError: (err, byteId, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKeys.topic(byteId), context.previous);
  },
  onSettled: (data, error, byteId) => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
  },
});
```

### 7. Infinite Queries for Pagination

**Use `useInfiniteQuery` for paginated data:**

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: queryKeys.feed(filters),
  queryFn: ({ pageParam = 0 }) => fetchFeed(pageParam, filters),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextPage,
  staleTime: 1 * 60 * 1000, // 1 minute
});
```

**Accessing Data:**
```typescript
// Flatten pages into single array
const allItems = data?.pages.flatMap((page) => page.items) || [];

// Or use the helper from useFeed hook
const { items } = useFeed(filters);
```

### 8. API-Level Caching

The `discourseApi.ts` maintains an in-memory cache with configurable TTLs per endpoint:

```typescript
// Configured in discourseApi.ts
CACHE_CONFIG = new Map([
  ['/categories.json', 5 * 60 * 1000], // 5 minutes
  ['/notifications.json', 10 * 1000],  // 10 seconds
  // ...
]);
```

**Rules:**
- API cache is a first-level cache (before network request)
- TanStack Query cache is a second-level cache (after network request)
- API cache TTLs should be shorter than TanStack Query stale times
- This provides instant responses for recently fetched data

### 9. Prefetching

Use prefetching to improve perceived performance:

```typescript
import { prefetchQuery } from '@/shared/query-client';

// Prefetch topic when user hovers over a link
const handlePress = () => {
  prefetchQuery(
    queryKeys.topic(topicId),
    () => fetchTopic(topicId)
  );
  router.push(`/byte/${topicId}`);
};
```

### 10. Error Handling

**Query Errors:**
```typescript
const { data, error, isError } = useQuery({
  queryKey: queryKeys.topic(topicId),
  queryFn: () => fetchTopic(topicId),
});

if (isError) {
  // Handle error (show error state, retry button, etc.)
}
```

**Mutation Errors:**
```typescript
const mutation = useMutation({
  mutationFn: createByte,
  onError: (error) => {
    // Show error toast, log error, etc.
    logger.error('Failed to create byte:', error);
  },
});
```

### 11. Loading States

**Query Loading States:**
- `isLoading`: True on first fetch (no cached data)
- `isFetching`: True whenever a fetch is in progress (including background refetches)
- `isRefetching`: True when refetching in background (has cached data)

**Use Appropriate State:**
```typescript
// Show skeleton on initial load
if (isLoading) return <Skeleton />;

// Show subtle indicator on background refetch
if (isRefetching) return <View><Content /><RefreshIndicator /></View>;

// Show full content
return <Content data={data} />;
```

### 12. Disabling Queries

**Conditional Fetching:**
```typescript
// Only fetch when user is authenticated
const { data } = useQuery({
  queryKey: queryKeys.userPosts(username),
  queryFn: () => fetchUserPosts(username),
  enabled: !!username && isAuthenticated,
});
```

### 13. Query Invalidation Patterns

**Invalidate Specific Query:**
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
```

**Invalidate All Queries with Prefix:**
```typescript
queryClient.invalidateQueries({ queryKey: ['feed'] }); // Invalidates all feed queries
```

**Invalidate on Mutation Success:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
}
```

## Common Patterns

### Pattern 1: Feed with Filters
```typescript
const { items, isLoading, loadMore, refresh } = useFeed({
  hubId: selectedHubId,
  sortBy: 'latest',
});
```

### Pattern 2: Single Topic with Comments
```typescript
const { topic, isLoading } = useTopic(topicId);
const { comments, isLoading: commentsLoading } = useComments(topicId);
```

### Pattern 3: Search with Debouncing
```typescript
const { query, results, isSearching, search } = useSearch();
// Debouncing is handled internally via useDeferredValue
```

### Pattern 4: User Activity
```typescript
const { items, isLoading, loadMore } = useUserActivity(username, 'topics');
// Activity types: 'topics', 'replies', 'likes', 'bookmarks', etc.
```

## Migration Checklist

When migrating existing code to TanStack Query:

- [ ] Replace `useState` + `useEffect` with `useQuery` or `useInfiniteQuery`
- [ ] Use `queryKeys` factory for query keys
- [ ] Set appropriate `staleTime` and `gcTime`
- [ ] Handle loading states (`isLoading`, `isFetching`, `isRefetching`)
- [ ] Handle error states
- [ ] Replace write operations with `useMutation`
- [ ] Add optimistic updates where appropriate
- [ ] Invalidate related queries on mutation success
- [ ] Remove manual cache management code
- [ ] Test offline behavior
- [ ] Test background refetching

## Debugging

### View Cache State
```typescript
import { getCacheStats } from '@/shared/query-client';

const stats = getCacheStats();
console.log('Cache size:', stats.size);
console.log('Queries:', stats.queries);
```

### Clear Cache
```typescript
import { clearQueryCache } from '@/shared/query-client';

clearQueryCache(); // Clears all cached queries
```

### Enable Devtools (Development Only)
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to app/_layout.tsx in development
{__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
```

## Anti-Patterns to Avoid

❌ **Don't manually manage cache:**
```typescript
// ❌ Bad
const [cache, setCache] = useState(new Map());
const cached = cache.get(key);
if (cached) return cached;
```

❌ **Don't use different query keys for the same data:**
```typescript
// ❌ Bad - Causes duplicate requests
useQuery({ queryKey: ['topic', id] });
useQuery({ queryKey: ['byte', id] }); // Same data, different key
```

❌ **Don't forget to invalidate on mutations:**
```typescript
// ❌ Bad - Cache becomes stale
const mutation = useMutation({
  mutationFn: createByte,
  // Missing onSuccess invalidation
});
```

❌ **Don't use stale data without refetching:**
```typescript
// ❌ Bad - May show outdated data
const { data } = useQuery({
  queryKey: queryKeys.topic(id),
  queryFn: fetchTopic,
  staleTime: Infinity, // Never refetches
});
```

## Performance Tips

1. **Use `getItemLayout` for FlatList with fixed item heights** (reduces layout calculations)
2. **Prefetch data on user interaction** (hover, press) for faster navigation
3. **Use `select` to transform data** (prevents unnecessary re-renders)
4. **Keep query keys stable** (don't include changing values like timestamps)
5. **Use `keepPreviousData` for pagination** (smooth transitions between pages)

## Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- Internal: `shared/query-client.ts` for configuration and utilities

