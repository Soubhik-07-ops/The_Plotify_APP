import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleProp,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { palette, shadows, spacing } from "@/constants/theme";
import { ButtonText } from "@/components/ui/Typography";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = {
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

export default function Button({
  label,
  children,
  variant = "primary",
  onPress,
  disabled,
  loading,
  style,
  fullWidth = true,
}: Props) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        {
          minHeight: 52,
          borderRadius: 14,
          paddingHorizontal: spacing.xl,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          width: fullWidth ? "100%" : undefined,
          backgroundColor: isPrimary ? palette.primary : isSecondary ? "transparent" : palette.surfaceMuted,
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? palette.border : "transparent",
          opacity: disabled ? 0.55 : 1,
        },
        isPrimary ? shadows.card : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? palette.surface : palette.textPrimary} />
      ) : children ? (
        children
      ) : (
        <ButtonText color={isPrimary ? palette.surface : palette.textPrimary}>
          {label}
        </ButtonText>
      )}
    </TouchableOpacity>
  );
}
