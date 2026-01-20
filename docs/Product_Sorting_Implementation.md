# Product Sorting Implementation

## Overview

This document describes the implementation of product sorting functionality in the Grovi search system. The sorting feature allows users to organize search results by various criteria including price, rating, review count, delivery time, and distance.

## Features Implemented

### Available Sort Options

1. **Relevance** ✅ (Default)
   - Sorts by search relevance score
   - Uses fuzzy matching and Jamaican term normalization
   - Prioritizes exact matches, then partial matches
   - In-stock items prioritized within each relevance tier

2. **Price: Low to High** ✅
   - Sorts by price ascending
   - In-stock items appear before out-of-stock items
   - Uses `priceJmdCents` field from `store_location_product`

3. **Price: High to Low** ✅
   - Sorts by price descending
   - In-stock items appear before out-of-stock items
   - Uses `priceJmdCents` field from `store_location_product`

4. **Customer Rating** 🚧 (Coming Soon)
   - Sorts by average customer rating (highest first)
   - Requires `rating` field on `products` collection
   - Tie-breaker: review count (more reviews = more reliable)

5. **Review Count** 🚧 (Coming Soon)
   - Sorts by number of reviews (most reviewed first)
   - Requires `review_count` field on `products` collection
   - Tie-breaker: rating (higher rated first)

6. **Delivery Time** 🚧 (Coming Soon)
   - Sorts by estimated delivery time (fastest first)
   - Requires `delivery_time_minutes` field on `store_location` collection
   - Only sorts in-stock items (out of stock goes to end)

7. **Distance** 🚧 (Coming Soon)
   - Sorts by distance from delivery location (nearest first)
   - Requires `latitude` and `longitude` fields on `store_location` collection
   - Requires delivery address coordinates
   - Uses Haversine formula for distance calculation

## Architecture

### Type Definitions

#### SortMode Type
```typescript
export type SortMode = 
  | "relevance" 
  | "price_asc" 
  | "price_desc"
  | "rating_desc"
  | "review_count_desc"
  | "delivery_time_asc"
  | "distance_asc";
```

#### Extended Product Interface
```typescript
export interface Product {
  // ... existing fields
  rating?: number; // Optional: average customer rating (0-5)
  review_count?: number; // Optional: number of reviews
}
```

#### Extended StoreLocation Interface
```typescript
export interface StoreLocation {
  // ... existing fields
  delivery_time_minutes?: number; // Optional: estimated delivery time
  latitude?: number; // Optional: store latitude
  longitude?: number; // Optional: store longitude
}
```

### Components

#### 1. SortPicker Component
**Location:** `components/SortPicker.tsx`

A modal-based UI component for selecting sort mode:
- Displays all available sort options
- Shows "Coming Soon" badge for unavailable options
- Visual indicators for selected option
- Icon-based interface for better UX

**Props:**
- `currentSort: SortMode` - Currently selected sort mode
- `onSortChange: (sortMode: SortMode) => void` - Callback when sort mode changes

**Features:**
- Disabled state for unavailable options
- Clear visual feedback for selected option
- Descriptive text for each sort option
- Smooth modal animations

#### 2. Search Screen Integration
**Location:** `app/(tabs)/search.tsx`

Updated to include sorting functionality:
- Sort picker integrated into results view
- Sort mode persists during search refinement
- Automatic re-search when sort mode changes
- Combined sort and filter indicator

**State Management:**
```typescript
const [sortMode, setSortMode] = useState<SortMode>("relevance");
```

**Search Integration:**
```typescript
const handleSearch = async (
  query: string, 
  currentFilters?: ProductFiltersType, 
  currentSortMode?: SortMode
) => {
  const sortModeToUse = currentSortMode || sortMode;
  const results = await searchProducts(
    query, 
    50, 
    undefined, 
    sortModeToUse, 
    userId || null, 
    filtersToUse
  );
};
```

### Backend Logic

#### Ranking Module
**Location:** `lib/search/ranking.ts`

The `rankResults` function handles all sorting logic:

1. **Relevance Sorting:**
   - Calculates match scores based on query
   - Prioritizes exact matches > partial matches > fuzzy matches
   - Secondary sort by stock status
   - Tertiary sort by title length (shorter = more specific)

2. **Price Sorting:**
   - In-stock items prioritized
   - Sorts by `priceJmdCents` field
   - Ascending or descending based on mode

3. **Rating Sorting:**
   - Sorts by `product.rating` (when available)
   - Tie-breaker: `product.review_count`
   - Final tie-breaker: stock status

