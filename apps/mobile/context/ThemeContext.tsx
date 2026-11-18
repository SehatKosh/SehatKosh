import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

export interface RingsPalette {
  vitals: string;
  trackVitals: string;
  adherence: string;
  trackAdherence: string;
  biomarkers: string;
  trackBiomarkers: string;
}

export interface ColorPalette {
  mode: "dark" | "light";
  canvas: string;
  surface: string;
  surfaceElevated: string;
  activePill: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  accentCoral: string;
  accentEmerald: string;
  accentCobalt: string;
  accentPurple: string;
  accentAmber: string;
  dockBg: string;
  dockBorder: string;
  rings: RingsPalette;
}

export const DARK_COLORS: ColorPalette = {
  mode: "dark",
  canvas: "#000000",
  surface: "#141822",
  surfaceElevated: "#1C2230",
  activePill: "#1F2637",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "rgba(255, 255, 255, 0.14)",
  borderStrong: "rgba(255, 255, 255, 0.28)",
  tabBarBg: "#0B0E14",
  tabBarBorder: "rgba(255, 255, 255, 0.10)",
  tabBarActive: "#38BDF8",
  tabBarInactive: "#64748B",
  accentCoral: "#FF3B5C",
  accentEmerald: "#10B981",
  accentCobalt: "#3B82F6",
  accentPurple: "#818CF8",
  accentAmber: "#F59E0B",
  dockBg: "#12151C",
  dockBorder: "rgba(255, 255, 255, 0.16)",
  rings: {
    vitals: "#FA114F",
    trackVitals: "rgba(250, 17, 79, 0.2)",
    adherence: "#A1FF00",
    trackAdherence: "rgba(161, 255, 0, 0.2)",
    biomarkers: "#00F0FF",
    trackBiomarkers: "rgba(0, 240, 255, 0.2)",
  },
};

export const LIGHT_COLORS: ColorPalette = {
  mode: "light",
  canvas: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  activePill: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#CBD5E1",
  borderStrong: "#94A3B8",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  tabBarActive: "#0284C7",
  tabBarInactive: "#94A3B8",
  accentCoral: "#FF3B5C",
  accentEmerald: "#10B981",
  accentCobalt: "#0284C7",
  accentPurple: "#6366F1",
  accentAmber: "#D97706",
  dockBg: "#FFFFFF",
  dockBorder: "#CBD5E1",
  rings: {
    vitals: "#FA114F",
    trackVitals: "rgba(250, 17, 79, 0.15)",
    adherence: "#10B981",
    trackAdherence: "rgba(16, 185, 129, 0.15)",
    biomarkers: "#0284C7",
    trackBiomarkers: "rgba(2, 132, 199, 0.15)",
  },
};

export interface ThemeContextValue {
  theme: ColorPalette;
  colors: ColorPalette;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "@sehatkosh/global_theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: DARK_COLORS,
  colors: DARK_COLORS,
  isDark: true,
  mode: "dark",
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark =
    mode === "system" ? systemScheme !== "light" : mode === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        theme: colors,
        colors,
        isDark,
        mode,
        toggleTheme,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// Backwards compatibility alias for components using useAppTheme
export const useAppTheme = useTheme;
