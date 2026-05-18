import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import client from "../api/client";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "student" | "educator" | "admin";
  avatar?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) return;
      const { data } = await client.get("/auth/me");
      set({ user: data.user });
    } catch {}
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.post("/auth/login", { email, password });
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Login failed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (name, email, password, role = "student") => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.post("/auth/register", { name, email, password, role });
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Registration failed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await client.post("/auth/logout"); } catch {}
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
