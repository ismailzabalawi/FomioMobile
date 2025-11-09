import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { User } from "phosphor-react-native";
import { useTheme } from "./theme-provider";
import { router } from "expo-router";

interface AuthPromptViewProps {
  title?: string;
  subtitle?: string;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function AuthPromptView({
  title = "Authorize Fomio to continue",
  subtitle = "Authorize the app to interact and personalize your experience.",
  onSignIn,
  onSignUp,
}: AuthPromptViewProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      router.push("/(auth)/signin" as any);
    }
  };

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      router.push("/(auth)/signup" as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <User size={48} color={colors.primary} weight="duotone" />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>{subtitle}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleSignIn}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>Authorize</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignUp}
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    gap: 12,
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

