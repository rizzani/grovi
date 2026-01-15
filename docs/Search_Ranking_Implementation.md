# Search Relevance & Ranking Implementation

## Overview

The search service implements a comprehensive, deterministic relevance ranking system that ensures search results are consistently ordered by relevance. The ranking system is modular, configurable, and supports multi-word queries, user preferences, and various match types.

## Architecture

The ranking system is implemented in a separate module (`lib/search/ranking.ts`) to avoid circular dependencies and improve maintainability:

- **Core Functions**: `normalizeText()`, `tokenize()`, `getMatchInfo()`, `calculateRelevanceScore()`, `rankResults()`
- **Configuration**: `RANKING_WEIGHTS` constant for easy tuning
- **Types**: `MatchInfo`, `RankingUserPrefs`, `SortMode`

## Ranking Priority

Results are ranked in the following order (highest to lowest priority):

1. **Exact title match** - Product title exactly matches the search query (normalized)
2. **Title starts with query** - Product title starts with the search query
3. **Title contains query** - Product title contains the search query
4. **Token coverage in title** - For multi-word queries, proportion of tokens matched (up to max weight)
5. **Brand exact match** - Product brand exactly matches query
6. **Brand starts with query** - Product brand starts with query
7. **Brand contains query** - Product brand contains query
8. **Category exact match** - Product category exactly matches query
9. **Category contains query** - Product category contains query
10. **User preference boosts** - Small boosts for preferred categories and dietary preferences (optional)

## Scoring System

Each search result receives a relevance score based on match types. The scoring system uses weighted values:

### Base Weights

| Match Type | Weight | Description |
|------------|--------|-------------|
| Exact title match | 1000 | Product title exactly matches query (case-insensitive, normalized) |
| Title starts with | 700 | Product title starts with query |
| Title contains | 450 | Product title contains query |
| Token coverage (max) | 300 | Proportional score based on tokens matched / total tokens |
| Brand exact | 350 | Product brand exactly matches query |
| Brand starts with | 250 | Product brand starts with query |
| Brand contains | 150 | Product brand contains query |
| Category exact | 200 | Product category exactly matches query |
| Category contains | 100 | Product category contains query |
| Preference category boost | 60 | Small boost if product category is in user preferred categories |
| Preference dietary boost | 40 | Small boost if product matches dietary preference tags |

### Bonus Points

Additional scoring bonuses are applied:

- **Exact title match bonuses:**
  - Shorter product names get a small bonus (more specific matches preferred)
  - Formula: `max(0, 50 - title.length) * 0.1`

- **Title starts with bonuses:**
  - Shorter product names get a small bonus
  - Formula: `max(0, 50 - title.length) * 0.05`

- **Token coverage:**
  - Calculated proportionally: `(tokensMatched / tokensTotal) * TOKEN_WEIGHT`
  - Example: Query "lasco food drink" (3 tokens), product matches all 3 → 300 points
  - Example: Query "lasco food drink" (3 tokens), product matches 1 → 100 points

## Text Normalization

The ranking system normalizes text for consistent matching:

1. **Lowercase** - All text is converted to lowercase
2. **Trim** - Leading/trailing whitespace removed
3. **Collapse spaces** - Multiple spaces become single space
4. **Remove punctuation** - Special characters removed (keeps alphanumeric and spaces)
5. **Strip units** - Common unit/size tokens removed:
   - Examples: "340g", "500ml", "1L", "2kg", "pack", "pcs", "x2"
   - Pattern: `/\b\d*\s*(g|kg|ml|l|oz|lb|pack|pcs|pack|piece|pieces)\b/gi`
   - Goal: "Grace Corned Beef 340g" matches "grace corned beef"

## Multi-Word Query Support

The system tokenizes queries into individual words and tracks token coverage:

- Each query is split into normalized tokens
- Products are scored based on how many query tokens appear in the title
- Token coverage provides proportional scoring (up to 300 points max)
- Example: Query "lasco food drink" → products with all 3 tokens rank higher than those with only 1

## User Preferences (Optional, Non-Breaking)

User preferences provide small boosts that don't override strong textual matches:

- **Category preferences**: If product category is in user's preferred categories → +60 points
- **Dietary preferences**: If product matches dietary preference tags → +40 points (placeholder for future)
- **Important**: Preference boosts are small (60/40 points) compared to textual matches (1000+ points)
- **Usage**: Pass `UserPreferences` or `RankingUserPrefs` to `searchProducts()` as optional parameter

### Example Usage

```typescript
import { searchProducts } from "./lib/search-service";
import { getPreferences } from "./lib/preferences-service";

// Get user preferences
const userPrefs = await getPreferences(userId);

// Search with preferences (optional, non-breaking)
const results = await searchProducts("apple", 50, userPrefs);
```

## Sorting

Results are sorted with the following priority:

1. **Primary**: Relevance score (descending) - higher scores first
2. **Secondary**: Stock status - in-stock items first
3. **Tertiary**: Title starts with query - products starting with query first
4. **Price sorting**: Only when explicitly requested via `sortMode` parameter:
   - `"relevance"` (default) - No price tie-break
   - `"price_asc"` - Sort by price ascending
   - `"price_desc"` - Sort by price descending

### Example: Price Sorting

```typescript
// Default: relevance sorting (no price tie-break)
const results1 = await searchProducts("apple", 50);

// Explicit price sorting
const results2 = await searchProducts("apple", 50, undefined, "price_asc");
const results3 = await searchProducts("apple", 50, undefined, "price_desc");
```

## Configuration

### Adjusting Ranking Weights

