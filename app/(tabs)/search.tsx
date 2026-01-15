import { useState, useEffect, useMemo } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../../components/SearchBar";
import { useSearch } from "../../contexts/SearchContext";
import { useUser } from "../../contexts/UserContext";
import { getSearchSuggestions, searchProducts, SearchResult } from "../../lib/search-service";
import { ProductFiltersComponent, ProductFilters, FilterOptions } from "../../components/ProductFilters";
import { FilterButton, getActiveFiltersCount } from "../../components/FilterButton";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { performSearch, recentSearches, clearRecentSearches } = useSearch();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Extract filter options from search results
  const filterOptions = useMemo<FilterOptions>(() => {
    if (searchResults.length === 0) {
      return {
        brands: [],
        categories: [],
        partnerStores: [],
        priceRange: { min: 0, max: 100000 }, // Default range in cents ($0 - $1000)
      };
    }

    const brands = new Set<string>();
    const categories = new Set<string>();
    const stores = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    searchResults.forEach((result) => {
      if (result.brand) brands.add(result.brand);
      if (result.category?.name) categories.add(result.category.name);
      if (result.storeLocation?.display_name) stores.add(result.storeLocation.display_name);
      
      const price = result.priceJmdCents;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    });

    return {
      brands: Array.from(brands).sort(),
      categories: Array.from(categories).sort(),
      partnerStores: Array.from(stores).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 100000 : maxPrice,
      },
    };
  }, [searchResults]);

  // Initialize filters with default values
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    priceRange: filterOptions.priceRange,
    brands: [],
    categories: [],
    partnerStores: [],
    inStock: null,
    quickDelivery: null,
    dietaryRestrictions: {
      vegan: false,
      vegetarian: false,
      glutenFree: false,
    },
  }));

  // Update price range when filter options change
  useEffect(() => {
    if (filterOptions.priceRange.min !== filters.priceRange.min || 
        filterOptions.priceRange.max !== filters.priceRange.max) {
      setFilters((prev) => ({
        ...prev,
        priceRange: filterOptions.priceRange,
      }));
    }
  }, [filterOptions.priceRange]);

  // Update query when params change
  useEffect(() => {
    if (params.q) {
      setSearchQuery(params.q);
      handleSearch(params.q);
    }
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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchProducts(query, 50, undefined, "relevance", userId || null);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    performSearch(suggestion.text);
  };

  // Apply filters to search results
  const filteredResults = useMemo(() => {
    return searchResults.filter((result) => {
      // Price range filter
      if (result.priceJmdCents < filters.priceRange.min || 
          result.priceJmdCents > filters.priceRange.max) {
        return false;
      }

      // Brand filter
      if (filters.brands.length > 0 && result.brand && 
          !filters.brands.includes(result.brand)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && result.category?.name && 
          !filters.categories.includes(result.category.name)) {
        return false;
      }

      // Partner store filter
      if (filters.partnerStores.length > 0 && result.storeLocation?.display_name && 
          !filters.partnerStores.includes(result.storeLocation.display_name)) {
        return false;
      }

      // In stock filter
      if (filters.inStock !== null && result.inStock !== filters.inStock) {
        return false;
      }

      // Quick delivery filter (placeholder - would need actual data)
      // if (filters.quickDelivery !== null && result.quickDelivery !== filters.quickDelivery) {
      //   return false;
      // }

      // Dietary restrictions (placeholder - would need actual product data)
      // These would need to be checked against product attributes

      return true;
    });
  }, [searchResults, filters]);

  const activeFiltersCount = getActiveFiltersCount(filters, filterOptions.priceRange);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Search Bar - Fixed at top */}
      <View style={styles.searchWrapper}>
        <SearchBar
          placeholder="Search Product"
          onSearch={handleSearch}
          onSuggestionSelect={handleSuggestionSelect}
          suggestions={searchSuggestions}
          showSuggestions={true}
          onChangeText={setSearchQuery}
          autoFocus={!params.q}
          recentSearches={recentSearches}
          onRecentSearchPress={(query) => performSearch(query)}
        />
      </View>

      {/* Filters and Results Header */}
      {searchQuery && searchResults.length > 0 && (
        <View style={styles.filtersHeader}>
          <Text style={styles.resultsCount}>
            {filteredResults.length} {filteredResults.length === 1 ? "result" : "results"}
          </Text>
          <FilterButton
            onPress={() => setShowFilters(true)}
            activeFiltersCount={activeFiltersCount}
          />
        </View>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && searchQuery && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {filters.brands.map((brand) => (
              <View key={`brand-${brand}`} style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>{brand}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      brands: prev.brands.filter((b) => b !== brand),
                    }));
                  }}
                  style={styles.removeFilterButton}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.categories.map((category) => (
              <View key={`category-${category}`} style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>{category}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      categories: prev.categories.filter((c) => c !== category),
                    }));
                  }}
                  style={styles.removeFilterButton}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.partnerStores.map((store) => (
              <View key={`store-${store}`} style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>{store}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      partnerStores: prev.partnerStores.filter((s) => s !== store),
                    }));
                  }}
                  style={styles.removeFilterButton}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.inStock !== null && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>In Stock</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({ ...prev, inStock: null }));
                  }}
                  style={styles.removeFilterButton}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            {filters.quickDelivery !== null && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>Quick Delivery</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({ ...prev, quickDelivery: null }));
                  }}
                  style={styles.removeFilterButton}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            {(filters.dietaryRestrictions.vegan ||
              filters.dietaryRestrictions.vegetarian ||
              filters.dietaryRestrictions.glutenFree) && (
              <>
                {filters.dietaryRestrictions.vegan && (
                  <View style={styles.activeFilterTag}>
                    <Text style={styles.activeFilterText}>Vegan</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          dietaryRestrictions: {
                            ...prev.dietaryRestrictions,
                            vegan: false,
                          },
                        }));
                      }}
                      style={styles.removeFilterButton}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.dietaryRestrictions.vegetarian && (
                  <View style={styles.activeFilterTag}>
                    <Text style={styles.activeFilterText}>Vegetarian</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          dietaryRestrictions: {
                            ...prev.dietaryRestrictions,
                            vegetarian: false,
                          },
                        }));
                      }}
                      style={styles.removeFilterButton}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.dietaryRestrictions.glutenFree && (
                  <View style={styles.activeFilterTag}>
                    <Text style={styles.activeFilterText}>Gluten-free</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          dietaryRestrictions: {
                            ...prev.dietaryRestrictions,
                            glutenFree: false,
                          },
                        }));
                      }}
                      style={styles.removeFilterButton}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}

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
        ) : searchQuery && filteredResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              {searchResults.length === 0
                ? "Try searching for something else"
                : "Try adjusting your filters"}
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

        {/* Search Results List */}
        {searchQuery && filteredResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {filteredResults.map((result, index) => (
              <View key={`${result.product.$id}-${index}`} style={styles.resultItem}>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.product.title}</Text>
                  {result.brand && (
                    <Text style={styles.resultBrand}>{result.brand}</Text>
                  )}
                  <View style={styles.resultFooter}>
                    <Text style={styles.resultPrice}>
                      ${(result.priceJmdCents / 100).toFixed(2)}
                    </Text>
                    {result.storeLocation?.display_name && (
                      <Text style={styles.resultStore}>
                        {result.storeLocation.display_name}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <ProductFiltersComponent
            filters={filters}
            options={filterOptions}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        </SafeAreaView>
      </Modal>
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
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeFiltersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  removeFilterButton: {
    padding: 2,
  },
  resultsContainer: {
    paddingTop: 16,
    gap: 12,
  },
  resultItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultContent: {
    gap: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  resultBrand: {
    fontSize: 14,
    color: "#6B7280",
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
  resultStore: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
