// Tab component for "Drafts" activity - only visible for own profile

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Trash, PencilSimple, PaperPlaneTilt, Warning } from 'phosphor-react-native';
import { useUserDrafts } from '@/shared/hooks/useUserDrafts';
import { useTheme } from '@/components/theme';
import { PostItem } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { discourseApi } from '@/shared/discourseApi';
import { formatTimeAgo } from '@/lib/utils/time';

export interface ProfileActivityDraftsTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

interface DraftCardProps {
  draft: PostItem;
  onEdit: () => void;
  onPost: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function DraftCard({ draft, onEdit, onPost, onDelete, isDeleting }: DraftCardProps) {
  const { isDark } = useTheme();
  const muted = isDark ? '#9ca3af' : '#6b7280';

  return (
    <View className="mb-3 p-4 rounded-fomio-card bg-fomio-card dark:bg-fomio-card-dark">
      <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
        {draft.title}
      </Text>
      <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1">
        {draft.hubName}
      </Text>
      {draft.lastPostedAt && (
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1">
          Saved {formatTimeAgo(draft.lastPostedAt)}
        </Text>
      )}

      <View className="flex-row mt-3 space-x-3">
        <TouchableOpacity
          onPress={onEdit}
          className="px-3 py-2 rounded-full bg-fomio-muted/20 dark:bg-fomio-muted-dark/20"
        >
          <View className="flex-row items-center space-x-2">
            <PencilSimple size={16} color={muted} weight="regular" />
            <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
              Edit
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPost}
          className="px-3 py-2 rounded-full bg-fomio-accent/15 dark:bg-fomio-accent-dark/15"
        >
          <View className="flex-row items-center space-x-2">
            <PaperPlaneTilt size={16} color={isDark ? '#34d399' : '#059669'} weight="regular" />
            <Text className="text-caption text-fomio-accent dark:text-fomio-accent-dark">
              Post
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          disabled={isDeleting}
          className="px-3 py-2 rounded-full bg-fomio-danger/10 dark:bg-fomio-danger-dark/10"
        >
          <View className="flex-row items-center space-x-2">
            <Trash size={16} color="#ef4444" weight="regular" />
            <Text className="text-caption text-fomio-danger dark:text-fomio-danger-dark">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ProfileActivityDraftsTab({
  isOwnProfile,
  isAuthenticated,
}: ProfileActivityDraftsTabProps) {
  const { isDark } = useTheme();
  const { drafts, isLoading, hasError, errorMessage, refresh } = useUserDrafts();
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const muted = useMemo(() => (isDark ? '#9ca3af' : '#6b7280'), [isDark]);

  const handleNavigateToCompose = useCallback((draft: PostItem) => {
    const key = draft.draftKey || 'new_topic';
    const sequence = draft.draftSequence ?? 0;
    router.push({
      pathname: '/(tabs)/compose',
      params: { draftKey: key, draftSequence: String(sequence) },
    } as any);
  }, []);

  const handleDelete = useCallback(
    async (draft: PostItem) => {
      if (!draft.draftKey) return;
      setActionError(null);
      setDeletingKey(draft.draftKey);
      const response = await discourseApi.deleteDraft({
        draftKey: draft.draftKey,
        sequence: draft.draftSequence ?? 0,
      });
      setDeletingKey(null);

      if (!response.success) {
        setActionError(response.error || 'Failed to delete draft');
        return;
      }

      refresh();
    },
    [refresh]
  );

  if (!isOwnProfile || !isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Text
          className="text-base text-center"
          style={{ color: muted }}
        >
          This section is only visible to you
        </Text>
      </View>
    );
  }

  if (isLoading && drafts.length === 0) {
    return (
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
    );
  }

  return (
    <View className="px-4 py-4">
      {(hasError || actionError) && (
        <View className="mb-3 p-3 rounded-fomio-card bg-fomio-danger/15 dark:bg-fomio-danger-dark/15 flex-row items-center">
          <Warning size={16} color="#ef4444" weight="regular" />
          <Text className="text-body text-fomio-danger dark:text-fomio-danger-dark ml-2 flex-1">
            {actionError || errorMessage || 'Failed to load drafts'}
          </Text>
        </View>
      )}

      {drafts.length === 0 && !isLoading ? (
        <View className="py-12 items-center">
          <Text className="text-base" style={{ color: muted }}>
            No drafts yet
          </Text>
        </View>
      ) : (
        drafts.map((draft) => (
          <DraftCard
            key={draft.draftKey || draft.id}
            draft={draft}
            onEdit={() => handleNavigateToCompose(draft)}
            onPost={() => handleNavigateToCompose(draft)}
            onDelete={() => handleDelete(draft)}
            isDeleting={deletingKey === draft.draftKey}
          />
        ))
      )}

      {isLoading && drafts.length > 0 && (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color={isDark ? '#26A69A' : '#009688'} />
        </View>
      )}
    </View>
  );
}
