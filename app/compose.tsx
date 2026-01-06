// UI Spec: ComposeScreen - Premium Edition
// - Frosted glass header with blur effect
// - Premium components throughout (TeretChip, SegmentedControl, etc.)
// - DraftStatusBadge for save feedback
// - PremiumPostButton with animations
// - Clean visual hierarchy with micro-interactions
// - Full image picker support
// - Haptic feedback on key interactions
// - Inline validation (no Alert dialogs)

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme';
import { useTerets, Teret } from '@/shared/useTerets';
import { useAuth } from '@/shared/auth-context';
import { useDiscourseSettings } from '@/shared/useDiscourseSettings';
import { createTopic } from '@/lib/discourse';
import { discourseApi } from '@/shared/discourseApi';
import { useSettingsStorage } from '@/shared/useSettingsStorage';
import { getTokens } from '@/shared/design/tokens';
import { SignIn, Warning, X, Question } from 'phosphor-react-native';
import {
  ComposeEditor,
  MediaGrid,
  useImagePicker,
  MediaItem,
  HelpSheet,
  DraftStatusBadge,
  PremiumPostButton,
} from '@/components/compose';
import { useSafeNavigation } from '@/shared/hooks/useSafeNavigation';
import { TeretPickerSheet } from '@/components/terets/TeretPickerSheet';
import { useToast } from '@/shared/form-validation';

interface ValidationErrors {
  title?: string;
  content?: string;
  hub?: string;
  general?: string;
}

const COMPOSE_DRAFT_META_KEY = 'compose_draft_meta_v1';
const NEW_TOPIC_DRAFT_KEY = 'new_topic';
const DEFAULT_HIT_SLOP = Platform.OS === 'ios' ? 16 : 20;
const SPRING_CONFIG = { damping: 16, stiffness: 220 };

