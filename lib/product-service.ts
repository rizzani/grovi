import { databases, databaseId, storage, client } from "./appwrite-client";
import { Query } from "appwrite";
import Constants from "expo-constants";

const PRODUCTS_COLLECTION_ID = "products";

export interface Product {
  $id: string;
  title: string;
  description?: string;
  price_jmd_cents: number;
  price_currency: string;
  primary_image_url: string;
  primary_image_file_id?: string;
  category_leaf_id: string;
  category_path?: string;
  brand?: string;
  sku: string;
  in_stock: boolean;
  unit_size?: string;
  package_quantity?: number;
  net_weight?: string;
  external_url: string;
  $createdAt: string;
}

/**
 * Gets the image URL for a product
 * Handles both direct URLs and Appwrite file IDs
 */
export function getProductImageUrl(product: Product): string | null {
  // If primary_image_url is a valid HTTP/HTTPS URL, use it directly
  if (product.primary_image_url && (product.primary_image_url.startsWith("http://") || product.primary_image_url.startsWith("https://"))) {
    return product.primary_image_url;
  }
  
  // If we have a file ID, construct the Appwrite file URL
  // Note: This requires knowing the bucket ID - you may need to adjust this
  const fileId = product.primary_image_file_id || product.primary_image_url;
  if (fileId) {
    const endpoint = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_ENDPOINT || 
      process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "";
    const projectId = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
      process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
    
    if (endpoint && projectId) {
      // Try to construct file URL - you may need to adjust bucket ID
      // For now, return the primary_image_url as-is and let the Image component handle errors
      return product.primary_image_url || null;
    }
  }
  
  return null;
}

/**
 * Formats price from cents to JMD currency string
 */
export function formatPrice(cents: number, currency: string = "JMD"): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)} ${currency}`;
}

/**
 * Retrieves products with optional filters
 * @param limit - Maximum number of products to return
 * @param categoryId - Optional category ID to filter by
 * @param inStockOnly - Only return products in stock
 * @returns Promise with array of products
 */
export async function getProducts(
  limit: number = 20,
  categoryId?: string,
  inStockOnly: boolean = true
): Promise<Product[]> {
  try {
    const queries: string[] = [];
    
    if (inStockOnly) {
      queries.push(Query.equal("in_stock", true));
    }
    
    if (categoryId) {
      queries.push(Query.equal("category_leaf_id", categoryId));
    }
    
    queries.push(Query.limit(limit));
    queries.push(Query.orderDesc("$createdAt"));

    const result = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      queries
    );

    return result.documents as Product[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve products";
    console.error("Product retrieval error:", errorMessage);
    
    if (error.code === 404 || error.code === 401) {
      console.warn("Products collection not found or not accessible. Returning empty array.");
      return [];
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves featured/popular products
 * @param limit - Maximum number of products to return
 * @returns Promise with array of products
 */
export async function getFeaturedProducts(limit: number = 10): Promise<Product[]> {
  return getProducts(limit, undefined, true);
}

/**
 * Searches products by title or description
 * @param searchQuery - Search query string
 * @param limit - Maximum number of products to return
 * @returns Promise with array of matching products
 */
export async function searchProducts(
  searchQuery: string,
  limit: number = 50
): Promise<Product[]> {
  try {
    if (!searchQuery.trim()) {
      return [];
    }

    const queries: string[] = [
      Query.or([
        Query.search("title", searchQuery),
        Query.search("description", searchQuery),
        Query.search("brand", searchQuery),
      ]),
      Query.equal("in_stock", true),
      Query.limit(limit),
    ];

    const result = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      queries
    );

    return result.documents as Product[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to search products";
    console.error("Product search error:", errorMessage);
    
    if (error.code === 404 || error.code === 401) {
      return [];
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves a single product by ID
 * @param productId - Product document ID
 * @returns Promise with the product or null if not found
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const product = await databases.getDocument(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      productId
    );

    return product as Product;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    
    const errorMessage = error.message || "Failed to retrieve product";
    console.error("Product retrieval error:", errorMessage);
    throw new Error(errorMessage);
  }
}
