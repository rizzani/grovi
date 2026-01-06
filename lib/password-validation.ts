/**
 * Password validation utilities
 * Requirements:
 * - Minimum 8 characters
 * - At least one number
 */

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
  hints: string[];
}

/**
 * Validates password against requirements
 * - Minimum 8 characters
 * - At least one number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const hints: string[] = [];

  // Check minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    errors.push("Password must include at least one number");
  }

  // Calculate strength
  let strength: PasswordStrength = "weak";
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const length = password.length;

  if (length >= 8 && hasNumber && hasLetter) {
    if (length >= 12 && hasSpecialChar) {
      strength = "strong";
    } else if (length >= 10 || hasSpecialChar) {
      strength = "medium";
    } else {
      strength = "medium";
    }
  }

  // Generate helpful hints
  if (password.length > 0) {
    if (password.length < 8) {
      hints.push(`Add ${8 - password.length} more character${8 - password.length > 1 ? "s" : ""}`);
    }
    if (!hasNumber) {
      hints.push("Add at least one number");
    }
    if (!hasLetter) {
      hints.push("Consider adding letters");
    }
    if (length >= 8 && hasNumber && hasLetter && !hasSpecialChar) {
      hints.push("Add special characters for stronger password");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    hints: hints.length > 0 ? hints : [],
  };
}

/**
 * Validates that confirm password matches the password
 */
export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): {
  isValid: boolean;
  error?: string;
} {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: "Please confirm your password",
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: "Passwords do not match",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Gets strength color for UI display
 */
export function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "#EF4444"; // red
    case "medium":
      return "#F59E0B"; // amber
    case "strong":
      return "#10B981"; // green
    default:
      return "#6B7280"; // gray
  }
}

/**
 * Gets strength text for UI display
 */
export function getStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "Weak";
    case "medium":
      return "Medium";
    case "strong":
      return "Strong";
    default:
      return "";
  }
}

