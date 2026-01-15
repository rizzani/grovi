import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SearchSuggestion {
  id: string;
  text: string;
  type?: "product" | "category" | "store";
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  autoFocus?: boolean;
  onChangeText?: (query: string) => void;
}

export default function SearchBar({
  placeholder = "Search Product",
  onSearch,
  onSuggestionSelect,
  suggestions = [],
  showSuggestions = true,
  autoFocus = false,
  onChangeText,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Show autocomplete when focused and there are suggestions
  useEffect(() => {
    setShowAutocomplete(isFocused && showSuggestions && suggestions.length > 0 && query.length > 0);
  }, [isFocused, suggestions, query, showSuggestions]);

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
      Keyboard.dismiss();
      setShowAutocomplete(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowAutocomplete(false);
    Keyboard.dismiss();
    onSuggestionSelect?.(suggestion);
    // Also trigger search with the suggestion
    onSearch?.(suggestion.text);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay hiding autocomplete to allow suggestion press
    setTimeout(() => {
      setIsFocused(false);
      setShowAutocomplete(false);
    }, 200);
  };

  const filteredSuggestions = suggestions
    .filter((suggestion) =>
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 7); // Limit to 7 suggestions

  return (
    <View style={styles.container} collapsable={false}>
      <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            onChangeText?.(text);
          }}
          onSubmitEditing={handleSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.7}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {showAutocomplete && filteredSuggestions.length > 0 && (
        <View style={styles.autocompleteContainer} collapsable={false}>
          {filteredSuggestions.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.suggestionItem,
                index === filteredSuggestions.length - 1 && styles.suggestionItemLast,
              ]}
              onPress={() => handleSuggestionPress(item)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={
                  item.type === "category"
                    ? "list"
                    : item.type === "store"
                    ? "storefront"
                    : "search"
                }
                size={18}
                color="#6B7280"
                style={styles.suggestionIcon}
              />
              <Text style={styles.suggestionText} numberOfLines={1} ellipsizeMode="tail">
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    overflow: "visible",
  },
  searchContainerFocused: {
    borderColor: "#10B981",
    backgroundColor: "#FFFFFF",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
    margin: 0,
    height: 24,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  clearButton: {
    marginLeft: 8,
    padding: 0,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  autocompleteContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    height: 44, // Fixed height for each item
  },
  suggestionItemLast: {
    borderBottomWidth: 0, // Remove border from last item for cleaner look
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
});
