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

async function inspectDatabase() {
  try {
    console.log("🔍 Inspecting Appwrite Database...\n");
    console.log(`Database ID: ${databaseId}\n`);

    // Step 1: Check if database exists
    let db;
    try {
      db = await appwriteRequest("GET", `/databases/${databaseId}`);
      console.log(`✓ Database '${databaseId}' exists`);
      console.log(`  Name: ${db.name}\n`);
    } catch (error: any) {
      if (error.code === 404) {
        console.error(`✗ Database '${databaseId}' not found`);
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Step 2: List all collections
    console.log("📦 Collections:\n");
    try {
      const collections = await appwriteRequest(
        "GET",
        `/databases/${databaseId}/collections`
      );

      if (collections.collections && collections.collections.length > 0) {
        for (const collection of collections.collections) {
          console.log(`  ✓ ${collection.name} (${collection.$id})`);
          console.log(`    Permissions: ${JSON.stringify(collection.$permissions)}`);
          
          // Get attributes for each collection
          try {
            const attributes = await appwriteRequest(
              "GET",
              `/databases/${databaseId}/collections/${collection.$id}/attributes`
            );
            
            if (attributes.attributes && attributes.attributes.length > 0) {
              console.log(`    Attributes:`);
              for (const attr of attributes.attributes) {
                const status = attr.status === "available" ? "✓" : "⏳";
                console.log(`      ${status} ${attr.key} (${attr.type})${attr.required ? " [required]" : ""}`);
              }
            }
          } catch (attrError: any) {
            console.log(`    ⚠ Could not fetch attributes: ${attrError.message}`);
          }

          // Get document count
          try {
            const documents = await appwriteRequest(
              "GET",
              `/databases/${databaseId}/collections/${collection.$id}/documents?limit=1`
            );
            console.log(`    Documents: ${documents.total || 0}`);
          } catch (docError: any) {
            console.log(`    ⚠ Could not fetch document count`);
          }
          
          console.log("");
        }
      } else {
        console.log("  No collections found\n");
      }
    } catch (error: any) {
      console.error(`✗ Failed to list collections: ${error.message}\n`);
    }

    // Step 3: Specifically check categories collection
    console.log("🏷️  Categories Collection Details:\n");
    const categoriesCollectionId = "categories";
    try {
      const categoriesCollection = await appwriteRequest(
        "GET",
        `/databases/${databaseId}/collections/${categoriesCollectionId}`
      );
      
      console.log(`✓ Categories collection exists`);
      console.log(`  Collection ID: ${categoriesCollection.$id}`);
      console.log(`  Name: ${categoriesCollection.name}`);
      console.log(`  Permissions: ${JSON.stringify(categoriesCollection.$permissions)}\n`);

      // Get all categories
      try {
        const categories = await appwriteRequest(
          "GET",
          `/databases/${databaseId}/collections/${categoriesCollectionId}/documents`
        );

        if (categories.documents && categories.documents.length > 0) {
          console.log(`  Found ${categories.documents.length} category(ies):\n`);
          categories.documents.forEach((cat: any, index: number) => {
            console.log(`  ${index + 1}. ${cat.name || "Unnamed"}`);
            console.log(`     ID: ${cat.$id}`);
            if (cat.description) console.log(`     Description: ${cat.description}`);
            if (cat.imageUrl) console.log(`     Image: ${cat.imageUrl}`);
            if (cat.order !== undefined) console.log(`     Order: ${cat.order}`);
            console.log(`     Created: ${cat.$createdAt}`);
            console.log("");
          });
        } else {
          console.log("  No categories found in collection\n");
        }
      } catch (docError: any) {
        console.error(`  ✗ Failed to fetch categories: ${docError.message}\n`);
      }

    } catch (error: any) {
      if (error.code === 404) {
        console.log(`✗ Categories collection '${categoriesCollectionId}' does not exist\n`);
        console.log("💡 To create the categories collection, you can:");
        console.log("   1. Use the Appwrite Console to create it manually");
        console.log("   2. Or extend the setup-database.ts script to include it\n");
      } else {
        console.error(`✗ Error checking categories collection: ${error.message}\n`);
      }
    }

    console.log("✅ Inspection completed!");
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
