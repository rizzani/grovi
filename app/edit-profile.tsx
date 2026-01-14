import { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import { updateName, updateEmail, updatePhone, sendPhoneVerification } from "../lib/auth-service";
import { createOrUpdateProfile } from "../lib/profile-service";
import { normalizePhoneNumber, validatePhoneNumber } from "../lib/phone-validation";
import { logNameUpdate, logEmailChangeRequested, logPhoneChangeRequested } from "../lib/audit-service";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshSession } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Error states
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      // Split name into firstName and lastName
      if (user.name) {
        const parts = user.name.trim().split(/\s+/);
        if (parts.length === 1) {
          setFirstName(parts[0]);
          setLastName("");
        } else if (parts.length > 1) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(" "));
        }
      } else {
        setFirstName("");
        setLastName("");
      }
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleUpdateName = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    // Validation
    if (!trimmedFirstName) {
      setFirstNameError("First name is required");
      return;
    }

    // Combine firstName and lastName for Appwrite account (which uses full name)
    const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ").trim();
    
    // Check if name changed
    if (fullName === user?.name) {
      // No change
      return;
    }

    setFirstNameError(null);
    setLastNameError(null);
    setIsLoading(true);

    try {
      // Update name in Appwrite account (requires full name)
      const result = await updateName(fullName);

      if (!result.success) {
        setFirstNameError(result.error || "Failed to update name");
        setIsLoading(false);
        return;
      }

      // Update profile in database with firstName and lastName
      if (user) {
        try {
          await createOrUpdateProfile({
            userId: user.id,
            email: user.email,
            phone: user.phone || "",
            firstName: trimmedFirstName,
            lastName: trimmedLastName || undefined,
          });
        } catch (profileError) {
          console.warn("Failed to update profile database:", profileError);
          // Continue - account was updated successfully
        }

        // Log audit event (non-blocking)
        try {
          await logNameUpdate(user.id, user.name, fullName);
        } catch (auditError) {
          // Silently fail - audit logging should not break the flow
          console.warn("Failed to log audit event:", auditError);
        }
      }

      // Refresh user context
      await refreshSession();

      Alert.alert("Success", "Your name has been updated successfully.");
    } catch (error: any) {
      setFirstNameError("An unexpected error occurred. Please try again.");
      console.error("Name update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    // Validation
    if (!trimmedEmail) {
      setEmailError("Email cannot be empty");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (trimmedEmail === user?.email) {
      // No change
      return;
    }

    if (!password) {
      setPasswordError("Password is required to change email");
      return;
    }

    setEmailError(null);
    setPasswordError(null);
    setIsLoading(true);

    try {
      // Update email in Appwrite account (sends verification email automatically)
      const result = await updateEmail(trimmedEmail, password);

      if (!result.success) {
        setEmailError(result.error || "Failed to update email");
        setIsLoading(false);
        return;
      }

      // Update profile in database
      if (user) {
        try {
          // Get firstName and lastName from existing name or use current form values
          const currentFirstName = firstName.trim() || undefined;
          const currentLastName = lastName.trim() || undefined;
          await createOrUpdateProfile({
            userId: user.id,
            email: trimmedEmail,
            phone: user.phone || "",
            firstName: currentFirstName,
            lastName: currentLastName,
          });
        } catch (profileError) {
          console.warn("Failed to update profile database:", profileError);
          // Continue - account was updated successfully
        }

        // Log audit event (non-blocking)
        try {
          await logEmailChangeRequested(user.id, user.email, trimmedEmail);
        } catch (auditError) {
          // Silently fail - audit logging should not break the flow
          console.warn("Failed to log audit event:", auditError);
        }
      }

      // Clear password field
      setPassword("");

      // Refresh user context
      await refreshSession();

      Alert.alert(
        "Email Updated",
        "Your email has been updated. Please check your inbox to verify the new email address.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      setEmailError("An unexpected error occurred. Please try again.");
      console.error("Email update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    const trimmedPhone = phone.trim();

    // Validation
    if (!trimmedPhone) {
      setPhoneError("Phone number cannot be empty");
      return;
    }

    const phoneValidation = validatePhoneNumber(trimmedPhone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || "Invalid phone number");
      return;
    }

    if (normalizePhoneNumber(trimmedPhone) === user?.phone) {
      // No change
      return;
    }

    if (!password) {
      setPasswordError("Password is required to change phone number");
      return;
    }

    setPhoneError(null);
    setPasswordError(null);
    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(trimmedPhone);

      // Update phone in Appwrite account
      const result = await updatePhone(normalizedPhone, password);

      if (!result.success) {
        setPhoneError(result.error || "Failed to update phone number");
        setIsLoading(false);
        return;
      }

      // Update profile in database
      if (user) {
        try {
          // Get firstName and lastName from existing name or use current form values
          const currentFirstName = firstName.trim() || undefined;
          const currentLastName = lastName.trim() || undefined;
          await createOrUpdateProfile({
            userId: user.id,
            email: user.email,
            phone: normalizedPhone,
            firstName: currentFirstName,
            lastName: currentLastName,
          });
        } catch (profileError) {
          console.warn("Failed to update profile database:", profileError);
          // Continue - account was updated successfully
        }

        // Log audit event (non-blocking)
        try {
          await logPhoneChangeRequested(user.id, user.phone, normalizedPhone);
        } catch (auditError) {
          // Silently fail - audit logging should not break the flow
          console.warn("Failed to log audit event:", auditError);
        }
      }

      // Clear password field
      setPassword("");

      // Send verification code
      try {
        await sendPhoneVerification();
      } catch (verifyError) {
        console.warn("Failed to send verification code:", verifyError);
        // Continue - user can request code from phone-verification screen
      }

      // Refresh user context
      await refreshSession();

      Alert.alert(
        "Phone Number Updated",
        "Your phone number has been updated. Please verify it with the code we sent.",
        [
          {
            text: "Verify Now",
            onPress: () => {
              router.push("/phone-verification");
            },
          },
          {
            text: "Later",
            style: "cancel",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      setPhoneError("An unexpected error occurred. Please try again.");
      console.error("Phone update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasNameChanges = () => {
    const currentFullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    return currentFullName !== (user?.name || "");
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.errorText}>No user data available</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>First Name</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "firstName" && styles.inputContainerFocused,
                firstNameError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setFirstNameError(null);
                }}
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
                autoCapitalize="words"
              />
            </View>
            {firstNameError && <Text style={styles.errorText}>{firstNameError}</Text>}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Last Name</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "lastName" && styles.inputContainerFocused,
                lastNameError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setLastNameError(null);
                }}
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your last name"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
                autoCapitalize="words"
              />
            </View>
            {lastNameError && <Text style={styles.errorText}>{lastNameError}</Text>}
            {hasNameChanges() && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateName}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Name</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Email Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Email</Text>
              {user.emailVerification ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <Text style={styles.unverifiedText}>Unverified</Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedField === "email" && styles.inputContainerFocused,
                emailError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError(null);
                }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            {email.trim().toLowerCase() !== (user?.email || "").toLowerCase() && (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "password-email" && styles.inputContainerFocused,
                    passwordError && styles.inputContainerError,
                    styles.passwordContainer,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError(null);
                    }}
                    onFocus={() => setFocusedField("password-email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateEmail}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Email</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.helpText}>
              Changing your email requires password confirmation and email verification.
            </Text>
          </View>

          {/* Phone Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Phone Number</Text>
              {user.phoneVerification ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : user.phone ? (
                <View style={styles.unverifiedBadge}>
                  <Text style={styles.unverifiedText}>Unverified</Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedField === "phone" && styles.inputContainerFocused,
                phoneError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setPhoneError(null);
                }}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
            {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
            {normalizePhoneNumber(phone.trim()) !== (user?.phone || "") && (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "password-phone" && styles.inputContainerFocused,
                    passwordError && styles.inputContainerError,
                    styles.passwordContainer,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError(null);
                    }}
                    onFocus={() => setFocusedField("password-phone")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdatePhone}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Phone</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.helpText}>
              Changing your phone number requires password confirmation and phone verification via OTP.
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
  },
  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unverifiedText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#D97706",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  inputContainerFocused: {
    borderColor: "#10B981",
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: "#EF4444",
  },
  passwordContainer: {
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 32,
  },
});
