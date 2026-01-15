import { Query } from "appwrite";
import { databases, databaseId } from "./appwrite-client";
import { SearchSuggestion } from "../components/SearchBar";

/**
 * Core Search Backend Service
 * 
 * This service implements global product search across all active stores.
 * 
 * Requirements (based on actual database schema):
 * - products collection with 'title' field (full-text index exists: idx_title_fulltext)
 * - products collection with 'brand' string field (no separate brands collection)
 * - categories collection with 'name' field
 * - store_location collection with 'is_active' boolean field
 * - store_location_product collection (already exists)
 * 
 * Indexes:
 * - Full-text index on products.title (idx_title_fulltext) ✓
 * - Indexes on store_location_product: in_stock (recommended), store_location_id, brand_id, category_leaf_id
 */

// Collection IDs (matching actual database schema)
const STORE_LOCATION_PRODUCT_COLLECTION_ID = "store_location_product";
const PRODUCTS_COLLECTION_ID = "products";
const CATEGORIES_COLLECTION_ID = "categories";
const STORE_LOCATIONS_COLLECTION_ID = "store_location"; // Note: singular, not plural

// Type definitions (matching actual database schema)
export interface Product {
  $id: string;
  title: string; // Products use 'title' not 'name'
  sku: string;
  brand?: string; // Brand is a string field, not a reference
  description?: string;
  primary_image_url?: string;
  category_leaf_id: string;
  category_path_ids: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  name: string; // Brand is just a string in products, not a separate collection
}

