// UI Spec: TeretSelector
// - Bottom sheet selector with search functionality
// - Uses @gorhom/bottom-sheet for modal bottom sheet
// - Displays Terets (subcategories) grouped by Hubs (parent categories) for UX
// - Stores Teret selection (subcategory ID) for Discourse API
// - Uses NativeWind classes throughout
// - Handles loading and error states

import 'react-native-reanimated';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { ThemedBottomSheet, BottomSheetFlatList, BottomSheetModalRef } from '@/components/ui';
import { Hub } from '@/shared/discourseApi';
import { Teret } from '@/shared/useTerets';
import { Hash, Users, TrendUp, Star, MagnifyingGlass, X } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { cn } from '@/lib/utils/cn';

interface TeretSelectorProps {
  hubs: Hub[]; // For grouping/display context
  terets: Teret[]; // Actual selectable items (subcategories)
  selectedTeret: Teret | null;
  onSelectTeret: (teret: Teret) => void;
  onClearSelection: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TeretSelector({
  hubs,
  terets,
  selectedTeret,
  onSelectTeret,
  onClearSelection,
  isLoading = false,
  error = null,
}: TeretSelectorProps) {
  const { isDark } = useTheme();
  const { height } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const bottomSheetRef = useRef<BottomSheetModalRef>(null);
  const snapPoints = useMemo(() => [height * 0.5, height * 0.9], [height]);

  // Filter terets based on search query
  const filteredTerets = useMemo(() => {
    if (!searchQuery.trim()) return terets;
    const query = searchQuery.toLowerCase();
    return terets.filter(
      (teret) =>
        teret.name.toLowerCase().includes(query) ||
        teret.description?.toLowerCase().includes(query) ||
        teret.parent_category.name.toLowerCase().includes(query)
    );
  }, [terets, searchQuery]);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    setSearchQuery('');
  }, []);

  const handleSelectTeret = useCallback(
    (teret: Teret) => {
      onSelectTeret(teret);
      handleClose();
    },
    [onSelectTeret, handleClose]
  );

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  const renderTeretItem = useCallback(
    ({ item }: { item: Teret }) => (
      <TouchableOpacity
        className="mb-3 p-4 rounded-fomio-card bg-fomio-card dark:bg-fomio-card-dark border border-fomio-border-soft dark:border-fomio-border-soft-dark"
        onPress={() => handleSelectTeret(item)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Select teret ${item.name}`}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2 flex-wrap">
              <Hash size={16} color="#2563EB" weight="fill" />
              <Text className="text-body font-semibold text-fomio-foreground dark:text-fomio-foreground-dark ml-2">
                {item.name}
              </Text>
              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark ml-2">
                • {item.parent_category.name}
              </Text>
              {item.topic_count > 100 && (
                <View className="w-4 h-4 rounded-full bg-fomio-warning dark:bg-fomio-warning-dark items-center justify-center ml-2">
                  <Star size={12} color="#FFFFFF" weight="fill" />
                </View>
              )}
            </View>
            {item.description && (
              <Text
                className="text-caption text-fomio-muted dark:text-fomio-muted-dark"
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
          <View className="items-end">
            <View className="flex-row items-center mb-1">
              <Users size={14} color="#6B6B72" weight="regular" />
              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark ml-1">
                {formatCount(item.topic_count)} topics
              </Text>
            </View>
            {item.topic_count > 50 && (
              <View className="flex-row items-center">
                <TrendUp size={14} color="#F59E0B" weight="fill" />
                <Text className="text-caption text-fomio-warning dark:text-fomio-warning-dark ml-1">
                  Active
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleSelectTeret, formatCount]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
            Loading terets...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 justify-center items-center py-20 px-4">
          <Text className="text-body text-fomio-danger dark:text-fomio-danger-dark text-center mb-2">
            Failed to load terets
          </Text>
          <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark text-center">
            {error}
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center py-20">
        <MagnifyingGlass size={48} color={isDark ? "#A1A1AA" : "#6B6B72"} weight="regular" />
        <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark mt-4 text-center">
          {searchQuery
            ? `No terets found matching "${searchQuery}"`
            : 'No terets available'}
        </Text>
        {searchQuery && (
          <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-2 text-center">
            Try a different search term
          </Text>
        )}
      </View>
    );
  }, [isLoading, error, searchQuery]);

  return (
    <>
      {/* Teret Chip - Modern chip/button style */}
      <TouchableOpacity
        className="mx-4 mt-3 px-4 py-3 rounded-fomio-pill bg-fomio-card/80 dark:bg-fomio-card-dark/80 border border-fomio-border-soft/60 dark:border-fomio-border-soft-dark/70"
        onPress={handleOpen}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          selectedTeret ? `Selected teret: ${selectedTeret.name}` : 'Select a teret to post in'
        }
        activeOpacity={0.7}
      >
        {selectedTeret ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 flex-wrap">
              <Hash size={20} color="#2563EB" weight="fill" />
              <Text className="text-body font-semibold text-fomio-foreground dark:text-fomio-foreground-dark ml-2">
                {selectedTeret.name}
              </Text>
              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark ml-2">
                • {selectedTeret.parent_category.name}
              </Text>
              {selectedTeret.topic_count > 100 && (
                <View className="w-4 h-4 rounded-full bg-fomio-warning dark:bg-fomio-warning-dark items-center justify-center ml-2">
                  <Star size={12} color="#FFFFFF" weight="fill" />
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              className="p-1"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear teret selection"
            >
              <X size={18} color={isDark ? "#A1A1AA" : "#6B6B72"} weight="regular" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
              Choose a Teret...
            </Text>
            <View className="w-5 h-5" />
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <ThemedBottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
      >
        <View className="flex-1 bg-fomio-bg dark:bg-fomio-bg-dark rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-3 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
            <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
              Select Teret ({filteredTerets.length} available)
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="p-2"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close teret selection"
            >
              <X size={20} color={isDark ? "#A1A1AA" : "#6B6B72"} weight="regular" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="mx-4 mt-3 mb-2 p-3 rounded-fomio-card bg-fomio-card dark:bg-fomio-card-dark border border-fomio-border-soft dark:border-fomio-border-soft-dark flex-row items-center">
            <MagnifyingGlass size={20} color={isDark ? "#A1A1AA" : "#6B6B72"} weight="regular" />
            <TextInput
              className="flex-1 ml-2 text-body text-fomio-foreground dark:text-fomio-foreground-dark"
              placeholder="Search terets..."
              placeholderTextColor={isDark ? "rgba(161, 161, 170, 0.8)" : "rgba(107, 107, 114, 0.6)"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessible
              accessibilityLabel="Search terets input"
            />
          </View>

          {/* Teret List */}
          <BottomSheetFlatList
            data={filteredTerets}
            renderItem={renderTeretItem}
            keyExtractor={(item: Teret) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ThemedBottomSheet>
    </>
  );
}
