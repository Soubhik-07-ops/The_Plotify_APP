import { Stack } from "expo-router";
import { palette } from "@/constants/theme";

export default function PropertiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: palette.surface,
        },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    />
  );
}