export default function ComposeScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const insets = useSafeAreaInsets();
  const { safeBack } = useSafeNavigation();
  const params = useLocalSearchParams<{ draftKey?: string; draftSequence?: string; teret?: string }>();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const {
    terets,
    allCategories,
    isLoading: teretsLoading,
    errorMessage: teretsError,
    refreshTerets,
  } = useTerets();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { minTitle, minPost, loading: settingsLoading } = useDiscourseSettings();
  const { pickImages, isPicking } = useImagePicker();
  const { settings, loading: settingsStorageLoading } = useSettingsStorage();
  const { showInfo } = useToast();

  // Editor state
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [selectedTeret, setSelectedTeret] = useState<Teret | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [allowBack, setAllowBack] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isTeretSheetOpen, setIsTeretSheetOpen] = useState(false);
  const [isHelpSheetOpen, setIsHelpSheetOpen] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [draftKey, setDraftKey] = useState<string>(NEW_TOPIC_DRAFT_KEY);
  const [draftSequence, setDraftSequence] = useState<number>(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const autoSave = settings.autoSave;

  const paramDraftKey = useMemo(
    () => (typeof params?.draftKey === 'string' ? params.draftKey : undefined),
    [params]
  );
  const paramDraftSequence = useMemo(() => {
    const value =
      typeof params?.draftSequence === 'string'
        ? parseInt(params.draftSequence, 10)
        : undefined;
    return Number.isFinite(value) ? (value as number) : 0;
  }, [params]);

  // Deep link teret pre-selection
  const paramTeret = useMemo(
    () => (typeof params?.teret === 'string' ? params.teret : undefined),
    [params]
  );
  const [teretPreselected, setTeretPreselected] = useState(false);

  useEffect(() => {
    if (paramTeret && !teretPreselected && terets.length > 0) {
      const found = terets.find((t) => t.slug === paramTeret);
      if (found) {
        setSelectedTeret(found);
        setTeretPreselected(true);
        Haptics.selectionAsync().catch(() => {});
      }
    }
  }, [paramTeret, teretPreselected, terets]);

  const latestDraftRef = useRef({
    title: '',
    body: '',
    teretId: 0,
    images: [] as MediaItem[],
    draftKey: NEW_TOPIC_DRAFT_KEY,
    draftSequence: 0,
  });

  // Clear errors when user starts typing
  useEffect(() => {
    if (title.trim() && errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  }, [title, errors.title]);

  useEffect(() => {
    if (body.trim() && errors.content) {
      setErrors((prev) => ({ ...prev, content: undefined }));
    }
  }, [body, errors.content]);

  useEffect(() => {
    if (selectedTeret && errors.hub) {
      setErrors((prev) => ({ ...prev, hub: undefined }));
    }
  }, [selectedTeret, errors.hub]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const persistDraftMeta = useCallback(async (key: string, sequence: number) => {
    try {
      await AsyncStorage.setItem(
        COMPOSE_DRAFT_META_KEY,
        JSON.stringify({ draftKey: key, sequence })
      );
    } catch {
      // Best-effort only
    }
  }, []);

  const clearDraftMeta = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(COMPOSE_DRAFT_META_KEY);
    } catch {
      // Best-effort only
    }
  }, []);

  const parseDraftContent = useCallback((rawDraft: any) => {
    if (!rawDraft) return {};
    if (typeof rawDraft === 'object') return rawDraft;
    try {
      return JSON.parse(rawDraft);
    } catch {
      return {};
    }
  }, []);

  const hydrateDraft = useCallback(
    async (key: string, sequence: number) => {
      if (isAuthLoading || !isAuthenticated) return;
      setDraftError(null);

      try {
        const response = await discourseApi.getDraft({ draftKey: key, sequence });

        if (!response.success) {
          if (response.status === 500 || response.status === 404) {
            setDraftKey(key);
            setDraftSequence(0);
            await persistDraftMeta(key, 0);
            setHasHydratedDraft(true);
            return;
          }
          setDraftError(response.error || 'Failed to load draft');
          setHasHydratedDraft(true);
          return;
        }

        if (!response.data) {
          setHasHydratedDraft(true);
          return;
        }

        const payload = response.data;
        const parsed = parseDraftContent(payload.draft || payload.data);

        if (parsed.title) setTitle(parsed.title);
        if (parsed.raw || parsed.reply) setBody(parsed.raw || parsed.reply || '');

        const categoryId = parsed.category_id || payload.category_id;
        if (categoryId) {
          const foundTeret = terets.find((t) => t.id === categoryId);
          if (foundTeret) {
            setSelectedTeret(foundTeret);
          }
        }

        const nextKey = payload.draft_key || key;
        const nextSequence = payload.draft_sequence ?? payload.sequence ?? sequence;
        setDraftKey(nextKey);
        setDraftSequence(nextSequence);
        await persistDraftMeta(nextKey, nextSequence);
      } catch (error) {
        setDraftError(
          error instanceof Error ? error.message : 'Failed to load draft'
        );
      } finally {
        setHasHydratedDraft(true);
      }
    },
    [isAuthLoading, isAuthenticated, parseDraftContent, terets, persistDraftMeta]
  );

  useEffect(() => {
    if (paramDraftKey) {
      setDraftKey(paramDraftKey);
      setDraftSequence(paramDraftSequence || 0);
      return;
    }

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(COMPOSE_DRAFT_META_KEY);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        if (parsed?.draftKey) {
          setDraftKey(parsed.draftKey);
        }
        if (typeof parsed?.sequence === 'number') {
          setDraftSequence(parsed.sequence);
        }
      } catch {
        // ignore cache errors
      }
    })();
  }, [paramDraftKey, paramDraftSequence]);

  useEffect(() => {
    if (hasHydratedDraft) return;
    if (teretsLoading || isAuthLoading || !isAuthenticated) return;

    const keyToLoad = paramDraftKey || draftKey || NEW_TOPIC_DRAFT_KEY;
    const seqToLoad =
      paramDraftKey !== undefined ? paramDraftSequence : draftSequence;

    hydrateDraft(keyToLoad, seqToLoad);
  }, [
    draftKey,
    draftSequence,
    paramDraftKey,
    paramDraftSequence,
    hydrateDraft,
    hasHydratedDraft,
    teretsLoading,
    isAuthLoading,
    isAuthenticated,
  ]);

  // Validation messages
  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;

  const titleValidationMessage =
    errors.title ||
    (titleLen > 0 && titleLen < minTitle
      ? `Title must be at least ${minTitle} characters (${titleLen}/${minTitle})`
      : undefined);

  const bodyValidationMessage =
    errors.content ||
    (bodyLen > 0 && bodyLen < minPost
      ? `Content must be at least ${minPost} characters (${bodyLen}/${minPost})`
      : undefined);

  // Track latest draft state
  useEffect(() => {
    latestDraftRef.current = {
      title,
      body,
      teretId: selectedTeret?.id || 0,
      images,
      draftKey,
      draftSequence,
    };
  }, [title, body, selectedTeret, images, draftKey, draftSequence]);

  const saveDraftIfNeeded = useCallback(
    async (reason: 'blur' | 'manual' | 'cancel' | 'debounce' = 'manual') => {
      if (isAuthLoading || !isAuthenticated) return;
      if (!autoSave && reason !== 'manual') return;

      const {
        title: latestTitle,
        body: latestBody,
        teretId,
        images: latestImages,
        draftKey: latestKey,
        draftSequence: latestSequence,
      } = latestDraftRef.current;

      const trimmedTitle = latestTitle.trim();
      const trimmedBody = latestBody.trim();
      const hasContent =
        trimmedTitle.length > 0 ||
        trimmedBody.length > 0 ||
        (latestImages && latestImages.length > 0);

      if (!hasContent) {
        if (latestSequence > 0) {
          await discourseApi.deleteDraft({
            draftKey: latestKey,
            sequence: latestSequence,
          });
          setDraftSequence(0);
          await clearDraftMeta();
        }
        return;
      }

      setIsSavingDraft(true);
      setDraftError(null);

      const response = await discourseApi.saveDraft({
        draftKey: latestKey || NEW_TOPIC_DRAFT_KEY,
        sequence: latestSequence,
        draft: {
          title: trimmedTitle,
          raw: trimmedBody,
          category_id: teretId || undefined,
        },
      });

      if (response.success) {
        const nextKey = response.data?.draft_key || latestKey || NEW_TOPIC_DRAFT_KEY;
        const nextSequence =
          response.data?.draft_sequence ??
          response.data?.sequence ??
          latestSequence + 1;

        setDraftKey(nextKey);
        setDraftSequence(nextSequence);
        latestDraftRef.current.draftKey = nextKey;
        latestDraftRef.current.draftSequence = nextSequence;
        await persistDraftMeta(nextKey, nextSequence);
        setLastSavedAt(new Date().toISOString());
      } else {
        setDraftError(response.error || 'Failed to save draft');
      }

      setIsSavingDraft(false);
    },
    [isAuthLoading, isAuthenticated, persistDraftMeta, clearDraftMeta, autoSave]
  );

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave || settingsStorageLoading || !hasHydratedDraft) return;
    const timeout = setTimeout(() => {
      void saveDraftIfNeeded('debounce');
    }, 1200);
    return () => clearTimeout(timeout);
  }, [
    autoSave,
    settingsStorageLoading,
    hasHydratedDraft,
    title,
    body,
    selectedTeret,
    images,
    saveDraftIfNeeded,
  ]);

  // Post button enable logic
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

  const postDisabled = !canPost || isCreating || isUploadingImages;

  // Save on screen blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (autoSave) {
          void saveDraftIfNeeded('blur');
        }
      };
    }, [saveDraftIfNeeded, autoSave])
  );

  const clearDraftAfterPost = useCallback(async () => {
    try {
      await discourseApi.deleteDraft({
        draftKey: draftKey || NEW_TOPIC_DRAFT_KEY,
        sequence: draftSequence,
      });
    } catch {
      // Best-effort only
    }
    setDraftSequence(0);
    setDraftKey(NEW_TOPIC_DRAFT_KEY);
    setLastSavedAt(null);
    setHasHydratedDraft(false);
    await clearDraftMeta();
  }, [draftKey, draftSequence, clearDraftMeta]);

  const handleCancel = useCallback((): void => {
    if (autoSave) {
      void saveDraftIfNeeded('cancel');
    }
    setAllowBack(true);
    requestAnimationFrame(() => safeBack());
  }, [safeBack, saveDraftIfNeeded, autoSave]);

  const handleModeChange = useCallback((mode: 'write' | 'preview') => {
    setEditorMode(mode);
    if (mode === 'preview') {
      Keyboard.dismiss();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handlePost = useCallback(async (): Promise<void> => {
    setErrors({});
    setPostSuccess(false);

    if (isAuthLoading) {
      setErrors({ general: 'Please wait, authentication is loading...' });
      return;
    }

    if (!isAuthenticated) {
      setErrors({ general: 'You need to be logged in to create posts' });
      return;
    }

    if (!selectedTeret || !selectedTeret.parent_category_id) {
      setErrors((prev) => ({ ...prev, hub: 'Please select a Teret to post in' }));
      return;
    }

    if (titleLen < minTitle) {
      setErrors((prev) => ({
        ...prev,
        title: `Title must be at least ${minTitle} characters (${titleLen}/${minTitle})`,
      }));
      return;
    }

    if (bodyLen < minPost) {
      setErrors((prev) => ({
        ...prev,
        content: `Content must be at least ${minPost} characters (${bodyLen}/${minPost})`,
      }));
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsCreating(true);
      setErrors({});

      await createTopic({
        title: title.trim(),
        raw: body.trim(),
        categoryId: selectedTeret.id,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPostSuccess(true);
      await clearDraftAfterPost();

      setTimeout(() => {
        setTitle('');
        setBody('');
        setSelectedTeret(null);
        setImages([]);
        setPostSuccess(false);
        setAllowBack(true);
        requestAnimationFrame(() => safeBack());
      }, 1500);
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to create post. Please try again.';
      setErrors({ general: errorMsg });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  }, [
    title,
    body,
    selectedTeret,
    isAuthenticated,
    isAuthLoading,
    titleLen,
    bodyLen,
    minTitle,
    minPost,
    safeBack,
    clearDraftAfterPost,
  ]);

  const handleTeretPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsTeretSheetOpen(true);
  }, []);

  const insertImageMarkdown = useCallback((urls: string[]) => {
    if (!urls.length) return;

    setBody((prev) => {
      const sep = prev.trim().length === 0 ? '' : '\n\n';
      const markdown = urls.map((url) => `![image](${url})`).join('\n\n');
      return `${prev}${sep}${markdown}\n`;
    });
  }, []);

  const handleAddImages = useCallback(async () => {
    const pickedImages = await pickImages();
    if (pickedImages.length === 0) return;

    setIsUploadingImages(true);

    try {
      const uploadedImages: Array<{ url: string; uri: string }> = [];

      for (const image of pickedImages) {
        try {
          const mimeType = 'image/jpeg';

          const result = await discourseApi.uploadImage({
            uri: image.uri,
            type: mimeType,
            name: `image.jpg`,
          });

          if (result.success && result.data?.url) {
            uploadedImages.push({
              url: result.data.url,
              uri: image.uri,
            });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      if (uploadedImages.length > 0) {
        setImages((prev) => [
          ...prev,
          ...uploadedImages.map((img) => ({
            uri: img.url,
            type: 'image' as const,
          })),
        ]);

        const urls = uploadedImages.map((img) => img.url).filter(Boolean);
        insertImageMarkdown(urls);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      console.error('Error in handleAddImages:', error);
    } finally {
      setIsUploadingImages(false);
    }
  }, [pickImages, insertImageMarkdown]);

  const handleSlashHelp = useCallback(() => {
    setIsHelpSheetOpen(true);
  }, []);

  const handleSlashImage = useCallback(() => {
    handleAddImages();
  }, [handleAddImages]);

  const handleCommandExecuted = useCallback(
    (command: string) => {
      const commandNames: Record<string, string> = {
        '/b': 'Bold',
        '/bold': 'Bold',
        '/i': 'Italic',
        '/italic': 'Italic',
        '/h1': 'Heading 1',
        '/h2': 'Heading 2',
        '/h3': 'Heading 3',
        '/quote': 'Quote',
        '/list': 'Bullet list',
        '/todo': 'Checklist',
        '/task': 'Checklist',
        '/code': 'Code block',
        '/fence': 'Code block',
        '/link': 'Link',
      };

      const displayName = commandNames[command] || command;

      if (command === '/help' || command === '/image') {
        return;
      }

      showInfo(`Applied ${displayName}`);
    },
    [showInfo]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // Derive draft status
  const draftStatus = useMemo(() => {
    if (draftError) return 'error' as const;
    if (isSavingDraft) return 'saving' as const;
    if (lastSavedAt) return 'saved' as const;
    return 'idle' as const;
  }, [draftError, isSavingDraft, lastSavedAt]);

  // Colors
  const headerBg = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const iconColor = isDark ? '#e4e4e7' : '#1e293b';
  const mutedColor = isDark ? '#A1A1AA' : '#6B6B72';

  // Frosted Header Component
  const renderFrostedHeader = () => (
    <Animated.View
      entering={SlideInUp.springify().damping(20)}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 60 : 40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={
            isDark
              ? ['rgba(0, 0, 0, 0.98)', 'rgba(5, 5, 5, 0.95)']
              : ['rgba(255, 255, 255, 0.98)', 'rgba(248, 248, 248, 0.95)']
          }
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.headerContent}>
        {/* Close button */}
        <Pressable
          onPress={handleCancel}
          hitSlop={DEFAULT_HIT_SLOP}
          style={styles.headerButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close compose"
        >
          <X size={22} color={iconColor} weight="bold" />
        </Pressable>

        {/* Title - Absolutely positioned for perfect centering */}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: isDark ? '#F5F5F7' : '#111111' }]}>
            Create Byte
          </Text>
        </View>

        {/* Help button */}
        <Pressable
          onPress={() => {
            setIsHelpSheetOpen(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          hitSlop={DEFAULT_HIT_SLOP}
          style={styles.headerButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Show help"
        >
          <Question size={22} color={mutedColor} weight="bold" />
        </Pressable>
      </View>

      {/* Status badge - Absolutely positioned below header */}
      <View style={[styles.statusBadgeContainer, { top: insets.top + (Platform.OS === 'ios' ? 48 : 52) }]}>
        <DraftStatusBadge status={draftStatus} errorMessage={draftError || undefined} />
      </View>
    </Animated.View>
  );

  // Loading state
  if (teretsLoading) {
    return (
      <ScreenContainer variant="card">
        {renderFrostedHeader()}
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: mutedColor }]}>
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
        {renderFrostedHeader()}
        <View style={styles.centerContent}>
          <Warning size={48} color="#EF4444" weight="regular" />
          <Text style={styles.errorTitle}>Failed to load terets</Text>
          <Text style={[styles.errorDescription, { color: mutedColor }]}>
            {teretsError || 'Please check your connection and try again'}
          </Text>
          <Button onPress={refreshTerets} variant="default">
            Retry
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  // Auth required state
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <ScreenContainer variant="card">
        {renderFrostedHeader()}
        <View style={styles.centerContent}>
          <SignIn size={64} color={isDark ? '#26A69A' : '#009688'} weight="regular" />
          <Text style={[styles.authTitle, { color: isDark ? '#F5F5F7' : '#111111' }]}>
            Sign in to create Bytes
          </Text>
          <Text style={[styles.authDescription, { color: mutedColor }]}>
            You need to be logged in to create and share posts with the community.
          </Text>
          <Button
            onPress={() => router.push('/(auth)/signin' as any)}
            variant="default"
            size="lg"
          >
            Sign In
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="card">
      {renderFrostedHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + (isKeyboardVisible ? 24 : 140),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* General Error Message */}
        {errors.general && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.errorBanner}
          >
            <Warning size={16} color="#EF4444" weight="regular" />
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </Animated.View>
        )}

        {/* Teret Selection Error */}
        {errors.hub && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.validationError}
          >
            <Warning size={14} color="#EF4444" weight="regular" />
            <Text style={styles.validationErrorText}>{errors.hub}</Text>
          </Animated.View>
        )}

        {/* Compose Editor */}
        <ComposeEditor
          title={title}
          body={body}
          onChangeTitle={setTitle}
          onChangeBody={setBody}
          titleError={titleValidationMessage}
          bodyError={bodyValidationMessage}
          selectedTeret={selectedTeret}
          onTeretPress={handleTeretPress}
          onSlashHelp={handleSlashHelp}
          onSlashImage={handleSlashImage}
          onCommandExecuted={handleCommandExecuted}
          mode={editorMode}
          onModeChange={handleModeChange}
          minTitle={minTitle}
          minBody={minPost}
        />

        {/* Media Grid */}
        {images.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)}>
            <MediaGrid media={images} onRemove={handleRemoveImage} />
          </Animated.View>
        )}

        {/* Upload feedback */}
        {isUploadingImages && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.uploadingBanner}
          >
            <Text style={[styles.uploadingText, { color: mutedColor }]}>
              Uploading images...
            </Text>
          </Animated.View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Post Button Area */}
      <Animated.View
        entering={SlideInUp.delay(200).springify()}
        style={[
          styles.postButtonContainer,
          {
            paddingBottom: insets.bottom + (isKeyboardVisible ? 12 : 24),
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 40 : 30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <LinearGradient
            colors={
              isDark
                ? ['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.98)']
                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)']
            }
            style={StyleSheet.absoluteFill}
          />
        )}
        <PremiumPostButton
          onPress={handlePost}
          disabled={postDisabled}
          loading={isCreating}
          success={postSuccess}
          hint={!canPost ? 'Add a title, body, and choose a Teret to post' : undefined}
          characterCount={
            bodyLen < minPost
              ? { current: bodyLen, min: minPost }
              : undefined
          }
        />
      </Animated.View>

      {/* Teret Picker Bottom Sheet */}
      <TeretPickerSheet
        visible={isTeretSheetOpen}
        selectedTeret={selectedTeret}
        allCategories={allCategories}
        isLoading={teretsLoading}
        error={teretsError || null}
        onClose={() => setIsTeretSheetOpen(false)}
        onSelect={(teret) => {
          setSelectedTeret(teret);
          setIsTeretSheetOpen(false);
        }}
      />

      {/* Help Sheet Modal */}
      <HelpSheet
        visible={isHelpSheetOpen}
        onClose={() => setIsHelpSheetOpen(false)}
        onInsertCommand={(cmd) => {
          const needsNewline = body.length > 0 && !body.endsWith('\n');
          const prefix = needsNewline ? '\n' : '';
          setBody((prev) => `${prev}${prefix}${cmd} `);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: Platform.OS === 'android' ? 1.5 : 1,
    borderBottomColor: Platform.OS === 'android' 
      ? 'rgba(128, 128, 128, 0.18)' 
      : 'rgba(128, 128, 128, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 4 : 6,
    minHeight: Platform.OS === 'ios' ? 40 : 44,
  },
  headerButton: {
    padding: 6,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  statusBadgeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    paddingTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 110 : 95, // Account for header + status badge + extra spacing
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 110 : 95,
  },
  loadingText: {
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  authDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  validationErrorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  uploadingBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 196, 255, 0.1)',
  },
  uploadingText: {
    fontSize: 13,
    textAlign: 'center',
  },
  postButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
});
