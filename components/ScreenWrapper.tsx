import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  backgroundColor?: string;
}

/**
 * Centralized screen wrapper component that ensures consistent SafeAreaView usage
 * across all screens. This prevents content from appearing under notches, status bars,
 * and other system UI elements.
 * 
 * @param children - Screen content to wrap
 * @param edges - Which edges to apply safe area insets to (default: ["top", "bottom"])
 * @param style - Additional styles to apply
 * @param backgroundColor - Background color for the screen (default: "#FFFFFF")
 */
export function ScreenWrapper({
  children,
  edges = ["top", "bottom"],
  style,
  backgroundColor = "#FFFFFF",
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
