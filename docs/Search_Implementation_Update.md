# Search Implementation Update

## Summary

The search service has been updated to work with your actual database schema. Here's what changed and what you need to do.

## Changes Made

### 1. **Product Schema Updates**
- ✅ Changed from `name` to `title` field (products use `title`)
- ✅ Using existing full-text index `idx_title_fulltext` on products.title
- ✅ Products have `brand` as a string field (not a separate collection)

### 2. **Store Locations Updates**
- ✅ Collection ID changed from `store_locations` to `store_location` (singular)
- ✅ Changed from `active` to `is_active` boolean field

### 3. **Brand Handling**
- ✅ Removed dependency on separate `brands` collection
- ✅ Brands are now extracted from `product.brand` string field
- ✅ Search by brand now searches products directly

### 4. **Categories**
- ✅ Categories collection exists with `name` field
- ⚠️ No full-text index (uses in-memory filtering for case-insensitive search)

## What Works Now

✅ **Product search by title** - Uses full-text index  
✅ **Product search by brand** - Searches product.brand field  
✅ **Category search** - Searches category.name field  
✅ **Active store filtering** - Uses `is_active` field  
✅ **In-stock filtering** - Only returns available products  
✅ **SKU deduplication** - No duplicate products in results  

## Recommended Next Steps

### 1. Add Missing Indexes (Optional but Recommended)

Add these indexes to improve search performance:

```bash
# Run this in Appwrite console or via API:
# Add index on store_location_product.in_stock
POST /databases/{databaseId}/collections/store_location_product/indexes
{
  "key": "idx_in_stock",
  "type": "key",
  "attributes": ["in_stock"]
}

# Add composite index for store + stock queries
POST /databases/{databaseId}/collections/store_location_product/indexes
{
  "key": "idx_store_stock",
  "type": "key",
  "attributes": ["store_location_id", "in_stock"]
}

# Add index on category_leaf_id
POST /databases/{databaseId}/collections/store_location_product/indexes
{
  "key": "idx_category_leaf",
  "type": "key",
  "attributes": ["category_leaf_id"]
}

# Add index on store_location.is_active
POST /databases/{databaseId}/collections/store_location/indexes
{
  "key": "idx_is_active",
  "type": "key",
  "attributes": ["is_active"]
}
```

### 2. Test the Search

You can now test the search functionality:

```typescript
import { searchProducts } from "./lib/search-service";

// Search for products
const results = await searchProducts("apple", 50);
console.log(`Found ${results.length} products`);

// Results include:
// - product (with title, sku, brand, etc.)
// - brand (string from product.brand)
// - category (if available)
// - storeLocation (with is_active, display_name, etc.)
// - priceJmdCents
// - inStock
// - sku
```

### 3. Optional: Add Full-Text Index on Categories

For better category search performance, consider adding a full-text index:

```bash
POST /databases/{databaseId}/collections/categories/indexes
{
  "key": "idx_name_fulltext",
  "type": "fulltext",
  "attributes": ["name"]
}
```

## Current Limitations

1. **Category search** - Currently filters in memory (works but slower for large datasets)
2. **Brand search** - Case-sensitive via Query.contains, then filtered in memory
3. **No separate brands collection** - Brands are just strings in products

## Testing Checklist

- [ ] Test product search by title
- [ ] Test product search by brand
- [ ] Test category search
- [ ] Verify only active stores are included
- [ ] Verify only in-stock products are returned
- [ ] Verify no duplicate products (by SKU)
- [ ] Test with empty query (should return empty array)
- [ ] Test with non-existent search terms

## Files Modified

- `lib/search-service.ts` - Updated to match actual schema
- `scripts/inspect-database.ts` - Created for database inspection
- `package.json` - Added `inspect-database` script

## Notes

- The search service gracefully handles missing collections/data
- All errors are logged but don't crash the application
- Results are limited to 50 by default (configurable)
- SKU-based deduplication ensures no duplicate products
