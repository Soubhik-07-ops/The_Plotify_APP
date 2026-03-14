import React from "react";
import { View, ViewProps } from "react-native";

import { spacing } from "@/constants/theme";
import { BodyMuted, HeadingSmall } from "@/components/ui/Typography";

type Props = ViewProps & {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export default function Section({
  title,
  subtitle,
  action,
  children,
  style,
  ...props
}: Props) {
  return (
    <View {...props} style={[{ marginBottom: spacing["2xl"] }, style]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: subtitle ? "flex-start" : "center",
          justifyContent: "space-between",
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <HeadingSmall>{title}</HeadingSmall>
          {subtitle ? <BodyMuted style={{ marginTop: spacing.xs }}>{subtitle}</BodyMuted> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}
