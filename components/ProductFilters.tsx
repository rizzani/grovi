import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PriceRangeSlider } from "./PriceRangeSlider";

export interface ProductFilters {
  priceRange: {
    min: number;
    max: number;
  };
  brands: string[];
  categories: string[];
  partnerStores: string[];
  inStock: boolean | null;
  quickDelivery: boolean | null;
  dietaryRestrictions: {
    vegan: boolean;
    vegetarian: boolean;
    glutenFree: boolean;
  };
}

export interface FilterOptions {
  brands: string[];
  categories: string[];
  partnerStores: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

interface ProductFiltersProps {
  filters: ProductFilters;
  options: FilterOptions;
  onFiltersChange: (filters: ProductFilters) => void;
  onClose?: () => void;
}

export function ProductFiltersComponent({
  filters,
  options,
  onFiltersChange,
  onClose,
}: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    price: true,
    brands: false,
    categories: false,
    stores: false,
    availability: true,
    dietary: false,
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilters = (updates: Partial<ProductFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleMultiSelect = (
    type: "brands" | "categories" | "partnerStores",
    value: string
  ) => {
    const current = localFilters[type];
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateFilters({ [type]: updated });
  };

  const clearAllFilters = () => {
    const defaultFilters: ProductFilters = {
      priceRange: {
        min: options.priceRange.min,
        max: options.priceRange.max,
      },
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
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = () => {
    return (
      localFilters.brands.length > 0 ||
      localFilters.categories.length > 0 ||
      localFilters.partnerStores.length > 0 ||
      localFilters.inStock !== null ||
      localFilters.quickDelivery !== null ||
      localFilters.dietaryRestrictions.vegan ||
      localFilters.dietaryRestrictions.vegetarian ||
      localFilters.dietaryRestrictions.glutenFree ||
      localFilters.priceRange.min !== options.priceRange.min ||
      localFilters.priceRange.max !== options.priceRange.max
    );
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Filters</Text>
        <View style={styles.headerActions}>
          {hasActiveFilters() && (
            <TouchableOpacity
              onPress={clearAllFilters}
              style={styles.clearAllButton}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Price Range */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("price")}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Price Range</Text>
            <Ionicons
              name={
                expandedSections.price ? "chevron-up" : "chevron-down"
              }
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {expandedSections.price && (
            <View style={styles.priceSection}>
              <PriceRangeSlider
                min={options.priceRange.min}
                max={options.priceRange.max}
                currentMin={localFilters.priceRange.min}
                currentMax={localFilters.priceRange.max}
                onRangeChange={(min, max) =>
                  updateFilters({ priceRange: { min, max } })
                }
              />
              <View style={styles.priceDisplay}>
                <Text style={styles.priceText}>
                  {formatPrice(localFilters.priceRange.min)} -{" "}
                  {formatPrice(localFilters.priceRange.max)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Brands */}
        {options.brands.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("brands")}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Brand</Text>
              <View style={styles.sectionHeaderRight}>
                {localFilters.brands.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {localFilters.brands.length}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={
                    expandedSections.brands ? "chevron-up" : "chevron-down"
                  }
                  size={20}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>
            {expandedSections.brands && (
              <View style={styles.multiSelectContainer}>
                {options.brands.map((brand) => {
                  const isSelected = localFilters.brands.includes(brand);
                  return (
                    <TouchableOpacity
                      key={brand}
                      style={[
                        styles.multiSelectItem,
                        isSelected && styles.multiSelectItemSelected,
                      ]}
                      onPress={() => toggleMultiSelect("brands", brand)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.multiSelectText,
                          isSelected && styles.multiSelectTextSelected,
                        ]}
                      >
                        {brand}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Categories */}
        {options.categories.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("categories")}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.sectionHeaderRight}>
                {localFilters.categories.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {localFilters.categories.length}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={
                    expandedSections.categories
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={20}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>
            {expandedSections.categories && (
              <View style={styles.multiSelectContainer}>
                {options.categories.map((category) => {
                  const isSelected = localFilters.categories.includes(
                    category
                  );
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.multiSelectItem,
                        isSelected && styles.multiSelectItemSelected,
                      ]}
                      onPress={() => toggleMultiSelect("categories", category)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.multiSelectText,
                          isSelected && styles.multiSelectTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Partner Stores */}
        {options.partnerStores.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("stores")}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Partner Store</Text>
              <View style={styles.sectionHeaderRight}>
                {localFilters.partnerStores.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {localFilters.partnerStores.length}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={
                    expandedSections.stores ? "chevron-up" : "chevron-down"
                  }
                  size={20}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>
            {expandedSections.stores && (
              <View style={styles.multiSelectContainer}>
                {options.partnerStores.map((store) => {
                  const isSelected = localFilters.partnerStores.includes(
                    store
                  );
                  return (
                    <TouchableOpacity
                      key={store}
                      style={[
                        styles.multiSelectItem,
                        isSelected && styles.multiSelectItemSelected,
                      ]}
                      onPress={() => toggleMultiSelect("partnerStores", store)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.multiSelectText,
                          isSelected && styles.multiSelectTextSelected,
                        ]}
                      >
                        {store}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("availability")}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Availability</Text>
            <Ionicons
              name={
                expandedSections.availability
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {expandedSections.availability && (
            <View style={styles.toggleContainer}>
              <View style={styles.toggleItem}>
                <View style={styles.toggleLabelContainer}>
                  <Text style={styles.toggleLabel}>In Stock</Text>
                </View>
                <Switch
                  value={localFilters.inStock === true}
                  onValueChange={(value) =>
                    updateFilters({ inStock: value ? true : null })
                  }
                  trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.toggleItem}>
                <View style={styles.toggleLabelContainer}>
                  <Text style={styles.toggleLabel}>Quick Delivery</Text>
                </View>
                <Switch
                  value={localFilters.quickDelivery === true}
                  onValueChange={(value) =>
                    updateFilters({ quickDelivery: value ? true : null })
                  }
                  trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("dietary")}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
            <Ionicons
              name={
                expandedSections.dietary ? "chevron-up" : "chevron-down"
              }
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {expandedSections.dietary && (
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() =>
                  updateFilters({
                    dietaryRestrictions: {
                      ...localFilters.dietaryRestrictions,
                      vegan: !localFilters.dietaryRestrictions.vegan,
                    },
                  })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    localFilters.dietaryRestrictions.vegan &&
                      styles.checkboxChecked,
                  ]}
                >
                  {localFilters.dietaryRestrictions.vegan && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Vegan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() =>
                  updateFilters({
                    dietaryRestrictions: {
                      ...localFilters.dietaryRestrictions,
                      vegetarian:
                        !localFilters.dietaryRestrictions.vegetarian,
                    },
                  })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    localFilters.dietaryRestrictions.vegetarian &&
                      styles.checkboxChecked,
                  ]}
                >
                  {localFilters.dietaryRestrictions.vegetarian && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Vegetarian</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() =>
                  updateFilters({
                    dietaryRestrictions: {
                      ...localFilters.dietaryRestrictions,
                      glutenFree:
                        !localFilters.dietaryRestrictions.glutenFree,
                    },
                  })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    localFilters.dietaryRestrictions.glutenFree &&
                      styles.checkboxChecked,
                  ]}
                >
                  {localFilters.dietaryRestrictions.glutenFree && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Gluten-free</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearAllText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  priceSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  priceDisplay: {
    marginTop: 16,
    alignItems: "center",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  multiSelectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  multiSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  multiSelectItemSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  multiSelectText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  multiSelectTextSelected: {
    color: "#FFFFFF",
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  toggleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  checkboxContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
});
