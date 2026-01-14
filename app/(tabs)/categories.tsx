import { useState, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../../components/SearchBar";
import { useSearch } from "../../contexts/SearchContext";
import { getSearchSuggestions } from "../../lib/search-service";

export default function CategoriesScreen() {
  const { performSearch } = useSearch();
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (query: string) => {
    performSearch(query);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    performSearch(suggestion.text);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <SearchBar
            placeholder="Search Product"
            onSearch={handleSearch}
            onSuggestionSelect={handleSuggestionSelect}
            suggestions={searchSuggestions}
            showSuggestions={true}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>Browse all categories</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchWrapper: {
    marginBottom: 24,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
});
