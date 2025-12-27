import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/components/theme';
import { CommentItem, type Comment } from './CommentItem';
import { FluidSection } from '@/shared/ui/FluidSection';
import { getTokens } from '@/shared/design/tokens';

// UI Spec: CommentSection — Renders a list of comments and one-level replies, styled per Figma, with theming and accessibility.
// Uses the Comment interface from CommentItem to ensure type consistency across components

interface CommentSectionProps {
  comments: Comment[];
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onSend?: (text: string, replyToPostNumber?: number) => void;
  isDark?: boolean; // Pass theme from parent when used in portal (e.g., bottom sheet)
  mode?: 'light' | 'dark' | 'darkAmoled'; // Pass mode from parent when used in portal
}

export function CommentSection({ comments, onLike, onReply, onSend, isDark: isDarkProp, mode: modeProp }: CommentSectionProps) {
  // Use props if provided (for portal contexts), otherwise fall back to theme context
  const themeContext = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeContext.isDark;
  const mode = modeProp || (isDark ? 'darkAmoled' : 'light');
  const tokens = getTokens(mode);
  const primaryTextColor = tokens.colors.text; // Use theme token instead of hardcoded color
  
  // Group comments: parents and their direct replies
  // ✅ FIXED: Check both parentId and replyToPostNumber to identify replies
  const parents = comments.filter(c => !c.parentId && !c.replyToPostNumber);
  const replies = comments.filter(c => c.parentId || c.replyToPostNumber);
  
  function getReplies(parentId: string) {
    return replies.filter(r => r.parentId === parentId);
  }
  
  return (
    <FluidSection mode={mode} style={{ padding: 0, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: 8 }}>
      {parents.length === 0 ? (
        <View className="py-12 px-5 items-center">
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: primaryTextColor }}>
            Be the first to reply
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: tokens.colors.muted }}>
            Start the conversation by adding a comment below.
          </Text>
        </View>
      ) : (
        <View>
          {parents.map((item) => (
            <View key={item.id}>
              <CommentItem comment={item} onLike={onLike} onReply={onReply} isDark={isDark} mode={mode} />
              {getReplies(item.id).map(reply => (
                <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} isReply isDark={isDark} mode={mode} />
              ))}
            </View>
          ))}
        </View>
      )}
      </View>
    </FluidSection>
  );
}
