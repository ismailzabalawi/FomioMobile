import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';

const { width } = Dimensions.get('window');

const onboardingSteps = [
  {
    title: 'Welcome to Fomio',
    description: 'Share your thoughts, connect with others, and discover amazing content.',
    emoji: '🚀',
  },
  {
    title: 'Create Bytes',
    description: 'Share bite-sized content with the community. Express yourself in creative ways.',
    emoji: '💭',
  },
  {
    title: 'Connect & Engage',
    description: 'Follow creators, like posts, and engage with content you love.',
    emoji: '❤️',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const { isDark } = useTheme();
  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    indicator: isDark ? '#334155' : '#e2e8f0',
    activeIndicator: isDark ? '#38bdf8' : '#0ea5e9',
    buttonText: isDark ? '#fff' : '#fff',
  };

  const handleNext = (): void => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSkip = (): void => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Skip"
          accessibilityHint="Skip onboarding and go to sign up"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipButtonText, { color: colors.secondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.stepContainer}>
          <Text style={styles.emoji}>{onboardingSteps[currentStep].emoji}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{onboardingSteps[currentStep].title}</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>{onboardingSteps[currentStep].description}</Text>
        </View>

        <View style={styles.indicators}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { backgroundColor: colors.indicator },
                index === currentStep && { backgroundColor: colors.activeIndicator },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          accessible
          accessibilityRole="button"
          accessibilityLabel={currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          accessibilityHint={currentStep === onboardingSteps.length - 1 ? 'Finish onboarding and go to sign up' : 'Go to next onboarding step'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.nextButtonText, { color: colors.buttonText }]}>
            {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {
    // This style is now handled by the inline style
  },
  footer: {
    padding: 20,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

