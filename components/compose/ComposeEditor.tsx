// UI Spec: ComposeEditor - Premium Edition
// - Hero title: Large, borderless, prominent typography
// - Distraction-free body with generous line height
// - TeretChip for category selection with color indicator
// - SegmentedControl for Write/Preview toggle
// - FloatingToolbar appears on text selection
// - Character count indicators
// - Focus animations and micro-interactions
// - Clean visual hierarchy with subtle dividers

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { Teret } from '@/shared/useTerets';
import { getMarkdownStyles } from '@/shared/markdown-styles';
import { MarkdownContent } from '../feed/MarkdownContent';
import { getTokens } from '@/shared/design/tokens';

// Premium sub-components
import { SegmentedControl } from './SegmentedControl';
import { FloatingToolbar } from './FloatingToolbar';
import { TeretChip } from './TeretChip';
import { PencilSimple, Eye } from 'phosphor-react-native';

type EditorMode = 'write' | 'preview';
type FormatAction = 'bold' | 'italic' | 'link' | 'code' | 'quote' | 'list' | 'heading';

// All supported slash commands (lowercase for matching)
const SUPPORTED_COMMANDS = [
  '/help', '/image', '/b', '/bold', '/i', '/italic', '/link',
  '/code', '/fence', '/h1', '/h2', '/h3', '/quote', '/list', '/todo', '/task',
] as const;

type SupportedCommand = typeof SUPPORTED_COMMANDS[number];

// Helper to normalize command to lowercase
const normalizeCommand = (cmd: string): string => cmd.toLowerCase();

const SPRING_CONFIG = { damping: 16, stiffness: 220 };

interface ComposeEditorProps {
  title: string;
  body: string;
  onChangeTitle: (text: string) => void;
  onChangeBody: (text: string) => void;
  titleError?: string;
  bodyError?: string;
  selectedTeret: Teret | null;
  onTeretPress: () => void;
  onSlashHelp?: () => void;
  onSlashImage?: () => void;
  onCommandExecuted?: (command: string) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  minTitle?: number;
  minBody?: number;
}

