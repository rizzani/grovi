import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { SearchSuggestion } from "../components/SearchBar";
import { ProductFilters } from "../lib/search-service";
import { SortMode } from "../lib/search/ranking";

const RECENT_SEARCHES_KEY_PREFIX = "recent_searches_";
const MAX_RECENT_SEARCHES = 10;

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  clearSearch: () => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => Promise<void>;
  // Filter and Sort State (session-only persistence)
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  clearFiltersAndSort: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const { userId } = useUser();
  const router = useRouter();

  // Get storage key for current user (or default for non-authenticated users)
  const getStorageKey = (user: string | null) => {
    return `${RECENT_SEARCHES_KEY_PREFIX}${user || "anonymous"}`;
  };

  // Load recent searches from storage
  const loadRecentSearches = async (user: string | null) => {
    try {
      const storageKey = getStorageKey(user);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const searches = JSON.parse(stored) as string[];
        setRecentSearches(searches);
      } else {
        setRecentSearches([]);
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
      setRecentSearches([]);
    }
  };

  // Save recent searches to storage
  const saveRecentSearches = async (searches: string[], user: string | null) => {
    try {
      const storageKey = getStorageKey(user);
      await AsyncStorage.setItem(storageKey, JSON.stringify(searches));
    } catch (error) {
      console.error("Error saving recent searches:", error);
    }
  };

  // Load recent searches when userId changes
  useEffect(() => {
    loadRecentSearches(userId);
  }, [userId]);

  const performSearch = (query: string) => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    addRecentSearch(trimmedQuery);

    // Navigate to search results screen
    // For now, we'll navigate to the search tab with the query
    router.push({
      pathname: "/(tabs)/search",
      params: { q: trimmedQuery },
    });
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const addRecentSearch = (query: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== query.toLowerCase());
      const newSearches = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      // Save to storage asynchronously
      saveRecentSearches(newSearches, userId);
      return newSearches;
    });
  };

  const clearRecentSearches = async () => {
    try {
      const storageKey = getStorageKey(userId);
      await AsyncStorage.removeItem(storageKey);
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  const clearFiltersAndSort = () => {
    setFilters({});
    setSortMode("relevance");
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        performSearch,
        clearSearch,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        filters,
        setFilters,
        sortMode,
        setSortMode,
        clearFiltersAndSort,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
