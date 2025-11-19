// UI Spec: TeretPickerSheet
// - Accordion-style picker: Hubs expand to show their Terets
// - Uses React Native Modal (no Reanimated dependency for simpler picker)
// - Only Terets are selectable; Hubs expand/collapse to reveal Terets
// - Uses NativeWind classes with semantic tokens throughout
// - Mimics Discourse backend behavior with hierarchical navigation

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Teret, CategoryItem } from '@/shared/useTerets';
import { Check, X, CaretRight, CaretDown } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface TeretPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (teret: Teret) => void;
  selectedTeret: Teret | null;
  allCategories: CategoryItem[]; // Changed from terets: Teret[] to show all categories
  isLoading?: boolean;
  error?: string | null;
}

export function TeretPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedTeret,
  allCategories, // Changed from terets
  isLoading = false,
  error = null,
}: TeretPickerSheetProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Track which Hub is expanded (null = none expanded)
  const [expandedHubId, setExpandedHubId] = useState<number | null>(null);

  // DEBUG: Log picker props
  useEffect(() => {
    if (visible) {
      console.log('🔍 [TeretPickerSheet] Picker opened with props:', {
        allCategoriesCount: allCategories.length,
        hubsCount: allCategories.filter(c => !c.isSelectable).length,
        teretsCount: allCategories.filter(c => c.isSelectable).length,
        isLoading,
        error,
        selectedTeretName: selectedTeret?.name,
      });
    }
  }, [visible, allCategories, isLoading, error, selectedTeret]);

  // Reset expanded state when modal closes
  useEffect(() => {
    if (!visible) {
      setExpandedHubId(null);
    }
  }, [visible]);

  // Separate Hubs and group Terets by Hub
  const hubs = useMemo(() => {
    return allCategories.filter(c => !c.isSelectable);
  }, [allCategories]);

  const teretsByHub = useMemo(() => {
    const map = new Map<number, CategoryItem[]>();
    allCategories
      .filter(c => c.isSelectable && c.parent_category_id)
      .forEach(teret => {
        const hubId = teret.parent_category_id!;
        if (!map.has(hubId)) {
          map.set(hubId, []);
        }
        map.get(hubId)!.push(teret);
      });
    
    // Sort Terets within each Hub by activity
    map.forEach((terets, hubId) => {
      terets.sort((a, b) => b.topic_count - a.topic_count);
    });
    
    return map;
  }, [allCategories]);

  const handleToggleHub = (hubId: number) => {
    console.log('🔍 [TeretPickerSheet] Hub tapped:', {
      hubId,
      currentExpanded: expandedHubId,
      willExpand: expandedHubId !== hubId,
    });
    
    // Haptic feedback on expand/collapse
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    setExpandedHubId(prev => {
      const newValue = prev === hubId ? null : hubId;
      console.log('🔍 [TeretPickerSheet] Expanded Hub changed:', {
        from: prev,
        to: newValue,
      });
      return newValue;
    });
  };

  const handleSelectTeret = (teret: CategoryItem) => {
    // Safety check: Only allow selecting Terets (isSelectable === true)
    if (!teret.isSelectable || !teret.parent_category_id) {
      return; // Should never happen, but defensive check
    }

    // Convert CategoryItem to Teret format
    const teretObj: Teret = {
      id: teret.id,
      name: teret.name,
      description: teret.description,
      slug: teret.slug,
      color: teret.color,
      text_color: teret.text_color,
      topic_count: teret.topic_count,
      post_count: teret.post_count,
      parent_category_id: teret.parent_category_id,
      parent_category: teret.parent_category || {
        id: teret.parent_category_id,
        name: 'Unknown Hub',
        color: '#000000',
        slug: 'unknown',
      },
      read_restricted: teret.read_restricted,
      permission: teret.permission,
    };

    // Haptic feedback on selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
    
    onSelect(teretObj);
    onClose();
  };

  const renderHubItem = ({ item }: { item: CategoryItem }) => {
    const hubId = item.id;
    const isExpanded = expandedHubId === hubId;
    const hubTerets = teretsByHub.get(hubId) || [];
    const hasTerets = hubTerets.length > 0;

    console.log('🔍 [TeretPickerSheet] Rendering Hub item:', {
      hubId,
      hubName: item.name,
      isExpanded,
      hasTerets,
      teretsCount: hubTerets.length,
      currentExpandedId: expandedHubId,
      willRenderExpanded: isExpanded,
    });

    // DEBUG: Log when we're about to render expanded content
    if (isExpanded) {
      console.log('🔍 [TeretPickerSheet] RENDERING EXPANDED CONTENT for Hub:', hubId);
    }

    return (
      <View style={{ overflow: 'visible' }}>
        {/* Hub Row */}
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
          onPress={() => handleToggleHub(hubId)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            hasTerets
              ? `${item.name} (${hubTerets.length} teret${hubTerets.length !== 1 ? 's' : ''}), tap to ${isExpanded ? 'collapse' : 'expand'}`
              : `${item.name} (no terets available), tap to expand`
          }
        >
          <View className="flex-row items-center flex-1">
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <CaretDown
                size={16}
                color={isDark ? '#A1A1AA' : '#6B6B72'}
                weight="regular"
                style={{
                  marginRight: 8,
                  opacity: hasTerets ? 1 : 0.4,
                }}
              />
            ) : (
              <CaretRight
                size={16}
                color={isDark ? '#A1A1AA' : '#6B6B72'}
                weight="regular"
                style={{
                  marginRight: 8,
                  opacity: hasTerets ? 1 : 0.4,
                }}
              />
            )}
            
            <Text 
              className={`text-body flex-1 ${
                hasTerets
                  ? 'text-fomio-foreground dark:text-fomio-foreground-dark'
                  : 'text-fomio-muted dark:text-fomio-muted-dark'
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            
            {/* Teret count badge */}
            {hasTerets && (
              <View className="ml-2 px-2 py-0.5 rounded bg-fomio-muted/20 dark:bg-fomio-muted-dark/20">
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                  {hubTerets.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Terets List */}
        {isExpanded && (
          <View 
            style={{
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              paddingVertical: 12,
              minHeight: 50,
            }}
          >
            {hasTerets ? (
              hubTerets.map((teret) => {
                const isSelected = teret.id === selectedTeret?.id;
                
                console.log('🔍 [TeretPickerSheet] Rendering Teret:', teret.name);
                
                return (
                  <TouchableOpacity
                    key={teret.id}
                    className="flex-row items-center justify-between px-4 py-3 pl-12 active:opacity-70"
                    onPress={() => handleSelectTeret(teret)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Select teret ${teret.name} in ${item.name}`}
                  >
                    <Text 
                      className="text-body text-fomio-foreground dark:text-fomio-foreground-dark flex-1"
                      numberOfLines={1}
                    >
                      {teret.name}
                    </Text>
                    
                    {isSelected && (
                      <Check
                        size={16}
                        color={isDark ? '#3B82F6' : '#2563EB'}
                        weight="regular"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ paddingHorizontal: 16, paddingLeft: 48, paddingVertical: 12 }}>
                <Text 
                  className="text-body text-fomio-muted dark:text-fomio-muted-dark italic"
                  style={{ fontSize: 14 }}
                >
                  No Terets available in this Hub
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
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

            {/* Category List with loading/error/empty states */}
            {isLoading ? (
              <View className="px-4 py-6">
                <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark text-center">
                  Loading categories…
                </Text>
              </View>
            ) : error ? (
              <View className="px-4 py-6">
                <Text className="text-body text-fomio-danger dark:text-fomio-danger-dark text-center">
                  Couldn't load categories. Try again later.
                </Text>
              </View>
            ) : hubs.length === 0 ? (
              <View className="px-4 py-6">
                <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark text-center">
                  No categories available yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={hubs}
                renderItem={renderHubItem}
                keyExtractor={(item: CategoryItem) => item.id.toString()}
                extraData={expandedHubId} // Force re-render when expandedHubId changes
                removeClippedSubviews={false} // CRITICAL: Prevent clipping of expanded content
                nestedScrollEnabled={true} // Enable nested scrolling if needed
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