4. **Review Count Sorting:**
   - Sorts by `product.review_count` (when available)
   - Tie-breaker: `product.rating`
   - Final tie-breaker: stock status

5. **Delivery Time Sorting:**
   - Only in-stock items sorted by delivery time
   - Uses `storeLocation.delivery_time_minutes` (when available)
   - Out-of-stock items appear at end
   - Tie-breaker: price (lower first)

6. **Distance Sorting:**
   - Only in-stock items sorted by distance
   - Calculates distance using Haversine formula
   - Requires both store and delivery coordinates
   - Out-of-stock items appear at end
   - Tie-breaker: price (lower first)

#### Distance Calculation
```typescript
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  // Haversine formula implementation
  // Returns distance in kilometers
}
```

## User Experience

### Sort Button
- Located in search results header
- Shows current sort mode with icon
- Opens modal on tap
- Compact design to save space

### Sort Modal
- Full-screen modal with all options
- Clear visual hierarchy
- Selected option highlighted in green
- Disabled options shown with "Coming Soon" badge
- Each option includes:
  - Icon representation
  - Clear label
  - Descriptive text
  - Visual state indicator

### Behavior
1. **Default:** Results sorted by relevance
2. **User selects sort:** Modal opens
3. **User taps option:** 
   - Modal closes
   - Results re-fetch with new sort
   - Sort button updates to show selection
4. **Sort persists:** Maintained during filter changes

## Implementation Status

### ✅ Completed
- [x] SortMode type definition with all options
- [x] Extended Product and StoreLocation interfaces
- [x] Updated ranking logic with all sort modes
- [x] Distance calculation (Haversine formula)
- [x] SortPicker UI component
- [x] Search screen integration
- [x] Graceful fallbacks for unavailable data
- [x] "Coming Soon" badges for future features
- [x] Documentation

### 🚧 Pending (Future Work)

#### Database Schema Updates Required:

1. **Products Collection:**
   ```typescript
   - rating: float (0-5) // Average customer rating
   - review_count: integer // Number of reviews
   ```

2. **Store Location Collection:**
   ```typescript
   - delivery_time_minutes: integer // Estimated delivery time
   - latitude: float // Store latitude coordinate
   - longitude: float // Store longitude coordinate
   ```

#### Feature Enablement Steps:

1. **For Rating/Review Sorting:**
   - Add `rating` and `review_count` fields to products collection
   - Populate data from review system
   - Update `available: true` in SortPicker for these options

2. **For Delivery Time Sorting:**
   - Add `delivery_time_minutes` to store_location collection
   - Calculate/estimate delivery times per store
   - Update `available: true` in SortPicker

3. **For Distance Sorting:**
   - Add `latitude` and `longitude` to store_location collection
   - Geocode all store addresses
   - Geocode user delivery addresses
   - Pass delivery coordinates to search results
   - Update `available: true` in SortPicker

## API Changes

### searchProducts Function
**Signature:**
```typescript
export async function searchProducts(
  query: string,
  limit: number = 50,
  userPrefs?: UserPreferences | RankingUserPrefs | null,
  sortMode: SortMode = "relevance",
  userId?: string | null,
  filters?: ProductFilters
): Promise<SearchResult[]>
```

**Changes:**
- `sortMode` parameter passed through to `rankResults`
- Default remains "relevance" for backward compatibility

### rankResults Function
**Extended Type:**
```typescript
export function rankResults<T extends {
  product: RankingProduct & {
    rating?: number;
    review_count?: number;
  };
  storeLocation?: {
    delivery_time_minutes?: number;
    latitude?: number;
    longitude?: number;
  };
  deliveryAddress?: {
    latitude?: number;
    longitude?: number;
  };
  // ... other fields
}>(
  results: T[],
  query: string,
  userPrefs?: RankingUserPrefs,
  sortMode: SortMode = "relevance"
): T[]
```

## Testing

### Manual Testing Checklist

#### Price Sorting ✅
- [ ] Sort by price ascending shows lowest price first
- [ ] Sort by price descending shows highest price first
- [ ] In-stock items appear before out-of-stock
- [ ] Prices are correctly displayed

#### Relevance Sorting ✅
- [ ] Default sort is by relevance
- [ ] Exact matches appear first
- [ ] Partial matches appear after exact
- [ ] Fuzzy matches work for typos
- [ ] In-stock items prioritized

