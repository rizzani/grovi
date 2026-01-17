import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Dimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchResult } from "../lib/search-service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper function to format price in JMD from cents (no decimals)
function formatPriceJmd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents === 0) return "";
  return Math.round(cents / 100).toString();
}

// Price Range Slider Component (using PanResponder instead of reanimated)
function PriceRangeSlider({
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  onValueChange,
}: {
  minPrice: number;
  maxPrice: number;
  currentMin: number | null;
  currentMax: number | null;
  onValueChange: (min: number | null, max: number | null) => void;
}) {
  const sliderWidth = SCREEN_WIDTH - 64; // 32px padding on each side (16px from container padding * 2 + 32px = 64px total)
  const trackMargin = 12; // Matches marginHorizontal in sliderTrackBackground style
  const thumbWidth = 24; // Width of thumb
  const thumbHalfWidth = thumbWidth / 2; // Half width for centering
  
  // Convert cents to dollars for slider
  const minDollars = minPrice / 100;
  const maxDollars = maxPrice / 100;
  const currentMinDollars = currentMin ? currentMin / 100 : minDollars;
  const currentMaxDollars = currentMax ? currentMax / 100 : maxDollars;
  
  const range = maxDollars - minDollars;
  
  // Calculate initial positions (0-1 as ratio of range)
  // If currentMin/Max is null, use boundary values (0 for min, 1 for max)
  const getInitialMinRatio = () => {
    if (currentMin === null) return 0;
    return range > 0 ? (currentMinDollars - minDollars) / range : 0;
  };
  
  const getInitialMaxRatio = () => {
    // When currentMax is null, return 1.0 to start at far right
    if (currentMax === null) return 1.0;
    // Otherwise calculate from currentMax value
    return range > 0 ? (currentMaxDollars - minDollars) / range : 1.0;
  };
  
  const [minRatio, setMinRatio] = useState(getInitialMinRatio());
  const [maxRatio, setMaxRatio] = useState(() => {
    // Force initial max to 1.0 if currentMax is null
    const initial = getInitialMaxRatio();
    return initial;
  });
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [containerWidth, setContainerWidth] = useState(sliderWidth); // State to trigger re-render when width changes
  const trackContainerRef = useRef<View>(null);
  const dragStartData = useRef({ minRatio: 0, maxRatio: 0, startPageX: 0, trackLeft: 0 });
  const justReleasedRef = useRef(false);
  const trackContainerWidthRef = useRef(sliderWidth); // Track actual container width
  
  // Clamp value between 0 and 1
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  
  // Sync positions when values change externally (only when not dragging and not just released)
  // Add a ref to track if dragging to prevent sync during touch sequence
  const isDraggingRef = useRef(false);
  
  // Sync positions when values change externally (only when not dragging and not just released)
  useEffect(() => {
    if (isDraggingMin || isDraggingMax || justReleasedRef.current || isDraggingRef.current) {
      // Don't sync while dragging or immediately after release
      return;
    }
    
    // Calculate what the ratios should be based on current props
    // If null, use boundary values (0 for min, 1 for max)
    const newMinRatio = currentMin === null ? 0 : (range > 0 ? (currentMinDollars - minDollars) / range : 0);
    const newMaxRatio = currentMax === null ? 1.0 : (range > 0 ? (currentMaxDollars - minDollars) / range : 1.0);
    
    // Clamp to ensure valid range
    const clampedMinRatio = clamp(newMinRatio);
    const clampedMaxRatio = clamp(newMaxRatio);
    
    // When currentMax is null, always set to exactly 1.0 (not 0.999 or similar)
    // When currentMin is null, always set to exactly 0
    if (currentMax === null) {
      if (maxRatio !== 1.0) {
        setMaxRatio(1.0);
      }
    } else if (Math.abs(maxRatio - clampedMaxRatio) > 0.001) {
      setMaxRatio(clampedMaxRatio);
    }
    
    if (currentMin === null) {
      if (minRatio !== 0) {
        setMinRatio(0);
      }
    } else if (Math.abs(minRatio - clampedMinRatio) > 0.001) {
      setMinRatio(clampedMinRatio);
    }
  }, [currentMin, currentMax, isDraggingMin, isDraggingMax]);
  
  // Convert position (0-1) to dollars
  const positionToDollars = (pos: number) => minDollars + pos * range;
  
  // Convert dollars to cents
  const dollarsToCents = (dollars: number) => Math.round(dollars * 100);
  
  // Update slider values
  const updateValues = (newMinRatio: number, newMaxRatio: number) => {
    const newMinDollars = positionToDollars(newMinRatio);
    const newMaxDollars = positionToDollars(newMaxRatio);
    
    // If values are at boundaries, treat as null
    // Use tighter tolerance for min, allow max to go very close to end but only set null if exactly at boundaries
    // When maxRatio is very close to 1.0 (within 0.001), keep it as maxDollars instead of null
    const newMin = newMinRatio <= 0.001 ? null : dollarsToCents(newMinDollars);
    // Only set max to null if ratio is exactly 1.0 (meaning no filter), otherwise use the actual value
    // But if user dragged to very end (>= 0.999), use maxDollars
    const newMax = newMaxRatio >= 0.999 ? dollarsToCents(maxDollars) : dollarsToCents(newMaxDollars);
    
    onValueChange(newMin, newMax);
  };
  
  // Use refs to track current ratios so we always get the latest values
  const minRatioRef = useRef(minRatio);
  const maxRatioRef = useRef(maxRatio);
  
  // Update refs whenever ratios change
  useEffect(() => {
    minRatioRef.current = minRatio;
    maxRatioRef.current = maxRatio;
  }, [minRatio, maxRatio]);
  
  // Min thumb pan responder
  const minPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Prevent sync during touch - set flag immediately (synchronous)
        isDraggingRef.current = true;
        
        // Capture CURRENT ratios from refs (always up-to-date, not stale closure values)
        // This ensures we capture where the thumb currently is, not where it was when component rendered
        const currentMinRatio = minRatioRef.current;
        const currentMaxRatio = maxRatioRef.current;
        
        dragStartData.current.minRatio = currentMinRatio;
        dragStartData.current.maxRatio = currentMaxRatio;
        dragStartData.current.startPageX = evt.nativeEvent.pageX;
        
        // Then set dragging state (this is async, but we already captured values from refs)
        setIsDraggingMin(true);
        
        // Get track position on start
        if (trackContainerRef.current) {
          trackContainerRef.current.measure((x, y, width, height, pageXTrack) => {
            dragStartData.current.trackLeft = pageXTrack;
          });
        }
      },
      onPanResponderMove: (evt) => {
        const deltaX = evt.nativeEvent.pageX - dragStartData.current.startPageX;
        // Use current measured width for accurate delta calculation
        const currentAvailableWidth = trackContainerWidthRef.current - (trackMargin * 2);
        const deltaRatio = deltaX / currentAvailableWidth;
        let newMinRatio = dragStartData.current.minRatio + deltaRatio;
        
        // Get current maxRatio from ref to ensure we have the latest value
        const currentMaxRatio = maxRatioRef.current;
        
        // Ensure min cannot exceed max - clamp to current max ratio
        if (newMinRatio > currentMaxRatio) {
          newMinRatio = currentMaxRatio;
        }
        
        // Clamp to valid range [0, maxRatio]
        newMinRatio = clamp(newMinRatio);
        
        // Update if valid
        if (newMinRatio <= currentMaxRatio) {
          setMinRatio(newMinRatio);
          updateValues(newMinRatio, currentMaxRatio);
        }
      },
      onPanResponderRelease: () => {
        setIsDraggingMin(false);
        // Prevent sync for a short moment after release
        justReleasedRef.current = true;
        setTimeout(() => {
          justReleasedRef.current = false;
          isDraggingRef.current = false;
        }, 100);
      },
    })
  ).current;
  
  // Max thumb pan responder
  const maxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Prevent sync during touch - set flag immediately (synchronous)
        isDraggingRef.current = true;
        
        // Capture CURRENT ratios from refs (always up-to-date, not stale closure values)
        // This ensures we capture where the thumb currently is, not where it was when component rendered
        const currentMinRatio = minRatioRef.current;
        const currentMaxRatio = maxRatioRef.current;
        
        dragStartData.current.minRatio = currentMinRatio;
        dragStartData.current.maxRatio = currentMaxRatio;
        dragStartData.current.startPageX = evt.nativeEvent.pageX;
        
        // Then set dragging state (this is async, but we already captured values from refs)
        setIsDraggingMax(true);
        
        // Get track position on start
        if (trackContainerRef.current) {
          trackContainerRef.current.measure((x, y, width, height, pageXTrack) => {
            dragStartData.current.trackLeft = pageXTrack;
          });
        }
      },
      onPanResponderMove: (evt) => {
        const deltaX = evt.nativeEvent.pageX - dragStartData.current.startPageX;
        // Use current measured width for accurate delta calculation
        const currentAvailableWidth = trackContainerWidthRef.current - (trackMargin * 2);
        const deltaRatio = deltaX / currentAvailableWidth;
        let newMaxRatio = dragStartData.current.maxRatio + deltaRatio;
        
        // Get current minRatio from ref to ensure we have the latest value (updated in real-time)
        const currentMinRatio = minRatioRef.current;
        
        // CRITICAL: Ensure max cannot go below min - enforce strictly
        // Use Math.max to ensure newMaxRatio is always >= currentMinRatio
        newMaxRatio = Math.max(newMaxRatio, currentMinRatio);
        
        // Allow max to reach exactly 1.0 (extreme corner)
        // When very close to 1.0 (within 0.1%), snap to exactly 1.0 to eliminate gaps
        if (newMaxRatio > 1.0 - 0.0001) {
          newMaxRatio = 1.0;
        } else {
          newMaxRatio = Math.min(newMaxRatio, 1.0);
        }
        
        // Final validation: ensure it's within [currentMinRatio, 1.0]
        newMaxRatio = Math.max(currentMinRatio, Math.min(1.0, newMaxRatio));
        
        // Always update since we've ensured validity
        setMaxRatio(newMaxRatio);
        updateValues(currentMinRatio, newMaxRatio);
      },
      onPanResponderRelease: () => {
        setIsDraggingMax(false);
        // Prevent sync for a short moment after release
        justReleasedRef.current = true;
        setTimeout(() => {
          justReleasedRef.current = false;
          isDraggingRef.current = false;
        }, 100);
      },
    })
  ).current;
  
  // Track container width will be measured via onLayout handler
  // No need for useEffect - onLayout fires when component mounts and layout changes
  
  // Position thumbs: Track background has marginHorizontal: 12 (trackMargin)
  // Use state-based container width for positioning (updates when measured)
  const actualAvailableWidth = containerWidth - (trackMargin * 2); // Use measured width for positioning
  const trackRightEdge = containerWidth - trackMargin; // Track's right edge position
  
  // Min thumb: normal centering within the track
  const minThumbLeft = trackMargin + minRatio * actualAvailableWidth - thumbHalfWidth;
  
  // Max thumb: continuous calculation for all values 0 to 1
  // Normal formula: trackMargin + maxRatio * actualAvailableWidth - thumbHalfWidth (works well for most values)
  // At maxRatio = 1.0, we need right edge at trackRightEdge, so adjust by thumbHalfWidth
  // Adjustment needed at 1.0: (trackRightEdge - thumbWidth) - (trackMargin + actualAvailableWidth - thumbHalfWidth)
  // = (containerWidth - trackMargin - thumbWidth) - (containerWidth - trackMargin - thumbHalfWidth)
  // = thumbHalfWidth - thumbWidth = -thumbHalfWidth
  // So we add: maxRatio * (-thumbHalfWidth) = maxRatio * (thumbHalfWidth - thumbWidth) = -maxRatio * thumbHalfWidth
  // Actually simpler: at 1.0, subtract thumbHalfWidth, so: subtract maxRatio * thumbHalfWidth
  // But we want smooth transition, so use: basePosition - maxRatio * thumbHalfWidth
  const baseMaxThumbLeft = trackMargin + maxRatio * actualAvailableWidth - thumbHalfWidth;
  // At 1.0, shift by thumbHalfWidth to align right edge: -thumbHalfWidth
  const maxThumbLeft = baseMaxThumbLeft - maxRatio * thumbHalfWidth;
  
  // Active track positioning aligns with track background
  const activeTrackLeft = trackMargin + minRatio * actualAvailableWidth;
  // Active track extends from min thumb center to max thumb center
  // Max thumb center = maxThumbLeft + thumbHalfWidth
  const maxThumbCenter = maxThumbLeft + thumbHalfWidth;
  const activeTrackWidth = maxThumbCenter - activeTrackLeft;
  
  return (
    <View style={styles.sliderContainer}>
      <View 
        style={styles.sliderTrackContainer} 
        ref={trackContainerRef}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          if (width > 0 && width !== trackContainerWidthRef.current) {
            trackContainerWidthRef.current = width;
            // Update state to trigger re-render with correct positioning
            setContainerWidth(width);
          }
        }}
      >
        {/* Background track */}
        <View style={styles.sliderTrackBackground} />
        
        {/* Active range track */}
        <View
          style={[
            styles.sliderTrackActive,
            {
              left: activeTrackLeft,
              width: Math.max(0, activeTrackWidth),
            },
          ]}
        />
        
        {/* Min thumb */}
        <View
          style={[styles.sliderThumb, { transform: [{ translateX: minThumbLeft }] }]}
          {...minPanResponder.panHandlers}
        >
          <View style={styles.sliderThumbInner} />
        </View>
        
        {/* Max thumb */}
        <View
          style={[styles.sliderThumb, { transform: [{ translateX: maxThumbLeft }] }]}
          {...maxPanResponder.panHandlers}
        >
          <View style={styles.sliderThumbInner} />
        </View>
      </View>
      
      {/* Price labels */}
      <View style={styles.sliderLabels}>
        <View style={styles.sliderLabel}>
          <Text style={styles.sliderLabelValue}>
            ${currentMin ? formatPriceJmd(currentMin) : formatPriceJmd(minPrice)}
          </Text>
          <Text style={styles.sliderLabelText}>Min</Text>
        </View>
        <View style={styles.sliderLabel}>
          <Text style={styles.sliderLabelValue}>
            ${currentMax ? formatPriceJmd(currentMax) : formatPriceJmd(maxPrice)}
          </Text>
          <Text style={styles.sliderLabelText}>Max</Text>
        </View>
      </View>
    </View>
  );
}

