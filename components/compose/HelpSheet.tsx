// UI Spec: HelpSheet (Slash Commands) - Premium Edition
// - Platform-aware backdrop (blur iOS, semi-transparent Android)
// - Handle indicator for native feel
// - Staggered entrance animations with Reanimated
// - Tappable commands for quick insertion
// - Premium border/glow styling
// - Sections: Basics, Formatting, Blocks
// - Search bar to filter commands
// - Themed with Fomio tokens, dark/AMOLED ready

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  ImageSquare, 
  Hash, 
  TextItalic, 
  Quotes, 
  ListBullets, 
  ListChecks, 
  Code, 
  LinkSimple,
  ArrowSquareIn,
  TextB,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { getTokens } from '@/shared/design/tokens';

interface HelpSheetProps {
  visible: boolean;
  onClose: () => void;
  onInsertCommand?: (cmd: string) => void;
}

// Animation constants from design tokens
const STAGGER_DELAY = 40;

// Premium Pressable with scale animation
function CommandRow({
  item,
  index,
  isDark,
  onPress,
}: {
  item: {
    cmd: string;
    aliases: string[];
    description: string;
    preview: string;
    icon: any;
  };
  index: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 300 }) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.98;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const Icon = item.icon;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * STAGGER_DELAY + 100).springify().damping(16).stiffness(220)}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.commandRow,
          pressed && styles.commandRowPressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Insert ${item.cmd} command`}
        accessibilityHint={item.description}
      >
        <Animated.View style={[styles.commandRowContent, animatedStyle]}>
          {Icon && (
            <Icon
              size={18}
              color={isDark ? '#A1A1AA' : '#6B6B72'}
              weight="regular"
              style={styles.commandIcon}
            />
          )}
          <View style={styles.commandTextContainer}>
            <View style={styles.commandHeader}>
              <Text
                style={[
                  styles.commandText,
                  { color: isDark ? '#F5F5F7' : '#111111' },
                ]}
              >
                {item.cmd}
              </Text>
              {item.aliases.length > 0 && (
                <Text
                  style={[
                    styles.aliasText,
                    { color: isDark ? '#A1A1AA' : '#6B6B72' },
                  ]}
                >
                  (also: {item.aliases.join(', ')})
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.descriptionText,
                { color: isDark ? '#A1A1AA' : '#6B6B72' },
              ]}
            >
              {item.description}
            </Text>
            {item.preview && (
              <View
                style={[
                  styles.previewContainer,
                  { backgroundColor: isDark ? '#0A0A0A' : '#F7F7F8' },
                ]}
              >
                <Text
                  style={[
                    styles.previewText,
                    { color: isDark ? '#42A5F5' : '#1565C0' },
                  ]}
                >
                  {item.preview}
                </Text>
              </View>
            )}
          </View>
          <ArrowSquareIn
            size={16}
            color={isDark ? '#A1A1AA50' : '#6B6B7250'}
            weight="regular"
            style={styles.insertIcon}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function HelpSheet({ visible, onClose, onInsertCommand }: HelpSheetProps) {
  const { isDark, isAmoled } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');

  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  // Reset search query when modal closes
  React.useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const handleInsertCommand = useCallback(
    (cmd: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onInsertCommand?.(cmd);
      onClose();
    },
    [onInsertCommand, onClose]
  );

  const sections = useMemo(
    () => [
      {
        title: 'Basics',
        items: [
          {
            cmd: '/help',
            aliases: [],
            description: 'Show this help sheet.',
            preview: 'Type: /help',
            icon: null,
          },
          {
            cmd: '/image',
            aliases: [],
            description: 'Open image picker to insert images into your post.',
            preview: '![image](url)',
            icon: ImageSquare,
          },
        ],
      },
      {
        title: 'Formatting',
        items: [
          {
            cmd: '/b',
            aliases: ['/bold'],
            description: 'Bold the selected text, or insert bold markers.',
            preview: '**bold**',
            icon: TextB,
          },
          {
            cmd: '/i',
            aliases: ['/italic'],
            description: 'Italicize the selected text, or insert italic markers.',
            preview: '_italic_',
            icon: TextItalic,
          },
          {
            cmd: '/link',
            aliases: [],
            description: 'Wrap selection with link markdown.',
            preview: '[text](url)',
            icon: LinkSimple,
          },
          {
            cmd: '/code',
            aliases: ['/fence'],
            description: 'Insert a code fence block.',
            preview: '```code```',
            icon: Code,
          },
        ],
      },
      {
        title: 'Blocks',
        items: [
          {
            cmd: '/h1',
            aliases: [],
            description: 'Turn the line into a level-1 heading.',
            preview: '# Heading 1',
            icon: Hash,
          },
          {
            cmd: '/h2',
            aliases: [],
            description: 'Turn the line into a level-2 heading.',
            preview: '## Heading 2',
            icon: Hash,
          },
          {
            cmd: '/h3',
            aliases: [],
            description: 'Turn the line into a level-3 heading.',
            preview: '### Heading 3',
            icon: Hash,
          },
          {
            cmd: '/quote',
            aliases: [],
            description: 'Turn the line into a blockquote.',
            preview: '> Quote text',
            icon: Quotes,
          },
          {
            cmd: '/list',
            aliases: [],
            description: 'Turn the line into a bullet item.',
            preview: '- bullet item',
            icon: ListBullets,
          },
          {
            cmd: '/todo',
            aliases: ['/task'],
            description: 'Turn the line into a checklist item.',
            preview: '- [ ] Task',
            icon: ListChecks,
          },
        ],
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!query.trim()) return true;
          const q = query.trim().toLowerCase();
          return (
            item.cmd.toLowerCase().includes(q) ||
            item.aliases.some((a) => a.toLowerCase().includes(q)) ||
            item.description.toLowerCase().includes(q) ||
            (item.preview?.toLowerCase().includes(q) ?? false)
          );
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, query]);

  const hasResults = filteredSections.length > 0;

  // Colors based on theme
  const sheetBg = isAmoled ? '#000000' : isDark ? '#050505' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(124, 196, 255, 0.12)' : 'rgba(79, 156, 249, 0.08)';
  const shadowColor = isDark ? '#7CC4FF' : '#4F9CF9';
  const handleColor = isDark ? '#1C1C1E' : '#E3E3E6';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop - Platform aware */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {Platform.OS === 'ios' ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={StyleSheet.absoluteFill}
          >
            <BlurView
              intensity={isDark ? 40 : 25}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(0,0,0,0.55)',
              },
            ]}
          />
        )}
      </Pressable>

      {/* Sheet Content */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(140)}
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderTopColor: borderColor,
              shadowColor: shadowColor,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: '88%',
            },
          ]}
        >
          {/* Handle Indicator */}
          <Animated.View
            entering={FadeIn.delay(100)}
            style={styles.handleContainer}
          >
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={[
              styles.header,
              {
                borderBottomColor: isDark ? '#1C1C1E' : '#E3E3E6',
              },
            ]}
          >
            <View style={styles.headerContent}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? '#F5F5F7' : '#111111' },
                ]}
              >
                Slash Commands
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? '#A1A1AA' : '#6B6B72' },
                ]}
              >
                Tap to insert • Type in editor
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close slash commands help"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X
                size={20}
                color={isDark ? '#A1A1AA' : '#6B6B72'}
                weight="regular"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Search */}
          <Animated.View
            entering={FadeInDown.delay(80).springify()}
            style={[
              styles.searchContainer,
              {
                borderBottomColor: isDark ? '#1C1C1E' : '#E3E3E6',
              },
            ]}
          >
            <View
              style={[
                styles.searchInputWrapper,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#F7F7F8',
                },
              ]}
            >
              <MagnifyingGlass
                size={16}
                color={isDark ? '#A1A1AA' : '#6B6B72'}
                weight="regular"
                style={styles.searchIcon}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search commands..."
                placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                style={[
                  styles.searchInput,
                  { color: isDark ? '#F5F5F7' : '#111111' },
                ]}
                autoCorrect={false}
                autoCapitalize="none"
                accessible
                accessibilityLabel="Search slash commands"
              />
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Instructions */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.instructionsContainer}
            >
              <Text
                style={[
                  styles.instructionsText,
                  { color: isDark ? '#A1A1AA' : '#6B6B72' },
                ]}
              >
                Type a slash command at the{' '}
                <Text style={styles.instructionsBold}>end of a line</Text> in{' '}
                <Text style={styles.instructionsBold}>Write</Text> mode, or tap
                any command below to insert it.
              </Text>
            </Animated.View>

            {/* Command Sections */}
            {hasResults ? (
              (filteredSections.length ? filteredSections : sections).map(
                (section, sectionIndex) => (
                  <Animated.View
                    key={section.title}
                    entering={FadeInDown.delay(120 + sectionIndex * 40).springify()}
                    style={styles.section}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: isDark ? '#A1A1AA' : '#6B6B72' },
                      ]}
                    >
                      {section.title}
                    </Text>
                    {section.items.map((item, itemIndex) => (
                      <CommandRow
                        key={`${item.cmd}-${itemIndex}`}
                        item={item}
                        index={sectionIndex * 4 + itemIndex}
                        isDark={isDark}
                        onPress={() => handleInsertCommand(item.cmd)}
                      />
                    ))}
                  </Animated.View>
                )
              )
            ) : (
              /* Empty State */
              <Animated.View
                entering={FadeIn.springify()}
                style={styles.emptyState}
              >
                <MagnifyingGlass
                  size={48}
                  color={isDark ? '#A1A1AA' : '#6B6B72'}
                  weight="light"
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: isDark ? '#A1A1AA' : '#6B6B72' },
                  ]}
                >
                  No commands match "{query}"
                </Text>
                <Pressable
                  onPress={() => setQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Text
                    style={[
                      styles.clearSearchText,
                      { color: isDark ? '#42A5F5' : '#1565C0' },
                    ]}
                  >
                    Clear search
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Footer tip */}
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={styles.footerTip}
            >
              <Text
                style={[
                  styles.footerTipText,
                  { color: isDark ? '#A1A1AA' : '#6B6B72' },
                ]}
              >
                Commands work seamlessly with the{' '}
                <Text style={styles.instructionsBold}>Write / Preview</Text>{' '}
                toggle.
              </Text>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    // Premium shadow
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  instructionsContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsBold: {
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  commandRow: {
    marginBottom: 2,
  },
  commandRowPressed: {
    opacity: 0.7,
  },
  commandRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  commandIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  commandTextContainer: {
    flex: 1,
  },
  commandHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  commandText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  aliasText: {
    fontSize: 12,
  },
  descriptionText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  previewContainer: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  previewText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  insertIcon: {
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 16,
  },
  clearSearchButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerTip: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  footerTipText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
