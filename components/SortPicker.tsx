import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SortMode } from "../lib/search/ranking";

interface SortOption {
  value: SortMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  available: boolean; // Whether the sort option is currently functional
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "relevance",
    label: "Relevance",
    icon: "star",
    description: "Best match for your search",
    available: true,
  },
  {
    value: "price_asc",
    label: "Price: Low to High",
    icon: "arrow-up",
    description: "Lowest price first",
    available: true,
  },
  {
    value: "price_desc",
    label: "Price: High to Low",
    icon: "arrow-down",
    description: "Highest price first",
    available: true,
  },
  {
    value: "rating_desc",
    label: "Customer Rating",
    icon: "star-half",
    description: "Highest rated first",
    available: false, // Will be enabled when rating data is available
  },
  {
    value: "review_count_desc",
    label: "Review Count",
    icon: "chatbubbles",
    description: "Most reviewed first",
    available: false, // Will be enabled when review data is available
  },
  {
    value: "delivery_time_asc",
    label: "Delivery Time",
    icon: "time",
    description: "Fastest delivery first",
    available: false, // Will be enabled when delivery time data is available
  },
  {
    value: "distance_asc",
    label: "Distance",
    icon: "navigate",
    description: "Nearest location first",
    available: false, // Will be enabled when location data is available
  },
];

interface SortPickerProps {
  currentSort: SortMode;
  onSortChange: (sortMode: SortMode) => void;
}

export default function SortPicker({ currentSort, onSortChange }: SortPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const currentOption = SORT_OPTIONS.find(opt => opt.value === currentSort);

  const handleSelectSort = (sortMode: SortMode) => {
    onSortChange(sortMode);
    setModalVisible(false);
  };

  return (
    <>
      {/* Sort Button */}
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={currentOption?.icon || "swap-vertical"}
          size={18}
          color="#6B7280"
        />
        <Text style={styles.sortButtonText}>{currentOption?.label || "Sort"}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Sort Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sort By</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Sort Options */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = currentSort === option.value;
              const isDisabled = !option.available;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    isDisabled && styles.optionCardDisabled,
                  ]}
                  onPress={() => !isDisabled && handleSelectSort(option.value)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && styles.iconContainerSelected,
                        isDisabled && styles.iconContainerDisabled,
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={
                          isSelected
                            ? "#10B981"
                            : isDisabled
                            ? "#D1D5DB"
                            : "#6B7280"
                        }
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <View style={styles.optionTitleRow}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                            isDisabled && styles.optionLabelDisabled,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isDisabled && (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Coming Soon</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionDescription,
                          isDisabled && styles.optionDescriptionDisabled,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected && !isDisabled && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  optionCardDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconContainerSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  iconContainerDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  optionLabelSelected: {
    color: "#10B981",
  },
  optionLabelDisabled: {
    color: "#9CA3AF",
  },
  comingSoonBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#92400E",
  },
  optionDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  optionDescriptionDisabled: {
    color: "#9CA3AF",
  },
});
