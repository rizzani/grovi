import { Text, View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { getCategories, Category } from "../../lib/category-service";
import { getFeaturedProducts, Product, formatPrice, getProductImageUrl } from "../../lib/product-service";
import { useCart } from "../../contexts/CartContext";

// Section Header Component
function SectionHeader({ 
  title, 
  showSeeAll = false, 
  onSeeAllPress 
}: { 
  title: string; 
  showSeeAll?: boolean; 
  onSeeAllPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <View style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { getTotalItems } = useCart();
  const deliveryAddress = "6382 East Greater Parkway";
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch categories (excluding depth 0)
      const allCategories = await getCategories();
      const filteredCategories = allCategories.filter(
        (cat) => cat.depth !== 0 && cat.depth !== undefined
      );
      setCategories(filteredCategories);

      // Fetch featured products
      const featured = await getFeaturedProducts(10);
      console.log("Featured products sample:", featured[0]?.primary_image_url);
      setFeaturedProducts(featured);

      // Fetch popular products (same as featured for now)
      const popular = await getFeaturedProducts(10);
      setPopularProducts(popular);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get top categories for the grid (first 4)
  const topCategories = categories.slice(0, 4);
  // Get categories for filters (first 6)
  const filterCategories = categories.slice(0, 6);

  // Category icon mapping
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes("coffee") || name.includes("tea")) return "cafe";
    if (name.includes("beverage")) return "water";
    if (name.includes("dairy") || name.includes("egg")) return "nutrition";
    if (name.includes("bread") || name.includes("bakery")) return "restaurant";
    if (name.includes("snack")) return "fast-food";
    if (name.includes("frozen")) return "snow";
    if (name.includes("seafood") || name.includes("fish")) return "fish";
    if (name.includes("candy") || name.includes("chocolate")) return "ice-cream";
    return "grid";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={18} color="#10B981" />
            <Text style={styles.deliverToText}>Deliver To</Text>
            <Text style={styles.addressText}>{deliveryAddress}</Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.push("/cart")}
            style={styles.cartButtonContainer}
          >
            <Ionicons name="cart-outline" size={24} color="#111827" />
            {getTotalItems() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {getTotalItems() > 99 ? "99+" : getTotalItems()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Quick Category Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={styles.categoryFiltersContent}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            filterCategories.map((category) => (
              <TouchableOpacity 
                key={category.$id} 
                style={styles.categoryFilter}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: "/products",
                  params: { categoryId: category.$id, categoryName: category.name }
                })}
              >
                <Ionicons 
                  name={getCategoryIcon(category.name)} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.categoryFilterText} numberOfLines={1}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Shop By Store Section */}
        <View style={styles.section}>
          <SectionHeader title="Shop By Store" showSeeAll />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Fresh Foods Market</Text>
            </View>
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Local Deli</Text>
            </View>
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Store Name</Text>
            </View>
          </ScrollView>
        </View>

        {/* Buy Again Section */}
        <View style={styles.section}>
          <SectionHeader title="Buy Again" />
          {loading ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {popularProducts.slice(0, 5).map((product) => {
                const imageUrl = getProductImageUrl(product);
                return (
                  <TouchableOpacity 
                    key={product.$id} 
                    style={styles.productCard} 
                    activeOpacity={0.7}
                    onPress={() => router.push(`/product/${product.$id}`)}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
                        onError={() => console.log("Image failed to load:", imageUrl)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.title}
                  </Text>
                  {product.brand && (
                    <Text style={styles.productBrand} numberOfLines={1}>
                      {product.brand}
                    </Text>
                  )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Popular Near You Section */}
        <View style={styles.section}>
          <SectionHeader title="Popular Near You" showSeeAll />
          {loading ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {popularProducts.slice(5, 10).map((product) => {
                const imageUrl = getProductImageUrl(product);
                return (
                  <TouchableOpacity 
                    key={product.$id} 
                    style={styles.productCard} 
                    activeOpacity={0.7}
                    onPress={() => router.push(`/product/${product.$id}`)}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
                        onError={() => console.log("Image failed to load:", imageUrl)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.title}
                    </Text>
                    {product.brand && (
                      <Text style={styles.productBrand} numberOfLines={1}>
                        {product.brand}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Featured Products Section */}
        <View style={styles.section}>
          <SectionHeader title="Featured Products" showSeeAll />
          {loading ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {featuredProducts.map((product) => {
                const imageUrl = getProductImageUrl(product);
                return (
                  <TouchableOpacity 
                    key={product.$id} 
                    style={styles.productCard} 
                    activeOpacity={0.7}
                    onPress={() => router.push(`/product/${product.$id}`)}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
                        onError={() => console.log("Image failed to load:", imageUrl)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatPrice(product.price_jmd_cents, product.price_currency)}
                    </Text>
                    {product.unit_size && (
                      <Text style={styles.productUnit}>{product.unit_size}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Top Categories Section */}
        <View style={styles.section}>
          <SectionHeader title="Top Categories" />
          {loading ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.categoriesGrid}>
              {topCategories.map((category) => (
                <TouchableOpacity 
                  key={category.$id} 
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: "/products",
                    params: { categoryId: category.$id, categoryName: category.name }
                  })}
                >
                  <View style={styles.categoryImagePlaceholder}>
                    <Ionicons 
                      name={getCategoryIcon(category.name)} 
                      size={32} 
                      color="#9CA3AF" 
                    />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Bottom spacing for safe area */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  deliverToText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  addressText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
  },
  cartButtonContainer: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  categoryFilters: {
    marginBottom: 24,
  },
  categoryFiltersContent: {
    gap: 12,
    paddingRight: 16,
  },
  categoryFilter: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  categoryFilterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  seeAllText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  horizontalScroll: {
    marginHorizontal: -4,
  },
  horizontalScrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  storeCard: {
    alignItems: "center",
    width: 100,
  },
  storeImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    textAlign: "center",
  },
  productCard: {
    width: 140,
  },
  productImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  productImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "47%",
    aspectRatio: 1,
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  bottomSpacing: {
    height: 20,
  },
});
