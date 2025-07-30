import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../components/shared/theme-provider';
import { useHubs } from '../../shared/useHubs';
import { useAuth } from '../../shared/useAuth';
import { discourseApiService, Hub } from '../../shared/discourseApiService';
import { 
  CaretDown, 
  Hash, 
  Users, 
  TrendUp, 
  Star,
  X,
  MagnifyingGlass,
  Check,
  Warning,
  Info,
  SignIn
} from 'phosphor-react-native';

export default function ComposeScreen(): JSX.Element {
  const { isDark, isAmoled } = useTheme();
  const { hubs, isLoading: hubsLoading, error: hubsError, refreshHubs } = useHubs();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [showHubDropdown, setShowHubDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#27272a' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    accent: isDark ? '#8b5cf6' : '#7c3aed',
    success: isDark ? '#10b981' : '#059669',
    warning: isDark ? '#f59e0b' : '#d97706',
    error: isDark ? '#ef4444' : '#dc2626',
    inputBg: isDark ? '#27272a' : '#ffffff',
    inputBorder: isDark ? '#334155' : '#d1d5db',
    border: isDark ? '#334155' : '#e2e8f0',
    overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  };

  const filteredHubs = hubs.filter(hub =>
    hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hub.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug authentication state
  React.useEffect(() => {
    console.log('🔐 Compose Screen Auth State:', {
      isAuthenticated,
      authLoading,
      user: user?.username,
      canPost: isAuthenticated && !authLoading,
      hasApiKey: !!process.env.EXPO_PUBLIC_DISCOURSE_API_KEY,
      hasApiUsername: !!process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME,
    });
  }, [isAuthenticated, authLoading, user]);

  // Clear state when component unmounts
  React.useEffect(() => {
    return () => {
      setHasError(false);
      setErrorMessage('');
      setSuccessMessage('');
    };
  }, []);

  const toggleDropdown = useCallback(() => {
    setShowHubDropdown(!showHubDropdown);
    if (!showHubDropdown) {
      setSearchQuery(''); // Clear search when opening
    }
  }, [showHubDropdown]);

  const selectHub = useCallback((hub: Hub) => {
    setSelectedHub(hub);
    setShowHubDropdown(false);
    setSearchQuery(''); // Clear search when selecting
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedHub(null);
  }, []);

  const handlePost = useCallback(async (): Promise<void> => {
    // Wait for auth to load before checking
    if (authLoading) {
      Alert.alert('Please wait', 'Authentication is still loading...');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required', 
        'You need to be logged in to create posts. Please sign in first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/signin' as any) }
        ]
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your post');
      return;
    }
    
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    
    if (!selectedHub) {
      Alert.alert('Error', 'Please select a hub to post in');
      return;
    }

    try {
      console.log('📝 Creating post with hub:', {
        hubId: selectedHub.id,
        hubName: selectedHub.name,
        hubSlug: selectedHub.slug,
        user: user?.username,
        isAuthenticated
      });

      setIsCreating(true);
      setHasError(false);
      setErrorMessage('');

      const response = await discourseApiService.createByte({
        title: title.trim(),
        content: content.trim(),
        hubId: selectedHub.id,
      });

      if (response.success) {
        setSuccessMessage('Your post has been published!');
        Alert.alert('Success', 'Your post has been published!');
        setContent('');
        setTitle('');
        setSelectedHub(null);
        router.back();
      } else {
        setHasError(true);
        setErrorMessage(response.error || 'Failed to create post');
        Alert.alert('Error', response.error || 'Failed to create post');
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage('Failed to create post. Please try again.');
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [title, content, selectedHub, isAuthenticated, user, authLoading]);

  const handleCancel = useCallback((): void => {
    router.back();
  }, []);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  const renderHubItem = useCallback(({ item }: { item: Hub }) => (
    <TouchableOpacity
      style={[styles.hubItem, { 
        backgroundColor: colors.card,
        borderColor: colors.border 
      }]}
      onPress={() => selectHub(item)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Select hub ${item.name}`}
      activeOpacity={0.7}
    >
      <View style={styles.hubHeader}>
        <View style={styles.hubInfo}>
          <View style={styles.hubNameRow}>
            <Hash size={16} color={colors.primary} weight="fill" />
            <Text style={[styles.hubName, { color: colors.text }]}>
              {item.name}
            </Text>
            {item.topicsCount > 100 && (
              <View style={[styles.popularBadge, { backgroundColor: colors.warning }]}>
                <Star size={12} color="#ffffff" weight="fill" />
              </View>
            )}
          </View>
          <Text style={[styles.hubDescription, { color: colors.secondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.hubStats}>
          <View style={styles.statItem}>
            <Users size={14} color={colors.secondary} weight="regular" />
            <Text style={[styles.statText, { color: colors.secondary }]}>
              {formatCount(item.topicsCount)} topics
            </Text>
          </View>
          {item.topicsCount > 50 && (
            <View style={styles.statItem}>
              <TrendUp size={14} color={colors.warning} weight="fill" />
              <Text style={[styles.statText, { color: colors.warning }]}>
                Active
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [colors, selectHub, formatCount]);

  const renderEmptySearch = useCallback(() => (
    <View style={styles.emptySearchContainer}>
      <MagnifyingGlass size={48} color={colors.secondary} weight="regular" />
      <Text style={[styles.emptySearchText, { color: colors.secondary }]}>
        {searchQuery ? `No hubs found matching "${searchQuery}"` : 'No hubs available'}
      </Text>
      <Text style={[styles.emptySearchSubtext, { color: colors.secondary }]}>
        {searchQuery ? 'Try a different search term' : 'Please try again later'}
      </Text>
    </View>
  ), [colors, searchQuery]);

  const renderErrorState = useCallback(() => (
    <View style={styles.errorContainer}>
      <Warning size={48} color={colors.error} weight="regular" />
      <Text style={[styles.errorText, { color: colors.error }]}>
        Failed to load hubs
      </Text>
      <Text style={[styles.errorSubtext, { color: colors.secondary }]}>
        {hubsError || 'Please check your connection and try again'}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={refreshHubs}
      >
        <Text style={[styles.retryButtonText, { color: '#ffffff' }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  ), [colors, hubsError, refreshHubs]);

  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingContainer}>
      <Text style={[styles.loadingText, { color: colors.secondary }]}>
        Loading hubs...
      </Text>
    </View>
  ), [colors]);

  const renderAuthWarning = useCallback(() => (
    <View style={[styles.authWarningContainer, { backgroundColor: colors.warning + '20' }]}>
      <SignIn size={20} color={colors.warning} weight="regular" />
      <View style={styles.authWarningText}>
        <Text style={[styles.authWarningTitle, { color: colors.warning }]}>
          Sign in to post
        </Text>
        <Text style={[styles.authWarningSubtext, { color: colors.secondary }]}>
          You need to be logged in to create posts
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.signInButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(auth)/signin' as any)}
      >
        <Text style={[styles.signInButtonText, { color: '#ffffff' }]}>
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  ), [colors]);

  if (hubsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.secondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Byte</Text>
          <View style={styles.postButton} />
        </View>
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  if (hubsError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.secondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Byte</Text>
          <View style={styles.postButton} />
        </View>
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.secondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Byte</Text>
          <TouchableOpacity 
            onPress={handlePost}
            style={[
              styles.postButton, 
              { 
                backgroundColor: selectedHub && content.trim() && title.trim() && !isCreating && isAuthenticated && !authLoading ? colors.primary : colors.secondary,
                opacity: selectedHub && content.trim() && title.trim() && !isCreating && isAuthenticated && !authLoading ? 1 : 0.5
              }
            ]}
            disabled={!selectedHub || !content.trim() || !title.trim() || isCreating || !isAuthenticated || authLoading}
          >
            <Text style={[styles.postText, { color: '#ffffff' }]}>
              {isCreating ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Authentication Warning */}
          {!authLoading && !isAuthenticated && (
            renderAuthWarning()
          )}

          {/* Title Input */}
          <View style={styles.titleSection}>
            <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
              Title
            </Text>
            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }
              ]}
              placeholder="Enter your post title..."
              placeholderTextColor={colors.secondary}
              value={title}
              onChangeText={setTitle}
              maxLength={255}
              accessible
              accessibilityLabel="Post title input"
            />
            <Text style={[styles.characterCount, { color: colors.secondary }]}>
              {title.length}/255 characters
            </Text>
          </View>

          {/* Hub Selection */}
          <View style={styles.hubSection}>
            <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
              Post in Hub ({hubs.length} available)
            </Text>
            <TouchableOpacity
              style={[styles.hubSelector, { 
                backgroundColor: colors.card,
                borderColor: showHubDropdown ? colors.primary : colors.border 
              }]}
              onPress={toggleDropdown}
              accessible
              accessibilityRole="button"
              accessibilityLabel={selectedHub ? `Selected hub: ${selectedHub.name}` : "Select a hub to post in"}
              activeOpacity={0.7}
            >
              {selectedHub ? (
                <View style={styles.selectedHub}>
                  <View style={styles.selectedHubInfo}>
                    <Hash size={16} color={colors.primary} weight="fill" />
                    <Text style={[styles.selectedHubName, { color: colors.text }]}>
                      {selectedHub.name}
                    </Text>
                    {selectedHub.topicsCount > 100 && (
                      <View style={[styles.popularBadge, { backgroundColor: colors.warning }]}>
                        <Star size={12} color="#ffffff" weight="fill" />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={clearSelection}
                    style={styles.clearButton}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Clear hub selection"
                  >
                    <X size={16} color={colors.secondary} weight="regular" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholderHub}>
                  <Text style={[styles.placeholderText, { color: colors.secondary }]}>
                    Choose a hub to post in...
                  </Text>
                  <CaretDown size={16} color={colors.secondary} weight="regular" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Content Input */}
          <View style={styles.contentSection}>
            <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
              Your Byte
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }
              ]}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.secondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              accessible
              accessibilityLabel="Post content input"
            />
            <Text style={[styles.characterCount, { color: colors.secondary }]}>
              {content.length} characters
            </Text>
          </View>

          {/* Error/Success Messages */}
          {hasError && errorMessage && (
            <View style={[styles.messageContainer, { backgroundColor: colors.error + '20' }]}>
              <Warning size={16} color={colors.error} weight="regular" />
              <Text style={[styles.messageText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {successMessage && (
            <View style={[styles.messageContainer, { backgroundColor: colors.success + '20' }]}>
              <Check size={16} color={colors.success} weight="regular" />
              <Text style={[styles.messageText, { color: colors.success }]}>
                {successMessage}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Hub Dropdown Modal - Fixed Safe Area with proper edges */}
      <Modal
        visible={showHubDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHubDropdown(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setShowHubDropdown(false)}
          >
            <View style={styles.modalContentContainer}>
              <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                  <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.dropdownTitle, { color: colors.text }]}>
                      Select Hub ({filteredHubs.length} available)
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowHubDropdown(false)}
                      style={styles.closeButton}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel="Close hub selection"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={20} color={colors.secondary} weight="regular" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.searchContainer, {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  }]}>
                    <MagnifyingGlass size={20} color={colors.secondary} weight="regular" />
                    <TextInput
                      style={[styles.searchInput, {
                        color: colors.text,
                      }]}
                      placeholder="Search hubs..."
                      placeholderTextColor={colors.secondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      accessible
                      accessibilityLabel="Search hubs input"
                    />
                  </View>
                  
                  <FlatList
                    data={filteredHubs}
                    renderItem={renderHubItem}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    style={styles.hubList}
                    contentContainerStyle={styles.hubListContent}
                    ListEmptyComponent={renderEmptySearch}
                  />
                </View>
              </SafeAreaView>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  hubSection: {
    marginBottom: 24,
  },
  contentSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hubSelector: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  selectedHub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedHubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedHubName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  placeholderHub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    fontSize: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  messageText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  authWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  authWarningText: {
    flex: 1,
    marginLeft: 12,
  },
  authWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  authWarningSubtext: {
    fontSize: 14,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalOverlayTouch: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  modalContentContainer: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 24, // Add margin to stay under HeaderBar
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    marginTop: 0,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  hubList: {
    flex: 1,
  },
  hubListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hubItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hubInfo: {
    flex: 1,
    marginRight: 12,
  },
  hubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hubName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  popularBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  hubDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  hubStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySearchSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
}); 