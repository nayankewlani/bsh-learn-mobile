import { create } from "zustand";

export interface ThemeColors {
  bg: string; surface: string; surface2: string; card: string;
  border: string; borderLight: string; text: string; textSec: string;
  textMuted: string; accent: string; accentLight: string; navBg: string;
  inputBg: string; statPill: string;
}

const DARK: ThemeColors = {
  bg: "#030c1a", surface: "#071528", surface2: "#0f2557", card: "#071223",
  border: "#1e40af", borderLight: "#0f2557", text: "#f0f6ff", textSec: "#bfdbfe",
  textMuted: "#94a3b8", accent: "#3b82f6", accentLight: "#60a5fa", navBg: "#030c1a",
  inputBg: "#0f2557", statPill: "#0f2557",
};

const LIGHT: ThemeColors = {
  bg: "#ffffff", surface: "#ffffff", surface2: "#f0f4ff", card: "#ffffff",
  border: "#c7d2fe", borderLight: "#e0e7ff", text: "#0f172a", textSec: "#334155",
  textMuted: "#64748b", accent: "#0c2461", accentLight: "#1a4db5", navBg: "#0c2461",
  inputBg: "#f0f4ff", statPill: "#e0e7ff",
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
