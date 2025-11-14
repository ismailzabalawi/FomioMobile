import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Heart, ChatCircle } from 'phosphor-react-native';

// UI Spec: CommentItem — Renders a comment or reply with avatar, name, time, text, like/reply actions, and theming.
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

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
}

export function CommentItem({ comment, isReply, onLike, onReply }: CommentItemProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#23232b' : '#f8fafc'),
    text: isDark ? '#f4f4f5' : '#17131B',
    secondary: isDark ? '#a1a1aa' : '#5C5D67',
    action: isDark ? '#a1a1aa' : '#17131B',
    divider: isDark ? '#23232b' : '#e2e8f0',
  };
  // Handle empty avatar URLs
  const avatarSource = comment.author.avatar && comment.author.avatar.trim() !== '' 
    ? { uri: comment.author.avatar } 
    : undefined;

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }, isReply && styles.replyRow]}> 
      {avatarSource ? (
        <Image source={avatarSource} style={styles.avatar} accessibilityLabel={`${comment.author.name}'s avatar`} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.avatarFallback, { color: colors.background }]}>
            {comment.author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.contentBlock}>
        <View style={styles.headerRow}>
          <Text style={[styles.author, { color: colors.text }]}>{comment.author.name}</Text>
          <Text style={[styles.time, { color: colors.secondary }]}>{comment.createdAt}</Text>
        </View>
        <Text style={[styles.text, { color: colors.text }]}>{comment.content}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onLike?.(comment.id)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Like comment"
          >
            <Heart size={18} weight={comment.likes > 0 ? 'fill' : 'regular'} color={colors.action} />
            <Text style={[styles.actionText, { color: colors.action }]}>{comment.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onReply?.(comment.id)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Reply to comment"
          >
            <ChatCircle size={18} weight="regular" color={colors.action} />
            <Text style={[styles.actionText, { color: colors.action }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingRight: 8,
    borderBottomWidth: 1,
  },
  replyRow: {
    marginLeft: 44,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    marginTop: 2,
  },
  contentBlock: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  author: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
  },
  text: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  avatarFallback: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 