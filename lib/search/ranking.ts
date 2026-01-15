/**
 * Search Ranking Module
 * 
 * Provides deterministic, configurable relevance ranking for product search results.
 * Supports multi-word queries, user preferences, and configurable weights.
 */

// Minimal type definitions to avoid circular dependency
// These match the types from search-service.ts
export interface RankingProduct {
  $id: string;
  title: string;
  sku: string;
  brand?: string;
  category_leaf_id: string;
  category_path_ids: string[];
}

export interface RankingCategory {
  $id: string;
  name: string;
}

/**
 * Ranking weights configuration
 * 
 * Adjust these values to tune ranking behavior:
 * - Higher values = higher priority
 * - Keep relative differences meaningful (e.g., exact matches should be significantly higher)
 * 
 * Note: Priority is enforced via weights; ordering reflects intended outcomes given default weights.
 * The actual ranking order depends on the computed scores, which combine multiple match types.
 * 
 * Default weight ordering (intended outcomes):
 * 1. Exact title match (1000)
 * 2. Title starts with query (700)
 * 3. Title contains query (450)
 * 4. Token coverage in title (up to 300, proportional)
 * 5. Brand exact match (350)
 * 6. Brand starts with query (250)
 * 7. Brand contains query (150)
 * 8. Category exact match (200)
 * 9. Category contains query (100)
 * 10. User preference boosts (60 for category, 40 for dietary)
 */
export const RANKING_WEIGHTS = {
  exactTitle: 1000,
  titleStartsWith: 700,
  titleContains: 450,
  tokenCoverageTitleMax: 300, // Computed proportionally based on token matches
  brandExact: 350,
  brandStartsWith: 250,
  brandContains: 150,
  categoryExact: 200,
  categoryContains: 100,
  frequentlySearched: 0, // Placeholder for future analytics
  preferenceCategoryBoost: 60, // Small boost if product category is in user preferred categories
  preferenceDietaryBoost: 40, // Small boost if product matches dietary preference tags
} as const;

/**
 * Match information for a product
 */
export interface MatchInfo {
  exactTitle: boolean;
  titleStartsWith: boolean;
  titleContains: boolean;
  tokensMatched: number; // Number of query tokens found in title
  tokensTotal: number; // Total number of query tokens
  brandExact: boolean;
  brandStartsWith: boolean;
  brandContains: boolean;
  categoryExact: boolean;
  categoryContains: boolean;
  titleStartsWithQuery: boolean; // For tie-breaking
}

/**
 * User preferences for ranking (optional, non-breaking)
 */
export interface RankingUserPrefs {
  preferredCategories?: string[]; // Category IDs or names
  dietaryPreferences?: string[]; // Dietary preference tags
}

/**
 * Normalize text for comparison
 * 
 * Steps:
 * 1. Lowercase
 * 2. Trim
 * 3. Collapse multiple spaces
 * 4. Remove punctuation/special characters
 * 5. Strip unit/size tokens (numbers with units, pack indicators, multipliers)
 * 
 * Examples:
 * - "Grace Corned Beef 340g" -> "grace corned beef"
 * - "Milk 2L" -> "milk"
 * - "Tuna x2" -> "tuna"
 * 
 * @param input - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(input: string): string {
  if (!input) return "";
  
  // Step 1: Lowercase and trim
  let normalized = input
    .toLowerCase()
    .trim();
  
  // Step 2: Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ");
  
  // Step 3: Remove punctuation and special characters (keep alphanumeric and spaces)
  normalized = normalized.replace(/[^\w\s]/g, "");
  
  // Step 4: Strip unit/size tokens
  // Pattern 4a: Numbers with units (e.g., "340g", "2.5kg", "500ml", "1L")
  // Matches: optional decimal number followed by unit
  const numberWithUnitPattern = /\b(\d+(\.\d+)?)\s*(g|kg|ml|l|oz|lb|litre|liter|gal|gallon)\b/gi;
  normalized = normalized.replace(numberWithUnitPattern, "");
  
  // Pattern 4b: Standalone pack/count tokens (e.g., "pack", "pcs", "piece", "pk", "ct")
  // Matches: standalone words for pack indicators
  const packTokenPattern = /\b(pack|pcs|piece|pieces|pk|ct|count)\b/gi;
  normalized = normalized.replace(packTokenPattern, "");
  
  // Pattern 4c: Multipliers (e.g., "x2", "2x", "x 3", "3 x")
  // Matches: "x" followed by number, or number followed by "x"
  const multiplierPattern = /\b(x\s*\d+|\d+\s*x)\b/gi;
  normalized = normalized.replace(multiplierPattern, "");
  
  // Step 5: Clean up any double spaces left after removal
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}

/**
 * Tokenize a query into individual words
 * 
 * Steps:
 * 1. Normalize the input (reuse normalizeText)
 * 2. Split into tokens
 * 3. Remove stopwords: ["and", "or", "the", "of", "with"]
 * 4. Remove tokens shorter than 2 characters
 * 5. De-duplicate tokens (maintain original order)
 * 
 * @param input - Query string
 * @returns Array of normalized, filtered, deduplicated tokens in stable order
 */
