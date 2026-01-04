import type { AppUser, Byte, Comment, Hub } from '../discourseApi';

export type SearchResultItemType = 'topic' | 'category' | 'user' | 'post';

export type SearchResultItem =
  | {
      type: 'topic';
      id: number;
      byte: Byte;
    }
  | {
      type: 'category';
      id: number;
      hub: Hub;
    }
  | {
      type: 'user';
      id: string;
      user: AppUser;
    }
  | {
      type: 'post';
      id: number;
      comment: Comment;
    };
