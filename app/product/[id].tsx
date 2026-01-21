import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import ProductImageGallery from "../../components/ProductImageGallery";
import { databases, databaseId } from "../../lib/appwrite-client";
import { Query } from "appwrite";

interface ProductImageObject {
  fileId: string;
  url: string;
}

interface Product {
  $id: string;
  title: string;
  sku: string;
  brand?: string;
  description?: string;
  primary_image_url?: string;
  images?: ProductImageObject[] | string; // Array of image objects or JSON string
  category_leaf_id: string;
  rating?: number;
  review_count?: number;
}

interface StoreLocationProduct {
  $id: string;
  product_id: string;
  store_location_id: string;
  in_stock: boolean;
  price_jmd_cents: number;
  external_url?: string;
}

interface StoreLocation {
  $id: string;
  name: string;
  display_name: string;
  parish?: string;
  address_line1?: string;
  phone?: string;
}

interface Category {
  $id: string;
  name: string;
  parentId?: string;
}

/**
 * Transform Appwrite image URL for product detail view
 */
function getOptimizedImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  const isAppwriteStorageUrl = imageUrl.includes("/storage/buckets/") && imageUrl.includes("/files/");
  
  if (!isAppwriteStorageUrl) {
    return imageUrl;
  }

  // Use /view endpoint to avoid transformation billing limits
  let viewUrl = imageUrl;
  
  if (viewUrl.includes("/preview")) {
    viewUrl = viewUrl.replace("/preview", "/view");
  } else if (!viewUrl.includes("/view")) {
    const queryIndex = viewUrl.indexOf("?");
    const hashIndex = viewUrl.indexOf("#");
    const insertIndex = queryIndex !== -1 ? queryIndex : (hashIndex !== -1 ? hashIndex : viewUrl.length);
    viewUrl = viewUrl.substring(0, insertIndex) + "/view" + viewUrl.substring(insertIndex);
  }

  const projectId = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";

  if (projectId) {
    const separator = viewUrl.includes("?") ? "&" : "?";
    return `${viewUrl}${separator}project=${projectId}`;
  }

  return viewUrl;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [storeProducts, setStoreProducts] = useState<
    Array<{
      storeProduct: StoreLocationProduct;
      storeLocation: StoreLocation;
    }>
  >([]);
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadProductDetails();
  }, [id]);

  const loadProductDetails = async () => {
    if (!id) {
      setError("Invalid product ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch product details
      const productDoc = await databases.getDocument(
        databaseId,
        "products",
        id
      );
      
      const productData: Product = {
        $id: productDoc.$id,
        title: productDoc.title,
        sku: productDoc.sku,
        brand: productDoc.brand,
        description: productDoc.description,
        primary_image_url: productDoc.primary_image_url,
        images: productDoc.images,
        category_leaf_id: productDoc.category_leaf_id,
        rating: productDoc.rating,
        review_count: productDoc.review_count,
      };
      
      setProduct(productData);

      // Fetch store location products
      const storeProductsResponse = await databases.listDocuments(
        databaseId,
        "store_location_product",
        [
          Query.equal("product_id", id),
          Query.limit(100),
        ]
      );

      // Fetch store location details for each store product
      const storeProductsWithLocations = await Promise.all(
        storeProductsResponse.documents.map(async (doc) => {
          try {
            const storeLocationDoc = await databases.getDocument(
              databaseId,
              "store_location",
              doc.store_location_id
            );
            
            return {
              storeProduct: {
                $id: doc.$id,
                product_id: doc.product_id,
                store_location_id: doc.store_location_id,
                in_stock: doc.in_stock,
                price_jmd_cents: doc.price_jmd_cents,
                external_url: doc.external_url,
              },
              storeLocation: {
                $id: storeLocationDoc.$id,
                name: storeLocationDoc.name,
                display_name: storeLocationDoc.display_name,
                parish: storeLocationDoc.parish,
                address_line1: storeLocationDoc.address_line1,
                phone: storeLocationDoc.phone,
              },
            };
          } catch (err) {
            console.error("Error fetching store location:", err);
            return null;
          }
        })
      );

      setStoreProducts(storeProductsWithLocations.filter(Boolean) as any);

      // Fetch category if available
      if (productData.category_leaf_id) {
        try {
          const categoryDoc = await databases.getDocument(
            databaseId,
            "categories",
            productData.category_leaf_id
          );
          
          setCategory({
            $id: categoryDoc.$id,
            name: categoryDoc.name,
            parentId: categoryDoc.parentId,
          });
        } catch (err) {
          console.error("Error fetching category:", err);
        }
      }
    } catch (err: any) {
      console.error("Error loading product details:", err);
      setError(err.message || "Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error("Error opening external link:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorMessage}>
            {error || "Unable to load product details"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProductDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Parse images array if it's a string, otherwise use it directly
  let imageObjects: ProductImageObject[] = [];
  
  if (product.images) {
    // If images is a string (JSON), parse it
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        imageObjects = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse images JSON:', e);
        imageObjects = [];
      }
    } else if (Array.isArray(product.images)) {
      // If it's already an array, use it
      imageObjects = product.images;
    }
  }
  
  // Extract URLs from image objects
  const imageUrls = imageObjects
    .filter(img => img && img.url && typeof img.url === 'string')
    .map(img => img.url);
  
  // Use images array if available, fallback to primary_image_url
  const productImages = imageUrls.length > 0 
    ? imageUrls 
    : product.primary_image_url 
    ? [product.primary_image_url] 
    : [];
  
  // Optimize all image URLs and filter out invalid ones
  const images = productImages
    .filter(url => url && url.trim().length > 0)
    .map(url => getOptimizedImageUrl(url))
    .filter((url): url is string => url !== undefined);

  // Find lowest price and in-stock status
  const inStockProducts = storeProducts.filter((sp) => sp.storeProduct.in_stock);
  const lowestPrice = storeProducts.length > 0
    ? Math.min(...storeProducts.map((sp) => sp.storeProduct.price_jmd_cents))
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image Gallery */}
        <ProductImageGallery
          images={images}
          altText={product.title}
          showCounter={images.length > 1}
        />

        {/* Product Information */}
        <View style={styles.contentSection}>
          {/* Brand */}
          {product.brand && (
            <Text style={styles.brandText}>{product.brand}</Text>
          )}

          {/* Title */}
          <Text style={styles.productTitle}>{product.title}</Text>

          {/* Category Badge */}
          {category && (
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag" size={14} color="#6B7280" />
              <Text style={styles.categoryText}>{category.name}</Text>
            </View>
          )}

          {/* Price */}
          {lowestPrice && (
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.priceText}>
                ${(lowestPrice / 100).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.stockSection}>
            {inStockProducts.length > 0 ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.stockTextInStock}>
                  Available at {inStockProducts.length} store
                  {inStockProducts.length !== 1 ? "s" : ""}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.stockTextOutOfStock}>Out of stock</Text>
              </>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Product Details - Only show if there's a rating */}
          {product.rating && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rating</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FCD34D" />
                  <Text style={styles.detailValue}>
                    {product.rating.toFixed(1)}
                  </Text>
                  {product.review_count && (
                    <Text style={styles.reviewCount}>
                      ({product.review_count} reviews)
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Available Stores */}
          {storeProducts.length > 0 && (
            <View style={styles.storesSection}>
              <Text style={styles.sectionTitle}>Available at these stores</Text>
              {storeProducts.map(({ storeProduct, storeLocation }) => (
                <View
                  key={storeProduct.$id}
                  style={[
                    styles.storeCard,
                    !storeProduct.in_stock && styles.storeCardOutOfStock,
                  ]}
                >
                  <View style={styles.storeCardHeader}>
                    <View style={styles.storeInfo}>
                      <Ionicons name="storefront" size={20} color="#10B981" />
                      <Text style={styles.storeName}>
                        {storeLocation.display_name || storeLocation.name}
                      </Text>
                    </View>
                    <Text style={styles.storePrice}>
                      ${(storeProduct.price_jmd_cents / 100).toFixed(2)}
                    </Text>
                  </View>

                  {storeLocation.parish && (
                    <Text style={styles.storeLocation}>
                      <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                      {" "}{storeLocation.parish}
                    </Text>
                  )}

                  <View style={styles.storeFooter}>
                    {storeProduct.in_stock ? (
                      <View style={styles.inStockBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.inStockText}>In Stock</Text>
                      </View>
                    ) : (
                      <View style={styles.outOfStockBadge}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      </View>
                    )}

                    {storeProduct.external_url && (
                      <TouchableOpacity
                        style={styles.visitStoreButton}
                        onPress={() => handleExternalLink(storeProduct.external_url!)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.visitStoreButtonText}>Visit Store</Text>
                        <Ionicons name="open-outline" size={14} color="#10B981" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#10B981",
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  contentSection: {
    padding: 16,
  },
  brandText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 32,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  priceText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#10B981",
  },
  stockSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 24,
  },
  stockTextInStock: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  stockTextOutOfStock: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  storesSection: {
    marginBottom: 24,
  },
  storeCard: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  storeCardOutOfStock: {
    opacity: 0.6,
  },
  storeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  storePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  storeLocation: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  storeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
  },
  inStockText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  outOfStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
  },
  outOfStockText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  visitStoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  visitStoreButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },
});
