/**
 * Diagnostic Script: Debug Beverages Search
 * 
 * This script simulates the search for "beverages" and shows exactly
 * where results are being filtered out.
 * 
 * Run with: npx tsx scripts/diagnose-beverages-search.ts
 */

import { Client, Databases, Query } from "appwrite";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Appwrite client for Node.js
const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "");

// Use API key if available (for server-side access)
if (process.env.EXPO_PUBLIC_APPWRITE_API_KEY) {
  client.setKey(process.env.EXPO_PUBLIC_APPWRITE_API_KEY);
  console.log("✅ Using API key for authentication\n");
} else {
  console.warn("⚠️  No API key found. Some queries may fail due to permissions.\n");
  console.warn("   Add EXPO_PUBLIC_APPWRITE_API_KEY to your .env file for full access.\n");
}

const databases = new Databases(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "grovi-db";

const STORE_LOCATION_PRODUCT_COLLECTION_ID = "store_location_product";
const PRODUCTS_COLLECTION_ID = "products";
const CATEGORIES_COLLECTION_ID = "categories";

async function diagnoseBeveragesSearch() {
  const searchQuery = "beverages";
  console.log(`🔍 Debugging search for: "${searchQuery}"\n`);

  try {
    // Step 1: Search for products by title
    console.log("Step 1: Searching products by title...");
    const productsResponse = await databases.listDocuments(
      databaseId,
      PRODUCTS_COLLECTION_ID,
      [
        Query.search("title", searchQuery),
        Query.limit(100),
      ]
    );
    console.log(`   Found ${productsResponse.documents.length} products with title matching "${searchQuery}"`);
    const productIdsByTitle = productsResponse.documents.map((doc: any) => doc.$id);

    // Step 2: Search for categories by name
    console.log("\nStep 2: Searching categories by name...");
    const categoriesResponse = await databases.listDocuments(
      databaseId,
      CATEGORIES_COLLECTION_ID,
      [Query.limit(1000)]
    );
    const matchingCategories = categoriesResponse.documents.filter((doc: any) =>
      doc.name && doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log(`   Found ${matchingCategories.length} categories matching "${searchQuery}"`);
    const categoryIds = matchingCategories.map((doc: any) => doc.$id);

    // Step 3: Query store_location_product
    console.log("\nStep 3: Querying store_location_product...");
    
    let allStoreProducts: any[] = [];
    
    // Query by product IDs
    if (productIdsByTitle.length > 0) {
      const batchSize = 25;
      for (let i = 0; i < productIdsByTitle.length; i += batchSize) {
        const batch = productIdsByTitle.slice(i, i + batchSize);
        const response = await databases.listDocuments(
          databaseId,
          STORE_LOCATION_PRODUCT_COLLECTION_ID,
          [
            Query.equal("in_stock", true),
            Query.equal("product_id", batch),
            Query.limit(100),
          ]
        );
        allStoreProducts.push(...response.documents);
      }
    }

    // Query by category IDs
    if (categoryIds.length > 0) {
      const batchSize = 25;
      for (let i = 0; i < categoryIds.length; i += batchSize) {
        const batch = categoryIds.slice(i, i + batchSize);
        const response = await databases.listDocuments(
          databaseId,
          STORE_LOCATION_PRODUCT_COLLECTION_ID,
          [
            Query.equal("in_stock", true),
            Query.equal("category_leaf_id", batch),
            Query.limit(100),
          ]
        );
        allStoreProducts.push(...response.documents);
      }
    }

    // Remove duplicates
    const uniqueStoreProducts = Array.from(
      new Map(allStoreProducts.map(doc => [doc.$id, doc])).values()
    );

    console.log(`   Found ${uniqueStoreProducts.length} store_location_product entries`);

    // Step 4: Fetch product details
    console.log("\nStep 4: Fetching product details...");
    const uniqueProductIds = [...new Set(uniqueStoreProducts.map((doc: any) => doc.product_id))];
    console.log(`   Need to fetch ${uniqueProductIds.length} unique products`);

    const productsMap = new Map();
    const batchSize = 100;
    for (let i = 0; i < uniqueProductIds.length; i += batchSize) {
      const batch = uniqueProductIds.slice(i, i + batchSize);
      const response = await databases.listDocuments(
        databaseId,
        PRODUCTS_COLLECTION_ID,
        [
          Query.equal("$id", batch),
          Query.limit(batchSize),
        ]
      );
      response.documents.forEach((doc: any) => {
        productsMap.set(doc.$id, doc);
      });
    }
    console.log(`   Successfully fetched ${productsMap.size} products`);

    // Step 5: Analyze what gets filtered out
    console.log("\nStep 5: Analyzing filtering...");
    
    let skippedDueToMissingProduct = 0;
    let skippedDueToDuplicateSKU = 0;
    let includedResults = 0;
    const seenSkus = new Set<string>();
    const missingProductIds: string[] = [];

    for (const doc of uniqueStoreProducts) {
      const product = productsMap.get(doc.product_id);
      
      if (!product) {
        skippedDueToMissingProduct++;
        missingProductIds.push(doc.product_id);
        continue;
      }

      const sku = product.sku;
      if (seenSkus.has(sku)) {
        skippedDueToDuplicateSKU++;
        continue;
      }

      seenSkus.add(sku);
      includedResults++;
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 RESULTS SUMMARY:");
    console.log("=".repeat(80));
    console.log(`Total store_location_product entries: ${uniqueStoreProducts.length}`);
    console.log(`Skipped due to missing product:       ${skippedDueToMissingProduct}`);
    console.log(`Skipped due to duplicate SKU:          ${skippedDueToDuplicateSKU}`);
    console.log(`Final results included:                ${includedResults}`);
    console.log("=".repeat(80));

    if (skippedDueToMissingProduct > 0) {
      console.log(`\n⚠️  ${skippedDueToMissingProduct} entries are missing products!`);
      console.log("\nMissing product IDs:");
      missingProductIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });
      console.log("\n💡 These product_ids exist in store_location_product but not in products table");
    }

    if (skippedDueToDuplicateSKU > 0) {
      console.log(`\n📦 ${skippedDueToDuplicateSKU} entries were deduplicated by SKU`);
      console.log("   (Same product appearing multiple times - only showing best price/availability)");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

// Run the diagnostic
diagnoseBeveragesSearch().then(() => {
  console.log("\n✅ Diagnostic complete!");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Diagnostic failed:", error);
  process.exit(1);
});
