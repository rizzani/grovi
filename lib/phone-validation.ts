/**
 * Phone validation and normalization utilities for Jamaica phone numbers
 * Format: +1-876-XXX-XXXX
 * E.164 format: +1876XXXXXXX
 */

/**
 * Normalizes a phone number input to E.164 format (+1876XXXXXXX)
 * - Strips spaces, dashes, parentheses, and other formatting
 * - Adds +1876 prefix if missing
 * - Handles various input formats
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";

  // Remove all non-digit characters except +
  let cleaned = input.replace(/[^\d+]/g, "");

  // If already in E.164 format (+1876...), return as is (allow partial input)
  if (cleaned.startsWith("+1876") && cleaned.length <= 12) {
    return cleaned;
  }

  // Remove country code prefixes
  if (cleaned.startsWith("+1")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("1") && cleaned.length >= 10) {
    // Remove leading 1 if it looks like country code
    cleaned = cleaned.substring(1);
  }

  // Remove any remaining + signs
  cleaned = cleaned.replace(/\+/g, "");

  // If it starts with 876, add +1 prefix
  if (cleaned.startsWith("876")) {
    return `+1${cleaned}`;
  }

  // If it's exactly 7 digits (local format), add +1876
  if (cleaned.length === 7 && /^\d{7}$/.test(cleaned)) {
    return `+1876${cleaned}`;
  }

  // If it's 11 digits starting with 1876, add + prefix
  if (cleaned.length === 11 && cleaned.startsWith("1876")) {
    return `+${cleaned}`;
  }

  // For partial input (1-7 digits), assume local number and add +1876 prefix
  if (cleaned.length > 0 && cleaned.length <= 7 && /^\d+$/.test(cleaned)) {
    return `+1876${cleaned}`;
  }

  // For 10+ digit numbers that don't match above patterns, try adding +1
  if (/^\d{10,}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }

  // Return empty for invalid input
  return "";
}

/**
 * Validates a phone number in E.164 format for Jamaica
 * Must be exactly +1876 followed by 7 digits
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  // Check if empty
  if (!phone || phone.trim().length === 0) {
    return {
      isValid: false,
      error: "Phone number is required",
    };
  }

  // Normalize first
  const normalized = normalizePhoneNumber(phone);

  // E.164 format for Jamaica: +1876XXXXXXX (total 12 characters: +1 + 876 + 7 digits)
  const e164Pattern = /^\+1876\d{7}$/;

  if (!e164Pattern.test(normalized)) {
    // Check if it contains non-numeric characters (after normalization)
    const digitsOnly = normalized.replace(/\D/g, "");
    if (digitsOnly.length !== 11) {
      return {
        isValid: false,
        error: "Phone number must be 10 digits (876-XXX-XXXX)",
      };
    }

    // Check if it starts with 876
    if (!normalized.includes("876")) {
      return {
        isValid: false,
        error: "Phone number must start with 876",
      };
    }

    return {
      isValid: false,
      error: "Invalid phone number format. Use 876-XXX-XXXX",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Formats a phone number for display (e.g., +18761234567 -> (876) 123-4567)
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  // Extract the 7-digit local number
  const match = normalized.match(/^\+1876(\d{7})$/);
  if (match) {
    const localNumber = match[1];
    return `(876) ${localNumber.substring(0, 3)}-${localNumber.substring(3)}`;
  }

  return phone; // Return original if can't format
}

