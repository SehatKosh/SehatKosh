import "react-native-gesture-handler";
// @ts-ignore
import "../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GlobalOverlays } from "../components/GlobalOverlays";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <GlobalOverlays>
              <Stack
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                  animation: "slide_from_right",
                  contentStyle: { backgroundColor: "#F8FAFC" },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="sessions/[id]"
                  options={{
                    gestureEnabled: true,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="intake/scan-document"
                  options={{
                    presentation: "fullScreenModal",
                    gestureEnabled: false, // Camera requires controlled dismissal
                    animation: "slide_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="intake/ocr-verify"
                  options={{
                    gestureEnabled: true,
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="intake/doctor-session"
                  options={{
                    gestureEnabled: true,
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
              </Stack>
            </GlobalOverlays>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
