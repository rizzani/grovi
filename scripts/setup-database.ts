import { Client, Databases, ID, Permission, Role } from "appwrite";
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

// Initialize Appwrite client for document operations
const client = new Client().setEndpoint(endpoint).setProject(projectId);
const databases = new Databases(client);

async function setupDatabase() {
  try {
    console.log("🚀 Starting database setup...\n");

    // Step 1: Create or get database
    let db;
    try {
      db = await appwriteRequest("GET", `/databases/${databaseId}`);
      console.log(`✓ Database '${databaseId}' already exists`);
    } catch (error: any) {
      if (error.code === 404) {
        try {
          db = await appwriteRequest("POST", "/databases", {
            databaseId,
            name: "Grovi Database",
          });
          console.log(`✓ Created database '${databaseId}'`);
        } catch (createError: any) {
          console.error(`✗ Failed to create database: ${createError.message}`);
          throw createError;
        }
      } else {
        throw error;
      }
    }

    // Step 2: Create profiles collection
    const profilesCollectionId = "profiles";
    let profilesCollection;
    try {
      profilesCollection = await appwriteRequest(
        "GET",
        `/databases/${databaseId}/collections/${profilesCollectionId}`
      );
      console.log(`✓ Collection '${profilesCollectionId}' already exists`);
    } catch (error: any) {
      if (error.code === 404) {
        try {
          profilesCollection = await appwriteRequest(
            "POST",
            `/databases/${databaseId}/collections`,
            {
              collectionId: profilesCollectionId,
              name: "Profiles",
              permissions: [
                Permission.read(Role.users()),
                Permission.write(Role.users()),
              ],
            }
          );
          console.log(`✓ Created collection '${profilesCollectionId}'`);
        } catch (createError: any) {
          console.error(`✗ Failed to create collection: ${createError.message}`);
          throw createError;
        }
      } else {
        throw error;
      }
    }

    // Step 3: Create profiles attributes
    const profilesStringAttributes = [
      { key: "userId", size: 36, required: true },
      { key: "name", size: 255, required: false },
      { key: "phone", size: 20, required: true },
      { key: "email", size: 255, required: true },
    ];

    for (const attr of profilesStringAttributes) {
      try {
        await appwriteRequest(
          "POST",
          `/databases/${databaseId}/collections/${profilesCollectionId}/attributes/string`,
          {
            key: attr.key,
            size: attr.size,
            required: attr.required,
          }
        );
        console.log(`  ✓ Created attribute '${attr.key}' (string)`);
        // Wait for attribute to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  - Attribute '${attr.key}' already exists`);
        } else {
          console.error(`  ✗ Failed to create attribute '${attr.key}': ${error.message}`);
        }
      }
    }

    // Note: createdAt is automatically handled by Appwrite, no need to create it

    // Step 4: Create profiles indexes
    try {
      await appwriteRequest(
        "POST",
        `/databases/${databaseId}/collections/${profilesCollectionId}/indexes`,
        {
          key: "idx_userId",
          type: "key",
          attributes: ["userId"],
          orders: ["ASC"],
        }
      );
      console.log(`  ✓ Created unique index 'idx_userId' on profiles`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  - Index 'idx_userId' already exists`);
      } else {
        console.error(`  ✗ Failed to create index: ${error.message}`);
      }
    }

    // Step 5: Set profiles permissions
    try {
      await appwriteRequest(
        "PUT",
        `/databases/${databaseId}/collections/${profilesCollectionId}`,
        {
          name: "Profiles",
          permissions: [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
          ],
        }
      );
      console.log(`  ✓ Updated permissions for '${profilesCollectionId}'`);
    } catch (error: any) {
      console.error(`  ✗ Failed to update permissions: ${error.message}`);
    }

    // Step 6: Create addresses collection
    const addressesCollectionId = "addresses";
    let addressesCollection;
    try {
      addressesCollection = await appwriteRequest(
        "GET",
        `/databases/${databaseId}/collections/${addressesCollectionId}`
      );
      console.log(`✓ Collection '${addressesCollectionId}' already exists`);
    } catch (error: any) {
      if (error.code === 404) {
        try {
          addressesCollection = await appwriteRequest(
            "POST",
            `/databases/${databaseId}/collections`,
            {
              collectionId: addressesCollectionId,
              name: "Addresses",
              permissions: [
                Permission.read(Role.users()),
                Permission.write(Role.users()),
              ],
            }
          );
          console.log(`✓ Created collection '${addressesCollectionId}'`);
        } catch (createError: any) {
          console.error(`✗ Failed to create collection: ${createError.message}`);
          throw createError;
        }
      } else {
        throw error;
      }
    }

    // Step 7: Create addresses attributes
    const addressesStringAttributes = [
      { key: "userId", size: 36, required: true },
      { key: "parish", size: 100, required: true },
      { key: "details", size: 500, required: true },
    ];

    for (const attr of addressesStringAttributes) {
      try {
        await appwriteRequest(
          "POST",
          `/databases/${databaseId}/collections/${addressesCollectionId}/attributes/string`,
          {
            key: attr.key,
            size: attr.size,
            required: attr.required,
          }
        );
        console.log(`  ✓ Created attribute '${attr.key}' (string)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  - Attribute '${attr.key}' already exists`);
        } else {
          console.error(`  ✗ Failed to create attribute '${attr.key}': ${error.message}`);
        }
      }
    }

    // Create default boolean attribute
    try {
      await appwriteRequest(
        "POST",
        `/databases/${databaseId}/collections/${addressesCollectionId}/attributes/boolean`,
        {
          key: "default",
          required: true,
        }
      );
      console.log(`  ✓ Created attribute 'default' (boolean)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  - Attribute 'default' already exists`);
      } else {
        console.error(`  ✗ Failed to create attribute 'default': ${error.message}`);
      }
    }

    // Note: createdAt is automatically handled by Appwrite, no need to create it

    // Step 8: Create addresses indexes
    try {
      await appwriteRequest(
        "POST",
        `/databases/${databaseId}/collections/${addressesCollectionId}/indexes`,
        {
          key: "idx_userId",
          type: "key",
          attributes: ["userId"],
          orders: ["ASC"],
        }
      );
      console.log(`  ✓ Created index 'idx_userId' on addresses`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  - Index 'idx_userId' already exists`);
      } else {
        console.error(`  ✗ Failed to create index: ${error.message}`);
      }
    }

    // Step 9: Set addresses permissions
    try {
      await appwriteRequest(
        "PUT",
        `/databases/${databaseId}/collections/${addressesCollectionId}`,
        {
          name: "Addresses",
          permissions: [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
          ],
        }
      );
      console.log(`  ✓ Updated permissions for '${addressesCollectionId}'`);
    } catch (error: any) {
      console.error(`  ✗ Failed to update permissions: ${error.message}`);
    }

    console.log("\n✅ Database setup completed successfully!");
    console.log(`\nDatabase ID: ${databaseId}`);
    console.log(`Collections: ${profilesCollectionId}, ${addressesCollectionId}`);
    console.log("\nNote: Make sure to set APPWRITE_DATABASE_ID in your app configuration.");
  } catch (error: any) {
    console.error("\n❌ Database setup failed:", error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();

