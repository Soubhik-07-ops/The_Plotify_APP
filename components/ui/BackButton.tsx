import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/constants/theme";

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
};

export default function BackButton({
  onPress,
  style,
  color = palette.textPrimary,
}: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={[
        {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={22} color={color} />
    </Pressable>
  );
}
