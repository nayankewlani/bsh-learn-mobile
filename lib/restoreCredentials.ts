import { NativeModules, Platform } from "react-native";

const { RestoreCredentials } = NativeModules;

export async function saveRestoreCredential(token: string): Promise<void> {
  if (Platform.OS !== "android" || !RestoreCredentials) return;
  try {
    await RestoreCredentials.saveCredential(token);
  } catch {}
}

export async function restoreCredential(): Promise<string | null> {
  if (Platform.OS !== "android" || !RestoreCredentials) return null;
  try {
    return await RestoreCredentials.restoreCredential();
  } catch {
    return null;
  }
}
