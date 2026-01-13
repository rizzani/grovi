import { databases, databaseId } from "./appwrite-client";
import { Query } from "appwrite";

const CATEGORIES_COLLECTION_ID = "categories";

export interface Category {
  $id: string;
  name: string;
  slug: string;
  parent_id?: string;
  path_ids?: string;
  path_names?: string;
  depth?: number;
  $createdAt: string;
}

/**
 * Retrieves all product categories
 * Categories are publicly readable (guests can read)
 * @returns Promise with array of categories, sorted by name
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const result = await databases.listDocuments(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      [Query.orderAsc("name")]
    );

    return result.documents as Category[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve categories";
    console.error("Category retrieval error:", errorMessage);
    
    // If collection doesn't exist, return empty array instead of throwing
    if (error.code === 404 || error.code === 401) {
      console.warn("Categories collection not found or not accessible. Returning empty array.");
      return [];
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves top-level categories (categories without a parent)
 * @returns Promise with array of top-level categories
 */
export async function getTopLevelCategories(): Promise<Category[]> {
  try {
    const result = await databases.listDocuments(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      [Query.isNull("parent_id"), Query.orderAsc("name")]
    );

    return result.documents as Category[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve top-level categories";
    console.error("Top-level category retrieval error:", errorMessage);
    
    if (error.code === 404 || error.code === 401) {
      console.warn("Categories collection not found or not accessible. Returning empty array.");
      return [];
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves child categories for a given parent category
 * @param parentId - Parent category ID
 * @returns Promise with array of child categories
 */
export async function getChildCategories(parentId: string): Promise<Category[]> {
  try {
    const result = await databases.listDocuments(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      [Query.equal("parent_id", parentId), Query.orderAsc("name")]
    );

    return result.documents as Category[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve child categories";
    console.error("Child category retrieval error:", errorMessage);
    
    if (error.code === 404 || error.code === 401) {
      return [];
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves a single category by ID
 * @param categoryId - Category document ID
 * @returns Promise with the category or null if not found
 */
export async function getCategory(categoryId: string): Promise<Category | null> {
  try {
    const category = await databases.getDocument(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      categoryId
    );

    return category as Category;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    
    const errorMessage = error.message || "Failed to retrieve category";
    console.error("Category retrieval error:", errorMessage);
    throw new Error(errorMessage);
  }
}
