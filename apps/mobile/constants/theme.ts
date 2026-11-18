export interface ThemeTokens {
  mode: "dark" | "light";
  canvas: string;
  surface: string;
  surfaceElevated: string;
  activePill: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderActive: string;
  inputPlaceholder: string;
  ambientGlow: string;
  userBubble: string;
  userBubbleText: string;
  dockBg: string;
  dockBorder: string;
  rings: {
    vitals: string;
    adherence: string;
    biomarkers: string;
    trackVitals: string;
    trackAdherence: string;
    trackBiomarkers: string;
  };
}

export const DARK_THEME: ThemeTokens = {
  mode: "dark",
  canvas: "#000000",
  surface: "#12151C",
  surfaceElevated: "#181D27",
  activePill: "#1C212C",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "rgba(255, 255, 255, 0.09)",
  borderActive: "rgba(255, 255, 255, 0.22)",
  inputPlaceholder: "#64748B",
  ambientGlow: "rgba(59, 130, 246, 0.16)",
  userBubble: "#1E293B",
  userBubbleText: "#F8FAFC",
  dockBg: "#12151C",
  dockBorder: "rgba(255, 255, 255, 0.12)",
  rings: {
    vitals: "#FF3B5C",
    adherence: "#10B981",
    biomarkers: "#3B82F6",
    trackVitals: "rgba(255, 59, 92, 0.16)",
    trackAdherence: "rgba(16, 185, 129, 0.16)",
    trackBiomarkers: "rgba(59, 130, 246, 0.16)",
  },
};

export const LIGHT_THEME: ThemeTokens = {
  mode: "light",
  canvas: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceElevated: "#F8FAFC",
  activePill: "#EAEFF5",
  textPrimary: "#090D16",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  borderActive: "#CBD5E1",
  inputPlaceholder: "#94A3B8",
  ambientGlow: "rgba(59, 130, 246, 0.08)",
  userBubble: "#0284C7",
  userBubbleText: "#FFFFFF",
  dockBg: "#FFFFFF",
  dockBorder: "#E2E8F0",
  rings: {
    vitals: "#FF3B5C",
    adherence: "#10B981",
    biomarkers: "#3B82F6",
    trackVitals: "rgba(255, 59, 92, 0.14)",
    trackAdherence: "rgba(16, 185, 129, 0.14)",
    trackBiomarkers: "rgba(59, 130, 246, 0.14)",
  },
};

export const RADII = {
  dock: 28,
  card: 22,
  pill: 9999,
  bubble: 20,
  modal: 28,
};

export function getTheme(isDark: boolean): ThemeTokens {
  return isDark ? DARK_THEME : LIGHT_THEME;
}
