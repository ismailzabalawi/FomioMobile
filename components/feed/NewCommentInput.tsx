import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { PaperPlaneRight } from 'phosphor-react-native';

// UI Spec: NewCommentInput — Input for adding a new comment or reply, with send button, theming, and accessibility.
interface NewCommentInputProps {
  onSend?: (text: string, replyToPostNumber?: number) => void;
  replyTo?: {
    postNumber: number;
    username: string;
  };
}

export function NewCommentInput({ onSend, replyTo }: NewCommentInputProps) {
  const { isDark, isAmoled } = useTheme();
  const [text, setText] = useState('');
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#23232b' : '#f8fafc'),
    text: isDark ? '#f4f4f5' : '#17131B',
    placeholder: isDark ? '#a1a1aa' : '#5C5D67',
    accent: isDark ? '#38bdf8' : '#0ea5e9',
    border: isDark ? '#374151' : '#e2e8f0',
  };
  function handleSend() {
    if (text.trim().length > 0) {
      onSend?.(text.trim(), replyTo?.postNumber);
      setText('');
    }
  }
  return (
    <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}> 
      {replyTo && (
        <View style={styles.replyIndicator}>
          <Text style={[styles.replyText, { color: colors.accent }]}>
            Replying to @{replyTo.username}
          </Text>
        </View>
      )}
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
        placeholderTextColor={colors.placeholder}
        value={text}
        onChangeText={setText}
        multiline
        accessibilityLabel={replyTo ? `Reply to ${replyTo.username}` : "Add a comment"}
        accessible
      />
      <TouchableOpacity
        style={styles.sendBtn}
        onPress={handleSend}
        disabled={text.trim().length === 0}
        accessibilityRole="button"
        accessibilityLabel="Send comment"
        accessible
      >
        <PaperPlaneRight size={22} weight="fill" color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 36,
    maxHeight: 80,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
  },
  replyIndicator: {
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  replyText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 