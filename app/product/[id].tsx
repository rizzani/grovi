import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getProduct, Product, formatPrice, getProductImageUrl } from "../../lib/product-service";
import { useCart } from "../../contexts/CartContext";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProduct = await getProduct(id!);
      if (!fetchedProduct) {
        setError("Product not found");
      } else {
        setProduct(fetchedProduct);
      }
    } catch (err: any) {
      console.error("Error fetching product:", err);
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContainer}>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || "Product not found"}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchProduct}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = getProductImageUrl(product);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
          activeOpacity={0.7}
        >
          <Ionicons name="cart-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.productTitle}>{product.title}</Text>
          
          {product.brand && (
            <Text style={styles.brand}>{product.brand}</Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatPrice(product.price_jmd_cents, product.price_currency)}
            </Text>
            {product.unit_size && (
              <Text style={styles.unitSize}>{product.unit_size}</Text>
            )}
          </View>

          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stock Status</Text>
              <View style={[styles.stockBadge, product.in_stock ? styles.inStock : styles.outOfStock]}>
                <Text style={styles.stockText}>
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>

            {product.net_weight && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Net Weight</Text>
                <Text style={styles.detailValue}>{product.net_weight}</Text>
              </View>
            )}

            {product.package_quantity && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Package Quantity</Text>
                <Text style={styles.detailValue}>{product.package_quantity}</Text>
              </View>
            )}
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity 
            style={[styles.addToCartButton, !product.in_stock && styles.addToCartButtonDisabled]}
            activeOpacity={0.7}
            disabled={!product.in_stock || addingToCart}
            onPress={async () => {
              if (product.in_stock) {
                setAddingToCart(true);
                addToCart(product, 1);
                setTimeout(() => {
                  setAddingToCart(false);
                }, 500);
              }
            }}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cart" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.addToCartText}>
              {product.in_stock ? "Add to Cart" : "Out of Stock"}
            </Text>
          </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  cartButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#F9FAFB",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  infoContainer: {
    padding: 20,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  brand: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 24,
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
  },
  unitSize: {
    fontSize: 16,
    color: "#6B7280",
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inStock: {
    backgroundColor: "#D1FAE5",
  },
  outOfStock: {
    backgroundColor: "#FEE2E2",
  },
  stockText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  addToCartButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#10B981",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