// Animated TextInput wrapper for focus effects
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function ComposeEditor({
  title,
  body,
  onChangeTitle,
  onChangeBody,
  titleError,
  bodyError,
  selectedTeret,
  onTeretPress,
  onSlashHelp,
  onSlashImage,
  onCommandExecuted,
  mode,
  onModeChange,
  minTitle = 15,
  minBody = 20,
}: ComposeEditorProps) {
  const { isDark, isAmoled } = useTheme();
  const insets = useSafeAreaInsets();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  // State
  const [bodyHeight, setBodyHeight] = useState(180);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: body.length,
    end: body.length,
  });
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [bodyInputLayout, setBodyInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Refs
  const titleInputRef = useRef<TextInput>(null);
  const bodyInputRef = useRef<TextInput>(null);
  const lastProcessedBody = useRef<string>('');
  const isProcessingCommand = useRef(false);
  const lastCommandRef = useRef<{ command: string; timestamp: number } | null>(null);

  // Animated values
  const titleScale = useSharedValue(1);
  const titleBorderOpacity = useSharedValue(0);
  const bodyBorderOpacity = useSharedValue(0);

  // Markdown styles for preview mode
  const markdownStyles = useMemo(() => getMarkdownStyles(themeMode), [themeMode]);

  // Focus animations
  useEffect(() => {
    titleBorderOpacity.value = withSpring(titleFocused ? 1 : 0, SPRING_CONFIG);
  }, [titleFocused, titleBorderOpacity]);

  useEffect(() => {
    bodyBorderOpacity.value = withSpring(bodyFocused ? 1 : 0, SPRING_CONFIG);
  }, [bodyFocused, bodyBorderOpacity]);

  // Character counts
  const titleLength = title.trim().length;
  const titleProgress = Math.min(titleLength / minTitle, 1);

  // Animated border styles
  const titleBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      titleBorderOpacity.value,
      [0, 1],
      [
        'transparent',
        isDark ? tokens.colors.accent : tokens.colors.accent,
      ]
    );
    return {
      borderBottomColor: borderColor,
      borderBottomWidth: withSpring(titleFocused ? 2 : 1, SPRING_CONFIG),
    };
  }, [titleFocused, isDark, tokens]);

  const bodyBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      bodyBorderOpacity.value,
      [0, 1],
      [
        isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        isDark ? tokens.colors.accent : tokens.colors.accent,
      ]
    );
    return { borderColor };
  }, [bodyFocused, isDark, tokens]);

  // Haptic feedback for command execution
  const triggerCommandHaptic = useCallback((success: boolean) => {
    if (success) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, []);

  // Helper: wrap selection or insert inline wrapper (e.g. bold/italic)
  const applyInlineWrap = useCallback(
    (currentBody: string, sel: { start: number; end: number }, wrapper: string) => {
      const { start, end } = sel;

      if (start !== end) {
        const before = currentBody.slice(0, start);
        const middle = currentBody.slice(start, end);
        const after = currentBody.slice(end);

        const next = `${before}${wrapper}${middle}${wrapper}${after}`;
        const newStart = start + wrapper.length;
        const newEnd = newStart + middle.length;

        onChangeBody(next);
        setSelection({ start: newStart, end: newEnd });
      } else {
        const before = currentBody.slice(0, start);
        const after = currentBody.slice(end);
        const snippet = `${wrapper}${wrapper}`;

        const next = before + snippet + after;
        const cursor = before.length + wrapper.length;

        onChangeBody(next);
        setSelection({ start: cursor, end: cursor });
      }
    },
    [onChangeBody]
  );

  const applyBold = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyInlineWrap(currentBody, sel, '**');
    },
    [applyInlineWrap]
  );

  const applyItalic = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyInlineWrap(currentBody, sel, '_');
    },
    [applyInlineWrap]
  );

  // Helper: apply prefix to the current line
  const applyLinePrefix = useCallback(
    (currentBody: string, sel: { start: number; end: number }, prefix: string) => {
      const { start } = sel;

      const before = currentBody.slice(0, start);
      const lastNewline = before.lastIndexOf('\n');
      const lineStartIndex = lastNewline === -1 ? 0 : lastNewline + 1;

      const lineRest = currentBody.slice(lineStartIndex);
      const firstNewline = lineRest.indexOf('\n');
      const lineEndIndex =
        firstNewline === -1 ? currentBody.length : lineStartIndex + firstNewline;

      const line = currentBody.slice(lineStartIndex, lineEndIndex);
      const leadingSpacesMatch = line.match(/^\s*/);
      const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0] : '';
      const rest = line.slice(leadingSpaces.length);

      const newLine = leadingSpaces + prefix + rest;
      const next =
        currentBody.slice(0, lineStartIndex) + newLine + currentBody.slice(lineEndIndex);
      const newCursor = start + prefix.length;

      onChangeBody(next);
      setSelection({ start: newCursor, end: newCursor });
    },
    [onChangeBody]
  );

  const applyH1 = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '# ');
    },
    [applyLinePrefix]
  );

  const applyH2 = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '## ');
    },
    [applyLinePrefix]
  );

  const applyH3 = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '### ');
    },
    [applyLinePrefix]
  );

  const applyQuote = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '> ');
    },
    [applyLinePrefix]
  );

  const applyList = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '- ');
    },
    [applyLinePrefix]
  );

  const applyChecklist = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '- [ ] ');
    },
    [applyLinePrefix]
  );

  const applyCodeBlock = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      const { start, end } = sel;
      const before = currentBody.slice(0, start);
      const middle = currentBody.slice(start, end);
      const after = currentBody.slice(end);
      const block = `\n\`\`\`\n${middle || 'code here'}\n\`\`\`\n`;
      const next = before + block + after;
      const cursor = before.length + block.length;
      onChangeBody(next);
      setSelection({ start: cursor, end: cursor });
    },
    [onChangeBody]
  );

  const applyLink = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      const { start, end } = sel;
      const before = currentBody.slice(0, start);
      const middle = currentBody.slice(start, end) || 'link text';
      const after = currentBody.slice(end);
      const snippet = `[${middle}](https://)`;
      const next = before + snippet + after;
      const cursor = before.length + snippet.indexOf('https://');
      onChangeBody(next);
      setSelection({ start: cursor, end: cursor + 'https://'.length });
    },
    [onChangeBody]
  );

  // Floating toolbar action handler
  const handleToolbarAction = useCallback(
    (action: FormatAction) => {
      const sel = selection;
      switch (action) {
        case 'bold':
          applyBold(body, sel);
          break;
        case 'italic':
          applyItalic(body, sel);
          break;
        case 'link':
          applyLink(body, sel);
          break;
        case 'code':
          applyCodeBlock(body, sel);
          break;
        case 'quote':
          applyQuote(body, sel);
          break;
        case 'list':
          applyList(body, sel);
          break;
        case 'heading':
          applyH2(body, sel);
          break;
      }
      setShowToolbar(false);
      triggerCommandHaptic(true);
      onCommandExecuted?.(action);
    },
    [
      body,
      selection,
      applyBold,
      applyItalic,
      applyLink,
      applyCodeBlock,
      applyQuote,
      applyList,
      applyH2,
      triggerCommandHaptic,
      onCommandExecuted,
    ]
  );

  // Command processor
  const processCommand = useCallback(
    (text: string, cursorPosition: number): boolean => {
      const validCursorPos = Math.min(Math.max(0, cursorPosition), text.length);
      const textBeforeCursor = text.slice(0, validCursorPos);
      const cursorMatch = textBeforeCursor.match(/(?:^|[\s\n])(\/[a-zA-Z0-9]+)\s$/);

      if (!cursorMatch) return false;

      const rawCommand = cursorMatch[1];
      const command = normalizeCommand(rawCommand) as SupportedCommand;

      if (!SUPPORTED_COMMANDS.includes(command)) {
        triggerCommandHaptic(false);
        return false;
      }

      // Debounce protection
      const now = Date.now();
      const lastCmd = lastCommandRef.current;
      if (lastCmd && lastCmd.command === command && now - lastCmd.timestamp < 500) {
        return true;
      }
      lastCommandRef.current = { command, timestamp: now };

      try {
        const matchedString = cursorMatch[0];
        const commandStartInMatch = matchedString.indexOf('/');
        const commandStartPos = validCursorPos - matchedString.length + commandStartInMatch;
        const commandEndPos = validCursorPos;

        const before = text.slice(0, commandStartPos);
        const after = text.slice(commandEndPos);
        const cleanText = before + after;
        const newCursorPos = commandStartPos;
        const adjustedSel = { start: newCursorPos, end: newCursorPos };

        lastProcessedBody.current = cleanText;
        let commandExecuted = true;

        switch (command) {
          case '/help':
            if (onSlashHelp) {
              onChangeBody(cleanText);
              setSelection(adjustedSel);
              onSlashHelp();
            }
            break;

          case '/image':
            if (onSlashImage) {
              onChangeBody(cleanText);
              setSelection(adjustedSel);
              onSlashImage();
            }
            break;

          case '/b':
          case '/bold':
            applyBold(cleanText, adjustedSel);
            break;

          case '/i':
          case '/italic':
            applyItalic(cleanText, adjustedSel);
            break;

          case '/h1':
            applyH1(cleanText, adjustedSel);
            break;

          case '/h2':
            applyH2(cleanText, adjustedSel);
            break;

          case '/h3':
            applyH3(cleanText, adjustedSel);
            break;

          case '/quote':
            applyQuote(cleanText, adjustedSel);
            break;

          case '/list':
            applyList(cleanText, adjustedSel);
            break;

          case '/todo':
          case '/task':
            applyChecklist(cleanText, adjustedSel);
            break;

          case '/code':
          case '/fence':
            applyCodeBlock(cleanText, adjustedSel);
            break;

          case '/link':
            applyLink(cleanText, adjustedSel);
            break;

          default:
            commandExecuted = false;
        }

        if (commandExecuted) {
          triggerCommandHaptic(true);
          onCommandExecuted?.(command);
        }

        return commandExecuted;
      } catch (error) {
        console.error('Command execution failed:', error);
        triggerCommandHaptic(false);
        return false;
      }
    },
    [
      onChangeBody,
      onSlashHelp,
      onSlashImage,
      onCommandExecuted,
      applyBold,
      applyItalic,
      applyH1,
      applyH2,
      applyH3,
      applyQuote,
      applyList,
      applyChecklist,
      applyCodeBlock,
      applyLink,
      triggerCommandHaptic,
    ]
  );

  // Body change handler
  const handleBodyChange = useCallback(
    (text: string) => {
      if (isProcessingCommand.current) return;

      const estimatedCursorPos = text.length;
      isProcessingCommand.current = true;
      const wasCommandProcessed = processCommand(text, estimatedCursorPos);
      isProcessingCommand.current = false;

      if (!wasCommandProcessed) {
        lastProcessedBody.current = text;
        onChangeBody(text);
      }
    },
    [processCommand, onChangeBody]
  );

  // Selection change handler - show toolbar on selection
  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const newSelection = e.nativeEvent.selection;
      setSelection(newSelection);

      // Show toolbar if text is selected
      if (newSelection.start !== newSelection.end && mode === 'write') {
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    },
    [mode]
  );

  // Watch for programmatic body changes
  useEffect(() => {
    if (
      body === lastProcessedBody.current ||
      isProcessingCommand.current ||
      !body
    ) {
      return;
    }

    const commandMatch = body.match(/(?:^|[\s\n])(\/[a-zA-Z0-9]+)\s$/);
    if (commandMatch) {
      isProcessingCommand.current = true;
      processCommand(body, body.length);
      isProcessingCommand.current = false;
    } else {
      lastProcessedBody.current = body;
    }
  }, [body, processCommand]);

  // Dismiss toolbar on mode change
  useEffect(() => {
    if (mode === 'preview') {
      setShowToolbar(false);
    }
  }, [mode]);

  // Colors
  const placeholderColor = isDark ? 'rgba(161, 161, 170, 0.6)' : 'rgba(107, 107, 114, 0.6)';
  const textColor = isDark ? '#F5F5F7' : '#111111';
  const mutedColor = isDark ? '#9CA3AF' : '#6B7280';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={styles.container}>
      {/* Segmented Control - Write/Preview */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.controlRow}
      >
        <View style={styles.teretInline}>
          <View style={styles.teretFill}>
            <TeretChip
              selectedTeret={selectedTeret}
              onPress={onTeretPress}
              error={!!titleError && !selectedTeret}
            />
          </View>
        </View>

        <View style={styles.segmentContainer}>
          <SegmentedControl
            segments={[
              { value: 'write', label: '', icon: <PencilSimple size={14} color={mode === 'write' ? textColor : mutedColor} weight={mode === 'write' ? 'bold' : 'regular'} /> },
              { value: 'preview', label: '', icon: <Eye size={14} color={mode === 'preview' ? textColor : mutedColor} weight={mode === 'preview' ? 'bold' : 'regular'} /> },
            ]}
            selectedValue={mode}
            onValueChange={(value) => {
              onModeChange(value);
              if (value === 'preview') {
                Keyboard.dismiss();
              }
            }}
            size="sm"
          />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View
        entering={FadeInDown.delay(150).springify()}
        style={[styles.titleRow, titleBorderStyle]}
      >
        <View style={styles.titleInputWrapper}>
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={onChangeTitle}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            multiline
            scrollEnabled
            placeholder="Your title here..."
            placeholderTextColor={placeholderColor}
            maxLength={255}
            style={[styles.titleInput, { color: textColor }]}
            accessible
            accessibilityLabel="Post title"
            accessibilityHint="Enter a compelling title for your post"
          />
          
          {/* Title character indicator */}
          {titleFocused && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.charIndicator}
            >
              <Text
                style={[
                  styles.charCount,
                  {
                    color:
                      titleLength >= minTitle
                        ? isDark
                          ? '#26A69A'
                          : '#009688'
                        : mutedColor,
                  },
                ]}
              >
                {titleLength}
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Title error */}
      {titleError && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
          <Text style={styles.errorText}>{titleError}</Text>
        </Animated.View>
      )}

      {/* Subtle divider */}
      <Animated.View
        entering={FadeIn.delay(200)}
        style={[styles.divider, { backgroundColor: dividerColor }]}
      />

      {/* Body Editor or Preview */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={[styles.bodyContainer, bodyBorderStyle]}
      >
        {mode === 'write' ? (
          <>
            <TextInput
              ref={bodyInputRef}
              value={body}
              onChangeText={handleBodyChange}
              onFocus={() => setBodyFocused(true)}
              onBlur={() => setBodyFocused(false)}
              onSelectionChange={handleSelectionChange}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setBodyInputLayout({ x, y, width, height });
              }}
              selection={selection}
              placeholder="Start writing your thoughts..."
              placeholderTextColor={placeholderColor}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, { color: textColor, minHeight: 180, lineHeight: Platform.OS === 'android' ? 30 : 28 }]}
              onContentSizeChange={(e) => {
                const h = e.nativeEvent.contentSize.height;
                setBodyHeight(Math.max(h, 180));
              }}
              accessible
              accessibilityLabel="Post body"
              accessibilityHint="Write your post content. Use slash commands for formatting."
            />

            {/* Floating Toolbar - positioned above body input */}
            <FloatingToolbar
              visible={showToolbar}
              position={{ x: bodyInputLayout.width / 2, y: 0 }}
              onAction={handleToolbarAction}
              onDismiss={() => setShowToolbar(false)}
            />
          </>
        ) : (
          <ScrollView
            style={styles.previewScroll}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {body ? (
              <MarkdownContent content={body} isRawMarkdown linkMetadata={undefined} />
            ) : (
              <Text style={[styles.emptyPreview, { color: mutedColor }]}>
                Nothing to preview yet. Switch to Write mode and start typing!
              </Text>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Body error */}
      {bodyError && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
          <Text style={styles.errorText}>{bodyError}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Platform.OS === 'android' ? 8 : 12,
  },
  segmentContainer: {
    flexBasis: '15%',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  teretInline: {
    flexBasis: '85%',
    flexGrow: 1,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  teretFill: {
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  titleInputWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
    maxHeight: 160,
    textAlignVertical: 'top',
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  charIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 8,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  bodyContainer: {
    flex: 1,
    flexGrow: 1,
    minHeight: 240,
    borderRadius: 10,
    borderWidth: 0,
    overflow: 'hidden',
  },
  bodyInput: {
    fontSize: 17,
    lineHeight: 28,
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    flex: 1,
  },
  previewScroll: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  emptyPreview: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  hintContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hintText: {
    fontSize: 13,
    textAlign: 'center',
  },
  hintCode: {
    fontFamily: 'monospace',
    fontWeight: '600',
  },
});
