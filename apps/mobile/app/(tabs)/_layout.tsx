import { Tabs } from "expo-router";
import { Activity, FolderHeart, MessageSquarePulse, Plus, SlidersHorizontal } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { useIntakeActions } from "../_overlays";

export default function TabLayout() {
  const { openIntakeActionSheet } = useIntakeActions();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0284C7",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: { height: 78, paddingBottom: 14, paddingTop: 8, borderTopColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
      }}
    >
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Assistant",
          tabBarIcon: ({ color, size }) => <MessageSquarePulse color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="intake"
        options={{
          title: "Intake",
          tabBarButton: (props) => (
            <TouchableOpacity {...props} className="-mt-5 flex-1 items-center justify-center" accessibilityLabel="Start clinical intake">
              <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-sky-600 shadow-lg">
                <Plus color="#FFFFFF" size={30} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            openIntakeActionSheet();
          },
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Records",
          tabBarIcon: ({ color, size }) => <FolderHeart color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="consent" options={{ href: null }} />
    </Tabs>
  );
}
