import { databases, databaseId } from "./appwrite-client";
import { ID, Permission, Role } from "appwrite";

const SEARCH_ANALYTICS_COLLECTION_ID = "search_analytics";

export interface SearchAnalyticsEvent {
  $id: string;
  userId?: string; // Optional - may be null for anonymous searches
  query: string; // Sanitized query
  resultCount: number;
  isNoResult: boolean; // true if resultCount === 0
  timestamp: string;
  createdAt: string;
}

export interface CreateSearchAnalyticsParams {
  userId?: string | null; // Optional - null for anonymous searches
  query: string; // Original query (will be sanitized)
  resultCount: number;
}

/**
 * Sanitizes a search query to remove potential PII
 * Removes:
 * - Email patterns (user@domain.com)
 * - Phone number patterns (various formats)
 * - Credit card patterns
 * - SSN patterns
 * - Other sensitive patterns
 * 
 * @param query - Original search query
 * @returns Sanitized query safe for analytics
 */
function sanitizeQuery(query: string): string {
  if (!query || query.trim().length === 0) {
    return "";
  }

  let sanitized = query.trim();

  // Remove email patterns (user@domain.com, user@domain.co.uk, etc.)
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, "[email]");

  // Remove phone number patterns (various formats)
  // Matches: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, etc.
  sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]");

  // Remove credit card patterns (16 digits, possibly with spaces/dashes)
  sanitized = sanitized.replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, "[card]");

  // Remove SSN patterns (XXX-XX-XXXX)
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]");

  // Remove potential IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[ip]");

  // Remove long numeric sequences (potential IDs, tokens, etc.)
  // Matches sequences of 10+ digits
  sanitized = sanitized.replace(/\b\d{10,}\b/g, "[number]");

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, " ");

  // Limit query length to prevent abuse (max 200 characters)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Creates a search analytics event in the database
 * This function is non-blocking - errors are logged but don't throw
 * to ensure analytics failures don't break the main search flow
 * 
 * @param params - Search analytics parameters
 * @returns Promise that resolves when event is logged (or silently fails)
 */
export async function logSearchEvent(
  params: CreateSearchAnalyticsParams
): Promise<void> {
  try {
    const { userId, query, resultCount } = params;

    // Sanitize query to remove PII
    const sanitizedQuery = sanitizeQuery(query);

    // Skip logging if query is empty after sanitization
    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      if (__DEV__) {
        console.warn("[SearchAnalytics] Skipping log - query empty after sanitization");
      }
      return;
    }

    const isNoResult = resultCount === 0;

    // Prepare permissions
    // All authenticated users can read and write (for analytics)
    // Document-level permissions allow users to write their own logs
    const permissions = [
      Permission.read(Role.users()), // All authenticated users can read
      Permission.write(Role.users()), // All authenticated users can write
    ];

    // Create analytics event document
    await databases.createDocument(
      databaseId,
      SEARCH_ANALYTICS_COLLECTION_ID,
      ID.unique(),
      {
        userId: userId || null,
        query: sanitizedQuery,
        resultCount,
        isNoResult,
        timestamp: new Date().toISOString(),
      },
      permissions
    );

    if (__DEV__) {
      console.log("[SearchAnalytics] Search event logged:", {
        query: sanitizedQuery,
        resultCount,
        isNoResult,
        userId: userId || "anonymous",
      });
    }
  } catch (error: any) {
    // Silently fail - analytics logging should never break the main flow
    // Log to console for debugging in development
    if (__DEV__) {
      console.warn("[SearchAnalytics] Failed to log search event:", {
        query: params.query.substring(0, 50), // Log first 50 chars only
        resultCount: params.resultCount,
        userId: params.userId || "anonymous",
        error: error.message,
      });
    }
  }
}

/**
 * Logs a search event with automatic result count calculation
 * Convenience function that takes search results and logs the event
 * 
 * @param userId - User ID (optional, null for anonymous)
 * @param query - Search query (will be sanitized)
 * @param results - Search results array
 */
export async function logSearchResults(
  userId: string | null | undefined,
  query: string,
  results: any[]
): Promise<void> {
  await logSearchEvent({
    userId: userId || null,
    query,
    resultCount: results.length,
  });
}
