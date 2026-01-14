import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../contexts/UserContext";
import { SearchProvider } from "../contexts/SearchContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <SearchProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#FFFFFF",
              },
            }}
          />
        </SearchProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
