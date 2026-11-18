import { Tabs } from "expo-router";
import {
  Activity,
  FolderHeart,
  MessageSquareMore,
  Plus,
  SlidersHorizontal,
} from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { useIntakeActions } from "../../components/GlobalOverlays";
import { useAppTheme } from "../../constants/themeContext";

export default function TabLayout() {
  const { openIntakeActionSheet } = useIntakeActions();
  const { theme, isDark } = useAppTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: isDark ? "#38BDF8" : "#0284C7",
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: {
          height: 78,
          paddingBottom: 14,
          paddingTop: 8,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
          backgroundColor: isDark ? "#0B0E14" : "#FFFFFF",
          zIndex: 50,
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <Activity color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Assistant",
          tabBarIcon: ({ color, size }) => (
            <MessageSquareMore color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="intake"
        options={{
          title: "Intake",
          tabBarButton: ({ onPress, accessibilityLabel }) => (
            <TouchableOpacity
              onPress={onPress}
              className="-mt-5 flex-1 items-center justify-center"
              accessibilityLabel={accessibilityLabel ?? "Start clinical intake"}
              activeOpacity={0.8}
            >
              <View
                className="h-16 w-16 items-center justify-center rounded-full border-4 shadow-lg"
                style={{
                  backgroundColor: "#0284C7",
                  borderColor: isDark ? "#0B0E14" : "#FFFFFF",
                }}
              >
                <Plus color="#FFFFFF" size={30} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            (event as unknown as { preventDefault: () => void }).preventDefault();
            openIntakeActionSheet();
          },
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Records",
          tabBarIcon: ({ color, size }) => (
            <FolderHeart color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <SlidersHorizontal color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="consent" options={{ href: null }} />
    </Tabs>
  );
}
