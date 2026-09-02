import "react-native-gesture-handler";
import "../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GlobalOverlays } from "../components/GlobalOverlays";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <GlobalOverlays>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </GlobalOverlays>
      </BottomSheetModalProvider>
    </QueryClientProvider>
  );
}
