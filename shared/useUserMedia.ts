// Hook to extract images from user's posts for media grid
// Fetches user posts and extracts image URLs from post content

import { useState, useEffect, useCallback } from 'react';
import { useUserPosts } from './useUserPosts';
import { MediaItem } from '@/components/profile/ProfileMediaGrid';

export interface UseUserMediaReturn {
  media: MediaItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// Extract image URLs from HTML content
function extractImagesFromContent(content: string): string[] {
  if (!content) return [];
  
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [];
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[1];
    // Filter out emoji images and data URIs
    if (!url.includes('emoji') && !url.startsWith('data:')) {
      matches.push(url);
    }
  }
  
  return matches;
}

export function useUserMedia(username: string): UseUserMediaReturn {
  const { posts, isLoading: postsLoading } = useUserPosts(username);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const extractMedia = useCallback(async () => {
    if (postsLoading) {
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(undefined);

      const mediaItems: MediaItem[] = [];
      const seenUrls = new Set<string>();

      // Extract images from posts
      for (const post of posts) {
        // For now, we'll need to fetch full post content to extract images
        // This is a simplified version - in production, you might want to
        // cache post content or fetch it differently
        
        // If post has coverImage, add it
        if (post.coverImage && !seenUrls.has(post.coverImage)) {
          seenUrls.add(post.coverImage);
          mediaItems.push({
            id: `post-${post.id}-cover`,
            url: post.coverImage,
            thumbnailUrl: post.coverImage,
            postId: post.id,
          });
        }
      }

      // Sort by post ID (newest first)
      mediaItems.sort((a, b) => (b.postId || 0) - (a.postId || 0));

      setMedia(mediaItems);
    } catch (error) {
      setHasError(true);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load media'
      );
    } finally {
      setIsLoading(false);
    }
  }, [posts, postsLoading]);

  useEffect(() => {
    extractMedia();
  }, [extractMedia]);

  return {
    media,
    isLoading: isLoading || postsLoading,
    hasError,
    errorMessage,
  };
}

