/**
 * Mutations - TanStack Query mutation hooks for write operations
 * 
 * These hooks provide a clean API for creating, updating, and deleting
 * data with automatic cache invalidation.
 */

// Byte mutations
export {
  useCreateByte,
  useLikeByte,
  useUnlikeByte,
  useBookmarkByte,
  useUnbookmarkByte,
  useToggleByteBookmark,
  useSetByteNotificationLevel,
} from './useByteMutations';

// Comment mutations
export {
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useReplyToComment,
} from './useCommentMutations';

