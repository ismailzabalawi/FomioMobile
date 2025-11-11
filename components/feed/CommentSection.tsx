import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '@/components/theme';
import { CommentItem } from './CommentItem';
import { NewCommentInput } from './NewCommentInput';

// UI Spec: CommentSection — Renders a list of comments and one-level replies, styled per Figma, with theming and accessibility.
export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  parentId?: string;
}

interface CommentSectionProps {
  comments: Comment[];
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onSend?: (text: string, parentId?: string) => void;
}

export function CommentSection({ comments, onLike, onReply, onSend }: CommentSectionProps) {
  const { isDark } = useTheme();
  // Group comments: parents and their direct replies
  const parents = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);
  function getReplies(parentId: string) {
    return replies.filter(r => r.parentId === parentId);
  }
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#18181b' : '#fff' }]}> 
      <FlatList
        data={parents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View>
            <CommentItem comment={item} onLike={onLike} onReply={onReply} />
            {getReplies(item.id).map(reply => (
              <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} isReply />
            ))}
          </View>
        )}
        ListFooterComponent={<NewCommentInput onSend={onSend} />}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: 0,
  },
}); 