/**
 * Fuzzy Matching Utilities for Typo Tolerance
 * 
 * Provides typo tolerance using Levenshtein distance and character-level variations
 * to handle minor spelling errors in search queries.
 */

/**
 * Calculate Levenshtein distance between two strings
 * (Minimum number of single-character edits needed to change one word into another)
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance (0 = identical, higher = more different)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,        // deletion
        matrix[i][j - 1] + 1,        // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1 scale)
 * 1.0 = identical, 0.0 = completely different
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity ratio (0 to 1)
 */
export function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1.0;
  
  return 1 - (distance / maxLength);
}

/**
 * Check if two strings are similar within a threshold
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Minimum similarity ratio (default: 0.8 = 80% similar)
 * @returns True if strings are similar enough
 */
export function isSimilar(str1: string, str2: string, threshold: number = 0.8): boolean {
  return similarityRatio(str1, str2) >= threshold;
}

/**
 * Generate typo variations for a word
 * Creates variations with common single-character errors (insertions, deletions, substitutions, transpositions)
 * 
 * This is used to expand search queries with typo-tolerant variations
 * 
 * @param word - Word to generate variations for
 * @param maxVariations - Maximum number of variations to generate (default: 10)
 * @returns Array of typo variations
 */
export function generateTypoVariations(word: string, maxVariations: number = 10): string[] {
  if (word.length < 2) return [];
  
  const variations = new Set<string>();
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  
  // Only generate variations for words 3+ characters (to avoid too many false positives)
  if (word.length < 3) {
    return [];
  }
  
  // 1. Character substitutions (most common typo)
  for (let i = 0; i < Math.min(word.length, 5) && variations.size < maxVariations; i++) {
    for (const char of chars) {
      if (char !== word[i] && variations.size < maxVariations) {
        const variation = word.slice(0, i) + char + word.slice(i + 1);
        variations.add(variation);
      }
    }
  }
  
  // 2. Character deletions (common for fast typing)
  if (word.length > 3) {
    for (let i = 0; i < Math.min(word.length, 3) && variations.size < maxVariations; i++) {
      const variation = word.slice(0, i) + word.slice(i + 1);
      variations.add(variation);
    }
  }
  
  // 3. Character insertions
  for (let i = 0; i < Math.min(word.length, 3) && variations.size < maxVariations; i++) {
    for (const char of chars.slice(0, 5)) { // Limit to first 5 letters to reduce combinations
      if (variations.size < maxVariations) {
        const variation = word.slice(0, i) + char + word.slice(i);
        variations.add(variation);
      }
    }
  }
  
  // 4. Character transpositions (adjacent character swaps)
  for (let i = 0; i < word.length - 1 && variations.size < maxVariations; i++) {
    const variation = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    variations.add(variation);
  }
  
  return Array.from(variations).slice(0, maxVariations);
}

/**
 * Check if a text contains a fuzzy match for a query
 * 
 * @param text - Text to search in
 * @param query - Query to search for
 * @param threshold - Similarity threshold (default: 0.8)
 * @returns True if text contains a fuzzy match for query
 */
export function fuzzyContains(text: string, query: string, threshold: number = 0.8): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // First check exact match
  if (textLower.includes(queryLower)) {
    return true;
  }
  
  // Check if any word in the text is similar to the query
  const textWords = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
  // If query is a single word, check against each word in text
  if (queryWords.length === 1) {
    return textWords.some(word => isSimilar(word, queryWords[0], threshold));
  }
  
  // For multi-word queries, check if query tokens match text tokens
  // (we allow some tokens to be fuzzy)
  const matchedTokens = queryWords.filter(queryWord => 
    textWords.some(textWord => isSimilar(textWord, queryWord, threshold))
  );
  
  // At least 70% of tokens should match for multi-word queries
  return matchedTokens.length >= Math.ceil(queryWords.length * 0.7);
}

/**
 * Score how well a text matches a query (fuzzy matching score)
 * Higher score = better match
 * 
 * @param text - Text to score
 * @param query - Query to match against
 * @returns Match score (0 to 1, where 1 is best match)
 */
export function fuzzyMatchScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact substring match gets highest score
  if (textLower.includes(queryLower)) {
    return 1.0;
  }
  
  // Check word-level similarity
  const textWords = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
  if (queryWords.length === 1) {
    // Single word query: find best matching word
    const bestMatch = Math.max(
      ...textWords.map(word => similarityRatio(word, queryWords[0]))
    );
    return bestMatch;
  }
  
  // Multi-word query: average similarity of matched tokens
  const tokenScores = queryWords.map(queryWord => {
    const bestMatch = Math.max(
      ...textWords.map(textWord => similarityRatio(textWord, queryWord)),
      0
    );
    return bestMatch;
  });
  
  const avgScore = tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length;
  
  // Boost score if most tokens match
  const matchRatio = tokenScores.filter(score => score >= 0.8).length / tokenScores.length;
  
  return avgScore * (0.7 + matchRatio * 0.3); // Weighted average
}

/**
 * Configuration for fuzzy matching behavior
 */
export const FUZZY_MATCH_CONFIG = {
  // Minimum similarity ratio to consider a match (0-1)
  similarityThreshold: 0.75,
  
  // Maximum edit distance for short words (3-4 chars)
  maxEditDistanceShort: 1,
  
  // Maximum edit distance for medium words (5-7 chars)
  maxEditDistanceMedium: 2,
  
  // Maximum edit distance for long words (8+ chars)
  maxEditDistanceLong: 2,
  
  // Minimum word length to apply fuzzy matching (avoid false positives on very short words)
  minWordLength: 3,
} as const;
