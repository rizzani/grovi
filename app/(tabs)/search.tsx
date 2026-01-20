import { useState, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../../components/SearchBar";
import ProductFilters from "../../components/ProductFilters";
import { useSearch } from "../../contexts/SearchContext";
import { useUser } from "../../contexts/UserContext";
import { getSearchSuggestions, searchProducts, ProductFilters as ProductFiltersType } from "../../lib/search-service";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { performSearch, recentSearches, clearRecentSearches } = useSearch();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<ProductFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);

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

  const handleSearch = async (query: string, currentFilters?: ProductFiltersType) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const filtersToUse = currentFilters !== undefined ? currentFilters : filters;
      const results = await searchProducts(query, 50, undefined, "relevance", userId || null, filtersToUse);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFiltersChange = (newFilters: ProductFiltersType) => {
    setFilters(newFilters);
    // Re-run search with new filters if we have a query
    if (searchQuery.trim()) {
      handleSearch(searchQuery, newFilters);
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Search Results or Empty State */}
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchQuery && searchResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
            </Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={result.sku || result.product.$id || index}
                style={styles.resultItem}
                activeOpacity={0.7}
              >
                {result.product.primary_image_url ? (
                  <View style={styles.resultImageContainer}>
                    {/* Image placeholder - you can use Image component here */}
                    <View style={styles.resultImage} />
                  </View>
                ) : null}
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {result.product.title}
                  </Text>
                  {result.brand && (
                    <Text style={styles.resultBrand}>{result.brand}</Text>
                  )}
                  {result.category && (
                    <Text style={styles.resultCategory}>{result.category.name}</Text>
                  )}
                  <View style={styles.resultFooter}>
                    <Text style={styles.resultPrice}>
                      JMD ${(result.priceJmdCents / 100).toFixed(2)}
                    </Text>
                    {!result.inStock && (
                      <Text style={styles.outOfStockLabel}>Out of stock</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchQuery && searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching for something else
            </Text>
          </View>
        ) : !searchQuery && recentSearches.length > 0 ? (
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
        ) : !searchQuery ? (
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
});
