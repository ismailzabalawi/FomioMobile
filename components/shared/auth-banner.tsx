import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { X } from "phosphor-react-native";
import { useTheme } from "@/components/theme";
import { router } from "expo-router";

interface AuthBannerProps {
  message?: string;
  onSignIn?: () => void;
  onDismiss?: () => void;
}

export function AuthBanner({
  message = "Authorize Fomio to like, comment, and personalize your feed",
  onSignIn,
  onDismiss,
}: AuthBannerProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
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

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: `${colors.primary}20`,
          borderColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleSignIn}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Authorize</Text>
        </TouchableOpacity>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
            <X size={16} color={colors.secondary} weight="regular" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  dismiss: {
    padding: 4,
  },
});

