import "react-native-gesture-handler";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

// Disable strict mode warnings from 3rd-party libs like @gorhom/bottom-sheet
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// @ts-ignore
import "../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GlobalOverlays } from "../components/GlobalOverlays";
import { useEffect, useState } from "react";
import { ThemeProvider, useAppTheme } from "../constants/themeContext";
import { PatientProvider } from "../context/PatientContext";
import { migrateLocalStorage } from "../services/storageMigrator";
import { checkForAppUpdates, type UpdateCheckResult } from "../services/appUpdater";
import { UpdateAvailableModal } from "../components/UpdateAvailableModal";

const queryClient = new QueryClient();

function RootContent() {
  const { isDark, theme } = useAppTheme();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initApp() {
      // 1. Run local storage schema migrations on boot
      await migrateLocalStorage();

      // 2. Check for app updates (24-hour throttled in background)
      const update = await checkForAppUpdates({ force: false });
      if (mounted && update.updateAvailable) {
        setUpdateInfo(update);
        setUpdateModalVisible(true);
      }
    }

    initApp();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <GlobalOverlays>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: theme.canvas },
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

      {/* GitHub Releases In-App Update Modal */}
      <UpdateAvailableModal
        visible={updateModalVisible}
        updateInfo={updateInfo}
        onClose={() => setUpdateModalVisible(false)}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <PatientProvider>
                <RootContent />
              </PatientProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
