import { Client, Databases } from "appwrite";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

// Load environment variables from .env file
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try .env.local as fallback
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }
}

// Get environment variables
const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || "grovi-db";

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing required environment variables:");
  console.error("  EXPO_PUBLIC_APPWRITE_ENDPOINT:", endpoint ? "✓" : "✗");
  console.error("  EXPO_PUBLIC_APPWRITE_PROJECT_ID:", projectId ? "✓" : "✗");
  console.error("  APPWRITE_API_KEY:", apiKey ? "✓" : "✗");
  process.exit(1);
}

// Helper function to make API requests to Appwrite
async function appwriteRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Ensure endpoint ends with /v1 if not already present
    const baseUrl = endpoint.endsWith("/v1") ? endpoint : `${endpoint}/v1`;
    const fullUrl = `${baseUrl}${path}`;
    const url = new URL(fullUrl);
    const isHttps = url.protocol === "https:";
    const httpModule = isHttps ? https : http;

    const postData = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
    };

    const req = httpModule.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const error: any = new Error(parsed.message || "Request failed");
            error.code = res.statusCode;
            error.response = parsed;
            reject(error);
          }
        } catch (e) {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Request failed with status ${res.statusCode}`));
          }
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Initialize Appwrite client
const client = new Client().setEndpoint(endpoint).setProject(projectId);
const databases = new Databases(client);

interface CollectionInfo {
  id: string;
  name: string;
  attributes: any[];
  indexes: any[];
  permissions: any[];
  documentCount?: number;
  sampleDocuments?: any[];
}

async function inspectDatabase() {
  try {
    console.log("🔍 Inspecting Appwrite Database...\n");
    console.log(`Database ID: ${databaseId}\n`);

    // Step 1: Get all collections
    console.log("📦 Fetching collections...");
    let collections;
    try {
      const response = await appwriteRequest(
        "GET",
        `/databases/${databaseId}/collections`
      );
      collections = response.collections || [];
      console.log(`✓ Found ${collections.length} collection(s)\n`);
    } catch (error: any) {
      console.error(`✗ Failed to fetch collections: ${error.message}`);
      return;
    }

    if (collections.length === 0) {
      console.log("No collections found in database.\n");
      return;
    }

    // Step 2: Inspect each collection
    const collectionInfos: CollectionInfo[] = [];

    for (const collection of collections) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Collection: ${collection.name} (${collection.$id})`);
      console.log(`${"=".repeat(60)}`);

      const info: CollectionInfo = {
        id: collection.$id,
        name: collection.name,
        attributes: [],
        indexes: [],
        permissions: collection.$permissions || [],
      };

      // Get attributes
      try {
        const attrsResponse = await appwriteRequest(
          "GET",
          `/databases/${databaseId}/collections/${collection.$id}/attributes`
        );
        info.attributes = attrsResponse.attributes || [];
        console.log(`\n📋 Attributes (${info.attributes.length}):`);
        info.attributes.forEach((attr: any) => {
          const type = attr.type || "unknown";
          const required = attr.required ? "required" : "optional";
          const array = attr.array ? "array" : "";
          console.log(
            `  - ${attr.key}: ${type}${array ? `[${array}]` : ""} (${required})`
          );
        });
      } catch (error: any) {
        console.error(`  ✗ Failed to fetch attributes: ${error.message}`);
      }

      // Get indexes
      try {
        const indexesResponse = await appwriteRequest(
          "GET",
          `/databases/${databaseId}/collections/${collection.$id}/indexes`
        );
        info.indexes = indexesResponse.indexes || [];
        console.log(`\n🔍 Indexes (${info.indexes.length}):`);
        if (info.indexes.length === 0) {
          console.log("  (no indexes)");
        } else {
          info.indexes.forEach((idx: any) => {
            const attrs = idx.attributes?.join(", ") || "unknown";
            const type = idx.type || "unknown";
            console.log(`  - ${idx.key}: ${type} on [${attrs}]`);
          });
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to fetch indexes: ${error.message}`);
      }

      // Get document count and sample documents
      try {
        const docsResponse = await databases.listDocuments(
          databaseId,
          collection.$id,
          []
        );
        info.documentCount = docsResponse.total;
        info.sampleDocuments = docsResponse.documents.slice(0, 3); // First 3 documents

        console.log(`\n📄 Documents: ${info.documentCount}`);
        if (info.sampleDocuments.length > 0) {
          console.log(`\n📝 Sample document structure:`);
          const sample = info.sampleDocuments[0];
          Object.keys(sample).forEach((key) => {
            const value = sample[key];
            const type = Array.isArray(value)
              ? "array"
              : typeof value === "object" && value !== null
              ? "object"
              : typeof value;
            const preview =
              typeof value === "string"
                ? value.length > 50
                  ? value.substring(0, 50) + "..."
                  : value
                : Array.isArray(value)
                ? `[${value.length} items]`
                : value;
            console.log(`  - ${key}: ${type} = ${preview}`);
          });
        }
      } catch (error: any) {
        console.log(`\n📄 Documents: Unable to fetch (${error.message})`);
      }

      collectionInfos.push(info);
    }

    // Step 3: Summary report for search requirements
    console.log(`\n\n${"=".repeat(60)}`);
    console.log("🔎 SEARCH REQUIREMENTS CHECK");
    console.log(`${"=".repeat(60)}\n`);

    const requiredCollections = [
      "products",
      "brands",
      "categories",
      "store_locations",
      "store_location_product",
    ];

    const collectionMap = new Map(
      collectionInfos.map((info) => [info.id, info])
    );

    requiredCollections.forEach((collectionId) => {
      const info = collectionMap.get(collectionId);
      if (info) {
        console.log(`✓ ${collectionId}: EXISTS`);
        console.log(`  - Attributes: ${info.attributes.length}`);
        console.log(`  - Indexes: ${info.indexes.length}`);
        console.log(`  - Documents: ${info.documentCount || 0}`);

        // Check for specific requirements
        if (collectionId === "products") {
          const hasName = info.attributes.some(
            (attr: any) => attr.key === "name"
          );
          const hasSku = info.attributes.some((attr: any) => attr.key === "sku");
          console.log(`  - Has 'name' attribute: ${hasName ? "✓" : "✗"}`);
          console.log(`  - Has 'sku' attribute: ${hasSku ? "✓" : "✗"}`);
          const hasFullTextIndex = info.indexes.some(
            (idx: any) => idx.type === "fulltext" && idx.attributes?.includes("name")
          );
          console.log(
            `  - Has full-text index on 'name': ${hasFullTextIndex ? "✓" : "✗ (recommended)"}`
          );
        }

        if (collectionId === "brands") {
          const hasName = info.attributes.some(
            (attr: any) => attr.key === "name"
          );
          console.log(`  - Has 'name' attribute: ${hasName ? "✓" : "✗"}`);
          const hasFullTextIndex = info.indexes.some(
            (idx: any) => idx.type === "fulltext" && idx.attributes?.includes("name")
          );
          console.log(
            `  - Has full-text index on 'name': ${hasFullTextIndex ? "✓" : "✗ (recommended)"}`
          );
        }

        if (collectionId === "categories") {
          const hasName = info.attributes.some(
            (attr: any) => attr.key === "name"
          );
          console.log(`  - Has 'name' attribute: ${hasName ? "✓" : "✗"}`);
          const hasFullTextIndex = info.indexes.some(
            (idx: any) => idx.type === "fulltext" && idx.attributes?.includes("name")
          );
          console.log(
            `  - Has full-text index on 'name': ${hasFullTextIndex ? "✓" : "✗ (recommended)"}`
          );
        }

        if (collectionId === "store_locations") {
          const hasActive = info.attributes.some(
            (attr: any) => attr.key === "active"
          );
          console.log(`  - Has 'active' attribute: ${hasActive ? "✓" : "✗"}`);
          const hasActiveIndex = info.indexes.some(
            (idx: any) =>
              idx.attributes?.includes("active") || idx.key?.includes("active")
          );
          console.log(
            `  - Has index on 'active': ${hasActiveIndex ? "✓" : "✗ (recommended)"}`
          );
        }

        if (collectionId === "store_location_product") {
          const requiredAttrs = [
            "product_id",
            "store_location_id",
            "brand_id",
            "in_stock",
            "price_jmd_cents",
          ];
          requiredAttrs.forEach((attr) => {
            const hasAttr = info.attributes.some(
              (a: any) => a.key === attr
            );
            console.log(`  - Has '${attr}' attribute: ${hasAttr ? "✓" : "✗"}`);
          });

          const recommendedIndexes = [
            "idx_in_stock",
            "idx_store_stock",
            "idx_brand",
            "idx_category_leaf",
          ];
          recommendedIndexes.forEach((idxKey) => {
            const hasIdx = info.indexes.some((idx: any) => idx.key === idxKey);
            console.log(
              `  - Has '${idxKey}' index: ${hasIdx ? "✓" : "✗ (recommended)"}`
            );
          });
        }
        console.log("");
      } else {
        console.log(`✗ ${collectionId}: MISSING\n`);
      }
    });

    // Step 4: Generate recommendations
    console.log(`\n${"=".repeat(60)}`);
    console.log("💡 RECOMMENDATIONS");
    console.log(`${"=".repeat(60)}\n`);

    const missingCollections = requiredCollections.filter(
      (id) => !collectionMap.has(id)
    );

    if (missingCollections.length > 0) {
      console.log("Missing collections that need to be created:");
      missingCollections.forEach((id) => {
        console.log(`  - ${id}`);
      });
      console.log("");
    }

    // Check for missing full-text indexes
    const needsFullTextIndex = ["products", "brands", "categories"];
    needsFullTextIndex.forEach((collectionId) => {
      const info = collectionMap.get(collectionId);
      if (info) {
        const hasFullTextIndex = info.indexes.some(
          (idx: any) => idx.type === "fulltext" && idx.attributes?.includes("name")
        );
        if (!hasFullTextIndex) {
          console.log(
            `⚠️  ${collectionId}: Consider adding full-text index on 'name' for better search performance`
          );
        }
      }
    });

    console.log("\n✅ Inspection complete!\n");
  } catch (error: any) {
    console.error("\n❌ Database inspection failed:", error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

// Run the inspection
inspectDatabase();
