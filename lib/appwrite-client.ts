import { Client, Account } from "appwrite";
import Constants from "expo-constants";

// Get environment variables
const endpoint = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_ENDPOINT || 
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 
  "";

const projectId = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
  "";

if (!endpoint || !projectId) {
  console.warn(
    "Appwrite configuration missing. Please set EXPO_PUBLIC_APPWRITE_ENDPOINT and EXPO_PUBLIC_APPWRITE_PROJECT_ID in your .env file or app.json"
  );
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

// Initialize Account service
const account = new Account(client);

export { client, account };

