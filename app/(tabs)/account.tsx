import { useState, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../contexts/UserContext";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  badge?: string;
}

function MenuItem({ icon, title, subtitle, onPress, showChevron = true, badge }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconContainer}>
          <Ionicons name={icon} size={22} color="#10B981" />
        </View>
        <View style={styles.menuItemText}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ProfileHeader({ name, email }: { name?: string; email: string }) {
  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <View style={styles.avatarBadge}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.profileName}>{name || "User"}</Text>
      <Text style={styles.profileEmail}>{email}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logoutLocal, isLoading: userLoading, refreshSession } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Refresh session when screen is focused (e.g., after email verification)
  useFocusEffect(
    useCallback(() => {
      refreshSession();
    }, [refreshSession])
  );

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logoutLocal();
              router.replace("/sign-in");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getVerificationStatus = () => {
    const verified = [];
    if (user?.emailVerification) verified.push("Email");
    if (user?.phoneVerification) verified.push("Phone");
    return verified;
  };

  if (userLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.errorText}>No user data available</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace("/sign-in")}
          >
            <Text style={styles.errorButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const verifiedItems = getVerificationStatus();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <ProfileHeader name={user.name} email={user.email} />

        {/* Verification Status */}
        {verifiedItems.length > 0 && (
          <View style={styles.verificationContainer}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={styles.verificationTitle}>Verified</Text>
            </View>
            <View style={styles.verificationBadges}>
              {verifiedItems.map((item) => (
                <View key={item} style={styles.verificationBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.verificationBadgeText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Personal Information"
              subtitle={user.name || "Add your name"}
              onPress={() => router.push("/edit-profile")}
            />
            <MenuItem
              icon="mail-outline"
              title="Email"
              subtitle={user.email}
              badge={user.emailVerification ? "Verified" : "Unverified"}
              onPress={() => router.push("/edit-profile")}
            />
            {user.phone && (
              <MenuItem
                icon="call-outline"
                title="Phone Number"
                subtitle={user.phone}
                badge={user.phoneVerification ? "Verified" : "Unverified"}
                onPress={() => router.push("/edit-profile")}
              />
            )}
          </View>
        </View>

        {/* Orders & Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orders & Activities</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="bag-outline"
              title="My Orders"
              subtitle="View order history"
              onPress={() => router.push("/(tabs)/orders")}
            />
            <MenuItem
              icon="heart-outline"
              title="Saved Items"
              subtitle="Items you've saved"
              onPress={() => {
                Alert.alert("Coming Soon", "Saved items will be available soon.");
              }}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage notifications"
              onPress={() => {
                Alert.alert("Coming Soon", "Notification settings will be available soon.");
              }}
            />
            <MenuItem
              icon="lock-closed-outline"
              title="Privacy & Security"
              subtitle="Manage your privacy"
              onPress={() => {
                Alert.alert("Coming Soon", "Privacy settings will be available soon.");
              }}
            />
            <MenuItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage payment options"
              onPress={() => {
                Alert.alert("Coming Soon", "Payment methods will be available soon.");
              }}
            />
            <MenuItem
              icon="location-outline"
              title="Delivery Addresses"
              subtitle="Manage addresses"
              onPress={() => {
                Alert.alert("Coming Soon", "Address management will be available soon.");
              }}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => {
                Alert.alert("Coming Soon", "Help center will be available soon.");
              }}
            />
            <MenuItem
              icon="chatbubble-outline"
              title="Contact Us"
              subtitle="Get in touch"
              onPress={() => {
                Alert.alert("Coming Soon", "Contact form will be available soon.");
              }}
            />
            <MenuItem
              icon="document-text-outline"
              title="Terms & Privacy"
              subtitle="Legal information"
              onPress={() => {
                Alert.alert("Coming Soon", "Terms and privacy policy will be available soon.");
              }}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        {/* App Version / Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Grovi v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: "#6B7280",
  },
  verificationContainer: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  verificationBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  verificationBadgeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#10B981",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