export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  
  // Step 1: Split into tokens
  const tokens = normalized.split(/\s+/).filter(token => token.length > 0);
  
  // Step 2: Remove stopwords and short tokens
  const stopwords = new Set(["and", "or", "the", "of", "with"]);
  const filtered: string[] = [];
  const seen = new Set<string>();
  
  // Maintain original order while filtering and deduplicating
  for (const token of tokens) {
    // Skip stopwords
    if (stopwords.has(token)) continue;
    
    // Skip tokens shorter than 2 characters
    if (token.length < 2) continue;
    
    // De-duplicate (keep first occurrence)
    if (!seen.has(token)) {
      seen.add(token);
      filtered.push(token);
    }
  }
  
  return filtered;
}

/**
 * Get match information for a product against a query
 * 
 * @param product - Product to analyze
 * @param brand - Brand name (normalized)
 * @param category - Category (optional)
 * @param queryNormalized - Normalized query string
 * @param queryTokens - Tokenized query
 * @returns Match information
 */
export function getMatchInfo(
  product: RankingProduct,
  brand: string,
  category: RankingCategory | undefined,
  queryNormalized: string,
  queryTokens: string[]
): MatchInfo {
  const productTitleNormalized = normalizeText(product.title);
  const brandNormalized = brand ? normalizeText(brand) : "";
  const categoryNameNormalized = category ? normalizeText(category.name) : "";
  
  // Title matches
  const exactTitle = productTitleNormalized === queryNormalized;
  const titleStartsWith = !exactTitle && productTitleNormalized.startsWith(queryNormalized);
  const titleContains = !exactTitle && !titleStartsWith && productTitleNormalized.includes(queryNormalized);
  
  // Token coverage in title
  let tokensMatched = 0;
  if (queryTokens.length > 0) {
    tokensMatched = queryTokens.filter(token => 
      productTitleNormalized.includes(token)
    ).length;
  }
  
  // Brand matches
  const brandExact = brandNormalized === queryNormalized;
  const brandStartsWith = !brandExact && brandNormalized.startsWith(queryNormalized);
  const brandContains = !brandExact && !brandStartsWith && brandNormalized.includes(queryNormalized);
  
  // Category matches
  const categoryExact = categoryNameNormalized === queryNormalized;
  const categoryContains = !categoryExact && categoryNameNormalized.includes(queryNormalized);
  
  return {
    exactTitle,
    titleStartsWith,
    titleContains,
    tokensMatched,
    tokensTotal: queryTokens.length,
    brandExact,
    brandStartsWith,
    brandContains,
    categoryExact,
    categoryContains,
    titleStartsWithQuery: titleStartsWith || exactTitle,
  };
}

/**
 * Calculate relevance score for a product
 * 
 * @param product - Product to score
 * @param brand - Brand name
 * @param category - Category (optional)
 * @param matchInfo - Match information
 * @param userPrefs - User preferences (optional)
 * @returns Relevance score (higher = more relevant)
 */
