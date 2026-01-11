import { account } from "./appwrite-client";
import { ID } from "appwrite";
import { createOrUpdateProfile } from "./profile-service";

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
  password: string
): Promise<SignUpResult> {
  try {
    const userId = ID.unique();
    
    // Appwrite account.create signature: (userId, email, password, name?)
    // Note: Phone cannot be set during account creation - it must be added after session is created
    await account.create(userId, email, password, undefined);

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
 * @param phone - Optional phone number (will be added after session is created)
 * @returns Promise with result containing success status and optional error message
 */
export async function signUp(
  email: string,
  password: string,
  phone?: string
): Promise<SignUpResult> {
  // First, create the account (without phone - phone must be added after session)
  const accountResult = await createAccount(email, password);
  
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

  // If phone is provided, update it after session is created (now we have authentication)
  if (phone) {
    try {
      await account.updatePhone(phone, password);
    } catch (error: any) {
      // If phone update fails, don't fail the entire sign-up
      // User can add phone later via phone verification screen
      console.warn("Failed to set phone during sign-up:", error);
      // Continue with sign-up success - phone can be added later
    }
  }

  // Create/update profile in database immediately after account creation
  // This ensures profile exists right away to prevent any issues
  try {
    const user = await account.get();
    await createOrUpdateProfile({
      userId: user.$id,
      email: user.email,
      phone: user.phone || phone || "",
      name: user.name || undefined,
    });
  } catch (profileError: any) {
    // Log error but don't fail sign-up - profile can be created/updated later
    console.warn("Failed to create profile during sign-up:", profileError);
    // Continue with sign-up success - profile can be created later
  }

  return {
    success: true,
    userId: accountResult.userId,
  };
}

export interface PhoneVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Updates or adds a phone number to the authenticated user's account
 * @param phone - Phone number in E.164 format (e.g., +18761234567)
 * @param password - User's current password (required by Appwrite for security)
 * @returns Promise with result containing success status and optional error message
 */
export async function updatePhone(
  phone: string,
  password: string
): Promise<PhoneVerificationResult> {
  try {
    await account.updatePhone(phone, password);

    return {
      success: true,
    };
  } catch (error: any) {
    const errorMessage = error.message || "An error occurred";
    const errorCode = error.code || error.response?.code;

    // Check for duplicate phone error
    if (
      errorCode === 409 ||
      errorMessage.toLowerCase().includes("phone_already_exists") ||
      errorMessage.toLowerCase().includes("already exists") ||
      errorMessage.toLowerCase().includes("duplicate") ||
      errorMessage.toLowerCase().includes("phone number is already")
    ) {
      return {
        success: false,
        error: "This phone number is already registered to another account",
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
        error: "Connection error. Please check your internet and try again.",
      };
    }

    return {
      success: false,
      error: errorMessage || "Failed to update phone number. Please try again.",
    };
  }
}

/**
 * Sends a phone verification OTP SMS to the user's phone number
 * @returns Promise with result containing success status and optional error message
 */
export async function sendPhoneVerification(): Promise<PhoneVerificationResult> {
  try {
    await account.createPhoneVerification();

    return {
      success: true,
    };
  } catch (error: any) {
    const errorMessage = error.message || "An error occurred";
    const errorCode = error.code || error.response?.code;

    // Handle rate limiting
    if (
      errorCode === 429 ||
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("too many requests")
    ) {
      return {
        success: false,
        error: "Too many requests. Please wait a moment before requesting a new code.",
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
        error: "Connection error. Please check your internet and try again.",
      };
    }

    return {
      success: false,
      error: errorMessage || "Failed to send verification code. Please try again.",
    };
  }
}

/**
 * Verifies the phone number using the OTP code received via SMS
 * @param otp - The OTP code received via SMS
 * @returns Promise with result containing success status and optional error message
 */
export async function verifyPhone(otp: string): Promise<PhoneVerificationResult> {
  try {
    // Get current user to get userId
    const user = await account.get();
    
    // Verify the phone with the OTP (secret is the OTP code)
    await account.updatePhoneVerification(user.$id, otp);

    return {
      success: true,
    };
  } catch (error: any) {
    const errorMessage = error.message || "An error occurred";
    const errorCode = error.code || error.response?.code;

    // Handle invalid OTP
    if (
      errorCode === 401 ||
      errorCode === 400 ||
      errorMessage.toLowerCase().includes("invalid") ||
      errorMessage.toLowerCase().includes("expired") ||
      errorMessage.toLowerCase().includes("verification")
    ) {
      return {
        success: false,
        error: "Invalid verification code. Please try again.",
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
        error: "Connection error. Please check your internet and try again.",
      };
    }

    return {
      success: false,
      error: errorMessage || "Failed to verify phone number. Please try again.",
    };
  }
}

