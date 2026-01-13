import { Stack } from "expo-router";
import { UserProvider } from "../contexts/UserContext";
import { CartProvider } from "../contexts/CartContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <CartProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </CartProvider>
    </UserProvider>
  );
}
