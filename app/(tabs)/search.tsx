import { useState, useEffect, useMemo, useRef } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import SearchBar from "../../components/SearchBar";
import ProductFilters from "../../components/ProductFilters";
import SortPicker from "../../components/SortPicker";
import { useSearch } from "../../contexts/SearchContext";
import { useUser } from "../../contexts/UserContext";
import { getSearchSuggestions, searchProducts, ProductFilters as ProductFiltersType, SearchResult } from "../../lib/search-service";
import { SortMode } from "../../lib/search/ranking";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { 
    performSearch, 
    recentSearches, 
    clearRecentSearches,
    filters,
    setFilters,
    sortMode,
    setSortMode,
    clearFiltersAndSort 
  } = useSearch();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update query when params change
  useEffect(() => {
    if (params.q) {
      setSearchQuery(params.q);
      handleSearch(params.q, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  // Load search suggestions as user types
  useEffect(() => {
    const loadSuggestions = async () => {
      if (searchQuery.trim().length > 0) {
        const suggestions = await getSearchSuggestions(searchQuery);
        setSearchSuggestions(suggestions);
      } else {
        setSearchSuggestions([]);
      }
    };

    const timeoutId = setTimeout(loadSuggestions, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async (query: string, currentFilters?: ProductFiltersType, currentSortMode?: SortMode) => {
    if (!query.trim()) {
      setAllSearchResults([]);
      // Note: Filters and sort mode are NOT reset when search query is cleared
      // They persist during the session and are only reset when explicitly cleared
      return;
    }

    setIsSearching(true);
    try {
      const filtersToUse = currentFilters !== undefined ? currentFilters : filters;
      const sortModeToUse = currentSortMode !== undefined ? currentSortMode : sortMode;
      const results = await searchProducts(query, 50, undefined, sortModeToUse, userId || null, filtersToUse);
      setAllSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setAllSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFiltersChange = (newFilters: ProductFiltersType) => {
    setFilters(newFilters);
    // Re-run search with new filters if we have a query
    if (searchQuery.trim()) {
      handleSearch(searchQuery, newFilters, sortMode);
    }
  };

  const handleSortChange = (newSortMode: SortMode) => {
    setSortMode(newSortMode);
    // Re-run search with new sort mode if we have a query
    if (searchQuery.trim()) {
      handleSearch(searchQuery, filters, newSortMode);
    }
  };

  const hasActiveFilters = () => {
    return !!(
      (filters.brands && filters.brands.length > 0) ||
      (filters.categoryIds && filters.categoryIds.length > 0) ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.inStock === false ||
      filters.deliveryParish
    );
  };

  const handleSuggestionSelect = (suggestion: any) => {
    performSearch(suggestion.text);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Search Bar - Fixed at top */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBarContainer}>
            <SearchBar
              placeholder="Search Product"
              onSearch={handleSearch}
              onSuggestionSelect={handleSuggestionSelect}
              suggestions={searchSuggestions}
              showSuggestions={true}
              onChangeText={setSearchQuery}
              autoFocus={false}
              recentSearches={recentSearches}
              onRecentSearchPress={(query) => performSearch(query)}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="filter"
              size={20}
              color={hasActiveFilters() ? "#FFFFFF" : "#111827"}
            />
            {hasActiveFilters() && (
              <View style={styles.filterBadge}>
                <View style={styles.filterBadgeDot} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Modal */}
      <ProductFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        userId={userId}
        visible={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sort and Filter Bar - Show when there are results */}
        {searchQuery && allSearchResults.length > 0 && !isSearching && (
          <View style={styles.sortFilterBar}>
            <SortPicker currentSort={sortMode} onSortChange={handleSortChange} />
            {hasActiveFilters() && (
              <TouchableOpacity
                style={styles.activeFiltersIndicator}
                onPress={() => setShowFilters(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="funnel" size={14} color="#10B981" />
                <Text style={styles.activeFiltersText}>
                  {(filters.brands?.length || 0) +
                    (filters.categoryIds?.length || 0) +
                    (filters.deliveryParish ? 1 : 0) +
                    (filters.inStock === false ? 1 : 0) +
                    (filters.minPrice || filters.maxPrice ? 1 : 0)}{" "}
                  active
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search Results or Empty State */}
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchQuery && allSearchResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader}>
              {allSearchResults.length} result{allSearchResults.length !== 1 ? "s" : ""} found
            </Text>
            <View style={styles.productsGrid}>
              {allSearchResults.map((result, index) => (
                <ProductCard key={`${result.sku}-${index}`} result={result} />
              ))}
            </View>
          </View>
        ) : searchQuery && allSearchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={hasActiveFilters() ? "funnel-outline" : "search-outline"} 
                size={64} 
                color="#D1D5DB" 
              />
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters() 
                ? "No products match your current filters. Try adjusting your filters or search query."
                : "We couldn't find any products matching your search."}
            </Text>
            {hasActiveFilters() && (
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setFilters({});
                    handleSearch(searchQuery, {}, sortMode);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustFiltersButton}
                  onPress={() => setShowFilters(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="options" size={18} color="#10B981" />
                  <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : !searchQuery.trim() && allSearchResults.length === 0 && recentSearches.length > 0 ? (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity
                onPress={clearRecentSearches}
                activeOpacity={0.7}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((query, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentSearchItem}
                onPress={() => performSearch(query)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.recentSearchIcon} />
                <Text style={styles.recentSearchText}>{query}</Text>
                <Ionicons name="arrow-forward" size={18} color="#9CA3AF" style={styles.recentSearchArrow} />
              </TouchableOpacity>
            ))}
          </View>
        ) : !searchQuery.trim() && allSearchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Search</Text>
            <Text style={styles.emptySubtitle}>
              Find products and stores
            </Text>
          </View>
        ) : null}
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
    paddingBottom: 24,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBarContainer: {
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#10B981",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyActions: {
    width: "100%",
    gap: 12,
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  adjustFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  adjustFiltersButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  recentSearchesContainer: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  recentSearchIcon: {
    marginRight: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  recentSearchArrow: {
    marginLeft: 8,
  },
  resultsContainer: {
    paddingTop: 8,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 16,
  },
  productsGrid: {
    gap: 12,
  },
  resultItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultImageContainer: {
    marginRight: 12,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  resultContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  resultBrand: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  resultCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  outOfStockLabel: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  sortFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  activeFiltersIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  activeFiltersText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productCardOutOfStock: {
    opacity: 0.6,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productHeader: {
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: "#6B7280",
  },
  productDetails: {
    marginBottom: 4,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  productStore: {
    fontSize: 12,
    color: "#9CA3AF",
    flex: 1,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
});

// Product Card Component
interface ProductCardProps {
  result: SearchResult;
}

/**
 * Transform Appwrite image URL with optimized parameters for list display
 * Appwrite Storage API: https://appwrite.io/docs/products/storage/images
 * NOTE: Transformations only work with /preview endpoint, not /view
 */
function getTransformedImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  // Check if it's an Appwrite storage URL
  // Appwrite URLs typically look like: /v1/storage/buckets/[bucketId]/files/[fileId]/view
  const isAppwriteStorageUrl = imageUrl.includes("/storage/buckets/") && imageUrl.includes("/files/");
  
  if (!isAppwriteStorageUrl) {
    // Not an Appwrite URL, return as-is (might be external URL or placeholder)
    if (__DEV__) {
      console.log("Not an Appwrite URL, skipping transformation:", imageUrl);
    }
    return imageUrl;
  }

  // IMPORTANT: Appwrite image transformations only work with /preview endpoint
  // Replace /view with /preview if present, or ensure /preview is used
  let transformedUrl = imageUrl;
  
  // Check if URL already has /preview or /view
  if (transformedUrl.includes("/preview")) {
    // Already using preview endpoint, no change needed
  } else if (transformedUrl.includes("/view")) {
    // Replace /view with /preview (transformations require preview endpoint)
    transformedUrl = transformedUrl.replace("/view", "/preview");
  } else {
    // URL might be like: /v1/storage/buckets/[id]/files/[id] or /v1/storage/buckets/[id]/files/[id]?
    // Need to add /preview before any query params
    const queryIndex = transformedUrl.indexOf("?");
    const hashIndex = transformedUrl.indexOf("#");
    const insertIndex = queryIndex !== -1 ? queryIndex : (hashIndex !== -1 ? hashIndex : transformedUrl.length);
    
    // Insert /preview before query params/hash, or at the end
    transformedUrl = transformedUrl.substring(0, insertIndex) + "/preview" + transformedUrl.substring(insertIndex);
  }

  // Get project ID for Appwrite URLs (required for preview)
  const projectId = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";

  // For list view cards (180px height), optimize images:
  // - Width: 360px (2x for retina displays, prevents upscaling blur)
  // - Height: 360px for square aspect ratio (good for product thumbnails)
  // - Quality: 85% for good balance of quality and file size
  // - Gravity: center to focus on center of image when cropping
  const transformations = new URLSearchParams();
  
  // Add project parameter if available (required for Appwrite preview)
  if (projectId) {
    transformations.set("project", projectId);
  }
  
  transformations.set("width", "360");
  transformations.set("height", "360");
  transformations.set("quality", "85");
  transformations.set("gravity", "center");

  // Handle URLs that might already have query params
  // Appwrite URLs can be absolute (https://...) or relative (/v1/storage/...)
  const isAbsoluteUrl = transformedUrl.startsWith("http") || transformedUrl.startsWith("//");
  
  if (isAbsoluteUrl) {
    // Parse absolute URL
    try {
      const url = new URL(transformedUrl);
      // Merge existing params with transformations (transformations override)
      transformations.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      return url.toString();
    } catch {
      // If URL parsing fails, append params manually
      const separator = transformedUrl.includes("?") ? "&" : "?";
      return `${transformedUrl}${separator}${transformations.toString()}`;
    }
  } else {
    // Relative URL - append params
    const separator = transformedUrl.includes("?") ? "&" : "?";
    return `${transformedUrl}${separator}${transformations.toString()}`;
  }
}

function ProductCard({ result }: ProductCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    // TODO: Navigate to product detail page
    // router.push(`/product/${result.product.$id}`);
  };

  const priceFormatted = `$${(result.priceJmdCents / 100).toFixed(2)}`;
  const originalUrl = result.product.primary_image_url;
  const imageUri = getTransformedImageUrl(originalUrl);
  
  // Debug: Log URLs to see what we're working with
  if (__DEV__ && originalUrl) {
    console.log("Original URL:", originalUrl);
    console.log("Transformed URL:", imageUri);
  }

  return (
    <TouchableOpacity
      style={[styles.productCard, !result.inStock && styles.productCardOutOfStock]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!result.inStock}
    >
      {/* Product Image - Left Side */}
      <View style={styles.productImageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
          </View>
        )}
      </View>

      {/* Product Info - Right Side */}
      <View style={styles.productInfo}>
        {/* Header Section */}
        <View style={styles.productHeader}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {result.product.title}
          </Text>
          {result.brand && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {result.brand}
            </Text>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.productDetails}>
          {/* Store Info */}
          <View style={styles.storeInfo}>
            <Ionicons name="storefront" size={12} color="#9CA3AF" />
            <Text style={styles.productStore} numberOfLines={1}>
              {result.storeLocation.display_name || result.storeLocation.name}
            </Text>
          </View>
        </View>

        {/* Footer Section - Price and Category */}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{priceFormatted}</Text>
          {result.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {result.category.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
