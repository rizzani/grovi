import { SearchSuggestion } from "../components/SearchBar";

// Mock suggestions - in production, this would fetch from an API
const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { id: "1", text: "Apples", type: "product" },
  { id: "2", text: "Bananas", type: "product" },
  { id: "3", text: "Organic Fruits", type: "category" },
  { id: "4", text: "Fresh Vegetables", type: "category" },
  { id: "5", text: "Dairy Products", type: "category" },
  { id: "6", text: "Whole Milk", type: "product" },
  { id: "7", text: "Fresh Foods Market", type: "store" },
  { id: "8", text: "Bread", type: "product" },
  { id: "9", text: "Eggs", type: "product" },
  { id: "10", text: "Chicken", type: "product" },
];

/**
 * Get search suggestions based on query
 * In production, this would make an API call to get real suggestions
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Filter suggestions that match the query
  const matching = MOCK_SUGGESTIONS.filter((suggestion) =>
    suggestion.text.toLowerCase().includes(normalizedQuery)
  );

  // Sort by relevance (exact matches first, then partial matches)
  const sorted = matching.sort((a, b) => {
    const aStartsWith = a.text.toLowerCase().startsWith(normalizedQuery);
    const bStartsWith = b.text.toLowerCase().startsWith(normalizedQuery);

    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.text.localeCompare(b.text);
  });

  return sorted.slice(0, limit);
}

/**
 * Perform a product search
 * In production, this would make an API call to search products
 */
export async function searchProducts(query: string): Promise<any[]> {
  // Placeholder - would fetch from API in production
  console.log("Searching for products with query:", query);
  return [];
}