export interface Category {
  $id: string;
  name: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreLocation {
  $id: string;
  name: string;
  display_name: string;
  is_active: boolean; // Uses 'is_active' not 'active'
  brand_id: string;
  slug: string;
  parish?: string;
  address_line1?: string;
  address_line2?: string;
  phone?: string;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreLocationProduct {
  $id: string;
  product_id: string;
  store_location_id: string;
  brand_id: string;
  category_leaf_id?: string;
  category_path_ids?: string[];
  in_stock: boolean;
  price_jmd_cents: number;
  source_key?: string;
  external_id?: string;
  external_url?: string;
  price_currency?: string;
  content_hash?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  product: Product;
  brand: string; // Brand is just a string from product.brand
  category?: Category;
  storeLocation: StoreLocation;
  priceJmdCents: number;
  inStock: boolean;
  sku: string;
}

/**
 * Get search suggestions based on query from Appwrite
 * Fetches real suggestions from products, categories, and brands
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const suggestions: SearchSuggestion[] = [];

  try {
    // Fetch product suggestions (by title)
    try {
      const productsResponse = await databases.listDocuments(
        databaseId,
        PRODUCTS_COLLECTION_ID,
        [
          Query.search("title", normalizedQuery),
          Query.limit(Math.ceil(limit * 0.6)), // 60% products
        ]
      );

      productsResponse.documents.forEach((doc: any) => {
        suggestions.push({
          id: doc.$id,
          text: doc.title,
          type: "product",
        });
      });
    } catch (error: any) {
      console.warn("Error fetching product suggestions:", error.message);
    }

    // Fetch category suggestions (by name)
    try {
      const categoriesResponse = await databases.listDocuments(
        databaseId,
        CATEGORIES_COLLECTION_ID,
        [
          Query.limit(100), // Get all to filter in memory
        ]
      );

      const matchingCategories = categoriesResponse.documents
        .filter((doc: any) =>
          doc.name && doc.name.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, Math.ceil(limit * 0.3)); // 30% categories

      matchingCategories.forEach((doc: any) => {
        suggestions.push({
          id: doc.$id,
          text: doc.name,
          type: "category",
        });
      });
    } catch (error: any) {
      console.warn("Error fetching category suggestions:", error.message);
    }

    // Fetch brand suggestions (from products)
    try {
      const productsForBrands = await databases.listDocuments(
        databaseId,
        PRODUCTS_COLLECTION_ID,
        [
          Query.contains("brand", normalizedQuery),
          Query.limit(50), // Get more to extract unique brands
        ]
      );

      const brandSet = new Set<string>();
      productsForBrands.documents.forEach((doc: any) => {
        if (doc.brand && doc.brand.toLowerCase().includes(normalizedQuery)) {
          brandSet.add(doc.brand);
        }
      });

      const brandSuggestions = Array.from(brandSet)
        .slice(0, Math.ceil(limit * 0.1)) // 10% brands
        .map((brand, index) => ({
          id: `brand_${index}_${brand}`,
          text: brand,
          type: "product" as const, // Brands are shown as product type
        }));

      suggestions.push(...brandSuggestions);
    } catch (error: any) {
      console.warn("Error fetching brand suggestions:", error.message);
    }

    // Sort by relevance (exact matches first, then partial matches)
    const sorted = suggestions.sort((a, b) => {
      const aText = a.text.toLowerCase();
      const bText = b.text.toLowerCase();

      const aStartsWith = aText.startsWith(normalizedQuery);
      const bStartsWith = bText.startsWith(normalizedQuery);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // If both start with query, prefer shorter matches
      if (aStartsWith && bStartsWith) {
        return aText.length - bText.length;
      }

      return aText.localeCompare(bText);
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = new Map<string, SearchSuggestion>();
    for (const suggestion of sorted) {
      const key = suggestion.text.toLowerCase();
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, suggestion);
        if (uniqueSuggestions.size >= limit) break;
      }
    }

    return Array.from(uniqueSuggestions.values());
  } catch (error: any) {
    console.error("Error fetching search suggestions:", error);
    return [];
  }
}

/**
 * Get all active store location IDs
 * 
 * First tries to fetch from store_location collection.
 * If that fails (permissions issue), falls back to getting distinct
 * store_location_ids from store_location_product collection.
 */
async function getActiveStoreLocationIds(): Promise<string[]> {
  // Try to fetch from store_location collection first
  try {
    const response = await databases.listDocuments(
      databaseId,
      STORE_LOCATIONS_COLLECTION_ID,
      [
        Query.equal("is_active", true), // Uses 'is_active' not 'active'
        Query.limit(1000), // Adjust limit as needed
      ]
    );

    return response.documents.map((doc: any) => doc.$id);
  } catch (error: any) {
    // Log the error with full details so you know what happened
    console.error("❌ ERROR: Cannot access store_location collection:", {
      error: error.message,
      code: error.code,
      type: error.type,
      collection: STORE_LOCATIONS_COLLECTION_ID,
      reason: "This is likely a permissions issue. The collection may not allow read access for the current user.",
      action: "Falling back to extracting store IDs from store_location_product collection",
    });
    
    // If we can't access store_location collection (permissions issue),
    // fall back to getting store locations from store_location_product
    try {
      console.warn("⚠️  Attempting fallback: Extracting store location IDs from store_location_product...");
      
      // Get distinct store_location_ids from store_location_product
      // This works because we can query products that are in stock
      const response = await databases.listDocuments(
        databaseId,
        STORE_LOCATION_PRODUCT_COLLECTION_ID,
        [
          Query.equal("in_stock", true),
          Query.limit(1000), // Get a sample to extract store IDs
        ]
      );

      // Extract unique store_location_ids
      const storeIds = new Set<string>();
      response.documents.forEach((doc: any) => {
        if (doc.store_location_id) {
          storeIds.add(doc.store_location_id);
        }
      });

      const fallbackCount = storeIds.size;
      if (fallbackCount > 0) {
        console.warn(`⚠️  Fallback successful: Found ${fallbackCount} store location(s) from store_location_product`);
        console.warn("⚠️  NOTE: These may include inactive stores. Consider fixing store_location collection permissions.");
      } else {
        console.warn("⚠️  Fallback returned no store locations. Search will work but won't filter by active stores.");
      }

      return Array.from(storeIds);
    } catch (fallbackError: any) {
      console.error("❌ ERROR: Fallback method also failed:", {
        error: fallbackError.message,
        code: fallbackError.code,
        type: fallbackError.type,
        action: "Search will continue without store filtering",
      });
      // Return empty array - search will still work but won't filter by store
      return [];
    }
  }
}

/**
 * Search products by title (partial match)
 * Uses full-text search on 'title' field (idx_title_fulltext index exists)
 */
async function searchProductsByTitle(
  query: string,
  limit: number = 100
): Promise<string[]> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Use full-text search on 'title' field (index exists: idx_title_fulltext)
    const response = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      [
        Query.search("title", normalizedQuery),
        Query.limit(limit),
      ]
    );
    return response.documents.map((doc: any) => doc.$id);
  } catch (error: any) {
    console.error("Error searching products by title:", error);
    return [];
  }
}

/**
 * Search products by brand (partial match)
 * Products have 'brand' as a string field
 */
