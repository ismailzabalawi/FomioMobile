/**
 * Byte - Full content-focused Byte type for feed cards
 * Matches Discourse topic/post structure with rich content support
 */
export interface Byte {
  id: string | number;
  title?: string; // Topic title from Discourse
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    verified?: boolean;
    admin?: boolean;
    moderator?: boolean;
    groups?: Array<{ id: number; name: string; flair_url?: string }>;
  };
  hub?: {
    id: number;
    name: string;
    color?: string;
  };
  teret?: {
    id: number;
    name: string;
    color?: string;
  };
  raw: string;      // Markdown raw content
  cooked: string;   // HTML from Discourse
  excerpt?: string; // Plain text or HTML excerpt for previews
  createdAt: string;
  updatedAt?: string; // When post was last updated
  origin: 'summary' | 'hydrated'; // Explicit source tracking
  media?: string[]; // images / videos URLs
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
    provider: 'youtube' | 'twitter' | 'github' | 'wikipedia' | 'article' | 'generic';
    // Provider-specific metadata
    videoId?: string;      // YouTube
    duration?: string;     // YouTube
    tweetId?: string;      // Twitter
    repoStats?: {          // GitHub
      stars: number;
      forks: number;
      language?: string;
    };
  };
  stats: {
    likes: number;
    replies: number;
    views?: number;
  };
  // Engagement state
  isLiked?: boolean;
  isBookmarked?: boolean;
  // Thread context (for replies/reposts)
  replyTo?: {
    username: string;
    postId?: number;
  };
  repostedBy?: {
    username: string;
    userId: number;
  };
}
