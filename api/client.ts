import axios from "axios";
import { API_URL } from "../constants";
import * as SecureStore from "expo-secure-store";

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Accept-Encoding": "gzip, deflate" },
});

// In-memory token cache — eliminates SecureStore (Android Keystore) read on every request.
// SecureStore is a cryptographic operation that adds 20-50ms per call.
// We read once from disk; after that every request uses the in-memory copy instantly.
let _cachedToken: string | null = null;

export async function loadTokenFromStore(): Promise<string | null> {
  _cachedToken = await SecureStore.getItemAsync("accessToken");
  return _cachedToken;
}

export function setMemoryToken(token: string | null): void {
  _cachedToken = token;
}

client.interceptors.request.use((config) => {
  if (_cachedToken) config.headers.Authorization = `Bearer ${_cachedToken}`;
  return config;
});

// The backend rotates the refresh token on every use — the old one is invalidated
// the moment a new one is issued. Screens that fire several authenticated calls
// at once (Live, Admin dashboard) can all hit a 401 in the same instant; without
// this lock, each one would independently race to refresh using the same
// soon-to-be-stale token, and every loser would wipe out the winner's valid new
// tokens, logging the user out even though the session was actually fine.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      _cachedToken = data.accessToken;
      return data.accessToken as string;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original.url === "/auth/login" || original.url === "/auth/register";
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch {
        _cachedToken = null;
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
      }
    }
    return Promise.reject(error);
  }
);

export default client;
