# Filter & Sort State Persistence

## Overview

This document describes the implementation of session-based state persistence for product filters and sorting in the Grovi search system. The feature ensures that user-selected filters and sort preferences persist while navigating between screens during an active app session.

## Feature Requirements

### Title
Preserve Filter & Sort State During Session

### Type
Feature

### Priority
P1 (High Priority)

### Size
S (Small)

### Area
State Management, UX

## Description

Ensures filters and sorting persist while the user navigates the app during a session. State is maintained in memory and survives navigation between screens but resets when the app is closed/restarted.

## Acceptance Criteria

✅ **Filters persist while navigating between screens**
- Filters are stored in SearchContext at the app root level
- State survives navigation between tabs and screens
- Returns to previous filter state when navigating back to search

✅ **Sorting remains unchanged during session**
- Sort mode persists during navigation
- Sort preference is maintained when filters change
- Defaults to "relevance" on fresh app launch

✅ **State resets only when explicitly cleared**
- Filters can be cleared via "Clear All" button in filter modal
- State does NOT reset automatically on search query changes
- State does NOT reset on navigation
- State resets only when app is closed/restarted (session-only persistence)

## Implementation Details

### Architecture

#### SearchContext Enhancement
**Location:** `contexts/SearchContext.tsx`

The SearchContext has been enhanced to manage filter and sort state globally:

```typescript
interface SearchContextType {
  // ... existing search functionality
  
  // Filter and Sort State (session-only persistence)
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  clearFiltersAndSort: () => void;
}
```

**State Management:**
- `filters`: Current active filters (brands, categories, price range, etc.)
- `sortMode`: Current sort mode (relevance, price_asc, price_desc, etc.)
- Context state is in-memory and persists across navigation
- State is lost when app is closed (session-only)

#### Search Screen Integration
**Location:** `app/(tabs)/search.tsx`

Updated to consume filter and sort state from SearchContext instead of local state:

**Before:**
```typescript
const [filters, setFilters] = useState<ProductFiltersType>({});
const [sortMode, setSortMode] = useState<SortMode>("relevance");
```

**After:**
```typescript
const { 
  filters, 
  setFilters, 
  sortMode, 
  setSortMode,
  clearFiltersAndSort 
} = useSearch();
```

**Key Changes:**
1. Removed local state for filters and sortMode
2. Uses SearchContext state instead
3. Filters no longer reset when search query is cleared
4. State persists across component mounts/unmounts

### Filter State Structure

```typescript
interface ProductFilters {
  brands?: string[];           // Selected brand names
  categoryIds?: string[];      // Selected category IDs
  minPrice?: number;          // Minimum price in JMD cents
  maxPrice?: number;          // Maximum price in JMD cents
  inStock?: boolean;          // Stock availability filter
  deliveryParish?: string;    // Delivery location filter
  storeLocationIds?: string[]; // Specific store filters
}
```

### Sort Mode Options

```typescript
type SortMode = 
  | "relevance"           // Default: by search relevance
  | "price_asc"          // Price: Low to High
  | "price_desc"         // Price: High to Low
  | "rating_desc"        // Customer Rating (coming soon)
  | "review_count_desc"  // Review Count (coming soon)
  | "delivery_time_asc"  // Delivery Time (coming soon)
  | "distance_asc";      // Distance (coming soon)
```

## User Experience

### Filter Persistence Flow

1. **User applies filters:**
   - Opens filter modal
   - Selects brands, categories, price range, etc.
   - Filters are saved to SearchContext
   - Search results update immediately

2. **User navigates away:**
   - Switches to another tab (e.g., Home, Categories, Account)
   - Filter state remains in SearchContext
   - No data is lost

3. **User returns to search:**
   - Search screen remounts
   - Reads filter state from SearchContext
   - Filters are still applied
   - Results reflect the persisted filters

4. **User explicitly clears filters:**
   - Taps "Clear All" in filter modal
   - Filters reset to empty state
   - Search results update to show unfiltered results

### Sort Persistence Flow

1. **User selects sort mode:**
   - Opens sort picker modal
   - Selects sort option (e.g., Price: Low to High)
   - Sort mode saved to SearchContext
   - Results re-sorted immediately

2. **User applies filters:**
   - Opens filter modal and applies filters
   - Sort mode is maintained
   - Results are filtered AND sorted

3. **User navigates and returns:**
   - Sort preference persists
   - Results appear in the same sort order

### Explicit Clear Actions

**Clear Filters:**
- Button: "Clear All" in filter modal header
- Action: Resets all filters to empty state
- Effect: Sort mode is maintained

**Clear Sort:**
- Action: User can select "Relevance" to reset to default
- Effect: Filters are maintained

**Clear Both:**
- Function: `clearFiltersAndSort()` available in SearchContext
- Can be called programmatically if needed
- Effect: Resets both filters and sort to defaults

## Persistence Strategy

### Session-Only Persistence
The implementation uses **in-memory state** via React Context:

**Advantages:**
- ✅ Persists across navigation within app session
- ✅ Simple implementation (no AsyncStorage needed)
- ✅ No storage management or cleanup required
- ✅ Fast state access (no async reads)
- ✅ Privacy-friendly (state not persisted to disk)

**Characteristics:**
- State lives in SearchContext Provider (app root)
- Survives component mounts/unmounts
- Survives navigation between screens
- Resets when app is closed/killed
- Resets when app is restarted

**Why Not AsyncStorage:**
- Session-only persistence is more appropriate for search filters
- Users typically don't want yesterday's filters applied today
- Reduces storage usage and complexity
- Better privacy (filters not persisted to disk)
- Cleaner UX (fresh start each session)

