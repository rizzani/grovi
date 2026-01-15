import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProductFilters } from "./ProductFilters";

interface FilterButtonProps {
  onPress: () => void;
  activeFiltersCount: number;
}

export function FilterButton({ onPress, activeFiltersCount }: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        activeFiltersCount > 0 && styles.buttonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="filter"
        size={18}
        color={activeFiltersCount > 0 ? "#FFFFFF" : "#111827"}
      />
      <Text
        style={[
          styles.buttonText,
          activeFiltersCount > 0 && styles.buttonTextActive,
        ]}
      >
        Filters
      </Text>
      {activeFiltersCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeFiltersCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function getActiveFiltersCount(filters: ProductFilters, defaultPriceRange: { min: number; max: number }): number {
  let count = 0;
  
  if (filters.brands.length > 0) count += filters.brands.length;
  if (filters.categories.length > 0) count += filters.categories.length;
  if (filters.partnerStores.length > 0) count += filters.partnerStores.length;
  if (filters.inStock !== null) count += 1;
  if (filters.quickDelivery !== null) count += 1;
  if (filters.dietaryRestrictions.vegan) count += 1;
  if (filters.dietaryRestrictions.vegetarian) count += 1;
  if (filters.dietaryRestrictions.glutenFree) count += 1;
  if (filters.priceRange.min !== defaultPriceRange.min || 
      filters.priceRange.max !== defaultPriceRange.max) count += 1;
  
  return count;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
    position: "relative",
  },
  buttonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  buttonTextActive: {
    color: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
