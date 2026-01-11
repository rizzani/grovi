import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_ATTEMPTS = 5;
const COOLDOWN_DURATION_MS = 12 * 60 * 1000; // 12 minutes (between 10-15 minutes)

interface FailedLoginData {
  attempts: number;
  cooldownUntil: number | null; // timestamp in milliseconds
  email: string;
}

const STORAGE_KEY_PREFIX = "@grovi:failed_login:";

/**
 * Gets the storage key for a specific email
 */
function getStorageKey(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return `${STORAGE_KEY_PREFIX}${normalizedEmail}`;
}

/**
 * Records a failed login attempt for an email
 * @param email - The email address that failed to login
 * @returns Object with current attempt count and whether cooldown is active
 */
export async function recordFailedAttempt(email: string): Promise<{
  attempts: number;
  isLocked: boolean;
  cooldownUntil: number | null;
}> {
  const storageKey = getStorageKey(email);
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingData = await AsyncStorage.getItem(storageKey);
    let data: FailedLoginData;

    if (existingData) {
      data = JSON.parse(existingData);
      
      // Check if cooldown has expired
      if (data.cooldownUntil && Date.now() > data.cooldownUntil) {
        // Reset if cooldown expired
        data = {
          attempts: 1,
          cooldownUntil: null,
          email: normalizedEmail,
        };
      } else {
        // Increment attempts
        data.attempts += 1;
      }
    } else {
      // First failed attempt
      data = {
        attempts: 1,
        cooldownUntil: null,
        email: normalizedEmail,
      };
    }

    // If we've reached max attempts, start cooldown
    if (data.attempts >= MAX_ATTEMPTS && !data.cooldownUntil) {
      data.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(data));

    const isLocked = data.attempts >= MAX_ATTEMPTS && 
                     data.cooldownUntil !== null && 
                     Date.now() < data.cooldownUntil;

    return {
      attempts: data.attempts,
      isLocked,
      cooldownUntil: data.cooldownUntil,
    };
  } catch (error) {
    console.error("Error recording failed attempt:", error);
    // Return safe defaults on error
    return {
      attempts: 1,
      isLocked: false,
      cooldownUntil: null,
    };
  }
}

/**
 * Gets the current failed login status for an email
 * @param email - The email address to check
 * @returns Object with current attempt count and cooldown status
 */
export async function getFailedLoginStatus(email: string): Promise<{
  attempts: number;
  isLocked: boolean;
  cooldownUntil: number | null;
  remainingCooldownMs: number;
}> {
  const storageKey = getStorageKey(email);

  try {
    const existingData = await AsyncStorage.getItem(storageKey);
    
    if (!existingData) {
      return {
        attempts: 0,
        isLocked: false,
        cooldownUntil: null,
        remainingCooldownMs: 0,
      };
    }

    const data: FailedLoginData = JSON.parse(existingData);
    
    // Check if cooldown has expired
    if (data.cooldownUntil && Date.now() > data.cooldownUntil) {
      // Cooldown expired, reset
      await AsyncStorage.removeItem(storageKey);
      return {
        attempts: 0,
        isLocked: false,
        cooldownUntil: null,
        remainingCooldownMs: 0,
      };
    }

    const isLocked = data.attempts >= MAX_ATTEMPTS && 
                     data.cooldownUntil !== null && 
                     Date.now() < data.cooldownUntil;
    
    const remainingCooldownMs = data.cooldownUntil && Date.now() < data.cooldownUntil
      ? data.cooldownUntil - Date.now()
      : 0;

    return {
      attempts: data.attempts,
      isLocked,
      cooldownUntil: data.cooldownUntil,
      remainingCooldownMs,
    };
  } catch (error) {
    console.error("Error getting failed login status:", error);
    return {
      attempts: 0,
      isLocked: false,
      cooldownUntil: null,
      remainingCooldownMs: 0,
    };
  }
}

/**
 * Resets failed login attempts for an email (called on successful login)
 * @param email - The email address that successfully logged in
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  const storageKey = getStorageKey(email);

  try {
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Error resetting failed attempts:", error);
  }
}

/**
 * Gets the maximum number of attempts allowed
 */
export function getMaxAttempts(): number {
  return MAX_ATTEMPTS;
}
