import { create } from "zustand";

export interface ThemeColors {
  bg: string; surface: string; surface2: string; card: string;
  border: string; borderLight: string; text: string; textSec: string;
  textMuted: string; accent: string; accentLight: string; navBg: string;
  inputBg: string; statPill: string;
}

const DARK: ThemeColors = {
  bg: "#0a0914", surface: "#13122a", surface2: "#1e1b4b", card: "#12103a",
  border: "#3730a3", borderLight: "#2d2a5e", text: "#f3f4f6", textSec: "#d1d5db",
  textMuted: "#9ca3af", accent: "#7c3aed", accentLight: "#a78bfa", navBg: "#2d0a6e",
  inputBg: "#1e1b4b", statPill: "#1e1b4b",
};

const LIGHT: ThemeColors = {
  bg: "#f5f3ff", surface: "#ffffff", surface2: "#ede9fe", card: "#ffffff",
  border: "#e9d5ff", borderLight: "#ddd6fe", text: "#1f2937", textSec: "#374151",
  textMuted: "#6b7280", accent: "#7c3aed", accentLight: "#6d28d9", navBg: "#7c3aed",
  inputBg: "#ede9fe", statPill: "#ede9fe",
};

interface ThemeStore {
  isDark: boolean;
  t: ThemeColors;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  t: LIGHT,
  toggle: () =>
    set((s) => ({ isDark: !s.isDark, t: s.isDark ? LIGHT : DARK })),
}));
