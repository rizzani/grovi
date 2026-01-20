/**
 * Diagnostic Script: Find Orphaned Store Location Products
 * 
 * This script identifies store_location_product entries that reference
 * product_ids that don't exist in the products table.
 * 
 * Run with: npx tsx scripts/diagnose-missing-products.ts
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

async function diagnoseMissingProducts() {
  console.log("🔍 Checking for orphaned store_location_product entries...\n");

  try {
    // Get all store_location_product entries (adjust limit if needed)
    const storeProductsResponse = await databases.listDocuments(
      databaseId,
      STORE_LOCATION_PRODUCT_COLLECTION_ID,
      [Query.limit(1000)]
    );

    console.log(`📊 Found ${storeProductsResponse.documents.length} total store_location_product entries`);

    // Extract unique product IDs
    const productIds = [...new Set(
      storeProductsResponse.documents.map((doc: any) => doc.product_id)
    )];
    console.log(`📦 Checking ${productIds.length} unique product IDs...\n`);

    // Fetch products in batches
    const batchSize = 100;
    const foundProductIds = new Set<string>();
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      try {
        const productsResponse = await databases.listDocuments(
          databaseId,
          PRODUCTS_COLLECTION_ID,
          [
            Query.equal("$id", batch),
            Query.limit(batchSize),
          ]
        );

        productsResponse.documents.forEach((doc: any) => {
          foundProductIds.add(doc.$id);
        });
      } catch (error: any) {
        console.error(`❌ Error fetching batch ${i / batchSize + 1}:`, error.message);
      }
    }

    console.log(`✅ Found ${foundProductIds.size} products in products table`);
    
    // Find missing product IDs
    const missingProductIds = productIds.filter(id => !foundProductIds.has(id));
    
    if (missingProductIds.length === 0) {
      console.log("\n✨ No orphaned entries found! All product_ids exist in products table.");
      return;
    }

    console.log(`\n⚠️  Found ${missingProductIds.length} orphaned product IDs:\n`);
    
    // Get details of orphaned entries
    const orphanedEntries = storeProductsResponse.documents.filter((doc: any) => 
      missingProductIds.includes(doc.product_id)
    );

    console.log("Orphaned entries:");
    console.log("=".repeat(80));
    
    orphanedEntries.forEach((entry: any, index) => {
      console.log(`\n${index + 1}. Document ID: ${entry.$id}`);
      console.log(`   Product ID (missing): ${entry.product_id}`);
      console.log(`   Store Location ID: ${entry.store_location_id}`);
      console.log(`   In Stock: ${entry.in_stock}`);
      console.log(`   Price: $${(entry.price_jmd_cents / 100).toFixed(2)}`);
      if (entry.category_leaf_id) {
        console.log(`   Category ID: ${entry.category_leaf_id}`);
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log(`\n💡 Recommendation:`);
    console.log(`   These ${orphanedEntries.length} entries in store_location_product table`);
    console.log(`   reference products that don't exist in the products table.`);
    console.log(`   You should either:`);
    console.log(`   1. Delete these orphaned entries from store_location_product`);
    console.log(`   2. Create the missing products in the products table`);
    console.log(`   3. Update these entries to reference existing products\n`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

// Run the diagnostic
diagnoseMissingProducts().then(() => {
  console.log("\n✅ Diagnostic complete!");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Diagnostic failed:", error);
  process.exit(1);
});
