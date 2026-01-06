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
import {
  validatePassword,
  validateConfirmPassword,
  getStrengthColor,
  getStrengthText,
  type PasswordStrength,
} from "../lib/password-validation";

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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<ReturnType<typeof validatePassword>>({
    isValid: false,
    errors: [],
    strength: "weak",
    hints: [],
  });

  const handlePhoneChange = (text: string) => {
    // Normalize the input as user types
    const normalized = normalizePhoneNumber(text);
    setPhone(normalized);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    // Validate on blur
    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      setPhoneError(validation.error || "Invalid phone number");
    } else {
      setPhoneError(null);
    }
    setFocusedInput(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const validation = validatePassword(text);
    setPasswordValidation(validation);
    
    // Clear error when user starts typing
    if (passwordError) {
      setPasswordError(null);
    }

    // Validate confirm password if it's already filled
    if (confirmPassword) {
      const confirmValidation = validateConfirmPassword(text, confirmPassword);
      if (!confirmValidation.isValid) {
        setConfirmPasswordError(confirmValidation.error || null);
      } else {
        setConfirmPasswordError(null);
      }
    }
  };

  const handlePasswordBlur = () => {
    const validation = validatePassword(password);
    setPasswordValidation(validation);
    if (!validation.isValid && validation.errors.length > 0) {
      setPasswordError(validation.errors[0]);
    } else {
      setPasswordError(null);
    }
    setFocusedInput(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    
    // Clear error when user starts typing
    if (confirmPasswordError) {
      setConfirmPasswordError(null);
    }

    // Validate match if password is filled
    if (password) {
      const validation = validateConfirmPassword(password, text);
      if (!validation.isValid) {
        setConfirmPasswordError(validation.error || null);
      } else {
        setConfirmPasswordError(null);
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (password) {
      const validation = validateConfirmPassword(password, confirmPassword);
      if (!validation.isValid) {
        setConfirmPasswordError(validation.error || null);
      } else {
        setConfirmPasswordError(null);
      }
    } else if (confirmPassword) {
      setConfirmPasswordError("Please enter password first");
    }
    setFocusedInput(null);
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    const phoneValidation = validatePhoneNumber(phone);
    const passwordValid = passwordValidation.isValid;
    const confirmValid = validateConfirmPassword(password, confirmPassword).isValid;
    
    return phoneValidation.isValid && passwordValid && confirmValid;
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
                  onFocus={() => {
                    setFocusedInput("phone");
                    setPhoneError(null);
                  }}
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

              <View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      focusedInput === "password" && styles.inputFocused,
                      passwordError && styles.inputError,
                    ]}
                    placeholder="Enter Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    onFocus={() => {
                      setFocusedInput("password");
                      setPasswordError(null);
                    }}
                    onBlur={handlePasswordBlur}
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
                
                {/* Password Strength Indicator */}
                {focusedInput === "password" && password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarContainer}>
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            width: `${passwordValidation.strength === "weak" ? 33 : passwordValidation.strength === "medium" ? 66 : 100}%`,
                            backgroundColor: getStrengthColor(passwordValidation.strength),
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.strengthText,
                        { color: getStrengthColor(passwordValidation.strength) },
                      ]}
                    >
                      {getStrengthText(passwordValidation.strength)}
                    </Text>
                  </View>
                )}

                {/* Password Validation Hints */}
                {focusedInput === "password" && password.length > 0 && passwordValidation.hints.length > 0 && (
                  <View style={styles.hintsContainer}>
                    {passwordValidation.hints.map((hint, index) => (
                      <View key={index} style={styles.hintRow}>
                        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                        <Text style={styles.hintText}>{hint}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Password Error Messages */}
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                
                {/* Password Requirements Checklist (when focused or has errors) */}
                {(focusedInput === "password" || passwordError) && password.length > 0 && (
                  <View style={styles.requirementsContainer}>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={password.length >= 8 ? "#10B981" : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.requirementText,
                          password.length >= 8 && styles.requirementMet,
                        ]}
                      >
                        At least 8 characters
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={/\d/.test(password) ? "#10B981" : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.requirementText,
                          /\d/.test(password) && styles.requirementMet,
                        ]}
                      >
                        At least one number
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      focusedInput === "confirmPassword" && styles.inputFocused,
                      confirmPasswordError && styles.inputError,
                    ]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry={!showConfirmPassword}
                    onFocus={() => {
                      setFocusedInput("confirmPassword");
                      setConfirmPasswordError(null);
                    }}
                    onBlur={handleConfirmPasswordBlur}
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
                {confirmPasswordError && (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                )}
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                !isFormValid() && styles.continueButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={!isFormValid()}
              onPress={() => {
                // Validate all fields before submission
                const phoneValidation = validatePhoneNumber(phone);
                if (!phoneValidation.isValid) {
                  setPhoneError(phoneValidation.error || "Invalid phone number");
                  return;
                }

                const passwordValid = validatePassword(password);
                if (!passwordValid.isValid) {
                  setPasswordError(passwordValid.errors[0] || "Invalid password");
                  return;
                }

                const confirmValid = validateConfirmPassword(password, confirmPassword);
                if (!confirmValid.isValid) {
                  setConfirmPasswordError(confirmValid.error || "Passwords do not match");
                  return;
                }
                
                // All validations passed, ready for API submission
                // Phone is normalized and validated, ready for API submission
                // The phone will be in E.164 format: +1876XXXXXXX
                console.log("Normalized phone:", phone);
                console.log("Password validated:", passwordValidation.strength);
                // TODO: Submit form data to API
              }}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  !isFormValid() && styles.continueButtonTextDisabled,
                ]}
              >
                Continue
              </Text>
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
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  strengthBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBar: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 50,
  },
  hintsContainer: {
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 12,
    color: "#6B7280",
  },
  requirementMet: {
    color: "#10B981",
  },
  continueButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  continueButtonTextDisabled: {
    color: "#9CA3AF",
  },
});

