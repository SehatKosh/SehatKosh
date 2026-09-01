import { Tabs } from "expo-router";
import { Activity, Camera, FileText, ShieldCheck } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vitals",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "FHIR Records",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="consent"
        options={{
          title: "Consent",
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
