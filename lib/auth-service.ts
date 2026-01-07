import { account } from "./appwrite-client";
import { ID } from "appwrite";

export interface SignUpResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Creates a new user account in Appwrite
 * @param email - User's email address
 * @param password - User's password
 * @param phone - Optional phone number
 * @returns Promise with result containing success status and optional error message
 */
export async function createAccount(
  email: string,
  password: string,
  phone?: string
): Promise<SignUpResult> {
  try {
    const userId = ID.unique();
    
    // Appwrite account.create signature: (userId, email, password, name?, phone?)
    await account.create(userId, email, password, undefined, phone);

    return {
      success: true,
      userId,
    };
  } catch (error: any) {
    // Handle Appwrite errors
    const errorMessage = error.message || "An error occurred";
    const errorCode = error.code || error.response?.code;

    // Check for duplicate email error
    if (
      errorCode === 409 ||
      errorMessage.toLowerCase().includes("user_already_exists") ||
      errorMessage.toLowerCase().includes("already exists") ||
      errorMessage.toLowerCase().includes("duplicate")
    ) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Handle other errors
    return {
      success: false,
      error: errorMessage || "Failed to create account. Please try again.",
    };
  }
}

/**
 * Creates a session for an existing user
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with result containing success status and optional error message
 */
export async function createSession(
  email: string,
  password: string
): Promise<SignUpResult> {
  try {
    await account.createEmailPasswordSession(email, password);

    return {
      success: true,
    };
  } catch (error: any) {
    const errorMessage = error.message || "An error occurred";
    const errorCode = error.code || error.response?.code;

    // Handle authentication errors
    if (errorCode === 401 || errorMessage.toLowerCase().includes("invalid")) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Handle network errors
    if (
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("connection") ||
      errorMessage.toLowerCase().includes("fetch")
    ) {
      return {
        success: false,
        error: "Connection error. Please try again.",
      };
    }

    return {
      success: false,
      error: errorMessage || "Failed to create session. Please try again.",
    };
  }
}

/**
 * Combined function that creates an account and establishes a session
 * @param email - User's email address
 * @param password - User's password
 * @param phone - Optional phone number
 * @returns Promise with result containing success status and optional error message
 */
export async function signUp(
  email: string,
  password: string,
  phone?: string
): Promise<SignUpResult> {
  // First, create the account
  const accountResult = await createAccount(email, password, phone);
  
  if (!accountResult.success) {
    return accountResult;
  }

  // Then, create the session
  const sessionResult = await createSession(email, password);
  
  if (!sessionResult.success) {
    return {
      success: false,
      error: sessionResult.error || "Account created but failed to start session. Please sign in.",
    };
  }

  return {
    success: true,
    userId: accountResult.userId,
  };
}

