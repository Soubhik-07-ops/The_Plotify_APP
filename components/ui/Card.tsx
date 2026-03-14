import React from "react";
import { StyleProp, View, ViewProps, ViewStyle } from "react-native";

import { palette, radii, shadows, spacing } from "@/constants/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, padded = true, style, ...props }: Props) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: palette.border,
          padding: padded ? spacing.lg : 0,
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
