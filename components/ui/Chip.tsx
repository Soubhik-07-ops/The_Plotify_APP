import React from "react";
import { TouchableOpacity, View, ViewStyle, StyleProp } from "react-native";

import { palette, typography } from "@/constants/theme";
import { Caption } from "@/components/ui/Typography";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Chip({ label, active, onPress, compact, style }: Props) {
  const chipStyle = [
    {
      borderRadius: 24,
      paddingHorizontal: compact ? 10 : 16,
      paddingVertical: compact ? 4 : 8,
      backgroundColor: active ? palette.primary : palette.surfaceMuted,
      borderWidth: active ? 0 : 1,
      borderColor: active ? "transparent" : palette.border,
    },
    style,
  ];

  const content = (
    <Caption
      style={{
        fontFamily: typography.body.semibold,
        color: active ? palette.surface : palette.textPrimary,
        textTransform: "capitalize",
      }}
    >
      {label}
    </Caption>
  );

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={chipStyle}>
      {content}
    </TouchableOpacity>
  );
}