export function calculateRelevanceScore(
  product: RankingProduct,
  brand: string,
  category: RankingCategory | undefined,
  matchInfo: MatchInfo,
  userPrefs?: RankingUserPrefs
): number {
  let score = 0;
  
  // Title matches (mutually exclusive, highest priority first)
  if (matchInfo.exactTitle) {
    score += RANKING_WEIGHTS.exactTitle;
    
    // Bonus for shorter product names (more specific matches)
    // Capped at 15 points to avoid short titles overpowering base weights
    const lengthBonus = Math.min(15, Math.max(0, 50 - product.title.length) * 0.1);
    score += lengthBonus;
  } else if (matchInfo.titleStartsWith) {
    score += RANKING_WEIGHTS.titleStartsWith;
    
    // Bonus for shorter product names
    // Capped at 10 points to avoid short titles overpowering base weights
    const lengthBonus = Math.min(10, Math.max(0, 50 - product.title.length) * 0.05);
    score += lengthBonus;
  } else if (matchInfo.titleContains) {
    score += RANKING_WEIGHTS.titleContains;
  }
  
  // Token coverage (for multi-word queries)
  if (matchInfo.tokensTotal > 0 && matchInfo.tokensMatched > 0) {
    const tokenCoverageRatio = matchInfo.tokensMatched / matchInfo.tokensTotal;
    const tokenScore = RANKING_WEIGHTS.tokenCoverageTitleMax * tokenCoverageRatio;
    score += tokenScore;
  }
  
  // Brand matches (can stack with title matches)
  if (matchInfo.brandExact) {
    score += RANKING_WEIGHTS.brandExact;
  } else if (matchInfo.brandStartsWith) {
    score += RANKING_WEIGHTS.brandStartsWith;
  } else if (matchInfo.brandContains) {
    score += RANKING_WEIGHTS.brandContains;
  }
  
  // Category matches (can stack with other matches)
  if (matchInfo.categoryExact) {
    score += RANKING_WEIGHTS.categoryExact;
  } else if (matchInfo.categoryContains) {
    score += RANKING_WEIGHTS.categoryContains;
  }
  
  // User preference boosts (small, non-overriding)
  if (userPrefs) {
    // Category preference boost
    if (userPrefs.preferredCategories && category) {
      const categoryIdMatch = userPrefs.preferredCategories.includes(category.$id);
      const categoryNameMatch = userPrefs.preferredCategories.some(pref => 
        normalizeText(pref) === normalizeText(category.name)
      );
      
      if (categoryIdMatch || categoryNameMatch) {
        score += RANKING_WEIGHTS.preferenceCategoryBoost;
      }
    }
    
    // Dietary preference boost
    // IMPORTANT: Dietary boost is a no-op until product dietary tags exist.
    // Only apply boost if product actually has dietary tags/flags.
    // Do NOT add fake fields or apply boost without product dietary data.
    // 
    // When dietary tags are added to products in the future, uncomment and use:
    // if (userPrefs.dietaryPreferences && product.dietaryTags && product.dietaryTags.length > 0) {
    //   const hasMatchingDietary = userPrefs.dietaryPreferences.some(pref =>
    //     product.dietaryTags?.some(tag => normalizeText(tag) === normalizeText(pref))
    //   );
    //   if (hasMatchingDietary) {
    //     score += RANKING_WEIGHTS.preferenceDietaryBoost;
    //   }
    // }
    // 
    // For now, dietary boost is 0 (product has no dietary tags in schema)
  }
  
  // Frequently searched (placeholder for future analytics)
  // if (isFrequentlySearched(product.$id)) {
  //   score += RANKING_WEIGHTS.frequentlySearched;
  // }
  
  return score;
}

/**
 * Sort mode for results
 */
export type SortMode = "relevance" | "price_asc" | "price_desc";

/**
 * Rank and sort search results
 * 
 * @param results - Search results to rank
 * @param query - Original search query
 * @param userPrefs - User preferences (optional)
 * @param sortMode - Sort mode (default: "relevance")
 * @returns Ranked and sorted results
 */
export function rankResults<T extends {
  product: RankingProduct;
  brand: string;
  category?: RankingCategory;
  inStock: boolean;
  priceJmdCents: number;
  relevanceScore?: number;
}>(
  results: T[],
  query: string,
  userPrefs?: RankingUserPrefs,
  sortMode: SortMode = "relevance"
): T[] {
  if (results.length === 0) return results;
  
  const queryNormalized = normalizeText(query);
  const queryTokens = tokenize(query);
  
  // Calculate relevance scores
  const scoredResults = results.map(result => {
    const matchInfo = getMatchInfo(
      result.product,
      result.brand,
      result.category,
      queryNormalized,
      queryTokens
    );
    
    const relevanceScore = calculateRelevanceScore(
      result.product,
      result.brand,
      result.category,
      matchInfo,
      userPrefs
    );
    
    return {
      ...result,
      relevanceScore,
      _matchInfo: matchInfo, // Internal use only
    };
  });
  
  // Sort results
  scoredResults.sort((a, b) => {
    // Primary sort: relevance score (descending)
    if (sortMode === "relevance") {
      const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      
      // Secondary sort: in-stock items first
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      
      // Tertiary sort: title starts with query first
      if (a._matchInfo.titleStartsWithQuery && !b._matchInfo.titleStartsWithQuery) return -1;
      if (!a._matchInfo.titleStartsWithQuery && b._matchInfo.titleStartsWithQuery) return 1;
      
      // Quaternary sort: shorter normalized title first (deterministic tie-breaker)
      // This ensures consistent ordering when all other factors are equal
      const aTitleNormalized = normalizeText(a.product.title);
      const bTitleNormalized = normalizeText(b.product.title);
      const lengthDiff = aTitleNormalized.length - bTitleNormalized.length;
      if (lengthDiff !== 0) {
        return lengthDiff;
      }
      
      // No price tie-break by default (price sorting only when explicitly requested)
      return 0;
    }
    
    // Price sorting (only when explicitly requested)
    if (sortMode === "price_asc") {
      return a.priceJmdCents - b.priceJmdCents;
    }
    if (sortMode === "price_desc") {
      return b.priceJmdCents - a.priceJmdCents;
    }
    
    return 0;
  });
  
  // Remove internal _matchInfo field before returning
  return scoredResults.map(({ _matchInfo, ...result }) => result);
}
