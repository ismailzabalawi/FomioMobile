// UI Spec: TeretPickerSheet
// - Simple bottom sheet picker for selecting Terets
// - Uses React Native Modal (no Reanimated dependency for simpler picker)
// - Mock data for Step 2 (will be replaced with real data in Step 3)
// - Uses NativeWind classes with semantic tokens throughout
// - Minimal, focused on Teret selection only

import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Teret } from '@/shared/useTerets';
import { Check, X } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface TeretPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (teret: Teret) => void;
  selectedTeret: Teret | null;
}

// Mock Terets for Step 2 - will be replaced with real data in Step 3
const MOCK_TERETS: Teret[] = [
  {
    id: 101,
    name: 'Dark UI Design',
    description: '',
    slug: 'dark-ui',
    color: '#000000',
    text_color: '#ffffff',
    topic_count: 0,
    post_count: 0,
    parent_category_id: 1,
    parent_category: { id: 1, name: 'Design', color: '#000000', slug: 'design' },
    read_restricted: false,
    permission: 1,
  },
  {
    id: 102,
    name: 'React Native',
    description: '',
    slug: 'react-native',
    color: '#000000',
    text_color: '#ffffff',
    topic_count: 0,
    post_count: 0,
    parent_category_id: 1,
    parent_category: { id: 1, name: 'Tech', color: '#000000', slug: 'tech' },
    read_restricted: false,
    permission: 1,
  },
  {
    id: 103,
    name: 'Cars & EVs',
    description: '',
    slug: 'cars-evs',
    color: '#000000',
    text_color: '#ffffff',
    topic_count: 0,
    post_count: 0,
    parent_category_id: 1,
    parent_category: { id: 1, name: 'General', color: '#000000', slug: 'general' },
    read_restricted: false,
    permission: 1,
  },
];

export function TeretPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedTeret,
}: TeretPickerSheetProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSelectTeret = (teret: Teret) => {
    // Haptic feedback on selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
    
    onSelect(teret);
    onClose();
  };

  const renderTeretItem = ({ item }: { item: Teret }) => {
    const isSelected = item.id === selectedTeret?.id;

    return (
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
        onPress={() => handleSelectTeret(item)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Select teret ${item.name}`}
      >
        <Text className="text-body text-fomio-foreground dark:text-fomio-foreground-dark flex-1">
          {item.name}
        </Text>
        {isSelected && (
          <Check
            size={16}
            color={isDark ? '#3B82F6' : '#2563EB'}
            weight="regular"
          />
        )}
      </TouchableOpacity>
    );
  };

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
              maxHeight: '90%',
              paddingBottom: insets.bottom,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pb-3 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
              <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                Choose Teret
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Close teret selection"
              >
                <X size={20} color={isDark ? '#A1A1AA' : '#6B6B72'} weight="regular" />
              </TouchableOpacity>
            </View>

            {/* Teret List */}
            <FlatList
              data={MOCK_TERETS}
              renderItem={renderTeretItem}
              keyExtractor={(item: Teret) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