## Testing Checklist

### ✅ Filter Persistence
- [x] Apply brand filter, navigate to Home tab, return → filters still applied
- [x] Apply category filter, navigate to Account tab, return → filters still applied
- [x] Apply price range, navigate away, return → price range maintained
- [x] Apply multiple filters, navigate away, return → all filters maintained
- [x] Clear filters via "Clear All" → all filters reset
- [x] Apply filters, clear search query → filters NOT reset

### ✅ Sort Persistence
- [x] Select "Price: Low to High", navigate away, return → sort maintained
- [x] Select sort mode, apply filters → sort mode maintained
- [x] Apply filters, change sort mode → filters maintained
- [x] Navigate between tabs → sort mode maintained

### ✅ Combined Filter & Sort
- [x] Apply filters + sort, navigate away → both maintained
- [x] Clear filters → sort mode maintained
- [x] Change sort → filters maintained
- [x] Search new query → filters and sort maintained

### ✅ Session Reset
- [x] Close and reopen app → filters reset to default
- [x] Close and reopen app → sort mode reset to "relevance"
- [x] Force quit app → state resets on next launch

## State Flow Diagram

```
App Launch
    ↓
SearchContext Initialized
    ↓
Default State: { filters: {}, sortMode: "relevance" }
    ↓
User Applies Filters/Sort
    ↓
State Updated in Context
    ↓
┌─────────────────────────────────┐
│  User Navigates Away            │
│  ↓                              │
│  State Preserved in Context     │
│  ↓                              │
│  User Navigates Back            │
│  ↓                              │
│  State Read from Context        │
│  ↓                              │
│  Filters & Sort Still Applied   │
└─────────────────────────────────┘
    ↓
User Explicitly Clears
    ↓
State Reset in Context
    ↓
App Closed
    ↓
State Cleared from Memory
```

## API Reference

### SearchContext API

```typescript
// Get context
const { 
  filters, 
  setFilters, 
  sortMode, 
  setSortMode,
  clearFiltersAndSort 
} = useSearch();

// Update filters
setFilters({
  brands: ["Grace", "Nestlé"],
  minPrice: 10000, // $100 JMD
  maxPrice: 50000, // $500 JMD
});

// Update sort mode
setSortMode("price_asc");

// Clear both
clearFiltersAndSort();
```

### Component Integration

```typescript
// In Search Screen
const { filters, setFilters, sortMode, setSortMode } = useSearch();

// Pass to filter component
<ProductFilters
  filters={filters}
  onFiltersChange={setFilters}
  visible={showFilters}
  onClose={() => setShowFilters(false)}
/>

// Pass to sort component
<SortPicker 
  currentSort={sortMode} 
  onSortChange={setSortMode} 
/>

// Use in search
const results = await searchProducts(
  query, 
  50, 
  undefined, 
  sortMode,    // From context
  userId, 
  filters      // From context
);
```

## Benefits

### User Experience
1. **Consistency:** Filters and sort remain consistent across navigation
2. **Convenience:** Users don't lose their preferences when switching tabs
3. **Efficiency:** No need to re-apply filters after returning to search
4. **Control:** Explicit clear actions give users full control

### Developer Experience
1. **Centralized State:** Single source of truth in SearchContext
2. **Simple Implementation:** No complex storage management
3. **Type Safety:** Full TypeScript support
4. **Maintainability:** Clear separation of concerns

### Performance
1. **Fast:** In-memory state access is instant
2. **Lightweight:** No disk I/O for state reads/writes
3. **Scalable:** No storage quota concerns

## Limitations

### Current Limitations
1. **No Cross-Session Persistence:** State resets when app closes
2. **No User Preferences:** No "remember my filters" option
3. **No Cloud Sync:** State is local to device session

### Future Enhancements

If cross-session persistence is needed later:

1. **AsyncStorage Integration:**
   ```typescript
   // Save to AsyncStorage on state change
   useEffect(() => {
     AsyncStorage.setItem('search_filters', JSON.stringify(filters));
   }, [filters]);
   
   // Load on mount
   useEffect(() => {
     const loadFilters = async () => {
       const saved = await AsyncStorage.getItem('search_filters');
       if (saved) setFilters(JSON.parse(saved));
     };
     loadFilters();
   }, []);
   ```

2. **User Preferences:**
   - Add "Remember my filters" toggle
   - Save to user profile in backend
   - Sync across devices

3. **Smart Defaults:**
   - Learn from user behavior
   - Apply frequently-used filters automatically
   - Suggest relevant sort modes

## Related Documentation

- [Product Sorting Implementation](./Product_Sorting_Implementation.md)
- [Search Implementation Update](./Search_Implementation_Update.md)
- [Search Ranking Implementation](./Search_Ranking_Implementation.md)

## Key Files

- `contexts/SearchContext.tsx` - State management
- `app/(tabs)/search.tsx` - Search screen integration
- `components/ProductFilters.tsx` - Filter UI
- `components/SortPicker.tsx` - Sort UI
- `lib/search-service.ts` - Search service with filters

## Support

For questions or issues related to filter/sort persistence:
1. Check this documentation
2. Review SearchContext implementation
3. Test navigation flows
4. Verify state updates in React DevTools

---

**Status:** ✅ Complete  
**Last Updated:** January 20, 2026  
**Implementation Date:** January 20, 2026  
**Priority:** P1  
**Size:** S  
**Area:** State Management, UX
