import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { getTokens } from '@/shared/design/tokens';
import { setOnboardingCompleted } from '@/shared/onboardingStorage';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const onboardingSteps = [
  {
    title: 'Hubs are your worlds',
    description: 'Join communities built around interests. Your Hub choices shape what you see.',
    emoji: '🌍',
    color: '#4ECDC4',
  },
  {
    title: 'Terets keep focus',
    description: 'Within each Hub, Terets keep conversations tight and easy to follow.',
    emoji: '🎯',
    color: '#FF6B6B',
  },
  {
    title: 'Bytes are your voice',
    description: 'Post, reply, and share ideas in Bytes—fast, expressive, and community-first.',
    emoji: '✍️',
    color: '#FFE66D',
  },
  {
    title: 'No algorithms. No tracking.',
    description: "Privacy-first and algorithm-free. We don't sell your data or manipulate your feed.",
    emoji: '🛡️',
    color: '#95E1D3',
  },
  {
    title: 'Everything one tap away',
    description: 'Zero-layer design: no buried menus. The main actions stay within reach.',
    emoji: '⚡️',
    color: '#F38181',
  },
];

export default function OnboardingScreen() {
  const { isDark } = useTheme();
  const tokens = getTokens(isDark ? 'darkAmoled' : 'light');
  const [currentStep, setCurrentStep] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const indicatorProgress = useSharedValue(0);

  const colors = {
    background: tokens.colors.background,
    primary: tokens.colors.accent,
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    indicator: tokens.colors.border,
    activeIndicator: tokens.colors.accent,
    buttonText: tokens.colors.onAccent,
  } as const;

  const handleNext = useCallback(async (): Promise<void> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      pagerRef.current?.setPage(nextStep);
      setCurrentStep(nextStep);
      
      // Animate indicator
      indicatorProgress.value = withTiming(nextStep / (onboardingSteps.length - 1), {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [currentStep, indicatorProgress]);

  const handleFinishToSignIn = useCallback(async (): Promise<void> => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    
    try {
      await setOnboardingCompleted();
      router.replace('/(auth)/signin');
    } catch (err) {
      console.log('⚠️ Failed to mark onboarding complete:', err);
      Alert.alert('Unable to finish onboarding', 'Please try again. If this keeps happening, restart the app.');
    }
  }, []);

  const handleFinishToGuest = useCallback(async (): Promise<void> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    try {
      await setOnboardingCompleted();
      const rootNavigation = navigation.getParent() || navigation;
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: '/(tabs)' }],
        })
      );
    } catch (err) {
      console.log('⚠️ Failed to mark onboarding complete for guest:', err);
      Alert.alert('Unable to continue', 'Please try again. If this keeps happening, restart the app.');
    }
  }, [navigation]);

  const handleSkip = useCallback(async (): Promise<void> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    try {
      await setOnboardingCompleted();
      const rootNavigation = navigation.getParent() || navigation;
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: '/(tabs)' }],
        })
      );
    } catch (err) {
      console.log('⚠️ Failed to mark onboarding complete on skip:', err);
      Alert.alert('Skip failed', 'We could not save your progress. Please try again.');
    }
  }, [navigation]);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const newStep = e.nativeEvent.position;
    setCurrentStep(newStep);
    
    // Light haptic feedback on page change
    Haptics.selectionAsync().catch(() => {});
    
    // Animate indicator
    indicatorProgress.value = withTiming(newStep / (onboardingSteps.length - 1), {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [indicatorProgress]);

  // Button press animation
  const onPressIn = useCallback(() => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, [buttonScale]);

  const onPressOut = useCallback(() => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [buttonScale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

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
      <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '500' }}>Skip</Text>
    </TouchableOpacity>
  ), [handleSkip, colors.secondary]);

  // Configure header
  useScreenHeader({
    title: "",
    canGoBack: false,
    rightActions: [skipButton],
    withSafeTop: false,
    tone: "bg",
    compact: true,
  }, [isDark]);

  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <PagerView
          ref={pagerRef}
          style={[styles.pager, { width }]}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          {onboardingSteps.map((step, index) => (
            <View key={step.title} style={[styles.page, { width }]}>
              <View style={styles.stepContainer}>
                {/* Emoji with entrance animation */}
                <Animated.View 
                  entering={FadeInDown.delay(100).duration(400).springify()}
                  style={styles.emojiContainer}
                >
                  <Text style={styles.emoji}>{step.emoji}</Text>
                </Animated.View>
                
                {/* Title with staggered animation */}
                <Animated.Text 
                  entering={FadeInUp.delay(200).duration(400).springify()}
                  accessibilityRole="header" 
                  style={[styles.title, { color: colors.text }]}
                >
                  {step.title}
                </Animated.Text>
                
                {/* Description with staggered animation */}
                <Animated.Text 
                  entering={FadeInUp.delay(300).duration(400).springify()}
                  style={[styles.description, { color: colors.secondary }]}
                >
                  {step.description}
                </Animated.Text>
              </View>
            </View>
          ))}
        </PagerView>

        {/* Progress indicators */}
        <View style={styles.indicators}>
          {onboardingSteps.map((step, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            
            return (
              <Animated.View
                key={index}
                entering={FadeIn.delay(400 + index * 50).duration(300)}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Step ${index + 1} of ${onboardingSteps.length}${isActive ? ', current step' : ''}`}
                style={[
                  styles.indicator,
                  { backgroundColor: isPast || isActive ? colors.activeIndicator : colors.indicator },
                  isActive && styles.indicatorActive,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Footer with buttons */}
      <Animated.View 
        entering={FadeInUp.delay(500).duration(400)}
        style={styles.footer}
      >
        {isLastStep ? (
          <>
            <AnimatedTouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }, buttonAnimatedStyle]}
              onPress={handleFinishToSignIn}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityHint="Finish onboarding and go to sign in"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={1}
            >
              <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                Create Account
              </Text>
            </AnimatedTouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleFinishToGuest}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              accessibilityHint="Finish onboarding and continue without signing in"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <AnimatedTouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }, buttonAnimatedStyle]}
            onPress={handleNext}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Next"
            accessibilityHint="Go to next onboarding step"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={1}
          >
            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
              Next
            </Text>
          </AnimatedTouchableOpacity>
        )}
      </Animated.View>
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
    flex: 1,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stepContainer: {
    alignItems: 'center',
    maxWidth: 340,
  },
  emojiContainer: {
    marginBottom: 32,
  },
  emoji: {
    fontSize: 96,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 24,
    borderRadius: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
