import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/components/theme';
import { CommentItem, type Comment } from './CommentItem';

// UI Spec: CommentSection — Renders a list of comments and one-level replies, styled per Figma, with theming and accessibility.
// Uses the Comment interface from CommentItem to ensure type consistency across components

interface CommentSectionProps {
  comments: Comment[];
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onSend?: (text: string, replyToPostNumber?: number) => void; // ✅ FIXED: Use replyToPostNumber (number), not parentId (string)
}

export function CommentSection({ comments, onLike, onReply, onSend }: CommentSectionProps) {
  const { isDark, isAmoled } = useTheme();
  
  // Group comments: parents and their direct replies
  // ✅ FIXED: Check both parentId and replyToPostNumber to identify replies
  const parents = comments.filter(c => !c.parentId && !c.replyToPostNumber);
  const replies = comments.filter(c => c.parentId || c.replyToPostNumber);
  
  function getReplies(parentId: string) {
    return replies.filter(r => r.parentId === parentId);
  }
  
  return (
    <View className={`bg-fomio-bg dark:bg-fomio-bg-dark pt-2 px-0`}>
      {parents.length === 0 ? (
        <View className="py-12 px-5 items-center">
          <Text className="text-lg font-semibold mb-2 text-fomio-foreground dark:text-fomio-foreground-dark">
            Be the first to reply
          </Text>
          <Text className="text-sm text-center text-fomio-muted dark:text-fomio-muted-dark">
            Start the conversation by adding a comment below.
          </Text>
        </View>
      ) : (
        <View>
          {parents.map((item) => (
            <View key={item.id}>
              <CommentItem comment={item} onLike={onLike} onReply={onReply} />
              {getReplies(item.id).map(reply => (
                <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} isReply />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
