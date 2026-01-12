import { Text, View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Section Header Component
function SectionHeader({ 
  title, 
  showSeeAll = false, 
  onSeeAllPress 
}: { 
  title: string; 
  showSeeAll?: boolean; 
  onSeeAllPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <View style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const deliveryAddress = "6382 East Greater Parkway";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={18} color="#10B981" />
            <Text style={styles.deliverToText}>Deliver To</Text>
            <Text style={styles.addressText}>{deliveryAddress}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="cart-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoText}>
                Summer Discount up to <Text style={styles.promoHighlight}>30% off</Text> seasonal favorites
              </Text>
            </View>
          </View>
          <View style={styles.promoImagePlaceholder}>
            {/* Placeholder for promotional image */}
          </View>
        </View>

        {/* Quick Category Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={styles.categoryFiltersContent}
        >
          <TouchableOpacity style={styles.categoryFilter}>
            <Ionicons name="apple" size={20} color="#FFFFFF" />
            <Text style={styles.categoryFilterText}>Fruits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryFilter}>
            <Ionicons name="leaf" size={20} color="#FFFFFF" />
            <Text style={styles.categoryFilterText}>Vegetables</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryFilter}>
            <Ionicons name="cafe" size={20} color="#FFFFFF" />
            <Text style={styles.categoryFilterText}>Dairy</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Shop By Store Section */}
        <View style={styles.section}>
          <SectionHeader title="Shop By Store" showSeeAll />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Fresh Foods Market</Text>
            </View>
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Local Deli</Text>
            </View>
            <View style={styles.storeCard}>
              <View style={styles.storeImagePlaceholder} />
              <Text style={styles.storeName}>Store Name</Text>
            </View>
          </ScrollView>
        </View>

        {/* Buy Again Section */}
        <View style={styles.section}>
          <SectionHeader title="Buy Again" />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Whole Wheat Bread</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Fuji Apple</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Product Name</Text>
            </View>
          </ScrollView>
        </View>

        {/* Popular Near You Section */}
        <View style={styles.section}>
          <SectionHeader title="Popular Near You" showSeeAll />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Salmon Fillet</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Ground Beef</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Product Name</Text>
            </View>
          </ScrollView>
        </View>

        {/* Featured Products Section */}
        <View style={styles.section}>
          <SectionHeader title="Featured Products" showSeeAll />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Avocados</Text>
              <Text style={styles.productPrice}>$1.50 each</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Bananas</Text>
              <Text style={styles.productPrice}>$2.59/lb</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder} />
              <Text style={styles.productName}>Product Name</Text>
              <Text style={styles.productPrice}>$0.00</Text>
            </View>
          </ScrollView>
        </View>

        {/* Compare Prices Section */}
        <View style={styles.section}>
          <SectionHeader title="Compare Prices" />
          <View style={styles.compareCard}>
            <View style={styles.compareContent}>
              <Text style={styles.compareTitle}>Save up to 30%</Text>
              <Text style={styles.compareDescription}>
                Find the best deals on your favorite items
              </Text>
              <Text style={styles.compareSubtext}>
                Compare prices across multiple stores
              </Text>
              <TouchableOpacity style={styles.compareButton} activeOpacity={0.8}>
                <Text style={styles.compareButtonText}>Compare Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.compareImagePlaceholder} />
          </View>
        </View>

        {/* Top Categories Section */}
        <View style={styles.section}>
          <SectionHeader title="Top Categories" />
          <View style={styles.categoriesGrid}>
            <View style={styles.categoryCard}>
              <View style={styles.categoryImagePlaceholder} />
            </View>
            <View style={styles.categoryCard}>
              <View style={styles.categoryImagePlaceholder} />
            </View>
            <View style={styles.categoryCard}>
              <View style={styles.categoryImagePlaceholder} />
            </View>
            <View style={styles.categoryCard}>
              <View style={styles.categoryImagePlaceholder} />
            </View>
          </View>
        </View>

        {/* Bottom spacing for safe area */}
        <View style={styles.bottomSpacing} />
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
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  deliverToText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  addressText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  promoBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#10B981",
    overflow: "hidden",
    minHeight: 140,
    flexDirection: "row",
  },
  promoContent: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  promoTextContainer: {
    flex: 1,
  },
  promoText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 26,
  },
  promoHighlight: {
    color: "#10B981",
    fontWeight: "700",
  },
  promoImagePlaceholder: {
    width: 120,
    backgroundColor: "#F3F4F6",
  },
  categoryFilters: {
    marginBottom: 24,
  },
  categoryFiltersContent: {
    gap: 12,
    paddingRight: 16,
  },
  categoryFilter: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  categoryFilterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  seeAllText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  horizontalScroll: {
    marginHorizontal: -4,
  },
  horizontalScrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  storeCard: {
    alignItems: "center",
    width: 100,
  },
  storeImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    textAlign: "center",
  },
  productCard: {
    width: 140,
  },
  productImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  compareCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  compareContent: {
    flex: 1,
  },
  compareTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  compareDescription: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 4,
    lineHeight: 22,
  },
  compareSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  compareButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  compareButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  compareImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "47%",
    aspectRatio: 1,
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  bottomSpacing: {
    height: 20,
  },
});
