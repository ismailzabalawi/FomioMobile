import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import PagerView from 'react-native-pager-view';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { getTokens } from '@/shared/design/tokens';
import { setOnboardingCompleted } from '@/shared/onboardingStorage';

const onboardingSteps = [
  {
    title: 'Hubs are your worlds',
    description: 'Join communities built around interests. Your Hub choices shape what you see.',
    emoji: '🌍',
  },
  {
    title: 'Terets keep focus',
    description: 'Within each Hub, Terets keep conversations tight and easy to follow.',
    emoji: '🎯',
  },
  {
    title: 'Bytes are your voice',
    description: 'Post, reply, and share ideas in Bytes—fast, expressive, and community-first.',
    emoji: '✍️',
  },
  {
    title: 'No algorithms. No tracking.',
    description: 'Privacy-first and algorithm-free. We don’t sell your data or manipulate your feed.',
    emoji: '🛡️',
  },
  {
    title: 'Everything one tap away',
    description: 'Zero-layer design: no buried menus. The main actions stay within reach.',
    emoji: '⚡️',
  },
];

export default function OnboardingScreen() {
  const { isDark } = useTheme();
  const tokens = getTokens(isDark ? 'darkAmoled' : 'light');
  const [currentStep, setCurrentStep] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const { width } = useWindowDimensions(); // Responsive to dimension changes (foldable devices)

  const colors = {
    background: tokens.colors.background,
    primary: tokens.colors.accent,
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    indicator: tokens.colors.border,
    activeIndicator: tokens.colors.accent,
    buttonText: tokens.colors.onAccent,
  } as const;

  const handleNext = async (): Promise<void> => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      pagerRef.current?.setPage(nextStep);
      setCurrentStep(nextStep);
      return;
    }

    try {
      await setOnboardingCompleted();
      router.replace('/(auth)/signin');
    } catch (err) {
      console.log('⚠️ Failed to mark onboarding complete:', err);
      Alert.alert('Unable to finish onboarding', 'Please try again. If this keeps happening, restart the app.');
    }
  };

  const handleSkip = async (): Promise<void> => {
    try {
      await setOnboardingCompleted();
      router.replace('/(tabs)');
    } catch (err) {
      console.log('⚠️ Failed to mark onboarding complete on skip:', err);
      Alert.alert('Skip failed', 'We could not save your progress. Please try again.');
    }
  };

  // Skip button for header
  const skipButton = useMemo(() => (
    <TouchableOpacity
      onPress={handleSkip}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Skip"
      accessibilityHint="Skip onboarding and go to main app"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={{ color: colors.secondary, fontSize: 16 }}>Skip</Text>
    </TouchableOpacity>
  ), [handleSkip, colors.secondary]);

  // Configure header - only pass stable values in deps, not React elements
  useScreenHeader({
    title: "",
    canGoBack: false,
    rightActions: [skipButton],
    withSafeTop: false,
    tone: "bg",
    compact: true,
  }, [isDark]); // ✅ FIXED: Removed skipButton from deps - React elements should not be in dependency arrays

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <PagerView
          ref={pagerRef}
          style={[styles.pager, { width }]}
          initialPage={0}
          onPageSelected={(e) => setCurrentStep(e.nativeEvent.position)}
        >
          {onboardingSteps.map((step) => (
            <View key={step.title} style={[styles.page, { width }]}>
              <View style={styles.stepContainer}>
                <Text style={styles.emoji}>{step.emoji}</Text>
                <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
                  {step.title}
                </Text>
                <Text style={[styles.description, { color: colors.secondary }]}>{step.description}</Text>
              </View>
            </View>
          ))}
        </PagerView>

        <View style={styles.indicators}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Step ${index + 1} of ${onboardingSteps.length}${index === currentStep ? ', current step' : ''}`}
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
          accessibilityHint={currentStep === onboardingSteps.length - 1 ? 'Finish onboarding and go to sign in' : 'Go to next onboarding step'}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pager: {
    // PagerView must have height; otherwise it can collapse to 0 and render blank.
    flex: 1,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
