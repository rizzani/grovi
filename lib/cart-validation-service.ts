import { Query } from "appwrite";
import { databases, databaseId } from "./appwrite-client";
import { Cart, CartItem } from "./cart-service";

/**
 * Cart Validation Service
 * 
 * Validates cart items against current product prices and availability
 * in real-time from the database.
 */

export interface CartItemValidation {
  /** The cart item being validated */
  item: CartItem;
  /** Whether the item is still available */
  isAvailable: boolean;
  /** Current price in JMD cents (from database) */
  currentPriceJmdCents: number | null;
  /** Whether the price has changed */
  priceChanged: boolean;
  /** Price difference (current - cart price) in JMD cents */
  priceDifference: number;
  /** Error message if validation failed */
  error?: string;
}

export interface CartValidationResult {
  /** All validation results for each cart item */
  validations: CartItemValidation[];
  /** Items that are no longer available */
  unavailableItems: CartItem[];
  /** Items with price changes */
  priceChangedItems: CartItemValidation[];
  /** Whether the cart is valid for checkout */
  isValid: boolean;
  /** Total number of issues found */
  issueCount: number;
}

const STORE_LOCATION_PRODUCT_COLLECTION_ID = "store_location_product";

/**
 * Validate a single cart item against current database state
 */
async function validateCartItem(item: CartItem): Promise<CartItemValidation> {
  try {
    // Query store_location_product to get current price and availability
    const response = await databases.listDocuments(
      databaseId,
      STORE_LOCATION_PRODUCT_COLLECTION_ID,
      [
        Query.equal("product_id", item.productId),
        Query.equal("store_location_id", item.storeId),
        Query.limit(1),
      ]
    );

    if (response.documents.length === 0) {
      // Product-store combination no longer exists
      return {
        item,
        isAvailable: false,
        currentPriceJmdCents: null,
        priceChanged: false,
        priceDifference: 0,
        error: "Product no longer available at this store",
      };
    }

    const storeProduct = response.documents[0];
    const currentPrice = storeProduct.price_jmd_cents as number;
    const isAvailable = storeProduct.in_stock as boolean;
    const priceChanged = currentPrice !== item.priceJmdCents;
    const priceDifference = currentPrice - item.priceJmdCents;

    return {
      item,
      isAvailable,
      currentPriceJmdCents: currentPrice,
      priceChanged,
      priceDifference,
      error: !isAvailable ? "Item is out of stock" : undefined,
    };
  } catch (error: any) {
    console.error(`Error validating cart item ${item.productId}-${item.storeId}:`, error);
    return {
      item,
      isAvailable: false,
      currentPriceJmdCents: null,
      priceChanged: false,
      priceDifference: 0,
      error: error.message || "Failed to validate item",
    };
  }
}

/**
 * Validate all items in a cart
 * Uses batching to efficiently validate multiple items
 */
export async function validateCart(cart: Cart): Promise<CartValidationResult> {
  if (cart.items.length === 0) {
    return {
      validations: [],
      unavailableItems: [],
      priceChangedItems: [],
      isValid: true,
      issueCount: 0,
    };
  }

  // Validate all items in parallel (with reasonable concurrency limit)
  const validationPromises = cart.items.map((item) => validateCartItem(item));
  const validations = await Promise.all(validationPromises);

  // Categorize results
  const unavailableItems = validations
    .filter((v) => !v.isAvailable)
    .map((v) => v.item);

  const priceChangedItems = validations.filter(
    (v) => v.isAvailable && v.priceChanged && v.currentPriceJmdCents !== null
  );

  const isValid = unavailableItems.length === 0;
  const issueCount = unavailableItems.length + priceChangedItems.length;

  return {
    validations,
    unavailableItems,
    priceChangedItems,
    isValid,
    issueCount,
  };
}

/**
 * Get updated cart with current prices and removed unavailable items
 */
export async function getUpdatedCart(cart: Cart): Promise<{
  updatedCart: Cart;
  removedItems: CartItem[];
  updatedItems: CartItem[];
}> {
  const validationResult = await validateCart(cart);
  const updatedItems: CartItem[] = [];
  const removedItems: CartItem[] = [];

  // Update cart items with current prices and remove unavailable items
  const updatedCartItems = cart.items
    .map((item) => {
      const validation = validationResult.validations.find(
        (v) => v.item.productId === item.productId && v.item.storeId === item.storeId
      );

      if (!validation) {
        return item; // Keep item as-is if validation failed
      }

      if (!validation.isAvailable) {
        removedItems.push(item);
        return null; // Remove unavailable items
      }

      if (validation.priceChanged && validation.currentPriceJmdCents !== null) {
        // Update price
        const updatedItem = {
          ...item,
          priceJmdCents: validation.currentPriceJmdCents,
        };
        updatedItems.push(updatedItem);
        return updatedItem;
      }

      return item; // No changes needed
    })
    .filter((item): item is CartItem => item !== null);

  // Recalculate totals
  const totalItems = updatedCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPriceJmdCents = updatedCartItems.reduce(
    (sum, item) => sum + item.priceJmdCents * item.quantity,
    0
  );
  const storeIds = Array.from(new Set(updatedCartItems.map((item) => item.storeId)));

  const updatedCart: Cart = {
    items: updatedCartItems,
    totalItems,
    totalPriceJmdCents,
    storeIds,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedCart,
    removedItems,
    updatedItems,
  };
}
