import { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "expo-router";
import { SearchSuggestion } from "../components/SearchBar";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  clearSearch: () => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

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
      return [query, ...filtered].slice(0, 10); // Keep last 10 searches
    });
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
