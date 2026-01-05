import { Client, Account } from 'appwrite';

/**
 * Appwrite Client Configuration
 * 
 * This file initializes the Appwrite client and provides authentication methods.
 * Environment variables are loaded from .env file (see .env.example)
 */

// Get environment variables
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '';
const APPWRITE_PLATFORM = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || '';
const OAUTH_REDIRECT_URL = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL || '';

// Validate required environment variables
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  console.warn(
    '⚠️  Appwrite environment variables are not set. Please check your .env file.'
  );
}

/**
 * Initialize Appwrite Client
 */
export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform(APPWRITE_PLATFORM);

/**
 * Appwrite Account instance for authentication
 */
export const account = new Account(appwriteClient);

/**
 * Authentication Methods
 */

/**
 * Phone Authentication with OTP
 * @param phoneNumber - Phone number in E.164 format (e.g., +18761234567 for Jamaica)
 * @returns Promise with session creation result
 */
export const createPhoneSession = async (phoneNumber: string) => {
  try {
    // Remove any non-digit characters except +
    const cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure phone number starts with +1 for Jamaica
    const formattedPhone = cleanedPhone.startsWith('+1') 
      ? cleanedPhone 
      : `+1${cleanedPhone.replace(/^1/, '')}`;

    return await account.createPhoneSession('unique', formattedPhone);
  } catch (error) {
    console.error('Error creating phone session:', error);
    throw error;
  }
};

/**
 * Verify Phone OTP
 * @param userId - User ID from createPhoneSession
 * @param secret - OTP code received via SMS
 * @returns Promise with session creation result
 */
export const verifyPhoneOTP = async (userId: string, secret: string) => {
  try {
    return await account.updatePhoneSession(userId, secret);
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    throw error;
  }
};

/**
 * Email Authentication
 * @param email - User email address
 * @param password - User password
 * @returns Promise with session creation result
 */
export const createEmailSession = async (email: string, password: string) => {
  try {
    return await account.createEmailPasswordSession(email, password);
  } catch (error) {
    console.error('Error creating email session:', error);
    throw error;
  }
};

/**
 * Create Email Account
 * @param email - User email address
 * @param password - User password
 * @param name - User's name (optional)
 * @returns Promise with account creation result
 */
export const createEmailAccount = async (
  email: string,
  password: string,
  name?: string
) => {
  try {
    return await account.create('unique', email, password, name);
  } catch (error) {
    console.error('Error creating email account:', error);
    throw error;
  }
};

/**
 * Send Email Verification
 * @returns Promise with verification email sent result
 */
export const sendEmailVerification = async () => {
  try {
    return await account.createVerification(
      `${APPWRITE_ENDPOINT}/account/verification`
    );
  } catch (error) {
    console.error('Error sending email verification:', error);
    throw error;
  }
};

/**
 * Verify Email
 * @param userId - User ID
 * @param secret - Verification secret from email
 * @returns Promise with verification result
 */
export const verifyEmail = async (userId: string, secret: string) => {
  try {
    return await account.updateVerification(userId, secret);
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
};

/**
 * OAuth Authentication - Google
 * @returns Promise that resolves when OAuth flow completes
 */
export const signInWithGoogle = async () => {
  try {
    return await account.createOAuth2Session(
      'google',
      OAUTH_REDIRECT_URL,
      OAUTH_REDIRECT_URL
    );
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * OAuth Authentication - Facebook
 * @returns Promise that resolves when OAuth flow completes
 */
export const signInWithFacebook = async () => {
  try {
    return await account.createOAuth2Session(
      'facebook',
      OAUTH_REDIRECT_URL,
      OAUTH_REDIRECT_URL
    );
  } catch (error) {
    console.error('Error signing in with Facebook:', error);
    throw error;
  }
};

/**
 * Get Current Session
 * @returns Promise with current session or null
 */
export const getCurrentSession = async () => {
  try {
    return await account.getSession('current');
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};

/**
 * Get Current User
 * @returns Promise with current user or null
 */
export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Sign Out
 * @returns Promise that resolves when sign out completes
 */
export const signOut = async () => {
  try {
    return await account.deleteSession('current');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Delete All Sessions
 * @returns Promise that resolves when all sessions are deleted
 */
export const deleteAllSessions = async () => {
  try {
    return await account.deleteSessions();
  } catch (error) {
    console.error('Error deleting all sessions:', error);
    throw error;
  }
};



