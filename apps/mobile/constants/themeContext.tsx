import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DARK_THEME, getTheme, LIGHT_THEME, ThemeTokens } from "./theme";

type ThemeMode = "system" | "dark" | "light";

interface ThemeContextType {
  theme: ThemeTokens;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "@sehatkosh/theme_mode";

const ThemeContext = createContext<ThemeContextType>({
  theme: DARK_THEME,
  isDark: true,
  mode: "dark",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark"); // Default to OLED dark matching reference

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((val) => {
        if (val === "light" || val === "dark" || val === "system") {
          setModeState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
  };

  const isDark =
    mode === "system" ? systemScheme !== "light" : mode === "dark";

  const theme = getTheme(isDark);

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, mode, setMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
