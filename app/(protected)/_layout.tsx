import React from "react";
import { Slot, Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuthState } from "@/shared/useAuthState";

export default function ProtectedLayout() {
  const { ready, signedIn } = useAuthState();

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!signedIn) {
    return <Redirect href="/(auth)/signin" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