#### UI/UX ✅
- [ ] Sort button displays current mode
- [ ] Modal opens and closes smoothly
- [ ] Selected option is highlighted
- [ ] Disabled options show "Coming Soon" badge
- [ ] Sort persists during filter changes
- [ ] Results update immediately on sort change

#### Filter Integration ✅
- [ ] Sorting works with active filters
- [ ] Changing filters maintains sort mode
- [ ] Changing sort maintains active filters
- [ ] Clear filters doesn't reset sort

### Future Testing (When Data Available)

#### Rating Sorting 🚧
- [ ] Highest rated products appear first
- [ ] Products with same rating sorted by review count
- [ ] Products without ratings appear last

#### Review Count Sorting 🚧
- [ ] Most reviewed products appear first
- [ ] Products with same review count sorted by rating
- [ ] Products without reviews appear last

#### Delivery Time Sorting 🚧
- [ ] Fastest delivery appears first
- [ ] Out-of-stock items appear last
- [ ] Same delivery time sorted by price

#### Distance Sorting 🚧
- [ ] Nearest stores appear first
- [ ] Distance calculation is accurate
- [ ] Out-of-stock items appear last
- [ ] Requires valid delivery address

## Performance Considerations

### Current Implementation
- Sorting happens in-memory after fetching results
- Distance calculation is O(n) where n = number of results
- All sort operations are efficient for typical result sets (< 100 items)

### Optimization Opportunities
1. **Database-level sorting:** For price, rating, review_count
   - Consider adding ORDER BY to Appwrite queries
   - Reduces client-side processing
   - More efficient for large result sets

2. **Distance pre-calculation:** For distance-based sorting
   - Calculate distances server-side if possible
   - Cache frequently accessed store-to-location distances

3. **Result limiting:** 
   - Current limit: 50 results
   - Consider pagination for larger result sets

## Backward Compatibility

### Preserved Behavior
- Default sort mode remains "relevance"
- Existing search API calls work without changes
- No breaking changes to existing interfaces

### Migration Path
- Optional fields marked with `?` operator
- Graceful fallbacks for missing data
- UI clearly indicates unavailable features

## Error Handling

### Missing Data Scenarios

1. **Missing rating data:**
   - Defaults to 0 for sorting
   - Products without ratings appear last

2. **Missing delivery time:**
   - Defaults to `Number.MAX_SAFE_INTEGER`
   - Stores without data appear last

3. **Missing coordinates:**
   - Defaults to `Number.MAX_SAFE_INTEGER`
   - Cannot calculate distance without coordinates
   - Items without coordinates appear last

### UI Error States
- Disabled options prevent user confusion
- "Coming Soon" badges set expectations
- No errors thrown for unavailable features

## Configuration

### Enabling/Disabling Sort Options

Update `SORT_OPTIONS` in `components/SortPicker.tsx`:

```typescript
const SORT_OPTIONS: SortOption[] = [
  {
    value: "rating_desc",
    label: "Customer Rating",
    icon: "star-half",
    description: "Highest rated first",
    available: true, // Set to true when data is available
  },
  // ... other options
];
```

### Default Sort Mode

Update in `app/(tabs)/search.tsx`:

```typescript
const [sortMode, setSortMode] = useState<SortMode>("relevance");
// Change "relevance" to any other SortMode value
```

## Future Enhancements

### Potential Additions
1. **Multi-level sorting:** 
   - Primary + secondary sort (e.g., rating then price)
   
2. **Custom sort preferences:**
   - Remember user's preferred sort mode
   - Per-category default sorts

3. **Smart sorting:**
   - AI-based personalized sorting
   - Learn from user behavior

4. **Sort combinations:**
   - "Best value" (rating × price)
   - "Popular nearby" (reviews × distance)

## References

### Related Documentation
- [Search Implementation Update](./Search_Implementation_Update.md)
- [Search Ranking Implementation](./Search_Ranking_Implementation.md)
- [Jamaican Naming Typo Tolerance](./Jamaican_Naming_Typo_Tolerance.md)

### Key Files
- `lib/search/ranking.ts` - Core sorting logic
- `lib/search-service.ts` - Search service integration
- `components/SortPicker.tsx` - Sort UI component
- `app/(tabs)/search.tsx` - Search screen with sorting

## Support

For questions or issues related to product sorting:
1. Check this documentation
2. Review code comments in `ranking.ts`
3. Test with sample data
4. Verify schema requirements for advanced features

---

**Last Updated:** January 20, 2026  
**Status:** Feature Complete (Phase 1 - Price Sorting)  
**Next Phase:** Rating & Review Count Sorting (pending database updates)
