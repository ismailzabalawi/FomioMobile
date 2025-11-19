import { create } from 'zustand';

interface BookmarkStore {
  bookmarks: Set<number>;
  toggleBookmark: (topicId: number, isBookmarked: boolean) => void;
  isBookmarked: (topicId: number) => boolean;
}

/**
 * Global bookmark sync store using Zustand
 * Keeps bookmark state synchronized across ByteCard, ByteBlogPage, and StickyActionBar
 */
export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: new Set<number>(),
  
  toggleBookmark: (topicId: number, isBookmarked: boolean) => {
    set((state) => {
      const newBookmarks = new Set(state.bookmarks);
      if (isBookmarked) {
        newBookmarks.add(topicId);
      } else {
        newBookmarks.delete(topicId);
      }
      return { bookmarks: newBookmarks };
    });
  },
  
  isBookmarked: (topicId: number) => {
    return get().bookmarks.has(topicId);
  },
}));

