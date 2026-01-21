import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../contexts/UserContext";
import { SearchProvider } from "../contexts/SearchContext";
import { CartProvider } from "../contexts/CartContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <SearchProvider>
          <CartProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: "#FFFFFF",
                },
              }}
            />
          </CartProvider>
        </SearchProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
