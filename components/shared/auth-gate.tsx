import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "../../shared/useAuth";
import { AuthPromptView } from "./auth-prompt-view";
import { useTheme } from "./theme-provider";

interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGate({ children, fallback }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDark ? '#3b82f6' : '#0ea5e9'} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return fallback ?? <AuthPromptView />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

