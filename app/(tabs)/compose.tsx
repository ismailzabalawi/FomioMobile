// UI Spec: ComposeScreen
// - Editor-first create experience with zero friction
// - Uses NativeWind semantic tokens throughout
// - Bottom sheet for Teret selection
// - Full image picker support
// - Haptic feedback on key interactions
// - Inline validation (no Alert dialogs)
// - Smart Post button enable/disable

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme';
import { useHubs } from '../../shared/useHubs';
import { useTerets, Teret } from '../../shared/useTerets';
import { useAuth } from '../../shared/useAuth';
import { useDiscourseSettings } from '../../shared/useDiscourseSettings';
import { createTopic } from '../../lib/discourse';
import { SignIn, ImageSquare, Check, Warning } from 'phosphor-react-native';
import { 
  ComposeEditor,
  TeretSelector,
  MediaGrid,
  useImagePicker,
  MediaItem,
} from '@/components/compose';
import { AppHeader } from '@/components/ui/AppHeader';

interface ValidationErrors {
  title?: string;
  content?: string;
  hub?: string;
  general?: string;
}

export default function ComposeScreen(): React.ReactElement {
  const { isDark } = useTheme();
  const { hubs } = useHubs(); // For grouping/display context only
  const { terets, isLoading: teretsLoading, errorMessage: teretsError, refreshTerets } = useTerets();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { minTitle, minPost, loading: settingsLoading } = useDiscourseSettings();
  const { pickImages, isPicking } = useImagePicker();
  
  // Editor state - structured cleanly for future draft autosave
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedTeret, setSelectedTeret] = useState<Teret | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Clear errors when user starts typing
  useEffect(() => {
    if (title.trim() && errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  }, [title, errors.title]);

  useEffect(() => {
    if (content.trim() && errors.content) {
      setErrors((prev) => ({ ...prev, content: undefined }));
    }
  }, [content, errors.content]);

  useEffect(() => {
    if (selectedTeret && errors.hub) {
      setErrors((prev) => ({ ...prev, hub: undefined }));
    }
  }, [selectedTeret, errors.hub]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Compute lengths for validation
  const titleLen = title.trim().length;
  const bodyLen = content.trim().length;

  // Smart Post button enable logic - enforces Discourse minimums
  const canPost = useMemo(() => {
    return (
      titleLen >= minTitle &&
      bodyLen >= minPost &&
      selectedTeret !== null &&
      isAuthenticated &&
      !isAuthLoading &&
      !isCreating &&
      !settingsLoading
    );
  }, [titleLen, bodyLen, minTitle, minPost, selectedTeret, isAuthenticated, isAuthLoading, isCreating, settingsLoading]);

  const handleCancel = useCallback((): void => {
    router.back();
  }, []);

  const handlePost = useCallback(async (): Promise<void> => {
    // Clear previous errors
    setErrors({});
    setSuccessMessage('');

    // Wait for auth to load
    if (isAuthLoading) {
      setErrors({ general: 'Please wait, authentication is loading...' });
      return;
    }

    // Validate authentication
    if (!isAuthenticated) {
      setErrors({ general: 'You need to be logged in to create posts' });
      return;
    }

    // Validate teret selection (first - most important)
    if (!selectedTeret) {
      setErrors((prev) => ({ ...prev, hub: 'Please select a Teret to post in' }));
      return;
    }

    // Validate title with Discourse minimum
    const titleLen = title.trim().length;
    if (titleLen < minTitle) {
      setErrors((prev) => ({ 
        ...prev, 
        title: `Title must be at least ${minTitle} characters (currently ${titleLen})` 
      }));
      return;
    }
    
    // Validate content with Discourse minimum
    const bodyLen = content.trim().length;
    if (bodyLen < minPost) {
      setErrors((prev) => ({ 
        ...prev, 
        content: `Content must be at least ${minPost} characters (currently ${bodyLen})` 
      }));
      return;
    }

    try {
      // Haptic feedback on post
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Ignore haptic errors
      }

      setIsCreating(true);
      setErrors({});

      console.log('📝 Creating post with teret:', {
        teretId: selectedTeret.id, // This is the subcategory ID (what Discourse needs)
        teretName: selectedTeret.name,
        parentHub: selectedTeret.parent_category.name,
        parentHubId: selectedTeret.parent_category_id,
        user: user?.username,
        isAuthenticated: isAuthenticated,
        hasImages: images.length > 0,
      });

      // TODO: Upload images first if any, then embed URLs in content
      // For MVP, we'll just create the post with text content
      //
      // IMPORTANT: Fomio → Discourse category mapping:
      // - Hub = Discourse parent category (used for grouping/display only)
      // - Teret = Discourse subcategory (this is what we post to!)
      // - Bytes must be created in Terets (subcategories), never directly in Hubs
      // - selectedTeret.id is the subcategory ID that Discourse requires
      const result = await createTopic({
        title: title.trim(),
        raw: content.trim(),
        categoryId: selectedTeret.id, // Subcategory ID (Teret), not parent category ID (Hub)
      });

      // Success feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore haptic errors
      }

      setSuccessMessage('Your post has been published!');

      // Clear form and navigate back after short delay
      setTimeout(() => {
        setTitle('');
      setContent('');
        setSelectedTeret(null);
        setImages([]);
        setSuccessMessage('');
      router.back();
      }, 1500);
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to create post. Please try again.';
      setErrors({ general: errorMsg });

      // Error haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Ignore haptic errors
      }
    } finally {
      setIsCreating(false);
    }
  }, [
    title,
    content,
    selectedTeret,
    images,
    isAuthenticated,
    isAuthLoading,
    user,
  ]);

  const handleSelectTeret = useCallback(
    (teret: Teret) => {
      setSelectedTeret(teret);
      // Haptic feedback on selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Ignore haptic errors
      });
    },
    []
  );

  const handleClearTeret = useCallback(() => {
    setSelectedTeret(null);
  }, []);

  const handleAddImages = useCallback(async () => {
    const pickedImages = await pickImages();
    if (pickedImages.length > 0) {
      setImages((prev) => [...prev, ...pickedImages]);
    }
  }, [pickImages]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    // Haptic feedback on removal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
  }, []);

  // Loading state
  if (teretsLoading) {
    return (
      <ScreenContainer variant="card">
        <AppHeader 
          title="Create Byte" 
          canGoBack 
          onBackPress={handleCancel} 
          withSafeTop={false}
          tone="card"
          rightActions={[
            <Button key="post" disabled variant="default" size="sm">
              Post
            </Button>
          ]}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
            Loading terets...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (teretsError) {
    return (
      <ScreenContainer variant="card">
        <AppHeader 
          title="Create Byte" 
          canGoBack 
          onBackPress={handleCancel} 
          withSafeTop={false}
          tone="card"
          rightActions={[
            <Button key="post" disabled variant="default" size="sm">
              Post
            </Button>
          ]}
        />
        <View className="flex-1 justify-center items-center px-4">
          <Warning size={48} color="#EF4444" weight="regular" />
          <Text className="text-title font-semibold text-fomio-danger dark:text-fomio-danger-dark mt-4 mb-2 text-center">
            Failed to load terets
          </Text>
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark mb-6 text-center">
            {teretsError || 'Please check your connection and try again'}
          </Text>
          <Button onPress={refreshTerets} variant="default">
            Retry
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="card">
      <AppHeader 
        title="Create Byte" 
        canGoBack 
        onBackPress={handleCancel} 
        withSafeTop={false}
        tone="card"
        progress={isCreating ? 0.5 : undefined}
        rightActions={[
          <Button
            key="post"
            onPress={handlePost}
            disabled={!canPost}
            loading={isCreating}
            variant={canPost ? 'default' : 'ghost'}
            size="sm"
            style={{ minWidth: 70 }}
          >
            {isCreating ? 'Posting...' : 'Post'}
          </Button>
        ]}
      />

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Authentication Warning */}
          {!isAuthLoading && !isAuthenticated && (
            <View className="mx-4 mt-4 p-4 rounded-fomio-card bg-fomio-warning/20 dark:bg-fomio-warning-dark/20 flex-row items-center">
              <SignIn size={20} color="#F59E0B" weight="regular" />
              <View className="flex-1 ml-3">
                <Text className="text-body font-semibold text-fomio-warning dark:text-fomio-warning-dark mb-1">
                  Sign in to post
            </Text>
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                  You need to be logged in to create posts
            </Text>
          </View>
              <Button
                onPress={() => router.push('/(auth)/signin' as any)}
                variant="default"
                size="sm"
              >
                Sign In
              </Button>
                </View>
              )}

          {/* General Error Message */}
          {errors.general && (
            <View className="mx-4 mt-4 p-3 rounded-fomio-card bg-fomio-danger/20 dark:bg-fomio-danger-dark/20 flex-row items-center">
              <Warning size={16} color="#EF4444" weight="regular" />
              <Text className="text-body text-fomio-danger dark:text-fomio-danger-dark ml-2 flex-1">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Success Message */}
          {successMessage && (
            <View className="mx-4 mt-4 p-3 rounded-fomio-card bg-fomio-accent/20 dark:bg-fomio-accent-dark/20 flex-row items-center">
              <Check size={16} color="#22C55E" weight="regular" />
              <Text className="text-body text-fomio-accent dark:text-fomio-accent-dark ml-2 flex-1">
                {successMessage}
              </Text>
            </View>
          )}

          {/* Teret Selector - First step */}
          <TeretSelector
            hubs={hubs}
            terets={terets}
            selectedTeret={selectedTeret}
            onSelectTeret={handleSelectTeret}
            onClearSelection={handleClearTeret}
            isLoading={teretsLoading}
            error={teretsError}
          />

          {/* Teret Selection Error */}
          {errors.hub && (
            <View className="mx-4 mt-2 mb-2 flex-row items-center">
              <Warning size={14} color="#EF4444" weight="regular" />
              <Text className="text-caption text-fomio-danger dark:text-fomio-danger-dark ml-2">
                {errors.hub}
              </Text>
            </View>
          )}

          {/* Compose Editor - Title + Body with Discourse rules */}
          <ComposeEditor
            title={title}
            content={content}
            onTitleChange={setTitle}
            onContentChange={setContent}
            titleError={errors.title}
            contentError={errors.content}
            minTitle={minTitle}
            minContent={minPost}
          />

          {/* Media Grid */}
          {images.length > 0 && (
            <MediaGrid media={images} onRemove={handleRemoveImage} />
          )}

          {/* Add Images Button - Modern tool-style button */}
          <TouchableOpacity 
            onPress={handleAddImages}
            disabled={isPicking}
            className="mx-4 mt-3 px-3 py-2 rounded-fomio-pill bg-transparent border border-transparent flex-row items-center self-start"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Add images"
            activeOpacity={0.7}
          >
            <ImageSquare size={18} color="#2563EB" weight="regular" />
            <Text className="ml-2 text-body font-semibold text-fomio-primary dark:text-fomio-primary-dark">
              {isPicking ? 'Selecting images...' : 'Add images'}
            </Text>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
