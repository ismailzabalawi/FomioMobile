/**
 * Optimistic engagement store for preserving local like/bookmark state
 * during hydration to prevent flicker when user interacts before full topic loads
 */

interface EngagementState {
  isLiked?: boolean;
  isBookmarked?: boolean;
}

class OptimisticEngagementStore {
  private store = new Map<number, EngagementState>();

  /**
   * Get local like state for a byte
   */
  getLocalLike(byteId: number): boolean | undefined {
    return this.store.get(byteId)?.isLiked;
  }

  /**
   * Get local bookmark state for a byte
   */
  getLocalBookmark(byteId: number): boolean | undefined {
    return this.store.get(byteId)?.isBookmarked;
  }

  /**
   * Set local like state for a byte
   */
  setLocalLike(byteId: number, isLiked: boolean): void {
    const current = this.store.get(byteId) || {};
    this.store.set(byteId, { ...current, isLiked });
  }

  /**
   * Set local bookmark state for a byte
   */
  setLocalBookmark(byteId: number, isBookmarked: boolean): void {
    const current = this.store.get(byteId) || {};
    this.store.set(byteId, { ...current, isBookmarked });
  }

  /**
   * Clear local state for a byte (e.g., after successful server sync)
   */
  clear(byteId: number): void {
    this.store.delete(byteId);
  }

  /**
   * Clear all local state
   */
  clearAll(): void {
    this.store.clear();
  }
}

// Singleton instance
export const optimisticEngagementStore = new OptimisticEngagementStore();

