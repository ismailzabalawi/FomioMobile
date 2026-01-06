/**
 * LinkPreviewCard - Main router component for link previews
 * 
 * Detects provider and routes to appropriate card component
 * Shows skeleton while loading
 * Wraps in PremiumPressable for animations
 */

import React from 'react';
import type { LinkPreviewCardProps } from './types';
import { LinkPreviewSkeleton } from './LinkPreviewSkeleton';
import { YouTubeCard } from './YouTubeCard';
import { TwitterCard } from './TwitterCard';
import { GitHubCard } from './GitHubCard';
import { WikipediaCard } from './WikipediaCard';
import { ArticleCard } from './ArticleCard';

/**
 * Main link preview card router
 */
export function LinkPreviewCard({ preview, onPress, isLoading }: LinkPreviewCardProps) {
  // Show skeleton while loading
  if (isLoading) {
    return <LinkPreviewSkeleton provider={preview.provider} />;
  }

  // Route to appropriate card based on provider
  switch (preview.provider) {
    case 'youtube':
      return <YouTubeCard preview={preview} onPress={onPress} />;
    
    case 'twitter':
      return <TwitterCard preview={preview} onPress={onPress} />;
    
    case 'github':
      return <GitHubCard preview={preview} onPress={onPress} />;
    
    case 'wikipedia':
      return <WikipediaCard preview={preview} onPress={onPress} />;
    
    case 'article':
    case 'generic':
    default:
      return <ArticleCard preview={preview} onPress={onPress} />;
  }
}

