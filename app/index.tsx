import { useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { checkAuthStatus } from "../lib/auth-service";

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const bootstrapAuth = async () => {
      const result = await checkAuthStatus();
      if (result.isAuthenticated) {
        router.replace("/home");
      } else {
        router.replace("/sign-in");
      }
    };

    bootstrapAuth();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration Card */}
        <View style={styles.illustrationCard}>
          <Image
            source={require("../assets/grocery-illustration.png")}
            style={styles.illustrationImage}
            contentFit="cover"
          />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Your groceries, delivered</Text>

        {/* Description */}
        <Text style={styles.description}>
          Shop from your favorite local stores and get your groceries delivered in as little as an hour.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Sign In Button */}
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push("/sign-in")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={() => router.push("/sign-up")}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Continue as Guest */}
          <TouchableOpacity 
            style={styles.guestButton}
            activeOpacity={0.8}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  illustrationCard: {
    backgroundColor: "#FEF3E2",
    borderRadius: 24,
    marginBottom: 32,
    overflow: "hidden",
    height: 340,
    width: "100%",
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    gap: 16,
  },
  signInButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  signUpButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  signUpButtonText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
  },
  guestButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  guestButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
});
