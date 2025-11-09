import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Gear, 
  PencilSimple, 
  Heart, 
  ChatCircle, 
  Bookmark, 
  Share, 
  Calendar,
  MapPin,
  Globe,
  User,
  Crown,
  Star,
  Trophy,
  Users,
  Hash,
  Eye,
  EyeSlash,
  Bell,
  BellSlash,
  SignIn,
  UserPlus
} from 'phosphor-react-native';
import { useTheme } from '../../components/shared/theme-provider';
import { HeaderBar } from '../../components/nav/HeaderBar';
import { useDiscourseUser } from '../../shared/useDiscourseUser';
import { useAuth } from '../../lib/auth';
import { getSession } from '../../lib/discourse';
import { discourseApi } from '../../shared/discourseApi';
import { router } from 'expo-router';

interface ProfileStats {
  posts: number;
  topics: number;
  likes: number;
  followers: number;
  following: number;
  trustLevel: number;
  badges: number;
  timeRead: number;
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    text: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ icon, value, label, color }: { 
  icon: React.ReactNode; 
  value: string | number; 
  label: string; 
  color: string; 
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={[styles.statCard, { 
      backgroundColor: colors.background, 
      borderColor: colors.border 
    }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.secondary }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  color = '#3b82f6',
  showChevron = true
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle?: string; 
  onPress: () => void; 
  color?: string; 
  showChevron?: boolean;
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <TouchableOpacity
      style={[styles.actionButton, { 
        backgroundColor: colors.background, 
        borderColor: colors.border 
      }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.actionLeft}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
          {icon}
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.actionSubtitle, { color: colors.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {showChevron && <Text style={[styles.actionChevron, { color: colors.secondary }]}>›</Text>}
    </TouchableOpacity>
  );
}

function AuthPromptCard({ onSignIn, onSignUp }: { 
  onSignIn: () => void; 
  onSignUp: () => void; 
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    accent: isDark ? '#8b5cf6' : '#7c3aed',
  };

  return (
    <View style={[styles.authPromptCard, { 
      backgroundColor: colors.background, 
      borderColor: colors.border 
    }]}>
      <View style={styles.authPromptHeader}>
        <View style={[styles.authPromptAvatar, { backgroundColor: colors.secondary }]}>
          <User size={32} color={colors.background} weight="regular" />
        </View>
        <View style={styles.authPromptContent}>
          <Text style={[styles.authPromptTitle, { color: colors.text }]}>
            Welcome to Fomio
          </Text>
          <Text style={[styles.authPromptSubtitle, { color: colors.secondary }]}>
            Sign in to access your profile, create Bytes, and join the conversation
          </Text>
        </View>
      </View>
      
      <View style={styles.authPromptActions}>
        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: colors.primary }]}
          onPress={onSignIn}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <SignIn size={20} color="#ffffff" weight="regular" />
          <Text style={styles.authButtonText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.authButton, styles.authButtonSecondary, { 
            backgroundColor: 'transparent',
            borderColor: colors.border 
          }]}
          onPress={onSignUp}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sign Up"
        >
          <UserPlus size={20} color={colors.primary} weight="regular" />
          <Text style={[styles.authButtonText, { color: colors.primary }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { user: discourseUser, loading, error, refreshUser } = useDiscourseUser();
  const { authed, ready, user: authUser, signOut } = useAuth();
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  // Load session if authenticated
  useEffect(() => {
    if (authed && ready) {
      getSession()
        .then((session) => {
          setSessionUser(session.user || null);
        })
        .catch((err) => {
          console.error('Failed to load session:', err);
        });
    }
  }, [authed, ready]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    topics: 0,
    likes: 0,
    followers: 0,
    following: 0,
    trustLevel: 0,
    badges: 0,
    timeRead: 0,
  });
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    accent: isDark ? '#8b5cf6' : '#7c3aed',
    success: isDark ? '#10b981' : '#059669',
    warning: isDark ? '#f59e0b' : '#d97706',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Use session user or discourse user data when authenticated
  const user = sessionUser || discourseUser || authUser;

  // Debug logging
  useEffect(() => {
    console.log('🔍 Profile Debug:', {
      authed,
      ready,
      sessionUser: sessionUser ? 'present' : 'null',
      discourseUser: discourseUser ? 'present' : 'null',
      user: user ? 'present' : 'null',
      loading,
      error
    });
  }, [authed, ready, sessionUser, discourseUser, user, loading, error]);

  // Ensure user data is loaded when authenticated
  useEffect(() => {
    if (authed && ready && !discourseUser && !loading) {
      console.log('🔄 Profile: Triggering user data refresh');
      refreshUser();
    }
  }, [authed, ready, discourseUser, loading, refreshUser]);

  // Update stats when user data changes
  useEffect(() => {
    if (discourseUser) {
      setStats({
        posts: discourseUser.post_count || 0,
        topics: discourseUser.topic_count || 0,
        likes: discourseUser.likes_received || 0,
        followers: 0, // Not available in Discourse
        following: 0, // Not available in Discourse
        trustLevel: discourseUser.trust_level || 0,
        badges: discourseUser.badge_count || 0,
        timeRead: Math.floor((discourseUser.time_read || 0) / 3600), // Convert to hours
      });
    }
  }, [discourseUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (authed && ready) {
        // Refresh session
        const session = await getSession();
        setSessionUser(session.user || null);
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      Alert.alert('Error', 'Failed to refresh profile data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    if (!authed || !ready) {
      handleSignIn();
      return;
    }
    router.push('/(profile)/edit-profile' as any);
  };

  const handleSettings = () => {
    if (!authed || !ready) {
      handleSignIn();
      return;
    }
    router.push('/(tabs)/settings' as any);
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin' as any);
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup' as any);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(tabs)' as any);
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const getTrustLevelDisplay = (level: number) => {
    switch (level) {
      case 0: return 'New User';
      case 1: return 'Basic User';
      case 2: return 'Regular User';
      case 3: return 'Leader';
      case 4: return 'Elder';
      default: return 'Unknown';
    }
  };

  const getTrustLevelColor = (level: number) => {
    switch (level) {
      case 0: return colors.secondary;
      case 1: return colors.primary;
      case 2: return colors.success;
      case 3: return colors.warning;
      case 4: return colors.error;
      default: return colors.secondary;
    }
  };

  // Show authentication prompt for unsigned users
  if (!authed || !ready) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Profile" 
          showBackButton={true}
          showProfileButton={false}
          onBack={handleBack}
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AuthPromptCard 
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
          />
          
          {/* Preview of what's available after sign in */}
          <ProfileSection title="What you'll get">
            <View style={styles.previewGrid}>
              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ChatCircle size={24} color={colors.primary} weight="fill" />
                <Text style={[styles.previewTitle, { color: colors.text }]}>Create Bytes</Text>
                <Text style={[styles.previewText, { color: colors.secondary }]}>
                  Share your thoughts and ideas with the community
                </Text>
              </View>
              
              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Heart size={24} color={colors.error} weight="fill" />
                <Text style={[styles.previewTitle, { color: colors.text }]}>Like & Comment</Text>
                <Text style={[styles.previewText, { color: colors.secondary }]}>
                  Engage with content and build connections
                </Text>
              </View>
              
              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Trophy size={24} color={colors.warning} weight="fill" />
                <Text style={[styles.previewTitle, { color: colors.text }]}>Earn Badges</Text>
                <Text style={[styles.previewText, { color: colors.secondary }]}>
                  Build your reputation and unlock achievements
                </Text>
              </View>
              
              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Users size={24} color={colors.success} weight="fill" />
                <Text style={[styles.previewTitle, { color: colors.text }]}>Join Communities</Text>
                <Text style={[styles.previewText, { color: colors.secondary }]}>
                  Discover and participate in Terets
                </Text>
              </View>
            </View>
          </ProfileSection>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show loading only if we're authenticated but don't have any user data yet
  if (loading && authed && ready && !discourseUser && !sessionUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Profile" 
          showBackButton={true}
          showProfileButton={false}
          onBack={handleBack}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error only if we're authenticated but there's an error and no user data
  if (error && authed && ready && !discourseUser && !sessionUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Profile" 
          showBackButton={true}
          showProfileButton={false}
          onBack={handleBack}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshUser}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If we're authenticated but don't have any user data, show a fallback
  if (authed && ready && !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Profile" 
          showBackButton={true}
          showProfileButton={false}
          onBack={handleBack}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshUser}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar 
        title="Profile" 
        showBackButton={true}
        showProfileButton={false}
        onBack={handleBack}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
          {user?.avatar_template ? (
            <Image 
              source={{ uri: discourseApi.getAvatarUrl(user.avatar_template, 120) }} 
              style={styles.avatar}
              accessible
              accessibilityLabel={`${user.name || user.username}'s profile picture`}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[styles.avatarFallback, { color: colors.background }]}>
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.name || user?.username || 'Unknown User'}
            </Text>
            <Text style={[styles.profileUsername, { color: colors.secondary }]}>
              @{user?.username || 'unknown'}
            </Text>
            
            {user?.bio_raw && (
              <Text style={[styles.profileBio, { color: colors.text }]} numberOfLines={3}>
                {user.bio_raw}
              </Text>
            )}
            
            <View style={styles.profileMeta}>
              {user?.location && (
                <View style={styles.metaItem}>
                  <MapPin size={16} color={colors.secondary} weight="regular" />
                  <Text style={[styles.metaText, { color: colors.secondary }]}>{user.location}</Text>
                </View>
              )}
              
              {user?.website && (
                <View style={styles.metaItem}>
                  <Globe size={16} color={colors.secondary} weight="regular" />
                  <Text style={[styles.metaText, { color: colors.secondary }]}>{user.website}</Text>
                </View>
              )}
              
              <View style={styles.metaItem}>
                <Calendar size={16} color={colors.secondary} weight="regular" />
                <Text style={[styles.metaText, { color: colors.secondary }]}>
                  Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>
            
            <View style={styles.trustLevel}>
              <Crown size={16} color={getTrustLevelColor(user?.trust_level || 0)} weight="fill" />
              <Text style={[styles.trustLevelText, { color: getTrustLevelColor(user?.trust_level || 0) }]}>
                {getTrustLevelDisplay(user?.trust_level || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <ProfileSection title="Activity">
          <View style={styles.statsGrid}>
            <StatCard 
              icon={<ChatCircle size={20} color={colors.primary} weight="fill" />}
              value={stats.posts}
              label="Posts"
              color={colors.primary}
            />
            <StatCard 
              icon={<Hash size={20} color={colors.accent} weight="fill" />}
              value={stats.topics}
              label="Topics"
              color={colors.accent}
            />
            <StatCard 
              icon={<Heart size={20} color={colors.error} weight="fill" />}
              value={stats.likes}
              label="Likes"
              color={colors.error}
            />
            <StatCard 
              icon={<Users size={20} color={colors.success} weight="fill" />}
              value={stats.followers}
              label="Followers"
              color={colors.success}
            />
            <StatCard 
              icon={<Trophy size={20} color={colors.warning} weight="fill" />}
              value={stats.badges}
              label="Badges"
              color={colors.warning}
            />
            <StatCard 
              icon={<Star size={20} color={colors.primary} weight="fill" />}
              value={`${stats.timeRead}h`}
              label="Time Read"
              color={colors.primary}
            />
          </View>
        </ProfileSection>

        {/* Actions */}
        <ProfileSection title="Account">
          <ActionButton
            icon={<PencilSimple size={24} color={colors.primary} weight="regular" />}
            title="Edit Profile"
            subtitle="Update your information and avatar"
            onPress={handleEditProfile}
            color={colors.primary}
          />
          
          <ActionButton
            icon={<Gear size={24} color={colors.accent} weight="regular" />}
            title="Settings"
            subtitle="Manage your preferences and privacy"
            onPress={handleSettings}
            color={colors.accent}
          />
          
          <ActionButton
            icon={<Bell size={24} color={colors.warning} weight="regular" />}
            title="Notification Preferences"
            subtitle="Control what you're notified about"
            onPress={() => console.log('Open notification preferences')}
            color={colors.warning}
          />
          
          <ActionButton
            icon={<Eye size={24} color={colors.success} weight="regular" />}
            title="Privacy Settings"
            subtitle="Manage your privacy and visibility"
            onPress={() => console.log('Open privacy settings')}
            color={colors.success}
          />
        </ProfileSection>

        {/* Account Info */}
        <ProfileSection title="Account Information">
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.email || 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Trust Level</Text>
              <Text style={[styles.infoValue, { color: getTrustLevelColor(user?.trust_level || 0) }]}>
                {getTrustLevelDisplay(user?.trust_level || 0)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Member Since</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Last Seen</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Days Visited</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.days_visited || 0}</Text>
            </View>
          </View>
        </ProfileSection>

        {/* Sign Out */}
        <ProfileSection title="Account Actions">
          <ActionButton
            icon={<ArrowLeft size={24} color={colors.error} weight="regular" />}
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            color={colors.error}
            showChevron={false}
          />
        </ProfileSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  authPromptCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  authPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  authPromptAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  authPromptContent: {
    flex: 1,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  authPromptSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  authPromptActions: {
    gap: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  authButtonSecondary: {
    borderWidth: 1,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  previewGrid: {
    marginHorizontal: 16,
    gap: 12,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileHeader: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  profileMeta: {
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  trustLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustLevelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  actionChevron: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarFallback: {
    fontSize: 24,
    fontWeight: '600',
  },
}); 