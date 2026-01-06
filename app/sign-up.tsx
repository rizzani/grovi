import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { normalizePhoneNumber, validatePhoneNumber } from "../lib/phone-validation";

export default function SignUp() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"phone" | "email" | "password" | "confirmPassword" | null>(null);

  const handlePhoneChange = (text: string) => {
    // Allow free editing without forcing normalization during typing
    setPhone(text);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handlePhoneFocus = () => {
    setFocusedInput("phone");
    setPhoneError(null);
    
    // Add +1876 prefix whenever field is empty on focus
    if (phone === "") {
      setPhone("+1876");
    }
  };

  const handlePhoneBlur = () => {
    // Normalize and validate on blur
    const normalized = normalizePhoneNumber(phone);
    setPhone(normalized);
    
    const validation = validatePhoneNumber(normalized);
    if (!validation.isValid) {
      setPhoneError(validation.error || "Invalid phone number");
    } else {
      setPhoneError(null);
    }
    setFocusedInput(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.title}>Let's get you started</Text>
              <Text style={styles.subtitle}>Fresh groceries, fast delivery.</Text>
            </View>

            {/* Input Fields */}
            <View style={styles.inputContainer}>
              <View>
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === "phone" && styles.inputFocused,
                    phoneError && styles.inputError,
                  ]}
                  placeholder="Phone (876-XXX-XXXX)"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  onFocus={handlePhoneFocus}
                  onBlur={handlePhoneBlur}
                />
                {phoneError && (
                  <Text style={styles.errorText}>{phoneError}</Text>
                )}
              </View>

              <TextInput
                style={[
                  styles.input,
                  focusedInput === "email" && styles.inputFocused,
                ]}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedInput === "password" && styles.inputFocused,
                  ]}
                  placeholder="Enter Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedInput === "confirmPassword" && styles.inputFocused,
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => setFocusedInput("confirmPassword")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.8}
              onPress={() => {
                // Validate phone before submission
                const validation = validatePhoneNumber(phone);
                if (!validation.isValid) {
                  setPhoneError(validation.error || "Invalid phone number");
                  return;
                }
                
                // Phone is normalized and validated, ready for API submission
                // The phone will be in E.164 format: +1876XXXXXXX
                console.log("Normalized phone:", phone);
                // TODO: Submit form data to API
              }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>

            {/* Terms and Privacy */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                by Continue, you agree to our{" "}
                <Text style={styles.linkText} onPress={() => {}}>
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text style={styles.linkText} onPress={() => {}}>
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>You have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/sign-in")}>
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111827",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderColor: "#EF4444",
    marginBottom: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputFocused: {
    borderColor: "#10B981",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  continueButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  termsContainer: {
    marginBottom: 32,
  },
  termsText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  linkText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#6B7280",
    fontSize: 14,
  },
  signInText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "500",
  },
});

