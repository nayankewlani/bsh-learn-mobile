import { Stack } from "expo-router";
import { COLORS } from "../../constants";

export default function AdminStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#13122a" },
        headerTintColor: COLORS.primaryLight,
        headerTitleStyle: { fontWeight: "800", fontSize: 16, color: COLORS.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    />
  );
}
