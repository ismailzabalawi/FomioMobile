// Hook to fetch user's drafts
// Only available for own profile (no username parameter, uses current user)

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from '../discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';

export interface UseUserDraftsReturn {
  drafts: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  refresh: () => Promise<void>;
}

export function useUserDrafts(): UseUserDraftsReturn {
  const [drafts, setDrafts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(undefined);

    try {
      const response = await discourseApi.getUserDrafts();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load drafts');
      }

      // Transform drafts to PostItem format
      const draftsList = response.data.drafts || [];
      const mappedDrafts: PostItem[] = draftsList.map((draft: any) => {
        const rawDraft = draft.draft || draft.data;
        let parsedDraft: any = {};

        try {
          parsedDraft =
            typeof rawDraft === 'string'
              ? JSON.parse(rawDraft)
              : rawDraft && typeof rawDraft === 'object'
                ? rawDraft
                : {};
        } catch {
          parsedDraft = {};
        }

        const title = draft.title || parsedDraft.title || parsedDraft.raw || 'Untitled Draft';
        const rawContent = parsedDraft.raw || parsedDraft.reply || '';
        const categoryId = parsedDraft.category_id || draft.category_id;

        return {
          id: draft.id || 0,
          title,
          hubName: draft.category?.name || 'Uncategorized',
          teretName: draft.category?.slug,
          author: {
            name: draft.user?.name || draft.user?.username || 'You',
            avatar: draft.user?.avatar_template
              ? discourseApi.getAvatarUrl(draft.user.avatar_template, 120)
              : '',
          },
          replyCount: 0,
          likeCount: 0,
          createdAt: draft.created_at || new Date().toISOString(),
          lastPostedAt: draft.updated_at || draft.created_at,
          isBookmarked: false,
          hasMedia: false,
          slug: `draft/${draft.id}`,
          draftKey: draft.draft_key || draft.draftKey,
          draftSequence: draft.sequence ?? draft.draft_sequence ?? 0,
          rawContent,
          categoryId,
        };
      });

      setDrafts(mappedDrafts);
    } catch (error) {
      setHasError(true);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load drafts'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  return {
    drafts,
    isLoading,
    hasError,
    errorMessage,
    refresh,
  };
}