async function searchProductsByBrand(
  query: string,
  limit: number = 100
): Promise<string[]> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Search products where brand contains the query
    // Note: Query.contains is case-sensitive, but we'll try it
    // For case-insensitive, we might need to fetch and filter
    const response = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      [
        Query.contains("brand", normalizedQuery),
        Query.limit(limit),
      ]
    );
    
    // Filter case-insensitively in memory as fallback
    const filtered = response.documents.filter((doc: any) => 
      doc.brand && doc.brand.toLowerCase().includes(normalizedQuery)
    );
    
    return filtered.map((doc: any) => doc.$id);
  } catch (error: any) {
    console.error("Error searching products by brand:", error);
    return [];
  }
}

/**
 * Get unique brand names from products that match the query
 * Since brands are stored as strings in products, we search products and extract brands
 */
async function getMatchingBrands(
  query: string,
  limit: number = 100
): Promise<string[]> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Search products by brand field
    const response = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      [
        Query.contains("brand", normalizedQuery),
        Query.limit(limit),
      ]
    );
    
    // Extract unique brand names
    const brands = new Set<string>();
    response.documents.forEach((doc: any) => {
      if (doc.brand && doc.brand.toLowerCase().includes(normalizedQuery)) {
        brands.add(doc.brand);
      }
    });
    
    return Array.from(brands);
  } catch (error: any) {
    console.error("Error getting matching brands:", error);
    return [];
  }
}

/**
 * Search categories by name (partial match)
 * Uses contains query (no full-text index exists, but we can filter in memory)
 */
async function searchCategoriesByName(
  query: string,
  limit: number = 100
): Promise<string[]> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Fetch categories and filter in memory for case-insensitive matching
    const response = await databases.listDocuments(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      [Query.limit(1000)] // Get all categories to filter
    );
    
    // Filter case-insensitively
    const matching = response.documents.filter((doc: any) => 
      doc.name && doc.name.toLowerCase().includes(normalizedQuery)
    );
    
    return matching.slice(0, limit).map((doc: any) => doc.$id);
  } catch (error: any) {
    console.error("Error searching categories by name:", error);
    return [];
  }
}

/**
 * Fetch product details by IDs
 */
async function getProductsByIds(productIds: string[]): Promise<Map<string, Product>> {
  const productMap = new Map<string, Product>();

  if (productIds.length === 0) return productMap;

  try {
    // Fetch products in batches (Appwrite limit is typically 100)
    const batchSize = 100;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      const response = await databases.listDocuments(
        databaseId,
        PRODUCTS_COLLECTION_ID,
        [
          Query.equal("$id", batch),
          Query.limit(batchSize),
        ]
      );

      response.documents.forEach((doc: any) => {
        productMap.set(doc.$id, doc as Product);
      });
    }
  } catch (error: any) {
    console.error("Error fetching products:", error);
  }

  return productMap;
}

/**
 * Get brand names from products
 * Since brands are stored as strings in products, we extract them from product documents
 */
async function getBrandsFromProducts(productIds: string[]): Promise<Map<string, string>> {
  const brandMap = new Map<string, string>();

  if (productIds.length === 0) return brandMap;

  try {
    const batchSize = 100;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      const response = await databases.listDocuments(
        databaseId,
        PRODUCTS_COLLECTION_ID,
        [
          Query.equal("$id", batch),
          Query.limit(batchSize),
        ]
      );

      response.documents.forEach((doc: any) => {
        if (doc.brand) {
          brandMap.set(doc.$id, doc.brand);
        }
      });
    }
  } catch (error: any) {
    console.error("Error fetching brands from products:", error);
  }

  return brandMap;
}

/**
 * Fetch category details by IDs
 */
async function getCategoriesByIds(categoryIds: string[]): Promise<Map<string, Category>> {
  const categoryMap = new Map<string, Category>();

  if (categoryIds.length === 0) return categoryMap;

  try {
    const batchSize = 100;
    for (let i = 0; i < categoryIds.length; i += batchSize) {
      const batch = categoryIds.slice(i, i + batchSize);
      const response = await databases.listDocuments(
        databaseId,
        CATEGORIES_COLLECTION_ID,
        [
          Query.equal("$id", batch),
          Query.limit(batchSize),
        ]
      );

      response.documents.forEach((doc: any) => {
        categoryMap.set(doc.$id, doc as Category);
      });
    }
  } catch (error: any) {
    console.error("Error fetching categories:", error);
  }

  return categoryMap;
}

