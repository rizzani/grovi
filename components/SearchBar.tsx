import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
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

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.text.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
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
        <View style={styles.autocompleteContainer}>
          <FlatList
            data={filteredSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
                activeOpacity={0.7}
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
                <Text style={styles.suggestionText}>{item.text}</Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
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
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
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
    maxHeight: 300,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
