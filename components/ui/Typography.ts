import React from "react";
import { Text, type TextProps, type TextStyle } from "react-native";

import { palette, typography } from "@/constants/theme";

type TypographyProps = TextProps & {
  variant?: string;
  color?: string;
  align?: TextStyle["textAlign"] | undefined;
};

const variantStyles: Record<string, TextStyle> = {
  HeadingLarge: {
    fontFamily: typography.heading.bold,
    fontSize: 32,
    lineHeight: 40,
    color: palette.textPrimary,
  },
  HeadingMedium: {
    fontFamily: typography.heading.bold,
    fontSize: 24,
    lineHeight: 32,
    color: palette.textPrimary,
  },
  HeadingSmall: {
    fontFamily: typography.heading.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: palette.textPrimary,
  },
  Body: {
    fontFamily: typography.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textPrimary,
  },
  BodyMuted: {
    fontFamily: typography.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
  },
  Caption: {
    fontFamily: typography.body.medium,
    fontSize: 12,
    lineHeight: 16,
    color: palette.textMuted,
  },
  ButtonText: {
    fontFamily: typography.body.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: palette.surface,
  },
};

export function Typography({
  variant = "Body",
  color,
  align,
  style,
  ...props
}: TypographyProps) {
  const resolvedStyle = variantStyles[variant] || variantStyles.Body;

  return React.createElement(Text, {
    ...props,
    style: [
      resolvedStyle,
      color ? { color } : null,
      align ? { textAlign: align } : null,
      style,
    ],
  });
}

export function HeadingLarge(props: TypographyProps) {
  return Typography({ ...props, variant: "HeadingLarge" });
}

export function HeadingMedium(props: TypographyProps) {
  return Typography({ ...props, variant: "HeadingMedium" });
}

export function HeadingSmall(props: TypographyProps) {
  return Typography({ ...props, variant: "HeadingSmall" });
}

export function Body(props: TypographyProps) {
  return Typography({ ...props, variant: "Body" });
}

export function BodyMuted(props: TypographyProps) {
  return Typography({ ...props, variant: "BodyMuted" });
}

export function Caption(props: TypographyProps) {
  return Typography({ ...props, variant: "Caption" });
}

export function ButtonText(props: TypographyProps) {
  return Typography({ ...props, variant: "ButtonText" });
}