export interface FilterState {
  brands: string[];
  categories: string[];
  partnerStores: string[];
  inStock: boolean | null;
  quickDelivery: boolean | null;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  dietaryRestrictions: {
    vegan: boolean;
    vegetarian: boolean;
    glutenFree: boolean;
  };
}

export interface ProductFiltersProps {
  visible: boolean;
  onClose: () => void;
  onFiltersChange: (filters: FilterState) => void;
  searchResults: SearchResult[];
  initialFilters?: Partial<FilterState>;
}

// Extract unique values from search results
function extractFilterOptions(results: SearchResult[]) {
  const brands = new Set<string>();
  const categories = new Set<string>();
  const stores = new Set<string>();
  const prices: number[] = [];

  results.forEach((result) => {
    if (result.brand) brands.add(result.brand);
    if (result.category?.name) categories.add(result.category.name);
    // Include store location name and display name for better filtering
    if (result.storeLocation?.display_name) {
      stores.add(result.storeLocation.display_name);
    } else if (result.storeLocation?.name) {
      stores.add(result.storeLocation.name);
    }
    // Collect prices for range calculation
    if (result.priceJmdCents > 0) {
      prices.push(result.priceJmdCents);
    }
  });

  const sortedPrices = prices.sort((a, b) => a - b);
  const minPrice = sortedPrices.length > 0 ? sortedPrices[0] : 0;
  const maxPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;

  return {
    brands: Array.from(brands).sort(),
    categories: Array.from(categories).sort(),
    stores: Array.from(stores).sort(),
    priceRange: {
      min: minPrice,
      max: maxPrice,
    },
  };
}


