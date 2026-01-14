import { databases, databaseId } from "./appwrite-client";
import { ID, Query, Permission, Role } from "appwrite";

const PROFILES_COLLECTION_ID = "profiles";
const ADDRESSES_COLLECTION_ID = "addresses";

export interface Profile {
  $id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Kept for backward compatibility during migration
  phone: string;
  email: string;
  createdAt: string;
}

export interface Address {
  $id: string;
  userId: string;
  parish: string;
  details: string;
  default: boolean;
  createdAt: string;
}

export interface CreateProfileParams {
  userId: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Kept for backward compatibility during migration
}

export interface CreateAddressParams {
  userId: string;
  parish: string;
  details: string;
  isDefault: boolean;
}

export interface UpdateAddressParams {
  addressId: string;
  parish?: string;
  details?: string;
  isDefault?: boolean;
}

/**
 * Splits a full name into firstName and lastName
 * Handles various name formats (single name, two names, multiple names)
 */
function splitName(fullName?: string | null): { firstName?: string; lastName?: string } {
  if (!fullName || !fullName.trim()) {
    return {};
  }

  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) {
    return {};
  } else if (parts.length === 1) {
    // Single name - use as firstName
    return { firstName: parts[0] };
  } else {
    // Multiple names - first is firstName, rest combined as lastName
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }
}

