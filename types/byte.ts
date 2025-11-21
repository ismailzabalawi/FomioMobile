/**
 * Byte - Full content-focused Byte type for feed cards
 * Matches Discourse topic/post structure with rich content support
 */
export interface Byte {
  id: string | number;
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
  };
  teret?: {
    id: number;
    name: string;
    color?: string;
  };
  raw: string;      // Markdown raw content
  cooked: string;   // HTML from Discourse
  createdAt: string;
  media?: string[]; // images / videos URLs
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
  };
  stats: {
    likes: number;
    replies: number;
    views?: number;
  };
}

