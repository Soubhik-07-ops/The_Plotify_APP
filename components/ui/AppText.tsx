import React from "react";
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from "react-native";

type FontWeightVariant =
  | "regular"
  | "medium"
  | "semibold"
  | "bold";

type Props = TextProps & {
  weight?: FontWeightVariant;
  style?: StyleProp<TextStyle>;
};

const fontFamilies: Record<FontWeightVariant, string> = {
  regular: "PlayfairDisplay-Regular",
  medium: "PlayfairDisplay-Medium",
  semibold: "PlayfairDisplay-SemiBold",
  bold: "PlayfairDisplay-Bold",
};

export default function AppText({
  weight = "regular",
  style,
  children,
  ...props
}: Props) {
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: fontFamilies[weight],
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