/**
 * Fetch store location details by IDs
 */
async function getStoreLocationsByIds(storeLocationIds: string[]): Promise<Map<string, StoreLocation>> {
  const storeMap = new Map<string, StoreLocation>();

  if (storeLocationIds.length === 0) return storeMap;

  try {
    const batchSize = 100;
    for (let i = 0; i < storeLocationIds.length; i += batchSize) {
      const batch = storeLocationIds.slice(i, i + batchSize);
      const response = await databases.listDocuments(
        databaseId,
        STORE_LOCATIONS_COLLECTION_ID,
        [
          Query.equal("$id", batch),
          Query.limit(batchSize),
        ]
      );

      response.documents.forEach((doc: any) => {
        storeMap.set(doc.$id, doc as StoreLocation);
      });
    }
  } catch (error: any) {
    console.error("Error fetching store locations:", error);
  }

  return storeMap;
}

/**
 * Query store_location_product with multiple filters
 * Appwrite doesn't support OR queries directly, so we query separately and combine
 */
async function queryStoreLocationProducts(
  activeStoreLocationIds: string[],
  productIds: string[],
  brandIds: string[], // Not used since brands are in products, but kept for API compatibility
  categoryIds: string[]
): Promise<StoreLocationProduct[]> {
  const allResults = new Map<string, StoreLocationProduct>();

  // Query by product_id if we have product matches
  if (productIds.length > 0) {
    // Query in batches since Appwrite has limits
    const batchSize = 25; // Appwrite limit for Query.equal with arrays
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      try {
        const queries = [
          Query.equal("in_stock", true),
          Query.equal("product_id", batch),
          Query.limit(100),
        ];
        
        // Only filter by store_location_id if we have active stores
        if (activeStoreLocationIds.length > 0) {
          queries.splice(1, 0, Query.equal("store_location_id", activeStoreLocationIds));
        }
        
        const response = await databases.listDocuments(
          databaseId,
          STORE_LOCATION_PRODUCT_COLLECTION_ID,
          queries
        );
        response.documents.forEach((doc: any) => {
          allResults.set(doc.$id, doc as StoreLocationProduct);
        });
      } catch (error: any) {
        console.error("Error querying by product_id:", error);
      }
    }
  }

  // Note: brand_id in store_location_product refers to store brand, not product brand
  // We don't query by brand_id here since we're searching product brands, not store brands

  // Query by category_leaf_id if we have category matches
  if (categoryIds.length > 0) {
    const batchSize = 25;
    for (let i = 0; i < categoryIds.length; i += batchSize) {
      const batch = categoryIds.slice(i, i + batchSize);
      try {
        const queries = [
          Query.equal("in_stock", true),
          Query.equal("category_leaf_id", batch),
          Query.limit(100),
        ];
        
        // Only filter by store_location_id if we have active stores
        if (activeStoreLocationIds.length > 0) {
          queries.splice(1, 0, Query.equal("store_location_id", activeStoreLocationIds));
        }
        
        const response = await databases.listDocuments(
          databaseId,
          STORE_LOCATION_PRODUCT_COLLECTION_ID,
          queries
        );
        response.documents.forEach((doc: any) => {
          allResults.set(doc.$id, doc as StoreLocationProduct);
        });
      } catch (error: any) {
        console.error("Error querying by category_leaf_id:", error);
      }
    }
  }

  // Filter by category_path_ids in memory (Appwrite doesn't support array contains)
  const filteredResults = Array.from(allResults.values()).filter((doc) => {
    // If we're searching by category, check category_path_ids
    if (categoryIds.length > 0 && doc.category_path_ids) {
      return doc.category_path_ids.some((id) => categoryIds.includes(id));
    }
    return true;
  });

  return filteredResults;
}

/**
 * Perform a global product search across all active stores
 * 
 * Supports searching by:
 * - Product name (partial match)
 * - Brand (partial match)
 * - Category (partial match)
 * 
 * Only returns active, available products (in_stock = true)
 * Results are deduplicated by SKU (or product_id if no SKU)
 * 
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 50)
 * @returns Array of search results with product, brand, category, and store information
 */
