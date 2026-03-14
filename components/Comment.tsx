import { View, Image } from "react-native";

import icons from "@/constants/icons";
import AppText from "@/components/ui/AppText";

type Review = {
  id?: string;
  rating: number;
  comment: string;
  user: {
    name: string;
    avatar: string;
  };
};

const Comment = ({ item }: { item: Review }) => {
  return (
    <View className="flex flex-col items-start">
      <View className="flex flex-row items-center">
        <Image source={{ uri: item.user.avatar }} className="size-14 rounded-full" />
        <AppText className="text-base text-black-300 text-start font-playfair-bold ml-3">
          {item.user.name}
        </AppText>
      </View>

      <AppText className="text-black-200 text-base font-playfair mt-2">
        {item.comment}
      </AppText>

      <View className="flex flex-row items-center w-full justify-between mt-4">
        <View className="flex flex-row items-center">
          <Image
            source={icons.heart}
            className="size-5"
            tintColor={"#0061FF"}
          />
          <AppText className="text-black-300 text-sm font-playfair-medium ml-2">
            120
          </AppText>
        </View>
        <AppText className="text-black-100 text-sm font-playfair">
          {new Date(item.id || "").toDateString()}
        </AppText>
      </View>
    </View>
  );
};

export default Comment;
