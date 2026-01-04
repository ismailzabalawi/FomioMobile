// UI Spec: HelpSheet (Slash Commands)
// - Bottom sheet-style modal, grouped commands with quick scan
// - Sections: Basics, Formatting, Blocks, Media
// - Compact rows with command + alias + short description + tiny preview
// - Search bar to filter commands
// - Themed with Fomio tokens, dark/AMOLED ready

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ImageSquare, Hash, TextItalic, Quotes, ListBullets, ListChecks, Code, LinkSimple } from 'phosphor-react-native';

interface HelpSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpSheet({ visible, onClose }: HelpSheetProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const safeHeight = Math.max(0, screenHeight - insets.top - insets.bottom);
  const maxSheetHeight = safeHeight * 0.9;
  const [query, setQuery] = React.useState('');

  const sectionTitleClass =
    'text-caption font-semibold text-fomio-muted dark:text-fomio-muted-dark mb-2';
  const commandRowClass = 'flex-row items-start py-4 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark';
  const commandTextClass = 'text-body font-mono text-fomio-foreground dark:text-fomio-foreground-dark';
  const descriptionClass = 'text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1';
  const previewClass = 'text-caption font-mono text-fomio-muted dark:text-fomio-muted-dark mt-1';

  const sections = [
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
          description:
            'Insert an image placeholder (`![alt](url)`), opens your picker flow.',
          preview: 'Type: /image',
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
          description:
            'Bold the selected text, or insert `**…**` at the cursor if nothing is selected.',
          preview: '**bold**',
          icon: TextItalic,
        },
        {
          cmd: '/i',
          aliases: ['/italic'],
          description:
            'Italicise the selected text, or insert `_…_` at the cursor if nothing is selected.',
          preview: '_italic_',
          icon: TextItalic,
        },
        {
          cmd: '/link',
          aliases: [],
          description: 'Wrap selection with `[text](https://)`.',
          preview: '[text](url)',
          icon: LinkSimple,
        },
        {
          cmd: '/code',
          aliases: ['/fence'],
          description: 'Insert a code fence with a placeholder block.',
          preview: '```\\ncode\\n```',
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
          description: 'Turn the current line into a level-1 heading (`# Heading`).',
          preview: '# Heading 1',
          icon: Hash,
        },
        {
          cmd: '/h2',
          aliases: [],
          description: 'Turn the current line into a level-2 heading (`## Heading`).',
          preview: '## Heading 2',
          icon: Hash,
        },
        {
          cmd: '/h3',
          aliases: [],
          description: 'Turn the current line into a level-3 heading (`### Heading`).',
          preview: '### Heading 3',
          icon: Hash,
        },
        {
          cmd: '/quote',
          aliases: [],
          description: 'Turn the current line into a quote (`> text`).',
          preview: '> Quote text',
          icon: Quotes,
        },
        {
          cmd: '/list',
          aliases: [],
          description: 'Turn the current line into a bullet item (`- item`).',
          preview: '- bullet item',
          icon: ListBullets,
        },
        {
          cmd: '/todo',
          aliases: ['/task'],
          description: 'Turn the current line into a checklist item (`- [ ] task`).',
          preview: '- [ ] Task',
          icon: ListChecks,
        },
      ],
    },
  ];

  const filteredSections = sections
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="bg-fomio-bg dark:bg-fomio-bg-dark rounded-t-3xl"
            style={{
              maxHeight: maxSheetHeight,
              height: maxSheetHeight * 0.9,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
              <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                Slash Commands
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Close slash commands help"
              >
                <X
                  size={20}
                  color={isDark ? '#A1A1AA' : '#6B6B72'}
                  weight="regular"
                />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-4 pb-3 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search commands (e.g. /h1, link, list)"
                placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                className="px-3 py-2 rounded-xl bg-fomio-card dark:bg-fomio-card-dark text-body text-fomio-foreground dark:text-fomio-foreground-dark"
                autoCorrect={false}
                autoCapitalize="none"
                accessible
                accessibilityLabel="Search slash commands"
              />
            </View>

            {/* Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ 
                paddingHorizontal: 16, 
                paddingVertical: 12,
                paddingBottom: insets.bottom + 12,
                minHeight: 420,
              }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled
            >
              {/* Intro */}
              <View className="mb-4">
                <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
                  Type a slash command at the <Text className="font-semibold">end of a line</Text>{' '}
                  in <Text className="font-semibold">Write</Text> mode to format text or insert
                  content. The command will disappear and the formatting will be applied.
                </Text>
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-2">
                  Examples: <Text className="font-mono">This is important /b</Text> or{' '}
                  <Text className="font-mono">Dark UI Design /h1</Text>.
                </Text>
              </View>

              {(filteredSections.length ? filteredSections : sections).map((section) => (
                <View key={section.title} className="mb-4">
                  <Text className={sectionTitleClass}>{section.title}</Text>
                  {section.items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <View
                        key={`${item.cmd}-${index}`}
                        className={commandRowClass}
                      >
                        {Icon && (
                          <Icon
                            size={18}
                            color={isDark ? '#A1A1AA' : '#6B6B72'}
                            weight="regular"
                            style={{ marginRight: 12, marginTop: 2 }}
                          />
                        )}
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-x-2">
                            <Text className={commandTextClass}>{item.cmd}</Text>
                            {item.aliases.length > 0 && (
                              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                                (also: {item.aliases.join(', ')})
                              </Text>
                            )}
                          </View>
                          <Text className={descriptionClass}>
                            {item.description}
                          </Text>
                          {item.preview && (
                            <>
                              <Text className={previewClass}>
                                {item.preview}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View className="mt-4 mb-2">
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                  You can use commands multiple times in the same Byte. All formatting works
                  seamlessly with the <Text className="font-semibold">Write / Preview</Text> toggle.
                </Text>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