export async function searchProducts(
  query: string,
  limit: number = 50
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Step 1: Get all active store location IDs (optional - search works without it)
    const activeStoreLocationIds = await getActiveStoreLocationIds();
    
    // Note: If we can't get store locations, we'll search all products
    // This is acceptable - the search will still work, just won't filter by active stores
    if (activeStoreLocationIds.length === 0) {
      console.warn("⚠️  WARNING: No active store locations found - searching all products without store filtering");
      console.warn("⚠️  This may return products from inactive stores. Check store_location collection permissions.");
    } else {
      console.log(`✓ Found ${activeStoreLocationIds.length} active store location(s) for filtering`);
    }

    // Step 2: Search for matching products, brands, and categories in parallel
    const [productIdsByTitle, categoryIds] = await Promise.all([
      searchProductsByTitle(query),
      searchCategoriesByName(query),
    ]);

    // Step 2b: Search products by brand and get matching brand names
    const matchingBrands = await getMatchingBrands(query);
    const productIdsByBrand = await searchProductsByBrand(query);

    // Combine product IDs from title and brand searches
    const allProductIds = [...new Set([...productIdsByTitle, ...productIdsByBrand])];

    // If no matches found in products or categories, return empty
    if (allProductIds.length === 0 && categoryIds.length === 0) {
      return [];
    }

    // Step 3: Query store_location_product collection with all search criteria
    // Note: brandIds is now empty array since brands are strings in products
    const filteredDocs = await queryStoreLocationProducts(
      activeStoreLocationIds,
      allProductIds,
      [], // No separate brand collection
      categoryIds
    );

    // If no results after filtering, return empty
    if (filteredDocs.length === 0) {
      return [];
    }

    // Step 4: Collect unique IDs for batch fetching
    const uniqueProductIds = [...new Set(filteredDocs.map((doc) => doc.product_id))];
    const uniqueCategoryIds = [
      ...new Set(
        filteredDocs
          .map((doc) => doc.category_leaf_id)
          .filter((id): id is string => !!id)
          .concat(
            filteredDocs
              .flatMap((doc) => doc.category_path_ids || [])
              .filter((id) => !!id)
          )
      ),
    ];
    const uniqueStoreLocationIds = [...new Set(filteredDocs.map((doc) => doc.store_location_id))];

    // Step 5: Fetch all related data in parallel
    const [productsMap, brandsMap, categoriesMap, storeLocationsMap] = await Promise.all([
      getProductsByIds(uniqueProductIds),
      getBrandsFromProducts(uniqueProductIds), // Get brands from products
      getCategoriesByIds(uniqueCategoryIds),
      uniqueStoreLocationIds.length > 0 
        ? getStoreLocationsByIds(uniqueStoreLocationIds)
        : Promise.resolve(new Map<string, StoreLocation>()), // Return empty map if no store IDs
    ]);

    // Step 6: Build search results and deduplicate by SKU/product_id
    const resultsMap = new Map<string, SearchResult>();
    const seenSkus = new Set<string>();

    for (const doc of filteredDocs) {
      const product = productsMap.get(doc.product_id);
      const brandName = brandsMap.get(doc.product_id) || ""; // Get brand from product
      const storeLocation = storeLocationsMap.get(doc.store_location_id);
      const category = doc.category_leaf_id
        ? categoriesMap.get(doc.category_leaf_id)
        : undefined;

      // Skip if essential data is missing (product is required, storeLocation is optional)
      if (!product) {
        continue;
      }
      
      // If we can't fetch store location details, create a minimal one from the ID
      const finalStoreLocation: StoreLocation = storeLocation || {
        $id: doc.store_location_id,
        name: `Store ${doc.store_location_id.substring(0, 8)}`,
        display_name: `Store ${doc.store_location_id.substring(0, 8)}`,
        is_active: true, // Assume active if we can't verify
        brand_id: doc.brand_id,
        slug: doc.store_location_id,
      };

      // Deduplicate by SKU (products always have SKU)
      const dedupeKey = product.sku;
      if (seenSkus.has(dedupeKey)) {
        continue; // Skip duplicate
      }
      seenSkus.add(dedupeKey);

      const result: SearchResult = {
        product,
        brand: brandName, // Brand is just a string
        category,
        storeLocation: finalStoreLocation,
        priceJmdCents: doc.price_jmd_cents,
        inStock: doc.in_stock,
        sku: product.sku,
      };

      resultsMap.set(dedupeKey, result);
    }

    // Step 7: Convert to array and limit results
    const results = Array.from(resultsMap.values()).slice(0, limit);

    return results;
  } catch (error: any) {
    console.error("Error searching products:", error);
    // Return empty array on error rather than throwing
    // This allows the UI to handle the error gracefully
    return [];
  }
}