// Multi-select chip component
function MultiSelectChips({
  options,
  selected,
  onToggle,
  label,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  label: string;
}) {
  if (options.length === 0) return null;

  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{label}</Text>
      <View style={styles.chipsContainer}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggle(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ProductFilters({
  visible,
  onClose,
  onFiltersChange,
  searchResults,
  initialFilters,
}: ProductFiltersProps) {
  const options = extractFilterOptions(searchResults);

  const [filters, setFilters] = useState<FilterState>({
    brands: initialFilters?.brands || [],
    categories: initialFilters?.categories || [],
    partnerStores: initialFilters?.partnerStores || [],
    inStock: initialFilters?.inStock ?? null,
    quickDelivery: initialFilters?.quickDelivery ?? null,
    priceRange: initialFilters?.priceRange || {
      min: null,
      max: null,
    },
    dietaryRestrictions: initialFilters?.dietaryRestrictions || {
      vegan: false,
      vegetarian: false,
      glutenFree: false,
    },
  });

  // Get price range from search results for display
  const priceRange = extractFilterOptions(searchResults).priceRange;

  // Local state for slider values (not applied to filters until Done is pressed)
  const [sliderPriceRange, setSliderPriceRange] = useState<{
    min: number | null;
    max: number | null;
  }>({
    min: filters.priceRange.min,
    max: filters.priceRange.max,
  });

  // Initialize slider values from filters when modal opens
  useEffect(() => {
    if (visible) {
      setSliderPriceRange({
        min: initialFilters?.priceRange?.min ?? filters.priceRange.min,
        max: initialFilters?.priceRange?.max ?? filters.priceRange.max,
      });
    }
  }, [visible, initialFilters?.priceRange?.min, initialFilters?.priceRange?.max]);

  // Apply filters immediately when they change (but not on initial mount)
  // Note: Price changes from slider are stored in sliderPriceRange and only applied on Done
  const isInitialMount = useRef(true);
  const skipNextPriceChange = useRef(false);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Don't call onFiltersChange on initial mount - parent already has initial state
      return;
    }

    // Apply filters immediately (excluding price which is handled separately)
    // We apply all filters here since priceRange in filters is only updated on Done
    onFiltersChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.brands,
    filters.categories,
    filters.partnerStores,
    filters.inStock,
    filters.quickDelivery,
    filters.dietaryRestrictions,
  ]);

  const toggleBrand = (brand: string) => {
    setFilters((prev) => {
      const newBrands = prev.brands.includes(brand)
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand];
      return {
        ...prev,
        brands: newBrands,
      };
    });
  };

  const toggleCategory = (category: string) => {
    setFilters((prev) => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return {
        ...prev,
        categories: newCategories,
      };
    });
  };

  const toggleStore = (store: string) => {
    setFilters((prev) => {
      const newStores = prev.partnerStores.includes(store)
        ? prev.partnerStores.filter((s) => s !== store)
        : [...prev.partnerStores, store];
      return {
        ...prev,
        partnerStores: newStores,
      };
    });
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      brands: [],
      categories: [],
      partnerStores: [],
      inStock: null,
      quickDelivery: null,
      priceRange: {
        min: null,
        max: null,
      },
      dietaryRestrictions: {
        vegan: false,
        vegetarian: false,
        glutenFree: false,
      },
    };
    setFilters(defaultFilters);
    setSliderPriceRange({ min: null, max: null });
    // onFiltersChange will be called via useEffect
  };

  // Apply slider price values to filters and close modal
  const handleDone = () => {
    setFilters((prev) => ({
      ...prev,
      priceRange: sliderPriceRange,
    }));
    // Apply all filters including price
    onFiltersChange({
      ...filters,
      priceRange: sliderPriceRange,
    });
    onClose();
  };

  const hasActiveFilters = () => {
    return (
      filters.brands.length > 0 ||
      filters.categories.length > 0 ||
      filters.partnerStores.length > 0 ||
      filters.inStock !== null ||
      filters.quickDelivery !== null ||
      filters.priceRange.min !== null ||
      filters.priceRange.max !== null ||
      filters.dietaryRestrictions.vegan ||
      filters.dietaryRestrictions.vegetarian ||
      filters.dietaryRestrictions.glutenFree
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Multi-select Filters */}
          <MultiSelectChips
            options={options.brands}
            selected={filters.brands}
            onToggle={toggleBrand}
            label="Brand"
          />

          <MultiSelectChips
            options={options.categories}
            selected={filters.categories}
            onToggle={toggleCategory}
            label="Category"
          />

          <MultiSelectChips
            options={options.stores}
            selected={filters.partnerStores}
            onToggle={toggleStore}
            label="Partner Store"
          />

          {/* Price Range Filter */}
          {priceRange.min > 0 && priceRange.max > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range (JMD)</Text>
              <PriceRangeSlider
                minPrice={priceRange.min}
                maxPrice={priceRange.max}
                currentMin={sliderPriceRange.min}
                currentMax={sliderPriceRange.max}
                onValueChange={(min, max) => {
                  // Update slider state but don't apply filters yet
                  setSliderPriceRange({ min, max });
                }}
              />
              <TouchableOpacity
                style={[
                  styles.resetPriceButton,
                  sliderPriceRange.min === null && sliderPriceRange.max === null && styles.resetPriceButtonDisabled,
                ]}
                onPress={() => {
                  setSliderPriceRange({ min: null, max: null });
                }}
                disabled={sliderPriceRange.min === null && sliderPriceRange.max === null}
              >
                <Text
                  style={[
                    styles.resetPriceButtonText,
                    sliderPriceRange.min === null && sliderPriceRange.max === null && styles.resetPriceButtonTextDisabled,
                  ]}
                >
                  Reset Price
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Availability Toggles */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Availability</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>In Stock</Text>
              <Switch
                value={filters.inStock === true}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, inStock: value ? true : null }))
                }
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Quick Delivery</Text>
              <Switch
                value={filters.quickDelivery === true}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, quickDelivery: value ? true : null }))
                }
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Dietary Restrictions */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Dietary Restrictions</Text>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    dietaryRestrictions: {
                      ...prev.dietaryRestrictions,
                      vegan: !prev.dietaryRestrictions.vegan,
                    },
                  }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    filters.dietaryRestrictions.vegan && styles.checkboxChecked,
                  ]}
                >
                  {filters.dietaryRestrictions.vegan && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Vegan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    dietaryRestrictions: {
                      ...prev.dietaryRestrictions,
                      vegetarian: !prev.dietaryRestrictions.vegetarian,
                    },
                  }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    filters.dietaryRestrictions.vegetarian && styles.checkboxChecked,
                  ]}
                >
                  {filters.dietaryRestrictions.vegetarian && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Vegetarian</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    dietaryRestrictions: {
                      ...prev.dietaryRestrictions,
                      glutenFree: !prev.dietaryRestrictions.glutenFree,
                    },
                  }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    filters.dietaryRestrictions.glutenFree && styles.checkboxChecked,
                  ]}
                >
                  {filters.dietaryRestrictions.glutenFree && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Gluten-free</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.clearButton, !hasActiveFilters() && styles.clearButtonDisabled]}
            onPress={clearAllFilters}
            disabled={!hasActiveFilters()}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.clearButtonText,
                !hasActiveFilters() && styles.clearButtonTextDisabled,
              ]}
            >
              Clear All Filters
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  chipIcon: {
    marginLeft: 6,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#374151",
  },
  checkboxRow: {
    gap: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
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
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  clearButtonTextDisabled: {
    color: "#9CA3AF",
  },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderTrackContainer: {
    height: 40,
    justifyContent: "center",
    marginVertical: 16,
    position: "relative",
  },
  sliderTrackBackground: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginHorizontal: 12,
  },
  sliderTrackActive: {
    position: "absolute",
    height: 6,
    backgroundColor: "#10B981",
    borderRadius: 3,
    top: 17,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    top: 8,
    zIndex: 1,
  },
  sliderThumbInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    alignItems: "center",
  },
  sliderLabelValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  resetPriceButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    opacity: 1,
    marginTop: 8,
  },
  resetPriceButtonDisabled: {
    opacity: 0.4,
  },
  resetPriceButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  resetPriceButtonTextDisabled: {
    color: "#9CA3AF",
  },
});
