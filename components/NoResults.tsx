import React from "react";
import { View, Image } from "react-native";

import images from "@/constants/images";
import AppText from "@/components/ui/AppText";

const NoResults = () => {
  return (
    <View className="flex items-center my-5">
      <Image
        source={images.noResult}
        className="w-11/12 h-80"
        resizeMode="contain"
      />
      <AppText className="text-2xl font-playfair-bold text-black-300 mt-5">
        No Result
      </AppText>
      <AppText className="text-base text-black-100 mt-2">
        We could not find any result
      </AppText>
    </View>
  );
};

export default NoResults;