export async function createOrUpdateProfile(
  params: CreateProfileParams
): Promise<Profile> {
  try {
    const { userId, email, phone, firstName, lastName, name } = params;

    // Determine firstName and lastName
    // Priority: explicit firstName/lastName > split from name > existing profile values
    let finalFirstName = firstName;
    let finalLastName = lastName;

    // If name is provided but firstName/lastName are not, split the name
    if ((!finalFirstName && !finalLastName) && name) {
      const split = splitName(name);
      finalFirstName = split.firstName;
      finalLastName = split.lastName;
    }

    // Check if profile already exists
    try {
      const existingProfiles = await databases.listDocuments(
        databaseId,
        PROFILES_COLLECTION_ID,
        [Query.equal("userId", userId), Query.limit(1)]
      );

      if (existingProfiles.documents.length > 0) {
        // Update existing profile
        const existingProfile = existingProfiles.documents[0] as Profile;
        
        // If we don't have firstName/lastName, try to get from existing profile or split existing name
        if (!finalFirstName && !finalLastName) {
          if (existingProfile.firstName || existingProfile.lastName) {
            finalFirstName = finalFirstName || existingProfile.firstName;
            finalLastName = finalLastName || existingProfile.lastName;
          } else if (existingProfile.name) {
            const split = splitName(existingProfile.name);
            finalFirstName = split.firstName;
            finalLastName = split.lastName;
          }
        }

        const updateData: any = {
          email,
          phone,
        };

        // Update firstName and lastName
        if (finalFirstName !== undefined) {
          updateData.firstName = finalFirstName || null;
        }
        if (finalLastName !== undefined) {
          updateData.lastName = finalLastName || null;
        }

        // Keep name for backward compatibility (generate from firstName + lastName if needed)
        if (finalFirstName || finalLastName) {
          const fullName = [finalFirstName, finalLastName].filter(Boolean).join(" ").trim() || null;
          updateData.name = fullName;
        } else if (name !== undefined) {
          updateData.name = name || null;
        }

        const updatedProfile = await databases.updateDocument(
          databaseId,
          PROFILES_COLLECTION_ID,
          existingProfile.$id,
          updateData
        );
        return updatedProfile as Profile;
      }
    } catch (error: any) {
      // If query fails, continue to create new profile
      if (error.code !== 404) {
        throw error;
      }
    }

    // Create new profile with document-level permissions
    // Note: createdAt is automatically set by Appwrite
    // Permissions ensure only the user can read/write their own profile
    const fullName = [finalFirstName, finalLastName].filter(Boolean).join(" ").trim() || null;
    
    const newProfile = await databases.createDocument(
      databaseId,
      PROFILES_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        email,
        phone,
        firstName: finalFirstName || null,
        lastName: finalLastName || null,
        name: fullName, // Keep for backward compatibility
      },
      [
        Permission.read(Role.user(userId)),
        Permission.write(Role.user(userId)),
      ]
    );

    return newProfile as Profile;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to create/update profile";
    console.error("Profile creation error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves a user's profile by userId
 * @param userId - User ID
 * @returns Promise with the profile or null if not found
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const result = await databases.listDocuments(
      databaseId,
      PROFILES_COLLECTION_ID,
      [Query.equal("userId", userId), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return result.documents[0] as Profile;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve profile";
    console.error("Profile retrieval error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Creates a new address for a user
 * @param params - Address data
 * @returns Promise with the created address
 */
export async function createAddress(
  params: CreateAddressParams
): Promise<Address> {
  try {
    const { userId, parish, details, isDefault } = params;

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await unsetDefaultAddresses(userId);
    }

    // Note: createdAt is automatically set by Appwrite
    // Permissions ensure only the user can read/write their own addresses
    const newAddress = await databases.createDocument(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        parish,
        details,
        default: isDefault,
      },
      [
        Permission.read(Role.user(userId)),
        Permission.write(Role.user(userId)),
      ]
    );

    return newAddress as Address;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to create address";
    console.error("Address creation error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves all addresses for a user
 * @param userId - User ID
 * @returns Promise with array of addresses
 */
export async function getAddresses(userId: string): Promise<Address[]> {
  try {
    const result = await databases.listDocuments(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      [Query.equal("userId", userId)]
    );

    return result.documents as Address[];
  } catch (error: any) {
    const errorMessage = error.message || "Failed to retrieve addresses";
    console.error("Address retrieval error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Updates an existing address
 * @param params - Address update data
 * @returns Promise with the updated address
 */
export async function updateAddress(
  params: UpdateAddressParams
): Promise<Address> {
  try {
    const { addressId, parish, details, isDefault } = params;

    // Get current address to check userId
    const currentAddress = await databases.getDocument(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      addressId
    ) as Address;

    // If setting as default, unset other default addresses
    if (isDefault === true) {
      await unsetDefaultAddresses(currentAddress.userId);
    }

    const updateData: any = {};
    if (parish !== undefined) updateData.parish = parish;
    if (details !== undefined) updateData.details = details;
    if (isDefault !== undefined) updateData.default = isDefault;

    const updatedAddress = await databases.updateDocument(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      addressId,
      updateData
    );

    return updatedAddress as Address;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to update address";
    console.error("Address update error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Deletes an address
 * @param addressId - Address document ID
 * @returns Promise that resolves when address is deleted
 */
export async function deleteAddress(addressId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      addressId
    );
  } catch (error: any) {
    const errorMessage = error.message || "Failed to delete address";
    console.error("Address deletion error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Sets an address as the default address for a user
 * Unsets all other addresses for that user
 * @param userId - User ID
 * @param addressId - Address document ID to set as default
 * @returns Promise with the updated address
 */
export async function setDefaultAddress(
  userId: string,
  addressId: string
): Promise<Address> {
  try {
    // Unset all other default addresses
    await unsetDefaultAddresses(userId);

    // Set this address as default
    const updatedAddress = await databases.updateDocument(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      addressId,
      {
        default: true,
      }
    );

    return updatedAddress as Address;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to set default address";
    console.error("Set default address error:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Helper function to unset all default addresses for a user
 * @param userId - User ID
 */
async function unsetDefaultAddresses(userId: string): Promise<void> {
  try {
    // Get all addresses for this user that are currently default
    const result = await databases.listDocuments(
      databaseId,
      ADDRESSES_COLLECTION_ID,
      [Query.equal("userId", userId), Query.equal("default", true)]
    );

    // Unset each default address
    for (const address of result.documents) {
      await databases.updateDocument(
        databaseId,
        ADDRESSES_COLLECTION_ID,
        address.$id,
        {
          default: false,
        }
      );
    }
  } catch (error: any) {
    // Log but don't throw - this is a helper function
    console.warn("Failed to unset default addresses:", error.message);
  }
}

