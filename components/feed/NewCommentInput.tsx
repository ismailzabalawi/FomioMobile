import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { useTheme } from '@/components/theme';
import { PaperPlaneRight } from 'phosphor-react-native';
import { useAuth } from '@/shared/auth-context';
import { router } from 'expo-router';

// UI Spec: NewCommentInput — Input for adding a new comment or reply, with send button, theming, and accessibility.
interface NewCommentInputProps {
  onSend?: (text: string, replyToPostNumber?: number) => void;
  replyTo?: {
    postNumber: number;
    username: string;
  };
  onFocus?: () => void;
  isAuthenticated?: boolean; // Optional prop for when used in contexts without AuthProvider (e.g., BottomSheetModal)
}

export interface NewCommentInputRef {
  focus: () => void;
  blur: () => void;
}

export const NewCommentInput = forwardRef<NewCommentInputRef, NewCommentInputProps>(
  ({ onSend, replyTo, onFocus, isAuthenticated: isAuthenticatedProp }, ref) => {
  const { isDark, isAmoled } = useTheme();
  // useAuth now returns safe defaults if context is missing (e.g., in BottomSheetModal portals)
  // If prop is provided, it takes precedence
  const authContext = useAuth();
  const isAuthenticated = isAuthenticatedProp !== undefined ? isAuthenticatedProp : authContext.isAuthenticated;
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const wasFocusedRef = useRef<boolean>(false); // Track if input was focused

  // Expose focus/blur methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#23232b' : '#f8fafc'),
    text: isDark ? '#f4f4f5' : '#17131B',
    placeholder: isDark ? '#a1a1aa' : '#5C5D67',
    accent: isDark ? '#38bdf8' : '#0ea5e9',
    border: isDark ? '#374151' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Auto-focus when replyTo changes
  useEffect(() => {
    if (replyTo && isAuthenticated) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [replyTo, isAuthenticated]);

  // FIXED: Maintain focus when keyboard appears to prevent it from disappearing
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      // If input was focused but lost focus due to layout shift, restore it
      if (inputRef.current && wasFocusedRef.current && !inputRef.current.isFocused()) {
        // Small delay to ensure layout is stable
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      wasFocusedRef.current = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Helper to detect if error is about comment being too short
  const isCommentTooShortError = (error: string | Error | undefined): boolean => {
    if (!error) return false;
    const errorStr = error instanceof Error ? error.message : String(error);
    const lowerError = errorStr.toLowerCase();
    return lowerError.includes('too short') || 
           lowerError.includes('minimum') || 
           lowerError.includes('at least') ||
           lowerError.includes('body is too short') ||
           lowerError.includes('post is too short') ||
           lowerError.includes('raw is too short');
  };

  async function handleSend() {
    if (!isAuthenticated) {
      router.push('/(auth)/signin');
      return;
    }

    if (text.trim().length === 0 || isSending) return;

    // Frontend validation for minimum length
    if (text.trim().length < 2) {
      setError('Your comment is too short. Please write at least 2 characters.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // ✅ FIXED: Validate replyToPostNumber is a valid number if provided
      const replyToPostNumber = replyTo?.postNumber;
      if (replyTo && (!replyToPostNumber || typeof replyToPostNumber !== 'number' || replyToPostNumber <= 0)) {
        console.error('❌ Invalid replyToPostNumber:', replyTo);
        setError('Invalid reply target. Please try again.');
        setIsSending(false);
        return;
      }
      
      await onSend?.(text.trim(), replyToPostNumber);
      setText('');
      setError(null);
    } catch (err) {
      console.error('❌ NewCommentInput send error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send comment';
      
      // Show user-friendly message for "too short" errors
      if (isCommentTooShortError(errorMessage)) {
        setError('Your comment is too short. Please write a bit more before sending.');
      } else {
        setError(`Failed to send: ${errorMessage}. Tap to retry.`);
      }
    } finally {
      setIsSending(false);
    }
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/(auth)/signin')}
        style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <Text style={[styles.input, { color: colors.placeholder }]}>
          Sign in to add a comment...
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}> 
      {error && (
        <TouchableOpacity
          onPress={handleSend}
          style={styles.errorContainer}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </TouchableOpacity>
      )}
      {replyTo && (
        <View style={styles.replyIndicator}>
          <Text style={[styles.replyText, { color: colors.accent }]}>
            Replying to @{replyTo.username}
          </Text>
        </View>
      )}
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
        placeholderTextColor={colors.placeholder}
        value={text}
        onChangeText={setText}
        multiline
        editable={!isSending}
        onFocus={() => {
          wasFocusedRef.current = true; // Mark as focused
          onFocus?.();
        }}
        onBlur={() => {
          // Don't reset wasFocusedRef immediately on blur
          // Wait a bit in case it's a temporary blur due to layout shift
          setTimeout(() => {
            if (!inputRef.current?.isFocused()) {
              wasFocusedRef.current = false;
            }
          }, 100);
        }}
        accessibilityLabel={replyTo ? `Reply to ${replyTo.username}` : "Add a comment"}
        accessible
      />
      <TouchableOpacity
        style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={text.trim().length === 0 || isSending}
        accessibilityRole="button"
        accessibilityLabel="Send comment"
        accessible
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <PaperPlaneRight size={22} weight="fill" color={colors.accent} />
        )}
      </TouchableOpacity>
    </View>
  );
});

NewCommentInput.displayName = 'NewCommentInput';

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
  errorContainer: {
    width: '100%',
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
}); 