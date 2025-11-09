import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/shared/theme-provider';
import { HeaderBar } from '../../components/nav/HeaderBar';
import { AuthGate } from '../../components/shared/auth-gate';
import { AuthPromptView } from '../../components/shared/auth-prompt-view';

export default function EditProfileScreen(): JSX.Element {
  const { isDark, isAmoled } = useTheme();
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar 
        title="Edit Profile" 
        showBackButton={true}
        showProfileButton={false}
      />
      <AuthGate
        fallback={
          <AuthPromptView
            title="Sign in to edit your profile"
            subtitle="Log in to update your profile information and preferences"
          />
        }
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Edit profile functionality coming soon...
          </Text>
        </View>
      </AuthGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 