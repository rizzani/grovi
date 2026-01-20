# Pagination API Guide

## Overview

The Grovi search service now supports pagination for handling large result sets efficiently. This guide explains how to use the pagination API with filters and sorting.

## API Reference

### searchProductsPaginated()

Paginated version of the search function that returns results in pages.

**Function Signature:**
```typescript
function searchProductsPaginated(
  query: string,
  pagination?: PaginationOptions,
  userPrefs?: UserPreferences | RankingUserPrefs | null,
  sortMode?: SortMode,
  userId?: string | null,
  filters?: ProductFilters
): Promise<PaginatedSearchResults>
```

### Types

**PaginationOptions:**
```typescript
interface PaginationOptions {
  /** Page number (1-based, default: 1) */
  page?: number;
  
  /** Number of items per page (default: 50) */
  pageSize?: number;
  
  /** Offset for cursor-based pagination (alternative to page) */
  offset?: number;
}
```

**PaginatedSearchResults:**
```typescript
interface PaginatedSearchResults {
  /** Current page of search results */
  results: SearchResult[];
  
  /** Total number of results (before pagination) */
  totalResults: number;
  
  /** Current page number (1-based) */
  currentPage: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Whether there are more results available */
  hasMore: boolean;
}
```

## Usage Examples

### Basic Pagination

**Get first page:**
```typescript
const page1 = await searchProductsPaginated(
  "grace corned beef",
  { page: 1, pageSize: 50 }
);

console.log(page1.results);        // Array of 50 SearchResult items
console.log(page1.totalResults);   // e.g., 1523
console.log(page1.currentPage);    // 1
console.log(page1.totalPages);     // 31
console.log(page1.hasMore);        // true
```

**Get next page:**
```typescript
const page2 = await searchProductsPaginated(
  "grace corned beef",
  { page: 2, pageSize: 50 }
);
```

### Pagination with Filters

**Filter by brand and stock, paginated:**
```typescript
const results = await searchProductsPaginated(
  "corned beef",
  { page: 1, pageSize: 20 },
  null,
  "relevance",
  userId,
  {
    brands: ["Grace", "Nestlé"],
    inStock: true,
    minPrice: 10000,  // $100 JMD
    maxPrice: 50000   // $500 JMD
  }
);
```

### Pagination with Sorting

**Get page 3, sorted by price (low to high):**
```typescript
const results = await searchProductsPaginated(
  "milk",
  { page: 3, pageSize: 30 },
  userPrefs,
  "price_asc",  // Sort by price ascending
  userId
);
```

**Sort by price (high to low):**
```typescript
const results = await searchProductsPaginated(
  "milk",
  { page: 1, pageSize: 25 },
  userPrefs,
  "price_desc",  // Sort by price descending
  userId
);
```

### Offset-Based Pagination

**Alternative to page-based (useful for infinite scroll):**
```typescript
// Get first 50 items
const batch1 = await searchProductsPaginated(
  "beverages",
  { offset: 0, pageSize: 50 }
);

// Get next 50 items
const batch2 = await searchProductsPaginated(
  "beverages",
  { offset: 50, pageSize: 50 }
);

// Get next 50 items
const batch3 = await searchProductsPaginated(
  "beverages",
  { offset: 100, pageSize: 50 }
);
```

### Combined: Filters + Sorting + Pagination

**Complete example:**
```typescript
const results = await searchProductsPaginated(
  "juice",
  { page: 2, pageSize: 25 },                    // Page 2, 25 items per page
  { preferredCategories: ["beverages"] },       // User preferences
  "price_asc",                                   // Sort by price
  userId,                                        // User ID for analytics
  {
    brands: ["Grace", "Jamaica Producers"],      // Filter by brands
    inStock: true,                               // Only in-stock items
    minPrice: 5000,                              // Min $50 JMD
    maxPrice: 30000,                             // Max $300 JMD
    categoryIds: ["cat_beverages"],              // Filter by category
    deliveryParish: "Kingston"                   // Filter by delivery location
  }
);

// Use the results
console.log(`Showing ${results.results.length} of ${results.totalResults} results`);
console.log(`Page ${results.currentPage} of ${results.totalPages}`);

if (results.hasMore) {
  console.log("More results available");
}
```

## React/React Native Integration

### Using in a Search Component

```typescript
import { useState, useEffect } from 'react';
import { searchProductsPaginated, PaginatedSearchResults } from '@/lib/search-service';

function SearchResults({ query, filters, sortMode }) {
  const [results, setResults] = useState<PaginatedSearchResults | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        const data = await searchProductsPaginated(
          query,
          { page: currentPage, pageSize: 50 },
          null,
          sortMode,
          userId,
          filters
        );
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }

    if (query) {
      search();
    }
  }, [query, currentPage, filters, sortMode]);

  if (loading) return <Loading />;
  if (!results) return null;

  return (
    <View>
      <Text>
        Showing {results.results.length} of {results.totalResults} results
      </Text>
      
      <FlatList
        data={results.results}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.product.$id}
      />
      
      <Pagination
        currentPage={results.currentPage}
        totalPages={results.totalPages}
        onPageChange={setCurrentPage}
        hasMore={results.hasMore}
      />
    </View>
  );
}
```

### Infinite Scroll Implementation

```typescript
import { useState } from 'react';
import { FlatList } from 'react-native';
import { searchProductsPaginated, SearchResult } from '@/lib/search-service';

function InfiniteScrollSearch({ query, filters, sortMode }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const data = await searchProductsPaginated(
        query,
        { offset, pageSize: 50 },
        null,
        sortMode,
        userId,
        filters
      );
      
      setResults(prev => [...prev, ...data.results]);
      setOffset(prev => prev + 50);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={results}
      renderItem={({ item }) => <ProductCard product={item} />}
      keyExtractor={(item) => item.product.$id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <LoadingSpinner /> : null}
    />
  );
}
```

