import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { account } from "../lib/appwrite-client";
import { AppwriteException } from "appwrite";
import { logout } from "../lib/auth-service";

// User type based on Appwrite User model
export interface User {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  emailVerification?: boolean;
  phoneVerification?: boolean;
}

// Session type - minimal representation since Appwrite manages sessions internally
export interface Session {
  id: string;
  provider?: string;
  expire?: string;
  userId: string;
}

export interface UserContextType {
  // State
  user: User | null;
  session: Session | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  refreshSession: () => Promise<void>;
  setUserFromAuth: (user: User) => void;
  logoutLocal: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const userId = user?.id || null;
  const isAuthenticated = !!user && !!session;

  /**
   * Refreshes the session by checking with Appwrite
   * Called on app start and when returning to app
   */
  const refreshSession = useCallback(async () => {
    try {
      if (__DEV__) {
        console.log("[UserContext] Refreshing session...");
      }

      // Try to get current user - this will throw if not authenticated
      const appwriteUser = await account.get();

      // If we get here, user is authenticated
      const userData: User = {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        phone: appwriteUser.phone,
        emailVerification: appwriteUser.emailVerification,
        phoneVerification: appwriteUser.phoneVerification,
      };

      // Try to get session info
      // Note: getSession('current') may not work in client-side React Native
      // So we create a minimal session representation
      let sessionData: Session | null = null;
      try {
        // Try to get current session
        const currentSession = await account.getSession("current");
        sessionData = {
          id: currentSession.$id,
          provider: currentSession.provider,
          expire: currentSession.expire,
          userId: currentSession.userId,
        };
      } catch (sessionError) {
        // If getSession fails, we still have a valid user (account.get() succeeded)
        // Create a minimal session representation
        // This happens because Appwrite client-side SDK manages sessions internally
        if (__DEV__) {
          console.log(
            "[UserContext] Could not get session details, but user is authenticated"
          );
        }
        sessionData = {
          id: "current", // Placeholder since we know we have a session
          userId: appwriteUser.$id,
        };
      }

      setUser(userData);
      setSession(sessionData);

      if (__DEV__) {
        console.log("[UserContext] Session refreshed successfully", {
          userId: userData.id,
          email: userData.email,
        });
      }
    } catch (error: any) {
      // User is not authenticated or session is invalid/expired
      const isAuthError =
        error instanceof AppwriteException &&
        (error.code === 401 || error.code === 403 || error.message?.includes("unauthorized"));

      if (isAuthError || error.message?.includes("session")) {
        // Clear user and session cleanly
        setUser(null);
        setSession(null);

        if (__DEV__) {
          console.log("[UserContext] Session invalid or expired, cleared state");
        }
      } else {
        // Other error (network, etc.) - log but don't clear state
        if (__DEV__) {
          console.warn("[UserContext] Error refreshing session:", error);
        }
      }
    }
  }, []);

  /**
   * Sets user data from auth flow (after login/signup)
   * This is called explicitly after successful authentication
   */
  const setUserFromAuth = useCallback((userData: User) => {
    setUser(userData);
    // Create minimal session representation
    setSession({
      id: "current",
      userId: userData.id,
    });

    if (__DEV__) {
      console.log("[UserContext] User set from auth:", { userId: userData.id });
    }
  }, []);

  /**
   * Logs out locally and clears context state
   * Also calls the auth service logout to clear Appwrite session
   */
  const logoutLocal = useCallback(async () => {
    try {
      // Call auth service to delete session on server
      await logout();
    } catch (error) {
      // Even if logout fails, clear local state
      if (__DEV__) {
        console.warn("[UserContext] Error during logout:", error);
      }
    } finally {
      // Always clear local state
      setUser(null);
      setSession(null);

      if (__DEV__) {
        console.log("[UserContext] User logged out, state cleared");
      }
    }
  }, []);

  // Initial session check on mount
  useEffect(() => {
    refreshSession().finally(() => {
      setIsLoading(false);
    });
  }, [refreshSession]);

  const value: UserContextType = {
    user,
    session,
    userId,
    isAuthenticated,
    isLoading,
    refreshSession,
    setUserFromAuth,
    logoutLocal,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook to access user context
 * @throws Error if used outside UserProvider
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