To adjust ranking priorities, modify the `RANKING_WEIGHTS` constant in `lib/search/ranking.ts`:

```typescript
export const RANKING_WEIGHTS = {
  exactTitle: 1000,              // Increase to boost exact matches
  titleStartsWith: 700,          // Increase to boost starts-with matches
  titleContains: 450,            // Increase to boost contains matches
  tokenCoverageTitleMax: 300,    // Adjust token coverage weight
  brandExact: 350,               // Increase to boost brand matches
  brandStartsWith: 250,
  brandContains: 150,
  categoryExact: 200,            // Increase to boost category matches
  categoryContains: 100,
  frequentlySearched: 0,         // Placeholder for future
  preferenceCategoryBoost: 60,   // Adjust preference boost strength
  preferenceDietaryBoost: 40,
};
```

### Example: Boosting Brand Matches

If you want brand matches to rank higher than partial title matches:

```typescript
export const RANKING_WEIGHTS = {
  exactTitle: 1000,
  titleStartsWith: 700,
  titleContains: 400,            // Reduced
  tokenCoverageTitleMax: 300,
  brandExact: 500,               // Increased above titleContains
  brandStartsWith: 350,
  brandContains: 200,
  categoryExact: 200,
  categoryContains: 100,
  frequentlySearched: 0,
  preferenceCategoryBoost: 60,
  preferenceDietaryBoost: 40,
};
```

## Implementation Details

### Module Structure

- **`lib/search/ranking.ts`**: Core ranking module (no dependencies on search-service)
- **`lib/search-service.ts`**: Search service that uses ranking module
- **`lib/search/ranking.test.ts`**: Test harness with required test cases

### Key Functions

1. **`normalizeText(input: string): string`**
   - Normalizes text for comparison (lowercase, trim, remove punctuation, strip units)

2. **`tokenize(input: string): string[]`**
   - Splits query into normalized tokens

3. **`getMatchInfo(...): MatchInfo`**
   - Determines which match types apply to a product

4. **`calculateRelevanceScore(...): number`**
   - Calculates relevance score based on match info and user preferences

5. **`rankResults(...): T[]`**
   - Ranks and sorts results by relevance score

### Performance

- **Complexity**: O(n) scoring + O(n log n) sorting
- **No additional DB queries**: All ranking is done in-memory
- **Efficient**: Suitable for typical result sets (50-1000 results)

## Testing

A test harness is provided in `lib/search/ranking.test.ts` with the following test cases:

1. **Exact match beats partial**: "iPhone 15" ranks above "iPhone 15 Pro"
2. **StartsWith beats contains**: "Grace Corned Beef" ranks above "Jamaican Grace-style Sauce"
3. **Brand exact beats category**: Brand "Nike" ranks above category "Nike"
4. **Token coverage works**: Multi-word queries rank products with more tokens matched higher
5. **In-stock tie-break**: When scores are equal, in-stock items rank first
6. **Preference boost is small**: Preference boosts don't override strong textual matches
7. **Normalization strips units**: "Grace Corned Beef 340g" matches "grace corned beef"
8. **Tokenization works**: Multi-word queries are properly tokenized
9. **Price sorting only when requested**: Default sorting doesn't use price as tie-break
10. **Title startsWith tie-break**: Products starting with query rank higher in ties

### Running Tests

```bash
# Using tsx
tsx lib/search/ranking.test.ts

# Or using node with tsx loader
node --loader tsx lib/search/ranking.test.ts
```

## API Changes

### Backward Compatibility

The implementation maintains backward compatibility:

- **Default behavior unchanged**: `searchProducts(query, limit)` works as before
- **Optional parameters**: User preferences and sort mode are optional
- **Response shape**: Same `SearchResult[]` shape, with optional `relevanceScore` field for debugging

### New Function Signatures

```typescript
// Existing (still works)
searchProducts(query: string, limit?: number): Promise<SearchResult[]>

// New (with preferences)
searchProducts(
  query: string,
  limit?: number,
  userPrefs?: UserPreferences | RankingUserPrefs | null,
  sortMode?: SortMode
): Promise<SearchResult[]>
```

## Monitoring & Debugging

The `relevanceScore` field is included in `SearchResult` for debugging and monitoring:

```typescript
interface SearchResult {
  // ... other fields
  relevanceScore?: number; // Optional relevance score for debugging
}
```

You can log or display this score to understand why certain results rank higher than others.

## Future Enhancements

### Frequently Searched Products

The structure is ready for implementing search analytics:

1. Create a search analytics collection to track:
   - Product IDs
   - Search frequency
   - Search timestamps

2. Update `calculateRelevanceScore()` to check if a product is frequently searched:
   ```typescript
   if (isFrequentlySearched(product.$id)) {
     score += RANKING_WEIGHTS.frequentlySearched;
   }
   ```

### Additional Ranking Factors

Potential future enhancements:
- User search history (personalized ranking)
- Product popularity (view counts, purchase counts)
- Store proximity (if location data is available)
- Product ratings/reviews
- Recency (newer products get slight boost)
- Dietary tags on products (when added to schema)

## Files Modified

- `lib/search/ranking.ts` - New ranking module (created)
- `lib/search-service.ts` - Updated to use ranking module
- `lib/search/ranking.test.ts` - Test harness (created)
- `docs/Search_Ranking_Implementation.md` - This documentation (updated)

## Related Documentation

- `Search_Implementation_Update.md` - General search implementation details
- `lib/search/ranking.ts` - Source code with inline documentation
- `lib/search-service.ts` - Search service implementation
