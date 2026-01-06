/**
 * Shared types for link preview components
 */

import type { OneboxProvider, LinkPreview } from '@/lib/utils/linkPreview';

export type { OneboxProvider, LinkPreview };

export interface LinkPreviewCardProps {
  preview: LinkPreview;
  onPress?: () => void;
  isLoading?: boolean;
}

