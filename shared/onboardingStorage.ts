import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fomio-onboarding';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  completedAt?: string;
}

const DEFAULT_STATE: OnboardingState = {
  hasCompletedOnboarding: false,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    let stored: string | null = null;
    try {
      stored = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (storageError: unknown) {
      // Storage can fail in simulators/dev environments; fall back safely.
      return DEFAULT_STATE;
    }

    if (!stored) return DEFAULT_STATE;

    try {
      const parsed = JSON.parse(stored) as Partial<OnboardingState> | null;
      if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return DEFAULT_STATE;
    }
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    const next: OnboardingState = {
      hasCompletedOnboarding: true,
      completedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-critical: onboarding completion will be treated as not completed next time.
    }
  } catch {
    // Non-critical
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-critical
    }
  } catch {
    // Non-critical
  }
}