## Performance Characteristics

**Dataset Size vs. Performance:**

| Dataset Size | Page Load Time | Memory Usage |
|--------------|----------------|--------------|
| < 100 results | ~25ms | ~0.04 MB |
| < 1,000 results | ~50ms | ~0.36 MB |
| < 10,000 results | ~200ms | ~3.58 MB |

**Recommendations:**
- Use `pageSize: 20-50` for mobile devices (better performance)
- Use `pageSize: 50-100` for web/desktop
- For very large datasets (> 10K results), consider smaller page sizes

## Best Practices

### 1. Choose the Right Pagination Method

**Page-based pagination:**
- Best for traditional "page 1, 2, 3" navigation
- Good for search results with finite pages
- Users can jump to specific pages

**Offset-based pagination:**
- Best for infinite scroll
- Good for mobile apps
- Better for continuous content loading

### 2. Optimize Page Size

**Mobile apps:**
```typescript
const results = await searchProductsPaginated(
  query,
  { page: 1, pageSize: 20 }  // Smaller pages for mobile
);
```

**Desktop/Web:**
```typescript
const results = await searchProductsPaginated(
  query,
  { page: 1, pageSize: 50 }  // Larger pages for desktop
);
```

### 3. Reset Pagination on Filter/Sort Changes

```typescript
// When filters or sort change, reset to page 1
useEffect(() => {
  setCurrentPage(1);
  setOffset(0);
}, [filters, sortMode]);
```

### 4. Show Pagination Metadata

```typescript
function PaginationInfo({ results }: { results: PaginatedSearchResults }) {
  return (
    <Text>
      Showing {((results.currentPage - 1) * results.pageSize) + 1} - {Math.min(results.currentPage * results.pageSize, results.totalResults)} of {results.totalResults} results
    </Text>
  );
}
```

### 5. Handle Empty Results

```typescript
const results = await searchProductsPaginated(query, { page: 1 });

if (results.totalResults === 0) {
  return <NoResults query={query} />;
}
```

## Migration from Old API

### Before (Non-Paginated):
```typescript
const results = await searchProducts(
  "grace corned beef",
  50,  // limit
  userPrefs,
  "price_asc",
  userId,
  filters
);

// Returns: SearchResult[]
```

### After (Paginated):
```typescript
const paginatedResults = await searchProductsPaginated(
  "grace corned beef",
  { page: 1, pageSize: 50 },
  userPrefs,
  "price_asc",
  userId,
  filters
);

// Returns: PaginatedSearchResults
const results = paginatedResults.results;  // Get actual results array
```

**Note:** The old `searchProducts()` function still works and is not deprecated. Use it when you don't need pagination.

## Common Use Cases

### Use Case 1: Product Listing Page

```typescript
function ProductListingPage() {
  const [page, setPage] = useState(1);
  
  const { data } = usePaginatedSearch(
    query,
    { page, pageSize: 24 },  // 24 items = 4 rows × 6 columns
    filters,
    sortMode
  );
  
  return (
    <Grid>
      {data?.results.map(item => <ProductCard key={item.product.$id} {...item} />)}
      
      <PageNavigation
        current={page}
        total={data?.totalPages}
        onChange={setPage}
      />
    </Grid>
  );
}
```

### Use Case 2: Mobile Search Results

```typescript
function MobileSearchResults() {
  const [offset, setOffset] = useState(0);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  
  const loadMore = async () => {
    const data = await searchProductsPaginated(
      query,
      { offset, pageSize: 20 },  // Load 20 at a time
      null,
      sortMode,
      userId,
      filters
    );
    
    setAllResults(prev => [...prev, ...data.results]);
    setOffset(prev => prev + 20);
  };
  
  return (
    <FlatList
      data={allResults}
      onEndReached={loadMore}
      renderItem={({ item }) => <ProductItem {...item} />}
    />
  );
}
```

### Use Case 3: Search with Filters and Sorting

```typescript
function AdvancedSearch() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  
  useEffect(() => {
    setPage(1);  // Reset to page 1 when filters/sort change
  }, [filters, sortMode]);
  
  const { data } = usePaginatedSearch(
    query,
    { page, pageSize: 50 },
    filters,
    sortMode
  );
  
  return (
    <View>
      <FilterPanel filters={filters} onChange={setFilters} />
      <SortSelector value={sortMode} onChange={setSortMode} />
      <ProductGrid results={data?.results} />
      <Pagination {...data} onPageChange={setPage} />
    </View>
  );
}
```

## Troubleshooting

### Issue: Pagination resets when it shouldn't

**Solution:** Make sure pagination state is separate from filter/sort state
```typescript
// ❌ Bad: Sharing state
const [page, setPage] = useState(1);

// ✅ Good: Reset only when needed
useEffect(() => {
  setPage(1);
}, [filters, sortMode]);  // Reset only on filter/sort change
```

### Issue: Results not updating when changing pages

**Solution:** Include page number in dependency array
```typescript
useEffect(() => {
  fetchResults();
}, [query, page, filters, sortMode]);  // Include 'page'
```

### Issue: Slow pagination for large datasets

**Solution:** Reduce page size or implement virtual scrolling
```typescript
// Instead of pageSize: 100
const results = await searchProductsPaginated(
  query,
  { page, pageSize: 50 }  // Smaller pages = faster
);
```

## Related Documentation

- [Performance Optimization Implementation](./Performance_Optimization_Implementation.md)
- [Product Sorting Implementation](./Product_Sorting_Implementation.md)
- [Filter & Sort State Persistence](./Filter_Sort_State_Persistence.md)

---

**Last Updated:** January 20, 2026  
**API Version:** 2.0
